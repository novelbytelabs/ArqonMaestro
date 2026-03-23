import ParakeetCommandFastProvider, {
  ParakeetFailureReason,
} from "../../main/stt/parakeet-command-fast-provider";

// Mock bridge response signatures (Stage 1 contract)
const BRIDGE_SUCCESS = (model: string, device: string) =>
  JSON.stringify({
    ok: true,
    text: "test command",
    model,
    device,
  });

const BRIDGE_FAILURE = (error: string, retryable: boolean) =>
  JSON.stringify({
    ok: false,
    error,
    retryable,
  });

// Test configurations
const TEST_CONFIG = {
  enabled: true,
  pythonPath: "/usr/bin/python3",
  bridgeScriptPath: "/fake/path/parakeet_bridge.py",
  modelPath: "/fake/path/model",
  device: "cuda" as const,
  timeoutMs: 5000,
  initialPrompt: "test prompt",
};

const MISSING_CONFIG = {
  enabled: true,
  pythonPath: "/nonexistent/python",
  bridgeScriptPath: "/nonexistent/bridge.py",
  modelPath: "/nonexistent/model",
  device: "cuda" as const,
  timeoutMs: 5000,
};

describe("ParakeetCommandFastProvider", () => {
  describe("Failure Matrix", () => {
    describe("invalid python path → provider_unavailable", () => {
      it("should throw provider_unavailable when python path is invalid", async () => {
        const provider = new ParakeetCommandFastProvider(MISSING_CONFIG);

        expect(provider.isReady()).toBe(false);
        expect(provider.getLoadError()).toContain("python_or_bridge_or_model_missing");

        // Attempting to transcribe should throw with provider_unavailable
        await expect(
          provider.transcribeCommand({
            chunkId: "test-123",
            pcm16leAudio: Buffer.alloc(100),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_unavailable");
      });
    });

    describe("exit code 1 / malformed JSON → json_parse_failed", () => {
      it("should map exit code 1 to json_parse_failed when stderr contains 'json'", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest
            .fn()
            .mockResolvedValue({
              exitCode: 1,
              stdout: "",
              stderr: "json decode error",
            }),
        };

        const provider = new ParakeetCommandFastProvider(
          TEST_CONFIG,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeCommand({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_json_parse_failed");
      });

      it("should map exit code 1 to inference_failed when stderr does not contain json", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest
            .fn()
            .mockResolvedValue({
              exitCode: 1,
              stdout: "",
              stderr: "model loading error",
            }),
        };

        const provider = new ParakeetCommandFastProvider(
          TEST_CONFIG,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeCommand({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_inference_failed");
      });

      it("should map malformed JSON response to json_parse_failed", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest
            .fn()
            .mockResolvedValue({
              exitCode: 0,
              stdout: "{ invalid json }",
              stderr: "",
            }),
        };

        const provider = new ParakeetCommandFastProvider(
          TEST_CONFIG,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeCommand({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_json_parse_failed");
      });
    });

    describe("0-byte audio → short-circuit (no bridge spawn)", () => {
      it("should short-circuit without spawning bridge for empty audio", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn(), // Should NOT be called
        };

        const provider = new ParakeetCommandFastProvider(
          TEST_CONFIG,
          undefined,
          mockDeps
        );

        // Empty buffer
        await expect(
          provider.transcribeCommand({
            chunkId: "test-123",
            pcm16leAudio: Buffer.alloc(0),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_empty_audio");

        // Verify bridge was NOT called
        expect(mockDeps.runBridge).not.toHaveBeenCalled();

        // Undefined
        await expect(
          provider.transcribeCommand({
            chunkId: "test-124",
            pcm16leAudio: undefined as any,
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_empty_audio");

        expect(mockDeps.runBridge).not.toHaveBeenCalled();
      });
    });

    describe("timeout → failure metric + fallback", () => {
      it("should throw timeout error when bridge times out", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: -1,
            stdout: "",
            stderr: "parakeet_timeout",
          }),
        };

        const provider = new ParakeetCommandFastProvider(
          TEST_CONFIG,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeCommand({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_timeout");
      });
    });

    describe("Bridge error code mapping", () => {
      const errorCodeTests: Array<{
        bridgeError: string;
        expectedError: ParakeetFailureReason;
      }> = [
        { bridgeError: "empty_audio", expectedError: "empty_audio" },
        { bridgeError: "audio_format_invalid", expectedError: "audio_format_invalid" },
        { bridgeError: "model_load_failed", expectedError: "model_load_failed" },
        { bridgeError: "inference_failed", expectedError: "inference_failed" },
        { bridgeError: "timeout", expectedError: "timeout" },
        { bridgeError: "json_output_invalid", expectedError: "json_parse_failed" },
      ];

      errorCodeTests.forEach(({ bridgeError, expectedError }) => {
        it(`should map bridge error '${bridgeError}' to '${expectedError}'`, async () => {
          const mockDeps = {
            fileExists: () => true,
            mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
            writeFile: jest.fn().mockResolvedValue(undefined),
            rm: jest.fn().mockResolvedValue(undefined),
            runBridge: jest.fn().mockResolvedValue({
              exitCode: 0,
              stdout: BRIDGE_FAILURE(bridgeError, true),
              stderr: "",
            }),
          };

          const provider = new ParakeetCommandFastProvider(
            TEST_CONFIG,
            undefined,
            mockDeps
          );

          await expect(
            provider.transcribeCommand({
              chunkId: "test-123",
              pcm16leAudio: Buffer.from(new Array(100).fill(0)),
              sampleRateHz: 16000,
            })
          ).rejects.toThrow(`parakeet_${expectedError}:`);
        });
      });
    });
  });

  describe("Success path", () => {
    it("should return transcription result on successful bridge response", async () => {
      const mockDeps = {
        fileExists: () => true,
        mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
        writeFile: jest.fn().mockResolvedValue(undefined),
        rm: jest.fn().mockResolvedValue(undefined),
        runBridge: jest.fn().mockResolvedValue({
          exitCode: 0,
          stdout: BRIDGE_SUCCESS("parakeet-ctc", "cuda"),
          stderr: "",
        }),
      };

      const provider = new ParakeetCommandFastProvider(
        TEST_CONFIG,
        undefined,
        mockDeps
      );

      const result = await provider.transcribeCommand({
        chunkId: "test-123",
        pcm16leAudio: Buffer.from(new Array(100).fill(0)),
        sampleRateHz: 16000,
      });

      expect(result.provider).toBe("parakeet");
      expect(result.transcript).toBe("test command");
      expect(result.model).toBe("parakeet-ctc");
      expect(result.device).toBe("cuda");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Provider configuration", () => {
    it("should use environment variables for configuration", () => {
      // Save original env
      const originalEnv = { ...process.env };

      // Set test env vars
      process.env.MAESTRO_COMMAND_PARAKEET_ENABLED = "1";
      process.env.MAESTRO_PARAKEET_PYTHON_PATH = "/test/python";
      process.env.MAESTRO_PARAKEET_BRIDGE_PATH = "/test/bridge.py";
      process.env.MAESTRO_PARAKEET_MODEL_PATH = "/test/model";
      process.env.MAESTRO_PARAKEET_DEVICE = "cpu";

      const provider = new ParakeetCommandFastProvider();

      const config = provider.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.pythonPath).toBe("/test/python");
      expect(config.bridgeScriptPath).toBe("/test/bridge.py");
      expect(config.modelPath).toBe("/test/model");
      expect(config.device).toBe("cpu");

      // Restore original env
      process.env = originalEnv;
    });

    it("should respect disabled configuration", () => {
      const provider = new ParakeetCommandFastProvider({ enabled: false });

      expect(provider.isReady()).toBe(false);
      expect(provider.getLoadError()).toBe("provider_disabled");
    });
  });
});
