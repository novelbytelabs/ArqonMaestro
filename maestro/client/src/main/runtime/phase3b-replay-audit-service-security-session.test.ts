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
  const summary = service.getSummary();
  assert(snapshot.totalRecords === 1, `expected 1 record, got ${snapshot.totalRecords}`);
  assert(summary.totalRecords === 1, `expected 1 summary record, got ${summary.totalRecords}`);
  assert(
    snapshot.recordsByCategory.security_session_event === 1,
    "expected one security_session_event record"
  );
  assert(
    summary.recordsByCategory.security_session_event === 1,
    "expected one summary security_session_event record"
  );
  assert(summary.lastSequence === 1, `expected last sequence to be 1, got ${summary.lastSequence}`);

  const record = snapshot.records[0] as any;
  assert(record.category === "security_session_event", "expected security_session_event category");
  assert(record.phase === "activated", `unexpected phase: ${record.phase}`);
  assert(record.interactionId === 7, `unexpected interaction id: ${record.interactionId}`);
  assert(record.reasonCode === "activation_unknown", `unexpected reason code: ${record.reasonCode}`);
  console.log("✓ phase3b security-session audit records include new category and fields");
}

run();
