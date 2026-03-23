import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";
import http from "http";
import https from "https";
import Log from "../log";

export interface ParakeetCommandFastProviderConfig {
  enabled?: boolean;
  pythonPath?: string;
  bridgeScriptPath?: string;
  modelPath?: string;
  device?: "cpu" | "cuda";
  timeoutMs?: number;
  initialPrompt?: string;
  // Sidecar mode config
  mode?: "local" | "sidecar";
  sidecarUrl?: string;
}

export interface ParakeetTranscriptionInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

// Sidecar contract: HTTP request JSON
interface ParakeetSidecarRequest {
  audio_b64: string;
  sample_rate_hz: number;
  chunk_id: string;
  model_path?: string;
  device?: string;
  initial_prompt?: string;
}

// Sidecar contract: HTTP response JSON
interface ParakeetSidecarResponse {
  ok: boolean;
  text?: string;
  model?: string;
  device?: string;
  error?: string;
  retryable?: boolean;
}

export interface ParakeetTranscriptionResult {
  transcript: string;
  model: string;
  device: string;
  latencyMs: number;
  provider: "parakeet";
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

interface ParakeetCommandFastProviderDeps {
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
  // NEW: Run bridge with stdin input (no temp file)
  runBridgeWithStdin: (
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    stdinData: Buffer,
    timeoutMs: number
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  // Sidecar HTTP client
  postSidecarJson: (
    urlString: string,
    body: ParakeetSidecarRequest,
    timeoutMs: number
  ) => Promise<ParakeetSidecarResponse>;
}

function resolveHomePath(value: string): string {
  if (!value.startsWith("~/")) {
    return value;
  }
  return path.join(homedir(), value.slice(2));
}

function defaultPythonPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_PARAKEET_PYTHON_PATH || "conda run -n helios-gpu-118 python"
  );
}

function defaultBridgeScriptPath(): string {
  if (process.env.MAESTRO_PARAKEET_BRIDGE_PATH) {
    return resolveHomePath(process.env.MAESTRO_PARAKEET_BRIDGE_PATH);
  }
  return path.resolve(
    process.cwd(),
    "src/main/stt/parakeet_bridge.py"
  );
}

function defaultModelPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_PARAKEET_MODEL_PATH || "~/Models/parakeet-ctc"
  );
}

const DEFAULT_PROMPT =
  "maestro command lane reflex mode focus navigation stop cancel undo redo " +
  "focus terminal focus editor focus browser next tab previous tab next error previous error";

export type ParakeetFailureReason =
  | "provider_unavailable"
  | "python_path_invalid"
  | "bridge_script_missing"
  | "model_load_failed"
  | "empty_audio"
  | "audio_format_invalid"
  | "json_parse_failed"
  | "inference_failed"
  | "timeout"
  | "unknown";

export default class ParakeetCommandFastProvider {
  private config: Required<ParakeetCommandFastProviderConfig>;
  private deps: ParakeetCommandFastProviderDeps;
  private ready = false;
  private loadError?: string;

