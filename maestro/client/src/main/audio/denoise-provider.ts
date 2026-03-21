/**
 * Denoise Provider Interface
 * 
 * Wave A: Provider boundary for audio denoising.
 * Default implementation is NoopDenoiseProvider which preserves current behavior.
 */

import fs from "fs";
import path from "path";

/**
 * Audio frame with metadata for denoising processing
 */
export interface DenoiseFrame {
  pcm16: Int16Array;
  sampleRate: number;
  channels: number;
  frameIndex: number;
  captureStartWallClockMs: number;
  timestampMs: number;
  streamTimeMs: number;
}

/**
 * Result of denoising processing
 */
export interface DenoiseResult {
  frame: DenoiseFrame;
  processingTimeMs: number;
  provider: string;
  fallbackApplied: boolean;
  reason?: string;
}

/**
 * Base interface for denoise providers
 */
export interface DenoiseProvider {
  /**
   * Process an audio frame through denoising
   */
  process(frame: DenoiseFrame): DenoiseResult;

  /**
   * Reset provider state (for new recording sessions)
   */
  reset(): void;

  /**
   * Provider name for debugging/logging
   */
  name(): string;

  /**
   * Check if provider is ready for processing
   */
  isReady(): boolean;
}

/**
 * No-op denoise provider that passes audio through unchanged.
 * This is the default provider to preserve current runtime behavior
 * while the provider interface is established.
 */
export class NoopDenoiseProvider implements DenoiseProvider {
  private ready = false;

  constructor() {
    this.ready = true;
  }

  process(frame: DenoiseFrame): DenoiseResult {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    
    // Return frame unchanged
    return {
      frame: {
        ...frame,
        // Clone to ensure immutability
        pcm16: new Int16Array(frame.pcm16),
      },
      processingTimeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime,
      provider: this.name(),
      fallbackApplied: false,
    };
  }

  reset(): void {
    // No state to reset for noop provider
    this.ready = true;
  }

  name(): string {
    return "NoopDenoiseProvider";
  }

  isReady(): boolean {
    return this.ready;
  }
}

interface OrtTensor {
  type: string;
  dims: number[];
  data: Float32Array;
}

interface BindingSession {
  loadModel(modelPath: string, options: Record<string, unknown>): void;
  run(
    feeds: Record<string, unknown>,
    fetches: Record<string, unknown>,
    options: Record<string, unknown>
  ): Record<string, OrtTensor>;
}

interface OrtBindingModule {
  Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown;
}

interface OrtNativeBinding {
  InferenceSession: new () => BindingSession;
}

export interface OnnxDenoiseProviderConfig {
  enabled: boolean;
  modelPath?: string;
  modelFrameSamples: number;
  sampleRateHz: number;
  maxConsecutiveInferenceErrors: number;
}

function resolveDefaultModelPath(): string | undefined {
  const explicit = process.env.MAESTRO_ONNX_DENOISER_MODEL_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const candidates = [
    path.resolve(__dirname, "models", "dtln_denoiser.onnx"),
    path.resolve(__dirname, "models", "denoiser.onnx"),
    path.resolve(__dirname, "../../../src/main/audio/models/dtln_denoiser.onnx"),
    path.resolve(__dirname, "../../../src/main/audio/models/denoiser.onnx"),
    path.resolve(process.cwd(), "src/main/audio/models/dtln_denoiser.onnx"),
    path.resolve(process.cwd(), "src/main/audio/models/denoiser.onnx"),
    path.resolve(process.cwd(), "maestro/client/src/main/audio/models/dtln_denoiser.onnx"),
    path.resolve(process.cwd(), "maestro/client/src/main/audio/models/denoiser.onnx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return explicit;
}

function toPcm16(normalized: Float32Array): Int16Array {
  const pcm16 = new Int16Array(normalized.length);
  for (let i = 0; i < normalized.length; i++) {
    const clamped = Math.max(-1, Math.min(1, normalized[i]));
    pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(clamped * 32767)));
  }
  return pcm16;
}

export class OnnxDenoiseProvider implements DenoiseProvider {
  private config: OnnxDenoiseProviderConfig;
  private ready = false;
  private loadError?: string;
  private ort?: OrtBindingModule;
  private session?: BindingSession;
  private consecutiveInferenceErrors = 0;

  constructor(config: Partial<OnnxDenoiseProviderConfig> = {}) {
    this.config = {
      enabled: config.enabled !== false,
      modelPath: config.modelPath,
      modelFrameSamples: config.modelFrameSamples ?? 480,
      sampleRateHz: config.sampleRateHz ?? 16000,
      maxConsecutiveInferenceErrors: config.maxConsecutiveInferenceErrors ?? 3,
    };
    this.tryInitializeModel();
  }

