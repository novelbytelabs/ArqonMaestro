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

describe("ChunkManager command-lane provider routing", () => {
  const originalEnv = {
    MAESTRO_ENABLE_PARAKEET_COMMAND_LANE: process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE,
    MAESTRO_ENABLE_WHISPER_COMMAND_LANE: process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE,
    MAESTRO_FORCE_LEGACY_COMMAND_LANE: process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE,
  };

  afterEach(() => {
    if (originalEnv.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE === undefined) {
      delete process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE;
    } else {
      process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE =
        originalEnv.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE;
    }

    if (originalEnv.MAESTRO_ENABLE_WHISPER_COMMAND_LANE === undefined) {
      delete process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE;
    } else {
      process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE =
        originalEnv.MAESTRO_ENABLE_WHISPER_COMMAND_LANE;
    }

    if (originalEnv.MAESTRO_FORCE_LEGACY_COMMAND_LANE === undefined) {
      delete process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE;
    } else {
      process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE = originalEnv.MAESTRO_FORCE_LEGACY_COMMAND_LANE;
    }

    jest.resetModules();
  });

  function createBareChunkManager(): any {
    // Use explicit .ts require to avoid shadowing by legacy compiled .js sibling.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ChunkManager = require("../../main/stream/chunk-manager.ts").default;
    const manager = Object.create(ChunkManager.prototype) as any;
    manager.active = { dictateMode: false };
    manager.log = { logVerbose: jest.fn() };
    manager.loggedWhisperUnavailable = false;
    manager.loggedForceLegacyCommandLane = false;
    manager.whisperCommandFastProvider = {
      isReady: () => true,
      logUnavailableOnce: jest.fn(),
    };
    manager.parakeetCommandFastProvider = {
      isReady: () => true,
    };
    manager.chunkUseParakeetCommandFast = new Map<string, boolean>();
    manager.chunkUseWhisperCommandFast = new Map<string, boolean>();
    manager.chunkUseQwen3AsrDictation = new Map<string, boolean>();
    manager.chunkUseFasterWhisperDictation = new Map<string, boolean>();
    manager.stream = {
      sendEndpointRequest: jest.fn(async () => undefined),
    };
    return manager;
  }

  it("defaults to Parakeet enabled and Whisper disabled for command lane", () => {
    delete process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE;
    delete process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE;
    delete process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE;

    const manager = createBareChunkManager();

    expect(manager.shouldUseParakeetForCurrentChunk()).toBe(true);
    expect(manager.shouldUseWhisperForCurrentChunk()).toBe(false);
  });

  it("force-legacy override disables command-fast providers even when enabled", () => {
    process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE = "1";
    process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE = "1";
    process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE = "1";

    const manager = createBareChunkManager();

    expect(manager.shouldUseParakeetForCurrentChunk()).toBe(false);
    expect(manager.shouldUseWhisperForCurrentChunk()).toBe(false);
    expect(manager.log.logVerbose).toHaveBeenCalledWith(
      "[Chunk] command lane forced to legacy endpoint via MAESTRO_FORCE_LEGACY_COMMAND_LANE=1"
    );
  });

  it("replays chunk audio to legacy endpoint when Parakeet finalize fails", async () => {
    process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE = "1";
    process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE = "0";
    delete process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE;

    const manager = createBareChunkManager();
    const replayFallback = jest.fn(async () => undefined);
    manager.handleParakeetFinalize = jest.fn(async () => false);
    manager.replayBufferedAudioAndFallbackToEndpoint = replayFallback;

    manager.chunkUseParakeetCommandFast.set("chunk-1", true);
    manager.chunkUseWhisperCommandFast.set("chunk-1", false);
    manager.chunkUseQwen3AsrDictation.set("chunk-1", false);
    manager.chunkUseFasterWhisperDictation.set("chunk-1", false);

    await manager.send({ requestType: "endpoint", chunkId: "chunk-1", finalize: true });

    expect(manager.handleParakeetFinalize).toHaveBeenCalledWith("chunk-1");
    expect(replayFallback).toHaveBeenCalledWith("chunk-1", true);
    expect(manager.stream.sendEndpointRequest).not.toHaveBeenCalled();
  });
});
