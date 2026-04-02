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

describe("ChunkManager H3 open-tail specialization", () => {
  const originalGetTraceSnapshot = h23Recorder.getTraceSnapshot.bind(h23Recorder);
  const originalRecordFinal = h23Recorder.recordFinal.bind(h23Recorder);
  const originalGetLatestDecision = h23Recorder.getLatestDecision.bind(h23Recorder);

  afterEach(() => {
    h23Recorder.getTraceSnapshot = originalGetTraceSnapshot;
    h23Recorder.recordFinal = originalRecordFinal;
    h23Recorder.getLatestDecision = originalGetLatestDecision;
    jest.restoreAllMocks();
  });

  function makeBareManager(options?: {
    chunkId?: string;
    prefix?: "go to" | "open";
    regionId?: "go to" | "open";
    transcript?: string;
  }): any {
    const chunkId = options?.chunkId ?? "chunk-1";
    const prefix = options?.prefix ?? "go to";
    const regionId = options?.regionId ?? "go to";
    const transcript = options?.transcript ?? "wikipedia dot org";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.h3GeometricEnabled = true;
    manager.chunkH3Route = new Map<string, any>();
    manager.chunkH3ParameterizedPrefix = new Map<string, string>();
    manager.chunkH3TailAudioFrames = new Map<string, Buffer[]>();
    manager.chunkH3TailDecodeActive = new Map<string, boolean>();
    manager.chunkH3LatestGeometricEvent = new Map<string, any>();
    manager.chunkH3LatestTailHintText = new Map<string, string>();
    manager.chunkH3StepIndex = new Map<string, number>();
    manager.chunkH3TailCaptureStartMs = new Map<string, number>();
    manager.chunkH3LastGeometricSignature = new Map<string, any>();
    manager.chunkH3NumericStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3OpenStrategyEnabled = new Map<string, boolean>();
    manager.chunkH3TailDecodeActive.set(chunkId, true);
    manager.chunkH3TailAudioFrames.set(chunkId, [Buffer.from([1, 2, 3, 4])]);
    manager.chunkH3Route.set(chunkId, "geometric_prefix_asr_tail");
    manager.chunkH3ParameterizedPrefix.set(chunkId, prefix);
    manager.chunkH3LatestGeometricEvent.set(chunkId, {
      source: "spectral_manifold",
      regionId,
      commandClass: "parameterized",
      parameterType: "open",
      atlasBacked: true,
      confidence: 0.91,
      frameCount: 99,
      timestampMs: 100,
    });
    manager.chunkH3NumericStrategyEnabled.set(chunkId, false);
    manager.chunkH3OpenStrategyEnabled.set(chunkId, true);
    manager.relativeChunkNowMs = () => 111;
    manager.tracking = { getChunkMetrics: jest.fn(() => ({ received_at: Date.now() - 5 })) };
    manager.emitH3Evidence = jest.fn();
    manager.observeH3GeometricEvent = jest.fn();
    manager.stream = { sendTextRequest: jest.fn(async () => undefined) };
    manager.log = { logVerbose: jest.fn() };
    manager.parakeetCommandFastProvider = {
      transcribeCommand: jest.fn(async () => ({
        chunkId,
        transcript,
        model: "parakeet",
        device: "cpu",
        latencyMs: 10,
        provider: "parakeet",
      })),
    };
    return manager;
  }

  it("normalizes open tail and merges canonical go-to target", async () => {
    const manager = makeBareManager();
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-1");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).toHaveBeenCalledWith("go to wikipedia.org", true, "chunk-1");
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-1",
      "open_tail_normalized",
      expect.objectContaining({
        parameterType: "open",
        openNormalized: "wikipedia.org",
        openTargetKind: "domain",
        openStrategyVersion: "3b2b-open-v1",
      })
    );
  });

  it("normalizes open tail and merges canonical open target", async () => {
    const manager = makeBareManager({
      chunkId: "chunk-open-1",
      prefix: "open",
      regionId: "open",
      transcript: "github dot com",
    });
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-open-1");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).toHaveBeenCalledWith("open github.com", true, "chunk-open-1");
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-open-1",
      "open_tail_normalized",
      expect.objectContaining({
        parameterType: "open",
        openNormalized: "github.com",
        openTargetKind: "domain",
        openStrategyVersion: "3b2b-open-v1",
      })
    );
  });

  it("arms open strategy then rejects malformed target with no executable merged output", async () => {
    const manager = makeBareManager();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    manager.observeH3GeometricEvent = ChunkManager.prototype.observeH3GeometricEvent.bind(manager);
    manager.chunkH3TailDecodeActive.set("chunk-2", false);
    manager.chunkH3Route.set("chunk-2", "legacy_text");
    manager.chunkH3StepIndex.set("chunk-2", 0);
    manager.chunkH3TailAudioFrames.set("chunk-2", [Buffer.from([1, 2])]);
    manager.tracking = { getChunkMetrics: jest.fn(() => ({ received_at: Date.now() - 5 })) };
    manager.h3GeometricGovernor = {
      observe: jest.fn(() => ({ commandClass: "parameterized", structurallyStable: true })),
    };
    manager.h3GeometricRoutingService = {
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "parameterized" })),
    };
    manager.parakeetCommandFastProvider.transcribeCommand = jest.fn(async () => ({
      chunkId: "chunk-2",
      transcript: "maybe",
      model: "parakeet",
      device: "cpu",
      latencyMs: 10,
      provider: "parakeet",
    }));
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    manager.observeH3GeometricEvent(
      "chunk-2",
      {
        source: "spectral_manifold",
        regionId: "go to",
        commandClass: "parameterized",
        parameterType: "open",
        atlasBacked: true,
        confidence: 0.92,
        frameCount: 99,
        timestampMs: 200,
      },
      false,
      "maybe"
    );
    manager.chunkH3TailAudioFrames.set("chunk-2", [Buffer.from([1, 2])]);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-2");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalledWith(
      expect.stringMatching(/^go to /),
      true,
      "chunk-2"
    );
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-2",
      "open_tail_rejected",
      expect.objectContaining({
        parameterType: "open",
        openRaw: "maybe",
        openTargetKind: "unknown",
        openStrategyVersion: "3b2b-open-v1",
      })
    );
    expect(manager.emitH3Evidence).not.toHaveBeenCalledWith(
      "chunk-2",
      "merged_transcript_emitted",
      expect.anything()
    );
  });

  it("rejects app-like ambiguous open target as non-executable (text kind)", async () => {
    const manager = makeBareManager({
      chunkId: "chunk-open-2",
      prefix: "open",
      regionId: "open",
      transcript: "stack over",
    });
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-open-2");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalled();
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-open-2",
      "open_tail_rejected",
      expect.objectContaining({
        parameterType: "open",
        openRaw: "stack over",
        openTargetKind: "text",
        reason: "open_tail_app_like_ambiguous_partial",
      })
    );
    expect(manager.emitH3Evidence).not.toHaveBeenCalledWith(
      "chunk-open-2",
      "merged_transcript_emitted",
      expect.anything()
    );
  });

  it("rejects malformed domain-like open target as non-executable (domain kind)", async () => {
    const manager = makeBareManager({
      chunkId: "chunk-open-3",
      prefix: "open",
      regionId: "open",
      transcript: "github dot",
    });
    h23Recorder.getTraceSnapshot = jest.fn(() => []);
    h23Recorder.recordFinal = jest.fn();
    h23Recorder.getLatestDecision = jest.fn(() => null);

    const handled = await manager.tryHandleH3ParameterizedTailFinalize("chunk-open-3");
    expect(handled).toBe(true);
    expect(manager.stream.sendTextRequest).not.toHaveBeenCalled();
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-open-3",
      "open_tail_rejected",
      expect.objectContaining({
        parameterType: "open",
        openRaw: "github dot",
        openTargetKind: "domain",
      })
    );
    expect(manager.emitH3Evidence).not.toHaveBeenCalledWith(
      "chunk-open-3",
      "merged_transcript_emitted",
      expect.anything()
    );
  });

  it("selects open strategy only after atlas-backed geometric open prefix activation", () => {
    const manager = makeBareManager({
      chunkId: "chunk-open-4",
      prefix: "open",
      regionId: "open",
      transcript: "open ai docs",
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    manager.observeH3GeometricEvent = ChunkManager.prototype.observeH3GeometricEvent.bind(manager);
    manager.h3GeometricGovernor = {
      observe: jest.fn(() => ({ commandClass: "parameterized", structurallyStable: true })),
    };
    manager.h3GeometricRoutingService = {
      decide: jest.fn(() => ({ route: "geometric_prefix_asr_tail", reason: "parameterized" })),
    };
    manager.chunkH3TailDecodeActive.set("chunk-open-4", false);
    manager.chunkH3Route.set("chunk-open-4", "legacy_text");
    manager.chunkH3StepIndex.set("chunk-open-4", 0);

    manager.observeH3GeometricEvent(
      "chunk-open-4",
      {
        source: "spectral_manifold",
        regionId: "open",
        commandClass: "parameterized",
        parameterType: "open",
        atlasBacked: true,
        confidence: 0.92,
        frameCount: 99,
        timestampMs: 220,
      },
      false,
      "open ai docs"
    );

    expect(manager.chunkH3OpenStrategyEnabled.get("chunk-open-4")).toBe(true);
    expect(manager.chunkH3ParameterizedPrefix.get("chunk-open-4")).toBe("open");
    expect(manager.emitH3Evidence).toHaveBeenCalledWith(
      "chunk-open-4",
      "open_tail_strategy_selected",
      expect.objectContaining({
        regionId: "open",
        reason: "open_strategy_selected",
        parameterType: "open",
        openStrategyVersion: "3b2b-open-v1",
      })
    );
  });
});
