import { spawn } from "child_process";
import { homedir } from "os";
import path from "path";

export interface WeSpeakerVerificationProviderConfig {
  enabled?: boolean;
  pythonPath?: string;
  bridgeScriptPath?: string;
  modelTarget?: string;
  modelHome?: string;
  device?: "cpu";
  timeoutMs?: number;
}

export interface WeSpeakerVerifyInput {
  enrollmentAudioPath: string;
  probeAudioPath: string;
}

export interface WeSpeakerVerifyResult {
  ok: true;
  similarity: number;
}

interface WeSpeakerVerifyFailure {
  ok: false;
  error: string;
}

type WeSpeakerBridgeResponse = WeSpeakerVerifyResult | WeSpeakerVerifyFailure;

interface WeSpeakerVerificationProviderDeps {
  fileExists: (targetPath: string) => boolean;
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
    process.env.MAESTRO_WESPEAKER_PYTHON_PATH || "~/venvs/maestro-wespeaker/bin/python"
  );
}

function defaultBridgeScriptPath(): string {
  if (process.env.MAESTRO_WESPEAKER_BRIDGE_PATH) {
    return resolveHomePath(process.env.MAESTRO_WESPEAKER_BRIDGE_PATH);
  }
  return path.resolve(process.cwd(), "src/main/runtime/wespeaker_verification_bridge.py");
}

function defaultModelHome(): string {
  return resolveHomePath(process.env.MAESTRO_WESPEAKER_MODEL_HOME || "~/.wespeaker");
}

export default class WeSpeakerVerificationProvider {
  private config: Required<WeSpeakerVerificationProviderConfig>;
  private deps: WeSpeakerVerificationProviderDeps;
  private ready = false;
  private loadError?: string;

  constructor(
    config: WeSpeakerVerificationProviderConfig = {},
    deps?: Partial<WeSpeakerVerificationProviderDeps>
  ) {
    this.config = {
      enabled:
        config.enabled !== undefined ? config.enabled : process.env.MAESTRO_WESPEAKER_ENABLED !== "0",
      pythonPath: resolveHomePath(config.pythonPath || defaultPythonPath()),
      bridgeScriptPath: resolveHomePath(config.bridgeScriptPath || defaultBridgeScriptPath()),
      modelTarget: config.modelTarget || process.env.MAESTRO_WESPEAKER_MODEL_TARGET || "english",
      modelHome: resolveHomePath(config.modelHome || defaultModelHome()),
      device: "cpu",
      timeoutMs: config.timeoutMs || 30000,
    };

    this.deps = {
      fileExists: (targetPath) => require("fs").existsSync(targetPath),
      runBridge: (pythonPath, bridgeScriptPath, args, timeoutMs) =>
        this.defaultRunBridge(pythonPath, bridgeScriptPath, args, timeoutMs),
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

  getConfig(): Required<WeSpeakerVerificationProviderConfig> {
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
          resolve({ exitCode: -1, stdout, stderr: `${stderr}\nwespeaker_timeout` });
          return;
        }
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });
    });
  }

  private parseBridgeResponse(stdout: string): WeSpeakerBridgeResponse {
    let parsed: any;
    try {
      parsed = JSON.parse(stdout);
    } catch (_error) {
      throw new Error("wespeaker_invalid_json");
    }

    if (!parsed || typeof parsed.ok !== "boolean") {
      throw new Error("wespeaker_invalid_response_shape");
    }

    if (!parsed.ok) {
      return {
        ok: false,
        error: typeof parsed.error === "string" ? parsed.error : "unknown_bridge_error",
      };
    }

    const similarity = Number(parsed.similarity);
    if (!Number.isFinite(similarity)) {
      throw new Error("wespeaker_invalid_similarity");
    }

    return {
      ok: true,
      similarity,
    };
  }

  async verify(input: WeSpeakerVerifyInput): Promise<number> {
    if (!this.ready) {
      throw new Error(`wespeaker_unavailable:${this.loadError || "not_ready"}`);
    }

    if (!this.deps.fileExists(input.enrollmentAudioPath)) {
      throw new Error("wespeaker_enrollment_audio_missing");
    }
    if (!this.deps.fileExists(input.probeAudioPath)) {
      throw new Error("wespeaker_probe_audio_missing");
    }

    const args = [
      "--enroll-audio",
      input.enrollmentAudioPath,
      "--probe-audio",
      input.probeAudioPath,
      "--model-target",
      this.config.modelTarget,
      "--model-home",
      this.config.modelHome,
      "--device",
      this.config.device,
    ];

    const result = await this.deps.runBridge(
      this.config.pythonPath,
      this.config.bridgeScriptPath,
      args,
      this.config.timeoutMs
    );

    if (result.exitCode !== 0) {
      throw new Error(
        `wespeaker_exit_${result.exitCode}:${result.stderr || result.stdout || "unknown_error"}`
      );
    }

    const parsed = this.parseBridgeResponse(result.stdout.trim());
    if (!parsed.ok) {
      throw new Error(`wespeaker_bridge_failure:${parsed.error}`);
    }
    return parsed.similarity;
  }
}
