jest.mock("../../main/stt/cfh", () => ({
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
}));

import { h23Recorder } from "../../main/runtime/h23-live-trace-recorder";

describe("ChunkManager H3 numeric tail specialization", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalRecordFinal = h23Recorder.recordFinal.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.recordFinal = originalRecordFinal;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(): any {
    // Use explicit .ts require to avoid legacy compiled sibling shadowing.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.h3GeometricEnabled = true;
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3ParameterizedPrefix = new Map<string, string>();
    manager.chunkH3TailAudioFrames = new Map<string, Buffer[]>();
    manager.chunkH3TailDecodeActive = new Map<string, boolean>();
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3StepIndex = new Map<string, number>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3LastGeometricSignature = new Map<string, any>();
    manager.chunkH3NumericStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3TailDecodeActive.set("chunk-1", true);
    manager.chunkH3TailAudioFrames.set("chunk-1", [Buffer.from([1, 2, 3, 4])]);
    manager.chunkH3Route.set("chunk-1", "geometric_prefix_asr_tail");
    manager.chunkH3ParameterizedPrefix.set("chunk-1", "go to line");
    manager.chunkH3LatestGeometricEvent.set("chunk-1", {
      source: "spectral_manifold",
      regionId: "go to line",
      commandClass: "parameterized",
      parameterType: "numeric",
      atlasBacked: true,
      confidence: 0.9,
      frameCount: 99,
      timestampMs: 100,
    });
    manager.chunkH3NumericStrategyEnabled.set("chunk-1", true);
    manager.relativeChunkNowMs = () => 111;
    manager.tracking = { getChunkMetrics: jest.fn(() => ({ received_at: Date.now() - 5 })) };
    manager.emitH3Evidence = jest.fn();
    manager.observeH3GeometricEvent = jest.fn();
    manager.stream = { sendTextRequest: jest.fn(async () => undefined) };
    manager.log = { logVerbose: jest.fn() };
    manager.parakeetCommandFastProvider = {
      transcribeCommand: jest.fn(async () => ({
        chunkId: "chunk-1",
        transcript: "fifty two",
        model: "parakeet",
        device: "cpu",
        latencyMs: 10,
        provider: "parakeet",
      })),
    };
    return manager;
  }

  it("normalizes numeric tail and merges canonical transcript", async () => {
    const manager = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).toHaveBeenCalledWith("go to line 52", true, "chunk-1");
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-1",
      "numeric_tail_normalized",
      expect.objectContaining({
        parameterType: "numeric",
        numericNormalized: "52",
        numericStrategyVersion: "3b1-numeric-v1",
      })
    );
  });

  it("rejects partial numeric tails and blocks execution", async () => {
    const manager = makeBareManager();
    manager.parakeetCommandFastProvider.transcribeCommand = jest.fn(async () => ({
      chunkId: "chunk-1",
      transcript: "one hun",
      model: "parakeet",
      device: "cpu",
      latencyMs: 10,
      provider: "parakeet",
    }));
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
    expect(handled).toBe(false);
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalled();
  });

  it("selects numeric strategy only after atlas-backed numeric prefix event", () => {
    const manager = makeBareManager();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    manager.observeH3GeometricEvent = ChunkManager.prototype.observeH3GeometricEvent.bind(manager);
    manager.chunkH3TailDecodeActive.set("chunk-2", false);
    manager.chunkH3Route.set("chunk-2", "legacy_text");
    manager.chunkH3StepIndex.set("chunk-2", 0);
    manager.chunkH3TailAudioFrames.set("chunk-2", []);
    manager.h3GeometricGovernor = {
      observe: jest.fn(() => ({ commandClass: "parameterized", structurallyStable: true })),
    };
    manager.h3GeometricRoutingService = {
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "parameterized" })),
    };

    manager.observeH3GeometricEvent(
      "chunk-2",
      {
        source: "spectral_manifold",
        regionId: "go to line",
        commandClass: "parameterized",
        parameterType: "numeric",
        atlasBacked: true,
        confidence: 0.9,
        frameCount: 99,
        timestampMs: 200,
      },
      false,
      ""
    );

    expect(manager.chunkH3NumericStrategyEnabled.get("chunk-2")).toBe(true);
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-2",
      "numeric_tail_strategy_selected",
      expect.objectContaining({
        parameterType: "numeric",
        numericStrategyVersion: "3b1-numeric-v1",
      })
    );
  });
});
