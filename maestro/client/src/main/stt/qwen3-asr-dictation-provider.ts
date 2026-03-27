import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";
import http from "http";
import https from "https";
import fsSync from "fs";
import Log from "../log";
import { buildWavFile } from "./audio-utils";

export interface Qwen3ASRDictationProviderConfig {
  enabled?: boolean;
  pythonPath?: string;
  bridgeScriptPath?: string;
  modelPath?: string;
  modelSize?: "0.6b" | "1.7b";
  useAdapter?: boolean;
  adapterPath?: string;
  projectRoot?: string;
  device?: "cpu" | "cuda";
  mode?: "local" | "vllm_service";
  vllmEndpoint?: string;
  fallbackEndpoint?: string;
  timeoutMs?: number;
  language?: string;
  onEndpoint503?: (bufferedAudio: Buffer, sampleRateHz: number, chunkId: string) => Promise<Qwen3TranscriptionResult | null>;
  // Sidecar mode config
  sidecarMode?: "local" | "sidecar";
  sidecarUrl?: string;
}

export interface Qwen3TranscriptionInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

// Sidecar contract: HTTP request JSON
interface Qwen3SidecarRequest {
  audio_b64: string;
  sample_rate_hz: number;
  chunk_id: string;
  model_path?: string;
  device?: string;
  language?: string;
  mode?: string;
  endpoint?: string;
}

// Sidecar contract: HTTP response JSON
interface Qwen3SidecarResponse {
  ok: boolean;
  text?: string;
  model?: string;
  device?: string;
  error?: string;
  retryable?: boolean;
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
  runBridgeWithStdin: (
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    stdinBuffer: Buffer,
    timeoutMs: number
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  // Sidecar HTTP client
  postSidecarJson: (
    urlString: string,
    body: Qwen3SidecarRequest,
    timeoutMs: number
  ) => Promise<Qwen3SidecarResponse>;
}

function resolveHomePath(value: string): string {
  if (!value.startsWith("~/")) {
    return value;
  }
  return path.join(homedir(), value.slice(2));
}

function defaultPythonPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_QWEN3_PYTHON_PATH || "~/miniconda3/envs/helios-gpu-118/bin/python"
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
  const envPath = process.env.MAESTRO_QWEN3_MODEL_PATH;
  if (envPath) {
    return resolveHomePath(envPath);
  }

  const candidates = [
    "~/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-0.6B",
    "~/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-1.7B",
    "~/models/arqon/asr/qwen3-asr-1.7b",
  ].map(resolveHomePath);

  const existing = candidates.find((candidate) => {
    try {
      return fsSync.existsSync(candidate);
    } catch (_error) {
      return false;
    }
  });

  return existing || candidates[0];
}

function defaultProjectRoot(): string {
  const envRoot = process.env.MAESTRO_QWEN3_PROJECT_ROOT;
  if (envRoot) {
    return resolveHomePath(envRoot);
  }

  const candidates = [
    "~/Projects/arqon/arqon-maestro-asr",
  ].map(resolveHomePath);
  const existing = candidates.find((candidate) => {
    try {
      return fsSync.existsSync(candidate);
    } catch (_error) {
      return false;
    }
  });

  return existing || candidates[0];
}

