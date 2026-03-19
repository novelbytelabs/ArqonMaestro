import { hasIllegalChunkOrdering, runRecorderScenario } from "./helpers/recorder-harness";
import {
  makeBurstNoiseFixture,
  makeCleanSpeechFixture,
  makeInterruptionCandidateFixture,
  makeSpeechWithPauseFixture,
} from "./helpers/pcm-fixtures";

describe("E2E: SpeechRecorder through replayed PCM (Patch 3)", () => {
  it("clean speech clip keeps primary transitions and runs shadow comparisons", () => {
    const fixture = makeCleanSpeechFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBe(1);
    expect(trace.chunkEnds).toBe(1);
    expect(trace.vadComparisons.length).toBe(fixture.buffers.length);
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
  });

  it("speech with pauses emits enriched speech start/end events", () => {
    const fixture = makeSpeechWithPauseFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });
    const events = trace.turnEvents.map((event) => event.type);

    expect(events).toContain("speech_start");
    expect(events).toContain("speech_end");
  });

  it("interruption-style fixture emits candidate events", () => {
    const fixture = makeInterruptionCandidateFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });
    const eventTypes = trace.turnEvents.map((event) => event.type);

    expect(
      eventTypes.includes("barge_in_candidate") || eventTypes.includes("interrupt_candidate"),
    ).toBe(true);
  });

  it("burst noise does not create illegal transition ordering", () => {
    const fixture = makeBurstNoiseFixture();
    const trace = runRecorderScenario({ buffers: fixture.buffers });

    expect(trace.chunkStarts.length).toBeLessThanOrEqual(1);
    expect(trace.chunkEnds).toBeLessThanOrEqual(1);
    expect(hasIllegalChunkOrdering(trace.eventOrder)).toBe(false);
  });

  it("audio and turn-event payloads include timing metadata", () => {
    const fixture = makeCleanSpeechFixture();
    const captureStart = 1_712_000_000_000;
    const trace = runRecorderScenario({
      buffers: fixture.buffers,
      captureStartWallClockMs: captureStart,
    });

    for (const event of trace.audioEvents) {
      expect(event.timestampMs).toBeCloseTo(captureStart + (event.streamTimeMs ?? 0), 6);
    }

    for (const event of trace.turnEvents) {
      expect(event.timestampMs).toBeCloseTo(captureStart + event.streamTimeMs, 6);
      expect(typeof event.primary.speechProb).toBe("number");
      expect(typeof event.shadow.speechProb).toBe("number");
    }
  });
});
