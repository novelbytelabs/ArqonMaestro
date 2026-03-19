import SpeakerEnrollmentService from "../../main/runtime/speaker-enrollment-service";
import SpeakerVerificationService, {
  SpeakerIdentityState,
} from "../../main/runtime/speaker-verification-service";

describe("SpeakerVerificationService diarization lane", () => {
  it("marks state contaminated when diarization reports multiple speakers", async () => {
    const enrollment = new SpeakerEnrollmentService();
    const verification = new SpeakerVerificationService(
      enrollment,
      { enableDiarizationBridge: true },
      {
        isReady: () => true,
        getLoadError: () => undefined,
        diarize: async () => [
          { start: 0.0, end: 0.9, speaker: "SPEAKER_00" },
          { start: 0.9, end: 1.7, speaker: "SPEAKER_01" },
        ],
      } as any
    );

    const result = await verification.processDiarizationAudio({
      chunkId: "chunk-multi",
      pcm16leAudio: Buffer.from([0, 1, 2, 3]),
      sampleRateHz: 16000,
    });

    expect(result.ok).toBe(true);
    expect(result.speakerCount).toBe(2);
    expect(result.contaminated).toBe(true);
    expect(verification.getIdentityState()).toBe(SpeakerIdentityState.CONTAMINATED);
    expect(verification.getCurrentState().speakerCount).toBe(2);
  });

  it("fails safely when diarization bridge is unavailable", async () => {
    const enrollment = new SpeakerEnrollmentService();
    const verification = new SpeakerVerificationService(
      enrollment,
      { enableDiarizationBridge: true },
      {
        isReady: () => false,
        getLoadError: () => "python_or_bridge_missing",
        diarize: async () => [],
      } as any
    );

    const result = await verification.processDiarizationAudio({
      chunkId: "chunk-unavailable",
      pcm16leAudio: Buffer.from([0, 1, 2, 3]),
      sampleRateHz: 16000,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("python_or_bridge_missing");
    expect(verification.getIdentityState()).toBe(SpeakerIdentityState.UNKNOWN);
  });
});