  private tryInitializeModel(): void {
    if (!this.config.enabled) {
      this.ready = false;
      this.loadError = "onnx_denoiser_disabled";
      return;
    }

    const modelPath = this.config.modelPath ?? resolveDefaultModelPath();
    if (!modelPath || !fs.existsSync(modelPath)) {
      this.ready = false;
      this.loadError = "onnx_denoiser_model_missing";
      return;
    }

    try {
      this.ort = require("onnxruntime-node") as OrtBindingModule;
      const bindingModule = require("onnxruntime-node/dist/binding.js") as {
        binding: OrtNativeBinding;
        initOrt: () => void;
      };
      bindingModule.initOrt();

      const session = new bindingModule.binding.InferenceSession();
      session.loadModel(modelPath, {});
      this.session = session;
      this.ready = true;
      this.loadError = undefined;
    } catch (error) {
      this.ready = false;
      this.loadError = error instanceof Error ? error.message : String(error);
      console.warn(`[Audio][Denoise] Failed to initialize ONNX denoiser: ${this.loadError}`);
    }
  }

  private passthrough(frame: DenoiseFrame, reason: string, startTime: number): DenoiseResult {
    return {
      frame: {
        ...frame,
        pcm16: new Int16Array(frame.pcm16),
      },
      processingTimeMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime,
      provider: this.name(),
      fallbackApplied: true,
      reason,
    };
  }

  private normalize(frame: DenoiseFrame): Float32Array {
    const targetSamples = this.config.modelFrameSamples;
    const normalized = new Float32Array(targetSamples);
    const copyLength = Math.min(frame.pcm16.length, targetSamples);

    for (let i = 0; i < copyLength; i++) {
      normalized[i] = frame.pcm16[i] / 32768;
    }

    return normalized;
  }

  process(frame: DenoiseFrame): DenoiseResult {
    const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();

    if (!this.ready || !this.ort || !this.session) {
      return this.passthrough(frame, this.loadError ?? "onnx_denoiser_unavailable", startTime);
    }

    if (frame.sampleRate !== this.config.sampleRateHz) {
      return this.passthrough(
        frame,
        `unsupported_sample_rate:${frame.sampleRate}`,
        startTime
      );
    }

    try {
      const inputData = this.normalize(frame);
      const inputNames = ["input", "x", "audio", "noisy"];
      const outputNames = ["output", "y", "enhanced", "denoised"];

      let output: OrtTensor | undefined;
      let lastError: string | undefined;

      for (const inputName of inputNames) {
        for (const outputName of outputNames) {
          try {
            const input = new this.ort.Tensor("float32", inputData, [1, this.config.modelFrameSamples]);
            const outputs = this.session.run(
              { [inputName]: input },
              { [outputName]: null },
              {}
            );
            output = outputs[outputName];
            if (output?.data && output.data.length > 0) {
              break;
            }
          } catch (error) {
            lastError = error instanceof Error ? error.message : String(error);
          }
        }
        if (output?.data && output.data.length > 0) {
          break;
        }
      }

      if (!output?.data || output.data.length === 0) {
        throw new Error(lastError ?? "onnx_denoiser_output_missing");
      }

      const denoised = toPcm16(output.data);
      this.consecutiveInferenceErrors = 0;

      return {
        frame: {
          ...frame,
          pcm16: denoised.length === frame.pcm16.length ? denoised : denoised.slice(0, frame.pcm16.length),
        },
        processingTimeMs:
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime,
        provider: this.name(),
        fallbackApplied: false,
      };
    } catch (error) {
      this.consecutiveInferenceErrors += 1;
      const reason = error instanceof Error ? error.message : String(error);
      if (this.consecutiveInferenceErrors >= this.config.maxConsecutiveInferenceErrors) {
        this.ready = false;
        this.loadError = `onnx_denoiser_disabled_after_errors:${reason}`;
      }
      return this.passthrough(frame, `onnx_denoiser_inference_error:${reason}`, startTime);
    }
  }

  reset(): void {
    this.consecutiveInferenceErrors = 0;
    if (!this.ready && this.loadError?.startsWith("onnx_denoiser_disabled_after_errors:")) {
      this.tryInitializeModel();
    }
  }

  name(): string {
    return "OnnxDenoiseProvider";
  }

  isReady(): boolean {
    return this.ready;
  }
}
