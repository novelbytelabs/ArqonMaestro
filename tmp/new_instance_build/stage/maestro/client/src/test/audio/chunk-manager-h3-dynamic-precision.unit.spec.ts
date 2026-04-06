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
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      atlasVersion: "v1",
    });

    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits dynamic precision observational fields when semantic result is present", () => {
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
      reason: "dynamic_precision_observational_only",
    });

    expect(evidenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamicPrecisionSchemaVersion: "h3_dynamic_precision_regime_observation_v1",
        dynamicPrecisionPolicyVersion: "3h_dynamic_precision_regimes_v1",
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "open",
        dynamicPrecisionBaselineRegime: "ultra",
        dynamicPrecisionSuggestedRegime: "ultra",
        dynamicPrecisionEscalationEligible: true,
        dynamicPrecisionObservedAmbiguityBand: "high",
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
      })
    );
  });
});
