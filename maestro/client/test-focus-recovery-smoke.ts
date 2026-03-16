/**
 * Focus Recovery Smoke Tests
 *
 * FP-5A: Recovery Foundations
 *
 * Tests the FocusRecoveryService for basic functionality:
 * - Drift detection
 * - Recovery action determination
 * - Policy selection
 * - User-safe messages
 * - State management
 */

import FocusRecoveryService, {
  RecoveryReason,
  RecoveryAction,
  RecoveryPolicy,
  RecoveryResultStatus,
  DriftDetectionInput,
  VerifiedFocusState,
} from "./src/main/runtime/focus-recovery-service";
import { FocusState, FocusLayer, FocusSourceOfTruth } from "./src/main/runtime/focus-verification-service";
import { RegionKind } from "./src/main/runtime/focus-region-service";
import { ControlType, DetectionAuthority } from "./src/main/runtime/focus-precision-service";

// Test utilities
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
  console.log(`  ✓ ${message}`);
}

// Create test focus state
function createTestFocusState(partial: Partial<FocusState> = {}): FocusState {
  return {
    entity: partial.entity || "vscode",
    layer: partial.layer || FocusLayer.APPLICATION,
    sourceOfTruth: partial.sourceOfTruth || FocusSourceOfTruth.OPERATING_SYSTEM,
    timestamp: partial.timestamp || new Date().toISOString(),
    regionKind: partial.regionKind,
    regionId: partial.regionId,
    ...partial,
  };
}

// Create test precision surface
function createTestPrecisionSurface(partial: any = {}): any {
  return {
    application: partial.application || "VS Code",
    controlType: partial.controlType || ControlType.TEXT_EDITOR,
    regionKind: partial.regionKind || RegionKind.EDITOR,
    detectionAuthority: partial.detectionAuthority || DetectionAuthority.DIRECT_INTEGRATION,
    ...partial,
  };
}

// Test 1: Drift detection - no drift
async function testNoDrift() {
  console.log("\n--- Test: No Drift Detection ---");

  const service = new FocusRecoveryService();

  const input: DriftDetectionInput = {
    expectedApp: "VS Code",
    expectedRegion: RegionKind.EDITOR,
    currentFocusState: createTestFocusState({
      entity: "vscode",
    }),
    currentPrecisionSurface: createTestPrecisionSurface({
      controlType: ControlType.TEXT_EDITOR,
      regionKind: RegionKind.EDITOR,
    }),
  };

  const result = service.detectDrift(input);

  assert(!result.driftDetected, "No drift should be detected when states match");
  assertEquals(result.reason, null, "Reason should be null when no drift");
  assertEquals(result.confidence, 1.0, "Confidence should be 1.0 when no drift");

  console.log("  Result: No drift detected (expected)");
}

// Test 2: Drift detection - region mismatch
async function testRegionMismatch() {
  console.log("\n--- Test: Region Mismatch Detection ---");

  const service = new FocusRecoveryService();

  const input: DriftDetectionInput = {
    expectedApp: "VS Code",
    expectedRegion: RegionKind.EDITOR,
    currentFocusState: createTestFocusState({
      entity: "vscode",
    }),
    currentPrecisionSurface: createTestPrecisionSurface({
      controlType: ControlType.TERMINAL,
      regionKind: RegionKind.TERMINAL,
    }),
  };

  const result = service.detectDrift(input);

  assert(result.driftDetected, "Drift should be detected");
  assertEquals(result.reason, RecoveryReason.REGION_MISMATCH, "Reason should be REGION_MISMATCH");
  assert(result.confidence > 0.8, "Confidence should be > 0.8");

  console.log(`  Drift detected: ${result.reason} (expected)`);
  console.log(`  Confidence: ${result.confidence}`);
}

