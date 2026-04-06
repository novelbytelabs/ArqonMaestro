import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";
import http from "http";
import https from "https";
import WebSocket from "ws";
import Log from "../log";
import { buildWavFile } from "./audio-utils";
import { h23Recorder } from "../runtime/h23-live-trace-recorder";
import { emitH3RuntimeEvidence } from "../runtime/h3-runtime-evidence";

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
  sidecarUrl?: string; // Should be ws:// for WebSocket sidecar
}

export interface ParakeetTranscriptionInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

export interface ParakeetTranscriptionResult {
  chunkId: string;
  transcript: string;
  model: string;
  device: string;
  latencyMs: number;
  provider: "parakeet";
  geometricEvent?: GeometricRegionEvent | null;
}

export interface ParakeetStreamSession {
  sendAudio(audio: Buffer): void;
  finalize(): Promise<ParakeetTranscriptionResult>;
  cancel(): void;
}

export interface GeometricRegionEvent {
  source: "spectral_manifold";
  regionId: string;
  commandId?: string;
  commandClass: "reflex" | "closed_structure" | "parameterized" | "unknown";
  parameterType?: "numeric" | "open" | null;
  atlasSchema?: string;
  atlasVersion?: string;
  atlasBacked?: boolean;
  confidence: number;
  frameCount: number;
  timestampMs: number;
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
  // Sidecar HTTP client (still maintained for fallback logic strictly if needed, though we upgrade to WS)
  postSidecarJson: (
    urlString: string,
    body: ParakeetSidecarRequest,
    timeoutMs: number
  ) => Promise<ParakeetSidecarResponse>;
  createWebSocket: (url: string) => WebSocket;
}

function resolveHomePath(value: string): string {
  if (!value.startsWith("~/")) {
    return value;
  }
  return path.join(homedir(), value.slice(2));
}

function defaultPythonPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_PARAKEET_PYTHON_PATH || "~/miniconda3/envs/helios-gpu-118/bin/python"
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
    process.env.MAESTRO_PARAKEET_MODEL_PATH || "~/models/arqon/asr/parakeet-tdt-0.6b-v3"
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
      createWebSocket: (url) => new WebSocket(url),
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

    if (this.config.mode === "sidecar") {
      this.ready = !!this.config.sidecarUrl;
      if (!this.ready) {
        this.loadError = "sidecar_url_missing";
      }
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

    // Route based on mode: "local" spawns Python bridge, "sidecar" uses WebSocket stream
    if (this.isStreamingSupported()) {
      const session = this.createStream(input.chunkId);
      session.sendAudio(input.pcm16leAudio);
      return session.finalize();
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
      const wavBuffer = buildWavFile(input.pcm16leAudio, input.sampleRateHz);

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
        chunkId: input.chunkId,
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

  isStreamingSupported(): boolean {
    return this.ready && this.config.mode === "sidecar" && !!this.config.sidecarUrl;
  }

  createStream(
    chunkId: string,
    onPartial?: (text: string) => void,
    onGeometricEvent?: (event: GeometricRegionEvent) => void
  ): ParakeetStreamSession {
    if (!this.isStreamingSupported()) {
      throw new Error(`parakeet_streaming_unavailable`);
    }

    return this.createWebSocketStream(chunkId, onPartial, onGeometricEvent);
  }

  private createWebSocketStream(
    chunkId: string,
    onPartial?: (text: string) => void,
    onGeometricEvent?: (event: GeometricRegionEvent) => void
  ): ParakeetStreamSession {
    const wsUrl = this.config.sidecarUrl.replace("http://", "ws://").replace("https://", "wss://");
    const ws = this.deps.createWebSocket(wsUrl);
    const start = Date.now();
    let isConnected = false;
    let settled = false;
    let canceled = false;
    let finalizeRequested = false;
    let initTimeout: ReturnType<typeof setTimeout> | undefined;
    let h23StepIndex = 0;
    let lastGeometricEventSignature: string | null = null;
    let lastGeometricEventAtMs = 0;
    const pendingAudioFrames: Buffer[] = [];

    h23Recorder.startChunk(chunkId);

    const finalizePromise = new Promise<ParakeetTranscriptionResult>((resolve, reject) => {
      const settleResolve = (value: ParakeetTranscriptionResult) => {
        if (settled) {
          return;
        }
        settled = true;
        if (initTimeout) {
          clearTimeout(initTimeout);
        }
        resolve(value);
      };

      const settleReject = (error: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        if (initTimeout) {
          clearTimeout(initTimeout);
        }
        reject(error);
      };

      initTimeout = setTimeout(() => {
        if (!isConnected) {
          ws.terminate();
          settleReject(new Error("parakeet_sidecar_error:websocket_timeout"));
        }
      }, this.config.timeoutMs);

      ws.on("open", () => {
        isConnected = true;
        ws.send(JSON.stringify({
          chunk_id: chunkId,
          model_path: this.config.modelPath,
          sample_rate_hz: 16000,
        }));
        for (const frame of pendingAudioFrames) {
          ws.send(frame);
        }
        pendingAudioFrames.length = 0;
        if (finalizeRequested) {
          ws.send(JSON.stringify({ eof: true }));
        }
      });

      ws.on("message", (data) => {
        if (canceled) {
          return;
        }
        try {
          const response = JSON.parse(data.toString());
          if (!response.ok) {
            const errorMsg = response.error || "unknown_error";
            throw new Error(`parakeet_sidecar_error:${errorMsg}`);
          }

          const geometricEvent = this.parseGeometricEvent(response.geometric_event);
          if (geometricEvent && onGeometricEvent) {
            const isFinalStep = Boolean(response.is_final);
            const signature = `${geometricEvent.regionId}|${geometricEvent.commandClass}`;
            const nowMs = Date.now();
            const isDuplicate =
              !isFinalStep &&
              lastGeometricEventSignature === signature &&
              nowMs - lastGeometricEventAtMs < 250;
            if (!isDuplicate) {
              lastGeometricEventSignature = signature;
              lastGeometricEventAtMs = nowMs;
              const transcriptText = typeof response.text === "string" ? response.text : null;
              emitH3RuntimeEvidence({
                event: "geometric_event_emitted",
                chunkId,
                source: geometricEvent.source,
                regionId: geometricEvent.regionId,
                commandClass: geometricEvent.commandClass,
                hadTranscriptText: Boolean(transcriptText && transcriptText.trim().length > 0),
                transcriptText: transcriptText && transcriptText.trim().length > 0 ? transcriptText : null,
                reason: `proxied_from_sidecar_payload;atlas_backed=${Boolean(
                  geometricEvent.atlasBacked
                )};atlas_schema=${geometricEvent.atlasSchema || "unknown"};atlas_version=${
                  geometricEvent.atlasVersion || "unknown"
                }`,
              });
              onGeometricEvent(geometricEvent);
              emitH3RuntimeEvidence({
                event: "geometric_event_received",
                chunkId,
                source: geometricEvent.source,
                regionId: geometricEvent.regionId,
                commandClass: geometricEvent.commandClass,
                hadTranscriptText: Boolean(transcriptText && transcriptText.trim().length > 0),
                transcriptText: transcriptText && transcriptText.trim().length > 0 ? transcriptText : null,
                reason: `atlas_backed=${Boolean(
                  geometricEvent.atlasBacked
                )};command_id=${geometricEvent.commandId || "unknown"};parameter_type=${
                  geometricEvent.parameterType ?? "null"
                }`,
              });
            }
          }

          if (response.is_final) {
            if (!response.text) {
              settleReject(new Error("parakeet_empty_transcript"));
              ws.terminate();
              return;
            }
            h23StepIndex += 1;
            const finalStep = h23Recorder.recordFinal(chunkId, response.text, h23StepIndex);
            this.log?.logVerbose(`[H23 final] ${JSON.stringify(finalStep)}`);
            settleResolve({
              chunkId,
              transcript: response.text,
              model: this.config.modelPath,
              device: this.config.device,
              latencyMs: Date.now() - start,
              provider: "parakeet",
              geometricEvent,
            });
            ws.close();
            return;
          }

          if (onPartial && response.text) {
            h23StepIndex += 1;
            const step = h23Recorder.recordPartial(chunkId, response.text, h23StepIndex);
            this.log?.logVerbose(`[H23 partial] ${JSON.stringify(step)}`);
            onPartial(response.text);
          }
        } catch (err) {
          settleReject(err instanceof Error ? err : new Error(String(err)));
          ws.terminate();
        }
      });

      ws.on("error", (err) => {
        if (canceled) {
          return;
        }
        this.log?.logVerbose(`[ParakeetCommandFastProvider] WS error: ${err.message}`);
        settleReject(new Error(`parakeet_sidecar_error:${err.message}`));
      });

      ws.on("close", () => {
        if (!settled && !canceled) {
          settleReject(new Error("parakeet_sidecar_error:websocket_closed_prematurely"));
        }
      });
    });

    return {
      sendAudio: (audio: Buffer) => {
        if (settled || canceled) {
          return;
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(audio);
          return;
        }
        pendingAudioFrames.push(audio);
      },
      finalize: async () => {
        if (canceled) {
          throw new Error("parakeet_sidecar_error:websocket_canceled");
        }
        finalizeRequested = true;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ eof: true }));
        }
        return finalizePromise;
      },
      cancel: () => {
        if (!settled) {
          canceled = true;
          settled = true;
          if (initTimeout) {
            clearTimeout(initTimeout);
          }
          ws.terminate();
          h23Recorder.finalizeChunk(chunkId);
        }
      },
    };
  }

  logUnavailableOnce(): void {
    if (this.ready) {
      return;
    }
    this.log?.logVerbose(
      `[ParakeetCommandFastProvider] unavailable: ${this.loadError || "not_ready"}`
    );
  }

  private parseGeometricEvent(value: any): GeometricRegionEvent | null {
    if (!value || typeof value !== "object") {
      return null;
    }
    const source = String(value.source || "");
    const regionId = String(value.region_id || value.regionId || "").trim();
    const commandIdRaw = String(value.command_id || value.commandId || "").trim();
    const commandClass = String(value.command_class || value.commandClass || "unknown");
    const parameterTypeRaw = value.parameter_type ?? value.parameterType ?? null;
    const atlasSchemaRaw = value.atlas_schema ?? value.atlasSchema;
    const atlasVersionRaw = value.atlas_version ?? value.atlasVersion;
    const atlasBackedRaw = value.atlas_backed ?? value.atlasBacked;
    const confidence = Number(value.confidence ?? 0);
    const frameCount = Number(value.frame_count ?? value.frameCount ?? 0);
    const timestampMs = Number(value.timestamp_ms ?? value.timestampMs ?? 0);
    if (source !== "spectral_manifold" || !regionId) {
      return null;
    }
    if (!["reflex", "closed_structure", "parameterized", "unknown"].includes(commandClass)) {
      return null;
    }
    if (!Number.isFinite(confidence) || !Number.isFinite(frameCount) || !Number.isFinite(timestampMs)) {
      return null;
    }
    let parameterType: "numeric" | "open" | null | undefined = undefined;
    if (parameterTypeRaw === null || parameterTypeRaw === "") {
      parameterType = null;
    } else if (parameterTypeRaw === "numeric" || parameterTypeRaw === "open") {
      parameterType = parameterTypeRaw;
    }
    return {
      source: "spectral_manifold",
      regionId,
      commandId: commandIdRaw || undefined,
      commandClass: commandClass as GeometricRegionEvent["commandClass"],
      parameterType,
      atlasSchema: typeof atlasSchemaRaw === "string" ? atlasSchemaRaw : undefined,
      atlasVersion: typeof atlasVersionRaw === "string" ? atlasVersionRaw : undefined,
      atlasBacked: typeof atlasBackedRaw === "boolean" ? atlasBackedRaw : undefined,
      confidence: Math.max(0, Math.min(1, confidence)),
      frameCount: Math.max(0, Math.round(frameCount)),
      timestampMs: Math.max(0, Math.round(timestampMs)),
    };
  }
}
