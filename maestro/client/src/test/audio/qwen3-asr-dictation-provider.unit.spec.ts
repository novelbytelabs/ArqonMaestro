import Qwen3ASRDictationProvider, {
  Qwen3FailureReason,
} from "../../main/stt/qwen3-asr-dictation-provider";

// Mock bridge response signatures (Stage 1 contract)
const BRIDGE_SUCCESS = (model: string, device: string) =>
  JSON.stringify({
    ok: true,
    text: "test dictation",
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
const TEST_CONFIG_LOCAL = {
  enabled: true,
  pythonPath: "/usr/bin/python3",
  bridgeScriptPath: "/fake/path/qwen3_asr_bridge.py",
  modelPath: "/fake/path/model",
  device: "cuda" as const,
  mode: "local" as const,
  timeoutMs: 30000,
  language: "en",
};

const TEST_CONFIG_VLLM = {
  enabled: true,
  pythonPath: "/usr/bin/python3",
  bridgeScriptPath: "/fake/path/qwen3_asr_bridge.py",
  modelPath: "/fake/path/model",
  device: "cuda" as const,
  mode: "vllm_service" as const,
  vllmEndpoint: "http://localhost:8000",
  timeoutMs: 30000,
  language: "en",
};

const MISSING_CONFIG = {
  enabled: true,
  pythonPath: "/nonexistent/python",
  bridgeScriptPath: "/nonexistent/bridge.py",
  modelPath: "/nonexistent/model",
  device: "cuda" as const,
  mode: "local" as const,
  timeoutMs: 30000,
};

describe("Qwen3ASRDictationProvider", () => {
  describe("Failure Matrix", () => {
    describe("invalid python path → provider_unavailable", () => {
      it("should throw provider_unavailable when python path is invalid", async () => {
        const provider = new Qwen3ASRDictationProvider(MISSING_CONFIG);

        expect(provider.isReady()).toBe(false);
        expect(provider.getLoadError()).toContain("python_or_bridge_or_model_missing");

        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.alloc(100),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_unavailable");
      });
    });

    describe("exit code 1 / malformed JSON → json_parse_failed", () => {
      it("should map exit code 1 to json_parse_failed when stderr contains 'json'", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 1,
            stdout: "",
            stderr: "json decode error",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          TEST_CONFIG_LOCAL,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_json_parse_failed");
      });

      it("should map exit code 1 to inference_failed when stderr does not contain json", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 1,
            stdout: "",
            stderr: "model loading error",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          TEST_CONFIG_LOCAL,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_inference_failed");
      });

      it("should map malformed JSON response to json_parse_failed", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: "{ invalid json }",
            stderr: "",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          TEST_CONFIG_LOCAL,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_json_parse_failed");
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

        const provider = new Qwen3ASRDictationProvider(
          TEST_CONFIG_LOCAL,
          undefined,
          mockDeps
        );

        // Empty buffer
        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.alloc(0),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_empty_audio");

        expect(mockDeps.runBridge).not.toHaveBeenCalled();

        // Undefined
        await expect(
          provider.transcribeDictation({
            chunkId: "test-124",
            pcm16leAudio: undefined as any,
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_empty_audio");

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
            stderr: "qwen3_timeout",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          TEST_CONFIG_LOCAL,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_timeout");
      });
    });

    describe("vLLM 503 → endpoint_503 (replay to fallback)", () => {
      it("should trap endpoint_503 for replay to fallback endpoint", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: BRIDGE_FAILURE("endpoint_503", true),
            stderr: "",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          TEST_CONFIG_VLLM,
          undefined,
          mockDeps
        );

        // Should throw endpoint_503 - provider must instruct upstream to replay
        await expect(
          provider.transcribeDictation({
            chunkId: "test-123",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_endpoint_503:");
      });
    });

    describe("Bridge error code mapping", () => {
      const errorCodeTests: Array<{
        bridgeError: string;
        expectedError: Qwen3FailureReason;
      }> = [
        { bridgeError: "empty_audio", expectedError: "empty_audio" },
        { bridgeError: "audio_format_invalid", expectedError: "audio_format_invalid" },
        { bridgeError: "model_load_failed", expectedError: "model_load_failed" },
        { bridgeError: "inference_failed", expectedError: "inference_failed" },
        { bridgeError: "timeout", expectedError: "timeout" },
        { bridgeError: "endpoint_503", expectedError: "endpoint_503" },
        { bridgeError: "connection_refused", expectedError: "connection_refused" },
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

          const provider = new Qwen3ASRDictationProvider(
            TEST_CONFIG_LOCAL,
            undefined,
            mockDeps
          );

          await expect(
            provider.transcribeDictation({
              chunkId: "test-123",
              pcm16leAudio: Buffer.from(new Array(100).fill(0)),
              sampleRateHz: 16000,
            })
          ).rejects.toThrow(`qwen3_${expectedError}:`);
        });
      });
    });
  });

  describe("vLLM service mode", () => {
    it("should not require model path for vllm_service mode", () => {
      const vllmOnlyConfig = {
        enabled: true,
        pythonPath: "/usr/bin/python3",
        bridgeScriptPath: "/fake/path/qwen3_asr_bridge.py",
        modelPath: "/nonexistent/model", // Should not matter
        device: "cuda" as const,
        mode: "vllm_service" as const,
        vllmEndpoint: "http://localhost:8000",
        timeoutMs: 30000,
      };

      const mockDeps = {
        fileExists: (path: string) => {
          // Only python and bridge need to exist
          if (path === "/usr/bin/python3" || path === "/fake/path/qwen3_asr_bridge.py") {
            return true;
          }
          return false;
        },
        mkdtemp: jest.fn(),
        writeFile: jest.fn(),
        rm: jest.fn(),
        runBridge: jest.fn(),
      };

      const provider = new Qwen3ASRDictationProvider(
        vllmOnlyConfig,
        undefined,
        mockDeps
      );

      // Should be ready even without model path in vllm_service mode
      expect(provider.isReady()).toBe(true);
    });

    it("should pass endpoint to bridge for vllm_service mode", async () => {
      const mockDeps = {
        fileExists: () => true,
        mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
        writeFile: jest.fn().mockResolvedValue(undefined),
        rm: jest.fn().mockResolvedValue(undefined),
        runBridge: jest.fn().mockResolvedValue({
          exitCode: 0,
          stdout: BRIDGE_SUCCESS("vllm_service", "remote"),
          stderr: "",
        }),
      };

      const provider = new Qwen3ASRDictationProvider(
        TEST_CONFIG_VLLM,
        undefined,
        mockDeps
      );

      await provider.transcribeDictation({
        chunkId: "test-123",
        pcm16leAudio: Buffer.from(new Array(100).fill(0)),
        sampleRateHz: 16000,
      });

      // Verify endpoint was passed
      expect(mockDeps.runBridge).toHaveBeenCalledWith(
        "/usr/bin/python3",
        "/fake/path/qwen3_asr_bridge.py",
        expect.arrayContaining(["--endpoint", "http://localhost:8000"]),
        30000
      );
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
          stdout: BRIDGE_SUCCESS("qwen3-asr", "cuda"),
          stderr: "",
        }),
      };

      const provider = new Qwen3ASRDictationProvider(
        TEST_CONFIG_LOCAL,
        undefined,
        mockDeps
      );

      const result = await provider.transcribeDictation({
        chunkId: "test-123",
        pcm16leAudio: Buffer.from(new Array(100).fill(0)),
        sampleRateHz: 16000,
      });

      expect(result.provider).toBe("qwen3-asr");
      expect(result.text).toBe("test dictation");
      expect(result.model).toBe("qwen3-asr");
      expect(result.device).toBe("cuda");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Provider configuration", () => {
    it("should use environment variables for configuration", () => {
      const originalEnv = { ...process.env };

      process.env.MAESTRO_DICTATION_QWEN3_ENABLED = "1";
      process.env.MAESTRO_QWEN3_PYTHON_PATH = "/test/python";
      process.env.MAESTRO_QWEN3_BRIDGE_PATH = "/test/bridge.py";
      process.env.MAESTRO_QWEN3_MODEL_PATH = "/test/model";
      process.env.MAESTRO_QWEN3_DEVICE = "cpu";
      process.env.MAESTRO_QWEN3_MODE = "local";
      process.env.MAESTRO_QWEN3_VLLM_ENDPOINT = "http://test:8000";
      process.env.MAESTRO_QWEN3_LANGUAGE = "zh";

      const provider = new Qwen3ASRDictationProvider();

      const config = provider.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.pythonPath).toBe("/test/python");
      expect(config.bridgeScriptPath).toBe("/test/bridge.py");
      expect(config.modelPath).toBe("/test/model");
      expect(config.device).toBe("cpu");
      expect(config.mode).toBe("local");
      expect(config.vllmEndpoint).toBe("http://test:8000");
      expect(config.language).toBe("zh");

      process.env = originalEnv;
    });

    it("should respect disabled configuration", () => {
      const provider = new Qwen3ASRDictationProvider({ enabled: false });

      expect(provider.isReady()).toBe(false);
      expect(provider.getLoadError()).toBe("provider_disabled");
    });
  });

  // ====== Stage 2A: Sidecar Contract Tests ======
  describe("Sidecar mode routing", () => {
    const SIDECAR_CONFIG = {
      enabled: true,
      pythonPath: "/usr/bin/python3",
      bridgeScriptPath: "/fake/path/qwen3_asr_bridge.py",
      modelPath: "/fake/path/model",
      device: "cuda" as const,
      mode: "vllm_service" as const,
      vllmEndpoint: "http://localhost:8000",
      sidecarMode: "sidecar" as const,
      sidecarUrl: "http://127.0.0.1:7783/transcribe",
      timeoutMs: 30000,
      language: "en",
    };

    describe("sidecar mode routing decision", () => {
      it("should route to sidecar when sidecarMode is 'sidecar' and url is configured", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn(),
          postSidecarJson: jest.fn().mockResolvedValue({
            ok: true,
            text: "sidecar dictation",
            model: "qwen3-sidecar",
            device: "cuda",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeDictation({
          chunkId: "test-sidecar",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(mockDeps.postSidecarJson).toHaveBeenCalled();
        expect(mockDeps.runBridge).not.toHaveBeenCalled();
        expect(result.text).toBe("sidecar dictation");
        expect(result.provider).toBe("qwen3-asr");
      });

      it("should route to local when sidecarMode is 'local' (default)", async () => {
        const LOCAL_CONFIG = {
          enabled: true,
          pythonPath: "/usr/bin/python3",
          bridgeScriptPath: "/fake/path/qwen3_asr_bridge.py",
          modelPath: "/fake/path/model",
          device: "cuda" as const,
          mode: "vllm_service" as const,
          vllmEndpoint: "http://localhost:8000",
          sidecarMode: "local" as const,
          timeoutMs: 30000,
          language: "en",
        };

        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              text: "local dictation",
              model: "qwen3-local",
              device: "cuda",
            }),
            stderr: "",
          }),
          postSidecarJson: jest.fn(),
        };

        const provider = new Qwen3ASRDictationProvider(
          LOCAL_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeDictation({
          chunkId: "test-local",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(mockDeps.runBridge).toHaveBeenCalled();
        expect(mockDeps.postSidecarJson).not.toHaveBeenCalled();
        expect(result.text).toBe("local dictation");
      });
    });

    describe("sidecar failure → local fallback (replay)", () => {
      it("should fallback to local when sidecar returns ok:false", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              text: "fallback dictation",
              model: "qwen3-local",
              device: "cuda",
            }),
            stderr: "",
          }),
          postSidecarJson: jest.fn().mockResolvedValue({
            ok: false,
            error: "sidecar_unavailable",
            retryable: true,
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeDictation({
          chunkId: "test-fallback",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(mockDeps.postSidecarJson).toHaveBeenCalled();
        expect(mockDeps.runBridge).toHaveBeenCalled();
        expect(result.text).toBe("fallback dictation");
      });

      it("should fallback to local when sidecar throws network error", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              text: "fallback dictation",
              model: "qwen3-local",
              device: "cuda",
            }),
            stderr: "",
          }),
          postSidecarJson: jest.fn().mockRejectedValue(new Error("connection_refused")),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeDictation({
          chunkId: "test-fallback-error",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(mockDeps.postSidecarJson).toHaveBeenCalled();
        expect(mockDeps.runBridge).toHaveBeenCalled();
        expect(result.text).toBe("fallback dictation");
      });

      it("should fallback to local when sidecar returns HTTP 503", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({
              ok: true,
              text: "fallback dictation",
              model: "qwen3-local",
              device: "cuda",
            }),
            stderr: "",
          }),
          postSidecarJson: jest.fn().mockRejectedValue(new Error("sidecar_http_503: retryable")),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeDictation({
          chunkId: "test-fallback-503",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(mockDeps.postSidecarJson).toHaveBeenCalled();
        expect(mockDeps.runBridge).toHaveBeenCalled();
        expect(result.text).toBe("fallback dictation");
      });
    });


    describe("sidecar contract parsing", () => {
      it("should parse valid sidecar JSON response", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn(),
          postSidecarJson: jest.fn().mockResolvedValue({
            ok: true,
            text: "parsed dictation",
            model: "qwen3-asr-sidecar",
            device: "cuda",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        const result = await provider.transcribeDictation({
          chunkId: "test-parse",
          pcm16leAudio: Buffer.from(new Array(100).fill(0)),
          sampleRateHz: 16000,
        });

        expect(result.text).toBe("parsed dictation");
        expect(result.model).toBe("qwen3-asr-sidecar");
        expect(result.device).toBe("cuda");
      });

      it("should throw for empty sidecar transcript", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({ ok: true, text: "unused", model: "q", device: "cuda" }),
            stderr: "",
          }),
          postSidecarJson: jest.fn().mockResolvedValue({
            ok: true,
            text: "",
            model: "qwen3-asr",
            device: "cuda",
          }),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        await expect(
          provider.transcribeDictation({
            chunkId: "test-empty",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_empty_transcript");
      });
    });

    describe("vLLM 503 dictation handling", () => {
      it("should classify endpoint_503 as retryable for fallback", async () => {
        const mockDeps = {
          fileExists: () => true,
          mkdtemp: jest.fn().mockResolvedValue("/tmp/test"),
          writeFile: jest.fn().mockResolvedValue(undefined),
          rm: jest.fn().mockResolvedValue(undefined),
          runBridge: jest.fn().mockResolvedValue({
            exitCode: 0,
            stdout: JSON.stringify({
              ok: false,
              error: "endpoint_503",
              retryable: true,
            }),
            stderr: "",
          }),
          postSidecarJson: jest.fn(),
        };

        const provider = new Qwen3ASRDictationProvider(
          SIDECAR_CONFIG,
          undefined,
          mockDeps
        );

        // In local mode, endpoint_503 should trigger fallback
        await expect(
          provider.transcribeDictation({
            chunkId: "test-503",
            pcm16leAudio: Buffer.from(new Array(100).fill(0)),
            sampleRateHz: 16000,
          })
        ).rejects.toThrow("qwen3_endpoint_503:");
      });
    });
  });
});
