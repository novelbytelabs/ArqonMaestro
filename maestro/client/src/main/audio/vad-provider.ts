/**
 * VAD (Voice Activity Detection) Provider Interface
 * 
 * Wave A: Provider boundary for VAD/turn detection.
 * Default implementation wraps the existing custom RMS-based VAD logic.
 */

import { DenoiseFrame } from "./denoise-provider";

/**
 * VAD decision result
 */
export interface VadDecision {
  /** Whether speech is detected */
  isSpeech: boolean;
  /** Speech probability (0-1) */
  speechProb: number;
  /** Volume/RMS of the frame */
  volume: number;
  /** Current noise floor estimate */
  noiseFloor: number;
  /** Timestamp of the decision */
  timestampMs: number;
  /** Frame index */
  frameIndex: number;
  /** Consecutive speech frames count */
  consecutiveSpeech: number;
  /** Consecutive silence frames count */
  consecutiveSilence: number;
  /** Provider identifier */
  provider: string;
  /** Provider lane (primary or shadow) */
  source: "primary" | "shadow";
  /** Optional decision reason for telemetry and testing */
  reason?: string;
}

/**
 * VAD configuration
 */
export interface VadConfig {
  baseSilenceThreshold: number;
  baseSpeechThreshold: number;
  silenceFramesToEnd: number;
  consecutiveFramesForSpeaking: number;
}

/**
 * Base interface for VAD providers
 */
export interface VadProvider {
  /**
   * Process a frame and return VAD decision
   */
  process(frame: DenoiseFrame): VadDecision;

  /**
   * Reset VAD state for new recording session
   */
  reset(): void;

  /**
   * Provider name for debugging/logging
   */
  name(): string;

  /**
   * Check if provider is ready
   */
  isReady(): boolean;

  /**
   * Get current VAD configuration
   */
  getConfig(): VadConfig;
}

/**
 * Default VAD provider that wraps the existing custom RMS-based VAD logic.
 * This preserves the current behavior while establishing the provider interface.
 */
export class DefaultVadProvider implements VadProvider {
  private config: VadConfig;
  private noiseFloor = 0.002;
  private consecutiveSpeech = 0;
  private consecutiveSilence = 0;
  private speaking = false;
  private ready = false;

  constructor(config?: Partial<VadConfig>) {
    this.config = {
      baseSilenceThreshold: config?.baseSilenceThreshold ?? 0.008,
      baseSpeechThreshold: config?.baseSpeechThreshold ?? 0.015,
      silenceFramesToEnd: config?.silenceFramesToEnd ?? 10,
      consecutiveFramesForSpeaking: config?.consecutiveFramesForSpeaking ?? 1,
    };
    
    // Ensure silence threshold is less than speech threshold
    if (this.config.baseSilenceThreshold >= this.config.baseSpeechThreshold) {
      this.config.baseSilenceThreshold = Math.max(
        0.001, 
        this.config.baseSpeechThreshold * 0.7
      );
    }
    
    this.ready = true;
  }

  /**
   * Calculate RMS of audio frame
   */
  private calculateRms(audio: Int16Array): number {
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

  /**
   * Calculate effective thresholds based on noise floor
   */
  private effectiveSilenceThreshold(): number {
    return Math.max(this.config.baseSilenceThreshold, this.noiseFloor * 1.8);
  }

  private effectiveSpeechThreshold(): number {
    return Math.max(
      this.config.baseSpeechThreshold,
      this.effectiveSilenceThreshold() * 1.5,
      this.noiseFloor * 3
    );
  }

  process(frame: DenoiseFrame): VadDecision {
    const volume = this.calculateRms(frame.pcm16);
    const silenceThreshold = this.effectiveSilenceThreshold();
    const speechThreshold = this.effectiveSpeechThreshold();
    
    // Update noise floor when not speaking
    if (!this.speaking) {
      this.noiseFloor = this.noiseFloor * 0.95 + volume * 0.05;
    }

    // VAD decision logic - matches existing behavior
    if (volume >= speechThreshold) {
      this.consecutiveSpeech += 1;
      this.consecutiveSilence = 0;
      if (this.consecutiveSpeech >= this.config.consecutiveFramesForSpeaking) {
        this.speaking = true;
      }
    } else if (volume <= silenceThreshold) {
      this.consecutiveSpeech = 0;
      this.consecutiveSilence += 1;
      if (this.consecutiveSilence >= this.config.silenceFramesToEnd) {
        this.speaking = false;
      }
    } else {
      this.consecutiveSpeech = 0;
      this.consecutiveSilence = 0;
    }

    // Calculate speech probability based on volume relative to thresholds
    let speechProb = 0;
    if (volume >= speechThreshold) {
      speechProb = 1.0;
    } else if (volume > silenceThreshold) {
      // Linear interpolation between silence and speech thresholds
      speechProb = (volume - silenceThreshold) / (speechThreshold - silenceThreshold);
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
      source: "primary",
      reason: this.speaking ? "rms_above_speech_threshold" : "rms_below_silence_threshold",
    };
  }

  reset(): void {
    this.noiseFloor = 0.002;
    this.consecutiveSpeech = 0;
    this.consecutiveSilence = 0;
    this.speaking = false;
    this.ready = true;
  }

  name(): string {
    return "DefaultVadProvider";
  }

  isReady(): boolean {
    return this.ready;
  }

  getConfig(): VadConfig {
    return { ...this.config };
  }
}
