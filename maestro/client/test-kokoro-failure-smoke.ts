import Log from "./src/main/log";
import Settings from "./src/main/settings";
import VoiceOutput from "./src/main/stt/voice-output";

async function runCase(fallbackEnabled: boolean): Promise<void> {
  const telemetry: Array<{ name: string; data: any }> = [];
  const mockTracking = {
    logMetric: (name: string, data: any) => {
      telemetry.push({ name, data });
      console.log(`[Telemetry] ${name}:`, JSON.stringify(data));
    },
  } as any;

  const mockSettings = {
    getArqonTtsProvider: () => "kokoro",
    getArqonTtsKokoroUrl: () => "http://127.0.0.1:1",
    getArqonTtsKokoroVoice: () => "af_heart",
    getArqonTtsKokoroTimeoutMs: () => 1000,
    getArqonTtsKokoroFallbackEnabled: () => fallbackEnabled,
    getDisableAnalytics: () => false,
  } as any as Settings;

  const mockLog = {
    logInfo: console.log,
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  const voiceOutput = new VoiceOutput(mockLog, mockTracking, mockSettings);
  const result = await voiceOutput.play(
    `gate6-kokoro-failure-${fallbackEnabled ? "fallback" : "failclosed"}`,
    "",
    "raw",
    "Kokoro failure mode check."
  );

  const hasKokoroFailure = telemetry.some((t) => t.name === "stt.tts.kokoro.failure");
  if (!hasKokoroFailure) {
    throw new Error("missing stt.tts.kokoro.failure");
  }

  if (fallbackEnabled) {
    const hasFallbackUsed = telemetry.some((t) => t.name === "stt.tts.fallback.used");
    if (!hasFallbackUsed) {
      throw new Error("expected stt.tts.fallback.used");
    }
    console.log(`[PASS] fallback-enabled case executed; result=${result}`);
    return;
  }

  const hasFailClosed = telemetry.some((t) => t.name === "stt.tts.fail_closed");
  if (!hasFailClosed || result) {
    throw new Error("expected fail-closed behavior when fallback disabled");
  }
  console.log("[PASS] fallback-disabled case failed closed.");
}

async function main() {
  console.log("=== GATE 6: KOKORO FAILURE SMOKE TEST ===\n");
  await runCase(true);
  await runCase(false);
  console.log("\n[PASS] Kokoro failure semantics verified.");
}

main().catch((e) => {
  console.error("[FAIL] Failure smoke crashed:", e);
  process.exit(1);
});
