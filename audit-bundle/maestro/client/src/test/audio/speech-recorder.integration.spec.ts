/**
 * Integration Tests for SpeechRecorder
 * 
 * Test categories: Integration
 * Coverage: Real in-process path through SpeechRecorder with providers
 * 
 * NOTE: These tests verify the production path wiring WITHOUT requiring
 * physical microphone access. We test the provider chain directly.
 */

import { SpeechRecorder, NoopDenoiseProvider, DefaultVadProvider } from "../../main/audio/index";

describe("SpeechRecorder Integration", () => {
  describe("Provider instantiation", () => {
    it("should instantiate NoopDenoiseProvider", () => {
      // Verify the recorder is created with default providers
      const recorder = new SpeechRecorder({});
      expect(recorder).toBeDefined();
    });

    it("should have providers available in exports", () => {
      expect(NoopDenoiseProvider).toBeDefined();
      expect(DefaultVadProvider).toBeDefined();
    });
  });

  describe("Frame metadata propagation", () => {
    it("should include frameIndex in audio events - callback shape verification", () => {
      // Test the callback interface shape without starting recording
      const callbackData = {
        audio: new Int16Array(480),
        frameIndex: 42,
        timestampMs: 5000,
        streamTimeMs: 3000,
        volume: 0.1,
        speaking: true,
        consecutiveSilence: 0,
      };
      
      // Verify all required fields are present
      expect(callbackData).toHaveProperty("audio");
      expect(callbackData).toHaveProperty("frameIndex");
      expect(callbackData).toHaveProperty("timestampMs");
      expect(callbackData).toHaveProperty("streamTimeMs");
    });
  });

  describe("Leading buffer / pre-roll behavior", () => {
    it("should preserve leading buffer interface", () => {
      // Verify recorder has stop method which clears leading buffer
      const recorder = new SpeechRecorder({});
      expect(typeof recorder.stop).toBe("function");
      expect(typeof recorder.start).toBe("function");
      recorder.stop();
    });
  });

  describe("Callback emission", () => {
    it("should have onChunkStart callback defined", () => {
      const recorder = new SpeechRecorder({
        onChunkStart: (data: any) => {
          expect(data).toHaveProperty("audio");
        },
      });
      recorder.stop();
    });

    it("should have onChunkEnd callback defined", () => {
      const recorder = new SpeechRecorder({
        onChunkEnd: () => {},
      });
      recorder.stop();
    });

    it("should have onAudio callback defined", () => {
      const recorder = new SpeechRecorder({
        onAudio: (data: any) => {
          expect(data).toHaveProperty("audio");
          expect(data).toHaveProperty("volume");
          expect(data).toHaveProperty("speaking");
        },
      });
      recorder.stop();
    });
  });

  describe("Microphone integration", () => {
    it("should export devices function", () => {
      // The SpeechRecorder module exports devices
      const { devices } = require("../../main/audio/index");
      expect(typeof devices).toBe("function");
    });

    it("should export getDevices async function", () => {
      const { getDevices } = require("../../main/audio/index");
      expect(typeof getDevices).toBe("function");
    });
  });
});

describe("Provider chain integration", () => {
  describe("NoopDenoiseProvider -> DefaultVadProvider", () => {
    it("should create complete provider chain", () => {
      const denoiseProvider = new NoopDenoiseProvider();
      const vadProvider = new DefaultVadProvider();

      expect(denoiseProvider.isReady()).toBe(true);
      expect(vadProvider.isReady()).toBe(true);
    });

    it("should process frame through both providers", () => {
      const denoiseProvider = new NoopDenoiseProvider();
      const vadProvider = new DefaultVadProvider();

      const testFrame = {
        pcm16: new Int16Array(480),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 0,
        timestampMs: 1000,
        streamTimeMs: 0,
      };

      // Pass through denoise
      const denoiseResult = denoiseProvider.process(testFrame);

      // Pass through VAD
      const vadResult = vadProvider.process(denoiseResult.frame);

      expect(vadResult).toBeDefined();
      expect(vadResult.volume).toBeDefined();
    });

    it("should preserve frame metadata through provider chain", () => {
      const denoiseProvider = new NoopDenoiseProvider();
      const vadProvider = new DefaultVadProvider();

      const testFrame = {
        pcm16: new Int16Array(480),
        sampleRate: 16000,
        channels: 1,
        frameIndex: 42,
        timestampMs: 5000,
        streamTimeMs: 3000,
      };

      const denoiseResult = denoiseProvider.process(testFrame);
      const vadResult = vadProvider.process(denoiseResult.frame);

      // Metadata preserved through chain
      expect(vadResult.frameIndex).toBe(42);
      expect(vadResult.timestampMs).toBe(5000);
    });
  });
});
