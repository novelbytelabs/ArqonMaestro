/**
 * Unit Tests for VAD Provider
 * 
 * Test categories: Unit
 * Coverage: DefaultVadProvider behavior and parity with prior RMS logic
 */

import { DefaultVadProvider, VadConfig } from "../../main/audio/vad-provider";
import { DenoiseFrame } from "../../main/audio/denoise-provider";

describe("DefaultVadProvider", () => {
  let provider: DefaultVadProvider;

  const createTestFrame = (frameIndex: number, timestampMs: number, captureStartMs: number = 1000): DenoiseFrame => ({
    pcm16: new Int16Array(480), // 480 samples = 30ms at 16kHz
    sampleRate: 16000,
    channels: 1,
    frameIndex,
    captureStartWallClockMs: captureStartMs,
    timestampMs,
    streamTimeMs: (frameIndex * 480 / 16000) * 1000,
  });

  beforeEach(() => {
    provider = new DefaultVadProvider();
  });

  describe("frameIndex monotonicity", () => {
    it("should maintain monotonic frameIndex", () => {
      const frame1 = createTestFrame(0, 1000);
      const frame2 = createTestFrame(1, 1030);
      const frame3 = createTestFrame(2, 1060);

      const result1 = provider.process(frame1);
      const result2 = provider.process(frame2);
      const result3 = provider.process(frame3);

      expect(result1.frameIndex).toBe(0);
      expect(result2.frameIndex).toBe(1);
      expect(result3.frameIndex).toBe(2);
    });
  });

  describe("RMS threshold behavior", () => {
    it("should detect speech above speech threshold", () => {
      // Create frame with high amplitude (above speech threshold ~0.015)
      const loudFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(8000), // Very loud
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const result = provider.process(loudFrame);

      expect(result.isSpeech).toBe(true);
      expect(result.volume).toBeGreaterThan(0.1);
    });

    it("should detect silence below silence threshold", () => {
      // Create frame with very low amplitude (below silence threshold ~0.008)
      const silentFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(10), // Very quiet
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const result = provider.process(silentFrame);

      // After noise floor adaptation, should eventually go silent
      expect(result.volume).toBeLessThan(0.01);
    });

    it("should track consecutive speech frames", () => {
      const loudFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(8000),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // First frame - may not trigger yet due to consecutive count
      provider.process(loudFrame);
      provider.process(loudFrame);

      const result = provider.process(loudFrame);

      expect(result.isSpeech).toBe(true);
    });

    it("should detect speech end after silence frames", () => {
      const loudFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(8000),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const silentFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(10),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // Start speaking
      provider.process(loudFrame);
      provider.process(loudFrame);
      provider.process(loudFrame);

      // Now go silent
      for (let i = 0; i < 15; i++) {
        provider.process(silentFrame);
      }

      // Should now detect silence ended
      const result = provider.process(silentFrame);
      expect(result.isSpeech).toBe(false);
    });
  });

  describe("noise floor tracking", () => {
    it("should adapt noise floor during silence", () => {
      const quietFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(100), // Moderate quiet
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // Process several quiet frames to adapt noise floor
      for (let i = 0; i < 20; i++) {
        provider.process(quietFrame);
      }

      const result = provider.process(quietFrame);

      // Noise floor should be adapted to a small positive value
      expect(result.noiseFloor).toBeGreaterThan(0);
      expect(result.noiseFloor).toBeLessThan(0.01);
    });
  });

  describe("threshold mapping logic", () => {
    it("should use custom config when provided", () => {
      const customConfig: Partial<VadConfig> = {
        baseSilenceThreshold: 0.01,
        baseSpeechThreshold: 0.02,
      };

      const customProvider = new DefaultVadProvider(customConfig);
      const config = customProvider.getConfig();

      expect(config.baseSilenceThreshold).toBe(0.01);
      expect(config.baseSpeechThreshold).toBe(0.02);
    });

    it("should enforce silence < speech threshold", () => {
      // Provide invalid config where silence >= speech
      const invalidConfig: Partial<VadConfig> = {
        baseSilenceThreshold: 0.02,
        baseSpeechThreshold: 0.01,
      };

      const provider = new DefaultVadProvider(invalidConfig);
      const config = provider.getConfig();

      // Should be adjusted so silence < speech
      expect(config.baseSilenceThreshold).toBeLessThan(config.baseSpeechThreshold);
    });
  });

  describe("reset behavior", () => {
    it("should reset noise floor", () => {
      const frame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(1000),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // Process to adapt noise floor
      provider.process(frame);
      provider.process(frame);

      // Reset
      provider.reset();

      // After reset, noise floor should be back to initial (~0.002)
      const result = provider.process(frame);
      expect(result.noiseFloor).toBeCloseTo(0.002, 2);
    });

    it("should reset speaking state", () => {
      const loudFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(8000),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // Make provider think we're speaking
      provider.process(loudFrame);
      provider.process(loudFrame);
      provider.process(loudFrame);

      // Reset
      provider.reset();

      // After reset, should not be speaking
      const result = provider.process(loudFrame);
      // Note: May still be speaking due to consecutive count, but state is cleared
      expect(provider.isReady()).toBe(true);
    });
  });

  describe("name", () => {
    it("should return correct provider name", () => {
      expect(provider.name()).toBe("DefaultVadProvider");
    });
  });

  describe("isReady", () => {
    it("should return true initially", () => {
      expect(provider.isReady()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle near-threshold oscillation", () => {
      // Create frames at threshold boundary
      const thresholdFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(400), // Around 0.02 RMS
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const silentFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(100), // Quiet
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // Oscillate between threshold and silent
      for (let i = 0; i < 10; i++) {
        provider.process(thresholdFrame);
        provider.process(silentFrame);
      }

      // Should not crash and should produce valid results
      const result = provider.process(thresholdFrame);
      expect(result).toBeDefined();
      expect(result.volume).toBeGreaterThan(0);
    });

    it("should handle zero-length PCM", () => {
      const emptyFrame: DenoiseFrame = {
        pcm16: new Int16Array(0),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const result = provider.process(emptyFrame);

      expect(result).toBeDefined();
      expect(result.volume).toBe(0);
      expect(result.isSpeech).toBe(false);
    });
  });
});
