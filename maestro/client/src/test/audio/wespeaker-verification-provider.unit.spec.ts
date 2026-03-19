import WeSpeakerVerificationProvider from "../../main/runtime/wespeaker-verification-provider";

describe("WeSpeakerVerificationProvider", () => {
  it("is not ready when disabled", () => {
    const provider = new WeSpeakerVerificationProvider(
      { enabled: false },
      { fileExists: () => true }
    );
    expect(provider.isReady()).toBe(false);
    expect(provider.getLoadError()).toBe("provider_disabled");
  });

  it("throws predictable error when unavailable", async () => {
    const provider = new WeSpeakerVerificationProvider(
      {
        enabled: true,
        pythonPath: "/missing/python",
        bridgeScriptPath: "/missing/bridge.py",
      },
      { fileExists: () => false }
    );

    await expect(
      provider.verify({
        enrollmentAudioPath: "/tmp/enroll.wav",
        probeAudioPath: "/tmp/probe.wav",
      })
    ).rejects.toThrow("wespeaker_unavailable");
  });

  it("returns similarity on success", async () => {
    let capturedArgs: string[] = [];
    const provider = new WeSpeakerVerificationProvider(
      {
        enabled: true,
        pythonPath: "/tmp/python",
        bridgeScriptPath: "/tmp/wespeaker_bridge.py",
      },
      {
        fileExists: () => true,
        runBridge: async (_pythonPath, _bridgeScriptPath, args) => {
          capturedArgs = args;
          return {
            exitCode: 0,
            stdout: JSON.stringify({ ok: true, similarity: 0.99 }),
            stderr: "",
          };
        },
      }
    );

    const similarity = await provider.verify({
      enrollmentAudioPath: "/tmp/enroll.wav",
      probeAudioPath: "/tmp/probe.wav",
    });

    expect(similarity).toBeCloseTo(0.99, 5);
    expect(capturedArgs).toContain("--enroll-audio");
    expect(capturedArgs).toContain("--probe-audio");
    expect(capturedArgs).toContain("--device");
    expect(capturedArgs).toContain("cpu");
  });
});