// Test 3: Drift detection - app mismatch
async function testAppMismatch() {
  console.log("\n--- Test: App Mismatch Detection ---");

  const service = new FocusRecoveryService();

  const input: DriftDetectionInput = {
    expectedApp: "VS Code",
    expectedRegion: RegionKind.EDITOR,
    currentFocusState: createTestFocusState({
      entity: "chrome",
    }),
    currentPrecisionSurface: createTestPrecisionSurface({
      application: "Chrome",
      controlType: ControlType.ADDRESS_BAR,
      regionKind: RegionKind.ADDRESS_BAR,
    }),
  };

  const result = service.detectDrift(input);

  assert(result.driftDetected, "Drift should be detected");
  assertEquals(result.reason, RecoveryReason.APP_MISMATCH, "Reason should be APP_MISMATCH");
  assertEquals(result.confidence, 0.95, "Confidence should be 0.95 for app mismatch");

  console.log(`  Drift detected: ${result.reason} (expected)`);
  console.log(`  Confidence: ${result.confidence}`);
}

// Test 4: Drift detection - control mismatch
async function testControlMismatch() {
  console.log("\n--- Test: Control Mismatch Detection ---");

  const service = new FocusRecoveryService();

  const input: DriftDetectionInput = {
    expectedApp: "VS Code",
    expectedRegion: RegionKind.EDITOR,
    expectedControl: createTestPrecisionSurface({
      controlType: ControlType.TEXT_EDITOR,
    }),
    currentFocusState: createTestFocusState({
      entity: "vscode",
    }),
    currentPrecisionSurface: createTestPrecisionSurface({
      controlType: ControlType.SEARCH_BOX,
      regionKind: RegionKind.SEARCH,
    }),
  };

  const result = service.detectDrift(input);

  assert(result.driftDetected, "Drift should be detected");
  assertEquals(result.reason, RecoveryReason.CONTROL_MISMATCH, "Reason should be CONTROL_MISMATCH");

  console.log(`  Drift detected: ${result.reason} (expected)`);
}

// Test 5: Drift detection - unverified state
async function testUnverifiedState() {
  console.log("\n--- Test: Unverified State Detection ---");

  const service = new FocusRecoveryService();

  const input: DriftDetectionInput = {
    expectedApp: "VS Code",
    expectedRegion: RegionKind.EDITOR,
    currentFocusState: null as any,
  };

  const result = service.detectDrift(input);

  assert(result.driftDetected, "Drift should be detected");
  assertEquals(result.reason, RecoveryReason.UNVERIFIED_STATE, "Reason should be UNVERIFIED_STATE");
  assertEquals(result.confidence, 1.0, "Confidence should be 1.0 for complete uncertainty");

  console.log(`  Drift detected: ${result.reason} (expected)`);
}

// Test 6: Policy determination
async function testPolicyDetermination() {
  console.log("\n--- Test: Policy Determination ---");

  const service = new FocusRecoveryService();

  // Test different reasons
  const testCases: { reason: RecoveryReason; expectedPolicy: RecoveryPolicy }[] = [
    { reason: RecoveryReason.APP_MISMATCH, expectedPolicy: RecoveryPolicy.RETRY_ONCE },
    { reason: RecoveryReason.REGION_MISMATCH, expectedPolicy: RecoveryPolicy.RETRY_ONCE },
    { reason: RecoveryReason.CONTROL_MISMATCH, expectedPolicy: RecoveryPolicy.RETRY_ONCE },
    { reason: RecoveryReason.CARET_MISSING, expectedPolicy: RecoveryPolicy.ABORT },
    { reason: RecoveryReason.TARGET_GONE, expectedPolicy: RecoveryPolicy.RESTORE_PREVIOUS },
    { reason: RecoveryReason.AMBIGUITY_ESCALATED, expectedPolicy: RecoveryPolicy.ABORT },
    { reason: RecoveryReason.UNVERIFIED_STATE, expectedPolicy: RecoveryPolicy.RETRY_ONCE },
  ];

  for (const { reason, expectedPolicy } of testCases) {
    const policy = service.determineRecoveryPolicy(reason);
    assertEquals(policy, expectedPolicy, `Policy for ${reason} should be ${expectedPolicy}`);
  }

  console.log("  All policy determinations correct");
}

