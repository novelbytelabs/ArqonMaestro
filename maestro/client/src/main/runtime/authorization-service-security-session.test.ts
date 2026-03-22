import AuthorizationService, {
  AuthorizationDecision,
  CommandRiskLevel,
  InteractionMode,
} from "./authorization-service";
import { SecurityMode } from "./security-mode-service";
import { SpeakerIdentityState } from "./speaker-verification-service";
import { SpeakerRole } from "./speaker-enrollment-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error}`);
  }
}

class FakeVerificationService {
  getIdentityState(): SpeakerIdentityState {
    return SpeakerIdentityState.VERIFIED_PRIMARY;
  }
  getConfidenceValue(): number {
    return 0.95;
  }
  isVerified(): boolean {
    return true;
  }
  getCurrentIdentityId(): string {
    return "profile_1";
  }
  getCurrentRole(): SpeakerRole {
    return SpeakerRole.SOVEREIGN_OWNER;
  }
  isContaminated(): boolean {
    return false;
  }
}

class FakeEnrollmentService {
  getEnrollment(): any {
    return {
      authorityScope: {
        allowedRiskLevels: [CommandRiskLevel.LOW, CommandRiskLevel.MEDIUM, CommandRiskLevel.HIGH],
        blockedCommands: [],
      },
    };
  }
}

function createService(): AuthorizationService {
  return new AuthorizationService(
    new FakeVerificationService() as any,
    new FakeEnrollmentService() as any
  );
}

async function run(): Promise<void> {
  await test("assist unknown blocks low-risk execution", async () => {
    const service = createService();
    const result = await service.authorize({
      commandFamily: "navigation",
      commandVerb: "next tab",
      riskLevel: CommandRiskLevel.LOW,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      securitySession: {
        interactionId: 1,
        mode: "assist",
        trustState: "unknown",
        requiresReauth: false,
        graceValid: false,
      },
    });
    assert(result.decision === AuthorizationDecision.BLOCK, `expected block, got ${result.decision}`);
    assert(result.metadata?.missingFactor === "voice", "expected missing voice factor");
    assert(result.metadata?.factorDecision === "block", "expected factor decision block");
  });

  await test("assist verified medium allows with per-command authentication", async () => {
    const service = createService();
    const result = await service.authorize({
      commandFamily: "browser",
      commandVerb: "press enter",
      riskLevel: CommandRiskLevel.MEDIUM,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      securitySession: {
        interactionId: 2,
        mode: "assist",
        trustState: "verified",
        requiresReauth: false,
        graceValid: true,
      },
    });
    assert(result.decision === AuthorizationDecision.ALLOW, `expected allow, got ${result.decision}`);
    assert(Array.isArray(result.metadata?.requiredFactors), "expected requiredFactors metadata");
    assert(
      (result.metadata?.requiredFactors as string[]).includes("voice"),
      "expected required voice factor"
    );
    assert(result.metadata?.factorDecision === "allow", "expected factor decision allow");
  });

  await test("assist verified medium also allows without grace", async () => {
    const service = createService();
    const result = await service.authorize({
      commandFamily: "browser",
      commandVerb: "press enter",
      riskLevel: CommandRiskLevel.MEDIUM,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      securitySession: {
        interactionId: 3,
        mode: "assist",
        trustState: "verified",
        requiresReauth: false,
        graceValid: false,
      },
    });
    assert(result.decision === AuthorizationDecision.ALLOW, `expected allow, got ${result.decision}`);
  });

  await test("locked mode blocks non-reflex commands", async () => {
    const service = createService();
    const result = await service.authorize({
      commandFamily: "browser",
      commandVerb: "scroll down",
      riskLevel: CommandRiskLevel.LOW,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      securitySession: {
        interactionId: 4,
        mode: "locked",
        trustState: "verified",
        requiresReauth: false,
        graceValid: false,
      },
    });
    assert(result.decision === AuthorizationDecision.BLOCK, `expected block, got ${result.decision}`);
  });

  await test("contaminated trust state fail-closes", async () => {
    const service = createService();
    const result = await service.authorize({
      commandFamily: "browser",
      commandVerb: "go to end",
      riskLevel: CommandRiskLevel.MEDIUM,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      securitySession: {
        interactionId: 5,
        mode: "assist",
        trustState: "contaminated",
        requiresReauth: false,
        graceValid: true,
      },
    });
    assert(result.decision === AuthorizationDecision.BLOCK, `expected block, got ${result.decision}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
