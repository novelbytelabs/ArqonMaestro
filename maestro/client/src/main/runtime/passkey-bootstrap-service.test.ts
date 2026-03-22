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

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
