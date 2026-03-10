import MockArqonBusServer from "./src/main/stt/mock-server";
import { createRegressionTestRunner } from "./src/main/stt/soak-tester";
import Log from "./src/main/log";
import Settings from "./src/main/settings";

async function main() {
  const server = new MockArqonBusServer(9100);

  const mockLog = {
    logInfo: console.log,
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;
  
  const mockSettings = {
    getArqonBusWsUrl: () => "ws://localhost:9100",
    getArqonBusRoom: () => "stt",
    getArqonBusChannel: () => "transcription",
    getArqonBusShadowMode: () => false,
    getArqonBusEnabled: () => true,
    getArqonBusStageApproval: () => true,
    getArqonBusCompareEnabled: () => true,
    getArqonBusCompareThreshold: () => 0.95,
    getArqonBusCompareReportInterval: () => 300,
    getArqonBusCompareSampleRate: () => 1.0,
    getDisableAnalytics: () => false,
  } as any as Settings;

  const runner = createRegressionTestRunner(mockLog, mockSettings);

  console.log("=== TARGETED REPLAY SMOKE PROBE ===");
  const results = await runner.runAll();
  const replayResult = results.find(r => r.scenario === "speech_replay");
  
  console.log("");
  console.log(JSON.stringify({
    probe: "stt.speech.replay_deduplication",
    status: (replayResult && replayResult.passed) ? "OK" : "FAILED",
    metrics: replayResult ? replayResult.details : null
  }, null, 2));
  
  server.stop();
  process.exit((replayResult && replayResult.passed) ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