// Test 7: Recovery action determination
async function testActionDetermination() {
  console.log("\n--- Test: Recovery Action Determination ---");

  const service = new FocusRecoveryService();

  const request = {
    targetApp: "vscode",
    targetRegion: RegionKind.EDITOR,
  };

  // Test APP_MISMATCH -> REFOCUS_APP
  let action = service.determineRecoveryAction(
    RecoveryReason.APP_MISMATCH,
    RecoveryPolicy.RETRY_ONCE,
    request
  );
  assertEquals(action, RecoveryAction.REFOCUS_APP, "APP_MISMATCH should use REFOCUS_APP");

  // Test REGION_MISMATCH -> REFOCUS_REGION
  action = service.determineRecoveryAction(
    RecoveryReason.REGION_MISMATCH,
    RecoveryPolicy.RETRY_ONCE,
    request
  );
  assertEquals(action, RecoveryAction.REFOCUS_REGION, "REGION_MISMATCH should use REFOCUS_REGION");

  // Test CONTROL_MISMATCH -> REFOCUS_CONTROL
  action = service.determineRecoveryAction(
    RecoveryReason.CONTROL_MISMATCH,
    RecoveryPolicy.RETRY_ONCE,
    request
  );
  assertEquals(action, RecoveryAction.REFOCUS_CONTROL, "CONTROL_MISMATCH should use REFOCUS_CONTROL");

  // Test CARET_MISSING -> ABORT
  action = service.determineRecoveryAction(
    RecoveryReason.CARET_MISSING,
    RecoveryPolicy.ABORT,
    request
  );
  assertEquals(action, RecoveryAction.ABORT, "CARET_MISSING should use ABORT");

  console.log("  All action determinations correct");
}

// Test 8: User-safe messages
async function testUserSafeMessages() {
  console.log("\n--- Test: User-Safe Messages ---");

  const service = new FocusRecoveryService();

  const reasons: RecoveryReason[] = [
    RecoveryReason.APP_MISMATCH,
    RecoveryReason.WINDOW_MISMATCH,
    RecoveryReason.REGION_MISMATCH,
    RecoveryReason.CONTROL_MISMATCH,
    RecoveryReason.CARET_MISSING,
    RecoveryReason.TARGET_GONE,
    RecoveryReason.AMBIGUITY_ESCALATED,
    RecoveryReason.UNVERIFIED_STATE,
  ];

  for (const reason of reasons) {
    const message = service.getAbortUserMessage(reason);
    assert(message.length > 0, `User message for ${reason} should not be empty`);
    assert(message.length < 200, `User message for ${reason} should be reasonably short`);
    console.log(`  ${reason}: ${message.substring(0, 60)}...`);
  }

  console.log("  All user-safe messages generated");
}

// Test 9: State management
async function testStateManagement() {
  console.log("\n--- Test: State Management ---");

  const service = new FocusRecoveryService();

  // Store a verified state
  const verifiedState: VerifiedFocusState = {
    application: "vscode",
    windowId: "window-1",
    region: RegionKind.EDITOR,
    timestamp: new Date().toISOString(),
    confidence: 0.95,
  };

  service.storeVerifiedState(verifiedState);

  // Retrieve and verify
  const retrieved = service.getPreviousVerifiedState();
  assert(retrieved !== null, "Previous state should not be null after storing");
  assertEquals(retrieved!.application, "vscode", "Stored application should match");
  assertEquals(retrieved!.region, RegionKind.EDITOR, "Stored region should match");

  // Clear and verify
  service.clearHistory();
  const afterClear = service.getPreviousVerifiedState();
  assert(afterClear !== null, "Previous state should still exist after clear (only history cleared)");

  console.log("  State management working correctly");
}

