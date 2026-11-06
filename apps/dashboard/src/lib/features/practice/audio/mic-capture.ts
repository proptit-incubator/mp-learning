const WORKLET_URL = '/worklets/pcm-capture.js';
const WORKLET_NAME = 'pcm-capture';

const loadedContexts = new WeakSet<AudioContext>();

function chunkLevel(samples: Int16Array): number {
  if (samples.length === 0) return 0;

  let sumOfSquares = 0;

  for (let index = 0; index < samples.length; index++) {
    const normalized = samples[index] / 0x8000;
    sumOfSquares += normalized * normalized;
  }

  return Math.min(1, Math.sqrt(sumOfSquares / samples.length) * 4);
}

/** Captures the microphone as PCM s16le mono chunks of 100 ms at `targetRate`. */
export class MicCapture {
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sinkNode: GainNode | null = null;

  constructor(
    private readonly context: AudioContext,
    private readonly targetRate: number,
    private readonly onChunk: (samples: Int16Array<ArrayBuffer>, level: number) => void
  ) {}

  /** Asks for the microphone and starts streaming. Rejects when the learner refuses access. */
  async start() {
    if (!loadedContexts.has(this.context)) {
      await this.context.audioWorklet.addModule(WORKLET_URL);
      loadedContexts.add(this.context);
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    this.sourceNode = this.context.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.context, WORKLET_NAME, {
      processorOptions: { targetRate: this.targetRate }
    });
    this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      const samples = new Int16Array(event.data);
      this.onChunk(samples, chunkLevel(samples));
    };

    // Browsers may skip rendering nodes that do not lead to the destination, so route the worklet into a muted gain.
    this.sinkNode = this.context.createGain();
    this.sinkNode.gain.value = 0;
    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.sinkNode);
    this.sinkNode.connect(this.context.destination);
  }

  stop() {
    this.workletNode?.port.close();
    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();
    this.sinkNode?.disconnect();

    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }

    this.stream = null;
    this.sourceNode = null;
    this.workletNode = null;
    this.sinkNode = null;
  }
}
