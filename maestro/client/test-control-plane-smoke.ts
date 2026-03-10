import ControlPlaneCoordinator, {
  ControlPlaneDispatchRequest,
  MemoryControlPlaneStore,
} from "./src/main/stt/control-plane-coordinator";

class AuditableStore extends MemoryControlPlaneStore {
  enqueued = 0;
  leases = 0;
  ackSuccessCount = 0;
  ackFailureCount = 0;
  decisions: Array<{ requestId: string; decision: string; reason: string }> = [];

  async enqueueRequest(request: ControlPlaneDispatchRequest): Promise<void> {
    this.enqueued++;
    await super.enqueueRequest(request);
  }

  async acquireLease(requestId: string, ownerId: string, leaseMs: number, attempt: number): Promise<boolean> {
    this.leases++;
    return super.acquireLease(requestId, ownerId, leaseMs, attempt);
  }

  async ackSuccess(requestId: string): Promise<void> {
    this.ackSuccessCount++;
    await super.ackSuccess(requestId);
  }

  async ackFailure(requestId: string, reason: string, terminal: boolean): Promise<void> {
    this.ackFailureCount++;
    await super.ackFailure(requestId, reason, terminal);
  }

  async recordDecision(requestId: string, decision: "allow" | "block" | "defer" | "drop", reason: string): Promise<void> {
    this.decisions.push({ requestId, decision, reason });
    await super.recordDecision(requestId, decision, reason);
  }
}

function buildRequest(requestId: string, agentId: string): ControlPlaneDispatchRequest {
  return {
    requestId,
    requestType: "stt.speech.request",
    agentId,
    sessionId: "smoke-session",
    chunkId: "smoke-chunk",
    fingerprint: `stt.speech.request:${requestId}`,
    payload: { message_id: requestId, session_id: "smoke-session", chunk_id: "smoke-chunk" },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const store = new AuditableStore();
  const tracking = { logMetric: () => {} } as any;
  const log = { logVerbose: () => {}, logError: console.error } as any;

  const coordinator = new ControlPlaneCoordinator(
    {
      enabled: true,
      spacetimeDbUrl: "memory://",
      failClosed: true,
      agentInflightLimit: 1,
      globalInflightLimit: 2,
      leaseMs: 3000,
      maxRetries: 1,
      ownerId: "gate5-smoke",
    },
    store,
    tracking,
    log
  );

  const executionOrder: string[] = [];
  const acceptedA = await coordinator.submit(buildRequest("cp-a1", "agent-A"), async () => {
    executionOrder.push("cp-a1");
    await sleep(20);
  });
  const acceptedB = await coordinator.submit(buildRequest("cp-b1", "agent-B"), async () => {
    executionOrder.push("cp-b1");
    await sleep(20);
  });

  await sleep(120);

  store.setHealthy(false);
  let blockedExecuted = false;
  const acceptedBlocked = await coordinator.submit(buildRequest("cp-blocked", "agent-C"), async () => {
    blockedExecuted = true;
  });
  await sleep(80);

  const ok =
    acceptedA &&
    acceptedB &&
    !acceptedBlocked &&
    !blockedExecuted &&
    executionOrder.join(",") === "cp-a1,cp-b1" &&
    store.enqueued >= 2 &&
    store.leases >= 2 &&
    store.ackSuccessCount >= 2;

  console.log(
    JSON.stringify(
      {
        probe: "stt.control_plane.coordinator",
        status: ok ? "OK" : "FAILED",
        checks: {
          accepted_initial_requests: acceptedA && acceptedB,
          fair_dispatch_order: executionOrder.join(",") === "cp-a1,cp-b1",
          ack_success_recorded: store.ackSuccessCount >= 2,
          fail_closed_block: !acceptedBlocked && !blockedExecuted,
        },
        metrics: {
          enqueued: store.enqueued,
          leases: store.leases,
          ack_success: store.ackSuccessCount,
          ack_failure: store.ackFailureCount,
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
