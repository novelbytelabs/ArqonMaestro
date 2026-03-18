import { hasIllegalChunkOrdering, runRecorderScenario } from "./helpers/recorder-harness";
import {
  buildSilenceFrames,
  buildSpeechFrames,
  constantFrame,
  framesToBuffers,
  makeBurstNoiseFixture,
  makeClippedDistortedFixture,
  makeTruncatedInputFixture,
} from "./helpers/pcm-fixtures";

describe("Adversarial: SpeechRecorder real recorder path", () => {
  it("handles long silence without crashing or emitting chunks", () => {
    const trace = runRecorderScenario({ buffers: framesToBuffers(buildSilenceFrames(1000)) });
    expect(trace.audioEvents.length).toBe(1000);
    expect(trace.chunkStarts.length).toBe(0);
    expect(trace.chunkEnds).toBe(0);
  });

  it("handles repeated zero-length buffers safely", () => {
    const buffers = [Buffer.alloc(0), Buffer.alloc(0), Buffer.alloc(0), ...framesToBuffers(buildSilenceFrames(5))];
    const trace = runRecorderScenario({ buffers });
    expect(trace.audioEvents.length).toBe(5);
    expect(trace.chunkStarts.length).toBe(0);
    expect(trace.chunkEnds).toBe(0);
  });

  it("handles truncated input without illegal transitions", () => {
    const trace = runRecorderScenario({ buffers: makeTruncatedInputFixture().buffers });
    expect(trace.audioEvents.length).toBeGreaterThan(0);
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);

    const frameIndices = trace.audioEvents.map((event) => event.frameIndex ?? -1);
    for (let i = 1; i < frameIndices.length; i++) {
      expect(frameIndices[i]).toBe(frameIndices[i - 1] + 1);
    }
  });

  it("handles rapid speech/silence alternation without illegal ordering", () => {
    const alternating = Array.from({ length: 80 }, (_, index) =>
      index % 2 === 0 ? constantFrame(10000) : constantFrame(0),
    );
    const trace = runRecorderScenario({ buffers: framesToBuffers(alternating) });

    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
    expect(trace.chunkStarts.length).toBeGreaterThanOrEqual(trace.chunkEnds);
  });

  it("handles clipped input and still closes chunks cleanly", () => {
    const trace = runRecorderScenario({ buffers: makeClippedDistortedFixture().buffers });
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkEnds).toBe(1);
  });

  it("handles burst noise without transition spam", () => {
    const trace = runRecorderScenario({ buffers: makeBurstNoiseFixture().buffers });
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
    expect(trace.chunkStarts.length).toBeLessThanOrEqual(1);
    expect(trace.chunkEnds).toBeLessThanOrEqual(1);
  });

  it("handles sustained background noise without false speech", () => {
    const lowNoise = Array.from({ length: 400 }, () => constantFrame(220));
    const trace = runRecorderScenario({ buffers: framesToBuffers(lowNoise) });
    expect(trace.chunkStarts.length).toBe(0);
    expect(trace.chunkEnds).toBe(0);
  });

  it("handles duplicate buffer injection with monotonic metadata", () => {
    const speechFrame = framesToBuffers(buildSpeechFrames(1, 0))[0];
    const buffers = [
      ...framesToBuffers(buildSilenceFrames(10)),
      speechFrame,
      speechFrame,
      ...framesToBuffers(buildSilenceFrames(12)),
    ];

    const trace = runRecorderScenario({ buffers });
    const frameIndices = trace.audioEvents.map((event) => event.frameIndex ?? -1);
    expect(frameIndices.length).toBe(buffers.length);
    for (let i = 1; i < frameIndices.length; i++) {
      expect(frameIndices[i]).toBe(frameIndices[i - 1] + 1);
    }
  });
});
