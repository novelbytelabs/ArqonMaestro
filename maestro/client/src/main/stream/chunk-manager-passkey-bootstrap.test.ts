// Use explicit .ts require to avoid shadowing by legacy compiled .js sibling in test runs.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ChunkManager = require("./chunk-manager.ts").default;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function testCase(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error}`);
  }
}

function createBareManager(): any {
  const manager = Object.create(ChunkManager.prototype) as any;
  manager.listening = false;
  manager.toggleGeneration = 0;
  manager.lastToggleTime = 0;
  manager.sessionStartTime = 0;
  manager.mainWindow = { updateTray: () => undefined };
  manager.miniModeWindow = {};
  manager.chunkQueue = { getIndex: () => undefined };
  manager.startListeningSession = async () => true;
  manager.sttRoutingService = { routeSession: () => undefined };
  manager.listeningStateService = {
    recordToggleRequest: () => Date.now(),
    startSession: () => Date.now(),
    stopSession: () => undefined,
    showListeningState: () => undefined,
  };
  return manager;
}

async function run(): Promise<void> {
  await testCase("runtime fail-closes listening when passkey bootstrap is blocked", async () => {
    const manager = createBareManager();
    let emitted: any = null;
    manager.bridge = {
      setState: (state: any) => {
        emitted = state;
      },
    };
    manager.app = {
      isPasskeyBootstrapBlocked: () => true,
    };

    await manager.toggle(true);

    assert(manager.listening === false, "expected listening to remain disabled");
    assert(!!emitted, "expected locked state to be emitted");
    assert(emitted.listening === false, "expected emitted listening=false");
    assert(emitted.statusText === "Locked: Passkey Required", "expected passkey lock status");
  });

  await testCase("cold-start blocked transition can start listening after auth unlock", async () => {
    const manager = createBareManager();
    let blocked = true;
    let pauseBoundaryCount = 0;
    let routedSessionId = "";
    let shownState: boolean | null = null;
    manager.bridge = {
      setState: (_state: any) => undefined,
    };
    manager.app = {
      isPasskeyBootstrapBlocked: () => blocked,
      onPauseToListeningBoundary: () => {
        pauseBoundaryCount += 1;
      },
    };
    manager.sttRoutingService = {
      routeSession: (sessionId: string) => {
        routedSessionId = sessionId;
      },
    };
    manager.listeningStateService = {
      recordToggleRequest: () => Date.now(),
      startSession: (routeSession: (sessionId: string) => void) => {
        routeSession("session_1");
        return Date.now();
      },
      stopSession: () => undefined,
      showListeningState: (listening: boolean) => {
        shownState = listening;
      },
    };

    await manager.toggle(true);
    assert(manager.listening === false, "expected blocked cold-start to keep listening false");

    blocked = false;
    await manager.toggle(true);
    await new Promise((resolve) => setTimeout(resolve, 10));

    assert(manager.listening === true, "expected listening true after auth unlock");
    assert(pauseBoundaryCount === 1, "expected one pause->listening boundary invalidation");
    assert(routedSessionId === "session_1", "expected routed listening session id");
    assert(shownState === true, "expected listening state to be shown as true");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
