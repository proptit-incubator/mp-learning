import WebSocket from 'ws';

import { parseJsonFrame } from './raw-data';

export const TTS_VOICES = [
  'vannt',
  'maidt',
  'mailan-north',
  'ngocanh-central',
  'thuylinh-south',
  'minhtrang-north',
  'thanhtruc-south',
  'tramy-north',
  'phuongnhi-north',
  'thanhvan-south',
  'thuyanh-north'
] as const;

const TTS_OUTPUT_SAMPLE_RATE = 8000;
const TTS_INPUT_SAMPLE_RATE = 16000;
const CONNECT_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;

export class TtsError extends Error {}

export interface TtsAudioChunk {
  pcm: Buffer;
  sampleRate: number;
}

export interface SpeechSynthesizer {
  readonly enabled: boolean;
  /**
   * Voices `text` after every earlier request finished, calling `onAudio` per chunk unless `isCancelled` turns true.
   * Rejects with TtsError when the service fails.
   */
  speak(text: string, onAudio: (chunk: TtsAudioChunk) => void, isCancelled: () => boolean): Promise<void>;
  close(): void;
}

export class SilentSynthesizer implements SpeechSynthesizer {
  readonly enabled = false;

  async speak() {}

  close() {}
}

interface TtsStreamOptions {
  url: string;
  token: string;
  voiceId: string;
}

/** One connection to the voice service, reused for every customer turn of a call. */
export class TtsStream implements SpeechSynthesizer {
  readonly enabled = true;
  private socket: WebSocket | null = null;
  private connecting: Promise<WebSocket> | null = null;
  private queue: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(private readonly options: TtsStreamOptions) {}

  speak(text: string, onAudio: (chunk: TtsAudioChunk) => void, isCancelled: () => boolean): Promise<void> {
    const request = this.queue.then(() => this.runRequest(text, onAudio, isCancelled));
    this.queue = request.catch(() => undefined);

    return request;
  }

  close() {
    this.closed = true;
    this.socket?.terminate();
    this.socket = null;
  }

  private async runRequest(text: string, onAudio: (chunk: TtsAudioChunk) => void, isCancelled: () => boolean) {
    if (this.closed || isCancelled()) return;

    const socket = await this.ensureConnected();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        socket.terminate();
        reject(new TtsError('TTS request timed out'));
      }, REQUEST_TIMEOUT_MS);

      const handleMessage = (data: WebSocket.RawData, isBinary: boolean) => {
        if (isBinary) return;

        const message = parseJsonFrame(data);
        if (!message) return;

        if (message.error) {
          cleanup();
          reject(new TtsError(`TTS error: ${JSON.stringify(message.error)}`));

          return;
        }

        if (typeof message.audio === 'string' && message.audio && !isCancelled()) {
          const sampleRate = typeof message.sample_rate === 'number' ? message.sample_rate : TTS_OUTPUT_SAMPLE_RATE;
          const pcm = Buffer.from(message.audio, 'base64');
          onAudio({ pcm, sampleRate });
        }

        if (message.isFinal === true || message.is_final === true) {
          cleanup();
          resolve();
        }
      };

      const handleClose = () => {
        cleanup();
        reject(new TtsError('TTS connection closed'));
      };

      function cleanup() {
        clearTimeout(timeout);
        socket.off('message', handleMessage);
        socket.off('close', handleClose);
      }

      socket.on('message', handleMessage);
      socket.on('close', handleClose);
      socket.send(JSON.stringify({ text: `${text} ` }));
      socket.send(JSON.stringify({ text: '', end_of_input: true }));
    });
  }

  private ensureConnected(): Promise<WebSocket> {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve(this.socket);

    if (!this.connecting) {
      this.connecting = this.connect().finally(() => {
        this.connecting = null;
      });
    }

    return this.connecting;
  }

  private connect(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.options.url);

      const timeout = setTimeout(() => {
        socket.terminate();
        reject(new TtsError('TTS connect timed out'));
      }, CONNECT_TIMEOUT_MS);

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(new TtsError(error.message));
      });
      socket.on('close', () => {
        clearTimeout(timeout);
        if (this.socket === socket) this.socket = null;
        reject(new TtsError('TTS connection closed before authentication'));
      });
      socket.once('open', () => {
        socket.send(
          JSON.stringify({
            text: ' ',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              voiceId: this.options.voiceId,
              resample_rate: TTS_OUTPUT_SAMPLE_RATE
            },
            xi_api_key: this.options.token
          })
        );
      });
      socket.once('message', (data) => {
        clearTimeout(timeout);

        const message = parseJsonFrame(data);
        if (message?.status !== 'authenticated') {
          socket.terminate();
          reject(new TtsError(`TTS auth failed: ${JSON.stringify(message)}`));

          return;
        }

        socket.send(JSON.stringify({ config: { sampling_rate: TTS_INPUT_SAMPLE_RATE } }));

        if (this.closed) {
          socket.terminate();
          reject(new TtsError('TTS stream closed'));

          return;
        }

        this.socket = socket;
        resolve(socket);
      });
    });
  }
}
