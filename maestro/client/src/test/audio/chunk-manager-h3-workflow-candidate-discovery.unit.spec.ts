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

describe("ChunkManager H3 workflow candidate discovery evidence", () => {
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
    manager.relativeChunkNowMs = () => 333;
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3Route.set("chunk-2", "geometric_prefix_asr_tail");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", { source: "spectral_manifold", regionId: "open", commandClass: "parameterized", parameterType: "open", atlasVersion: "v1" });
    manager.chunkH3LatestGeometricEvent.set("chunk-2", { source: "spectral_manifold", regionId: "line_nav", commandClass: "parameterized", parameterType: "numeric", atlasVersion: "v1" });
    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits workflow candidate discovery fields when a governed subsequence emerges", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);
    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", { regionId: "open", commandClass: "parameterized", parameterType: "open", semanticAddressId: "open_file", canonicalMergedText: "open file", transcriptText: "open file", reason: "workflow_candidate_seed_1" });
    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", { regionId: "line_nav", commandClass: "parameterized", parameterType: "numeric", semanticAddressId: "go_to_line", canonicalMergedText: "go to line 42", transcriptText: "go to line 42", reason: "workflow_candidate_seed_2" });
    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", { regionId: "open", commandClass: "parameterized", parameterType: "open", semanticAddressId: "open_file", canonicalMergedText: "open file", transcriptText: "open file", reason: "workflow_candidate_seed_3" });
    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", { regionId: "line_nav", commandClass: "parameterized", parameterType: "numeric", semanticAddressId: "go_to_line", canonicalMergedText: "go to line 42", transcriptText: "go to line 42", reason: "workflow_candidate_seed_4" });
    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({
      workflowCandidateDiscoverySchemaVersion: "3j_workflow_candidate_discovery_v1",
      workflowCandidateDiscoveryPolicyVersion: "3j_governed_subsequence_discovery_v1",
      workflowCandidateDiscoveryEligible: true,
      workflowCandidateDiscoverySequenceSemanticAddressIds: ["open_file", "go_to_line"],
      workflowCandidateDiscoveryPatternKey: "open_file::go_to_line",
      workflowCandidateDiscoveryOccurrenceCount: 2,
      workflowCandidateDiscoveryDistinctRunCount: 2,
      workflowCandidateDiscoverySequenceLength: 2,
      workflowCandidateDiscoveryRepeatedSubsequenceDetected: true,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: true,
      workflowCandidateDiscoveryRediscoveryMerged: false,
      workflowCandidateDiscoveryGovernedStateUpdated: true,
      workflowCandidateDiscoverySource: "h3_runtime_evidence",
    }));
  });

  it("does not advance workflow candidate discovery state on an ungranted semantic observation", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    const decisionSpy = jest.spyOn(h23Recorder, "getLatestDecision");
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);
    decisionSpy.mockReturnValue({ granted: true });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "voice_semantic_address_lookup_completed", { regionId: "open", commandClass: "parameterized", parameterType: "open", semanticAddressId: "open_file", canonicalMergedText: "open file", transcriptText: "open file", reason: "workflow_candidate_ungoverned_seed" });
    decisionSpy.mockReturnValue({ granted: false });
    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-2", "voice_semantic_address_lookup_completed", { regionId: "line_nav", commandClass: "parameterized", parameterType: "numeric", semanticAddressId: "go_to_line", canonicalMergedText: "go to line 42", transcriptText: "go to line 42", reason: "workflow_candidate_ungoverned_observation" });
    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0];
    expect(lastCall).toEqual(expect.objectContaining({
      workflowCandidateDiscoveryEligible: false,
      workflowCandidateDiscoverySequenceSemanticAddressIds: null,
      workflowCandidateDiscoveryPatternKey: null,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet: false,
      workflowCandidateDiscoveryGovernedStateUpdated: false,
    }));
  });
});
