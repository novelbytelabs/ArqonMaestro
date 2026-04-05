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

describe("ChunkManager H3 workflow candidate promotion evidence", () => {
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
    manager.relativeChunkNowMs = () => 777;
    for (const [id, regionId] of [["chunk-1", "open"], ["chunk-2", "mid"], ["chunk-3", "tail"], ["chunk-4", "run"]] as const) {
      manager.chunkH3Route.set(id, "geometric_prefix_asr_tail");
      manager.chunkH3LatestGeometricEvent.set(id, {
        source: "spectral_manifold",
        regionId,
        commandClass: "parameterized",
        parameterType: "open",
        atlasVersion: "v1",
      });
    }
    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits rubric and promotion fields for an exact stable family", () => {
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
        reason: `rubric_${semanticAddressId}`,
      });
    };

    for (const semanticAddressId of ["open_file", "go_to_line", "open_file", "go_to_line"]) {
      emit(semanticAddressId === "open_file" ? "chunk-1" : "chunk-2", semanticAddressId);
    }

    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0] as any;
    expect(lastCall).toEqual(expect.objectContaining({
      workflowCandidateRubricSchemaVersion: "3j_workflow_candidate_rubrics_v1",
      workflowCandidateRubricEligible: true,
      workflowCandidateRubricSuggestedSurface: "inline",
      workflowCandidatePromotionSchemaVersion: "3j_workflow_candidate_promotion_v1",
      workflowCandidatePromotionEligible: true,
      workflowCandidatePromotionDecision: "suggest_inline",
    }));
  });

  it("routes split-required families to inbox promotion instead of higher states", () => {
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
        reason: `rubric_split_${semanticAddressId}`,
      });
    };

    const variantA = ["open_file", "focus_editor", "go_to_line", "run_tests"];
    const variantB = ["open_file", "show_outline", "open_symbol", "run_tests"];
    for (const semanticAddressId of [...variantA, ...variantA, ...variantB, ...variantB]) {
      const chunkId =
        semanticAddressId === "open_file" ? "chunk-1" :
        semanticAddressId === "run_tests" ? "chunk-4" :
        semanticAddressId === "focus_editor" || semanticAddressId === "show_outline" ? "chunk-2" : "chunk-3";
      emit(chunkId, semanticAddressId);
    }

    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0] as any;
    expect(lastCall).toEqual(expect.objectContaining({
      workflowSkeletonInferenceFamilySplitRequired: true,
      workflowCandidateRubricSchemaVersion: "3j_workflow_candidate_rubrics_v1",
      workflowCandidateRubricEligible: true,
      workflowCandidatePromotionSchemaVersion: "3j_workflow_candidate_promotion_v1",
      workflowCandidatePromotionDecision: "suggest_in_inbox",
      workflowCandidatePromotionCeiling: "suggest_in_inbox",
    }));
  });
});
