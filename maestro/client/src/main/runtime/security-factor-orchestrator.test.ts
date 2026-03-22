import { evaluateSecurityFactorContract } from "./security-factor-orchestrator";

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
  test("verified trust satisfies additive B1 required voice factor", () => {
    const result = evaluateSecurityFactorContract({
      riskLevel: "medium",
      trustState: "verified",
    });

    assert(result.requiredFactors.length === 1, "expected one required factor");
    assert(result.requiredFactors[0] === "voice", "expected voice requirement");
    assert(result.satisfiedFactors.includes("voice"), "expected voice satisfied");
    assert(result.missingFactor === null, "expected no missing factor");
    assert(result.factorDecision === "allow", "expected factor allow");
    assert(result.targetStepUpType === "pin", "expected medium-risk target step-up pin");
  });

  test("unknown trust blocks for missing voice factor", () => {
    const result = evaluateSecurityFactorContract({
      riskLevel: "high",
      trustState: "unknown",
    });

    assert(result.missingFactor === "voice", "expected missing voice");
    assert(result.factorDecision === "block", "expected factor block");
    assert(result.factorReasonCode === "auth_block_voice_required", "expected voice block reason");
    assert(result.targetStepUpType === "passkey", "expected high-risk target step-up passkey");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
