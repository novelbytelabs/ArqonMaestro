import Log from "./src/main/log";
import Settings from "./src/main/settings";
import VoiceOutput from "./src/main/stt/voice-output";

async function main() {
  console.log("=== GATE 6: KOKORO SMOKE TEST (REAL SIDECAR) ===\n");

  const kokoroUrl = process.env.ARQON_KOKORO_SMOKE_URL || "http://127.0.0.1:7781";
  const testText = process.env.ARQON_KOKORO_SMOKE_TEXT || "Arqon Maestro Kokoro smoke check.";

  const mockSettings = {
    getArqonTtsProvider: () => "kokoro",
    getArqonTtsKokoroUrl: () => kokoroUrl,
    getArqonTtsKokoroVoice: () => "af_heart",
    getArqonTtsKokoroTimeoutMs: () => 10000,
    getArqonTtsKokoroFallbackEnabled: () => false,
    getArqonTtsKokoroStreamingEnabled: () => true,
    getDisableAnalytics: () => false,
  } as any as Settings;

  const telemetry: Array<{ name: string; data: any }> = [];
  const mockTracking = {
    logMetric: (name: string, data: any) => {
      telemetry.push({ name, data });
      console.log(`[Telemetry] ${name}:`, JSON.stringify(data));
    },
  } as any;

  const mockLog = {
    logInfo: console.log,
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  const voiceOutput = new VoiceOutput(mockLog, mockTracking, mockSettings);
  const result = await voiceOutput.play(
    "gate6-kokoro-smoke-001",
    "",
    "raw",
    testText
  );

  const kokoroSuccess = telemetry.some((t) => t.name === "stt.tts.kokoro.success");
  if (!result || !kokoroSuccess) {
    console.error("[FAIL] Kokoro sidecar smoke failed.");
    process.exit(1);
  }

  console.log("\n[PASS] Kokoro sidecar synthesis + playback path verified.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[FAIL] Smoke test crashed:", e);
  process.exit(1);
});
