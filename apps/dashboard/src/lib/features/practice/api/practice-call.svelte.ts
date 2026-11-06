import { getRequestBaseUrl } from '$lib/utils/services/api';
import {
  PRACTICE_AUDIO_HEADER_BYTES,
  PRACTICE_STT_SAMPLE_RATE,
  type TPracticeNoticeCode,
  type TPracticeServerEvent,
  type TPracticeTurn
} from '@cio/utils/validation/practice';
import { practiceApi } from './practice.svelte';
import { MicCapture } from '../audio/mic-capture';
import { PcmPlayer } from '../audio/pcm-player';
import { buildPracticeStreamUrl } from '../utils/practice-utils';
import type {
  PracticeCallDetail,
  PracticeCallFailure,
  PracticeCallPhase,
  PracticeChatMessage,
  PracticeNotice
} from '../utils/types';

const STREAM_REFUSED_CLOSE_CODE = 4000;
const STREAM_REPLACED_CLOSE_CODE = 4001;

function turnToMessage(turn: TPracticeTurn, index: number): PracticeChatMessage {
  return { id: `turn-${index}`, speaker: turn.speaker, text: turn.text, pending: false };
}

function replyMessageId(replyId: number): string {
  return `reply-${replyId}`;
}

function parseServerEvent(data: string): TPracticeServerEvent | null {
  try {
    return JSON.parse(data) as TPracticeServerEvent;
  } catch {
    return null;
  }
}

/** Drives one live practice call in the browser: stream, microphone, customer voice and transcript. */
export class PracticeCallController {
  phase = $state<PracticeCallPhase>('idle');
  failure = $state<PracticeCallFailure | null>(null);
  call = $state<PracticeCallDetail | null>(null);
  messages = $state<PracticeChatMessage[]>([]);
  agentDraft = $state('');
  customerTyping = $state(false);
  customerSpeaking = $state(false);
  micOn = $state(false);
  micStarting = $state(false);
  micLevel = $state(0);
  speechToText = $state(false);
  speakerMuted = $state(false);
  notice = $state<PracticeNotice | null>(null);
  elapsedSeconds = $state(0);

  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private player: PcmPlayer | null = null;
  private mic: MicCapture | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stoppedReplies = new Set<number>();
  private wantsMic = true;

  /** Starts a new call for the scenario. Call it from a click so the browser allows audio. */
  async start(scenarioId: string) {
    this.resetConversation();
    this.phase = 'connecting';
    this.prepareAudio();

    const call = await practiceApi.startCall(scenarioId);
    if (!call) {
      this.fail('start_failed');

      return;
    }

    this.call = call;
    this.startTimer(call.startedAt);
    this.connect(call.id);
  }

  reconnect() {
    if (!this.call) return;

    this.failure = null;
    this.phase = 'connecting';
    this.prepareAudio();
    this.connect(this.call.id);
  }

  sendText(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || this.phase !== 'live') return false;

    this.sendJson({ type: 'text', text: trimmed });

