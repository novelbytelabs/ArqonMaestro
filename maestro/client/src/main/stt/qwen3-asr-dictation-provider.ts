import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";
import Log from "../log";

export interface Qwen3ASRDictationProviderConfig {
  enabled?: boolean;
  pythonPath?: string;
  bridgeScriptPath?: string;
  modelPath?: string;
  device?: "cpu" | "cuda";
  mode?: "local" | "vllm_service";
  vllmEndpoint?: string;
  timeoutMs?: number;
  language?: string;
}

export interface Qwen3TranscriptionInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

export interface Qwen3TranscriptionResult {
  text: string;
  model: string;
  device: string;
  latencyMs: number;
  provider: "qwen3-asr";
}

interface BridgeSuccess {
  ok: true;
  text: string;
  model: string;
  device: string;
}

interface BridgeFailure {
  ok: false;
  error: string;
  retryable: boolean;
}

type BridgeResponse = BridgeSuccess | BridgeFailure;

interface Qwen3ASRDictationProviderDeps {
  fileExists: (targetPath: string) => boolean;
  mkdtemp: (prefix: string) => Promise<string>;
  writeFile: (targetPath: string, data: Buffer) => Promise<void>;
  rm: (targetPath: string) => Promise<void>;
  runBridge: (
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    timeoutMs: number
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
}

function resolveHomePath(value: string): string {
  if (!value.startsWith("~/")) {
    return value;
  }
  return path.join(homedir(), value.slice(2));
}

function defaultPythonPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_QWEN3_PYTHON_PATH || "conda run -n helios-gpu-118 python"
  );
}

function defaultBridgeScriptPath(): string {
  if (process.env.MAESTRO_QWEN3_BRIDGE_PATH) {
    return resolveHomePath(process.env.MAESTRO_QWEN3_BRIDGE_PATH);
  }
  return path.resolve(
    process.cwd(),
    "src/main/stt/qwen3_asr_bridge.py"
  );
}

function defaultModelPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_QWEN3_MODEL_PATH || "~/Models/qwen3-asr"
  );
}

export type Qwen3FailureReason =
  | "provider_unavailable"
  | "python_path_invalid"
  | "bridge_script_missing"
  | "model_load_failed"
  | "empty_audio"
  | "audio_format_invalid"
  | "json_parse_failed"
  | "inference_failed"
  | "timeout"
  | "endpoint_503"
  | "connection_refused"
  | "unknown";

export default class Qwen3ASRDictationProvider {
  private config: Required<Qwen3ASRDictationProviderConfig>;
  private deps: Qwen3ASRDictationProviderDeps;
  private ready = false;
  private loadError?: string;

  constructor(
    config: Qwen3ASRDictationProviderConfig = {},
    private log?: Log,
    deps?: Partial<Qwen3ASRDictationProviderDeps>
  ) {
    this.config = {
      enabled:
        config.enabled !== undefined
          ? config.enabled
          : process.env.MAESTRO_DICTATION_QWEN3_ENABLED !== "0",
      pythonPath: resolveHomePath(config.pythonPath || defaultPythonPath()),
      bridgeScriptPath: resolveHomePath(config.bridgeScriptPath || defaultBridgeScriptPath()),
      modelPath: resolveHomePath(config.modelPath || defaultModelPath()),
      device: config.device || (process.env.MAESTRO_QWEN3_DEVICE as "cpu" | "cuda") || "cuda",
      mode: config.mode || (process.env.MAESTRO_QWEN3_MODE as "local" | "vllm_service") || "local",
      vllmEndpoint: config.vllmEndpoint || process.env.MAESTRO_QWEN3_VLLM_ENDPOINT || "",
      timeoutMs: config.timeoutMs || 30000,
      language: config.language || process.env.MAESTRO_QWEN3_LANGUAGE || "en",
    };

    this.deps = {
      fileExists: (targetPath) => require("fs").existsSync(targetPath),
      mkdtemp: (prefix) => fs.mkdtemp(prefix),
      writeFile: (targetPath, data) => fs.writeFile(targetPath, data),
      rm: (targetPath) => fs.rm(targetPath, { recursive: true, force: true }),
      runBridge: (pythonPath, bridgeScriptPath, args, timeoutMs) =>
        this.defaultRunBridge(pythonPath, bridgeScriptPath, args, timeoutMs),
      ...deps,
    };

    this.initializeReadiness();
  }

