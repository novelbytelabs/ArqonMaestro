import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";
import Log from "../log";
import { buildWavFile } from "./audio-utils";

export interface WhisperCommandFastProviderConfig {
  enabled?: boolean;
  binaryPath?: string;
  modelPath?: string;
  language?: string;
  timeoutMs?: number;
  initialPrompt?: string;
}

export interface WhisperTranscriptionInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

export interface WhisperTranscriptionResult {
  transcript: string;
  provider: "whisper.cpp";
  latencyMs: number;
}

interface WhisperCommandFastProviderDeps {
  fileExists: (targetPath: string) => boolean;
  mkdtemp: (prefix: string) => Promise<string>;
  writeFile: (targetPath: string, data: Buffer) => Promise<void>;
  readFile: (targetPath: string) => Promise<string>;
  rm: (targetPath: string) => Promise<void>;
  runWhisper: (
    binaryPath: string,
    args: string[],
    timeoutMs: number
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  runWhisperWithStdin: (
    binaryPath: string,
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

function defaultBinaryPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_WHISPER_CPP_BINARY_PATH ||
      "~/Tools/whisper.cpp/build/bin/whisper-cli"
  );
}

function defaultModelPath(): string {
  return resolveHomePath(
    process.env.MAESTRO_WHISPER_CPP_MODEL_PATH ||
      "~/Tools/whisper.cpp/models/ggml-base.en.bin"
  );
}

const DEFAULT_PROMPT =
  "maestro command lane reflex mode focus navigation stop cancel undo redo " +
  "focus terminal focus editor focus browser next tab previous tab next error previous error";

export default class WhisperCommandFastProvider {
  private config: Required<WhisperCommandFastProviderConfig>;
  private deps: WhisperCommandFastProviderDeps;
  private ready = false;
  private loadError?: string;

  constructor(
    config: WhisperCommandFastProviderConfig = {},
    private log?: Log,
    deps?: Partial<WhisperCommandFastProviderDeps>
  ) {
    this.config = {
      enabled:
        config.enabled !== undefined
          ? config.enabled
          : process.env.MAESTRO_COMMAND_FAST_WHISPER_ENABLED !== "0",
      binaryPath: resolveHomePath(config.binaryPath || defaultBinaryPath()),
      modelPath: resolveHomePath(config.modelPath || defaultModelPath()),
      language: config.language || "en",
      timeoutMs: config.timeoutMs || 5000,
      initialPrompt: config.initialPrompt || DEFAULT_PROMPT,
    };
    this.deps = {
      fileExists: (targetPath) => require("fs").existsSync(targetPath),
      mkdtemp: (prefix) => fs.mkdtemp(prefix),
      writeFile: (targetPath, data) => fs.writeFile(targetPath, data),
      readFile: (targetPath) => fs.readFile(targetPath, "utf8"),
      rm: (targetPath) => fs.rm(targetPath, { recursive: true, force: true }),
      runWhisper: (binaryPath, args, timeoutMs) => this.defaultRunWhisper(binaryPath, args, timeoutMs),
      runWhisperWithStdin: (binaryPath, args, stdinBuffer, timeoutMs) => 
        this.defaultRunWhisperWithStdin(binaryPath, args, stdinBuffer, timeoutMs),
      ...deps,
    };

    this.initializeReadiness();
  }

  private initializeReadiness() {
    if (!this.config.enabled) {
      this.loadError = "provider_disabled";
      this.ready = false;
      return;
    }

    try {
      this.ready =
        this.deps.fileExists(this.config.binaryPath) &&
        this.deps.fileExists(this.config.modelPath);
      if (!this.ready) {
        this.loadError = "binary_or_model_missing";
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

  getConfig(): Required<WhisperCommandFastProviderConfig> {
    return { ...this.config };
  }


  private defaultRunWhisper(
    binaryPath: string,
    args: string[],
    timeoutMs: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(binaryPath, args, {
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nwhisper_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  private defaultRunWhisperWithStdin(
    binaryPath: string,
    args: string[],
    stdinBuffer: Buffer,
    timeoutMs: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(binaryPath, args, {
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nwhisper_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });

      proc.stdin.write(stdinBuffer);
      proc.stdin.end();
    });
  }

  async transcribeCommand(input: WhisperTranscriptionInput): Promise<WhisperTranscriptionResult> {
    if (!this.ready) {
      throw new Error(`whisper_unavailable:${this.loadError || "not_ready"}`);
    }

    if (!input.pcm16leAudio || input.pcm16leAudio.length === 0) {
      throw new Error("whisper_empty_audio");
    }

    const start = Date.now();

    try {
      const wavBuffer = buildWavFile(input.pcm16leAudio, input.sampleRateHz);

      const args = [
        "-m",
        this.config.modelPath,
        "-f",
        "-",
        "-l",
        this.config.language,
        "-nt",
        "-np",
        "--prompt",
        this.config.initialPrompt,
      ];

      const result = await this.deps.runWhisperWithStdin(
        this.config.binaryPath,
        args,
        wavBuffer,
        this.config.timeoutMs
      );
      if (result.exitCode !== 0) {
        throw new Error(
          `whisper_exit_${result.exitCode}:${result.stderr || result.stdout || "unknown_error"}`
        );
      }

      const transcript = result.stdout.trim().replace(/\s+/g, " ");
      if (!transcript) {
        throw new Error("whisper_empty_transcript");
      }

      return {
        transcript,
        provider: "whisper.cpp",
        latencyMs: Date.now() - start,
      };
    } finally {
      // Temp file disk I/O eradicated 
    }
  }

  logUnavailableOnce(): void {
    if (this.ready) {
      return;
    }
    this.log?.logVerbose(
      `[WhisperCommandFastProvider] unavailable: ${this.loadError || "not_ready"}`
    );
  }
}
