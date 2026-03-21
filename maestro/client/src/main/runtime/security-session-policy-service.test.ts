import SecuritySessionPolicyService from "./security-session-policy-service";

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
  test("heard-only event does not change mode", () => {
    const service = new SecuritySessionPolicyService();
    service.onHeard();
    const snapshot = service.getSnapshot();
    assert(snapshot.mode === "pilot", `expected pilot, got ${snapshot.mode}`);
    assert(snapshot.lastReasonCode === "ingress_heard_no_transition", "expected heard-only reason code");
  });

  test("unknown activation in pilot degrades to assist", () => {
    const service = new SecuritySessionPolicyService();
    service.onActivated({ interactionId: 1, trustState: "unknown" });
    const snapshot = service.getSnapshot();
    assert(snapshot.mode === "assist", `expected assist, got ${snapshot.mode}`);
    assert(
      snapshot.lastReasonCode === "mode_transition_pilot_to_assist_unknown_activation",
      `unexpected reason code: ${snapshot.lastReasonCode}`
    );
  });

  test("assist verified event creates 9s grace", () => {
    const service = new SecuritySessionPolicyService();
    service.setMode("assist");
    withNow(1_000, () => {
      service.onVerificationEvent({ trustState: "verified" }); // stays assist for this tick then grace
    });
    const snapshot = withNow(5_000, () => service.getSnapshot());
    assert(snapshot.graceValid === true, "expected grace to be valid");
    assert(snapshot.graceExpiresAt !== "", "expected grace expiration timestamp");
  });

  test("pause to listening invalidates grace and marks reauth boundary", () => {
    const service = new SecuritySessionPolicyService();
    withNow(1_000, () => {
      service.onActivated({ interactionId: 1, trustState: "unknown" });
      service.onVerificationEvent({ trustState: "verified" });
    });
    service.onPauseToListeningBoundary();
    const snapshot = service.getSnapshot();
    assert(snapshot.graceValid === false, "expected grace invalidated");
    assert(snapshot.requiresReauthNext === true, "expected requires reauth next");
    assert(
      snapshot.lastReasonCode === "grace_invalidated_pause_to_listen",
      `unexpected reason code: ${snapshot.lastReasonCode}`
    );
  });

  test("unknown activation guard locks after 3 activations/10s", () => {
    const service = new SecuritySessionPolicyService();
    withNow(1_000, () => service.onActivated({ interactionId: 1, trustState: "unknown" }));
    withNow(2_000, () => service.onActivated({ interactionId: 2, trustState: "unknown" }));
    withNow(3_000, () => service.onActivated({ interactionId: 3, trustState: "unknown" }));
    const snapshot = withNow(3_001, () => service.getSnapshot());
    assert(snapshot.mode === "locked", `expected locked, got ${snapshot.mode}`);
    assert(snapshot.lockUntil !== "", "expected timed lock expiry");
  });

  test("unknown activation guard escalates to verified-only unlock at 5/60s", () => {
    const service = new SecuritySessionPolicyService();
    withNow(1_000, () => service.onActivated({ interactionId: 1, trustState: "unknown" }));
    withNow(2_000, () => service.onActivated({ interactionId: 2, trustState: "unknown" }));
    withNow(3_000, () => service.onActivated({ interactionId: 3, trustState: "unknown" }));
    withNow(20_000, () => service.onActivated({ interactionId: 4, trustState: "unknown" }));
    withNow(40_000, () => service.onActivated({ interactionId: 5, trustState: "unknown" }));
    const snapshot = withNow(40_001, () => service.getSnapshot());
    assert(snapshot.mode === "locked", `expected locked, got ${snapshot.mode}`);
    assert(snapshot.lockedUntilVerified === true, "expected locked-until-verified flag");
  });

  test("export + restore preserves session state fields", () => {
    const source = new SecuritySessionPolicyService();
    withNow(1_000, () => source.onActivated({ interactionId: 1, trustState: "unknown" }));
    withNow(2_000, () => source.onVerificationEvent({ trustState: "verified" }));
    const exported = source.exportState(2_001);

    const restored = new SecuritySessionPolicyService();
    restored.restoreState(exported);
    const snapshot = withNow(2_001, () => restored.getSnapshot());

    assert(snapshot.mode === source.getSnapshot(2_001).mode, "expected restored mode to match");
    assert(
      snapshot.requiresReauthAfterInteractionId ===
        source.getSnapshot(2_001).requiresReauthAfterInteractionId,
      "expected restored reauth interaction id to match"
    );
    assert(snapshot.lastReasonCode === exported.lastReasonCode, "expected reason code restored");
  });

  test("restore ignores invalid state payload values", () => {
    const service = new SecuritySessionPolicyService();
    service.restoreState({
      mode: "invalid" as any,
      previousVerifiedMode: "invalid" as any,
      requiresReauthAfterInteractionId: -99,
      graceExpiresAt: "not-a-date",
      lockUntil: "not-a-date",
      lockedUntilVerified: true,
      lastReasonCode: "custom_code",
      lastTrustState: "invalid" as any,
    });
    const snapshot = service.getSnapshot(10_000);
    assert(snapshot.mode === "pilot", `expected pilot mode, got ${snapshot.mode}`);
    assert(
      snapshot.requiresReauthAfterInteractionId === 0,
      `expected non-negative reauth id, got ${snapshot.requiresReauthAfterInteractionId}`
    );
    assert(snapshot.graceValid === false, "expected no valid grace");
    assert(snapshot.lastReasonCode === "custom_code", "expected valid custom reason code");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
