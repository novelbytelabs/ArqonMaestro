import PasskeyBootstrapService from "./passkey-bootstrap-service";

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

function run(): void {
  test("cold-start requirement blocks until bootstrap is complete", () => {
    const service = new PasskeyBootstrapService({
      requiredOnColdStart: true,
      providerReady: true,
    });
    assert(service.isBootstrapRequired() === true, "expected bootstrap requirement");
    assert(service.isBootstrapped() === false, "expected not bootstrapped by default");
    service.completePasskeyBootstrap();
    assert(service.isBootstrapped() === true, "expected bootstrapped after passkey completion");
  });

  test("recovery bootstrap marks snapshot method", () => {
    const service = new PasskeyBootstrapService({
      requiredOnColdStart: true,
      providerReady: false,
    });
    service.completeRecoveryBootstrap();
    const snapshot = service.getSnapshot();
    assert(snapshot.bootstrapped === true, "expected recovery-bootstrapped");
    assert(snapshot.lastMethod === "totp_recovery", "expected totp_recovery method");
  });

  test("authenticated session marks bootstrap with session_auth method", () => {
    const service = new PasskeyBootstrapService({
      requiredOnColdStart: true,
      providerReady: true,
    });
    service.applySessionAuthState(true);
    const snapshot = service.getSnapshot();
    assert(snapshot.bootstrapped === true, "expected session-auth bootstrapped");
    assert(snapshot.lastMethod === "session_auth", "expected session_auth method");
  });

  test("provider verification outcome marks passkey bootstrap explicitly", () => {
    const service = new PasskeyBootstrapService({
      requiredOnColdStart: true,
      providerReady: false,
    });
    service.startProviderChallenge("challenge_1");
    service.applyProviderOutcome({
      provider: "webauthn_local",
      challengeId: "challenge_1",
      verified: true,
      method: "passkey",
    });
    const snapshot = service.getSnapshot();
    assert(snapshot.bootstrapped === true, "expected provider verified bootstrap");
    assert(snapshot.lastMethod === "passkey", "expected passkey method");
    assert(snapshot.providerChallengeActive === false, "expected challenge to be closed");
    assert(snapshot.lastProviderName === "webauthn_local", "expected provider name");
    assert(snapshot.lastProviderOutcome === "verified", "expected verified outcome");
  });

  test("provider failure keeps bootstrap blocked with failure observability", () => {
    const service = new PasskeyBootstrapService({
      requiredOnColdStart: true,
      providerReady: true,
    });
    service.startProviderChallenge("challenge_fail");
    service.applyProviderOutcome({
      provider: "webauthn_local",
      challengeId: "challenge_fail",
      verified: false,
      reasonCode: "provider_denied",
    });
    const snapshot = service.getSnapshot();
    assert(snapshot.bootstrapped === false, "expected bootstrap to remain blocked");
    assert(snapshot.lastProviderOutcome === "failed", "expected failed outcome");
    assert(snapshot.lastProviderReasonCode === "provider_denied", "expected failure reason");
    assert(snapshot.providerChallengeActive === false, "expected challenge to be closed");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
