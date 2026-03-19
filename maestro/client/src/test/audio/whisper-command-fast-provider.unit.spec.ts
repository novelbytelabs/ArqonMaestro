import WhisperCommandFastProvider from "../../main/stt/whisper-command-fast-provider";

describe("WhisperCommandFastProvider", () => {
  it("is not ready when disabled", () => {
    const provider = new WhisperCommandFastProvider(
      {
        enabled: false,
      },
      undefined,
      {
        fileExists: () => true,
      }
    );

    expect(provider.isReady()).toBe(false);
    expect(provider.getLoadError()).toBe("provider_disabled");
  });

  it("throws predictable error when unavailable", async () => {
    const provider = new WhisperCommandFastProvider(
      {
        enabled: true,
        binaryPath: "/missing/bin/whisper-cli",
        modelPath: "/missing/model.bin",
      },
      undefined,
      {
        fileExists: () => false,
      }
    );

    await expect(
      provider.transcribeCommand({
        chunkId: "chunk-unavailable",
        pcm16leAudio: Buffer.from([0, 1, 2, 3]),
        sampleRateHz: 16000,
      })
    ).rejects.toThrow("whisper_unavailable");
  });

  it("writes wav and returns transcript for command-fast lane", async () => {
    const writes = new Map<string, Buffer>();
    const reads = new Map<string, string>();
    let removedPath = "";
    let capturedArgs: string[] = [];

    const provider = new WhisperCommandFastProvider(
      {
        enabled: true,
        binaryPath: "/tmp/whisper-cli",
        modelPath: "/tmp/ggml-base.en.bin",
        language: "en",
      },
      undefined,
      {
        fileExists: () => true,
        mkdtemp: async () => "/tmp/maestro-whisper-test",
        writeFile: async (targetPath, data) => {
          writes.set(targetPath, data);
        },
        readFile: async (targetPath) => reads.get(targetPath) || "",
        rm: async (targetPath) => {
          removedPath = targetPath;
        },
        runWhisper: async (_binaryPath, args, _timeoutMs) => {
          capturedArgs = args;
          const outputIndex = args.indexOf("-of");
          const outputBase = outputIndex >= 0 ? args[outputIndex + 1] : "";
          reads.set(`${outputBase}.txt`, "focus terminal");
          return {
            exitCode: 0,
            stdout: "",
            stderr: "",
          };
        },
      }
    );

    const result = await provider.transcribeCommand({
      chunkId: "chunk-success",
      pcm16leAudio: Buffer.from([0, 0, 1, 0, 2, 0, 3, 0]),
      sampleRateHz: 16000,
    });

    expect(result.provider).toBe("whisper.cpp");
    expect(result.transcript).toBe("focus terminal");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(capturedArgs).toContain("-nt");
    expect(capturedArgs).toContain("-otxt");
    expect(removedPath).toBe("/tmp/maestro-whisper-test");

    const wavPath = "/tmp/maestro-whisper-test/chunk-success.wav";
    const wavData = writes.get(wavPath);
    expect(wavData).toBeDefined();
    expect(wavData!.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wavData!.subarray(8, 12).toString("ascii")).toBe("WAVE");
  });
});
