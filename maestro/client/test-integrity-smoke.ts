import MockArqonBusServer from "./src/main/stt/mock-server";
import BusClient from "./src/main/stt/bus-client";
import Log from "./src/main/log";
import Settings from "./src/main/settings";
import STTTracking from "./src/main/stt/tracking";
import { STTActionBlockedPayload, STTActionReviewPayload } from "./src/main/stt/envelopes";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const integrityPort = Number(process.env.ARQON_INTEGRITY_SMOKE_PORT || "9102");
  const server = new MockArqonBusServer(integrityPort);

  const mockLog = {
    logInfo: console.log,
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  const mockSettings = {
    getArqonBusWsUrl: () => `ws://localhost:${integrityPort}`,
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

  const tracking = new STTTracking({ logEvent: () => {} } as any, mockSettings);
  const busClient = new BusClient(mockSettings, mockLog, tracking);

  try {
    const connected = await busClient.connect();
    if (!connected) throw new Error("BusClient failed to connect to integrity smoke mock server");

    console.log("=== TARGETED INTEGRITY SMOKE PROBE ===");

    // Scenario A: Human allow.
    server.clearIntegritySignals();
    let allowReview: STTActionReviewPayload | undefined;
    busClient.setActionReviewHandler(async (payload: STTActionReviewPayload) => {
      allowReview = payload;
      return true;
    });
    busClient.publishSessionStart("test-integrity-allow", "chunk-allow", "en-US", "mock");
    busClient.publishAudioAppend("test-integrity-allow", "chunk-allow", Buffer.from("allow"), 1, Date.now());
    await sleep(400);

    if (!allowReview) throw new Error("Allow scenario did not trigger action review");
    if (allowReview.action_id !== "action-123") throw new Error(`Allow scenario action_id mismatch: ${allowReview.action_id}`);
    if (!allowReview.summary.includes("Destructive")) throw new Error(`Allow scenario summary mismatch: ${allowReview.summary}`);
    const allowSignalSeen = server.getIntegritySignals().some((s) => s.type === "stt.action.allow" && s.actionId === "action-123");
    if (!allowSignalSeen) throw new Error("Allow scenario did not publish stt.action.allow with expected action_id");
    console.log("[PASS] integrity_allow");

    // Scenario B: Human block.
    server.clearIntegritySignals();
    let blockReview: STTActionReviewPayload | undefined;
    busClient.setActionReviewHandler(async (payload: STTActionReviewPayload) => {
      blockReview = payload;
      return false;
    });
    busClient.publishSessionStart("test-integrity-block", "chunk-block", "en-US", "mock");
    busClient.publishAudioAppend("test-integrity-block", "chunk-block", Buffer.from("block"), 1, Date.now());
    await sleep(400);

    if (!blockReview) throw new Error("Block scenario did not trigger action review");
    if (blockReview.action_id !== "action-123") throw new Error(`Block scenario action_id mismatch: ${blockReview.action_id}`);
    const blockSignalSeen = server.getIntegritySignals().some((s) => s.type === "stt.action.block" && s.actionId === "action-123");
    if (!blockSignalSeen) throw new Error("Block scenario did not publish stt.action.block with expected action_id");
    console.log("[PASS] integrity_block");

    // Scenario C: Policy block from bus.
    let policyBlocked: STTActionBlockedPayload | undefined;
    busClient.setActionBlockedHandler((payload: STTActionBlockedPayload) => {
      policyBlocked = payload;
    });
    busClient.publishSessionStart("test-integrity-policy-block", "chunk-policy", "en-US", "mock");
    busClient.publishAudioAppend("test-integrity-policy-block", "chunk-policy", Buffer.from("policy"), 1, Date.now());
    await sleep(400);

    if (!policyBlocked) throw new Error("Policy block scenario did not emit stt.action.blocked");
    if (policyBlocked.action_id !== "action-illegal") throw new Error(`Policy block action_id mismatch: ${policyBlocked.action_id}`);
    if (policyBlocked.reason !== "policy") throw new Error(`Policy block reason mismatch: ${policyBlocked.reason}`);
    if (!policyBlocked.message.includes("prohibited")) throw new Error(`Policy block message mismatch: ${policyBlocked.message}`);
    console.log("[PASS] integrity_policy_block");

    // Scenario D: No review handler defaults to block (rollback-safe behavior).
    server.clearIntegritySignals();
    busClient.clearActionReviewHandler();
    busClient.publishSessionStart("test-integrity-allow", "chunk-default-deny", "en-US", "mock");
    busClient.publishAudioAppend("test-integrity-allow", "chunk-default-deny", Buffer.from("default-deny"), 1, Date.now());
    await sleep(400);
    const defaultBlockSeen = server.getIntegritySignals().some((s) => s.type === "stt.action.block" && s.actionId === "action-123");
    if (!defaultBlockSeen) throw new Error("Default-deny scenario did not publish stt.action.block");
    console.log("[PASS] integrity_default_deny");

    console.log(
      JSON.stringify(
        {
          probe: "stt.integrity.handshake",
          status: "OK",
          checks: {
            allow: true,
            block: true,
            policy_block: true,
            default_deny: true,
          },
        },
        null,
        2
      )
    );

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    busClient.disconnect();
    server.stop();
  }
}

main();
