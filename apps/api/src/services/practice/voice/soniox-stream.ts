import WebSocket from 'ws';

import { parseJsonFrame } from './raw-data';

const SONIOX_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
export const STT_SAMPLE_RATE = 16000;
const MAX_PENDING_AUDIO_BYTES = STT_SAMPLE_RATE * 2 * 10;
const END_TOKEN = '<end>';
const FINALIZE_TOKEN = '<fin>';

export interface SonioxStreamOptions {
  apiKey: string;
  model: string;
  maxEndpointDelayMs: number;
  contextText: string;
  onPartial: (text: string) => void;
  onUtterance: (text: string) => void;
  /** Soniox refused the stream (bad key, config or quota); retrying would fail the same way. */
  onError: (message: string) => void;
  /** The stream dropped (timeout, network, server error); a new stream can pick up the next audio. */
  onDisconnect: (reason: string) => void;
}

const RETRYABLE_ERROR_CODES = new Set([408, 500, 503]);

interface SonioxToken {
  text: string;
  isFinal: boolean;
}

function readTokens(response: Record<string, unknown>): SonioxToken[] {
  if (!Array.isArray(response.tokens)) return [];

  return response.tokens.flatMap((token) => {
    if (!token || typeof token !== 'object') return [];

    const { text, is_final: isFinal } = token as { text?: unknown; is_final?: unknown };
    if (typeof text !== 'string') return [];

    return [{ text, isFinal: isFinal === true }];
  });
}

/**
 * One Soniox real-time transcription stream. Takes PCM s16le mono 16 kHz audio and reports the live caption
 * plus every utterance Soniox closes with an endpoint.
 */
export class SonioxStream {
  private socket: WebSocket | null = null;
  private pendingAudio: Buffer[] = [];
  private pendingBytes = 0;
  private finalText = '';
  private lastPartial = '';
  private stopped = false;

  constructor(private readonly options: SonioxStreamOptions) {}

  start() {
    // Soniox refuses keys sent only in the start message from 15 January 2027; the header is the supported path.
    const socket = new WebSocket(SONIOX_URL, { headers: { Authorization: `Bearer ${this.options.apiKey}` } });
    this.socket = socket;

    socket.on('open', () => {
      socket.send(JSON.stringify(this.buildConfig()));

      for (const chunk of this.pendingAudio) {
        socket.send(chunk);
      }

      this.pendingAudio = [];
      this.pendingBytes = 0;
    });
    socket.on('message', (data, isBinary) => {
      if (isBinary) return;

      const response = parseJsonFrame(data);
      if (response) this.handleResponse(response);
    });
    socket.on('error', (error) => {
      if (this.stopped) return;

      this.stopped = true;
      this.options.onDisconnect(error.message);
    });
    socket.on('close', (code) => {
      this.socket = null;
      if (this.stopped) return;

      this.stopped = true;
      this.options.onDisconnect(`closed ${code}`);
    });
  }

  sendAudio(chunk: Buffer) {
    if (this.stopped) return;

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(chunk);

      return;
    }

    if (this.pendingBytes + chunk.byteLength > MAX_PENDING_AUDIO_BYTES) return;

    this.pendingAudio.push(chunk);
    this.pendingBytes += chunk.byteLength;
  }

  /** Asks Soniox to transcribe what it already received, report the last utterance and close. */
  finish() {
    if (this.stopped) return;

    this.stopped = true;

    if (this.socket?.readyState === WebSocket.OPEN) {
      // An empty text frame is Soniox's end-of-audio signal; an empty binary frame would be ignored.
      this.socket.send('');

      return;
    }

    this.socket?.terminate();
  }

  close() {
    this.stopped = true;
    this.socket?.terminate();
    this.socket = null;
  }

  private buildConfig() {
    const context = this.options.contextText ? { text: this.options.contextText } : undefined;

    return {
      model: this.options.model,
      audio_format: 'pcm_s16le',
      sample_rate: STT_SAMPLE_RATE,
      num_channels: 1,
      language_hints: ['vi'],
      enable_endpoint_detection: true,
      max_endpoint_delay_ms: this.options.maxEndpointDelayMs,
      context
    };
  }

  private handleResponse(response: Record<string, unknown>) {
    if (typeof response.error_code === 'number') {
      const message = typeof response.error_message === 'string' ? response.error_message : 'Soniox error';
      const description = `${response.error_code} ${message}`;
      this.close();

      if (RETRYABLE_ERROR_CODES.has(response.error_code)) {
        this.options.onDisconnect(description);
      } else {
        this.options.onError(description);
      }

      return;
    }

    let nonFinalText = '';

    for (const token of readTokens(response)) {
      if (!token.isFinal) {
        nonFinalText += token.text;
        continue;
      }

      if (token.text === END_TOKEN) {
        this.flushUtterance();
        continue;
      }

      if (token.text !== FINALIZE_TOKEN) this.finalText += token.text;
    }

    if (response.finished === true) {
      this.flushUtterance();
      this.socket?.close();
    }

    this.reportPartial(`${this.finalText}${nonFinalText}`.trim());
  }

  private flushUtterance() {
    const utterance = this.finalText.trim();
    this.finalText = '';

    if (utterance) this.options.onUtterance(utterance);
  }

  private reportPartial(text: string) {
    if (text === this.lastPartial) return;

    this.lastPartial = text;
    this.options.onPartial(text);
  }
}