function inferDefaultModelSize(modelPath: string): "0.6b" | "1.7b" {
  const normalized = modelPath.toLowerCase();
  if (normalized.includes("0.6b") || normalized.includes("0_6b")) {
    return "0.6b";
  }
  return "1.7b";
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
      modelSize:
        config.modelSize ||
        (process.env.MAESTRO_QWEN3_MODEL_SIZE as "0.6b" | "1.7b") ||
        inferDefaultModelSize(resolveHomePath(config.modelPath || defaultModelPath())),
      useAdapter:
        config.useAdapter !== undefined
          ? config.useAdapter
          : process.env.MAESTRO_QWEN3_USE_ADAPTER !== "0",
      adapterPath: resolveHomePath(process.env.MAESTRO_QWEN3_ADAPTER_PATH || (config.adapterPath || "")),
      projectRoot: resolveHomePath(config.projectRoot || defaultProjectRoot()),
      device: config.device || (process.env.MAESTRO_QWEN3_DEVICE as "cpu" | "cuda") || "cuda",
      mode: config.mode || (process.env.MAESTRO_QWEN3_MODE as "local" | "vllm_service") || "local",
      vllmEndpoint: config.vllmEndpoint || process.env.MAESTRO_QWEN3_VLLM_ENDPOINT || "",
      fallbackEndpoint: config.fallbackEndpoint || process.env.MAESTRO_QWEN3_FALLBACK_ENDPOINT || "",
      timeoutMs: config.timeoutMs || 30000,
      language: config.language || process.env.MAESTRO_QWEN3_LANGUAGE || "en",
      onEndpoint503: config.onEndpoint503 ?? (async () => null),
      // Sidecar mode config
      sidecarMode: config.sidecarMode || (process.env.MAESTRO_QWEN3_SIDECAR_MODE as "local" | "sidecar") || "local",
      sidecarUrl: config.sidecarUrl || process.env.MAESTRO_QWEN3_SIDECAR_URL || "",
    };

    this.deps = {
      fileExists: (targetPath) => require("fs").existsSync(targetPath),
      mkdtemp: (prefix) => fs.mkdtemp(prefix),
      writeFile: (targetPath, data) => fs.writeFile(targetPath, data),
      rm: (targetPath) => fs.rm(targetPath, { recursive: true, force: true }),
      runBridge: (pythonPath, bridgeScriptPath, args, timeoutMs) =>
        this.defaultRunBridge(pythonPath, bridgeScriptPath, args, timeoutMs),
      runBridgeWithStdin: (pythonPath, bridgeScriptPath, args, stdinBuffer, timeoutMs) =>
        this.defaultRunBridgeWithStdin(pythonPath, bridgeScriptPath, args, stdinBuffer, timeoutMs),
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

    if (this.config.sidecarMode === "sidecar") {
      this.ready = !!this.config.sidecarUrl;
      if (!this.ready) {
        this.loadError = "sidecar_url_missing";
      }
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
      const modelExists = this.config.projectRoot
        ? this.deps.fileExists(this.config.projectRoot)
        : this.deps.fileExists(this.config.modelPath);

      this.ready = pythonExists && bridgeExists && modelExists;
      if (!this.ready) {
        const missing: string[] = [];
        if (!pythonExists) missing.push("python");
        if (!bridgeExists) missing.push("bridge");
        if (!modelExists) missing.push(this.config.projectRoot ? "project_root" : "model");
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

  private defaultRunBridgeWithStdin(
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    stdinBuffer: Buffer,
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nqwen3_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });

      proc.stdin.write(stdinBuffer);
      proc.stdin.end();
    });
  }

  /**
   * Default sidecar HTTP client (POST JSON).
   * Used when sidecarMode is "sidecar" and routes to HTTP proxy port.
   */
  private defaultPostSidecarJson(
    urlString: string,
    body: Qwen3SidecarRequest,
    timeoutMs: number
  ): Promise<Qwen3SidecarResponse> {
    return new Promise<Qwen3SidecarResponse>((resolve, reject) => {
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

    // Route based on sidecarMode: "local" spawns Python bridge, "sidecar" calls HTTP proxy
    if (this.config.sidecarMode === "sidecar" && this.config.sidecarUrl) {
      return this.transcribeDictationSidecar(input);
    }

    return this.transcribeDictationLocal(input);
  }

  /**
   * Local mode: spawn Python bridge process (existing path).
   */
  private async transcribeDictationLocal(input: Qwen3TranscriptionInput): Promise<Qwen3TranscriptionResult> {
    const start = Date.now();

    try {
      const wavBuffer = buildWavFile(input.pcm16leAudio, input.sampleRateHz);

      const args = [
        "--stdin",
        "--model-path",
        this.config.modelPath,
        "--model-size",
        this.config.modelSize,
        "--mode",
        this.config.mode,
        "--device",
        this.config.device,
      ];

      if (this.config.useAdapter) {
        args.push("--use-adapter");
      }
      if (this.config.adapterPath) {
        args.push("--adapter-path", this.config.adapterPath);
      }
      if (this.config.projectRoot) {
        args.push("--project-root", this.config.projectRoot);
      }

      // Add endpoint for vllm_service mode
      if (this.config.mode === "vllm_service" && this.config.vllmEndpoint) {
        args.push("--endpoint", this.config.vllmEndpoint);
      }

      const result = await this.deps.runBridgeWithStdin(
        this.config.pythonPath,
        this.config.bridgeScriptPath,
        args,
        wavBuffer,
        this.config.timeoutMs
      );

      // Bridge may return non-zero even with a structured JSON payload.
      // Parse stdout first so stable error codes (e.g. empty_audio on silence
      // preflight) are preserved instead of being flattened into stderr text.
      if (result.exitCode !== 0) {
        let parsedFromNonZero: BridgeResponse | null = null;
        try {
          parsedFromNonZero = this.parseBridgeResponse(result.stdout.trim());
        } catch (_parsedError) {
          parsedFromNonZero = null;
        }
        if (parsedFromNonZero && !parsedFromNonZero.ok) {
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
          const reason = errorMap[parsedFromNonZero.error] || "inference_failed";
          throw new Error(`qwen3_${reason}:${parsedFromNonZero.error}`);
        }

        const stderrLower = result.stderr.toLowerCase();
        if (stderrLower.includes("json")) {
          throw new Error("qwen3_json_parse_failed");
        }
        throw new Error(`qwen3_inference_failed:${result.stderr || result.stdout || "unknown"}`);
      }

      const parsed = this.parseBridgeResponse(result.stdout.trim());
      if (!parsed.ok) {
        // Map bridge errors to provider errors
        // vLLM 503 must be trapped specifically for replay to fallback endpoint
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
        
        // Handle vLLM 503: attempt replay to fallback endpoint
        if (parsed.error === "endpoint_503" && this.config.fallbackEndpoint) {
          this.log?.logVerbose(`[Qwen3ASRDictationProvider] vLLM 503, attempting fallback to ${this.config.fallbackEndpoint}`);
          try {
            const fallbackResult = await this.runFallbackTranscription(
              input.pcm16leAudio,
              input.sampleRateHz,
              input.chunkId
            );
            if (fallbackResult) {
              this.log?.logVerbose(`[Qwen3ASRDictationProvider] fallback succeeded`);
              return fallbackResult;
            }
          } catch (fallbackError) {
            this.log?.logVerbose(`[Qwen3ASRDictationProvider] fallback failed: ${fallbackError}`);
            // Fall through to throw original error
          }
        }
        
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
      // Temp file eliminated
    }
  }

  /**
   * Sidecar mode: POST to HTTP proxy endpoint.
   * Falls back to local mode on sidecar failure (replay buffered audio).
   */
  private async transcribeDictationSidecar(input: Qwen3TranscriptionInput): Promise<Qwen3TranscriptionResult> {
    const start = Date.now();

    try {
      const requestBody: Qwen3SidecarRequest = {
        audio_b64: input.pcm16leAudio.toString("base64"),
        sample_rate_hz: input.sampleRateHz,
        chunk_id: input.chunkId,
        model_path: this.config.modelPath,
        device: this.config.device,
        language: this.config.language,
        mode: this.config.mode,
        endpoint: this.config.vllmEndpoint || undefined,
      };

      const response = await this.deps.postSidecarJson(
        this.config.sidecarUrl,
        requestBody,
        this.config.timeoutMs
      );

      if (!response.ok) {
        const error = response.error || "sidecar_error";
        this.log?.logVerbose(`[Qwen3ASRDictationProvider] sidecar failed: ${error}`);
        throw new Error(`qwen3_sidecar_error:${error}`);
      }

      const text = response.text?.trim() || "";
      if (!text) {
        throw new Error("qwen3_empty_transcript");
      }

      return {
        text,
        model: response.model || this.config.modelPath,
        device: response.device || this.config.device,
        latencyMs: Date.now() - start,
        provider: "qwen3-asr",
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("qwen3_")) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log?.logVerbose(`[Qwen3ASRDictationProvider] sidecar exception: ${errorMessage}`);
      throw new Error(`qwen3_sidecar_error:${errorMessage}`);
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

  /**
   * Run transcription to fallback endpoint when primary vLLM returns 503.
   * Replays buffered audio to fallback endpoint and finalizes exactly once.
   */
  private async runFallbackTranscription(
    pcm16leAudio: Buffer,
    sampleRateHz: number,
    chunkId: string
  ): Promise<Qwen3TranscriptionResult | null> {
    if (!this.config.fallbackEndpoint) {
      return null;
    }

    const start = Date.now();

    try {
      const wavBuffer = buildWavFile(pcm16leAudio, sampleRateHz);
      const audioB64 = wavBuffer.toString('base64');
      
      const vllmPayload = {
        model: this.config.modelPath,
        prompt: "<|audio|>\n",
        temperature: 0.0,
        stream: false,
        multi_modal_data: {
          audio: [
            { type: "object", data: audioB64 }
          ]
        }
      };

      return new Promise<Qwen3TranscriptionResult | null>((resolve, reject) => {
        const parsedUrl = new URL(this.config.fallbackEndpoint!);
        const client = parsedUrl.protocol === "https:" ? https : http;
        const payloadStr = JSON.stringify(vllmPayload);
        const headers = {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payloadStr),
          "Connection": "keep-alive"
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
            res.on("data", (chunk) => { responseBody += chunk; });
            res.on("end", () => {
              if (res.statusCode && res.statusCode >= 400) {
                this.log?.logVerbose(`[Qwen3ASRDictationProvider] fallback HTTP error: ${res.statusCode}`);
                resolve(null);
                return;
              }
              try {
                const parsed = JSON.parse(responseBody);
                const text = parsed.choices?.[0]?.message?.content?.trim() || "";
                if (!text) {
                  resolve(null);
                  return;
                }
                resolve({
                  text,
                  model: this.config.modelPath,
                  device: "remote",
                  latencyMs: Date.now() - start,
                  provider: "qwen3-asr",
                });
              } catch (e: any) {
                reject(e);
              }
            });
          }
        );
        req.setTimeout(this.config.timeoutMs, () => req.destroy(new Error("Sidecar fallback HTTP timeout")));
        req.on("error", (err) => resolve(null));
        req.write(payloadStr);
        req.end();
      });
    } catch (error) {
      this.log?.logVerbose(`[Qwen3ASRDictationProvider] fallback exception: ${error}`);
      return null;
    }
  }
}
