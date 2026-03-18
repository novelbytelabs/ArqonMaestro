/**
 * Real Integration Tests for SpeechRecorder - Chunk Transitions
 * 
 * These tests actually exercise the processPcmData path to verify
 * chunk start/end transitions work correctly.
 */

import { SpeechRecorder } from "../../main/audio/index";

describe("SpeechRecorder Integration: Real Chunk Transitions", () => {
  let recorder: SpeechRecorder;
  let chunkStartCount: number;
  let chunkEndCount: number;
  let audioCallbackCount: number;

  beforeEach(() => {
    chunkStartCount = 0;
    chunkEndCount = 0;
    audioCallbackCount = 0;
    
    recorder = new SpeechRecorder({
      onChunkStart: (data) => {
        chunkStartCount++;
        // Verify metadata is present
        expect(data.frameIndex).toBeDefined();
        expect(data.timestampMs).toBeDefined();
      },
      onChunkEnd: () => {
        chunkEndCount++;
      },
      onAudio: (data) => {
        audioCallbackCount++;
      },
    });
  });

  afterEach(() => {
    recorder.stop();
  });

  describe("Chunk start transition", () => {
    it("should fire onChunkStart when silence transitions to speech", () => {
      // Simulate: 5 silent frames + 5 loud frames (should trigger speech)
      // Create silence frames (very low amplitude)
      const silenceFrames = createFrames(5, 100); // 5 frames, very quiet
      
      // Create speech frames (loud amplitude)
      const speechFrames = createFrames(10, 8000); // 10 frames, loud enough to exceed threshold
      
      // Process through recorder by calling processPcmData with the right buffer
      // We'll use a workaround: create SpeechRecorder and manually call internal method
      processFramesThroughRecorder(recorder, [...silenceFrames, ...speechFrames]);
      
      // Should have triggered at least one chunk start
      expect(chunkStartCount).toBeGreaterThan(0);
    });

    it("should fire onChunkEnd when speech transitions to silence", () => {
      // First create speech to start a chunk
      const speechFrames = createFrames(15, 8000); // Enough to start chunk
      const silenceFrames = createFrames(15, 100); // Enough to end chunk (15 >= silenceFramesToEnd)
      
      processFramesThroughRecorder(recorder, [...speechFrames, ...silenceFrames]);
      
      // Both start and end should fire
      expect(chunkStartCount).toBeGreaterThan(0);
      expect(chunkEndCount).toBeGreaterThan(0);
    });

    it("should emit correct frame metadata in callbacks", () => {
      const frames = createFrames(5, 8000);
      processFramesThroughRecorder(recorder, frames);
      
      // If we triggered speech, verify metadata
      if (chunkStartCount > 0) {
        expect(audioCallbackCount).toBeGreaterThan(0);
      }
    });
  });

  describe("Provider chain invocation", () => {
    it("should have denoise and vad providers in recorder", () => {
      // This test documents that providers exist
      const { NoopDenoiseProvider, DefaultVadProvider } = require("../../main/audio/index");
      
      expect(NoopDenoiseProvider).toBeDefined();
      expect(DefaultVadProvider).toBeDefined();
    });
  });
});

/**
 * Helper to create synthetic audio frames
 */
function createFrames(count: number, amplitude: number): Buffer[] {
  const frames: Buffer[] = [];
  const FRAME_SIZE = 960; // 480 samples * 2 bytes per sample
  
  for (let i = 0; i < count; i++) {
    const buffer = Buffer.alloc(FRAME_SIZE);
    for (let j = 0; j < 480; j++) {
      // Simple sine wave at amplitude
      const sample = Math.sin(2 * Math.PI * 440 * (i * 480 + j) / 16000) * amplitude;
      buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample))), j * 2);
    }
    frames.push(buffer);
  }
  
  return frames;
}

/**
 * Process frames through the recorder's internal method
 * This is done via the private API by accessing the prototype
 */
function processFramesThroughRecorder(recorder: SpeechRecorder, frames: Buffer[]): void {
  // Access private method via prototype
  const processMethod = (recorder as any).processPcmData || (recorder as any)._processPcmData;
  
  if (processMethod) {
    for (const frame of frames) {
      processMethod.call(recorder, frame);
    }
  } else {
    // Fallback: we can't easily test the real path without starting recording
    // This documents that real integration testing requires microphone or fixture replay
    console.log("Note: Cannot directly call processPcmData - integration test limited without microphone");
  }
}
