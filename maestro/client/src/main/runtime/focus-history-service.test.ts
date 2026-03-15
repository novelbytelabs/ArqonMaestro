import FocusHistoryService from "./focus-history-service";
import System from "../execute/system";

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

class FakeSystem {
  activeApp: string;
  focusCalls: string[] = [];

  constructor(activeApp: string) {
    this.activeApp = activeApp;
  }

  async determineActiveApplication(): Promise<string> {
    return this.activeApp;
  }

  async focus(target: string): Promise<void> {
    this.focusCalls.push(target);
    this.activeApp = target;
  }
}

async function run(): Promise<void> {
  const log = { logVerbose: () => {} } as any;

  await test("observe tracks current and previous non-self apps", async () => {
    const service = new FocusHistoryService(log);
    service.observe("vscode");
    service.observe("terminal");

    const snapshot = service.snapshot();
    assert(snapshot.current === "terminal", `expected current=terminal, got ${snapshot.current}`);
    assert(snapshot.previous === "vscode", `expected previous=vscode, got ${snapshot.previous}`);
  });

  await test("observe ignores self apps", async () => {
    const service = new FocusHistoryService(log);
    service.observe("vscode");
    service.observe("arqonmaestro");

    const snapshot = service.snapshot();
    assert(snapshot.current === "vscode", `expected current=vscode, got ${snapshot.current}`);
    assert(snapshot.previous === undefined, `expected no previous app, got ${snapshot.previous}`);
  });

  await test("focusTarget snapshots current app and refreshes actual focused app", async () => {
    const service = new FocusHistoryService(log);
    const system = new FakeSystem("vscode");

    service.observe("vscode");
    await service.focusTarget("terminal", system as unknown as System, "vscode");

    const snapshot = service.snapshot();
    assert(system.focusCalls.join(",") === "terminal", `unexpected focus calls: ${system.focusCalls.join(",")}`);
    assert(snapshot.current === "terminal", `expected current=terminal, got ${snapshot.current}`);
    assert(snapshot.previous === "vscode", `expected previous=vscode, got ${snapshot.previous}`);
  });

  await test("returnFocus restores previous app and swaps history", async () => {
    const service = new FocusHistoryService(log);
    const system = new FakeSystem("terminal");

    service.observe("vscode");
    service.observe("terminal");
    const restored = await service.returnFocus(system as unknown as System, "terminal");

    const snapshot = service.snapshot();
    assert(restored, "expected returnFocus to restore previous app");
    assert(system.focusCalls.join(",") === "vscode", `unexpected focus calls: ${system.focusCalls.join(",")}`);
    assert(snapshot.current === "vscode", `expected current=vscode, got ${snapshot.current}`);
    assert(snapshot.previous === "terminal", `expected previous=terminal, got ${snapshot.previous}`);
  });

  await test("return focus aliases route through previous focus", async () => {
    const service = new FocusHistoryService(log);
    const system = new FakeSystem("terminal");

    service.observe("vscode");
    service.observe("terminal");
    await service.focusTarget("return focus", system as unknown as System, "terminal");

    const snapshot = service.snapshot();
    assert(system.focusCalls.join(",") === "vscode", `unexpected focus calls: ${system.focusCalls.join(",")}`);
    assert(snapshot.current === "vscode", `expected current=vscode, got ${snapshot.current}`);
    assert(snapshot.previous === "terminal", `expected previous=terminal, got ${snapshot.previous}`);
  });

  await test("returnFocus no-ops cleanly when there is no previous app", async () => {
    const service = new FocusHistoryService(log);
    const system = new FakeSystem("vscode");

    service.observe("vscode");
    const restored = await service.returnFocus(system as unknown as System, "vscode");

    assert(!restored, "expected returnFocus to no-op");
    assert(system.focusCalls.length === 0, `expected no focus calls, got ${system.focusCalls.length}`);
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
