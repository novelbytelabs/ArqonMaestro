/**
 * Silero VAD shadow provider for Patch 3.
 *
 * This provider is wired as a real runtime participant in shadow mode.
 * It uses a deterministic Silero-oriented speech score (energy + peak + ZCR)
 * that is model-ready and contract-compatible with later native/ONNX backends.
 */

import { DenoiseFrame } from "./denoise-provider";
import { VadConfig, VadDecision, VadProvider } from "./vad-provider";

export interface SileroVadConfig extends VadConfig {
  speechProbThreshold: number;
  silenceProbThreshold: number;
  smoothing: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class SileroVadProvider implements VadProvider {
  private config: SileroVadConfig;
  private noiseFloor = 0.002;
  private consecutiveSpeech = 0;
  private consecutiveSilence = 0;
  private speaking = false;
  private smoothedProb = 0;
  private ready = false;

  constructor(config?: Partial<SileroVadConfig>) {
    this.config = {
      baseSilenceThreshold: config?.baseSilenceThreshold ?? 0.008,
      baseSpeechThreshold: config?.baseSpeechThreshold ?? 0.015,
      silenceFramesToEnd: config?.silenceFramesToEnd ?? 10,
      consecutiveFramesForSpeaking: config?.consecutiveFramesForSpeaking ?? 1,
      speechProbThreshold: config?.speechProbThreshold ?? 0.55,
      silenceProbThreshold: config?.silenceProbThreshold ?? 0.35,
      smoothing: config?.smoothing ?? 0.35,
    };
    this.ready = true;
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

  private peak(audio: Int16Array): number {
    let peak = 0;
    for (let i = 0; i < audio.length; i++) {
      const value = Math.abs(audio[i] / 32768);
      if (value > peak) {
        peak = value;
      }
    }
    return peak;
  }

  private zeroCrossingRate(audio: Int16Array): number {
    if (audio.length < 2) {
      return 0;
    }

    let crossings = 0;
    for (let i = 1; i < audio.length; i++) {
      const previous = audio[i - 1];
      const current = audio[i];
      if ((previous < 0 && current >= 0) || (previous >= 0 && current < 0)) {
        crossings += 1;
      }
    }
    return crossings / (audio.length - 1);
  }

  private estimateSpeechProb(frame: DenoiseFrame): number {
    const volume = this.rms(frame.pcm16);
    const peak = this.peak(frame.pcm16);
    const zcr = this.zeroCrossingRate(frame.pcm16);

    if (!this.speaking) {
      this.noiseFloor = this.noiseFloor * 0.96 + volume * 0.04;
    }

    const dynamicSilence = Math.max(this.config.baseSilenceThreshold, this.noiseFloor * 1.7);
    const dynamicSpeech = Math.max(this.config.baseSpeechThreshold, dynamicSilence * 1.35);
    const energyComponent = clamp01((volume - dynamicSilence) / Math.max(dynamicSpeech - dynamicSilence, 1e-6));
    const peakComponent = clamp01((peak - dynamicSilence) / Math.max(dynamicSpeech - dynamicSilence, 1e-6));
    const zcrPenalty = clamp01((zcr - 0.05) / 0.45);

    const instantProb = clamp01(energyComponent * 0.65 + peakComponent * 0.3 - zcrPenalty * 0.15);
    this.smoothedProb =
      this.smoothedProb * (1 - this.config.smoothing) + instantProb * this.config.smoothing;
    return clamp01(this.smoothedProb);
  }

  process(frame: DenoiseFrame): VadDecision {
    const volume = this.rms(frame.pcm16);
    const speechProb = this.estimateSpeechProb(frame);

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
      reason: this.speaking ? "silero_shadow_prob_high" : "silero_shadow_prob_low",
    };
  }

  reset(): void {
    this.noiseFloor = 0.002;
    this.consecutiveSpeech = 0;
    this.consecutiveSilence = 0;
    this.speaking = false;
    this.smoothedProb = 0;
    this.ready = true;
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
