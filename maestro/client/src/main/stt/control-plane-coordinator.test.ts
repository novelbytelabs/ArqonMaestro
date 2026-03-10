import ControlPlaneCoordinator, {
  ControlPlaneDispatchRequest,
  MemoryControlPlaneStore,
} from "./control-plane-coordinator";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error}`);
  }
}

function buildRequest(
  requestId: string,
  agentId: string,
  requestType: "stt.speech.request" | "stt.action.review" = "stt.speech.request"
): ControlPlaneDispatchRequest {
  return {
    requestId,
    requestType,
    agentId,
    sessionId: "s",
    chunkId: "c",
    fingerprint: `${requestType}:${requestId}`,
    payload: { message_id: requestId, session_id: "s", chunk_id: "c" },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(): Promise<void> {
  const tracking = { logMetric: () => {} } as any;
  const log = { logVerbose: () => {}, logError: () => {} } as any;

  await test("per-agent FIFO + fair-share round-robin dispatch", async () => {
    const store = new MemoryControlPlaneStore();
    const coordinator = new ControlPlaneCoordinator(
      {
        enabled: true,
        spacetimeDbUrl: "memory://",
        failClosed: true,
        agentInflightLimit: 1,
        globalInflightLimit: 2,
        leaseMs: 2000,
        maxRetries: 1,
        ownerId: "test-owner",
      },
      store,
      tracking,
      log
    );

    const order: string[] = [];
    await coordinator.submit(buildRequest("A1", "agent-A"), async () => {
      order.push("A1");
      await sleep(20);
    });
    await coordinator.submit(buildRequest("A2", "agent-A"), async () => {
      order.push("A2");
      await sleep(20);
    });
    await coordinator.submit(buildRequest("B1", "agent-B"), async () => {
      order.push("B1");
      await sleep(20);
    });
    await coordinator.submit(buildRequest("B2", "agent-B"), async () => {
      order.push("B2");
      await sleep(20);
    });

    await sleep(300);
    assert(order.join(",") === "A1,B1,A2,B2", `unexpected order: ${order.join(",")}`);
  });

  await test("idempotency dedupe blocks duplicate submissions", async () => {
    const store = new MemoryControlPlaneStore();
    const coordinator = new ControlPlaneCoordinator(
      {
        enabled: true,
        spacetimeDbUrl: "memory://",
        failClosed: true,
        agentInflightLimit: 1,
        globalInflightLimit: 1,
        leaseMs: 2000,
        maxRetries: 1,
        ownerId: "test-owner",
      },
      store,
      tracking,
      log
    );

    let executions = 0;
    const request = buildRequest("DUPE-1", "agent-A");
    const acceptedFirst = await coordinator.submit(request, async () => {
      executions++;
      await sleep(10);
    });
    await sleep(80);
    const acceptedSecond = await coordinator.submit(request, async () => {
      executions++;
    });

    await sleep(80);
    assert(acceptedFirst, "first submission should be accepted");
    assert(!acceptedSecond, "duplicate submission should be rejected");
    assert(executions === 1, `expected one execution, got ${executions}`);
  });

  await test("fail-closed blocks requests when backbone is unhealthy", async () => {
    const store = new MemoryControlPlaneStore();
    store.setHealthy(false);
    const coordinator = new ControlPlaneCoordinator(
      {
        enabled: true,
        spacetimeDbUrl: "memory://",
        failClosed: true,
        agentInflightLimit: 1,
        globalInflightLimit: 1,
        leaseMs: 2000,
        maxRetries: 1,
        ownerId: "test-owner",
      },
      store,
      tracking,
      log
    );

    let executed = false;
    const accepted = await coordinator.submit(buildRequest("FC-1", "agent-A"), async () => {
      executed = true;
    });
    await sleep(50);
    assert(!accepted, "request should be blocked in fail-closed mode");
    assert(!executed, "executor should not run when blocked");
  });

  await test("retry then dead-letter after retry budget is exhausted", async () => {
    const store = new MemoryControlPlaneStore();
    const coordinator = new ControlPlaneCoordinator(
      {
        enabled: true,
        spacetimeDbUrl: "memory://",
        failClosed: true,
        agentInflightLimit: 1,
        globalInflightLimit: 1,
        leaseMs: 2000,
        maxRetries: 1,
        ownerId: "test-owner",
      },
      store,
      tracking,
      log
    );

    let executions = 0;
    await coordinator.submit(buildRequest("RETRY-1", "agent-A"), async () => {
      executions++;
      throw new Error("synthetic execution failure");
    });

    await sleep(250);
    assert(executions === 2, `expected 2 attempts (initial + retry), got ${executions}`);
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
