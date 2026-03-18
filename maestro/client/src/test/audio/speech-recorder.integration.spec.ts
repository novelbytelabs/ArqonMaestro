import { runRecorderScenario } from "./helpers/recorder-harness";
import {
  buildSilenceFrames,
  buildSpeechFrames,
  framesToBuffers,
  makeCleanSpeechFixture,
  makeNearThresholdOscillationFixture,
  makeSpeechWithPauseFixture,
} from "./helpers/pcm-fixtures";

describe("SpeechRecorder Integration (Patch 3 shadow mode)", () => {
  it("keeps primary VAD authoritative for chunk transitions", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkEnds).toBe(1);
  });

  it("runs primary and shadow VAD on the same frame stream", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.providerCalls.denoise).toBe(fixture.buffers.length);
    expect(trace.providerCalls.primaryVad).toBe(fixture.buffers.length);
    expect(trace.providerCalls.shadowVad).toBe(fixture.buffers.length);
    expect(trace.vadComparisons.length).toBe(fixture.buffers.length);
  });

  it("emits enriched speech_start and speech_end turn events", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    const starts = trace.turnEvents.filter((event) => event.type === "speech_start");
    const ends = trace.turnEvents.filter((event) => event.type === "speech_end");

    expect(starts.length).toBe(1);
    expect(ends.length).toBe(1);
    expect(starts[0].frameIndex).toBeLessThan(ends[0].frameIndex);

    expect(starts[0].primary.provider).toBe("DefaultVadProvider");
    expect(starts[0].shadow.provider).toBe("SileroVadProvider");
  });

  it("preserves frame metadata continuity on callbacks", () => {
    const fixture = makeCleanSpeechFixture();
    const captureStart = 1_710_123_456_000;
    const trace = runRecorderScenario({
      buffers: fixture.buffers,
      captureStartWallClockMs: captureStart,
    });

    trace.audioEvents.forEach((event, index) => {
      expect(event.frameIndex).toBe(index);
      expect(event.streamTimeMs).toBeCloseTo(index * 30, 6);
      expect(event.timestampMs).toBeCloseTo(captureStart + index * 30, 6);
    });

    const speechStart = trace.turnEvents.find((event) => event.type === "speech_start");
    expect(speechStart).toBeDefined();
    expect(speechStart?.timestampMs).toBeCloseTo(
      captureStart + (speechStart?.streamTimeMs ?? 0),
      6,
    );
  });

  it("keeps pre-roll bounded and deterministic at chunk start", () => {
    const frames = [
      ...buildSilenceFrames(14),
      ...buildSpeechFrames(3, 14),
      ...buildSilenceFrames(12),
    ];

    const trace = runRecorderScenario({ buffers: framesToBuffers(frames) });
    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkStarts[0].audioLength).toBe(4800);
  });

  it("keeps speaking/silence state propagation consistent", () => {
    const fixture = makeSpeechWithPauseFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    const speakingEvents = trace.audioEvents.filter((event) => event.speaking);
    const silentTail = [...trace.audioEvents].reverse().find((event) => !event.speaking);

    expect(speakingEvents.length).toBeGreaterThan(0);
    expect(silentTail).toBeDefined();
    expect((silentTail?.consecutiveSilence ?? 0)).toBeGreaterThanOrEqual(10);
  });

  it("makes primary/shadow disagreement observable", () => {
    const fixture = makeNearThresholdOscillationFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    const disagreements = trace.vadComparisons.filter((comparison) => !comparison.agreement);
    expect(disagreements.length).toBeGreaterThan(0);
  });
});
