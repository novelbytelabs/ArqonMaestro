const FRAME_SAMPLES = 480;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;

export interface PcmFixture {
  name: string;
  buffers: Buffer[];
}

function clampInt16(value: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(value)));
}

function frameToBuffer(frame: Int16Array): Buffer {
  const buffer = Buffer.alloc(frame.length * BYTES_PER_SAMPLE);
  for (let i = 0; i < frame.length; i++) {
    buffer.writeInt16LE(frame[i], i * BYTES_PER_SAMPLE);
  }
  return buffer;
}

export function constantFrame(sampleValue: number): Int16Array {
  return new Int16Array(FRAME_SAMPLES).fill(clampInt16(sampleValue));
}

export function sineFrame(amplitude: number, frameIndex: number, frequencyHz = 220): Int16Array {
  const frame = new Int16Array(FRAME_SAMPLES);
  const baseSample = frameIndex * FRAME_SAMPLES;

  for (let i = 0; i < FRAME_SAMPLES; i++) {
    const t = (baseSample + i) / SAMPLE_RATE;
    frame[i] = clampInt16(Math.sin(2 * Math.PI * frequencyHz * t) * amplitude);
  }

  return frame;
}

function makeNoiseGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

export function noiseFrame(amplitude: number, seed: number): Int16Array {
  const next = makeNoiseGenerator(seed);
  const frame = new Int16Array(FRAME_SAMPLES);

  for (let i = 0; i < FRAME_SAMPLES; i++) {
    frame[i] = clampInt16(next() * amplitude);
  }

  return frame;
}

export function buildSilenceFrames(count: number): Int16Array[] {
  return Array.from({ length: count }, () => constantFrame(0));
}

export function buildSpeechFrames(count: number, startFrameIndex: number, amplitude = 12000): Int16Array[] {
  return Array.from({ length: count }, (_, idx) => sineFrame(amplitude, startFrameIndex + idx));
}

export function framesToBuffers(frames: Int16Array[]): Buffer[] {
  return frames.map(frameToBuffer);
}

export function makeCleanSpeechFixture(): PcmFixture {
  const frames = [
    ...buildSilenceFrames(12),
    ...buildSpeechFrames(14, 12),
    ...buildSilenceFrames(12),
  ];

  return { name: "clean-speech", buffers: framesToBuffers(frames) };
}

export function makeSpeechWithPauseFixture(): PcmFixture {
  const frames = [
    ...buildSilenceFrames(8),
    ...buildSpeechFrames(8, 8),
    ...buildSilenceFrames(6),
    ...buildSpeechFrames(8, 22),
    ...buildSilenceFrames(12),
  ];

  return { name: "speech-with-pause", buffers: framesToBuffers(frames) };
}

export function makeInterruptionCandidateFixture(): PcmFixture {
  const frames = [
    ...buildSilenceFrames(20),
    ...buildSpeechFrames(5, 20, 10000),
    ...buildSilenceFrames(4),
    ...buildSpeechFrames(5, 29, 12000),
    ...buildSilenceFrames(14),
  ];
  return { name: "interruption-candidate", buffers: framesToBuffers(frames) };
}

export function makeBurstNoiseFixture(): PcmFixture {
  const frames: Int16Array[] = [];
  frames.push(...buildSilenceFrames(12));
  for (let i = 0; i < 5; i++) {
    frames.push(noiseFrame(20000, 1000 + i));
    frames.push(...buildSilenceFrames(3));
  }
  frames.push(...buildSilenceFrames(12));

  return { name: "burst-noise", buffers: framesToBuffers(frames) };
}

export function makeNearThresholdOscillationFixture(): PcmFixture {
  const frames: Int16Array[] = [];
  frames.push(...buildSilenceFrames(10));
  for (let i = 0; i < 24; i++) {
    const sample = i % 2 === 0 ? 250 : 560;
    frames.push(constantFrame(sample));
  }
  frames.push(...buildSilenceFrames(12));

  return { name: "near-threshold-oscillation", buffers: framesToBuffers(frames) };
}

export function makeClippedDistortedFixture(): PcmFixture {
  const clippedFrames = Array.from({ length: 12 }, (_, idx) => constantFrame(idx % 2 === 0 ? 32767 : -32768));
  const frames = [...buildSilenceFrames(6), ...clippedFrames, ...buildSilenceFrames(12)];
  return { name: "clipped-distorted", buffers: framesToBuffers(frames) };
}

export function makeTruncatedInputFixture(): PcmFixture {
  const baseFrames = [
    ...buildSilenceFrames(4),
    ...buildSpeechFrames(3, 4),
    ...buildSilenceFrames(12),
  ];

  const buffers = framesToBuffers(baseFrames);
  const speechBuffer = frameToBuffer(sineFrame(12000, 999));
  const first = speechBuffer.subarray(0, 113);
  const second = speechBuffer.subarray(113, 700);
  const third = speechBuffer.subarray(700);

  return {
    name: "truncated-input",
    buffers: [buffers[0], buffers[1], first, second, buffers[2], third, ...buffers.slice(3)],
  };
}

export function buildRegressionFixtures(): PcmFixture[] {
  return [
    { name: "silence-only", buffers: framesToBuffers(buildSilenceFrames(30)) },
    makeCleanSpeechFixture(),
    makeSpeechWithPauseFixture(),
    makeInterruptionCandidateFixture(),
    makeBurstNoiseFixture(),
    makeNearThresholdOscillationFixture(),
    makeClippedDistortedFixture(),
    makeTruncatedInputFixture(),
  ];
}
