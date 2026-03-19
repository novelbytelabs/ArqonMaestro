/**
 * Workflow Execution Service
 *
 * Integrates workflow contracts with Maestro-Nexus boundary.
 * Part of FP-2B: Workflow and Delegation
 *
 * This service:
 * 1. Executes workflow steps in order
 * 2. Handles pause, cancel, and confirmation
 * 3. Integrates with Nexus boundary for proposals
 * 4. Preserves Maestro's execution authority
 */

// Use console.log - can be replaced with proper logger in production
const log = (message: string): void => console.log(message);

import WorkflowContractService, {
  WorkflowContract,
  WorkflowStepContract,
  StepStatus,
  WorkflowStatus,
  StepResult,
  StepRole,
  StepFailurePolicy,
  WorkflowClass,
  WorkflowAuthorityContext,
} from "./workflow-contract-service";

import NexusProtocolBoundaryService, {
  NexusProposal,
  MaestroExecutionOutcome,
  ExecutionOutcomeStatus,
  ProposalExecutionContext,
  ProposalType,
} from "./nexus-protocol-boundary-service";

/**
 * Execution state
 */
export interface WorkflowExecutionState {
  workflowId: string;
  currentStepIndex: number;
  status: WorkflowStatus;
  startedAt: Date;
  lastUpdatedAt: Date;
}

export interface WorkflowStepExecutionContext {
  workflowId: string;
  stepIndex: number;
  totalSteps: number;
  origin: "user" | "nexus_proposal" | "macro";
  authorityContext?: WorkflowAuthorityContext;
  delegationGrantId?: string;
  proposalId?: string;
}

export interface WorkflowProposalResult {
  workflowId?: string;
  accepted: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

/**
 * Workflow execution service
 */
export default class WorkflowExecutionService {
  private workflowService: WorkflowContractService;
  private nexusBoundary: NexusProtocolBoundaryService;
  private executionState: Map<string, WorkflowExecutionState> = new Map();

  constructor(
    workflowService: WorkflowContractService,
    nexusBoundary: NexusProtocolBoundaryService
  ) {
    this.workflowService = workflowService;
    this.nexusBoundary = nexusBoundary;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    executeStep: (
      step: WorkflowStepContract,
      context: WorkflowStepExecutionContext
    ) => Promise<StepResult>
  ): Promise<void> {
    const contract = this.workflowService.getWorkflow(workflowId);
    if (!contract) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Validate first
    const validation = this.workflowService.validateWorkflow(workflowId);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
    }

    // Update status to running
    this.workflowService.updateWorkflowStatus(workflowId, WorkflowStatus.RUNNING);

    const state: WorkflowExecutionState = {
      workflowId,
      currentStepIndex: 0,
      status: WorkflowStatus.RUNNING,
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
    };
    this.executionState.set(workflowId, state);

    const stepResults: StepResult[] = [];
    const startTime = Date.now();

    try {
      for (let i = 0; i < contract.steps.length; i++) {
        state.currentStepIndex = i;
        state.lastUpdatedAt = new Date();

        const step = contract.steps[i];
        log(`Executing step ${i + 1}/${contract.steps.length}: ${step.commandVerb}`);

        // Execute the step
        const result = await executeStep(step, {
          workflowId,
          stepIndex: i,
          totalSteps: contract.steps.length,
          origin: contract.origin,
          authorityContext: contract.authorityContext,
          delegationGrantId: contract.delegationGrantId,
          proposalId: contract.proposalId,
        });
        stepResults.push(result);

        // Check if we should continue
        if (result.status === StepStatus.HARD_FAILED) {
          if (contract.executionPolicy.stopOnFirstFailure) {
            log(`Step failed, stopping workflow: ${step.stepId}`);
            break;
          }
        }

        if (result.status === StepStatus.SOFT_FAILED) {
          if (!contract.executionPolicy.continueOnSoftFailure) {
            log(`Step soft-failed, stopping workflow: ${step.stepId}`);
            break;
          }
        }
      }

      // Calculate elapsed time
      const elapsedMs = Date.now() - startTime;

      // Create workflow result
      const { createWorkflowResult } = await import("./workflow-contract-service");
      const workflowResult = createWorkflowResult(contract, stepResults, elapsedMs);

      // Update workflow status
      this.workflowService.updateWorkflowStatus(workflowId, workflowResult.finalStatus);
      this.workflowService.storeWorkflowResult(workflowResult);

      // Emit outcome to Nexus
      this.emitWorkflowOutcome(contract, workflowResult);

      log(`Workflow completed: ${workflowId} - ${workflowResult.finalStatus}`);
    } catch (error) {
      log(`Workflow error: ${workflowId} - ${error}`);
      this.workflowService.updateWorkflowStatus(workflowId, WorkflowStatus.FAILED);
      throw error;
    }
  }

  /**
   * Pause workflow execution
   */
  pauseWorkflow(workflowId: string): boolean {
    const state = this.executionState.get(workflowId);
    if (!state || state.status !== WorkflowStatus.RUNNING) {
      return false;
    }

    state.status = WorkflowStatus.AWAITING_CONFIRMATION;
    this.workflowService.updateWorkflowStatus(
      workflowId,
      WorkflowStatus.AWAITING_CONFIRMATION
    );

    log(`Workflow paused: ${workflowId}`);
    return true;
  }

