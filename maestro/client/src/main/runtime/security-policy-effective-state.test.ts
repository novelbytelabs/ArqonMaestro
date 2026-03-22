import SecuritySessionPolicyService from "./security-session-policy-service";
import PasskeyBootstrapService from "./passkey-bootstrap-service";
import { computeSecurityPolicyEffectiveState } from "./security-policy-effective-state";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error}`);
  }
}

function withNow<T>(nowMs: number, fn: () => T): T {
  const originalNow = Date.now;
  Date.now = () => nowMs;
  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}

function run(): void {
  test("passkey required unsatisfied forces locked regardless of base mode", () => {
    const session = new SecuritySessionPolicyService();
    session.setMode("pilot");
    const passkey = new PasskeyBootstrapService({ requiredOnColdStart: true, providerReady: true });
    const state = computeSecurityPolicyEffectiveState(session.getSnapshot(), passkey.getSnapshot(), 1_000);
    assert(state.mode === "locked", `expected locked, got ${state.mode}`);
    assert(state.lockReason === "passkey_required", `expected passkey_required, got ${state.lockReason}`);
    assert(state.passkeyBootstrapBlocked === true, "expected passkey blocked");
  });

  test("manual locked is reported when locked without unknown-rate guard flags", () => {
    const session = new SecuritySessionPolicyService();
    session.setMode("locked");
    const passkey = new PasskeyBootstrapService({ requiredOnColdStart: false, providerReady: false });
    const state = computeSecurityPolicyEffectiveState(session.getSnapshot(), passkey.getSnapshot(), 1_000);
    assert(state.mode === "locked", `expected locked, got ${state.mode}`);
    assert(state.lockReason === "manual_locked", `expected manual_locked, got ${state.lockReason}`);
  });

  test("unknown-rate guard timed lock is reported as unknown_rate_guard", () => {
    const session = new SecuritySessionPolicyService();
    withNow(1_000, () => session.onActivated({ interactionId: 1, trustState: "unknown" }));
    withNow(2_000, () => session.onActivated({ interactionId: 2, trustState: "unknown" }));
    withNow(3_000, () => session.onActivated({ interactionId: 3, trustState: "unknown" }));
    const passkey = new PasskeyBootstrapService({ requiredOnColdStart: false, providerReady: false });
    const state = withNow(3_001, () =>
      computeSecurityPolicyEffectiveState(session.getSnapshot(), passkey.getSnapshot(), 3_001)
    );
    assert(state.mode === "locked", `expected locked, got ${state.mode}`);
    assert(state.lockReason === "unknown_rate_guard", `expected unknown_rate_guard, got ${state.lockReason}`);
  });

  test("verified provider outcome clears passkey-required lock", () => {
    const session = new SecuritySessionPolicyService();
    session.setMode("assist");
    const passkey = new PasskeyBootstrapService({ requiredOnColdStart: true, providerReady: true });
    passkey.applyProviderOutcome({
      provider: "test_provider",
      verified: true,
      method: "passkey",
      reasonCode: "ok",
    });
    const state = computeSecurityPolicyEffectiveState(session.getSnapshot(), passkey.getSnapshot(), 10_000);
    assert(state.mode === "assist", `expected assist, got ${state.mode}`);
    assert(state.lockReason === "none", `expected none, got ${state.lockReason}`);
    assert(state.passkeyBootstrapBlocked === false, "expected passkey unblocked");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
