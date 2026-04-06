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
import { voiceSemanticAddressRegistry } from "../../main/runtime/voice-semantic-address-registry";
import * as runtimeEvidence from "../../main/runtime/h3-runtime-evidence";

describe("ChunkManager H3 focus context evidence", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
      regionId: "go to",
      commandClass: "parameterized",
      atlasVersion: "v1",
    });
    return { ChunkManager, manager };
  }

  it("carries advisory-only focus metadata into runtime evidence", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "chrome",
        windowId: "window-1",
        regionId: "address-bar",
        controlId: "omnibox",
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: 120,
      },
      focusDelta: [{ kind: "region_transition", fromId: "tab-strip", toId: "address-bar", ageMs: 40 }],
      taskHistoryDelta: [
        { semanticAddressId: "sa-1", mergedText: "focus chrome", outcome: "success", ageMs: 80 },
      ],
    });

    ChunkManager.prototype.setFocusConditionedCommandContextForChunk.call(manager, "chunk-1", envelope);
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      governanceRequired: true,
      reason: "semantic_lookup_started_advisory_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "voice_semantic_address_lookup_completed",
        chunkId: "chunk-1",
        governanceRequired: true,
        focusContextSchemaVersion: "h3_focus_command_context_v1",
        focusContextEligible: true,
        focusSnapshotFresh: true,
        focusAuthorityType: "verified",
        focusAppId: "chrome",
        focusRegionId: "address-bar",
        focusControlId: "omnibox",
        focusRecentDeltaCount: 1,
        focusRecentTaskHistoryCount: 1,
        focusRankingEligible: true,
        focusLegalityEligible: true,
        focusDeicticResolutionEligible: true,
        focusReasonCodes: [],
      })
    );
  });


  it("passes focus envelope into semantic lookup and emits advisory ranking metadata", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);
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
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "focus_context_ranking_pilot" })),
    };
    manager.chunkH3TailDecodeActive.set("chunk-1", false);

    const lookupSpy = jest.spyOn(voiceSemanticAddressRegistry, "lookup").mockReturnValue({
      lookupCandidateCount: 2,
      bestCandidateId: "semantic-1",
      bestCandidateScore: 0.812,
      bestCanonicalMergedText: "open github.com",
      warmHitClass: "weak",
      lookupPath: "candidate_scan",
      slotSignature: null,
      atlasCompatible: true,
      mismatchReason: null,
      confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
      weakThreshold: 0.82,
      strongThreshold: 0.95,
      candidateAgeMs: 300,
      recentConflictPenaltyApplied: false,
      staleProtectionApplied: false,
      focusRankingApplied: true,
      focusRankingBoost: 0.05,
      focusRankingReasonCodes: ["browser_navigation_focus_context", "recent_task_exact_match"],
      focusLegalityApplied: false,
      focusLegalityLawful: null,
      focusLegalityPenaltyApplied: false,
      focusLegalityPenalty: 0,
      focusLegalityReasonCodes: ["focus_legality_not_applicable"],
      focusLegalityCommandKind: null,
      focusTaskMomentumApplied: true,
      focusTaskMomentumBoost: 0.03,
      focusTaskMomentumPenaltyApplied: false,
      focusTaskMomentumPenalty: 0,
      focusTaskMomentumReasonCodes: ["recent_semantic_reuse"],
      focusTaskMomentumMatchedSemanticAddressId: "semantic-1",
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
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: 120,
      },
      taskHistoryDelta: [
        { semanticAddressId: "sa-1", mergedText: "open github.com", outcome: "success", ageMs: 80 },
      ],
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
      confidence: 0.92,
      frameCount: 40,
      timestampMs: 100,
    }, false, "github.com");

    expect(lookupSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        chunkId: "chunk-1",
        regionId: "open",
        parameterType: "open",
        focusContextEnvelope: envelope,
      })
    );
    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "voice_semantic_address_lookup_completed",
        focusRankingApplied: true,
        focusRankingBoost: 0.05,
        focusRankingReasonCodes: ["browser_navigation_focus_context", "recent_task_exact_match"],
        focusTaskMomentumApplied: true,
        focusTaskMomentumBoost: 0.03,
        focusTaskMomentumPenaltyApplied: false,
        focusTaskMomentumPenalty: 0,
        focusTaskMomentumReasonCodes: ["recent_semantic_reuse"],
        focusTaskMomentumMatchedSemanticAddressId: "semantic-1",
      })
    );
  });

  it("emits advisory deictic legality metadata for open it lookup", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);
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
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "focus_context_legality_pilot" })),
    };
    manager.chunkH3TailDecodeActive.set("chunk-1", false);

    jest.spyOn(voiceSemanticAddressRegistry, "lookup").mockReturnValue({
      lookupCandidateCount: 1,
      bestCandidateId: "semantic-deictic-1",
      bestCandidateScore: 0.734,
      bestCanonicalMergedText: "open it",
      warmHitClass: "miss",
      lookupPath: "candidate_scan",
      slotSignature: null,
      atlasCompatible: true,
      mismatchReason: null,
      confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
      weakThreshold: 0.82,
      strongThreshold: 0.95,
      candidateAgeMs: 180,
      recentConflictPenaltyApplied: false,
      staleProtectionApplied: false,
      focusRankingApplied: false,
      focusRankingBoost: 0,
      focusRankingReasonCodes: ["focus_ranking_no_match"],
      focusLegalityApplied: true,
      focusLegalityLawful: true,
      focusLegalityPenaltyApplied: false,
      focusLegalityPenalty: 0,
      focusLegalityReasonCodes: ["deictic_selection_anchor"],
      focusLegalityCommandKind: "open_it",
      focusTaskMomentumApplied: false,
      focusTaskMomentumBoost: 0,
      focusTaskMomentumPenaltyApplied: false,
      focusTaskMomentumPenalty: 0,
      focusTaskMomentumReasonCodes: ["focus_task_momentum_no_match"],
      focusTaskMomentumMatchedSemanticAddressId: null,
      atlasShardRankingApplied: false,
      atlasShardRankingBoost: 0,
      atlasShardRankingReasonCodes: ["atlas_shard_ranking_not_evaluated"],
      atlasShardRankingCandidateKind: null,
    });
    jest.spyOn(voiceSemanticAddressRegistry, "markGeometricContext").mockImplementation(() => undefined);

    const envelope = buildFocusConditionedCommandContext({
      snapshot: {
        appId: "code",
        windowId: "window-1",
        regionId: "editor",
        controlId: "text-buffer",
        hasSelection: true,
        selectionTextLength: 6,
        focusConfidence: 0.93,
        authorityType: "verified",
        snapshotAgeMs: 80,
      },
    });

    ChunkManager.prototype.setFocusConditionedCommandContextForChunk.call(manager, "chunk-1", envelope);
    ChunkManager.prototype.observeH3GeometricEvent.call(
      manager,
      "chunk-1",
      {
        source: "spectral_manifold",
        regionId: "open",
        commandClass: "parameterized",
        parameterType: "open",
        atlasVersion: "v1",
        atlasSchema: "h3_command_atlas_v1",
        atlasBacked: true,
        confidence: 0.92,
        frameCount: 40,
        timestampMs: 100,
      },
      false,
      "it"
    );

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "voice_semantic_address_lookup_completed",
        canonicalMergedText: "open it",
        focusLegalityApplied: true,
        focusLegalityLawful: true,
        focusLegalityPenaltyApplied: false,
        focusLegalityPenalty: 0,
        focusLegalityReasonCodes: ["deictic_selection_anchor"],
        focusLegalityCommandKind: "open_it",
      })
    );
  });

  it("emits null focus metadata when no envelope is attached to the chunk", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "route_activation", {
      governanceRequired: true,
      reason: "route_selected",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "route_activation",
        chunkId: "chunk-1",
        focusContextSchemaVersion: null,
        focusContextEligible: null,
        focusRankingEligible: null,
        focusLegalityEligible: null,
        focusLegalityApplied: null,
        focusLegalityCommandKind: null,
        focusReasonCodes: null,
      })
    );
  });

  it("carries advisory task-history momentum metadata into runtime evidence", () => {
    const { ChunkManager, manager } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);
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
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "focus_context_task_momentum_pilot" })),
    };
    manager.chunkH3TailDecodeActive.set("chunk-1", false);

    jest.spyOn(voiceSemanticAddressRegistry, "lookup").mockReturnValue({
      lookupCandidateCount: 1,
      bestCandidateId: "semantic-1",
      bestCandidateScore: 0.854,
      bestCanonicalMergedText: "open github.com",
      warmHitClass: "weak",
      lookupPath: "candidate_scan",
      slotSignature: null,
      atlasCompatible: true,
      mismatchReason: null,
      confidencePolicyVersion: "3d3_conflict_aware_warm_confidence_v1",
      weakThreshold: 0.82,
      strongThreshold: 0.95,
      candidateAgeMs: 210,
      recentConflictPenaltyApplied: false,
      staleProtectionApplied: false,
      focusRankingApplied: true,
      focusRankingBoost: 0.04,
      focusRankingReasonCodes: ["browser_navigation_focus_context"],
      focusLegalityApplied: false,
      focusLegalityLawful: null,
      focusLegalityPenaltyApplied: false,
      focusLegalityPenalty: 0,
      focusLegalityReasonCodes: ["focus_legality_not_applicable"],
      focusLegalityCommandKind: null,
      focusTaskMomentumApplied: true,
      focusTaskMomentumBoost: 0.03,
      focusTaskMomentumPenaltyApplied: false,
      focusTaskMomentumPenalty: 0,
      focusTaskMomentumReasonCodes: ["recent_semantic_reuse"],
      focusTaskMomentumMatchedSemanticAddressId: "semantic-1",
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
        focusConfidence: 0.91,
        authorityType: "verified",
        snapshotAgeMs: 120,
      },
      taskHistoryDelta: [
        { semanticAddressId: "semantic-1", mergedText: "open github.com", outcome: "success", ageMs: 40 },
      ],
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
      confidence: 0.92,
      frameCount: 40,
      timestampMs: 100,
    }, false, "github.com");

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "voice_semantic_address_lookup_completed",
        focusTaskMomentumApplied: true,
        focusTaskMomentumBoost: 0.03,
        focusTaskMomentumPenaltyApplied: false,
        focusTaskMomentumPenalty: 0,
        focusTaskMomentumReasonCodes: ["recent_semantic_reuse"],
        focusTaskMomentumMatchedSemanticAddressId: "semantic-1",
      })
    );
  });

});
