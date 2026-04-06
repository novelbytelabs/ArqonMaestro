export {};

const cfhMockFactory = () => ({
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
});

describe("ChunkManager H3 dynamic precision evidence", () => {
  afterEach(() => {
    jest.dontMock("../../main/stt/cfh");
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    let ChunkManager: any;
    let h23Recorder: any;
    let runtimeEvidence: any;

    jest.dontMock("../../main/stt/cfh");
    jest.isolateModules(() => {
      jest.doMock("../../main/stt/cfh", cfhMockFactory);
      ({ h23Recorder } = require("../../main/runtime/h23-live-trace-recorder"));
      runtimeEvidence = require("../../main/runtime/h3-runtime-evidence");
      ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    });

    const manager = Object.create(ChunkManager.prototype) as any;
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3FocusContextEnvelope = new Map<string, any>();
    manager.chunkH3AtlasShardHint = new Map<string, any>();
    manager.relativeChunkNowMs = () => 222;
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
    });

    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits bounded escalation pilot fields when repair and guardrail pressure are present", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    jest.spyOn(h23Recorder, "getLatestDecision").mockReturnValue(null);
    manager.getCounterfactualRepairEvidenceFields = jest.fn(() => ({
      counterfactualRepairAmbiguityBand: "high",
      counterfactualRepairSignalRepairWindowOpen: true,
      counterfactualRepairStressBand: "critical",
      counterfactualRepairRankingGuardrailSuggested: true,
      counterfactualRepairRankingGuardrailKind: "hold_for_tail",
    }));
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      semanticAddressId: "go_to_line",
      canonicalMergedText: "go to line 42",
      transcriptText: "go to line for-ty two",
      reason: "dynamic_precision_bounded_escalation_pilot",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamicPrecisionSchemaVersion: "h3_dynamic_precision_regime_observation_v1",
        dynamicPrecisionPolicyVersion: "3h_dynamic_precision_regimes_v1",
        dynamicPrecisionEscalationPilotVersion: "3h_bounded_escalation_trigger_v1",
        dynamicPrecisionFamilySwitchingVersion: "3h_family_aware_regime_switching_v1",
        dynamicPrecisionHysteresisVersion: "3h_hysteresis_deescalation_v1",
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "numeric",
        dynamicPrecisionCurrentRegime: "tight",
        dynamicPrecisionProposedRegime: "ultra",
        dynamicPrecisionEscalationSuggested: true,
        dynamicPrecisionDeescalationEligible: false,
        dynamicPrecisionDeescalationSuggested: false,
        dynamicPrecisionObservedGuardrailSuggested: true,
        dynamicPrecisionObservedGuardrailKind: "hold_for_tail",
        dynamicPrecisionFamilyPolicyId: "3h_family_policy_numeric_v1",
        dynamicPrecisionHysteresisState: "escalation_armed",
        dynamicPrecisionStabilityTickCount: 0,
        dynamicPrecisionCooldownTicksRemaining: 2,
        dynamicPrecisionTransitionAllowed: true,
        dynamicPrecisionTransitionDecision: "escalate_applied",
        dynamicPrecisionActiveRegime: "ultra",
        dynamicPrecisionSwitchApplied: true,
        dynamicPrecisionStrategyProfileId: "3h_strategy_profile_numeric_adaptive_v1",
      })
    );
  });

  it("holds de-escalation during cooldown and then applies it after steady recovery", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    jest.spyOn(h23Recorder, "getLatestDecision").mockReturnValue(null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    manager.getCounterfactualRepairEvidenceFields = jest.fn(() => ({
      counterfactualRepairAmbiguityBand: "high",
      counterfactualRepairSignalRepairWindowOpen: true,
      counterfactualRepairStressBand: "critical",
      counterfactualRepairRankingGuardrailSuggested: true,
      counterfactualRepairRankingGuardrailKind: "hold_for_tail",
    }));

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      semanticAddressId: "go_to_line",
      canonicalMergedText: "go to line 42",
      transcriptText: "go to line for-ty two",
      reason: "dynamic_precision_family_switch_applied",
    });

    manager.getCounterfactualRepairEvidenceFields = jest.fn(() => ({
      counterfactualRepairAmbiguityBand: "low",
      counterfactualRepairSignalRepairWindowOpen: false,
      counterfactualRepairStressBand: "nominal",
      counterfactualRepairRankingGuardrailSuggested: false,
      counterfactualRepairRankingGuardrailKind: null,
    }));

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      semanticAddressId: "go_to_line",
      canonicalMergedText: "go to line 42",
      transcriptText: "go to line 42",
      reason: "dynamic_precision_family_switch_steady_followup_1",
    });

    const secondCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(secondCall).toEqual(
      expect.objectContaining({
        dynamicPrecisionCurrentRegime: "ultra",
        dynamicPrecisionProposedRegime: "tight",
        dynamicPrecisionDeescalationEligible: true,
        dynamicPrecisionDeescalationSuggested: false,
        dynamicPrecisionHysteresisState: "cooldown_active",
        dynamicPrecisionStabilityTickCount: 1,
        dynamicPrecisionCooldownTicksRemaining: 1,
        dynamicPrecisionTransitionAllowed: false,
        dynamicPrecisionTransitionDecision: "deescalation_cooldown_active",
        dynamicPrecisionActiveRegime: "ultra",
        dynamicPrecisionSwitchApplied: false,
      })
    );

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      semanticAddressId: "go_to_line",
      canonicalMergedText: "go to line 42",
      transcriptText: "go to line 42",
      reason: "dynamic_precision_family_switch_steady_followup_2",
    });

    const thirdCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(thirdCall).toEqual(
      expect.objectContaining({
        dynamicPrecisionCurrentRegime: "ultra",
        dynamicPrecisionProposedRegime: "tight",
        dynamicPrecisionDeescalationEligible: true,
        dynamicPrecisionDeescalationSuggested: true,
        dynamicPrecisionHysteresisState: "deescalation_armed",
        dynamicPrecisionStabilityTickCount: 2,
        dynamicPrecisionCooldownTicksRemaining: 0,
        dynamicPrecisionTransitionAllowed: true,
        dynamicPrecisionTransitionDecision: "deescalate_applied",
        dynamicPrecisionActiveRegime: "tight",
        dynamicPrecisionSwitchApplied: true,
      })
    );
  });

  it("emits not-eligible dynamic precision fields when no family can be derived", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    jest.spyOn(h23Recorder, "getLatestDecision").mockReturnValue(null);
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: null,
      commandClass: null,
      parameterType: null,
      atlasVersion: "v1",
    });
    manager.getCounterfactualRepairEvidenceFields = jest.fn(() => ({
      counterfactualRepairAmbiguityBand: null,
      counterfactualRepairSignalRepairWindowOpen: null,
      counterfactualRepairStressBand: null,
      counterfactualRepairRankingGuardrailSuggested: null,
      counterfactualRepairRankingGuardrailKind: null,
    }));
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      transcriptText: "hmm",
      reason: "dynamic_precision_not_eligible",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamicPrecisionEligible: false,
        dynamicPrecisionObservedFamily: null,
        dynamicPrecisionBaselineRegime: null,
        dynamicPrecisionSuggestedRegime: null,
        dynamicPrecisionCurrentRegime: null,
        dynamicPrecisionProposedRegime: null,
        dynamicPrecisionEscalationSuggested: false,
        dynamicPrecisionDeescalationEligible: false,
        dynamicPrecisionDeescalationSuggested: false,
        dynamicPrecisionStabilityTickCount: null,
        dynamicPrecisionCooldownTicksRemaining: null,
        dynamicPrecisionTransitionAllowed: false,
        dynamicPrecisionTransitionDecision: null,
        dynamicPrecisionActiveRegime: null,
        dynamicPrecisionSwitchApplied: false,
        dynamicPrecisionStrategyProfileId: null,
      })
    );
  });
});
