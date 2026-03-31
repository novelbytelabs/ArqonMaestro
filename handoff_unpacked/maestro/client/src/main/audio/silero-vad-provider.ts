/**
 * Silero VAD shadow provider for Patch 3.
 *
 * This implementation uses real ONNX Silero inference in shadow mode.
 * Primary recorder behavior remains authoritative in DefaultVadProvider.
 */

import fs from "fs";
import path from "path";

import { DenoiseFrame } from "./denoise-provider";
import { VadConfig, VadDecision, VadProvider } from "./vad-provider";

export interface SileroVadConfig extends VadConfig {
  speechProbThreshold: number;
  silenceProbThreshold: number;
  modelPath?: string;
  modelFrameSamples: number;
}

interface OrtTensor {
  type: string;
  dims: number[];
  data: Float32Array | BigInt64Array;
}

interface BindingSession {
  loadModel(modelPath: string, options: Record<string, unknown>): void;
  run(
    feeds: Record<string, unknown>,
    fetches: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Record<string, OrtTensor>;
}

interface OrtBindingModule {
  Tensor: new (type: string, data: Float32Array | BigInt64Array, dims: number[]) => unknown;
}

interface OrtNativeBinding {
  InferenceSession: new () => BindingSession;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveDefaultModelPath(): string {
  const candidates = [
    path.resolve(__dirname, "models", "silero_vad.onnx"),
    path.resolve(__dirname, "../../../src/main/audio/models/silero_vad.onnx"),
    path.resolve(process.cwd(), "src/main/audio/models/silero_vad.onnx"),
    path.resolve(process.cwd(), "maestro/client/src/main/audio/models/silero_vad.onnx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export class SileroVadProvider implements VadProvider {
  private config: SileroVadConfig;
  private noiseFloor = 0.002;
  private consecutiveSpeech = 0;
  private consecutiveSilence = 0;
  private speaking = false;
  private ready = false;
  private loadError?: string;

  private ort?: OrtBindingModule;
  private session?: BindingSession;
  private stateTensorData = new Float32Array(2 * 1 * 128);
  private srTensorData = new BigInt64Array([BigInt(16000)]);

  constructor(config?: Partial<SileroVadConfig>) {
    this.config = {
      baseSilenceThreshold: config?.baseSilenceThreshold ?? 0.008,
      baseSpeechThreshold: config?.baseSpeechThreshold ?? 0.015,
      silenceFramesToEnd: config?.silenceFramesToEnd ?? 10,
      consecutiveFramesForSpeaking: config?.consecutiveFramesForSpeaking ?? 1,
      speechProbThreshold: config?.speechProbThreshold ?? 0.25,
      silenceProbThreshold: config?.silenceProbThreshold ?? 0.1,
      modelPath: config?.modelPath,
      modelFrameSamples: config?.modelFrameSamples ?? 512,
    };

    this.tryInitializeModel();
  }

  private tryInitializeModel(): void {
    try {
      // Import the common Tensor class and native binding entry explicitly.
      // We use the native binding because recorder VAD path is synchronous.
      this.ort = require("onnxruntime-node") as OrtBindingModule;
      const bindingModule = require("onnxruntime-node/dist/binding.js") as {
        binding: OrtNativeBinding;
        initOrt: () => void;
      };
      bindingModule.initOrt();

      const session = new bindingModule.binding.InferenceSession();
      const modelPath = this.config.modelPath ?? resolveDefaultModelPath();
      session.loadModel(modelPath, {});

      this.session = session;
      this.ready = true;
      this.loadError = undefined;
    } catch (error) {
      this.ready = false;
      this.loadError = error instanceof Error ? error.message : String(error);
      console.warn(`[Audio][Silero] Failed to initialize ONNX model: ${this.loadError}`);
    }
  }

  private rms(audio: Int16Array): number {
    if (audio.length === 0) {
      return 0;
    }
    let sum = 0;
    for (let i = 0; i < audio.length; i++) {
      const sample = audio[i] / 32768;
      sum += sample * sample;
    }
    return Math.sqrt(sum / audio.length);
  }

  private toModelInput(audio: Int16Array): Float32Array {
    const target = this.config.modelFrameSamples;
    const normalized = new Float32Array(target);
    const copyLength = Math.min(audio.length, target);

    // Assumption: this Silero graph is stateful with [1, N] audio input and performs
    // best at 16 kHz windows around 512 samples. Recorder frames are 480 samples,
    // so we zero-pad to 512 to preserve timing while keeping deterministic framing.
    for (let i = 0; i < copyLength; i++) {
      normalized[i] = audio[i] / 32768;
    }

    return normalized;
  }

  private inferSpeechProb(frame: DenoiseFrame): { speechProb: number; reason: string } {
    if (!this.ready || !this.session || !this.ort) {
      return {
        speechProb: 0,
        reason: this.loadError ? `silero_model_unavailable:${this.loadError}` : "silero_model_not_ready",
      };
    }

    try {
      const input = new this.ort.Tensor("float32", this.toModelInput(frame.pcm16), [1, this.config.modelFrameSamples]);
      const state = new this.ort.Tensor("float32", this.stateTensorData, [2, 1, 128]);
      const sr = new this.ort.Tensor("int64", this.srTensorData, []);

      const outputs = this.session.run(
        { input, state, sr },
        { output: null, stateN: null },
        {},
      );

      const output = outputs.output;
      const stateN = outputs.stateN;

      const rawProb = output?.data && output.data.length > 0 ? Number(output.data[0]) : 0;
      const nextState = stateN?.data as Float32Array | undefined;
      if (nextState && nextState.length === this.stateTensorData.length) {
        this.stateTensorData.set(nextState);
      } else {
        this.stateTensorData.fill(0);
      }

      return {
        speechProb: clamp01(rawProb),
        reason: `silero_model_score:${clamp01(rawProb).toFixed(4)}`,
      };
    } catch (error) {
      this.stateTensorData.fill(0);
      const message = error instanceof Error ? error.message : String(error);
      return {
        speechProb: 0,
        reason: `silero_inference_error:${message}`,
      };
    }
  }

  process(frame: DenoiseFrame): VadDecision {
    const volume = this.rms(frame.pcm16);

    if (!this.speaking) {
      this.noiseFloor = this.noiseFloor * 0.96 + volume * 0.04;
    }

    const { speechProb, reason } = this.inferSpeechProb(frame);

    if (speechProb >= this.config.speechProbThreshold) {
      this.consecutiveSpeech += 1;
      this.consecutiveSilence = 0;
      if (this.consecutiveSpeech >= this.config.consecutiveFramesForSpeaking) {
        this.speaking = true;
      }
    } else if (speechProb <= this.config.silenceProbThreshold) {
      this.consecutiveSpeech = 0;
      this.consecutiveSilence += 1;
      if (this.consecutiveSilence >= this.config.silenceFramesToEnd) {
        this.speaking = false;
      }
    } else {
      this.consecutiveSpeech = 0;
      this.consecutiveSilence = 0;
    }

    return {
      isSpeech: this.speaking,
      speechProb,
      volume,
      noiseFloor: this.noiseFloor,
      timestampMs: frame.timestampMs,
      frameIndex: frame.frameIndex,
      consecutiveSpeech: this.consecutiveSpeech,
      consecutiveSilence: this.consecutiveSilence,
      provider: this.name(),
      source: "shadow",
      reason,
    };
  }

  reset(): void {
    this.noiseFloor = 0.002;
    this.consecutiveSpeech = 0;
    this.consecutiveSilence = 0;
    this.speaking = false;
    this.stateTensorData.fill(0);
  }

  name(): string {
    return "SileroVadProvider";
  }

  isReady(): boolean {
    return this.ready;
  }

  getConfig(): VadConfig {
    return {
      baseSilenceThreshold: this.config.baseSilenceThreshold,
      baseSpeechThreshold: this.config.baseSpeechThreshold,
      silenceFramesToEnd: this.config.silenceFramesToEnd,
      consecutiveFramesForSpeaking: this.config.consecutiveFramesForSpeaking,
    };
  }
}
