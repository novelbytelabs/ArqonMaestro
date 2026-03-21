import SpeakerEnrollmentService from "../../main/runtime/speaker-enrollment-service";
import SpeakerVerificationService, {
  SpeakerIdentityState,
} from "../../main/runtime/speaker-verification-service";
import { EnrollmentStatus, SpeakerRole } from "../../main/runtime/speaker-enrollment-service";

describe("SpeakerVerificationService WeSpeaker lane", () => {
  it("verifies identity when similarity crosses threshold", async () => {
    const enrollment = {
      getEnrollment: (identityId: string) => {
        if (identityId !== "default_owner") {
          return undefined;
        }
        return {
          identityId: "default_owner",
          displayName: "Primary User",
          role: SpeakerRole.SOVEREIGN_OWNER,
          status: EnrollmentStatus.ACTIVE,
          voiceProfileData: "/tmp/default_owner.wav",
          verificationThreshold: {
            minConfidence: 0.8,
            highSecurityConfidence: 0.95,
          },
        };
      },
      updateLastVerified: async () => {},
    } as unknown as SpeakerEnrollmentService;

    const service = new SpeakerVerificationService(
      enrollment,
      { enableWeSpeakerBridge: true },
      undefined,
      {
        isReady: () => true,
        getLoadError: () => undefined,
        getConfig: () => ({ modelTarget: "english" }),
        verify: async () => 0.92,
      } as any
    );

    const result = await service.processWeSpeakerVerification({
      identityId: "default_owner",
      probeAudioPath: "/tmp/probe.wav",
    });

    expect(result.ok).toBe(true);
    expect(result.similarity).toBeCloseTo(0.92, 5);
    expect(result.state?.identityState).toBe(SpeakerIdentityState.VERIFIED_PRIMARY);
  });

  it("fails safely when provider is unavailable", async () => {
    const enrollment = new SpeakerEnrollmentService();
    const service = new SpeakerVerificationService(
      enrollment,
      { enableWeSpeakerBridge: true },
      undefined,
      {
        isReady: () => false,
        getLoadError: () => "python_or_bridge_missing",
      } as any
    );

    const result = await service.processWeSpeakerVerification({
      identityId: "default_owner",
      probeAudioPath: "/tmp/probe.wav",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("python_or_bridge_missing");
  });
});
