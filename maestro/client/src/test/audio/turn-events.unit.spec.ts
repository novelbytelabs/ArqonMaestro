import {
  buildVadShadowComparison,
  shouldEmitBargeInCandidate,
  shouldEmitInterruptCandidate,
} from "../../main/audio/turn-events";
import { VadDecision } from "../../main/audio/vad-provider";

function decision(overrides: Partial<VadDecision>): VadDecision {
  return {
    isSpeech: false,
    speechProb: 0,
    volume: 0,
    noiseFloor: 0.002,
    timestampMs: 1000,
    frameIndex: 0,
    consecutiveSpeech: 0,
    consecutiveSilence: 0,
    provider: "test",
    source: "primary",
    ...overrides,
  };
}

describe("turn-events helpers", () => {
  it("builds comparison metadata with agreement and deltas", () => {
    const comparison = buildVadShadowComparison({
      frameIndex: 12,
      timestampMs: 2000,
      streamTimeMs: 360,
      primary: decision({ isSpeech: false, speechProb: 0.25, provider: "DefaultVadProvider", source: "primary" }),
      shadow: decision({ isSpeech: true, speechProb: 0.8, provider: "SileroVadProvider", source: "shadow" }),
      shadowLeadFrames: 3,
    });

    expect(comparison.agreement).toBe(false);
    expect(comparison.speechProbDelta).toBeCloseTo(0.55, 5);
    expect(comparison.shadowLeadFrames).toBe(3);
  });

  it("emits barge-in candidates only when onset confidence/gap is strong enough", () => {
    const blocked = shouldEmitBargeInCandidate({
      speechStart: true,
      frameIndex: 9,
      lastBargeInCandidateFrame: 7,
      minGapFrames: 6,
      primarySpeechProb: 0.9,
      shadowLeadFrames: 4,
    });
    expect(blocked).toBe(false);

    const allowed = shouldEmitBargeInCandidate({
      speechStart: true,
      frameIndex: 30,
      lastBargeInCandidateFrame: 10,
      minGapFrames: 6,
      primarySpeechProb: 0.8,
      shadowLeadFrames: 0,
    });
    expect(allowed).toBe(true);
  });

  it("emits interrupt candidates only when shadow speech leads primary", () => {
    expect(
      shouldEmitInterruptCandidate({
        frameIndex: 18,
        lastInterruptCandidateFrame: 1,
        minGapFrames: 6,
        primarySpeech: true,
        shadowSpeech: true,
        shadowLeadFrames: 3,
      }),
    ).toBe(false);

    expect(
      shouldEmitInterruptCandidate({
        frameIndex: 18,
        lastInterruptCandidateFrame: 1,
        minGapFrames: 6,
        primarySpeech: false,
        shadowSpeech: true,
        shadowLeadFrames: 3,
      }),
    ).toBe(true);
  });
});
