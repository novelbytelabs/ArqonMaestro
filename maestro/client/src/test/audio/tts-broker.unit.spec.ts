import TtsBroker from "../../main/stt/tts-broker";
import { TtsPlaybackOptions, TtsPlaybackResult, TtsProvider } from "../../main/stt/tts-providers";

class FakeProvider implements TtsProvider {
  public calls: Array<{
    messageId: string;
    transcript: string;
    options?: TtsPlaybackOptions;
  }> = [];
  public stoppedReasons: string[] = [];
  public nextResult: TtsPlaybackResult = {
    success: true,
    provider: "kokoro",
    latencyMs: 1,
  };
  public pending: Promise<TtsPlaybackResult> | null = null;

  constructor(private type: "kokoro" | "piper") {}

  getType(): "kokoro" | "piper" {
    return this.type;
  }

  async play(
    messageId: string,
    _audioDataB64: string,
    _format: string,
    transcript: string,
    options?: TtsPlaybackOptions
  ): Promise<TtsPlaybackResult> {
    this.calls.push({ messageId, transcript, options });
    if (this.pending) {
      return this.pending;
    }
    return {
      ...this.nextResult,
      provider: this.type,
    };
  }

  stopCurrentPlayback(reason?: string): boolean {
    this.stoppedReasons.push(reason || "unknown");
    return true;
  }
}

describe("TtsBroker", () => {
  const createSettings = (fallbackEnabled: boolean = true) =>
    ({
      getArqonTtsKokoroVoice: () => "af_heart",
      getArqonTtsKokoroFallbackEnabled: () => fallbackEnabled,
    } as any);

  const createDeps = () => ({
    log: { logVerbose: () => {}, logError: () => {} } as any,
    tracking: { logMetric: () => {} } as any,
  });

  it("uses Kokoro as primary and routes warning persona voice override", async () => {
    const deps = createDeps();
    const kokoro = new FakeProvider("kokoro");
    const piper = new FakeProvider("piper");
    const broker = new TtsBroker(deps.log, deps.tracking, createSettings(), {
      kokoro,
      piper,
    });

    const ok = await broker.speak({
      messageId: "m1",
      audioDataB64: "AAAA",
      format: "wav",
      transcript: "warning: blocked by policy",
      messageClass: "warning",
    });

    expect(ok).toBe(true);
    expect(kokoro.calls).toHaveLength(1);
    expect(kokoro.calls[0].options?.persona).toBe("warning_sentinel");
    expect(kokoro.calls[0].options?.voiceOverride).toBe("af_bella");
    expect(piper.calls).toHaveLength(0);
  });

  it("falls back to Piper when Kokoro fails", async () => {
    const deps = createDeps();
    const kokoro = new FakeProvider("kokoro");
    kokoro.nextResult = {
      success: false,
      provider: "kokoro",
      latencyMs: 2,
      error: "kokoro_down",
    };
    const piper = new FakeProvider("piper");
    piper.nextResult = {
      success: true,
      provider: "piper",
      latencyMs: 3,
    };
    const broker = new TtsBroker(deps.log, deps.tracking, createSettings(true), {
      kokoro,
      piper,
    });

    const ok = await broker.speak({
      messageId: "m2",
      audioDataB64: "BBBB",
      format: "wav",
      transcript: "ack",
    });

    expect(ok).toBe(true);
    expect(kokoro.calls).toHaveLength(1);
    expect(piper.calls).toHaveLength(1);
  });

  it("interrupts active playback on higher-priority incoming request", async () => {
    const deps = createDeps();
    const kokoro = new FakeProvider("kokoro");
    let resolveFirst: (value: TtsPlaybackResult) => void = () => {};
    kokoro.pending = new Promise<TtsPlaybackResult>((resolve) => {
      resolveFirst = resolve;
    });
    const piper = new FakeProvider("piper");
    const broker = new TtsBroker(deps.log, deps.tracking, createSettings(), {
      kokoro,
      piper,
    });

    const first = broker.speak({
      messageId: "m3",
      audioDataB64: "CCCC",
      format: "wav",
      transcript: "background guidance",
      priorityClass: "p5_background",
      interruptible: true,
    });

    const second = broker.speak({
      messageId: "m4",
      audioDataB64: "DDDD",
      format: "wav",
      transcript: "stop now",
      priorityClass: "p1_reflex",
      interruptible: false,
    });

    resolveFirst({
      success: false,
      provider: "kokoro",
      latencyMs: 5,
      error: "interrupted",
    });

    await Promise.all([first, second]);
    expect(kokoro.stoppedReasons.length).toBeGreaterThan(0);
    expect(kokoro.calls.length).toBeGreaterThanOrEqual(2);
  });
});
