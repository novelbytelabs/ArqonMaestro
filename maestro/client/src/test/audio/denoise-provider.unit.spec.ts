/**
 * Unit Tests for Denoise Provider
 * 
 * Test categories: Unit
 * Coverage: NoopDenoiseProvider behavior
 */

import {
  NoopDenoiseProvider,
  DenoiseFrame,
  OnnxDenoiseProvider,
} from "../../main/audio/denoise-provider";

describe("NoopDenoiseProvider", () => {
  let provider: NoopDenoiseProvider;

  beforeEach(() => {
    provider = new NoopDenoiseProvider();
  });

  describe("process", () => {
    it("should return same PCM payload", () => {
      const inputFrame: DenoiseFrame = {
        pcm16: new Int16Array([100, 200, -300, 400]),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const result = provider.process(inputFrame);

      expect(result.frame.pcm16).toEqual(inputFrame.pcm16);
    });

    it("should not mutate input unexpectedly", () => {
      const inputFrame: DenoiseFrame = {
        pcm16: new Int16Array([100, 200, -300, 400]),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };
      const originalValues = new Int16Array(inputFrame.pcm16);

      provider.process(inputFrame);

      expect(inputFrame.pcm16).toEqual(originalValues);
    });

    it("should preserve metadata", () => {
      const inputFrame: DenoiseFrame = {
        pcm16: new Int16Array([100, 200]),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 42,
        captureStartWallClockMs: 2000,
        timestampMs: 5000,
        streamTimeMs: 3000,
      };

      const result = provider.process(inputFrame);

      expect(result.frame.sampleRate).toBe(16000);
      expect(result.frame.channels).toBe(1);
      expect(result.frame.frameIndex).toBe(42);
      expect(result.frame.captureStartWallClockMs).toBe(2000);
      expect(result.frame.timestampMs).toBe(5000);
      expect(result.frame.streamTimeMs).toBe(3000);
    });

    it("should return positive processing time", () => {
      const inputFrame: DenoiseFrame = {
        pcm16: new Int16Array([100, 200]),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      const result = provider.process(inputFrame);

      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("reset", () => {
    it("should set provider to ready state", () => {
      // Process some frames first
      const inputFrame: DenoiseFrame = {
        pcm16: new Int16Array([100]),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };
      provider.process(inputFrame);

      provider.reset();

      expect(provider.isReady()).toBe(true);
    });
  });

  describe("name", () => {
    it("should return correct provider name", () => {
      expect(provider.name()).toBe("NoopDenoiseProvider");
    });
  });

  describe("isReady", () => {
    it("should return true initially", () => {
      expect(provider.isReady()).toBe(true);
    });

    it("should return true after processing", () => {
      const inputFrame: DenoiseFrame = {
        pcm16: new Int16Array([100]),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        captureStartWallClockMs: 1000,
        timestampMs: 1000,
        streamTimeMs: 0,
      };
      provider.process(inputFrame);

      expect(provider.isReady()).toBe(true);
    });
  });
});

describe("OnnxDenoiseProvider", () => {
  function frame(): DenoiseFrame {
    return {
      pcm16: new Int16Array([100, -200, 300, -400]),
      sampleRate: 16000,
      channels: 1,
      frameIndex: 0,
      captureStartWallClockMs: 1000,
      timestampMs: 1000,
      streamTimeMs: 0,
    };
  }

  it("fails safe to passthrough when model path is missing", () => {
    const provider = new OnnxDenoiseProvider({
      modelPath: "/tmp/does-not-exist-denoiser-model.onnx",
    });
    const result = provider.process(frame());

    expect(provider.isReady()).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.provider).toBe("OnnxDenoiseProvider");
    expect(result.frame.pcm16).toEqual(frame().pcm16);
  });

  it("fails safe to passthrough when disabled", () => {
    const provider = new OnnxDenoiseProvider({ enabled: false });
    const result = provider.process(frame());

    expect(provider.isReady()).toBe(false);
    expect(result.fallbackApplied).toBe(true);
    expect(result.reason).toContain("disabled");
  });
});
