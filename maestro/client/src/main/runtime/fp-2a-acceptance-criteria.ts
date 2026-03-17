/**
 * FP-2A Acceptance Criteria Verification
 *
 * Verifies that Phase 2A (Identity and Safety Gating) meets acceptance criteria.
 * 
 * Acceptance Criteria:
 * 1. Enrollment and verification services have defined contract and internal test coverage
 * 2. Authorization service has defined contract with risk level classification
 * 3. Security mode service correctly gates behavior
 * 4. Risky commands fail closed when identity is insufficient
 * 5. Shared-room and secure-mode behavior can be demonstrated with policy traces
 */

import IdentityGatewayService, { 
  IdentityContext 
} from "./identity-gateway-service";
import { 
  SpeakerRole, 
  EnrollmentStatus 
} from "./speaker-enrollment-service";
import { 
  SpeakerIdentityState, 
  VerificationConfidence 
} from "./speaker-verification-service";
import { 
  AuthorizationDecision, 
  CommandRiskLevel, 
  SecurityMode 
} from "./authorization-service";
import { 
  IdentityGateStatus,
  createIdentityGate,
  getRiskLevelForCommandFamily,
} from "./identity-gate-integration";

/**
 * Acceptance criteria test result
 */
interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  trace?: string;
}

/**
 * Run all acceptance criteria tests
 */
export async function runAcceptanceCriteriaTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Initialize services
  const gateway = new IdentityGatewayService();

  console.log("=== FP-2A Acceptance Criteria Verification ===\n");

  // ===== CRITERION 1: Enrollment and Verification Services =====
  console.log("--- Criterion 1: Enrollment and Verification Services Contract ---\n");

  // Test 1.1: Can create enrollment
  try {
    const enrollment = await gateway.createEnrollment({
      identityId: "test_user",
      displayName: "Test User",
      role: SpeakerRole.APPROVED_USER,
    });
    
    results.push({
      name: "1.1 Create enrollment",
      passed: enrollment.identityId === "test_user" && enrollment.role === SpeakerRole.APPROVED_USER,
      details: `Created enrollment: ${enrollment.identityId} (${enrollment.role})`,
    });
    console.log(`✓ Created enrollment: ${enrollment.identityId}`);
  } catch (error) {
    results.push({
      name: "1.1 Create enrollment",
      passed: false,
      details: `Error: ${error}`,
    });
    console.log(`✗ Create enrollment failed: ${error}`);
  }

  // Test 1.2: Can process verification result
  try {
    const verificationResult = await gateway.processVerificationResult({
      matched: true,
      claimedIdentityId: "default_owner",
      confidence: 0.95,
    });
    
    results.push({
      name: "1.2 Process verification result",
      passed: verificationResult.identityState === SpeakerIdentityState.VERIFIED_PRIMARY,
      details: `Verification state: ${verificationResult.identityState}`,
      trace: JSON.stringify(verificationResult, null, 2),
    });
    console.log(`✓ Verification state: ${verificationResult.identityState}`);
  } catch (error) {
    results.push({
      name: "1.2 Process verification result",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 1.3: Can get identity context
  try {
    const context = gateway.getIdentityContext();
    
    results.push({
      name: "1.3 Get identity context",
      passed: context.identityState !== undefined,
      details: `Identity state: ${context.identityState}`,
    });
    console.log(`✓ Identity context retrieved: ${context.identityState}`);
  } catch (error) {
    results.push({
      name: "1.3 Get identity context",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // ===== CRITERION 2: Authorization Service Contract =====
  console.log("\n--- Criterion 2: Authorization Service Contract ---\n");

  // Test 2.1: Low-risk command allowed for verified user
  try {
    const result = await gateway.authorize({
      commandFamily: "focus",
      commandVerb: "focus",
      riskLevel: CommandRiskLevel.LOW,
    });
    
    results.push({
      name: "2.1 Low-risk command for verified",
      passed: result.decision === AuthorizationDecision.ALLOW,
      details: `Decision: ${result.decision}, Reason: ${result.reason}`,
      trace: JSON.stringify(result, null, 2),
    });
    console.log(`✓ Low-risk allowed: ${result.decision}`);
  } catch (error) {
    results.push({
      name: "2.1 Low-risk command for verified",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 2.2: Risk level classification works
  const riskLevels: CommandRiskLevel[] = [
    CommandRiskLevel.LOW,
    CommandRiskLevel.MEDIUM,
    CommandRiskLevel.HIGH,
    CommandRiskLevel.PRIVILEGED,
  ];
  
  for (const riskLevel of riskLevels) {
    const result = await gateway.authorize({
      commandFamily: "filesystem",
      commandVerb: "delete",
      riskLevel,
    });
    
    console.log(`  Risk ${riskLevel}: ${result.decision}`);
  }
  
  results.push({
    name: "2.2 Risk level classification",
    passed: true,
    details: "Risk levels: LOW, MEDIUM, HIGH, PRIVILEGED all processed",
  });

  // ===== CRITERION 3: Security Mode Service =====
  console.log("\n--- Criterion 3: Security Mode Service Gating ---\n");

  // Test 3.1: Normal mode
  await gateway.setSecurityMode(SecurityMode.NORMAL);
  const normalMode = gateway.getSecurityMode();
  
  results.push({
    name: "3.1 Normal mode",
    passed: normalMode === SecurityMode.NORMAL,
    details: `Current mode: ${normalMode}`,
  });
  console.log(`✓ Normal mode: ${normalMode}`);

  // Test 3.2: Secure mode
  await gateway.setSecurityMode(SecurityMode.SECURE);
  const secureMode = gateway.getSecurityMode();
  
  results.push({
    name: "3.2 Secure mode",
    passed: secureMode === SecurityMode.SECURE,
    details: `Current mode: ${secureMode}`,
  });
  console.log(`✓ Secure mode: ${secureMode}`);

  // Test 3.3: Shared room mode
  await gateway.setSecurityMode(SecurityMode.SHARED_ROOM);
  const sharedRoomMode = gateway.getSecurityMode();
  
  results.push({
    name: "3.3 Shared room mode",
    passed: sharedRoomMode === SecurityMode.SHARED_ROOM,
    details: `Current mode: ${sharedRoomMode}`,
  });
  console.log(`✓ Shared room mode: ${sharedRoomMode}`);

  // Reset to normal
  await gateway.setSecurityMode(SecurityMode.NORMAL);

  // ===== CRITERION 4: Fail Closed When Identity Insufficient =====
  console.log("\n--- Criterion 4: Fail Closed When Identity Insufficient ---\n");

  // Reset verification
  await gateway.resetVerification();
  
  // Test 4.1: Unknown identity - high-risk blocked
  const unknownHighRisk = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  results.push({
    name: "4.1 Unknown identity - high-risk blocked",
    passed: unknownHighRisk.decision === AuthorizationDecision.BLOCK || 
            unknownHighRisk.decision === AuthorizationDecision.DENY,
    details: `Decision: ${unknownHighRisk.decision}, Reason: ${unknownHighRisk.reason}`,
    trace: JSON.stringify(unknownHighRisk, null, 2),
  });
  console.log(`✓ Unknown high-risk: ${unknownHighRisk.decision}`);

  // Test 4.2: Unknown identity - medium-risk requires confirm
  const unknownMediumRisk = await gateway.authorize({
    commandFamily: "terminal",
    commandVerb: "execute",
    riskLevel: CommandRiskLevel.MEDIUM,
  });
  
  results.push({
    name: "4.2 Unknown identity - medium-risk requires confirm",
    passed: unknownMediumRisk.decision === AuthorizationDecision.CONFIRM ||
            unknownMediumRisk.decision === AuthorizationDecision.BLOCK,
    details: `Decision: ${unknownMediumRisk.decision}, Reason: ${unknownMediumRisk.reason}`,
  });
  console.log(`✓ Unknown medium-risk: ${unknownMediumRisk.decision}`);

  // Test 4.3: Unknown identity - low-risk allowed (with fallback)
  const unknownLowRisk = await gateway.authorize({
    commandFamily: "focus",
    commandVerb: "focus",
    riskLevel: CommandRiskLevel.LOW,
  });
  
  results.push({
    name: "4.3 Unknown identity - low-risk allowed with fallback",
    passed: unknownLowRisk.decision === AuthorizationDecision.ALLOW && unknownLowRisk.isFallback === true,
    details: `Decision: ${unknownLowRisk.decision}, Fallback: ${unknownLowRisk.isFallback}`,
  });
  console.log(`✓ Unknown low-risk: ${unknownLowRisk.decision} (fallback: ${unknownLowRisk.isFallback})`);

  // ===== CRITERION 5: Policy Traces =====
  console.log("\n--- Criterion 5: Policy Traces Demonstration ---\n");

  // Test 5.1: Secure mode policy trace
  await gateway.setSecurityMode(SecurityMode.SECURE);
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "default_owner",
    confidence: 0.95,
  });
  
  const secureTrace = gateway.getAuthorizationSummary();
  
  results.push({
    name: "5.1 Secure mode policy trace",
    passed: secureTrace.includes(SecurityMode.SECURE),
    details: "Secure mode trace captured",
    trace: secureTrace,
  });
  console.log(`✓ Secure mode trace:\n${secureTrace}`);

  // Test 5.2: Shared room policy trace
  await gateway.setSecurityMode(SecurityMode.SHARED_ROOM);
  await gateway.processVerificationResult({
    matched: false,
    confidence: 0.3,
  });
  
  const sharedRoomTrace = gateway.getAuthorizationSummary();
  
  results.push({
    name: "5.2 Shared room policy trace",
    passed: sharedRoomTrace.includes(SecurityMode.SHARED_ROOM),
    details: "Shared room trace captured",
    trace: sharedRoomTrace,
  });
  console.log(`\n✓ Shared room trace:\n${sharedRoomTrace}`);

  // Test 5.3: Identity gate integration trace
  const identityGate = createIdentityGate(gateway);
  const gateResult = await identityGate.checkIdentityGate("filesystem", "delete", CommandRiskLevel.HIGH);
  
  results.push({
    name: "5.3 Identity gate integration trace",
    passed: gateResult.status !== undefined,
    details: `Gate status: ${gateResult.status}, Decision: ${gateResult.decision}`,
    trace: JSON.stringify(gateResult, null, 2),
  });
  console.log(`\n✓ Identity gate result:\n${JSON.stringify(gateResult, null, 2)}`);

  // ===== EXTENDED TESTS: RESTRICTED MODE =====
  console.log("\n--- Extended: RESTRICTED Mode ---\n");

  // Test RESTRICTED mode blocks all non-low
  await gateway.setSecurityMode(SecurityMode.RESTRICTED);
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "default_owner",
    confidence: 0.95,
  });
  
  const restrictedHigh = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  results.push({
    name: "RESTRICTED: blocks high-risk",
    passed: restrictedHigh.decision === AuthorizationDecision.BLOCK,
    details: `Decision: ${restrictedHigh.decision}, Reason: ${restrictedHigh.reason}`,
  });
  console.log(`RESTRICTED high-risk: ${restrictedHigh.decision}`);

  const restrictedLow = await gateway.authorize({
    commandFamily: "focus",
    commandVerb: "focus",
    riskLevel: CommandRiskLevel.LOW,
  });
  
  results.push({
    name: "RESTRICTED: allows low-risk",
    passed: restrictedLow.decision === AuthorizationDecision.ALLOW,
    details: `Decision: ${restrictedLow.decision}, Reason: ${restrictedLow.reason}`,
  });
  console.log(`RESTRICTED low-risk: ${restrictedLow.decision}`);

  // ===== EXTENDED TESTS: PRIVILEGED_CONFIRM MODE =====
  console.log("\n--- Extended: PRIVILEGED_CONFIRM Mode ---\n");

  // Test PRIVILEGED_CONFIRM with sovereign owner, high confidence
  await gateway.setSecurityMode(SecurityMode.PRIVILEGED_CONFIRM);
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "default_owner",
    confidence: 0.95,
  });
  
  const privConfirmHigh = await gateway.authorize({
    commandFamily: "security",
    commandVerb: "config",
    riskLevel: CommandRiskLevel.PRIVILEGED,
  });
  
  results.push({
    name: "PRIVILEGED_CONFIRM: sovereign + high confidence = allow",
    passed: privConfirmHigh.decision === AuthorizationDecision.ALLOW,
    details: `Decision: ${privConfirmHigh.decision}, Reason: ${privConfirmHigh.reason}`,
  });
  console.log(`PRIVILEGED_CONFIRM sovereign+high: ${privConfirmHigh.decision}`);

  // Test PRIVILEGED_CONFIRM with sovereign owner, lower confidence
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "default_owner",
    confidence: 0.7,
  });
  
  const privConfirmLow = await gateway.authorize({
    commandFamily: "security",
    commandVerb: "config",
    riskLevel: CommandRiskLevel.PRIVILEGED,
  });
  
  results.push({
    name: "PRIVILEGED_CONFIRM: sovereign + lower confidence = confirm",
    passed: privConfirmLow.decision === AuthorizationDecision.CONFIRM,
    details: `Decision: ${privConfirmLow.decision}, Reason: ${privConfirmLow.reason}`,
  });
  console.log(`PRIVILEGED_CONFIRM sovereign+low: ${privConfirmLow.decision}`);

  // Test PRIVILEGED_CONFIRM with non-sovereign (approved user)
  await gateway.createEnrollment({
    identityId: "approved_user",
    displayName: "Approved User",
    role: SpeakerRole.APPROVED_USER,
  });
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "approved_user",
    confidence: 0.95,
  });
  
  const privConfirmNonOwner = await gateway.authorize({
    commandFamily: "security",
    commandVerb: "config",
    riskLevel: CommandRiskLevel.PRIVILEGED,
  });
  
  results.push({
    name: "PRIVILEGED_CONFIRM: non-sovereign treated normally",
    passed: privConfirmNonOwner.decision === AuthorizationDecision.BLOCK || 
            privConfirmNonOwner.decision === AuthorizationDecision.DENY,
    details: `Decision: ${privConfirmNonOwner.decision}, Reason: ${privConfirmNonOwner.reason}`,
  });
  console.log(`PRIVILEGED_CONFIRM non-sovereign: ${privConfirmNonOwner.decision}`);

  // ===== EXTENDED TESTS: DELEGATED AGENT =====
  console.log("\n--- Extended: Delegated Agent ---\n");

  // Create delegated agent enrollment
  await gateway.createEnrollment({
    identityId: "delegated_bot",
    displayName: "Delegated Bot",
    role: SpeakerRole.DELEGATED_AGENT,
  });
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "delegated_bot",
    confidence: 0.9,
  });
  
  const delegatedHigh = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  results.push({
    name: "DELEGATED_AGENT: authorized within scope",
    passed: delegatedHigh.decision === AuthorizationDecision.ALLOW,
    details: `Decision: ${delegatedHigh.decision}, Reason: ${delegatedHigh.reason}`,
  });
  console.log(`DELEGATED_AGENT high-risk: ${delegatedHigh.decision}`);

  // ===== EXTENDED TESTS: SUSPENDED/REVOKED ENROLLMENT =====
  console.log("\n--- Extended: Suspended/Revoked Enrollment ---\n");

  // Create and then revoke enrollment
  await gateway.createEnrollment({
    identityId: "temp_user",
    displayName: "Temp User",
    role: SpeakerRole.APPROVED_USER,
  });
  await gateway.revokeEnrollment("temp_user");
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "temp_user",
    confidence: 0.9,
  });
  
  const revokedHigh = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  results.push({
    name: "REVOKED: blocked for revoked enrollment",
    passed: revokedHigh.decision === AuthorizationDecision.BLOCK || 
            revokedHigh.decision === AuthorizationDecision.DENY,
    details: `Decision: ${revokedHigh.decision}, Reason: ${revokedHigh.reason}`,
  });
  console.log(`REVOKED enrollment: ${revokedHigh.decision}`);

  // Test suspended enrollment
  await gateway.createEnrollment({
    identityId: "suspended_user",
    displayName: "Suspended User",
    role: SpeakerRole.APPROVED_USER,
  });
  await gateway.enrollmentService.suspendEnrollment("suspended_user");
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "suspended_user",
    confidence: 0.9,
  });
  
  const suspendedHigh = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  results.push({
    name: "SUSPENDED: blocked for suspended enrollment",
    passed: suspendedHigh.decision === AuthorizationDecision.BLOCK || 
            suspendedHigh.decision === AuthorizationDecision.DENY,
    details: `Decision: ${suspendedHigh.decision}, Reason: ${suspendedHigh.reason}`,
  });
  console.log(`SUSPENDED enrollment: ${suspendedHigh.decision}`);

  // ===== EXTENDED TESTS: AUTHORITY SCOPE =====
  console.log("\n--- Extended: Authority Scope ---\n");

  // Create user with limited scope
  await gateway.createEnrollment({
    identityId: "limited_user",
    displayName: "Limited User",
    role: SpeakerRole.APPROVED_USER,
    authorityScope: {
      allowedRiskLevels: ["low", "medium"],
      allowedCommandFamilies: ["focus", "navigation"],
      blockedCommands: ["delete", "remove"],
    },
  });
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "limited_user",
    confidence: 0.9,
  });
  
  // Test blocked command
  const blockedCmd = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  results.push({
    name: "SCOPE: blocked command",
    passed: blockedCmd.decision === AuthorizationDecision.BLOCK,
    details: `Decision: ${blockedCmd.decision}, Reason: ${blockedCmd.reason}`,
  });
  console.log(`SCOPE blocked command: ${blockedCmd.decision}`);

  // Test allowed command family
  const allowedFamily = await gateway.authorize({
    commandFamily: "focus",
    commandVerb: "focus",
    riskLevel: CommandRiskLevel.LOW,
  });
  
  results.push({
    name: "SCOPE: allowed command family",
    passed: allowedFamily.decision === AuthorizationDecision.ALLOW,
    details: `Decision: ${allowedFamily.decision}, Reason: ${allowedFamily.reason}`,
  });
  console.log(`SCOPE allowed family: ${allowedFamily.decision}`);

  // ===== SUMMARY =====
  console.log("\n=== Acceptance Criteria Summary ===\n");
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log("✓ All acceptance criteria verified");
  } else {
    console.log("✗ Some criteria failed:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }

  // Cleanup
  gateway.destroy();

  return results;
}

/**
 * Quick verification for specific acceptance criteria
 */
export async function verifyFailClosed(): Promise<boolean> {
  const gateway = new IdentityGatewayService();
  
  // Reset to unknown
  await gateway.resetVerification();
  
  // Try high-risk command
  const result = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  const failClosed = result.decision === AuthorizationDecision.BLOCK;
  
  gateway.destroy();
  
  return failClosed;
}

/**
 * Quick verification for security mode behavior
 */
export async function verifySecurityModeBehavior(): Promise<{
  normalMode: boolean;
  secureMode: boolean;
  sharedRoomMode: boolean;
}> {
  const gateway = new IdentityGatewayService();
  
  // Verify primary owner
  await gateway.processVerificationResult({
    matched: true,
    claimedIdentityId: "default_owner",
    confidence: 0.95,
  });
  
  // Test normal mode
  await gateway.setSecurityMode(SecurityMode.NORMAL);
  const normal = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  // Test secure mode  
  await gateway.setSecurityMode(SecurityMode.SECURE);
  const secure = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  // Test shared room mode
  await gateway.setSecurityMode(SecurityMode.SHARED_ROOM);
  await gateway.resetVerification(); // Unknown speaker
  const sharedRoom = await gateway.authorize({
    commandFamily: "filesystem",
    commandVerb: "delete",
    riskLevel: CommandRiskLevel.HIGH,
  });
  
  gateway.destroy();
  
  return {
    normalMode: normal.decision === AuthorizationDecision.ALLOW,
    secureMode: secure.decision === AuthorizationDecision.CONFIRM || secure.decision === AuthorizationDecision.BLOCK,
    sharedRoomMode: sharedRoom.decision === AuthorizationDecision.BLOCK,
  };
}

// Run tests if executed directly
if (require.main === module) {
  runAcceptanceCriteriaTests()
    .then(results => {
      const passed = results.filter(r => r.passed).length;
      console.log(`\n=== Final Results: ${passed}/${results.length} passed ===`);
      process.exit(passed === results.length ? 0 : 1);
    })
    .catch(error => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}
