import AuthorizationService, {
  AuthorizationDecision,
  CommandRiskLevel,
  InteractionMode,
} from "../../main/runtime/authorization-service";
import SpeakerEnrollmentService from "../../main/runtime/speaker-enrollment-service";
import SpeakerVerificationService from "../../main/runtime/speaker-verification-service";
import { SecurityMode } from "../../main/runtime/security-mode-service";
import IdentityGatewayService from "../../main/runtime/identity-gateway-service";

describe("Phase 2A identity/safety gating", () => {
  it("requires gating when interaction mode is dictation", async () => {
    const enrollment = new SpeakerEnrollmentService();
    const verification = new SpeakerVerificationService(enrollment);
    const authorization = new AuthorizationService(verification, enrollment);

    const lowRisk = await authorization.authorize({
      commandFamily: "focus",
      commandVerb: "focus terminal",
      riskLevel: CommandRiskLevel.LOW,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.DICTATION,
      identityEvidenceReady: true,
    });

    const highRisk = await authorization.authorize({
      commandFamily: "filesystem",
      commandVerb: "delete file",
      riskLevel: CommandRiskLevel.HIGH,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.DICTATION,
      identityEvidenceReady: true,
    });

    expect(lowRisk.decision).toBe(AuthorizationDecision.CONFIRM);
    expect(highRisk.decision).toBe(AuthorizationDecision.BLOCK);
  });

  it("blocks high-risk commands when diarization marks contamination", async () => {
    const enrollment = new SpeakerEnrollmentService();
    const verification = new SpeakerVerificationService(
      enrollment,
      { enableDiarizationBridge: true },
      {
        isReady: () => true,
        getLoadError: () => undefined,
        diarize: async () => [
          { start: 0.0, end: 0.6, speaker: "SPEAKER_00" },
          { start: 0.6, end: 1.2, speaker: "SPEAKER_01" },
        ],
      } as any
    );
    const authorization = new AuthorizationService(verification, enrollment);

    await verification.processDiarizationAudio({
      chunkId: "c1",
      pcm16leAudio: Buffer.from([0, 1, 2, 3]),
      sampleRateHz: 16000,
    });

    const result = await authorization.authorize({
      commandFamily: "filesystem",
      commandVerb: "delete file",
      riskLevel: CommandRiskLevel.HIGH,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      identityEvidenceReady: true,
    });

    expect(result.decision).toBe(AuthorizationDecision.BLOCK);
    expect(result.reason).toContain("Contaminated");
  });

  it("fails safely for higher-risk commands when identity evidence is unavailable", async () => {
    const enrollment = new SpeakerEnrollmentService();
    const verification = new SpeakerVerificationService(enrollment);
    await verification.reset();
    const authorization = new AuthorizationService(verification, enrollment);

    const medium = await authorization.authorize({
      commandFamily: "terminal",
      commandVerb: "run build",
      riskLevel: CommandRiskLevel.MEDIUM,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      identityEvidenceReady: false,
    });

    const high = await authorization.authorize({
      commandFamily: "filesystem",
      commandVerb: "delete file",
      riskLevel: CommandRiskLevel.HIGH,
      securityMode: SecurityMode.NORMAL,
      sharedRoomMode: false,
      interactionMode: InteractionMode.COMMAND,
      identityEvidenceReady: false,
    });

    expect(medium.decision).toBe(AuthorizationDecision.CONFIRM);
    expect(high.decision).toBe(AuthorizationDecision.BLOCK);
  });

  it("threads interaction-mode state through identity gateway authorization", async () => {
    const gateway = new IdentityGatewayService();
    gateway.setInteractionMode(InteractionMode.DICTATION);

    const result = await gateway.authorize({
      commandFamily: "terminal",
      commandVerb: "run build",
      riskLevel: CommandRiskLevel.MEDIUM,
    });

    expect(result.decision).toBe(AuthorizationDecision.BLOCK);
    gateway.destroy();
  });
});
