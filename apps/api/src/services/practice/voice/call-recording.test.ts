import { describe, expect, it } from 'vitest';

import { CallRecording, RECORDING_SAMPLE_RATE } from './call-recording';

const WAV_HEADER_BYTES = 44;

function pcm(sampleCount: number, value: number): Uint8Array {
  const samples = new Int16Array(sampleCount).fill(value);

  return new Uint8Array(samples.buffer);
}

function samplesOf(wav: Buffer): Int16Array {
  const data = wav.subarray(WAV_HEADER_BYTES);

  return new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
}

describe('CallRecording', () => {
  it('is exactly as long as the call, even when audio is missing', () => {
    const recording = new CallRecording(0);
    recording.addCustomerAudio(pcm(800, 1000), RECORDING_SAMPLE_RATE, 1000);

    const wav = recording.toWav(28);

    expect(wav.readUInt32LE(24)).toBe(RECORDING_SAMPLE_RATE);
    expect(samplesOf(wav).length).toBe(28 * RECORDING_SAMPLE_RATE);
  });

  it('places audio at the moment it happened on the call', () => {
    const recording = new CallRecording(0);
    recording.addCustomerAudio(pcm(800, 1000), RECORDING_SAMPLE_RATE, 2000);
    recording.addAgentAudio(pcm(1600, 500), 16000, 5100);

    const samples = samplesOf(recording.toWav(6));

    expect(samples[2 * RECORDING_SAMPLE_RATE - 1]).toBe(0);
    expect(samples[2 * RECORDING_SAMPLE_RATE]).toBe(1000);
    expect(samples[5 * RECORDING_SAMPLE_RATE]).toBe(500);
    expect(samples[5.2 * RECORDING_SAMPLE_RATE]).toBe(0);
  });

  it('plays queued customer speech back to back and drops what an interruption cut off', () => {
    const recording = new CallRecording(0);
    recording.addCustomerAudio(pcm(8000, 1000), RECORDING_SAMPLE_RATE, 1000);
    recording.addCustomerAudio(pcm(8000, 2000), RECORDING_SAMPLE_RATE, 1050);
    recording.cutCustomer(2500);

    const samples = samplesOf(recording.toWav(4));

    expect(samples[1.5 * RECORDING_SAMPLE_RATE]).toBe(1000);
    expect(samples[2.2 * RECORDING_SAMPLE_RATE]).toBe(2000);
    expect(samples[2.6 * RECORDING_SAMPLE_RATE]).toBe(0);
  });

  it('reports where speech lands in the recording', () => {
    const recording = new CallRecording(10_000);
    const firstStartMs = recording.addCustomerAudio(pcm(8000, 1000), RECORDING_SAMPLE_RATE, 11_000);
    const queuedStartMs = recording.addCustomerAudio(pcm(8000, 1000), RECORDING_SAMPLE_RATE, 11_200);

    expect(firstStartMs).toBe(1000);
    expect(queuedStartMs).toBe(2000);
    expect(recording.nextCustomerOffsetMs(11_500)).toBe(3000);
    expect(recording.offsetMs(14_250)).toBe(4250);
    expect(recording.offsetMs(9_000)).toBe(0);
  });
});
