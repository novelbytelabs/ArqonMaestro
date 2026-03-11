import Log from "./src/main/log";
import Settings from "./src/main/settings";
import STTTracking from "./src/main/stt/tracking";
import HPOTuner from "./src/main/stt/hpo-tuner";

async function main() {
  console.log("=== GATE 6B: HPO HOMEOSTASIS SMOKE TEST ===\n");

  const telemetry: Array<{ name: string; data: any }> = [];
  const runtime: Record<string, any> = {
    chunk_silence_threshold: 0.3,
    chunk_speech_threshold: 0.3,
    execute_silence_threshold: 1.0,
    arqon_bus_compare_threshold: 0.95,
    arqon_tts_kokoro_timeout_ms: 1000,
    arqon_hpo_homeostasis_enabled: true,
    arqon_hpo_dry_run: true,
  };

  const mockSettings = {
    getArqonHpoHomeostasisEnabled: () => runtime.arqon_hpo_homeostasis_enabled,
    setArqonHpoHomeostasisEnabled: (enabled: boolean) => {
      runtime.arqon_hpo_homeostasis_enabled = enabled;
    },
    getArqonHpoDryRun: () => runtime.arqon_hpo_dry_run,
    setArqonHpoDryRun: (dryRun: boolean) => {
      runtime.arqon_hpo_dry_run = dryRun;
    },
    getChunkSilenceThreshold: () => runtime.chunk_silence_threshold,
    setChunkSilenceThreshold: (v: number) => {
      runtime.chunk_silence_threshold = v;
    },
    getChunkSpeechThreshold: () => runtime.chunk_speech_threshold,
    setChunkSpeechThreshold: (v: number) => {
      runtime.chunk_speech_threshold = v;
    },
    getExecuteSilenceThreshold: () => runtime.execute_silence_threshold,
    setExecuteSilenceThreshold: (v: number) => {
      runtime.execute_silence_threshold = v;
    },
    getArqonBusCompareThreshold: () => runtime.arqon_bus_compare_threshold,
    setArqonBusCompareThreshold: (v: number) => {
      runtime.arqon_bus_compare_threshold = v;
    },
    getArqonTtsKokoroTimeoutMs: () => runtime.arqon_tts_kokoro_timeout_ms,
    setArqonTtsKokoroTimeoutMs: (v: number) => {
      runtime.arqon_tts_kokoro_timeout_ms = v;
    },
    getDisableAnalytics: () => false,
  } as any as Settings;

  const mockLog = {
    logInfo: console.log,
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  const mockApi = {
    logEvent: (name: string, data: any) => {
      telemetry.push({ name, data });
      console.log(`[Telemetry] ${name}:`, JSON.stringify(data));
    },
    logLocalAudio: () => {},
    logLocalResponse: () => {},
  } as any;

  const tracking = new STTTracking(mockApi, mockSettings);
  const tuner = new HPOTuner(mockSettings, mockLog, tracking);

  await tuner.start();

  try {
    // feed enough samples for loss computation
    const samples = [120, 140, 160, 110, 130, 150];
    for (const ms of samples) {
      tuner.recordTelemetry("ack_short", ms, true);
    }

    // one failure sample to ensure failure penalty path is exercised
    tuner.recordTelemetry("ack_short", 0, false);

    await tuner.runLoopCycle();

    const sawActuate = telemetry.some((t) => t.name === "stt.hpo.actuate");
    const sawBlock = telemetry.some((t) => t.name === "stt.hpo.actuate_blocked");
    if (!sawActuate && !sawBlock) {
      console.error("[FAIL] HPO loop did not emit actuation telemetry.");
      process.exit(1);
    }

    console.log("\n[PASS] HPO homeostasis loop started, evaluated, and emitted telemetry.");
  } finally {
    tuner.stop();
  }
}

main().catch((e) => {
  console.error("[FAIL] HPO smoke test crashed:", e);
  process.exit(1);
});
