import { runRecorderScenario } from "./helpers/recorder-harness";
import {
  buildSilenceFrames,
  buildSpeechFrames,
  framesToBuffers,
  makeCleanSpeechFixture,
  makeSpeechWithPauseFixture,
} from "./helpers/pcm-fixtures";

describe("SpeechRecorder Integration (Real Recorder Path)", () => {
  it("keeps frame metadata continuity on onAudio callbacks", () => {
    const fixture = makeCleanSpeechFixture();
    const captureStart = 1_710_123_456_000;
    const trace = runRecorderScenario({
      buffers: fixture.buffers,
      captureStartWallClockMs: captureStart,
    });

    expect(trace.audioEvents.length).toBe(fixture.buffers.length);

    trace.audioEvents.forEach((event, index) => {
      expect(event.frameIndex).toBe(index);
      expect(event.streamTimeMs).toBeCloseTo(index * 30, 6);
      expect(event.timestampMs).toBeCloseTo(captureStart + index * 30, 6);
    });
  });

  it("invokes denoise and VAD providers through the recorder path", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.providerCalls.denoise).toBe(trace.audioEvents.length);
    expect(trace.providerCalls.vad).toBe(trace.audioEvents.length);
    expect(trace.providerCalls.denoise).toBe(fixture.buffers.length);
  });

  it("emits exactly one chunk start and one chunk end for a clean speech clip", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkEnds).toBe(1);
  });

  it("includes bounded and deterministic pre-roll at chunk start", () => {
    const frames = [
      ...buildSilenceFrames(14),
      ...buildSpeechFrames(3, 14),
      ...buildSilenceFrames(12),
    ];

    const trace = runRecorderScenario({ buffers: framesToBuffers(frames) });
    expect(trace.chunkStarts.length).toBe(1);

    const prerollSamples = trace.chunkStarts[0].audioLength;
    expect(prerollSamples).toBe(4800);
    expect(prerollSamples).toBeLessThanOrEqual(4800);
  });

  it("propagates speaking and consecutiveSilence state consistently", () => {
    const fixture = makeSpeechWithPauseFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    const speakingEvents = trace.audioEvents.filter((event) => event.speaking);
    const silentTail = [...trace.audioEvents].reverse().find((event) => !event.speaking);

    expect(speakingEvents.length).toBeGreaterThan(0);
    expect(silentTail).toBeDefined();
    expect((silentTail?.consecutiveSilence ?? 0)).toBeGreaterThanOrEqual(10);
  });
});
