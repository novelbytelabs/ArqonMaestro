import Log from "./src/main/log";
import Settings from "./src/main/settings";
import STTTracking from "./src/main/stt/tracking";
import HPOTuner from "./src/main/stt/hpo-tuner";

let currentTime = 1000000;
Date.now = () => currentTime;

const OPTIMAL = {
  chunk_silence_threshold: 0.5,
  chunk_speech_threshold: 0.2,
  execute_silence_threshold: 1.0,
  arqon_tts_kokoro_timeout_ms: 2000,
  arqon_bus_compare_threshold: 0.8,
};

function calculateSimulatedTtfa(runtime: Record<string, any>): number {
  let penalty = 0;
  penalty += Math.abs(runtime.chunk_silence_threshold - OPTIMAL.chunk_silence_threshold) * 2000;
  penalty += Math.abs(runtime.chunk_speech_threshold - OPTIMAL.chunk_speech_threshold) * 2000;
  penalty += Math.abs(runtime.execute_silence_threshold - OPTIMAL.execute_silence_threshold) * 1000;
  penalty += Math.abs(runtime.arqon_bus_compare_threshold - OPTIMAL.arqon_bus_compare_threshold) * 1000;
  penalty += Math.abs(runtime.arqon_tts_kokoro_timeout_ms - OPTIMAL.arqon_tts_kokoro_timeout_ms) * 0.5;

  // Initial params give ~3500+ penalty -> ~3600ms TTFA
  const noise = (Math.random() - 0.5) * 50;
  return Math.max(10, 150 + penalty + noise);
}

async function main() {
  console.log("=== GATE 6B: HPO CONVERGENCE SIMULATION ===\n");

  const runtime: Record<string, any> = {
    chunk_silence_threshold: 0.3,
    chunk_speech_threshold: 0.3,
    execute_silence_threshold: 1.0,
    arqon_bus_compare_threshold: 0.9,
    arqon_tts_kokoro_timeout_ms: 2200,
    arqon_hpo_homeostasis_enabled: true,
    arqon_hpo_dry_run: false,
  };

  const mockSettings = {
    getArqonHpoHomeostasisEnabled: () => runtime.arqon_hpo_homeostasis_enabled,
    getArqonHpoDryRun: () => runtime.arqon_hpo_dry_run,
    getChunkSilenceThreshold: () => runtime.chunk_silence_threshold,
    setChunkSilenceThreshold: (v: number) => { runtime.chunk_silence_threshold = v; },
    getChunkSpeechThreshold: () => runtime.chunk_speech_threshold,
    setChunkSpeechThreshold: (v: number) => { runtime.chunk_speech_threshold = v; },
    getExecuteSilenceThreshold: () => runtime.execute_silence_threshold,
    setExecuteSilenceThreshold: (v: number) => { runtime.execute_silence_threshold = v; },
    getArqonBusCompareThreshold: () => runtime.arqon_bus_compare_threshold,
    setArqonBusCompareThreshold: (v: number) => { runtime.arqon_bus_compare_threshold = v; },
    getArqonTtsKokoroTimeoutMs: () => runtime.arqon_tts_kokoro_timeout_ms,
    setArqonTtsKokoroTimeoutMs: (v: number) => { runtime.arqon_tts_kokoro_timeout_ms = v; },
    getDisableAnalytics: () => true,
  } as any as Settings;

  const mockLog = {
    logInfo: () => {},
    logVerbose: () => {},
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  const mockApi = {
    logEvent: () => {},
    logLocalAudio: () => {},
    logLocalResponse: () => {},
  } as any;

  const tracking = new STTTracking(mockApi, mockSettings);
  const tuner = new HPOTuner(mockSettings, mockLog, tracking);

  await tuner.start();

  try {
    const NUM_EPOCHS = 30;
    console.log(`Initial TTFA: ~${Math.round(calculateSimulatedTtfa(runtime))}ms`);

    for (let epoch = 1; epoch <= NUM_EPOCHS; epoch++) {
      // Simulate 5 data points
      for (let i = 0; i < 5; i++) {
        const ttfa = calculateSimulatedTtfa(runtime);
        tuner.recordTelemetry("ack_short", ttfa, true);
      }

      // Fast forward time to pass cooldown (15s) and loop interval (10s)
      currentTime += 20000; 

      await tuner.runLoopCycle();
      
      const p95_ttfa = Math.round(calculateSimulatedTtfa(runtime));
      console.log(`Epoch ${epoch}: TTFA = ${p95_ttfa}ms | Parameters = ${JSON.stringify(runtime)}`);
      
      // Wait for python server to process requests if needed (in realistic scenarios)
      // but locally await postJson already returns.
    }
  } finally {
    tuner.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
