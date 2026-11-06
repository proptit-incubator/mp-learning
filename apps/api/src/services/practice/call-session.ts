import type { TPracticeCall, TPracticeScenario } from '@cio/db/types';
import {
  PRACTICE_AUDIO_HEADER_BYTES,
  PRACTICE_STT_SAMPLE_RATE,
  ZPracticeSocketMessage,
  type TPracticeServerEvent,
  type TPracticeTurn
} from '@cio/utils/validation/practice';
import { env } from '@cio/core/config/env';
import type { VoiceCallModelId } from '@cio/utils/agent-models';
import { updatePracticeCall } from '@cio/db/queries/practice';

import { streamCustomerReply } from './customer-agent';
import { CallRecording } from './voice/call-recording';
import { SentenceChunker } from './voice/sentence-chunker';
import { SonioxStream } from './voice/soniox-stream';
import { SilentSynthesizer, TtsStream, type SpeechSynthesizer, type TtsAudioChunk } from './voice/tts-stream';

export const MAX_CALL_DURATION_MS = 20 * 60_000;
const MAX_TURNS = 200;
const SOCKET_OPEN = 1;
const SOCKET_REPLACED_CODE = 4001;

export interface PracticeSocket {
  send(data: string | Uint8Array<ArrayBuffer>): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

export interface PracticeVoiceSettings {
  model: VoiceCallModelId;
  voiceId: string;
}

interface CustomerReply {
  id: number;
  controller: AbortController;
  text: string;
  committed: boolean;
  doneSpeaking: boolean;
  cancelled: boolean;
  audioStartMs: number | null;
}

const activeSessions = new Map<string, PracticeCallSession>();
const callRecordings = new Map<string, CallRecording>();
const RECORDING_RETENTION_MS = 5 * 60_000;
const AGENT_PARTIAL_LEAD_MS = 500;

function recordingFor(call: TPracticeCall): CallRecording {
  const existing = callRecordings.get(call.id);
  if (existing) return existing;

  const startedAtMs = Date.parse(call.startedAt);
  const recording = new CallRecording(startedAtMs);
  callRecordings.set(call.id, recording);

  const abandonAfterMs = Math.max(0, startedAtMs + MAX_CALL_DURATION_MS + RECORDING_RETENTION_MS - Date.now());
  setTimeout(() => {
    if (callRecordings.get(call.id) === recording) callRecordings.delete(call.id);
  }, abandonAfterMs).unref();

  return recording;
}

/** Hands over the call's recording so it can be saved; later calls for the same id get nothing. */
export function takeCallRecording(callId: string): CallRecording | undefined {
  const recording = callRecordings.get(callId);
  callRecordings.delete(callId);

  return recording;
}

export function getActivePracticeSession(callId: string): PracticeCallSession | undefined {
  return activeSessions.get(callId);
}

export function isSpeechToTextConfigured(): boolean {
  return Boolean(env.SONIOX_API_KEY);
}

export function isTextToSpeechConfigured(): boolean {
  return Boolean(env.TTS_URL && env.TTS_TOKEN);
}

function createSynthesizer(voiceId: string): SpeechSynthesizer {
  if (!env.TTS_URL || !env.TTS_TOKEN) return new SilentSynthesizer();

  return new TtsStream({ url: env.TTS_URL, token: env.TTS_TOKEN, voiceId });
}

function cleanSpokenText(text: string): string {
  return text
    .replace(/[*_#`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function* singleChunk(text: string): AsyncIterable<string> {
  yield text;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function encodeAudioFrame(replyId: number, chunk: TtsAudioChunk): Uint8Array<ArrayBuffer> {
  const frame = new Uint8Array(new ArrayBuffer(PRACTICE_AUDIO_HEADER_BYTES + chunk.pcm.byteLength));
  const header = new DataView(frame.buffer);
  header.setUint32(0, chunk.sampleRate, true);
  header.setUint32(4, replyId, true);
  frame.set(chunk.pcm, PRACTICE_AUDIO_HEADER_BYTES);

  return frame;
}

/**
 * Runs one live practice call over a browser WebSocket: learner speech or text in, the AI customer's
 * streamed text and voice out. The transcript is saved after every turn.
 */
export class PracticeCallSession {
  private readonly transcript: TPracticeTurn[];
  private readonly tts: SpeechSynthesizer;
  private readonly recording: CallRecording;
  private stt: SonioxStream | null = null;
  private sttBlocked = false;
  private currentReply: CustomerReply | null = null;
  private replyCounter = 0;
  private persistQueue: Promise<unknown> = Promise.resolve();
  private timeLimitTimer: NodeJS.Timeout | null = null;
  private ttsFailureReported = false;
  private closed = false;
  private agentSpeechHeardAtMs: number | null = null;

  constructor(
    private readonly call: TPracticeCall,
    private readonly scenario: TPracticeScenario,
    private readonly socket: PracticeSocket,
    private readonly voice: PracticeVoiceSettings
  ) {
    this.transcript = [...call.transcript];
    this.tts = createSynthesizer(voice.voiceId);
    this.recording = recordingFor(call);
  }

  start() {
    activeSessions.get(this.call.id)?.replace();
    activeSessions.set(this.call.id, this);

    const elapsedMs = Date.now() - Date.parse(this.call.startedAt);
    const remainingMs = Math.max(MAX_CALL_DURATION_MS - elapsedMs, 0);
    this.timeLimitTimer = setTimeout(() => this.handleTimeLimit(), remainingMs);

    this.send({
      type: 'ready',
      transcript: this.transcript,
      stt: isSpeechToTextConfigured(),
      tts: this.tts.enabled,
      remainingSeconds: Math.floor(remainingMs / 1000)
    });

    if (this.transcript.length === 0) this.startOpening();
  }

  handleMessage(data: string | ArrayBuffer) {
    if (this.closed) return;

    if (typeof data !== 'string') {
      this.handleAudio(data);

      return;
    }

    const parsed = ZPracticeSocketMessage.safeParse(parseJson(data));
    if (!parsed.success) return;

    const message = parsed.data;

    if (message.type === 'text') {
      this.commitAgentTurn(message.text);

      return;
    }

    if (message.on) {
      this.sttBlocked = false;

      return;
    }

    this.stopListening();
  }

  /** Stops every stream, tells the browser the call ended and returns the saved transcript. */
  async finish(): Promise<TPracticeTurn[]> {
    this.shutdown();
    this.send({ type: 'ended' });
    this.socket.close(1000, 'ended');
    await this.persistQueue;

    return [...this.transcript];
  }

  dispose() {
    this.shutdown();
  }

  private replace() {
    this.send({ type: 'notice', code: 'REPLACED' });
    this.shutdown();
    this.socket.close(SOCKET_REPLACED_CODE, 'replaced');
  }

  private shutdown() {
    if (this.closed) return;

    this.interruptReply();
    this.closed = true;

    if (this.timeLimitTimer) clearTimeout(this.timeLimitTimer);

    this.stt?.close();
    this.stt = null;
    this.tts.close();

    if (activeSessions.get(this.call.id) === this) activeSessions.delete(this.call.id);
  }

  private handleAudio(data: ArrayBuffer) {
    this.recording.addAgentAudio(new Uint8Array(data), PRACTICE_STT_SAMPLE_RATE, Date.now());

    if (!isSpeechToTextConfigured() || this.sttBlocked) return;

    if (!this.stt) this.startListening();

    this.stt?.sendAudio(Buffer.from(data));
  }

  private startListening() {
    const contextText = [this.scenario.topic, this.scenario.title].filter(Boolean).join('. ');

    const stream = new SonioxStream({
      apiKey: env.SONIOX_API_KEY!,
      model: env.SONIOX_MODEL,
      maxEndpointDelayMs: env.SONIOX_MAX_ENDPOINT_DELAY_MS,
      contextText,
      onPartial: (text) => this.handleAgentPartial(text),
      onUtterance: (text) => this.commitAgentTurn(text),
      onError: (message) => {
        console.error('practice call speech-to-text failed:', message);
        if (this.stt === stream) this.stt = null;
        this.sttBlocked = true;
        this.send({ type: 'notice', code: 'STT_FAILED' });
      },
      onDisconnect: (reason) => {
        console.warn('practice call speech-to-text stream dropped, reopening on next audio:', reason);
        if (this.stt === stream) this.stt = null;
      }
    });

    this.stt = stream;
    stream.start();
  }

  private stopListening() {
    this.stt?.finish();
    this.stt = null;
  }

  private handleTimeLimit() {
    this.stopListening();
    this.sttBlocked = true;
    this.send({ type: 'notice', code: 'TIME_LIMIT' });
  }

  private handleAgentPartial(text: string) {
    if (text.trim() && this.agentSpeechHeardAtMs === null) this.agentSpeechHeardAtMs = Date.now();

    this.send({ type: 'agent_partial', text });
  }

  /** Where the learner's utterance starts in the recording: the first partial lags the voice by about half a second. */
  private takeAgentTurnStartMs(): number {
    const heardAtMs = this.agentSpeechHeardAtMs ?? Date.now();
    this.agentSpeechHeardAtMs = null;

    return this.recording.offsetMs(heardAtMs - AGENT_PARTIAL_LEAD_MS);
  }

  private commitAgentTurn(text: string) {
    const startMs = this.takeAgentTurnStartMs();
    if (this.closed) return;

    const spoken = text.trim();
    if (!spoken) return;

    if (this.transcript.length >= MAX_TURNS) {
      this.handleTimeLimit();

      return;
    }

    this.interruptReply();

    const turn: TPracticeTurn = { speaker: 'agent', text: spoken, at: new Date().toISOString(), startMs };
    this.transcript.push(turn);
    this.send({ type: 'turn', turn });
    this.persist();

    const history = [...this.transcript];
    this.startReply((signal) => streamCustomerReply(this.scenario, history, signal, this.voice.model));
  }

  private startOpening() {
    const openingLine = this.scenario.openingLine.trim();

    if (openingLine) {
      this.startReply(() => singleChunk(openingLine));

      return;
    }

    this.startReply((signal) => streamCustomerReply(this.scenario, [], signal, this.voice.model));
  }

  private startReply(createStream: (signal: AbortSignal) => AsyncIterable<string>) {
    this.replyCounter += 1;

    const reply: CustomerReply = {
      id: this.replyCounter,
      controller: new AbortController(),
      text: '',
      committed: false,
      doneSpeaking: false,
      cancelled: false,
      audioStartMs: null
    };

    this.currentReply = reply;
    void this.runReply(reply, createStream);
  }

  private async runReply(reply: CustomerReply, createStream: (signal: AbortSignal) => AsyncIterable<string>) {
    this.send({ type: 'customer_start', replyId: reply.id });

    const chunker = new SentenceChunker();
    const speeches: Promise<void>[] = [];

    try {
      for await (const delta of createStream(reply.controller.signal)) {
        if (reply.cancelled) return;

        reply.text += delta;
        this.send({ type: 'customer_delta', replyId: reply.id, text: delta });

        for (const sentence of chunker.push(delta)) {
          speeches.push(this.speak(reply, sentence));
        }
      }
    } catch (error) {
      if (reply.cancelled) return;

      console.error('practice call reply failed:', error);
      this.send({ type: 'notice', code: 'REPLY_FAILED' });
    }

    if (reply.cancelled) return;

    const tail = chunker.flush();
    if (tail) speeches.push(this.speak(reply, tail));

    this.commitReply(reply, false);
    await Promise.allSettled(speeches);

    if (reply.cancelled) return;

    reply.doneSpeaking = true;
    this.send({ type: 'speech_end', replyId: reply.id, interrupted: false });
  }

  private commitReply(reply: CustomerReply, interrupted: boolean) {
    if (reply.committed) return;

    reply.committed = true;

    const text = cleanSpokenText(reply.text);

    if (text) {
      const startMs = reply.audioStartMs ?? this.recording.nextCustomerOffsetMs(Date.now());
      this.transcript.push({ speaker: 'customer', text, at: new Date().toISOString(), startMs });
      this.persist();
    }

    this.send({ type: 'customer_end', replyId: reply.id, text, interrupted });
  }

  private interruptReply() {
    const reply = this.currentReply;
    if (!reply || reply.cancelled || reply.doneSpeaking) return;

    reply.cancelled = true;
    reply.controller.abort();
    this.recording.cutCustomer(Date.now());
    this.commitReply(reply, true);
    this.send({ type: 'speech_end', replyId: reply.id, interrupted: true });
  }

  private async speak(reply: CustomerReply, sentence: string) {
    const text = cleanSpokenText(sentence);
    if (!text || !this.tts.enabled) return;

    try {
      await this.tts.speak(
        text,
        (chunk) => this.sendAudio(reply.id, chunk),
        () => reply.cancelled || this.closed
      );
    } catch (error) {
      if (this.closed || this.ttsFailureReported) return;

      this.ttsFailureReported = true;
      console.error('practice call text-to-speech failed:', error);
      this.send({ type: 'notice', code: 'TTS_FAILED' });
    }
  }

  private persist() {
    const snapshot = [...this.transcript];

    this.persistQueue = this.persistQueue
      .then(() => updatePracticeCall(this.call.id, { transcript: snapshot }))
      .catch((error) => console.error('practice call transcript save failed:', error));
  }

  private send(event: TPracticeServerEvent) {
    if (this.socket.readyState !== SOCKET_OPEN) return;

    this.socket.send(JSON.stringify(event));
  }

  private sendAudio(replyId: number, chunk: TtsAudioChunk) {
    if (this.socket.readyState !== SOCKET_OPEN) return;

    const startMs = this.recording.addCustomerAudio(chunk.pcm, chunk.sampleRate, Date.now());
    if (this.currentReply?.id === replyId) this.currentReply.audioStartMs ??= startMs;

    this.socket.send(encodeAudioFrame(replyId, chunk));
  }
}
