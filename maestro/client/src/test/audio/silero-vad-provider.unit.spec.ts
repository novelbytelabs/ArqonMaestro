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

describe("SileroVadProvider", () => {
  it("stays ready and exposes config", () => {
    const provider = new SileroVadProvider();
    expect(provider.isReady()).toBe(true);
    expect(provider.name()).toBe("SileroVadProvider");
    expect(provider.getConfig().silenceFramesToEnd).toBe(10);
  });

  it("marks loud frames as speech in shadow lane", () => {
    const provider = new SileroVadProvider();
    const decisions = Array.from({ length: 6 }, (_, idx) => provider.process(createFrame(14000, idx)));
    expect(decisions.some((decision) => decision.isSpeech)).toBe(true);
    expect(decisions[decisions.length - 1].source).toBe("shadow");
  });

  it("returns to silence after enough quiet frames", () => {
    const provider = new SileroVadProvider();
    for (let i = 0; i < 6; i++) {
      provider.process(createFrame(14000, i));
    }
    const tail = Array.from({ length: 14 }, (_, idx) => provider.process(createFrame(0, idx + 6)));
    expect(tail[tail.length - 1].isSpeech).toBe(false);
  });

  it("resets internal state deterministically", () => {
    const provider = new SileroVadProvider();
    provider.process(createFrame(12000, 0));
    provider.process(createFrame(12000, 1));
    provider.reset();
    const decision = provider.process(createFrame(0, 0));
    expect(decision.frameIndex).toBe(0);
    expect(decision.consecutiveSpeech).toBe(0);
  });
});
