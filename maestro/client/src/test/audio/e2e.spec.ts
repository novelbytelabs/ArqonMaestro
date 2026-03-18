import { hasIllegalChunkOrdering, runRecorderScenario } from "./helpers/recorder-harness";
import {
  makeBurstNoiseFixture,
  makeCleanSpeechFixture,
  makeSpeechWithPauseFixture,
} from "./helpers/pcm-fixtures";

describe("E2E: SpeechRecorder through replayed PCM", () => {
  it("clean speech clip produces exactly one start and one end", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkEnds).toBe(1);
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
  });

  it("speech with short pause stays in one chunk and closes once", () => {
    const fixture = makeSpeechWithPauseFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkEnds).toBe(1);
  });

  it("burst noise does not create transition spam", () => {
    const fixture = makeBurstNoiseFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBeLessThanOrEqual(1);
    expect(trace.chunkEnds).toBeLessThanOrEqual(1);
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
  });

  it("callback payloads include real timing metadata", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({
      buffers: fixture.buffers,
      captureStartWallClockMs: 1_712_000_000_000,
    });

    expect(trace.audioEvents.length).toBeGreaterThan(0);
    expect(trace.chunkStarts.length).toBe(1);

    for (const event of trace.audioEvents) {
      expect(typeof event.frameIndex).toBe("number");
      expect(typeof event.timestampMs).toBe("number");
      expect(typeof event.streamTimeMs).toBe("number");
      expect(event.timestampMs).toBeCloseTo(1_712_000_000_000 + (event.streamTimeMs ?? 0), 6);
    }

    const chunkStart = trace.chunkStarts[0];
    expect(typeof chunkStart.frameIndex).toBe("number");
    expect(typeof chunkStart.timestampMs).toBe("number");
    expect(typeof chunkStart.streamTimeMs).toBe("number");
  });
});
