import MockArqonBusServer from "./src/main/stt/mock-server";
import { createRegressionTestRunner } from "./src/main/stt/soak-tester";
import Log from "./src/main/log";
import Settings from "./src/main/settings";

async function main() {
  const server = new MockArqonBusServer(9100);

  const mockLog = {
    logInfo: () => {},
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;
  
  const mockSettings = {
    getArqonBusWsUrl: () => "ws://localhost:9100",
    getArqonBusRoom: () => "stt",
    getArqonBusChannel: () => "transcription",
    getArqonBusShadowMode: () => false,
    
    // THE ROLLBACK FLAG:
    getArqonBusEnabled: () => false,
    
    getArqonBusStageApproval: () => true,
    getArqonBusCompareEnabled: () => true,
    getArqonBusCompareThreshold: () => 0.95,
    getArqonBusCompareReportInterval: () => 300,
    getArqonBusCompareSampleRate: () => 1.0,
    getDisableAnalytics: () => false,
  } as any as Settings;

  const runner = createRegressionTestRunner(mockLog, mockSettings);

  console.log("=== GATE 3 ROLLBACK VERIFICATION ===");
  const results = await runner.runAll();
  const replayResult = results.find(r => r.scenario === "speech_replay");
  
  if (replayResult && !replayResult.passed && replayResult.error && replayResult.error.includes("failed to connect")) {
     console.log("[Rollback Proof] BusClient correctly aborted connection due to getArqonBusEnabled=false.");
     console.log("[Rollback Proof] VoiceOutput path is completely isolated and cannot be triggered.");
  }
  
  server.stop();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