  private initializeReadiness(): void {
    if (!this.config.enabled) {
      this.ready = false;
      this.loadError = "provider_disabled";
      return;
    }

    // For vllm_service mode, we don't need local model
    if (this.config.mode === "vllm_service") {
      try {
        const pythonExists = this.deps.fileExists(this.config.pythonPath);
        const bridgeExists = this.deps.fileExists(this.config.bridgeScriptPath);
        this.ready = pythonExists && bridgeExists;
        if (!this.ready) {
          const missing: string[] = [];
          if (!pythonExists) missing.push("python");
          if (!bridgeExists) missing.push("bridge");
          this.loadError = `python_or_bridge_missing:${missing.join(",")}`;
        }
      } catch (error) {
        this.ready = false;
        this.loadError = error instanceof Error ? error.message : String(error);
      }
      return;
    }

    // For local mode, we need python, bridge, and model
    try {
      const pythonExists = this.deps.fileExists(this.config.pythonPath);
      const bridgeExists = this.deps.fileExists(this.config.bridgeScriptPath);
      const modelExists = this.deps.fileExists(this.config.modelPath);

      this.ready = pythonExists && bridgeExists && modelExists;
      if (!this.ready) {
        const missing: string[] = [];
        if (!pythonExists) missing.push("python");
        if (!bridgeExists) missing.push("bridge");
        if (!modelExists) missing.push("model");
        this.loadError = `python_or_bridge_or_model_missing:${missing.join(",")}`;
      }
    } catch (error) {
      this.ready = false;
      this.loadError = error instanceof Error ? error.message : String(error);
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getLoadError(): string | undefined {
    return this.loadError;
  }

  getConfig(): Required<Qwen3ASRDictationProviderConfig> {
    return { ...this.config };
  }

  private buildWavFile(pcm16leAudio: Buffer, sampleRateHz: number): Buffer {
    const channels = 1;
    const bitsPerSample = 16;
    const blockAlign = (channels * bitsPerSample) / 8;
    const byteRate = sampleRateHz * blockAlign;
    const dataSize = pcm16leAudio.length;
    const riffSize = 36 + dataSize;

    const header = Buffer.alloc(44);
    header.write("RIFF", 0, "ascii");
    header.writeUInt32LE(riffSize, 4);
    header.write("WAVE", 8, "ascii");
    header.write("fmt ", 12, "ascii");
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRateHz, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write("data", 36, "ascii");
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcm16leAudio]);
  }

  private defaultRunBridge(
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(pythonPath, [bridgeScriptPath, ...args], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGKILL");
      }, timeoutMs);

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nqwen3_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  private parseBridgeResponse(stdout: string): BridgeResponse {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch (_error) {
      throw new Error("qwen3_json_parse_failed");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("qwen3_invalid_response");
    }

    const response = parsed as { ok?: unknown; text?: unknown; error?: unknown; retryable?: unknown; model?: unknown; device?: unknown };

    if (typeof response.ok !== "boolean") {
      throw new Error("qwen3_invalid_response_shape");
    }

    if (!response.ok) {
      const error = typeof response.error === "string" ? response.error : "unknown_bridge_error";
      const retryable = typeof response.retryable === "boolean" ? response.retryable : false;
      return { ok: false, error, retryable };
    }

    const text = typeof response.text === "string" ? response.text.trim() : "";
    if (!text) {
      throw new Error("qwen3_empty_transcript");
    }

    return {
      ok: true,
      text,
      model: typeof response.model === "string" ? response.model : this.config.modelPath,
      device: typeof response.device === "string" ? response.device : this.config.device,
    };
  }

  async transcribeDictation(input: Qwen3TranscriptionInput): Promise<Qwen3TranscriptionResult> {
    if (!this.ready) {
      throw new Error(`qwen3_unavailable:${this.loadError || "not_ready"}`);
    }

    // 0-byte audio short-circuit - no bridge spawn
    if (!input.pcm16leAudio || input.pcm16leAudio.length === 0) {
      throw new Error("qwen3_empty_audio");
    }

    const start = Date.now();
    const tempDir = await this.deps.mkdtemp(path.join(tmpdir(), "maestro-qwen3-"));
    const inputWavPath = path.join(tempDir, `${input.chunkId}.wav`);

    try {
      const wavBuffer = this.buildWavFile(input.pcm16leAudio, input.sampleRateHz);
      await this.deps.writeFile(inputWavPath, wavBuffer);

      const args = [
        "--audio",
        inputWavPath,
        "--model-path",
        this.config.modelPath,
        "--mode",
        this.config.mode,
        "--device",
        this.config.device,
      ];

      // Add endpoint for vllm_service mode
      if (this.config.mode === "vllm_service" && this.config.vllmEndpoint) {
        args.push("--endpoint", this.config.vllmEndpoint);
      }

      const result = await this.deps.runBridge(
        this.config.pythonPath,
        this.config.bridgeScriptPath,
        args,
        this.config.timeoutMs
      );

      // Exit code 1 / malformed JSON -> structured failure
      if (result.exitCode !== 0) {
        const stderrLower = result.stderr.toLowerCase();
        if (stderrLower.includes("json")) {
          throw new Error("qwen3_json_parse_failed");
        }
        throw new Error(`qwen3_inference_failed:${result.stderr || result.stdout || "unknown"}`);
      }

      const parsed = this.parseBridgeResponse(result.stdout.trim());
      if (!parsed.ok) {
        // Map bridge errors to provider errors
        // vLLM 503 must be trapped specifically for replay
        const errorMap: Record<string, Qwen3FailureReason> = {
          empty_audio: "empty_audio",
          audio_format_invalid: "audio_format_invalid",
          model_load_failed: "model_load_failed",
          inference_failed: "inference_failed",
          timeout: "timeout",
          endpoint_503: "endpoint_503",
          connection_refused: "connection_refused",
          json_output_invalid: "json_parse_failed",
        };
        const reason = errorMap[parsed.error] || "inference_failed";
        throw new Error(`qwen3_${reason}:${parsed.error}`);
      }

      return {
        text: parsed.text,
        model: parsed.model,
        device: parsed.device,
        latencyMs: Date.now() - start,
        provider: "qwen3-asr",
      };
    } finally {
      await this.deps.rm(tempDir);
    }
  }

  logUnavailableOnce(): void {
    if (this.ready) {
      return;
    }
    this.log?.logVerbose(
      `[Qwen3ASRDictationProvider] unavailable: ${this.loadError || "not_ready"}`
    );
  }
}
