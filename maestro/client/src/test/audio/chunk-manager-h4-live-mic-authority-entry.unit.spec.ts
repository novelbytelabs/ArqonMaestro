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

describe("ChunkManager H4 live mic authority entry evidence", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.unmock("../../main/stt/cfh");
  });
  afterEach(() => {
    jest.unmock("../../main/stt/cfh");
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.resetModules();
  });

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
    manager.active = { dictateMode: false };
    manager.stream = { connected: () => true };
    manager.h3GeometricEnabled = true;
    manager.chunkH4AuthorityDefaultPath = new Map<string, any>([["chunk-1", "h3j_authority"]]);
    manager.chunkH4FallbackInvoked = new Map<string, any>([["chunk-1", false]]);
    manager.chunkH4FallbackReason = new Map<string, any>();
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3Route = new Map<string, any>([["chunk-1", "geometric_prefix_asr_tail"]]);
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3FocusContextEnvelope = new Map<string, any>();
    manager.chunkH3AtlasShardHint = new Map<string, any>();
    manager.relativeChunkNowMs = () => 777;
    return { ChunkManager, manager, h23Recorder, runtimeEvidence };
  }

  it("emits explicit live mic authority entry fields", () => {
    const { ChunkManager, manager, h23Recorder, runtimeEvidence } = makeBareManager();
    jest.spyOn(h23Recorder, "getTraceSnapshot").mockReturnValue([]);
    jest.spyOn(h23Recorder, "getLatestDecision").mockReturnValue({ granted: true });
    const evidenceSpy = jest.spyOn(runtimeEvidence, "emitH3RuntimeEvidence").mockImplementation((event: any) => event);

    ChunkManager.prototype.emitH3Evidence.call(manager, "chunk-1", "h4_live_mic_authority_entry", {
      source: "microphone",
      reason: "live_mic_entry_default_authority_path_selected",
    });

    const lastCall = evidenceSpy.mock.calls[evidenceSpy.mock.calls.length - 1][0] as any;
    expect(lastCall).toEqual(expect.objectContaining({
      h4AuthorityEntrySchemaVersion: "h4_authority_entry_v1",
      h4AuthorityEntryPolicyVersion: "h4_live_mic_entry_integration_v1",
      h4AuthorityEntryDefaultPath: "h3j_authority",
      h4AuthorityEntryAuthoritative: true,
      h4AuthorityEntryFallbackInvoked: false,
    }));
  });
});
