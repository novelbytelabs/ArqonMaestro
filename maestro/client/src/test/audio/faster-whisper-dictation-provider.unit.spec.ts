import FasterWhisperDictationProvider from "../../main/stt/faster-whisper-dictation-provider";

describe("FasterWhisperDictationProvider", () => {
  it("is not ready when disabled", () => {
    const provider = new FasterWhisperDictationProvider(
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
    const provider = new FasterWhisperDictationProvider(
      {
        enabled: true,
        pythonPath: "/missing/python",
        bridgeScriptPath: "/missing/bridge.py",
      },
      undefined,
      {
        fileExists: () => false,
      }
    );

    await expect(
      provider.transcribeDictation({
        chunkId: "chunk-unavailable",
        pcm16leAudio: Buffer.from([0, 1, 2, 3]),
        sampleRateHz: 16000,
      })
    ).rejects.toThrow("faster_whisper_unavailable");
  });

  it("writes wav and returns bridge transcript for dictation lane", async () => {
    let capturedArgs: string[] = [];
    let capturedStdin: Buffer | undefined;

    const provider = new FasterWhisperDictationProvider(
      {
        enabled: true,
        pythonPath: "/tmp/python",
        bridgeScriptPath: "/tmp/faster_whisper_bridge.py",
        model: "small",
        device: "cuda",
        computeType: "int8_float16",
      },
      undefined,
      {
        fileExists: () => true,
        runBridgeWithStdin: async (_pythonPath, _bridgeScriptPath, args, stdinBuffer, _timeoutMs) => {
          capturedArgs = args;
          capturedStdin = stdinBuffer;
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              text: "this is dictation text",
              language: "en",
              model: "small",
              device: "cuda",
            }),
            stderr: "",
          };
        },
      }
    );

    const result = await provider.transcribeDictation({
      chunkId: "chunk-success",
      pcm16leAudio: Buffer.from([0, 0, 1, 0, 2, 0, 3, 0]),
      sampleRateHz: 16000,
    });

    expect(result.provider).toBe("faster-whisper");
    expect(result.text).toBe("this is dictation text");
    expect(result.language).toBe("en");
    expect(result.model).toBe("small");
    expect(result.device).toBe("cuda");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(capturedArgs).toContain("--stdin");
    expect(capturedArgs).toContain("--compute-type");
    expect(capturedStdin).toBeDefined();
    expect(capturedStdin!.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(capturedStdin!.subarray(8, 12).toString("ascii")).toBe("WAVE");
  });

  it("throws when bridge returns failure payload", async () => {
    const provider = new FasterWhisperDictationProvider(
      {
        enabled: true,
        pythonPath: "/tmp/python",
        bridgeScriptPath: "/tmp/faster_whisper_bridge.py",
      },
      undefined,
      {
        fileExists: () => true,
        runBridgeWithStdin: async () => ({
          exitCode: 0,
          stdout: JSON.stringify({ ok: false, error: "gpu_not_available" }),
          stderr: "",
        }),
      }
    );

    await expect(
      provider.transcribeDictation({
        chunkId: "chunk-failure",
        pcm16leAudio: Buffer.from([0, 0, 1, 0]),
        sampleRateHz: 16000,
      })
    ).rejects.toThrow("faster_whisper_bridge_failure:gpu_not_available");
  });
});
