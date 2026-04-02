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
import { buildFocusConditionedCommandContext } from "../../main/runtime/focus-conditioned-command-context";
import * as runtimeEvidence from "../../main/runtime/h3-runtime-evidence";
import { voiceSemanticAddressRegistry } from "../../main/runtime/voice-semantic-address-registry";

describe("ChunkManager H3 atlas shard evidence", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3FocusContextEnvelope = new Map<string, any>();
    manager.chunkH3AtlasShardHint = new Map<string, any>();
    manager.relativeChunkNowMs = () => 111;
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      atlasVersion: "v1",
    });
    return { ChunkManager, manager };
  }

  it("carries advisory atlas shard hint metadata into runtime evidence", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.93,
        authorityType: "verified",
        snapshotAgeMs: 120,
      },
    });

    ChunkManager.prototype.setFocusConditionedCommandContextForChunk.call(manager, "chunk-1", envelope);
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_started", {
      governanceRequired: true,
      reason: "atlas_shard_hint_observational_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "voice_semantic_address_lookup_started",
      chunkId: "chunk-1",
      atlasShardPolicyVersion: "3e2_policy_shaped_atlas_shards_v1",
      atlasShardHintId: "browser_navigation",
      atlasShardHintEligible: true,
      atlasShardHintSource: "focus_control",
      atlasShardReasonCodes: ["browser_control_shard"],
    }));
  });

  it("emits null shard fields when no focus context envelope is attached", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_started", {
      governanceRequired: true,
      reason: "atlas_shard_hint_absent",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      atlasShardPolicyVersion: null,
      atlasShardHintId: null,
      atlasShardHintEligible: null,
      atlasShardHintSource: null,
      atlasShardHintPriority: null,
      atlasShardReasonCodes: null,
    }));
  });

  it("passes advisory shard hint into lookup and emits shard ranking metadata", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);
    manager.h3GeometricEnabled = true;
    manager.chunkH3LastGeometricSignature = new Map<string, any>();
    manager.chunkH3LatestTailHintText = new Map<string, string>();
    manager.chunkH3StepIndex = new Map<string, number>();
    manager.chunkH3NumericStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3OpenStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3WarmLookup = new Map<string, any>();
    manager.chunkH3TailDecodeActive = new Map<string, boolean>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3Route.set("chunk-1", "legacy_text");
    manager.tracking = { getChunkMetrics: jest.fn(() => ({ received_at: Date.now() - 5 })) };
    manager.h3GeometricGovernor = {
      observe: jest.fn(() => ({ commandClass: "parameterized", structurallyStable: false })),
    };
    manager.h3GeometricRoutingService = {
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "atlas_shard_ranking_pilot" })),
    };
    manager.chunkH3TailDecodeActive.set("chunk-1", false);

    const lookupSpy = jest.spyOn(voiceSemanticAddressRegistry, "lookup").mockReturnValue({
      lookupCandidateCount: 2,
      bestCandidateId: "semantic-1",
      bestCandidateScore: 0.803,
      bestCanonicalMergedText: "open github.com",
      warmHitClass: "weak",
      lookupPath: "candidate_scan",
      slotSignature: null,
      atlasCompatible: true,
      mismatchReason: null,
      confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
      weakThreshold: 0.82,
      strongThreshold: 0.95,
      candidateAgeMs: 220,
      recentConflictPenaltyApplied: false,
      staleProtectionApplied: false,
      focusRankingApplied: false,
      focusRankingBoost: 0,
      focusRankingReasonCodes: ["focus_ranking_not_applicable"],
      focusLegalityApplied: false,
      focusLegalityLawful: null,
      focusLegalityPenaltyApplied: false,
      focusLegalityPenalty: 0,
      focusLegalityReasonCodes: ["focus_legality_not_applicable"],
      focusLegalityCommandKind: null,
      focusTaskMomentumApplied: false,
      focusTaskMomentumBoost: 0,
      focusTaskMomentumPenaltyApplied: false,
      focusTaskMomentumPenalty: 0,
      focusTaskMomentumReasonCodes: ["focus_task_momentum_not_applicable"],
      focusTaskMomentumMatchedSemanticAddressId: null,
      atlasShardRankingApplied: true,
      atlasShardRankingBoost: 0.045,
      atlasShardRankingReasonCodes: ["atlas_shard_browser_target_match"],
      atlasShardRankingCandidateKind: "browser_target",
    });
    jest.spyOn(voiceSemanticAddressRegistry, "markGeometricContext").mockImplementation(() => undefined);

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.95,
        authorityType: "verified",
        snapshotAgeMs: 50,
      },
    });

    ChunkManager.prototype.setFocusConditionedCommandContextForChunk.call(manager, "chunk-1", envelope);
    ChunkManager.prototype.observeH3GeometricEvent.call(manager, "chunk-1", {
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      atlasBacked: true,
      confidence: 0.91,
      frameCount: 30,
      timestampMs: 100,
    }, false, "github.com");

    expect(lookupSpy).toHaveBeenCalledWith(expect.objectContaining({
      atlasShardHint: expect.objectContaining({
        atlasShardHintId: "browser_navigation",
        atlasShardHintEligible: true,
      }),
    }));
    expect(evidenceSpy).toHaveBeenCalledWith(expect.objectContaining({
      event: "voice_semantic_address_lookup_completed",
      atlasShardRankingApplied: true,
      atlasShardRankingBoost: 0.045,
      atlasShardRankingReasonCodes: ["atlas_shard_browser_target_match"],
      atlasShardRankingCandidateKind: "browser_target",
    }));
  });

});
