import Phase3BReplayAuditService from "./phase3b-replay-audit-service";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function run(): void {
  const service = new Phase3BReplayAuditService();

  service.recordSecuritySessionEvent({
    phase: "heard",
    interactionId: 1,
    trustState: "unknown",
    mode: "assist",
    requiresReauthNext: false,
    graceValid: false,
    reasonCode: "ingress_heard_no_transition",
  });

  service.recordAuthorizationDecision({
    interactionId: 1,
    commandFamily: "browser",
    commandVerb: "scroll down",
    riskLevel: "low",
    decision: "allow",
    reason: "low risk",
    isFallback: false,
    securityMode: "normal",
    interactionMode: "command",
    sharedRoomMode: false,
    identityState: "verified",
    speakerVerified: true,
    contaminated: false,
    identityEvidenceReady: true,
  });

  const snapshot = service.getSnapshot();
  const summary = service.getSummary();

  assert(summary.totalRecords === snapshot.totalRecords, "summary/snapshot total mismatch");
  assert(
    summary.recordsByCategory.security_session_event === snapshot.recordsByCategory.security_session_event,
    "security_session_event count mismatch"
  );
  assert(
    summary.recordsByCategory.authorization_decision === snapshot.recordsByCategory.authorization_decision,
    "authorization_decision count mismatch"
  );
  assert(summary.lastSequence === 2, `expected lastSequence=2, got ${summary.lastSequence}`);

  service.reset();
  const afterReset = service.getSummary();
  assert(afterReset.totalRecords === 0, "expected zero records after reset");
  assert(afterReset.lastSequence === 0, "expected lastSequence=0 after reset");

  console.log("✓ phase3b replay summary stays consistent with snapshot and reset state");
}

run();
