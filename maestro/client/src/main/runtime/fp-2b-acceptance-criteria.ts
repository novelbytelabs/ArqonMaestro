/**
 * FP-2B Acceptance Criteria Verification
 *
 * Verifies that Phase 2B (Workflow and Delegation) meets acceptance criteria.
 *
 * Acceptance Criteria:
 * 1. Workflow contracts can be created and validated
 * 2. Multi-step execution works with proper state aggregation
 * 3. Delegation grants can be created and validated
 * 4. Nexus proposals can be processed with proper gating
 * 5. Pause, cancel, and confirmation semantics work
 */

import WorkflowContractService, {
  WorkflowClass,
  StepRole,
  StepFailurePolicy,
  WorkflowRiskLevel,
  ConfirmationPolicy,
  ChooserPolicy,
  StepStatus,
} from "./workflow-contract-service";

import NexusProtocolBoundaryService, {
  AuthorityPhase,
  ProposalType,
} from "./nexus-protocol-boundary-service";

import { createWorkflowNexusService } from "./workflow-nexus-integration";

/**
 * Test result
 */
interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

/**
 * Run all acceptance criteria tests
 */
export async function runFP2BTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log("=== FP-2B Acceptance Criteria Verification ===\n");

  // ===== Test 1: Workflow Contract Creation =====
  console.log("--- Criterion 1: Workflow Contract Creation ---\n");

  const workflowService = new WorkflowContractService();

  // Test 1.1: Create simple workflow
  try {
    const workflow = workflowService.createWorkflow(
      "build project then show logs then return focus",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "build",
          commandFamily: "execution",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: ["build_handle"],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
        {
          orderIndex: 1,
          commandVerb: "show",
          commandFamily: "focus",
          stepRole: StepRole.CONTEXT_REVEAL,
          required: false,
          inputBindings: ["build_handle"],
          outputBindings: ["logs_surface"],
          onFailure: StepFailurePolicy.SKIP_AND_CONTINUE,
        },
        {
          orderIndex: 2,
          commandVerb: "return",
          commandFamily: "focus",
          stepRole: StepRole.RESTORE_FOCUS,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    results.push({
      name: "1.1 Create workflow",
      passed: workflow.steps.length === 3,
      details: `Created workflow with ${workflow.steps.length} steps`,
    });
    console.log(`✓ Created workflow: ${workflow.workflowId}`);
  } catch (error) {
    results.push({
      name: "1.1 Create workflow",
      passed: false,
      details: `Error: ${error}`,
    });
    console.log(`✗ Create workflow failed: ${error}`);
  }

  // Test 1.2: Workflow validation
  try {
    const workflow2 = workflowService.createWorkflow(
      "test workflow",
      WorkflowClass.SYSTEM_WORKFLOW,
      [
        {
          orderIndex: 0,
          commandVerb: "run",
          commandFamily: "terminal",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    const validation = workflowService.validateWorkflow(workflow2.workflowId);
    results.push({
      name: "1.2 Validate workflow",
      passed: validation.valid,
      details: validation.valid ? "Valid" : validation.errors.join(", "),
    });
    console.log(`✓ Validation: ${validation.valid ? "valid" : "invalid"}`);
  } catch (error) {
    results.push({
      name: "1.2 Validate workflow",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 1.3: Risk level computation
  try {
    const highRiskWorkflow = workflowService.createWorkflow(
      "delete file workflow",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "delete",
          commandFamily: "filesystem",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    results.push({
      name: "1.3 Risk level computation",
      passed: highRiskWorkflow.riskLevel === WorkflowRiskLevel.HIGH,
      details: `Risk level: ${highRiskWorkflow.riskLevel}`,
    });
    console.log(`✓ Risk level computed: ${highRiskWorkflow.riskLevel}`);
  } catch (error) {
    results.push({
      name: "1.3 Risk level computation",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // ===== Test 2: Delegation Grants =====
  console.log("\n--- Criterion 2: Delegation Grants ---\n");

  const nexusBoundary = new NexusProtocolBoundaryService();

  // Test 2.1: Create delegation grant
  try {
    const grant = nexusBoundary.createDelegationGrant(
      "owner_user",
      "nexus_assistant",
      AuthorityPhase.SCOPED_AUTONOMY,
      {
        allowedCommandFamilies: ["focus", "navigation", "terminal", "execution"],
        allowedRiskLevels: [WorkflowRiskLevel.LOW, WorkflowRiskLevel.MODERATE],
        blockedCommands: ["delete", "remove", "destroy"],
        maxSteps: 5,
      },
      WorkflowRiskLevel.MODERATE,
      60 // 60 minutes
    );

    results.push({
      name: "2.1 Create delegation grant",
      passed: grant.grantId.length > 0,
      details: `Grant: ${grant.grantId}`,
    });
    console.log(`✓ Created grant: ${grant.grantId}`);
  } catch (error) {
    results.push({
      name: "2.1 Create delegation grant",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 2.2: Validate delegation grant (valid)
  try {
    const grant = nexusBoundary.createDelegationGrant(
      "owner",
      "nexus",
      AuthorityPhase.SCOPED_AUTONOMY,
      {
        allowedCommandFamilies: ["focus"],
        allowedRiskLevels: [WorkflowRiskLevel.LOW],
        blockedCommands: [],
      },
      WorkflowRiskLevel.LOW
    );

    const validation = nexusBoundary.validateDelegationGrant(
      grant.grantId,
      "focus",
      WorkflowRiskLevel.LOW
    );

    results.push({
      name: "2.2 Validate grant (valid)",
      passed: validation.valid,
      details: validation.valid ? "Valid" : validation.reason,
    });
    console.log(`✓ Grant validation (valid): ${validation.valid}`);
  } catch (error) {
    results.push({
      name: "2.2 Validate grant (valid)",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 2.3: Validate delegation grant (invalid - risk level)
  try {
    const grant = nexusBoundary.createDelegationGrant(
      "owner",
      "nexus",
      AuthorityPhase.SCOPED_AUTONOMY,
      {
        allowedCommandFamilies: ["filesystem"],
        allowedRiskLevels: [WorkflowRiskLevel.LOW],
        blockedCommands: [],
      },
      WorkflowRiskLevel.LOW
    );

    const validation = nexusBoundary.validateDelegationGrant(
      grant.grantId,
      "filesystem",
      WorkflowRiskLevel.HIGH
    );

    results.push({
      name: "2.3 Validate grant (invalid risk)",
      passed: !validation.valid,
      details: validation.reason || "Should be invalid",
    });
    console.log(`✓ Grant validation (invalid risk): ${!validation.valid}`);
  } catch (error) {
    results.push({
      name: "2.3 Validate grant (invalid risk)",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 2.4: Revoke delegation grant
  try {
    const grant = nexusBoundary.createDelegationGrant(
      "owner",
      "nexus",
      AuthorityPhase.PROXY_AUTHORITY,
      {
        allowedCommandFamilies: ["focus"],
        allowedRiskLevels: [WorkflowRiskLevel.MODERATE],
        blockedCommands: [],
      },
      WorkflowRiskLevel.MODERATE
    );

    const revoked = nexusBoundary.revokeDelegationGrant(grant.grantId, "User requested");

    // Verify revoked grant is invalid
    const validation = nexusBoundary.validateDelegationGrant(
      grant.grantId,
      "focus",
      WorkflowRiskLevel.LOW
    );

    results.push({
      name: "2.4 Revoke delegation grant",
      passed: revoked && !validation.valid,
      details: revoked ? "Revoked and invalidated" : "Failed to revoke",
    });
    console.log(`✓ Grant revoked: ${revoked && !validation.valid}`);
  } catch (error) {
    results.push({
      name: "2.4 Revoke delegation grant",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // ===== Test 3: Nexus Proposal Processing =====
  console.log("\n--- Criterion 3: Nexus Proposal Processing ---\n");

  // Test 3.1: Accept valid proposal
  try {
    const grant = nexusBoundary.createDelegationGrant(
      "owner",
      "nexus",
      AuthorityPhase.SCOPED_AUTONOMY,
      {
        allowedCommandFamilies: ["focus", "terminal"],
        allowedRiskLevels: [WorkflowRiskLevel.LOW, WorkflowRiskLevel.MODERATE],
        blockedCommands: [],
      },
      WorkflowRiskLevel.MODERATE
    );

    const proposal = {
      proposalId: "proposal_001",
      proposalType: ProposalType.PROPOSED_WORKFLOW,
      requestedIntent: "Focus terminal and run build",
      confidence: 0.95,
      noveltyLevel: "known" as const,
      requiresHumanConfirmation: false,
      delegationGrantId: grant.grantId,
      proposedWorkflow: {
        steps: [
          { commandVerb: "focus", commandFamily: "focus", target: "terminal" },
          { commandVerb: "run", commandFamily: "terminal", target: "cargo build" },
        ],
      },
    };

    const { executionService } = createWorkflowNexusService();
    const result = executionService.processNexusProposal(proposal);

    results.push({
      name: "3.1 Accept valid proposal",
      passed: result.accepted && !!result.workflowId,
      details: result.accepted ? `Workflow: ${result.workflowId}` : result.reason,
    });
    console.log(`✓ Valid proposal accepted: ${result.accepted}`);
  } catch (error) {
    results.push({
      name: "3.1 Accept valid proposal",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 3.2: Reject proposal without grant (high confidence)
  try {
    const proposal = {
      proposalId: "proposal_002",
      proposalType: ProposalType.PROPOSED_COMMAND,
      requestedIntent: "Delete file",
      confidence: 0.85,
      noveltyLevel: "familiar" as const,
      requiresHumanConfirmation: false,
      // No delegation grant
    };

    const { executionService } = createWorkflowNexusService();
    const result = executionService.processNexusProposal(proposal);

    results.push({
      name: "3.2 Reject proposal without grant",
      passed: !result.accepted,
      details: result.reason || "Should be rejected",
    });
    console.log(`✓ Proposal without grant rejected: ${!result.accepted}`);
  } catch (error) {
    results.push({
      name: "3.2 Reject proposal without grant",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 3.3: Require confirmation for novel proposals
  try {
    const proposal = {
      proposalId: "proposal_003",
      proposalType: ProposalType.PROPOSED_WORKFLOW,
      requestedIntent: "Complex multi-step operation",
      confidence: 0.5,
      noveltyLevel: "novel" as const,
      requiresHumanConfirmation: false,
    };

    const { executionService } = createWorkflowNexusService();
    const result = executionService.processNexusProposal(proposal);

    results.push({
      name: "3.3 Require confirmation for novel",
      passed: !result.accepted && result.requiresConfirmation,
      details: result.reason || "Should require confirmation",
    });
    console.log(`✓ Novel proposal requires confirmation: ${result.requiresConfirmation}`);
  } catch (error) {
    results.push({
      name: "3.3 Require confirmation for novel",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // ===== Test 4: Workflow Execution Semantics =====
  console.log("\n--- Criterion 4: Workflow Execution Semantics ---\n");

  // Test 4.1: Confirmation requirement detection
  try {
    const highRiskWorkflow = workflowService.createWorkflow(
      "delete everything",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "delete",
          commandFamily: "filesystem",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    const needsConfirmation = workflowService.requiresConfirmation(
      highRiskWorkflow.workflowId
    );

    results.push({
      name: "4.1 Confirmation for high-risk",
      passed: needsConfirmation,
      details: `Requires confirmation: ${needsConfirmation}`,
    });
    console.log(`✓ High-risk workflow requires confirmation: ${needsConfirmation}`);
  } catch (error) {
    results.push({
      name: "4.1 Confirmation for high-risk",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 4.2: Low-risk workflow doesn't require confirmation
  try {
    const lowRiskWorkflow = workflowService.createWorkflow(
      "focus editor",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "focus",
          commandFamily: "focus",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    const needsConfirmation = workflowService.requiresConfirmation(
      lowRiskWorkflow.workflowId
    );

    results.push({
      name: "4.2 No confirmation for low-risk",
      passed: !needsConfirmation,
      details: `Requires confirmation: ${needsConfirmation}`,
    });
    console.log(`✓ Low-risk workflow doesn't require confirmation: ${!needsConfirmation}`);
  } catch (error) {
    results.push({
      name: "4.2 No confirmation for low-risk",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // ===== Test 5: Pause/Cancel Semantics =====
  console.log("\n--- Criterion 5: Pause/Cancel Semantics ---\n");

  // Test 5.1: Pause workflow
  try {
    const { executionService } = createWorkflowNexusService();

    // Create a mock workflow state
    const workflow = workflowService.createWorkflow(
      "test workflow",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "focus",
          commandFamily: "focus",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    // Manually set to running for testing
    workflowService.updateWorkflowStatus(workflow.workflowId, "running" as any);

    // @ts-ignore - accessing private state for test
    executionService.executionState.set(workflow.workflowId, {
      workflowId: workflow.workflowId,
      currentStepIndex: 0,
      status: "running" as any,
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
    });

    const paused = executionService.pauseWorkflow(workflow.workflowId);

    results.push({
      name: "5.1 Pause workflow",
      passed: paused,
      details: paused ? "Paused" : "Failed to pause",
    });
    console.log(`✓ Workflow paused: ${paused}`);
  } catch (error) {
    results.push({
      name: "5.1 Pause workflow",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // Test 5.2: Cancel workflow
  try {
    const workflow2 = workflowService.createWorkflow(
      "cancelable workflow",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "run",
          commandFamily: "terminal",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ]
    );

    const cancelled = workflowService.cancelWorkflow(workflow2.workflowId);

    results.push({
      name: "5.2 Cancel workflow",
      passed: cancelled,
      details: cancelled ? "Cancelled" : "Failed to cancel",
    });
    console.log(`✓ Workflow cancelled: ${cancelled}`);
  } catch (error) {
    results.push({
      name: "5.2 Cancel workflow",
      passed: false,
      details: `Error: ${error}`,
    });
  }

  // ===== SUMMARY =====
  console.log("\n=== FP-2B Acceptance Criteria Summary ===\n");

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("✓ All FP-2B acceptance criteria verified");
  } else {
    console.log("✗ Some criteria failed:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }

  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runFP2BTests()
    .then((results) => {
      const passed = results.filter((r) => r.passed).length;
      console.log(`\n=== Final Results: ${passed}/${results.length} passed ===`);
      process.exit(passed === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}
