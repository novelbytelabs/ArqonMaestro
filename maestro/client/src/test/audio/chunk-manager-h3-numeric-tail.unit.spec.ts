jest.mock("../../main/stt/cfh", () => ({
  SIG_BYTES: 128,
  SIG_U64S: 16,
  SplitMix64: class {
    nextU64() {
      return BigInt(0);
    }
    nextF32Signed() {
      return 0;
    }
  },
  normalizeCanonical: () => [],
  normalizeQuery: (q: string) => q,
  generateSignatureBytes: () => new Uint8Array(128),
  sigBytesToU64x16: () => new Array(16).fill(BigInt(0)),
  cfhScoreU64x16: () => 0,
  bucketFromSig: () => 0,
}));

import { h23Recorder } from "../../main/runtime/h23-live-trace-recorder";
import { voiceSemanticAddressRegistry } from "../../main/runtime/voice-semantic-address-registry";

describe("ChunkManager H3 numeric tail specialization", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalRecordFinal = h23Recorder.recordFinal.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.recordFinal = originalRecordFinal;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    // Use explicit .ts require to avoid legacy compiled sibling shadowing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.h3GeometricEnabled = true;
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3ParameterizedPrefix = new Map<string, string>();
    manager.chunkH3TailAudioFrames = new Map<string, Buffer[]>();
    manager.chunkH3TailDecodeActive = new Map<string, boolean>();
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3LatestTailHintText = new Map<string, string>();
    manager.chunkH3StepIndex = new Map<string, number>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3LastGeometricSignature = new Map<string, any>();
    manager.chunkH3NumericStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3OpenStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3WarmLookup = new Map<string, any>();
    manager.chunkH3FocusContextEnvelope = new Map<string, any>();
    manager.chunkH3TailDecodeActive.set("chunk-1", true);
    manager.chunkH3TailAudioFrames.set("chunk-1", [Buffer.from([1, 2, 3, 4])]);
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3ParameterizedPrefix.set("chunk-1", "go to line");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasBacked: true,
      confidence: 0.9,
      frameCount: 99,
      timestampMs: 100,
    });
    manager.chunkH3NumericStrategyEnabled.set("chunk-1", true);
    manager.chunkH3OpenStrategyEnabled.set("chunk-1", false);
    manager.relativeChunkNowMs = () => 111;
    manager.tracking = { getChunkMetrics: jest.fn(() => ({ received_at: Date.now() - 5 })) };
    manager.emitH3Evidence = jest.fn();
    manager.observeH3GeometricEvent = jest.fn();
    manager.stream = { sendTextRequest: jest.fn(async () => undefined) };
    manager.log = { logVerbose: jest.fn() };
    manager.parakeetCommandFastProvider = {
      transcribeCommand: jest.fn(async () => ({
        chunkId: "chunk-1",
        transcript: "fifty two",
        model: "parakeet",
        device: "cpu",
        latencyMs: 10,
        provider: "parakeet",
      })),
    };
    return manager;
  }

  it("normalizes numeric tail and merges canonical transcript", async () => {
    const manager = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).toHaveBeenCalledWith("go to line 52", true, "chunk-1");
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-1",
      "numeric_tail_normalized",
      expect.objectContaining({
        parameterType: "numeric",
        numericNormalized: "52",
        numericStrategyVersion: "3b1-numeric-v1",
      })
    );
  });

  it("rejects malformed numeric tails, blocks execution, and avoids finalize fallback", async () => {
    const manager = makeBareManager();
    manager.chunkH3LatestTailHintText.set("chunk-1", "one hun");
    manager.parakeetCommandFastProvider.transcribeCommand = jest.fn(async () => ({
      chunkId: "chunk-1",
      transcript: "100",
      model: "parakeet",
      device: "cpu",
      latencyMs: 10,
      provider: "parakeet",
    }));
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalled();
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-1",
      "numeric_tail_rejected",
      expect.objectContaining({
        parameterType: "numeric",
        numericRaw: "100",
        numericStrategyVersion: "3b1-numeric-v1",
      })
    );
  });

  it("rejects required malformed-tail cases by normalization or hint guard", async () => {
    const manager = makeBareManager();
    const cases: Array<{ transcript: string; hint?: string }> = [
      { transcript: "one hun", hint: "one hun" },
      { transcript: "fifty uh two", hint: "fifty uh two" },
      { transcript: "two hundred and", hint: "two hundred and" },
      { transcript: "zero", hint: "zero" },
      { transcript: "maybe", hint: "maybe" },
      { transcript: "", hint: "" },
    ];
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    for (const c of cases) {
      manager.chunkH3LatestTailHintText.set("chunk-1", c.hint ?? c.transcript);
      manager.parakeetCommandFastProvider.transcribeCommand = jest.fn(async () => ({
        chunkId: "chunk-1",
        transcript: c.transcript,
        model: "parakeet",
        device: "cpu",
        latencyMs: 10,
        provider: "parakeet",
      }));
      const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
      expect(handled).toBe(true);
    }
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalled();
  });

  it("emits live-evidence override, records conflict penalty input, and keeps execution live-truth driven", async () => {
    const manager = makeBareManager();
    const markWarmConflict = jest
      .spyOn(voiceSemanticAddressRegistry, "markWarmConflict")
      .mockReturnValue(null as any);
    manager.chunkH3WarmLookup.set("chunk-1", {
      warmHitClass: "strong",
      bestCandidateId: "semantic-warm-1",
      bestCandidateScore: 0.98,
      bestCanonicalMergedText: "go to line 51",
      lookupPath: "slot_signature_index",
      confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
      weakThreshold: 0.78,
      strongThreshold: 0.93,
      candidateAgeMs: 7300,
      recentConflictPenaltyApplied: true,
      staleProtectionApplied: false,
      warmApplied: true,
      warmAppliedStage: "tail_strategy_prearm",
    });
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
    expect(handled).toBe(true);
    expect(markWarmConflict).toHaveBeenCalledWith("semantic-warm-1");
    expect(manager.stream.sendTextRequest).toHaveBeenCalledWith("go to line 52", true, "chunk-1");
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-1",
      "voice_semantic_address_warm_discarded",
      expect.objectContaining({
        semanticAddressId: "semantic-warm-1",
        canonicalMergedText: "go to line 51",
        confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
        weakThreshold: 0.78,
        strongThreshold: 0.93,
        candidateAgeMs: 7300,
        recentConflictPenaltyApplied: true,
        staleProtectionApplied: false,
        warmDiscardReason: "live_geometric_evidence_override",
        liveEvidenceOverride: true,
      })
    );
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-1",
      "merged_transcript_emitted",
      expect.objectContaining({
        mergedText: "go to line 52",
        confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
        weakThreshold: 0.78,
        strongThreshold: 0.93,
        candidateAgeMs: 7300,
        recentConflictPenaltyApplied: true,
        staleProtectionApplied: false,
        liveEvidenceOverride: true,
      })
    );
  });


  it("emits confidence-policy metadata during warm lookup evidence", () => {
    const manager = makeBareManager();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    manager.observeH3GeometricEvent = ChunkManager.prototype.observeH3GeometricEvent.bind(manager);
    manager.chunkH3TailDecodeActive.set("chunk-2", false);
    manager.chunkH3Route.set("chunk-2", "legacy_text");
    manager.chunkH3StepIndex.set("chunk-2", 0);
    manager.chunkH3TailAudioFrames.set("chunk-2", []);
    manager.h3GeometricGovernor = {
      observe: jest.fn(() => ({ commandClass: "parameterized", structurallyStable: true })),
    };
    manager.h3GeometricRoutingService = {
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "parameterized" })),
    };
    const lookupSpy = jest.spyOn(voiceSemanticAddressRegistry, "lookup").mockReturnValue({
      lookupCandidateCount: 1,
      bestCandidateId: "semantic-warm-2",
      bestCandidateScore: 0.91,
      bestCanonicalMergedText: "go to line 52",
      warmHitClass: "weak",
      lookupPath: "slot_signature_index",
      slotSignature: "goto_line:52",
      atlasCompatible: true,
      mismatchReason: null,
      confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
      weakThreshold: 0.78,
      strongThreshold: 0.93,
      candidateAgeMs: 4200,
      recentConflictPenaltyApplied: true,
      staleProtectionApplied: false,
      focusRankingApplied: false,
      focusRankingBoost: 0,
      focusRankingReasonCodes: ["focus_ranking_not_evaluated"],
      focusLegalityApplied: false,
      focusLegalityLawful: null,
      focusLegalityPenaltyApplied: false,
      focusLegalityPenalty: 0,
      focusLegalityReasonCodes: ["focus_legality_not_evaluated"],
      focusLegalityCommandKind: null,
    });

    manager.observeH3GeometricEvent(
      "chunk-2",
      {
        source: "spectral_manifold",
        regionId: "go to line",
        commandClass: "parameterized",
        parameterType: "numeric",
        atlasBacked: true,
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        confidence: 0.9,
        frameCount: 99,
        timestampMs: 200,
      },
      false,
      "52"
    );

    expect(lookupSpy).toHaveBeenCalled();
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-2",
      "voice_semantic_address_lookup_completed",
      expect.objectContaining({
        confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
        weakThreshold: 0.78,
        strongThreshold: 0.93,
        candidateAgeMs: 4200,
        recentConflictPenaltyApplied: true,
        staleProtectionApplied: false,
      })
    );
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-2",
      "voice_semantic_address_warm_hit",
      expect.objectContaining({
        confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
        weakThreshold: 0.78,
        strongThreshold: 0.93,
        candidateAgeMs: 4200,
        recentConflictPenaltyApplied: true,
        staleProtectionApplied: false,
      })
    );
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-2",
      "voice_semantic_address_warm_applied",
      expect.objectContaining({
        confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
        weakThreshold: 0.78,
        strongThreshold: 0.93,
        candidateAgeMs: 4200,
        recentConflictPenaltyApplied: true,
        staleProtectionApplied: false,
        warmAppliedStage: "shortlist_only",
      })
    );
  });

  it("selects numeric strategy only after atlas-backed numeric prefix event", () => {
    const manager = makeBareManager();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    manager.observeH3GeometricEvent = ChunkManager.prototype.observeH3GeometricEvent.bind(manager);
    manager.chunkH3TailDecodeActive.set("chunk-2", false);
    manager.chunkH3Route.set("chunk-2", "legacy_text");
    manager.chunkH3StepIndex.set("chunk-2", 0);
    manager.chunkH3TailAudioFrames.set("chunk-2", []);
    manager.h3GeometricGovernor = {
      observe: jest.fn(() => ({ commandClass: "parameterized", structurallyStable: true })),
    };
    manager.h3GeometricRoutingService = {
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "parameterized" })),
    };

    manager.observeH3GeometricEvent(
      "chunk-2",
      {
        source: "spectral_manifold",
        regionId: "go to line",
        commandClass: "parameterized",
        parameterType: "numeric",
        atlasBacked: true,
        confidence: 0.9,
        frameCount: 99,
        timestampMs: 200,
      },
      false,
      ""
    );

    expect(manager.chunkH3NumericStrategyEnabled.get("chunk-2")).toBe(true);
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-2",
      "numeric_tail_strategy_selected",
      expect.objectContaining({
        parameterType: "numeric",
        numericStrategyVersion: "3b1-numeric-v1",
      })
    );
  });
});
