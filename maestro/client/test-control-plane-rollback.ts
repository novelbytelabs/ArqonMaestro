import ControlPlaneCoordinator, { MemoryControlPlaneStore } from "./src/main/stt/control-plane-coordinator";

async function main() {
  const store = new MemoryControlPlaneStore();
  store.setHealthy(false);

  const tracking = { logMetric: () => {} } as any;
  const log = { logVerbose: () => {}, logError: console.error } as any;

  const coordinator = new ControlPlaneCoordinator(
    {
      enabled: false,
      spacetimeDbUrl: "memory://",
      failClosed: true,
      agentInflightLimit: 1,
      globalInflightLimit: 1,
      leaseMs: 1000,
      maxRetries: 1,
      ownerId: "rollback-smoke",
    },
    store,
    tracking,
    log
  );

  let executed = false;
  const accepted = await coordinator.submit(
    {
      requestId: "rollback-req-1",
      requestType: "stt.speech.request",
      agentId: "agent-rb",
      sessionId: "rb-session",
      chunkId: "rb-chunk",
      fingerprint: "stt.speech.request:rollback-req-1",
      payload: { message_id: "rollback-req-1", session_id: "rb-session", chunk_id: "rb-chunk" },
    },
    async () => {
      executed = true;
    }
  );

  const ok = accepted && executed;

  console.log(
    JSON.stringify(
      {
        probe: "stt.control_plane.rollback",
        status: ok ? "OK" : "FAILED",
        checks: {
          coordinator_disabled_accepts_request: accepted,
          request_executed_without_coordinator_path: executed,
        },
      },
      null,
      2
    )
  );

  process.exit(ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
