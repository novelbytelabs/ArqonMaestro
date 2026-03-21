import SpeakerEnrollmentService, {
  EnrollmentStatus,
  SpeakerRole,
} from "./speaker-enrollment-service";

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

async function run(): Promise<void> {
  await test("create enrollment stores profile with active status", async () => {
    const service = new SpeakerEnrollmentService();
    await service.createEnrollment({
      identityId: "profile_alpha",
      displayName: "Profile Alpha",
      role: SpeakerRole.APPROVED_USER,
    });
    const profile = service.getEnrollment("profile_alpha");
    assert(!!profile, "expected profile to exist");
    assert(profile!.status === EnrollmentStatus.ACTIVE, `expected active, got ${profile!.status}`);
  });

  await test("update enrollment renames display name", async () => {
    const service = new SpeakerEnrollmentService();
    await service.createEnrollment({
      identityId: "profile_beta",
      displayName: "Profile Beta",
      role: SpeakerRole.APPROVED_USER,
    });
    await service.updateEnrollment("profile_beta", { displayName: "Profile Beta 2" });
    const profile = service.getEnrollment("profile_beta");
    assert(profile?.displayName === "Profile Beta 2", "expected renamed profile");
  });

  await test("revoke + reactivate updates status lifecycle", async () => {
    const service = new SpeakerEnrollmentService();
    await service.createEnrollment({
      identityId: "profile_gamma",
      displayName: "Profile Gamma",
      role: SpeakerRole.APPROVED_USER,
    });
    await service.revokeEnrollment("profile_gamma");
    assert(
      service.getEnrollment("profile_gamma")?.status === EnrollmentStatus.REVOKED,
      "expected revoked status"
    );
    await service.reactivateEnrollment("profile_gamma");
    assert(
      service.getEnrollment("profile_gamma")?.status === EnrollmentStatus.ACTIVE,
      "expected active status after reactivate"
    );
  });

  await test("delete enrollment removes profile", async () => {
    const service = new SpeakerEnrollmentService();
    await service.createEnrollment({
      identityId: "profile_delta",
      displayName: "Profile Delta",
      role: SpeakerRole.APPROVED_USER,
    });
    const deleted = await service.deleteEnrollment("profile_delta");
    assert(deleted === true, "expected delete to return true");
    assert(!service.getEnrollment("profile_delta"), "expected profile to be removed");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

void run();