  /**
   * Resume workflow execution
   */
  resumeWorkflow(workflowId: string): boolean {
    const state = this.executionState.get(workflowId);
    if (!state || state.status !== WorkflowStatus.AWAITING_CONFIRMATION) {
      return false;
    }

    state.status = WorkflowStatus.RUNNING;
    this.workflowService.updateWorkflowStatus(workflowId, WorkflowStatus.RUNNING);

    log(`Workflow resumed: ${workflowId}`);
    return true;
  }

  /**
   * Cancel workflow execution
   */
  cancelWorkflow(workflowId: string): boolean {
    const state = this.executionState.get(workflowId);
    if (!state) {
      return this.workflowService.cancelWorkflow(workflowId);
    }

    const cancelled = this.workflowService.cancelWorkflow(workflowId);
    if (cancelled) {
      state.status = WorkflowStatus.CANCELLED;
      log(`Workflow cancelled: ${workflowId}`);
    }
    return cancelled;
  }

  /**
   * Process Nexus proposal into workflow
   */
  processNexusProposal(
    proposal: NexusProposal,
    context?: ProposalExecutionContext
  ): WorkflowProposalResult {
    // Process through Nexus boundary
    const result = this.nexusBoundary.processNexusProposal(proposal, context);

    if (!result.accepted) {
      return {
        accepted: false,
        reason: result.reason,
        requiresConfirmation: result.requiresConfirmation,
      };
    }

    // If it's a workflow proposal, create workflow
    if (
      proposal.proposalType === ProposalType.PROPOSED_WORKFLOW &&
      proposal.proposedWorkflow?.steps
    ) {
      const steps = proposal.proposedWorkflow.steps.map(
        (step, index): Omit<WorkflowStepContract, "stepId" | "status"> => ({
          orderIndex: index,
          commandVerb: step.commandVerb,
          commandFamily: step.commandFamily,
          commandTarget: step.target,
          stepRole: index === 0 ? StepRole.PRIMARY_ACTION : StepRole.CONTEXT_REVEAL,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        })
      );

      const workflow = this.workflowService.createWorkflow(
        `Nexus proposal: ${proposal.requestedIntent}`,
        WorkflowClass.NAMED_MACRO,
        steps,
        {
          origin: "nexus_proposal",
          proposalId: proposal.proposalId,
          delegationGrantId: proposal.delegationGrantId,
          authorityContext: context,
        }
      );

      return {
        workflowId: workflow.workflowId,
        accepted: true,
        requiresConfirmation: result.requiresConfirmation,
      };
    }

    return {
      accepted: true,
      requiresConfirmation: result.requiresConfirmation,
    };
  }

  /**
   * Emit workflow outcome to Nexus
   */
  private emitWorkflowOutcome(
    contract: WorkflowContract,
    result: { finalStatus: WorkflowStatus; elapsedMs: number }
  ): void {
    let status: ExecutionOutcomeStatus;

    switch (result.finalStatus) {
      case WorkflowStatus.COMPLETED:
        status = ExecutionOutcomeStatus.EXECUTED;
        break;
      case WorkflowStatus.FAILED:
      case WorkflowStatus.PARTIAL_SUCCESS:
        status = ExecutionOutcomeStatus.FAILED;
        break;
      case WorkflowStatus.CANCELLED:
        status = ExecutionOutcomeStatus.REFUSED;
        break;
      default:
        status = ExecutionOutcomeStatus.FAILED;
    }

    const outcome: MaestroExecutionOutcome = {
      executionId: contract.workflowId,
      source: contract.origin === "nexus_proposal" ? "nexus_proposal" : "macro",
      commandOrWorkflowId: contract.workflowId,
      status,
      policyDecision: `workflow_origin_${contract.origin}_risk_${contract.riskLevel}`,
      confirmationApplied: contract.confirmationPolicy !== "none",
      chooserApplied: contract.chooserPolicy !== "disallow_chooser_inside_workflow",
      elapsedMs: result.elapsedMs,
    };

    this.nexusBoundary.emitExecutionOutcome(outcome);
  }

  /**
   * Get execution state
   */
  getExecutionState(workflowId: string): WorkflowExecutionState | undefined {
    return this.executionState.get(workflowId);
  }

  /**
   * Get current step
   */
  getCurrentStep(workflowId: string): WorkflowStepContract | undefined {
    const state = this.executionState.get(workflowId);
    const contract = this.workflowService.getWorkflow(workflowId);

    if (!state || !contract) return undefined;

    return contract.steps[state.currentStepIndex];
  }
}

/**
 * Create integrated workflow+nexus service
 */
export function createWorkflowNexusService(): {
  workflowService: WorkflowContractService;
  nexusBoundary: NexusProtocolBoundaryService;
  executionService: WorkflowExecutionService;
} {
  const workflowService = new WorkflowContractService();
  const nexusBoundary = new NexusProtocolBoundaryService();
  const executionService = new WorkflowExecutionService(workflowService, nexusBoundary);

  return { workflowService, nexusBoundary, executionService };
}
