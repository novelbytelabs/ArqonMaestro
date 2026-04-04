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

describe("ChunkManager H3 workflow memory evidence", () => {
  afterEach(() => {
    jest.dontMock("../../main/stt/cfh");
    jest.restoreAllMocks();
    jest.clearAllMocks();
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
    manager.relativeChunkNowMs = () => 333;

    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3Route.set("chunk-2", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
    });
    manager.chunkH3LatestGeometricEvent.set("chunk-2", {
      source: "spectral_manifold",
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
    });

    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits session-local workflow sequence fields across governed semantic addresses", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      semanticAddressId: "open_file",
      canonicalMergedText: "open file",
      transcriptText: "open file",
      reason: "workflow_memory_seed_1",
    });

    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      semanticAddressId: "go_to_line",
      canonicalMergedText: "go to line 42",
      transcriptText: "go to line 42",
      reason: "workflow_memory_seed_2",
    });

    const secondCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(secondCall).toEqual(
      expect.objectContaining({
        workflowMemorySchemaVersion: "3i_workflow_memory_observation_v1",
        workflowMemoryPolicyVersion: "3i_session_workflow_memory_v1",
        workflowMemoryEligible: true,
        workflowMemoryCurrentSemanticAddressId: "go_to_line",
        workflowMemoryPreviousSemanticAddressId: "open_file",
        workflowMemoryTransitionObserved: true,
        workflowMemoryTransitionKey: "open_file->go_to_line",
        workflowMemoryTransitionSeenBefore: false,
        workflowMemoryTransitionCount: 1,
        workflowMemorySequenceLength: 2,
        workflowMemoryRepeatDetected: false,
        workflowMemoryContinuationSuggested: false,
        workflowMemoryGovernedStateUpdated: true,
        workflowMemorySource: "h3_runtime_evidence",
      })
    );
  });

  it("does not advance workflow memory state on an ungranted semantic observation", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
    const evidenceSpy = jest
      .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
      .mockImplementation((event: any) => event);

    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      semanticAddressId: "open_file",
      canonicalMergedText: "open file",
      transcriptText: "open file",
      reason: "workflow_memory_governed_seed",
    });

    decisionSpy.mockReturnValue({ granted: false });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      semanticAddressId: "go_to_line",
      canonicalMergedText: "go to line 42",
      transcriptText: "go to line 42",
      reason: "workflow_memory_ungoverned_observation",
    });

    const secondCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(secondCall).toEqual(
      expect.objectContaining({
        workflowMemoryPreviousSemanticAddressId: "open_file",
        workflowMemoryTransitionObserved: true,
        workflowMemoryTransitionCount: 0,
        workflowMemorySequenceLength: 1,
        workflowMemoryGovernedStateUpdated: false,
      })
    );
  });


it("emits bounded workflow-memory ranking metadata for a previously seen governed transition", () => {
  const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
  jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
  const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
  const evidenceSpy = jest
    .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
    .mockImplementation((event: any) => event);

  decisionSpy.mockReturnValue({ granted: true });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
    regionId: "open",
    commandClass: "parameterized",
    parameterType: "open",
    semanticAddressId: "open_file",
    canonicalMergedText: "open file",
    transcriptText: "open file",
    reason: "workflow_memory_rank_seed_1",
  });

  decisionSpy.mockReturnValue({ granted: true });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
    regionId: "line_nav",
    commandClass: "parameterized",
    parameterType: "numeric",
    semanticAddressId: "go_to_line",
    canonicalMergedText: "go to line 42",
    transcriptText: "go to line 42",
    reason: "workflow_memory_rank_seed_2",
  });

  decisionSpy.mockReturnValue({ granted: true });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
    regionId: "open",
    commandClass: "parameterized",
    parameterType: "open",
    semanticAddressId: "open_file",
    canonicalMergedText: "open file",
    transcriptText: "open file",
    reason: "workflow_memory_rank_seed_3",
  });

  decisionSpy.mockReturnValue({ granted: false });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
    regionId: "line_nav",
    commandClass: "parameterized",
    parameterType: "numeric",
    bestCandidateId: "go_to_line",
    canonicalMergedText: "go to line 42",
    transcriptText: "go to line 42",
    reason: "workflow_memory_rank_probe",
  });

  const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
  expect(lastCall).toEqual(
    expect.objectContaining({
      workflowMemoryRankingVersion: "3i_bounded_continuity_ranking_v1",
      workflowMemoryRankingEligible: true,
      workflowMemoryRankingApplied: true,
      workflowMemoryRankingBoost: 0.06,
      workflowMemoryRankingPreviousSemanticAddressId: "open_file",
      workflowMemoryRankingCandidateSemanticAddressId: "go_to_line",
      workflowMemoryRankingMatchedTransitionKey: "open_file->go_to_line",
      workflowMemoryRankingTransitionCount: 1,
      workflowMemoryRankingSeenBefore: true,
      workflowMemoryRankingSource: "h3_runtime_evidence",
    })
  );
});

