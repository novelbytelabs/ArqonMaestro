/**
 * Denoise Provider Interface
 * 
 * Wave A: Provider boundary for audio denoising.
 * Default implementation is NoopDenoiseProvider which preserves current behavior.
 */

/**
 * Audio frame with metadata for denoising processing
 */
export interface DenoiseFrame {
  pcm16: Int16Array;
  sampleRate: number;
  channels: number;
  frameIndex: number;
  timestampMs: number;
  streamTimeMs: number;
}

/**
 * Result of denoising processing
 */
export interface DenoiseResult {
  frame: DenoiseFrame;
  processingTimeMs: number;
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
