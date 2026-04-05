export {};

const cfhMockFactory = () => ({
  SIG_BYTES: 128,
  SIG_U64S: 16,
  SplitMix64: class {
    nextU64() { return BigInt(0); }
    nextF32Signed() { return 0; }
  },
  normalizeCanonical: () => [],
  normalizeQuery: (q: string) => q,
  generateSignatureBytes: () => new Uint8Array(128),
  sigBytesToU64x16: () => new Array(16).fill(BigInt(0)),
  cfhScoreU64x16: () => 0,
  bucketFromSig: () => 0,
});

describe("ChunkManager H3 workflow skeleton inference evidence", () => {
  beforeEach(() => { jest.clearAllMocks(); jest.unmock("../../main/stt/cfh"); });
  afterEach(() => { jest.unmock("../../main/stt/cfh"); jest.restoreAllMocks(); jest.clearAllMocks(); });

  function makeBareManager(): any {
    let ChunkManager: any; let h23Recorder: any; let runtimeEvidence: any;
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
    manager.relativeChunkNowMs = () => 444;
    for (const [id, regionId, parameterType] of [["chunk-1", "open", "open"], ["chunk-2", "mid", "open"], ["chunk-3", "tail", "open"]] as const) {
      manager.chunkH3Route.set(id, "geometric_prefix_asr_tail");
      manager.chunkH3LatestGeometricEvent.set(id, { source: "spectral_manifold", regionId, commandClass: "parameterized", parameterType, atlasVersion: "v1" });
    }
    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits fixed-step skeleton fields for an exact emerged family", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);
    const emit = (chunkId: string, semanticAddressId: string) => {
      decisionSpy.mockReturnValue({ granted: true });
      ChunkManager.prototype.emitH3Evidence.call(manager, chunkId, "voice_semantic_address_lookup_completed", {
        regionId: semanticAddressId,
        commandClass: "parameterized",
        parameterType: "open",
        semanticAddressId,
        canonicalMergedText: semanticAddressId,
        transcriptText: semanticAddressId,
        reason: `skeleton_${semanticAddressId}`,
      });
    };
    for (const semanticAddressId of ["open_file", "go_to_line", "open_file", "go_to_line"]) {
      emit(semanticAddressId === "open_file" ? "chunk-1" : "chunk-2", semanticAddressId);
    }
    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({
      workflowSkeletonInferenceSchemaVersion: "3j_workflow_skeleton_inference_v1",
      workflowSkeletonInferencePolicyVersion: "3j_bounded_skeleton_inference_v1",
      workflowSkeletonInferenceEligible: true,
      workflowSkeletonInferenceFamilyKey: "open_file=>go_to_line",
      workflowSkeletonInferenceCanonicalStepSemanticAddressIds: ["open_file", "go_to_line"],
      workflowSkeletonInferenceFixedStepIndices: [0, 1],
      workflowSkeletonInferenceVariableStepIndices: [],
      workflowSkeletonInferenceOptionalStepIndices: [],
      workflowSkeletonInferenceInferredSlotCount: 0,
      workflowSkeletonInferenceAbstractionEligible: true,
      workflowSkeletonInferenceFamilySplitRequired: false,
      workflowSkeletonInferenceGovernedStateUpdated: true,
    }));
  });

  it("emits bounded variable-step skeleton fields when a second emerged family variant appears", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);
    const emit = (chunkId: string, semanticAddressId: string) => {
      decisionSpy.mockReturnValue({ granted: true });
      ChunkManager.prototype.emitH3Evidence.call(manager, chunkId, "voice_semantic_address_lookup_completed", {
        regionId: semanticAddressId,
        commandClass: "parameterized",
        parameterType: "open",
        semanticAddressId,
        canonicalMergedText: semanticAddressId,
        transcriptText: semanticAddressId,
        reason: `skeleton_${semanticAddressId}`,
      });
    };
    for (const semanticAddressId of [
      "open_file", "run_tests", "show_panel",
      "open_file", "run_tests", "show_panel",
      "open_file", "run_benchmarks", "show_panel",
      "open_file", "run_benchmarks", "show_panel",
    ]) {
      const chunkId = semanticAddressId === "open_file" ? "chunk-1" : semanticAddressId === "show_panel" ? "chunk-3" : "chunk-2";
      emit(chunkId, semanticAddressId);
    }
    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({
      workflowSkeletonInferenceFamilyKey: "open_file=>show_panel",
      workflowSkeletonInferenceCanonicalStepSemanticAddressIds: ["open_file", "run_benchmarks", "show_panel"],
      workflowSkeletonInferenceFixedStepIndices: [0, 2],
      workflowSkeletonInferenceVariableStepIndices: [1],
      workflowSkeletonInferenceOptionalStepIndices: [],
      workflowSkeletonInferenceInferredSlotCount: 1,
      workflowSkeletonInferenceAbstractionEligible: true,
      workflowSkeletonInferenceFamilyVariantCount: 2,
      workflowSkeletonInferenceFamilySplitRequired: false,
    }));
  });
});
