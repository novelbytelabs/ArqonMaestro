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

describe("ChunkManager H3 counterfactual repair evidence", () => {
  afterEach(() => {
    jest.dontMock("../../main/stt/cfh");
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function makeBareManager(): any {
    let ChunkManager: any;
    let h23Recorder: any;
    let runtimeEvidence: any;

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
    manager.relativeChunkNowMs = () => 111;
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
    });

    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits candidate population and ambiguity pilot metadata when semantic result is present", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => null);
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      semanticAddressId: "open_github",
      canonicalMergedText: "open github.com",
      transcriptText: "open gi- github.com",
      reason: "counterfactual_repair_observational_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        counterfactualRepairSelectionFunctionVersion: "3g_selection_function_v1",
        counterfactualRepairCandidatePopulationSize: 2,
        counterfactualRepairSelectionWinnerSemanticAddressId: "open_github",
        counterfactualRepairDeadDetected: true,
        counterfactualRepairDeadReason: "trajectory_restart_detected",
        counterfactualRepairCounterexampleCaptured: false,
        counterfactualRepairAntibodyEligible: false,
        counterfactualRepairSignalPilotVersion: "3g_repair_signal_pilot_v1",
        counterfactualRepairSignalPilotApplied: true,
        counterfactualRepairSignalTrajectoryState: "restart",
        counterfactualRepairSignalRepairWindowOpen: true,
        counterfactualRepairSignalEscalationSuggested: true,
        counterfactualRepairSignalEscalationKind: "hold_for_repair",
        counterfactualRepairAmbiguityPilotVersion: "3g_nearest_alternative_ambiguity_v1",
        counterfactualRepairAmbiguityPilotApplied: true,
        counterfactualRepairAmbiguityEscalationSuggested: true,
        counterfactualRepairAmbiguityEscalationKind: "request_disambiguation",
      })
    );
  });

  it("emits failure-observer placeholder fields on rejection path without semantic result", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.getLatestDecision = jest.fn(() => ({ granted: false, reason: "recognition_failed_shadow_capture" } as any));
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "open_tail_rejected", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open settings",
      reason: "recognition_failed_shadow_capture",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        counterfactualRepairEligible: true,
        counterfactualRepairCounterexampleCaptured: true,
        counterfactualRepairCounterexampleKind: "recognition_rejection",
        counterfactualRepairAntibodyEligible: true,
        counterfactualRepairStressEvent: "metabolic_stress_observed",
        counterfactualRepairOuroborosEvent: "ouroboros_failure_observed",
        counterfactualRepairSource: "failure_observer",
        counterfactualRepairAmbiguityPilotApplied: false,
      })
    );
  });
});
