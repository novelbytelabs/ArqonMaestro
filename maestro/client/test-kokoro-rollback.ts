import Log from "./src/main/log";
import Settings from "./src/main/settings";
import VoiceOutput from "./src/main/stt/voice-output";

async function main() {
  console.log("=== GATE 6: KOKORO ROLLBACK TEST ===\n");

  const mockSettings = {
    _provider: "kokoro",
    getArqonTtsProvider: function() {
      return this._provider;
    },
    setArqonTtsProvider: function(provider: string) {
      this._provider = provider;
      console.log(`[Settings] provider=${provider}`);
    },
    getArqonTtsKokoroUrl: () => "http://127.0.0.1:1",
    getArqonTtsKokoroVoice: () => "af_heart",
    getArqonTtsKokoroTimeoutMs: () => 1000,
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
  if (voiceOutput.getProviderType() !== "kokoro") {
    throw new Error("initial provider should be kokoro");
  }

  const firstResult = await voiceOutput.play(
    "gate6-kokoro-rollback-001",
    "",
    "raw",
    "Rollback before provider switch."
  );
  if (firstResult) {
    throw new Error("kokoro request should fail with unreachable sidecar");
  }

  mockSettings.setArqonTtsProvider("fallback");
  voiceOutput.refreshProvider();
  if (voiceOutput.getProviderType() !== "fallback") {
    throw new Error("provider did not switch to fallback");
  }

  await voiceOutput.play(
    "gate6-kokoro-rollback-002",
    Buffer.from("rollback-check").toString("base64"),
    "raw",
    "Rollback after provider switch."
  );

  console.log("\n[PASS] Provider rollback switch verified.");
}

main().catch((e) => {
  console.error("[FAIL] Rollback test crashed:", e);
  process.exit(1);
});