  constructor(
    config: ParakeetCommandFastProviderConfig = {},
    private log?: Log,
    deps?: Partial<ParakeetCommandFastProviderDeps>
  ) {
    this.config = {
      enabled:
        config.enabled !== undefined
          ? config.enabled
          : process.env.MAESTRO_COMMAND_PARAKEET_ENABLED !== "0",
      pythonPath: resolveHomePath(config.pythonPath || defaultPythonPath()),
      bridgeScriptPath: resolveHomePath(config.bridgeScriptPath || defaultBridgeScriptPath()),
      modelPath: resolveHomePath(config.modelPath || defaultModelPath()),
      device: config.device || (process.env.MAESTRO_PARAKEET_DEVICE as "cpu" | "cuda") || "cuda",
      timeoutMs: config.timeoutMs || 5000,
      initialPrompt: config.initialPrompt || DEFAULT_PROMPT,
      // Sidecar mode config
      mode: config.mode || (process.env.MAESTRO_PARAKEET_MODE as "local" | "sidecar") || "local",
      sidecarUrl: config.sidecarUrl || process.env.MAESTRO_PARAKEET_SIDECAR_URL || "",
    };

    this.deps = {
      fileExists: (targetPath) => require("fs").existsSync(targetPath),
      mkdtemp: (prefix) => fs.mkdtemp(prefix),
      writeFile: (targetPath, data) => fs.writeFile(targetPath, data),
      rm: (targetPath) => fs.rm(targetPath, { recursive: true, force: true }),
      runBridge: (pythonPath, bridgeScriptPath, args, timeoutMs) =>
        this.defaultRunBridge(pythonPath, bridgeScriptPath, args, timeoutMs),
      runBridgeWithStdin: (pythonPath, bridgeScriptPath, args, stdinData, timeoutMs) =>
        this.defaultRunBridgeWithStdin(pythonPath, bridgeScriptPath, args, stdinData, timeoutMs),
      postSidecarJson: (urlString, body, timeoutMs) =>
        this.defaultPostSidecarJson(urlString, body, timeoutMs),
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

  getConfig(): Required<ParakeetCommandFastProviderConfig> {
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nparakeet_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  /**
   * Run bridge with stdin input (no temp file I/O).
   */
  private defaultRunBridgeWithStdin(
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    stdinData: Buffer,
    timeoutMs: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(pythonPath, [bridgeScriptPath, ...args], {
        stdio: ["pipe", "pipe", "pipe"],
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nparakeet_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });

      // Write stdin data and close stdin
      proc.stdin?.write(stdinData, () => {
        proc.stdin?.end();
      });
    });
  }

  /**
   * Default sidecar HTTP client (POST JSON).
   * Used when mode is "sidecar" and routes to HTTP proxy port.
   */
  private defaultPostSidecarJson(
    urlString: string,
    body: ParakeetSidecarRequest,
    timeoutMs: number
  ): Promise<ParakeetSidecarResponse> {
    return new Promise<ParakeetSidecarResponse>((resolve, reject) => {
      const parsedUrl = new URL(urlString);
      const client = parsedUrl.protocol === "https:" ? https : http;
      const payload = JSON.stringify(body);
      const headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      };

      const req = client.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "POST",
          headers,
        },
        (res) => {
          let responseBody = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            responseBody += chunk;
          });
          res.on("end", () => {
            const statusCode = res.statusCode || 0;
            // HTTP errors -> sidecar_unavailable (retryable for 5xx)
            if (statusCode >= 500) {
              reject(new Error(`sidecar_http_${statusCode}: retryable`));
              return;
            }
            if (statusCode < 200 || statusCode >= 300) {
              reject(new Error(`sidecar_http_${statusCode}: ${responseBody.slice(0, 200)}`));
              return;
            }

            try {
              resolve(responseBody ? JSON.parse(responseBody) : { ok: false, error: "empty_response" });
            } catch (e: any) {
              reject(new Error(`sidecar_invalid_json: ${e.message}`));
            }
          });
        }
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error("sidecar_timeout"));
      });
      req.on("error", (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }

  private parseBridgeResponse(stdout: string): BridgeResponse {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch (_error) {
      throw new Error("parakeet_json_parse_failed");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("parakeet_invalid_response");
    }

    const response = parsed as { ok?: unknown; text?: unknown; error?: unknown; retryable?: unknown; model?: unknown; device?: unknown };

    if (typeof response.ok !== "boolean") {
      throw new Error("parakeet_invalid_response_shape");
    }

    if (!response.ok) {
      const error = typeof response.error === "string" ? response.error : "unknown_bridge_error";
      const retryable = typeof response.retryable === "boolean" ? response.retryable : false;
      return { ok: false, error, retryable };
    }

    const text = typeof response.text === "string" ? response.text.trim() : "";
    if (!text) {
      throw new Error("parakeet_empty_transcript");
    }

    return {
      ok: true,
      text,
      model: typeof response.model === "string" ? response.model : this.config.modelPath,
      device: typeof response.device === "string" ? response.device : this.config.device,
    };
  }

  async transcribeCommand(input: ParakeetTranscriptionInput): Promise<ParakeetTranscriptionResult> {
    if (!this.ready) {
      throw new Error(`parakeet_unavailable:${this.loadError || "not_ready"}`);
    }

    // 0-byte audio short-circuit - no bridge spawn
    if (!input.pcm16leAudio || input.pcm16leAudio.length === 0) {
      throw new Error("parakeet_empty_audio");
    }

    // Route based on mode: "local" spawns Python bridge, "sidecar" calls HTTP proxy
    if (this.config.mode === "sidecar" && this.config.sidecarUrl) {
      return this.transcribeCommandSidecar(input);
    }

    return this.transcribeCommandLocal(input);
  }

  /**
   * Local mode: spawn Python bridge process with stdin input (no temp files).
   */
  private async transcribeCommandLocal(input: ParakeetTranscriptionInput): Promise<ParakeetTranscriptionResult> {
    const start = Date.now();
    
    try {
      // Build WAV buffer from PCM16 input
      const wavBuffer = this.buildWavFile(input.pcm16leAudio, input.sampleRateHz);

      // Use stdin mode - no temp file I/O
      const args = [
        "--stdin",
        "--model-path",
        this.config.modelPath,
        "--device",
        this.config.device,
      ];

      const result = await this.deps.runBridgeWithStdin(
        this.config.pythonPath,
        this.config.bridgeScriptPath,
        args,
        wavBuffer,
        this.config.timeoutMs
      );

      // Exit code 1 / malformed JSON -> structured failure
      if (result.exitCode !== 0) {
        const stderrLower = result.stderr.toLowerCase();
        if (stderrLower.includes("json")) {
          throw new Error("parakeet_json_parse_failed");
        }
        throw new Error(`parakeet_inference_failed:${result.stderr || result.stdout || "unknown"}`);
      }

      const parsed = this.parseBridgeResponse(result.stdout.trim());
      if (!parsed.ok) {
        // Map bridge errors to provider errors
        const errorMap: Record<string, ParakeetFailureReason> = {
          empty_audio: "empty_audio",
          audio_format_invalid: "audio_format_invalid",
          model_load_failed: "model_load_failed",
          inference_failed: "inference_failed",
          timeout: "timeout",
          json_output_invalid: "json_parse_failed",
        };
        const reason = errorMap[parsed.error] || "inference_failed";
        throw new Error(`parakeet_${reason}:${parsed.error}`);
      }

      return {
        transcript: parsed.text,
        model: parsed.model,
        device: parsed.device,
        latencyMs: Date.now() - start,
        provider: "parakeet",
      };
    } catch (error) {
      // Re-throw known errors
      throw error;
    }
  }

  /**
   * Sidecar mode: POST to HTTP proxy endpoint.
   * Falls back to local mode on sidecar failure (replay buffered audio).
   */
  private async transcribeCommandSidecar(input: ParakeetTranscriptionInput): Promise<ParakeetTranscriptionResult> {
    const start = Date.now();

    try {
      const requestBody: ParakeetSidecarRequest = {
        audio_b64: input.pcm16leAudio.toString("base64"),
        sample_rate_hz: input.sampleRateHz,
        chunk_id: input.chunkId,
        model_path: this.config.modelPath,
        device: this.config.device,
        initial_prompt: this.config.initialPrompt,
      };

      const response = await this.deps.postSidecarJson(
        this.config.sidecarUrl,
        requestBody,
        this.config.timeoutMs
      );

      if (!response.ok) {
        const error = response.error || "sidecar_error";
        // Sidecar failure -> try local fallback
        this.log?.logVerbose(`[ParakeetCommandFastProvider] sidecar failed: ${error}, falling back to local`);
        return this.transcribeCommandLocal(input);
      }

      const text = response.text?.trim() || "";
      if (!text) {
        throw new Error("parakeet_empty_transcript");
      }

      return {
        transcript: text,
        model: response.model || this.config.modelPath,
        device: response.device || this.config.device,
        latencyMs: Date.now() - start,
        provider: "parakeet",
      };
    } catch (error) {
      // Re-throw empty transcript - it's a provider error, not a fallback case
      if (error instanceof Error && error.message === "parakeet_empty_transcript") {
        throw error;
      }
      // Network/timeout errors -> fallback to local (replay buffered audio)
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log?.logVerbose(`[ParakeetCommandFastProvider] sidecar error: ${errorMessage}, falling back to local`);
      return this.transcribeCommandLocal(input);
    }
  }

  logUnavailableOnce(): void {
    if (this.ready) {
      return;
    }
    this.log?.logVerbose(
      `[ParakeetCommandFastProvider] unavailable: ${this.loadError || "not_ready"}`
    );
  }
}
