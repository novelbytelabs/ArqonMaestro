import Phase3BReplayAuditService from "./phase3b-replay-audit-service";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const service = new Phase3BReplayAuditService();
  service.recordSecuritySessionEvent({
    phase: "activated",
    interactionId: 7,
    trustState: "unknown",
    mode: "assist",
    requiresReauthNext: true,
    graceValid: false,
    graceExpiresAt: "",
    reasonCode: "activation_unknown",
  });

  const snapshot = service.getSnapshot();
  assert(snapshot.totalRecords === 1, `expected 1 record, got ${snapshot.totalRecords}`);
  assert(
    snapshot.recordsByCategory.security_session_event === 1,
    "expected one security_session_event record"
  );

  const record = snapshot.records[0] as any;
  assert(record.category === "security_session_event", "expected security_session_event category");
  assert(record.phase === "activated", `unexpected phase: ${record.phase}`);
  assert(record.interactionId === 7, `unexpected interaction id: ${record.interactionId}`);
  assert(record.reasonCode === "activation_unknown", `unexpected reason code: ${record.reasonCode}`);
  console.log("✓ phase3b security-session audit records include new category and fields");
}

run();
