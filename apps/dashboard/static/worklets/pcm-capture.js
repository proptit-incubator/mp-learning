class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const targetRate = options.processorOptions.targetRate;
    this.ratio = sampleRate / targetRate;
    this.chunkSize = Math.round(targetRate * 0.1);
    this.chunk = new Int16Array(this.chunkSize);
    this.length = 0;
    this.position = 0;
    this.sum = 0;
    this.count = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    for (let index = 0; index < channel.length; index++) {
      this.sum += channel[index];
      this.count += 1;
      this.position += 1;

      if (this.position < this.ratio) continue;

      this.position -= this.ratio;
      const average = Math.max(-1, Math.min(1, this.sum / this.count));
      this.sum = 0;
      this.count = 0;
      this.chunk[this.length] = average < 0 ? average * 0x8000 : average * 0x7fff;
      this.length += 1;

      if (this.length === this.chunkSize) {
        this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
        this.chunk = new Int16Array(this.chunkSize);
        this.length = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor);
