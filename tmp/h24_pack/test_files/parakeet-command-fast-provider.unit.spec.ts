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
          runBridgeWithStdin: jest
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
          runBridgeWithStdin: jest
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
          runBridgeWithStdin: jest
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
          runBridgeWithStdin: jest.fn(), // Should NOT be called
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
        expect(mockDeps.runBridgeWithStdin).not.toHaveBeenCalled();

        // Undefined
        await expect(
          provider.transcribeCommand({
            chunkId: "test-124",
            pcm16leAudio: undefined as any,
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("parakeet_empty_audio");

        expect(mockDeps.runBridgeWithStdin).not.toHaveBeenCalled();
      });
    });

    describe("timeout → failure metric + fallback", () => {
      it("should throw timeout error when bridge times out", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn().mockResolvedValue({
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
            runBridgeWithStdin: jest.fn().mockResolvedValue({
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
        runBridgeWithStdin: jest.fn().mockResolvedValue({
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

  // ====== Stage 2A: Sidecar Contract Tests ======
  describe("Sidecar mode routing", () => {
    const SIDECAR_CONFIG = {
      enabled: true,
      pythonPath: "/usr/bin/python3",
      bridgeScriptPath: "/fake/path/parakeet_bridge.py",
      modelPath: "/fake/path/model",
      device: "cuda" as const,
      timeoutMs: 5000,
      initialPrompt: "test prompt",
      mode: "sidecar" as const,
      sidecarUrl: "ws://127.0.0.1:7782/transcribe_stream",
    };

    const createMockWebSocket = () => {
      const handlers: any = {};
      const ws = {
        on: jest.fn((event, cb) => { handlers[event] = cb; }),
        send: jest.fn(),
        close: jest.fn(),
        terminate: jest.fn(),
        readyState: 1, // OPEN
        __simulateOpen: () => handlers['open']?.(),
        __simulateMessage: (data: string) => handlers['message']?.(Buffer.from(data)),
        __simulateError: (err: Error) => handlers['error']?.(err),
        __simulateClose: () => handlers['close']?.()
      };
      return ws;
    };

    describe("sidecar mode routing decision", () => {
      it("should route to sidecar when mode is 'sidecar' and url is configured", async () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs)
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const transcribePromise = provider.transcribeCommand({
          chunkId: "test-sidecar",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        // Simulate successful websocket lifecycle
        mockWs.__simulateOpen();
        mockWs.__simulateMessage(JSON.stringify({
          ok: true,
          is_final: true,
          text: "sidecar command"
        }));

        const result = await transcribePromise;

        expect(mockDeps.createWebSocket).toHaveBeenCalledWith("ws://127.0.0.1:7782/transcribe_stream");
        expect(mockDeps.runBridgeWithStdin).not.toHaveBeenCalled();
        expect(result.transcript).toBe("sidecar command");
        expect(result.provider).toBe("parakeet");
      });

      it("should route to local when mode is 'local' (default)", async () => {
        const LOCAL_CONFIG = {
          enabled: true,
          pythonPath: "/usr/bin/python3",
          bridgeScriptPath: "/fake/path/parakeet_bridge.py",
          modelPath: "/fake/path/model",
          device: "cuda" as const,
          timeoutMs: 5000,
          initialPrompt: "test prompt",
          mode: "local" as const,
        };

        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              text: "local command",
              model: "parakeet-local",
              device: "cuda",
            }),
            stderr: "",
          }),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn()
        };

        const provider = new ParakeetCommandFastProvider(
          LOCAL_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeCommand({
          chunkId: "test-local",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(mockDeps.runBridgeWithStdin).toHaveBeenCalled();
        expect(mockDeps.createWebSocket).not.toHaveBeenCalled();
        expect(result.transcript).toBe("local command");
      });
    });

    describe("sidecar failure → strict failure", () => {
      it("should throw instead of falling back to local when sidecar returns ok:false", async () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs)
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const transcribePromise = provider.transcribeCommand({
          chunkId: "test-fallback",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        mockWs.__simulateOpen();
        mockWs.__simulateMessage(JSON.stringify({
          ok: false,
          error: "sidecar_unavailable"
        }));

        await expect(transcribePromise).rejects.toThrow("parakeet_sidecar_error:sidecar_unavailable");
        expect(mockDeps.createWebSocket).toHaveBeenCalled();
        expect(mockDeps.runBridgeWithStdin).not.toHaveBeenCalled();
      });

      it("should throw instead of falling back when sidecar throws network error", async () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs)
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const transcribePromise = provider.transcribeCommand({
          chunkId: "test-fallback-error",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        mockWs.__simulateOpen();
        mockWs.__simulateError(new Error("connection_refused"));

        await expect(transcribePromise).rejects.toThrow("parakeet_sidecar_error:connection_refused");
        expect(mockDeps.runBridgeWithStdin).not.toHaveBeenCalled();
      });
    });

    describe("sidecar contract parsing", () => {
      it("should parse valid sidecar JSON response with partials", async () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs)
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const onPartial = jest.fn();

        const stream = provider.createStream("test-parse", onPartial);
        const finalizePromise = stream.finalize();

        mockWs.__simulateOpen();

        // 1. Partial
        mockWs.__simulateMessage(JSON.stringify({
          ok: true,
          is_final: false,
          text: "parsed",
        }));

        expect(onPartial).toHaveBeenCalledWith("parsed");

        // 2. Final
        mockWs.__simulateMessage(JSON.stringify({
          ok: true,
          is_final: true,
          text: "parsed command",
        }));

        const result = await finalizePromise;

        expect(result.transcript).toBe("parsed command");
        expect(result.model).toBe("/fake/path/model");
        expect(result.device).toBe("cuda");
      });

      it("should throw for empty sidecar transcript", async () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs)
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const transcribePromise = provider.transcribeCommand({
          chunkId: "test-empty",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        mockWs.__simulateOpen();
        mockWs.__simulateMessage(JSON.stringify({
          ok: true,
          is_final: true,
          text: "",
        }));

        await expect(transcribePromise).rejects.toThrow("parakeet_empty_transcript");
      });
    });

    describe("sidecar cancel/finalize semantics", () => {
      it("should allow cancel() without throwing", () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs),
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const stream = provider.createStream("test-cancel-safe");
        expect(() => stream.cancel()).not.toThrow();
        expect(mockWs.terminate).toHaveBeenCalledTimes(1);
      });

      it("should reject finalize() after cancel()", async () => {
        const mockWs = createMockWebSocket();
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridgeWithStdin: jest.fn(),
          postSidecarJson: jest.fn(),
          createWebSocket: jest.fn().mockReturnValue(mockWs),
        };

        const provider = new ParakeetCommandFastProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const stream = provider.createStream("test-cancel-then-finalize");
        stream.cancel();

        await expect(stream.finalize()).rejects.toThrow(
          "parakeet_sidecar_error:websocket_canceled"
        );
      });
    });
  });
});
