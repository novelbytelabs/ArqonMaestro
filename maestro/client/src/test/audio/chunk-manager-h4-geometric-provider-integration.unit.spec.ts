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

describe("ChunkManager H4 geometric provider integration", () => {
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

  function makeBareManager(route: string, latestEvent: any): any {
    let ChunkManager: any; let h23Recorder: any;
    jest.isolateModules(() => {
      jest.doMock("../../main/stt/cfh", cfhMockFactory);
      ({ h23Recorder } = require("../../main/runtime/h23-live-trace-recorder"));
      ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    });
    const streamSession = {
      finalize: jest.fn().mockResolvedValue(latestEvent),
      cancel: jest.fn(),
      sendAudio: jest.fn(),
    };
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.h3GeometricEnabled = true;
    manager.chunkH3Route = new Map([["chunk-1", route]]);
    manager.chunkH3LatestGeometricEvent = new Map([["chunk-1", latestEvent]]);
    manager.chunkGeometricStream = new Map([["chunk-1", streamSession]]);
    manager.stream = { sendTextRequest: jest.fn().mockResolvedValue(undefined), connected: () => true };
    manager.log = { logVerbose: jest.fn() };
    manager.emitH3Evidence = jest.fn();
    manager.tryHandleH3ParameterizedTailFinalize = jest.fn().mockResolvedValue(route === "geometric_prefix_asr_tail");
    manager.observeH3GeometricEvent = jest.fn((chunkId: string, event: any) => {
      if (event) manager.chunkH3LatestGeometricEvent.set(chunkId, event);
    });
    jest.spyOn(h23Recorder, "recordFinal").mockImplementation(() => ({} as any));
    return { ChunkManager, manager, h23Recorder, streamSession };
  }

  it("resolves geometric_only commands without Parakeet finalize", async () => {
    const latestEvent = {
      source: "spectral_manifold",
      regionId: "pause",
      commandClass: "reflex",
      parameterType: null,
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.96,
      frameCount: 8,
      timestampMs: 120,
    };
    const { ChunkManager, manager, streamSession } = makeBareManager("geometric_only", latestEvent);

    const handled = await ChunkManager.prototype.handleGeometricFinalize.call(manager, "chunk-1");

    expect(handled).toBe(true);
    expect(streamSession.finalize).toHaveBeenCalled();
    expect(manager.stream.sendTextRequest).toHaveBeenCalledWith("pause", true, "chunk-1");
  });

  it("lets parameterized route continue to the tail resolver", async () => {
    const latestEvent = {
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasVersion: "v1",
      atlasSchema: "h3_command_atlas_v1",
      confidence: 0.95,
      frameCount: 8,
      timestampMs: 120,
    };
    const { ChunkManager, manager, streamSession } = makeBareManager("geometric_prefix_asr_tail", latestEvent);

    const handled = await ChunkManager.prototype.handleGeometricFinalize.call(manager, "chunk-1");

    expect(handled).toBe(true);
    expect(streamSession.finalize).toHaveBeenCalled();
    expect(manager.tryHandleH3ParameterizedTailFinalize).toHaveBeenCalledWith("chunk-1");
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalled();
  });
});
