import MockArqonBusServer from "./src/main/stt/mock-server";
import { createRegressionTestRunner } from "./src/main/stt/soak-tester";
import Log from "./src/main/log";
import Settings from "./src/main/settings";

async function main() {
  console.log("Starting Mock Arqon Bus Server...");
  const server = new MockArqonBusServer(9100);

  console.log("Initializing Test Dependencies...");
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
  } as any as Settings;

  const runner = createRegressionTestRunner(mockLog, mockSettings);

  console.log("\nRunning Integration Tests...\n");
  const results = await runner.runAll();

  console.log("\n--- TEST RESULTS ---");
  for (const r of results) {
    console.log(`[${r.passed ? "PASS" : "FAIL"}] ${r.scenario}`);
    if (!r.passed && r.error) {
      console.log(`  Error: ${r.error}`);
    }
  }
  
  const allPassed = results.every(r => r.passed);
  console.log(`\nOverall passing: ${allPassed}`);
  
  console.log("Shutting down mock server...");
  server.stop();
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