// Test 10: Recovery capabilities
async function testRecoveryCapabilities() {
  console.log("\n--- Test: Recovery Capabilities ---");

  const service = new FocusRecoveryService();

  // VS Code should be supported
  let caps = service.getRecoveryCapabilities("VS Code");
  assert(caps.supported, "VS Code should be supported");
  assert(caps.appRecovery, "VS Code should support app recovery");
  assert(caps.regionRecovery, "VS Code should support region recovery");
  assert(caps.supportedRegions.includes(RegionKind.EDITOR), "EDITOR should be supported");
  assert(caps.supportedRegions.includes(RegionKind.TERMINAL), "TERMINAL should be supported");

  // Chrome should be supported
  caps = service.getRecoveryCapabilities("Chrome");
  assert(caps.supported, "Chrome should be supported");
  assert(caps.supportedRegions.includes(RegionKind.ADDRESS_BAR), "ADDRESS_BAR should be supported");
  assert(caps.supportedRegions.includes(RegionKind.PAGE), "PAGE should be supported");

  // Unknown app should not be supported
  caps = service.getRecoveryCapabilities("Unknown App");
  assert(!caps.supported, "Unknown app should not be supported");

  console.log("  Recovery capabilities correct for all test cases");
}

// Test 11: Full recovery flow
async function testFullRecoveryFlow() {
  console.log("\n--- Test: Full Recovery Flow ---");

  const service = new FocusRecoveryService();

  // Store verified state first
  const verifiedState: VerifiedFocusState = {
    application: "vscode",
    windowId: "window-1",
    region: RegionKind.EDITOR,
    timestamp: new Date().toISOString(),
    confidence: 0.95,
  };
  service.storeVerifiedState(verifiedState);

  // Simulate a recovery scenario: region mismatch
  const input: DriftDetectionInput = {
    expectedApp: "VS Code",
    expectedRegion: RegionKind.EDITOR,
    currentFocusState: createTestFocusState({
      entity: "vscode",
    }),
    currentPrecisionSurface: createTestPrecisionSurface({
      controlType: ControlType.TERMINAL,
      regionKind: RegionKind.TERMINAL,
    }),
  };

  const telemetry = await service.performRecovery(input);

  assert(telemetry.driftDetected, "Drift should be detected");
  assertEquals(telemetry.reason, RecoveryReason.REGION_MISMATCH, "Reason should be REGION_MISMATCH");
  assertEquals(telemetry.action, RecoveryAction.REFOCUS_REGION, "Action should be REFOCUS_REGION");
  assertEquals(telemetry.policy, RecoveryPolicy.RETRY_ONCE, "Policy should be RETRY_ONCE");
  assert(telemetry.attempts.length > 0, "Should have at least one attempt");
  assert(telemetry.finalConfidence > 0, "Final confidence should be > 0");

  console.log(`  Drift: ${telemetry.driftDetected}`);
  console.log(`  Reason: ${telemetry.reason}`);
  console.log(`  Action: ${telemetry.action}`);
  console.log(`  Policy: ${telemetry.policy}`);
  console.log(`  Result: ${telemetry.result}`);
  console.log(`  Final confidence: ${telemetry.finalConfidence}`);
}

// Main test runner
async function runTests() {
  console.log("========================================");
  console.log("Focus Recovery Smoke Tests (FP-5A)");
  console.log("========================================");

  try {
    await testNoDrift();
    await testRegionMismatch();
    await testAppMismatch();
    await testControlMismatch();
    await testUnverifiedState();
    await testPolicyDetermination();
    await testActionDetermination();
    await testUserSafeMessages();
    await testStateManagement();
    await testRecoveryCapabilities();
    await testFullRecoveryFlow();

    console.log("\n========================================");
    console.log("All tests passed!");
    console.log("========================================");
  } catch (error) {
    console.error("\n========================================");
    console.error("Test failed:");
    console.error(error);
    console.log("========================================");
    process.exit(1);
  }
}

// Run tests
runTests();
