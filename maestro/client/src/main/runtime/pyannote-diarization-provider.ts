import { spawn } from "child_process";
import { promises as fs } from "fs";
import { homedir, tmpdir } from "os";
import path from "path";

export interface DiarizationSegment {
  start: number;
  end: number;
  speaker: string;
}

export interface DiarizationInput {
  chunkId: string;
  pcm16leAudio: Buffer;
  sampleRateHz: number;
}

export interface PyannoteDiarizationProviderConfig {
  enabled?: boolean;
  pythonPath?: string;
  bridgeScriptPath?: string;
  pipeline?: string;
  timeoutMs?: number;
  hfTokenEnvVarName?: string;
}

interface BridgeSuccessResponse {
  ok: true;
  segments: DiarizationSegment[];
}

interface BridgeFailureResponse {
  ok: false;
  error: string;
}

type BridgeResponse = BridgeSuccessResponse | BridgeFailureResponse;

interface PyannoteDiarizationProviderDeps {
  fileExists: (targetPath: string) => boolean;
  mkdtemp: (prefix: string) => Promise<string>;
  writeFile: (targetPath: string, data: Buffer) => Promise<void>;
  rm: (targetPath: string) => Promise<void>;
  runBridge: (
    pythonPath: string,
    bridgeScriptPath: string,
    args: string[],
    timeoutMs: number,
    tokenEnvVarName: string
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
    process.env.MAESTRO_PYANNOTE_PYTHON_PATH || "~/venvs/maestro-pyannote/bin/python"
  );
}

function defaultBridgeScriptPath(): string {
  if (process.env.MAESTRO_PYANNOTE_BRIDGE_PATH) {
    return resolveHomePath(process.env.MAESTRO_PYANNOTE_BRIDGE_PATH);
  }
  return path.resolve(process.cwd(), "src/main/runtime/pyannote_diarization_bridge.py");
}

function resolveTokenEnvName(configName?: string): string {
  if (configName && configName.trim()) {
    return configName.trim();
  }
  if (process.env.MAESTRO_PYANNOTE_TOKEN_ENV_VAR_NAME) {
    return process.env.MAESTRO_PYANNOTE_TOKEN_ENV_VAR_NAME;
  }
  return "HF_TOKEN";
}

export default class PyannoteDiarizationProvider {
  private config: Required<PyannoteDiarizationProviderConfig>;
  private deps: PyannoteDiarizationProviderDeps;
  private ready = false;
  private loadError?: string;

  constructor(
    config: PyannoteDiarizationProviderConfig = {},
    deps?: Partial<PyannoteDiarizationProviderDeps>
  ) {
    this.config = {
      enabled:
        config.enabled !== undefined ? config.enabled : process.env.MAESTRO_PYANNOTE_ENABLED !== "0",
      pythonPath: resolveHomePath(config.pythonPath || defaultPythonPath()),
      bridgeScriptPath: resolveHomePath(config.bridgeScriptPath || defaultBridgeScriptPath()),
      pipeline: config.pipeline || "pyannote/speaker-diarization-community-1",
      timeoutMs: config.timeoutMs || 45000,
      hfTokenEnvVarName: resolveTokenEnvName(config.hfTokenEnvVarName),
    };

    this.deps = {
      fileExists: (targetPath) => require("fs").existsSync(targetPath),
      mkdtemp: (prefix) => fs.mkdtemp(prefix),
      writeFile: (targetPath, data) => fs.writeFile(targetPath, data),
      rm: (targetPath) => fs.rm(targetPath, { recursive: true, force: true }),
      runBridge: (pythonPath, bridgeScriptPath, args, timeoutMs, tokenEnvVarName) =>
        this.defaultRunBridge(pythonPath, bridgeScriptPath, args, timeoutMs, tokenEnvVarName),
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

  getConfig(): Required<PyannoteDiarizationProviderConfig> {
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
    timeoutMs: number,
    tokenEnvVarName: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const tokenValue = process.env[tokenEnvVarName] || "";
      const proc = spawn(pythonPath, [bridgeScriptPath, ...args], {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          MAESTRO_PYANNOTE_TOKEN: tokenValue,
        },
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\npyannote_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  private parseBridgeResponse(stdout: string): BridgeResponse {
    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch (_error) {
      throw new Error("pyannote_invalid_json");
    }

    if (!parsed || typeof parsed.ok !== "boolean") {
      throw new Error("pyannote_invalid_response_shape");
    }

    if (!parsed.ok) {
      return {
        ok: false,
        error: typeof parsed.error === "string" ? parsed.error : "unknown_bridge_error",
      };
    }

    if (!Array.isArray(parsed.segments)) {
      throw new Error("pyannote_invalid_segments");
    }

    const segments: DiarizationSegment[] = parsed.segments
      .map((segment: any) => ({
        start: Number(segment.start),
        end: Number(segment.end),
        speaker: String(segment.speaker || ""),
      }))
      .filter(
        (segment: DiarizationSegment) =>
          Number.isFinite(segment.start) && Number.isFinite(segment.end)
      )
      .filter((segment: DiarizationSegment) => segment.end > segment.start)
      .filter((segment: DiarizationSegment) => segment.speaker.length > 0);

    return {
      ok: true,
      segments,
    };
  }

  async diarize(input: DiarizationInput): Promise<DiarizationSegment[]> {
    if (!this.ready) {
      throw new Error(`pyannote_unavailable:${this.loadError || "not_ready"}`);
    }

    if (!input.pcm16leAudio || input.pcm16leAudio.length === 0) {
      throw new Error("pyannote_empty_audio");
    }

    const tempDir = await this.deps.mkdtemp(path.join(tmpdir(), "maestro-pyannote-"));
    const inputWavPath = path.join(tempDir, `${input.chunkId}.wav`);

    try {
      const wavBuffer = this.buildWavFile(input.pcm16leAudio, input.sampleRateHz);
      await this.deps.writeFile(inputWavPath, wavBuffer);

      const args = [
        "--audio",
        inputWavPath,
        "--pipeline",
        this.config.pipeline,
      ];

      const result = await this.deps.runBridge(
        this.config.pythonPath,
        this.config.bridgeScriptPath,
        args,
        this.config.timeoutMs,
        this.config.hfTokenEnvVarName
      );

      if (result.exitCode !== 0) {
        throw new Error(
          `pyannote_exit_${result.exitCode}:${result.stderr || result.stdout || "unknown_error"}`
        );
      }

      const parsed = this.parseBridgeResponse(result.stdout.trim());
      if (!parsed.ok) {
        throw new Error(`pyannote_bridge_failure:${parsed.error}`);
      }

      return parsed.segments;
    } finally {
      await this.deps.rm(tempDir);
    }
  }
}
