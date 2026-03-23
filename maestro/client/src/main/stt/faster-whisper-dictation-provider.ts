import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";
import Log from "../log";

export interface FasterWhisperDictationProviderConfig {
  enabled?: boolean;
  pythonPath?: string;
  bridgeScriptPath?: string;
  model?: string;
  device?: string;
  computeType?: string;
  language?: string;
  timeoutMs?: number;
}

export interface DictationTranscriptionInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

export interface DictationTranscriptionResult {
  text: string;
  language: string;
  model: string;
  device: string;
  latencyMs: number;
  provider: "faster-whisper";
}

interface BridgeSuccess {
  ok: true;
  text: string;
  language: string;
  model: string;
  device: string;
}

interface BridgeFailure {
  ok: false;
  error: string;
}

type BridgeResponse = BridgeSuccess | BridgeFailure;

interface FasterWhisperDictationProviderDeps {
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
}

function resolveHomePath(value: string): string {
  if (!value.startsWith("~/")) {
    return value;
  }
  return path.join(homedir(), value.slice(2));
}

function defaultPythonPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_FASTER_WHISPER_PYTHON_PATH ||
      "~/venvs/maestro-faster-whisper/bin/python"
  );
}

function defaultBridgeScriptPath(): string {
  if (process.env.MAESTRO_FASTER_WHISPER_BRIDGE_PATH) {
    return resolveHomePath(process.env.MAESTRO_FASTER_WHISPER_BRIDGE_PATH);
  }

  return path.resolve(process.cwd(), "src/main/stt/faster_whisper_bridge.py");
}

export default class FasterWhisperDictationProvider {
  private config: Required<FasterWhisperDictationProviderConfig>;
  private deps: FasterWhisperDictationProviderDeps;
  private ready = false;
  private loadError?: string;

  constructor(
    config: FasterWhisperDictationProviderConfig = {},
    private log?: Log,
    deps?: Partial<FasterWhisperDictationProviderDeps>
  ) {
    this.config = {
      enabled:
        config.enabled !== undefined
          ? config.enabled
          : process.env.MAESTRO_DICTATION_FASTER_WHISPER_ENABLED !== "0",
      pythonPath: resolveHomePath(config.pythonPath || defaultPythonPath()),
      bridgeScriptPath: resolveHomePath(config.bridgeScriptPath || defaultBridgeScriptPath()),
      model: config.model || process.env.MAESTRO_FASTER_WHISPER_MODEL || "small",
      device: config.device || process.env.MAESTRO_FASTER_WHISPER_DEVICE || "cuda",
      computeType:
        config.computeType || process.env.MAESTRO_FASTER_WHISPER_COMPUTE_TYPE || "int8_float16",
      language: config.language || process.env.MAESTRO_FASTER_WHISPER_LANGUAGE || "en",
      timeoutMs: config.timeoutMs || 30000,
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
      ...deps,
    };

    this.initializeReadiness();
  }

  private initializeReadiness() {
    if (!this.config.enabled) {
      this.ready = false;
      this.loadError = "provider_disabled";
      return;
    }

    try {
      this.ready =
        this.deps.fileExists(this.config.pythonPath) &&
        this.deps.fileExists(this.config.bridgeScriptPath);
      if (!this.ready) {
        this.loadError = "python_or_bridge_missing";
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

  getConfig(): Required<FasterWhisperDictationProviderConfig> {
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nfaster_whisper_timeout` });
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nfaster_whisper_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });

      proc.stdin.write(stdinBuffer);
      proc.stdin.end();
    });
  }

  private parseBridgeResponse(stdout: string): BridgeResponse {
    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch (_error) {
      throw new Error("faster_whisper_invalid_json");
    }

    if (!parsed || typeof parsed.ok !== "boolean") {
      throw new Error("faster_whisper_invalid_response_shape");
    }

    if (!parsed.ok) {
      const error = typeof parsed.error === "string" ? parsed.error : "unknown_bridge_error";
      return { ok: false, error };
    }

    const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
    if (!text) {
      throw new Error("faster_whisper_empty_transcript");
    }

    return {
      ok: true,
      text,
      language: typeof parsed.language === "string" ? parsed.language : this.config.language,
      model: typeof parsed.model === "string" ? parsed.model : this.config.model,
      device: typeof parsed.device === "string" ? parsed.device : this.config.device,
    };
  }

  async transcribeDictation(
    input: DictationTranscriptionInput
  ): Promise<DictationTranscriptionResult> {
    if (!this.ready) {
      throw new Error(`faster_whisper_unavailable:${this.loadError || "not_ready"}`);
    }

    if (!input.pcm16leAudio || input.pcm16leAudio.length === 0) {
      throw new Error("faster_whisper_empty_audio");
    }

    const start = Date.now();

    try {
      const wavBuffer = this.buildWavFile(input.pcm16leAudio, input.sampleRateHz);

      const args = [
        "--stdin",
        "--model",
        this.config.model,
        "--device",
        this.config.device,
        "--compute-type",
        this.config.computeType,
        "--language",
        this.config.language,
      ];

      const result = await this.deps.runBridgeWithStdin(
        this.config.pythonPath,
        this.config.bridgeScriptPath,
        args,
        wavBuffer,
        this.config.timeoutMs
      );

      if (result.exitCode !== 0) {
        throw new Error(
          `faster_whisper_exit_${result.exitCode}:${result.stderr || result.stdout || "unknown_error"}`
        );
      }

      const parsed = this.parseBridgeResponse(result.stdout.trim());
      if (!parsed.ok) {
        throw new Error(`faster_whisper_bridge_failure:${parsed.error}`);
      }

      return {
        text: parsed.text,
        language: parsed.language,
        model: parsed.model,
        device: parsed.device,
        latencyMs: Date.now() - start,
        provider: "faster-whisper",
      };
    } finally {
      // Temp file disk I/O eliminated
    }
  }

  logUnavailableOnce(): void {
    if (this.ready) {
      return;
    }

    this.log?.logVerbose(
      `[FasterWhisperDictationProvider] unavailable: ${this.loadError || "not_ready"}`
    );
  }
}
