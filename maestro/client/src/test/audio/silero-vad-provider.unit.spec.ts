import path from "path";

import { DenoiseFrame } from "../../main/audio/denoise-provider";
import { SileroVadProvider } from "../../main/audio/silero-vad-provider";

function createFrame(amplitude: number, frameIndex: number): DenoiseFrame {
  return {
    pcm16: new Int16Array(480).fill(amplitude),
    sampleRate: 16000,
    channels: 1,
    frameIndex,
    captureStartWallClockMs: 1_700_000_000_000,
    timestampMs: 1_700_000_000_000 + frameIndex * 30,
    streamTimeMs: frameIndex * 30,
  };
}

describe("SileroVadProvider (real ONNX)", () => {
  it("initializes provider and exposes config", () => {
    const provider = new SileroVadProvider();
    expect(typeof provider.isReady()).toBe("boolean");
    expect(provider.name()).toBe("SileroVadProvider");
    expect(provider.getConfig().silenceFramesToEnd).toBe(10);
  });

  it("returns model-backed shadow decisions with real score reasons", () => {
    const provider = new SileroVadProvider();
    const decision = provider.process(createFrame(0, 0));

    expect(decision.source).toBe("shadow");
    expect(decision.provider).toBe("SileroVadProvider");
    expect(decision.speechProb).toBeGreaterThanOrEqual(0);
    expect(decision.speechProb).toBeLessThanOrEqual(1);
    expect(
      decision.reason?.startsWith("silero_model_score:") ||
        decision.reason?.startsWith("silero_inference_error:") ||
        decision.reason?.startsWith("silero_model_unavailable:"),
    ).toBe(true);
  });

  it("persists recurrent state across frames and reset restores deterministic start", () => {
    const provider = new SileroVadProvider();

    const first = provider.process(createFrame(0, 0));
    const second = provider.process(createFrame(0, 1));
    expect(second.speechProb).not.toBeNaN();

    provider.reset();
    const afterReset = provider.process(createFrame(0, 0));

    expect(afterReset.frameIndex).toBe(0);
    expect(afterReset.consecutiveSpeech).toBe(0);
    expect(afterReset.consecutiveSilence).toBe(1);
    expect(afterReset.speechProb).toBeCloseTo(first.speechProb, 6);
  });

  it("reports model unavailability explicitly when model path is invalid", () => {
    const provider = new SileroVadProvider({
      modelPath: path.resolve(__dirname, "./fixtures/missing-silero-model.onnx"),
    });

    expect(provider.isReady()).toBe(false);

    const decision = provider.process(createFrame(0, 0));
    expect(decision.speechProb).toBe(0);
    expect(decision.reason?.startsWith("silero_model_unavailable:")).toBe(true);
  });
});