it("keeps workflow-memory ranking metadata non-applied when no prior governed transition exists", () => {
  const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
  jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
  const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
  const evidenceSpy = jest
    .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
    .mockImplementation((event: any) => event);

  decisionSpy.mockReturnValue({ granted: false });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
    regionId: "line_nav",
    commandClass: "parameterized",
    parameterType: "numeric",
    bestCandidateId: "go_to_line",
    canonicalMergedText: "go to line 42",
    transcriptText: "go to line 42",
    reason: "workflow_memory_rank_unseeded",
  });

  const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
  expect(lastCall).toEqual(
    expect.objectContaining({
      workflowMemoryRankingVersion: "3i_bounded_continuity_ranking_v1",
      workflowMemoryRankingEligible: false,
      workflowMemoryRankingApplied: false,
      workflowMemoryRankingBoost: 0,
      workflowMemoryRankingPreviousSemanticAddressId: null,
      workflowMemoryRankingCandidateSemanticAddressId: "go_to_line",
      workflowMemoryRankingMatchedTransitionKey: null,
      workflowMemoryRankingSeenBefore: false,
    })
  );
});


it("applies continuity-assisted ordering to the emitted best candidate score for a previously seen transition", () => {
  const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
  jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
  const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
  const evidenceSpy = jest
    .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
    .mockImplementation((event: any) => event);

  decisionSpy.mockReturnValue({ granted: true });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
    regionId: "open",
    commandClass: "parameterized",
    parameterType: "open",
    semanticAddressId: "open_file",
    canonicalMergedText: "open file",
    transcriptText: "open file",
    reason: "workflow_memory_order_seed_1",
  });

  decisionSpy.mockReturnValue({ granted: true });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
    regionId: "line_nav",
    commandClass: "parameterized",
    parameterType: "numeric",
    semanticAddressId: "go_to_line",
    canonicalMergedText: "go to line 42",
    transcriptText: "go to line 42",
    reason: "workflow_memory_order_seed_2",
  });

  decisionSpy.mockReturnValue({ granted: true });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", {
    regionId: "open",
    commandClass: "parameterized",
    parameterType: "open",
    semanticAddressId: "open_file",
    canonicalMergedText: "open file",
    transcriptText: "open file",
    reason: "workflow_memory_order_seed_3",
  });

  decisionSpy.mockReturnValue({ granted: false });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
    regionId: "line_nav",
    commandClass: "parameterized",
    parameterType: "numeric",
    bestCandidateId: "go_to_line",
    bestCandidateScore: 0.67,
    canonicalMergedText: "go to line 42",
    transcriptText: "go to line 42",
    reason: "workflow_memory_order_probe",
  });

  const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
  expect(lastCall).toEqual(
    expect.objectContaining({
      bestCandidateScore: 0.73,
      workflowMemoryOrderingVersion: "3i_continuity_assisted_candidate_ordering_v1",
      workflowMemoryOrderingEligible: true,
      workflowMemoryOrderingApplied: true,
      workflowMemoryOrderingBaseScore: 0.67,
      workflowMemoryOrderingAdjustedScore: 0.73,
      workflowMemoryOrderingBoost: 0.06,
      workflowMemoryOrderingPreviousSemanticAddressId: "open_file",
      workflowMemoryOrderingCandidateSemanticAddressId: "go_to_line",
      workflowMemoryOrderingMatchedTransitionKey: "open_file->go_to_line",
      workflowMemoryOrderingTransitionCount: 1,
      workflowMemoryOrderingSource: "h3_runtime_evidence",
    })
  );
});

it("keeps ordering non-applied and leaves score unchanged when no continuity prior exists", () => {
  const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
  jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
  const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
  const evidenceSpy = jest
    .spyOn(runtimeEvidence, "emitH3RuntimeEvidence")
    .mockImplementation((event: any) => event);

  decisionSpy.mockReturnValue({ granted: false });
  ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", {
    regionId: "line_nav",
    commandClass: "parameterized",
    parameterType: "numeric",
    bestCandidateId: "go_to_line",
    bestCandidateScore: 0.67,
    canonicalMergedText: "go to line 42",
    transcriptText: "go to line 42",
    reason: "workflow_memory_order_unseeded",
  });

  const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
  expect(lastCall).toEqual(
    expect.objectContaining({
      bestCandidateScore: 0.67,
      workflowMemoryOrderingVersion: "3i_continuity_assisted_candidate_ordering_v1",
      workflowMemoryOrderingEligible: false,
      workflowMemoryOrderingApplied: false,
      workflowMemoryOrderingBaseScore: 0.67,
      workflowMemoryOrderingAdjustedScore: 0.67,
      workflowMemoryOrderingBoost: 0,
      workflowMemoryOrderingPreviousSemanticAddressId: null,
      workflowMemoryOrderingCandidateSemanticAddressId: "go_to_line",
      workflowMemoryOrderingMatchedTransitionKey: null,
      workflowMemoryOrderingTransitionCount: null,
      workflowMemoryOrderingSource: "h3_runtime_evidence",
    })
  );
});

});
