import PyannoteDiarizationProvider from "../../main/runtime/pyannote-diarization-provider";

describe("PyannoteDiarizationProvider", () => {
  it("is not ready when disabled", () => {
    const provider = new PyannoteDiarizationProvider(
      {
        enabled: false,
      },
      {
        fileExists: () => true,
      }
    );

    expect(provider.isReady()).toBe(false);
    expect(provider.getLoadError()).toBe("provider_disabled");
  });

  it("throws predictable error when unavailable", async () => {
    const provider = new PyannoteDiarizationProvider(
      {
        enabled: true,
        pythonPath: "/missing/python",
        bridgeScriptPath: "/missing/bridge.py",
      },
      {
        fileExists: () => false,
      }
    );

    await expect(
      provider.diarize({
        chunkId: "chunk-unavailable",
        pcm16leAudio: Buffer.from([0, 1, 2, 3]),
        sampleRateHz: 16000,
      })
    ).rejects.toThrow("pyannote_unavailable");
  });

  it("writes wav and returns diarization segments", async () => {
    const writes = new Map<string, Buffer>();
    let removedPath = "";
    let capturedArgs: string[] = [];

    const provider = new PyannoteDiarizationProvider(
      {
        enabled: true,
        pythonPath: "/tmp/python",
        bridgeScriptPath: "/tmp/pyannote_diarization_bridge.py",
      },
      {
        fileExists: () => true,
        mkdtemp: async () => "/tmp/maestro-pyannote-test",
        writeFile: async (targetPath, data) => {
          writes.set(targetPath, data);
        },
        rm: async (targetPath) => {
          removedPath = targetPath;
        },
        runBridge: async (_pythonPath, _bridgeScriptPath, args, _timeoutMs, _tokenEnvVarName) => {
          capturedArgs = args;
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              segments: [
                { start: 0.0, end: 1.2, speaker: "SPEAKER_00" },
                { start: 1.2, end: 2.5, speaker: "SPEAKER_01" },
              ],
            }),
            stderr: "",
          };
        },
      }
    );

    const result = await provider.diarize({
      chunkId: "chunk-success",
      pcm16leAudio: Buffer.from([0, 0, 1, 0, 2, 0, 3, 0]),
      sampleRateHz: 16000,
    });

    expect(result).toHaveLength(2);
    expect(result[0].speaker).toBe("SPEAKER_00");
    expect(result[1].speaker).toBe("SPEAKER_01");
    expect(capturedArgs).toContain("--audio");
    expect(capturedArgs).toContain("--pipeline");
    expect(removedPath).toBe("/tmp/maestro-pyannote-test");

    const wavPath = "/tmp/maestro-pyannote-test/chunk-success.wav";
    const wavData = writes.get(wavPath);
    expect(wavData).toBeDefined();
    expect(wavData!.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wavData!.subarray(8, 12).toString("ascii")).toBe("WAVE");
  });
});
