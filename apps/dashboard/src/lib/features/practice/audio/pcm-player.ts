const START_LEAD_SECONDS = 0.05;
const ECHO_TAIL_MS = 350;

interface ScheduledSource {
  replyId: number;
  source: AudioBufferSourceNode;
}

/** Plays PCM s16le chunks back to back and reports when the customer stops talking. */
export class PcmPlayer {
  private readonly gain: GainNode;
  private readonly scheduled = new Set<ScheduledSource>();
  private nextStartTime = 0;
  private quietSince = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly onActivityChange: (playing: boolean) => void
  ) {
    this.gain = context.createGain();
    this.gain.connect(context.destination);
  }

  get isPlaying(): boolean {
    return this.scheduled.size > 0;
  }

  /** True while the customer is audible or just finished, so the microphone would pick up the speaker. */
  get isEchoRisk(): boolean {
    if (this.gain.gain.value === 0) return false;

    return this.isPlaying || performance.now() - this.quietSince < ECHO_TAIL_MS;
  }

  setMuted(muted: boolean) {
    this.gain.gain.value = muted ? 0 : 1;
  }

  enqueue(replyId: number, sampleRate: number, samples: Int16Array) {
    if (samples.length === 0) return;

    const buffer = this.context.createBuffer(1, samples.length, sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < samples.length; index++) {
      channel[index] = samples[index] / 0x8000;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gain);

    const startAt = Math.max(this.context.currentTime + START_LEAD_SECONDS, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    const entry: ScheduledSource = { replyId, source };
    const wasPlaying = this.isPlaying;
    this.scheduled.add(entry);
    source.onended = () => this.release(entry);

    if (!wasPlaying) this.onActivityChange(true);
  }

  /** Stops one reply's audio, or everything when no reply is given. */
  stop(replyId?: number) {
    for (const entry of [...this.scheduled]) {
      if (replyId !== undefined && entry.replyId !== replyId) continue;

      entry.source.onended = null;
      entry.source.stop();
      this.release(entry);
    }

    if (!this.isPlaying) this.nextStartTime = 0;
  }

  private release(entry: ScheduledSource) {
    if (!this.scheduled.delete(entry)) return;

    entry.source.disconnect();

    if (this.isPlaying) return;

    this.quietSince = performance.now();
    this.onActivityChange(false);
  }
}
