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
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
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
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "numeric",
        dynamicPrecisionCurrentRegime: "tight",
        dynamicPrecisionProposedRegime: "ultra",
        dynamicPrecisionEscalationSuggested: true,
        dynamicPrecisionObservedGuardrailSuggested: true,
        dynamicPrecisionObservedGuardrailKind: "hold_for_tail",
        dynamicPrecisionFamilyPolicyId: "3h_family_policy_numeric_v1",
        dynamicPrecisionHysteresisState: "escalation_armed",
        dynamicPrecisionTransitionAllowed: false,
      })
    );
  });

  it("emits not-eligible dynamic precision fields when no family can be derived", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
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
        dynamicPrecisionTransitionAllowed: false,
      })
    );
  });
});
