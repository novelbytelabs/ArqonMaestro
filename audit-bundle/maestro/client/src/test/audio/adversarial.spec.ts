/**
 * Adversarial Tests for Wave A Patch 1+2
 * 
 * Test categories: Adversarial
 * Purpose: Deliberately hostile inputs to break the pipeline
 */

import { NoopDenoiseProvider, DefaultVadProvider } from "../../main/audio/index";
import { DenoiseFrame } from "../../main/audio/denoise-provider";

describe("Adversarial: NoopDenoiseProvider", () => {
  let provider: NoopDenoiseProvider;

  beforeEach(() => {
    provider = new NoopDenoiseProvider();
  });

  describe("Very long silence", () => {
    it("should handle 1000 consecutive silent frames", () => {
      const silentFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(0),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      for (let i = 0; i < 1000; i++) {
        silentFrame.frameIndex = i;
        silentFrame.timestampMs = i * 30;
        silentFrame.streamTimeMs = i * 30;

        expect(() => {
          provider.process(silentFrame);
        }).not.toThrow();
      }

      expect(provider.isReady()).toBe(true);
    });
  });

  describe("Repeated zero-length input", () => {
    it("should handle zero-length PCM repeated 100 times", () => {
      for (let i = 0; i < 100; i++) {
        const emptyFrame: DenoiseFrame = {
          pcm16: new Int16Array(0),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i,
          timestampMs: i * 30,
          streamTimeMs: i * 30,
        };

        expect(() => {
          provider.process(emptyFrame);
        }).not.toThrow();
      }
    });
  });

  describe("Malformed/truncated chunk", () => {
    it("should handle non-standard frame size", () => {
      const oddSizedFrame: DenoiseFrame = {
        pcm16: new Int16Array(123), // Not divisible by 480
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      expect(() => {
        provider.process(oddSizedFrame);
      }).not.toThrow();
    });

    it("should handle single sample frame", () => {
      const singleSample: DenoiseFrame = {
        pcm16: new Int16Array(1),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      expect(() => {
        provider.process(singleSample);
      }).not.toThrow();
    });
  });

  describe("Oscillating near threshold", () => {
    it("should handle rapid threshold oscillation", () => {
      for (let i = 0; i < 100; i++) {
        const nearThreshold = Math.random() * 10 + 200; // Random near threshold

        const frame: DenoiseFrame = {
          pcm16: new Int16Array(480).fill(Math.floor(nearThreshold)),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i,
          timestampMs: i * 30,
          streamTimeMs: i * 30,
        };

        expect(() => {
          provider.process(frame);
        }).not.toThrow();
      }
    });
  });

  describe("Rapid speech/silence alternation", () => {
    it("should handle alternating loud/quiet every frame", () => {
      for (let i = 0; i < 200; i++) {
        const frame: DenoiseFrame = {
          pcm16: new Int16Array(480).fill(i % 2 === 0 ? 8000 : 10),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i,
          timestampMs: i * 30,
          streamTimeMs: i * 30,
        };

        expect(() => {
          provider.process(frame);
        }).not.toThrow();
      }
    });
  });

  describe("Clipped samples", () => {
    it("should handle max amplitude samples", () => {
      const clippedFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(32767), // Max Int16
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      expect(() => {
        provider.process(clippedFrame);
      }).not.toThrow();
    });

    it("should handle negative clipping", () => {
      const clippedFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(-32768), // Min Int16
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      expect(() => {
        provider.process(clippedFrame);
      }).not.toThrow();
    });
  });

  describe("Burst noise", () => {
    it("should handle random noise burst", () => {
      for (let burst = 0; burst < 10; burst++) {
        const noiseFrame: DenoiseFrame = {
          pcm16: new Int16Array(480).map(() => Math.floor(Math.random() * 65536 - 32768)),
          sampleRate: 16000,
          channels: 1,
          frameIndex: burst,
          timestampMs: burst * 30,
          streamTimeMs: burst * 30,
        };

        expect(() => {
          provider.process(noiseFrame);
        }).not.toThrow();
      }
    });
  });

  describe("Sustained background noise", () => {
    it("should handle constant background noise", () => {
      const noiseFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(200), // Constant background
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      for (let i = 0; i < 500; i++) {
        noiseFrame.frameIndex = i;
        noiseFrame.timestampMs = i * 30;
        noiseFrame.streamTimeMs = i * 30;

        expect(() => {
          provider.process(noiseFrame);
        }).not.toThrow();
      }
    });
  });

  describe("Duplicate frame injection", () => {
    it("should handle duplicate frameIndex", () => {
      const frame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(1000),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 42, // Same index repeated
        timestampMs: 1000,
        streamTimeMs: 1000,
      };

      // Process same frame multiple times
      expect(() => {
        provider.process(frame);
        provider.process(frame);
        provider.process(frame);
      }).not.toThrow();
    });
  });
});

describe("Adversarial: DefaultVadProvider", () => {
  let provider: DefaultVadProvider;

  beforeEach(() => {
    provider = new DefaultVadProvider();
  });

  describe("No crash under stress", () => {
    it("should not crash with 10000 rapid frames", () => {
      for (let i = 0; i < 10000; i++) {
        const frame: DenoiseFrame = {
          pcm16: new Int16Array(480).fill(Math.floor(Math.random() * 10000)),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i,
          timestampMs: i * 30,
          streamTimeMs: i * 30,
        };

        expect(() => {
          provider.process(frame);
        }).not.toThrow();
      }
    });

    it("should not crash with NaN input", () => {
      const nanFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(NaN as any),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      expect(() => {
        provider.process(nanFrame);
      }).not.toThrow();
    });

    it("should not crash with Infinity input", () => {
      const infFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(Infinity as any),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 0,
        streamTimeMs: 0,
      };

      expect(() => {
        provider.process(infFrame);
      }).not.toThrow();
    });
  });

  describe("Metadata corruption prevention", () => {
    it("should preserve frameIndex despite chaotic input", () => {
      for (let i = 0; i < 100; i++) {
        const frame: DenoiseFrame = {
          pcm16: new Int16Array(480).fill(Math.floor(Math.random() * 65536 - 32768)),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i,
          timestampMs: i * 30,
          streamTimeMs: i * 30,
        };

        const result = provider.process(frame);
        expect(result.frameIndex).toBe(i);
      }
    });

    it("should preserve timestampMs monotonicity", () => {
      let lastTimestamp = 0;
      for (let i = 0; i < 1000; i++) {
        const frame: DenoiseFrame = {
          pcm16: new Int16Array(480),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i,
          timestampMs: i * 30, // Intentionally monotonic
          streamTimeMs: i * 30,
        };

        const result = provider.process(frame);
        expect(result.timestampMs).toBeGreaterThanOrEqual(lastTimestamp);
        lastTimestamp = result.timestampMs;
      }
    });
  });

  describe("Illegal state transition prevention", () => {
    it("should handle rapid on/off switching", () => {
      for (let i = 0; i < 50; i++) {
        // Alternating loud then silent
        const loudFrame: DenoiseFrame = {
          pcm16: new Int16Array(480).fill(8000),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i * 2,
          timestampMs: i * 60,
          streamTimeMs: i * 60,
        };

        const silentFrame: DenoiseFrame = {
          pcm16: new Int16Array(480).fill(10),
          sampleRate: 16000,
          channels: 1,
          frameIndex: i * 2 + 1,
          timestampMs: i * 60 + 30,
          streamTimeMs: i * 60 + 30,
        };

        provider.process(loudFrame);
        provider.process(silentFrame);
      }

      // Provider should still be functional
      const finalFrame: DenoiseFrame = {
        pcm16: new Int16Array(480).fill(1000),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 999,
        timestampMs: 29970,
        streamTimeMs: 29970,
      };

      expect(() => {
        provider.process(finalFrame);
      }).not.toThrow();
    });
  });
});
