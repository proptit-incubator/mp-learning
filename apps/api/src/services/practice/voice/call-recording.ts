export const RECORDING_SAMPLE_RATE = 8000;

const INITIAL_CAPACITY_SECONDS = 60;
const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;
const AGENT_JITTER_SECONDS = 0.3;

/** One speaker's audio laid out on the call's timeline, growing as the call goes on. */
class Track {
  samples = new Int16Array(INITIAL_CAPACITY_SECONDS * RECORDING_SAMPLE_RATE);
  head = 0;

  write(position: number, chunk: Int16Array) {
    this.ensureCapacity(position + chunk.length);
    this.samples.set(chunk, position);
    this.head = Math.max(this.head, position + chunk.length);
  }

  clearFrom(position: number) {
    if (position >= this.head) return;

    this.samples.fill(0, position, this.head);
    this.head = position;
  }

  private ensureCapacity(length: number) {
    if (length <= this.samples.length) return;

    let capacity = this.samples.length;
    while (capacity < length) capacity *= 2;

    const grown = new Int16Array(capacity);
    grown.set(this.samples);
    this.samples = grown;
  }
}

function resample(samples: Int16Array, fromRate: number): Int16Array {
  if (fromRate === RECORDING_SAMPLE_RATE) return samples;

  const ratio = fromRate / RECORDING_SAMPLE_RATE;
  const length = Math.floor(samples.length / ratio);
  const output = new Int16Array(length);

  for (let index = 0; index < length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.max(start + 1, Math.floor((index + 1) * ratio));
    let sum = 0;

    for (let source = start; source < end && source < samples.length; source++) {
      sum += samples[source];
    }

    output[index] = Math.round(sum / (end - start));
  }

  return output;
}

function toSamples(pcm: Uint8Array): Int16Array {
  const copy = new Uint8Array(pcm.byteLength - (pcm.byteLength % BYTES_PER_SAMPLE));
  copy.set(pcm.subarray(0, copy.byteLength));

  return new Int16Array(copy.buffer);
}

function encodeWav(samples: Int16Array): Buffer {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const wav = Buffer.alloc(WAV_HEADER_BYTES + dataBytes);

  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(WAV_HEADER_BYTES - 8 + dataBytes, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(RECORDING_SAMPLE_RATE, 24);
  wav.writeUInt32LE(RECORDING_SAMPLE_RATE * BYTES_PER_SAMPLE, 28);
  wav.writeUInt16LE(BYTES_PER_SAMPLE, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(dataBytes, 40);
  Buffer.from(samples.buffer, samples.byteOffset, dataBytes).copy(wav, WAV_HEADER_BYTES);

  return wav;
}

/**
 * Mixes the learner's microphone and the AI customer's voice on the call's wall-clock timeline, so the file is
 * exactly as long as the call and survives reconnects.
 */
export class CallRecording {
  private readonly agent = new Track();
  private readonly customer = new Track();

  constructor(private readonly startedAtMs: number) {}

  /** A microphone chunk that just arrived; it covers the moments right before `receivedAtMs`. */
  addAgentAudio(pcm: Uint8Array, sampleRate: number, receivedAtMs: number) {
    const chunk = resample(toSamples(pcm), sampleRate);
    const expected = Math.max(0, this.positionAt(receivedAtMs) - chunk.length);
    const isContinuous = Math.abs(expected - this.agent.head) <= AGENT_JITTER_SECONDS * RECORDING_SAMPLE_RATE;

    this.agent.write(isContinuous ? this.agent.head : expected, chunk);
  }

  /**
   * Customer speech plays back to back, starting no earlier than now, the same way the browser schedules it.
   * Returns where the chunk starts in the recording, in milliseconds.
   */
  addCustomerAudio(pcm: Uint8Array, sampleRate: number, receivedAtMs: number): number {
    const chunk = resample(toSamples(pcm), sampleRate);
    const position = this.nextCustomerPosition(receivedAtMs);

    this.customer.write(position, chunk);

    return this.positionToMs(position);
  }

  /** Where customer speech queued at `atMs` would start playing, in milliseconds into the recording. */
  nextCustomerOffsetMs(atMs: number): number {
    return this.positionToMs(this.nextCustomerPosition(atMs));
  }

  /** How far a wall-clock moment is into the recording, in milliseconds. */
  offsetMs(atMs: number): number {
    return this.positionToMs(this.positionAt(atMs));
  }

  /** Drops customer audio that had not played yet when the learner cut in or hung up. */
  cutCustomer(atMs: number) {
    this.customer.clearFrom(this.positionAt(atMs));
  }

  /** The finished recording as a mono 16-bit WAV of exactly `durationSeconds`. */
  toWav(durationSeconds: number): Buffer {
    const length = Math.max(0, Math.round(durationSeconds * RECORDING_SAMPLE_RATE));
    const mixed = new Int16Array(length);

    for (let index = 0; index < length; index++) {
      const agentSample = index < this.agent.samples.length ? this.agent.samples[index] : 0;
      const customerSample = index < this.customer.samples.length ? this.customer.samples[index] : 0;
      mixed[index] = Math.max(-32768, Math.min(32767, agentSample + customerSample));
    }

    return encodeWav(mixed);
  }

  private nextCustomerPosition(atMs: number): number {
    return Math.max(this.customer.head, this.positionAt(atMs));
  }

  private positionToMs(position: number): number {
    return Math.round((position / RECORDING_SAMPLE_RATE) * 1000);
  }

  private positionAt(timeMs: number): number {
    return Math.max(0, Math.round(((timeMs - this.startedAtMs) / 1000) * RECORDING_SAMPLE_RATE));
  }
}