    return true;
  }

  async toggleMic() {
    if (this.micOn) {
      this.wantsMic = false;
      this.stopMic();
      this.sendJson({ type: 'mic', on: false });

      return;
    }

    this.wantsMic = true;
    await this.startMic();
  }

  toggleSpeaker() {
    this.speakerMuted = !this.speakerMuted;
    this.player?.setMuted(this.speakerMuted);
  }

  dismissNotice() {
    this.notice = null;
  }

  /** Hangs up and waits for the grade. */
  async end() {
    if (!this.call || this.phase === 'ending' || this.phase === 'ended') return;

    const callId = this.call.id;
    const previousPhase = this.phase;
    this.phase = 'ending';
    this.stopMic();
    this.player?.stop();

    const ended = await practiceApi.endCall(callId);
    if (!ended) {
      this.phase = previousPhase;

      return;
    }

    this.closeSocket();
    this.stopTimer();
    this.call = ended;
    this.messages = ended.transcript.map(turnToMessage);
    this.agentDraft = '';
    this.customerTyping = false;
    this.elapsedSeconds = ended.durationSeconds ?? this.elapsedSeconds;
    this.phase = 'ended';
  }

  /** Back to the start screen so the learner can call the same customer again. */
  resetForRetry() {
    this.closeSocket();
    this.stopMic();
    this.player?.stop();
    this.stopTimer();
    this.resetConversation();
    this.call = null;
    this.phase = 'idle';
  }

  dispose() {
    this.closeSocket();
    this.stopMic();
    this.player?.stop();
    this.stopTimer();
    void this.audioContext?.close();
    this.audioContext = null;
    this.player = null;
  }

  private resetConversation() {
    this.failure = null;
    this.notice = null;
    this.messages = [];
    this.agentDraft = '';
    this.customerTyping = false;
    this.elapsedSeconds = 0;
    this.stoppedReplies.clear();
  }

  private prepareAudio() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.player = new PcmPlayer(this.audioContext, (playing) => {
        this.customerSpeaking = playing;
      });
      this.player.setMuted(this.speakerMuted);
    }

    void this.audioContext.resume();
  }

  private connect(callId: string) {
    this.closeSocket();

    const baseUrl = getRequestBaseUrl() ?? '';
    const socket = new WebSocket(buildPracticeStreamUrl(baseUrl, callId));
    socket.binaryType = 'arraybuffer';
    this.socket = socket;

    socket.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
      if (typeof event.data !== 'string') {
        this.handleAudio(event.data);

        return;
      }

      const serverEvent = parseServerEvent(event.data);
      if (serverEvent) this.handleEvent(serverEvent);
    };
    socket.onclose = (event) => this.handleClose(socket, event);
  }

  private closeSocket() {
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000);
  }

  private handleClose(socket: WebSocket, event: CloseEvent) {
    if (this.socket !== socket) return;

    this.socket = null;
    this.stopMic();
    this.player?.stop();

    if (this.phase === 'ending' || this.phase === 'ended' || this.phase === 'idle') return;

    if (event.code === STREAM_REFUSED_CLOSE_CODE) {
      this.fail('refused');

      return;
    }

    this.fail(event.code === STREAM_REPLACED_CLOSE_CODE ? 'replaced' : 'connection_lost');
  }

  private fail(failure: PracticeCallFailure) {
    this.failure = failure;
    this.phase = 'failed';
    this.customerTyping = false;
  }

  private handleEvent(event: TPracticeServerEvent) {
    switch (event.type) {
      case 'ready':
        this.messages = event.transcript.map(turnToMessage);
        this.speechToText = event.stt;
        this.phase = 'live';
        if (event.stt && this.wantsMic && !this.micOn) void this.startMic();
        break;
      case 'agent_partial':
        this.agentDraft = event.text;
        break;
      case 'turn':
        this.agentDraft = '';
        this.messages.push({
          id: `agent-${this.messages.length}-${event.turn.at}`,
          speaker: 'agent',
          text: event.turn.text,
          pending: false
        });
        break;
      case 'customer_start':
        this.customerTyping = true;
        break;
      case 'customer_delta':
        this.appendCustomerText(event.replyId, event.text);
        break;
      case 'customer_end':
        this.finishCustomerMessage(event.replyId, event.text);
        break;
      case 'speech_end':
        if (event.interrupted) {
          this.stoppedReplies.add(event.replyId);
          this.player?.stop(event.replyId);
        }
        break;
      case 'notice':
        this.handleNotice(event.code);
        break;
      case 'ended':
        break;
    }
  }

  private handleNotice(code: TPracticeNoticeCode) {
    this.notice = code;

    if (code === 'STT_FAILED') {
      this.wantsMic = false;
      this.stopMic();

      return;
    }

    if (code === 'TIME_LIMIT') void this.end();
  }

  private appendCustomerText(replyId: number, text: string) {
    const id = replyMessageId(replyId);
    const existing = this.messages.find((message) => message.id === id);

    if (existing) {
      existing.text += text;

      return;
    }

    this.messages.push({ id, speaker: 'customer', text, pending: true });
  }

  private finishCustomerMessage(replyId: number, text: string) {
    this.customerTyping = false;

    const id = replyMessageId(replyId);
    const index = this.messages.findIndex((message) => message.id === id);

    if (index === -1) {
      if (text) this.messages.push({ id, speaker: 'customer', text, pending: false });

      return;
    }

    if (!text) {
      this.messages.splice(index, 1);

      return;
    }

    this.messages[index].text = text;
    this.messages[index].pending = false;
  }

  private handleAudio(data: ArrayBuffer) {
    if (!this.player || data.byteLength <= PRACTICE_AUDIO_HEADER_BYTES) return;

    const header = new DataView(data, 0, PRACTICE_AUDIO_HEADER_BYTES);
    const sampleRate = header.getUint32(0, true);
    const replyId = header.getUint32(4, true);
    if (this.stoppedReplies.has(replyId)) return;

    const sampleCount = Math.floor((data.byteLength - PRACTICE_AUDIO_HEADER_BYTES) / 2);
    const samples = new Int16Array(data, PRACTICE_AUDIO_HEADER_BYTES, sampleCount);
    this.player.enqueue(replyId, sampleRate, samples);
  }

  private async startMic() {
    if (!this.speechToText || this.micOn || this.micStarting || !this.audioContext) return;

    this.micStarting = true;
    const mic = new MicCapture(this.audioContext, PRACTICE_STT_SAMPLE_RATE, (samples, level) =>
      this.forwardMicChunk(samples, level)
    );

    try {
      await mic.start();
    } catch (error) {
      console.error('practice call microphone unavailable:', error);
      mic.stop();
      this.wantsMic = false;
      this.notice = 'MIC_DENIED';

      return;
    } finally {
      this.micStarting = false;
    }

    if (this.phase !== 'live') {
      mic.stop();

      return;
    }

    this.mic = mic;
    this.micOn = true;
    this.sendJson({ type: 'mic', on: true });
  }

  private stopMic() {
    this.mic?.stop();
    this.mic = null;
    this.micOn = false;
    this.micLevel = 0;
  }

  private forwardMicChunk(samples: Int16Array<ArrayBuffer>, level: number) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    const echoRisk = this.player?.isEchoRisk ?? false;
    this.micLevel = echoRisk ? 0 : level;
    this.socket.send(echoRisk ? new Int16Array(samples.length) : samples);
  }

  private sendJson(message: { type: 'text'; text: string } | { type: 'mic'; on: boolean }) {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    this.socket.send(JSON.stringify(message));
  }

  private startTimer(startedAt: string) {
    this.stopTimer();

    const startedAtMs = Date.parse(startedAt);
    const tick = () => {
      this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    };

    tick();
    this.timer = setInterval(tick, 1000);
  }

  private stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
