/**
 * Workflow Contract Service
 *
 * Compiles lawful multi-step workflow contracts into governed execution plans.
 * Part of FP-2B: Workflow and Delegation
 *
 * This service:
 * 1. Defines workflow and step contracts
 * 2. Manages workflow execution state
 * 3. Handles preconditions, postconditions, and rollback
 * 4. Aggregates step results into workflow results
 */

// Use console.log - can be replaced with proper logger in production
const log = (message: string): void => console.log(message);

/**
 * Workflow classes
 */
export enum WorkflowClass {
  INLINE_CHAIN = "inline_chain",
  NAMED_MACRO = "named_macro",
  PARAMETERIZED_MACRO = "parameterized_macro",
  SYSTEM_WORKFLOW = "system_workflow",
}

/**
 * Source types
 */
export enum WorkflowSourceType {
  SPOKEN_CHAIN = "spoken_chain",
  STORED_MACRO = "stored_macro",
  STORED_MACRO_WITH_SLOTS = "stored_macro_with_slots",
  INTERNAL_EXPANSION = "internal_expansion",
}

/**
 * Workflow status
 */
export enum WorkflowStatus {
  CREATED = "created",
  VALIDATED = "validated",
  AWAITING_CONFIRMATION = "awaiting_confirmation",
  RUNNING = "running",
  PARTIAL_SUCCESS = "partial_success",
  FAILED = "failed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * Step status
 */
export enum StepStatus {
  PENDING = "pending",
  RUNNING = "running",
  SUCCEEDED = "succeeded",
  SOFT_FAILED = "soft_failed",
  HARD_FAILED = "hard_failed",
  CANCELLED = "cancelled",
  SKIPPED = "skipped",
  ROLLED_BACK = "rolled_back",
}

/**
 * Risk levels
 */
export enum WorkflowRiskLevel {
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
  PRIVILEGED = "privileged",
}

/**
 * Step role
 */
export enum StepRole {
  PRIMARY_ACTION = "primary_action",
  SETUP = "setup",
  FOCUS_CAPTURE = "focus_capture",
  CONTEXT_REVEAL = "context_reveal",
  CLEANUP = "cleanup",
  RESTORE_FOCUS = "restore_focus",
  RECOVERY_STEP = "recovery_step",
}

/**
 * Failure policy
 */
export enum StepFailurePolicy {
  ABORT_WORKFLOW = "abort_workflow",
  SKIP_AND_CONTINUE = "skip_and_continue",
  CHOOSER_THEN_RETRY = "chooser_then_retry",
  SLOT_PROMPT_THEN_RETRY = "slot_prompt_then_retry",
  RUN_RECOVERY_STEP = "run_recovery_step",
  ESCALATE_TO_USER = "escalate_to_user",
}

/**
 * Confirmation policy
 */
export enum ConfirmationPolicy {
  NONE = "none",
  PREFLIGHT = "preflight",
  PER_STEP = "per_step",
  POLICY_DRIVEN = "policy_driven",
}

/**
 * Chooser policy
 */
export enum ChooserPolicy {
  DISALLOW_CHOOSER = "disallow_chooser_inside_workflow",
  ALLOW_CHOOSER_AND_RESUME = "allow_chooser_and_resume",
  ALLOW_CHOOSER_ONCE_THEN_ABORT = "allow_chooser_once_then_abort",
  CHOOSER_REQUIRED_FOR_AMBIGUOUS = "inline_chooser_required_for_ambiguous_steps",
}

/**
 * Execution mode
 */
export enum ExecutionMode {
  VISIBLE_SEQUENTIAL = "visible_sequential",
  BOUND_SEQUENTIAL = "bound_sequential",
  MIXED = "mixed",
}

/**
 * Focus policy
 */
export enum FocusPolicy {
  PRESERVE_IF_POSSIBLE = "preserve_if_possible",
  ALLOW_TEMPORARY_SHIFT = "allow_temporary_shift",
  NO_VISIBLE_SHIFT = "no_visible_shift",
  EXPLICIT_SHIFT_REQUIRED = "explicit_shift_required",
}

/**
 * Rollback scope
 */
export enum RollbackScope {
  NONE = "none",
  FOCUS_ONLY = "focus_only",
  REVERSIBLE_STEPS_ONLY = "reversible_steps_only",
  WORKFLOW_DEFINED = "workflow_defined",
}

/**
 * Execution policy
 */
export interface ExecutionPolicy {
  executionMode: ExecutionMode;
  focusPolicy: FocusPolicy;
  allowBackground: boolean;
  stopOnFirstFailure: boolean;
  continueOnSoftFailure: boolean;
}

/**
 * Rollback policy
 */
export interface RollbackPolicy {
  supportsRollback: boolean;
  rollbackScope: RollbackScope;
  restoreFocusOnFailure: boolean;
  undoCompletedStepsIfPossible: boolean;
}

/**
 * Workflow step binding
 */
export interface WorkflowBinding {
  name: string;
  type: string;
  value: unknown;
}

/**
 * Workflow step contract
 */
export interface WorkflowStepContract {
  stepId: string;
  orderIndex: number;
  commandVerb: string;
  commandTarget?: string;
  commandFamily: string;
  stepRole: StepRole;
  required: boolean;
  inputBindings: string[];
  outputBindings: string[];
  onFailure: StepFailurePolicy;
  timeoutMs?: number;
  visibilityOverride?: "visible" | "bound" | "background";
  status: StepStatus;
}

/**
 * Workflow contract
 */
export interface WorkflowContract {
  workflowId: string;
  workflowClass: WorkflowClass;
  sourceType: WorkflowSourceType;
  sourceUtterance: string;
  origin: "user" | "nexus_proposal" | "macro";
  proposalId?: string;
  delegationGrantId?: string;
  authorityContext?: WorkflowAuthorityContext;
  canonicalWorkflowName?: string;
  steps: WorkflowStepContract[];
  sharedState: Map<string, WorkflowBinding>;
  preconditions: string[];
  postconditions: string[];
  riskLevel: WorkflowRiskLevel;
  executionPolicy: ExecutionPolicy;
  rollbackPolicy: RollbackPolicy;
  confirmationPolicy: ConfirmationPolicy;
  chooserPolicy: ChooserPolicy;
  status: WorkflowStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowAuthorityContext {
  securityMode: "normal" | "secure" | "restricted" | "shared_room";
  interactionMode: "command" | "dictation" | "conversation";
  identityState: string;
  speakerVerified: boolean;
  contaminated: boolean;
  identityEvidenceReady: boolean;
}

/**
 * Step result
 */
export interface StepResult {
  stepId: string;
  status: StepStatus;
  commandVerb: string;
  success: boolean;
  outputBindings: Map<string, WorkflowBinding>;
  warnings: string[];
  errorCode?: string;
  errorMessage?: string;
  elapsedMs: number;
}

/**
 * Workflow result
 */
export interface WorkflowResult {
  workflowId: string;
  finalStatus: WorkflowStatus;
  stepResults: StepResult[];
  completedStepCount: number;
  failedStepCount: number;
  skippedStepCount: number;
  rollbackApplied: boolean;
  undoRegistered: boolean;
  recoveryOptions: string[];
  elapsedMs: number;
  warnings: string[];
  finalBindings: Map<string, WorkflowBinding>;
}

/**
 * Create a new workflow contract
 */
export function createWorkflowContract(
  workflowId: string,
  sourceUtterance: string,
  workflowClass: WorkflowClass,
  steps: Omit<WorkflowStepContract, "stepId" | "status">[],
  options: {
    origin?: "user" | "nexus_proposal" | "macro";
    proposalId?: string;
    delegationGrantId?: string;
    authorityContext?: WorkflowAuthorityContext;
  } = {}
): WorkflowContract {
  const now = new Date();

  const contract: WorkflowContract = {
    workflowId,
    workflowClass,
    sourceType: WorkflowSourceType.SPOKEN_CHAIN,
    sourceUtterance,
    origin: options.origin || "user",
    proposalId: options.proposalId,
    delegationGrantId: options.delegationGrantId,
    authorityContext: options.authorityContext,
    steps: steps.map((step, index) => ({
      ...step,
      stepId: `${workflowId}_step_${index + 1}`,
      status: StepStatus.PENDING,
    })),
    sharedState: new Map(),
    preconditions: [],
    postconditions: [],
    riskLevel: WorkflowRiskLevel.MODERATE,
    executionPolicy: {
      executionMode: ExecutionMode.MIXED,
      focusPolicy: FocusPolicy.PRESERVE_IF_POSSIBLE,
      allowBackground: false,
      stopOnFirstFailure: true,
      continueOnSoftFailure: false,
    },
    rollbackPolicy: {
      supportsRollback: true,
      rollbackScope: RollbackScope.FOCUS_ONLY,
      restoreFocusOnFailure: true,
      undoCompletedStepsIfPossible: true,
    },
    confirmationPolicy: ConfirmationPolicy.POLICY_DRIVEN,
    chooserPolicy: ChooserPolicy.ALLOW_CHOOSER_AND_RESUME,
    status: WorkflowStatus.CREATED,
    createdAt: now,
  };

  log(`Created workflow contract: ${workflowId}`);
  return contract;
}

/**
 * Validate workflow contract
 */
export function validateWorkflowContract(contract: WorkflowContract): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!contract.steps || contract.steps.length === 0) {
    errors.push("Workflow must have at least one step");
  }

  // Check for duplicate step IDs
  const stepIds = new Set<string>();
  for (const step of contract.steps) {
    if (stepIds.has(step.stepId)) {
      errors.push(`Duplicate step ID: ${step.stepId}`);
    }
    stepIds.add(step.stepId);
  }

  // Check step order indices are sequential
  const sortedSteps = [...contract.steps].sort((a, b) => a.orderIndex - b.orderIndex);
  for (let i = 0; i < sortedSteps.length; i++) {
    if (sortedSteps[i].orderIndex !== i) {
      errors.push(`Step order indices must be sequential starting from 0`);
      break;
    }
  }

  // Check required fields
  for (const step of contract.steps) {
    if (!step.commandVerb) {
      errors.push(`Step ${step.stepId} missing command verb`);
    }
    if (!step.commandFamily) {
      errors.push(`Step ${step.stepId} missing command family`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Compute workflow risk level from steps
 */
export function computeWorkflowRiskLevel(steps: WorkflowStepContract[]): WorkflowRiskLevel {
  let highestRisk = WorkflowRiskLevel.LOW;

  const stepRiskMap: Record<string, WorkflowRiskLevel> = {
    filesystem: WorkflowRiskLevel.HIGH,
    file_create: WorkflowRiskLevel.HIGH,
    file_delete: WorkflowRiskLevel.HIGH,
    file_rename: WorkflowRiskLevel.HIGH,
    system: WorkflowRiskLevel.HIGH,
    settings: WorkflowRiskLevel.HIGH,
    process: WorkflowRiskLevel.HIGH,
    privileged: WorkflowRiskLevel.PRIVILEGED,
    admin: WorkflowRiskLevel.PRIVILEGED,
    security: WorkflowRiskLevel.PRIVILEGED,
    terminal: WorkflowRiskLevel.MODERATE,
    execution: WorkflowRiskLevel.MODERATE,
    build: WorkflowRiskLevel.MODERATE,
    focus: WorkflowRiskLevel.LOW,
    navigation: WorkflowRiskLevel.LOW,
    edit: WorkflowRiskLevel.MODERATE,
  };

  for (const step of steps) {
    const stepRisk = stepRiskMap[step.commandFamily] || WorkflowRiskLevel.MODERATE;
    if (stepRisk === WorkflowRiskLevel.HIGH) {
      highestRisk = WorkflowRiskLevel.HIGH;
    }
    if (stepRisk === WorkflowRiskLevel.MODERATE && highestRisk === WorkflowRiskLevel.LOW) {
      highestRisk = WorkflowRiskLevel.MODERATE;
    }
  }

  return highestRisk;
}

/**
 * Create workflow result from execution
 */
export function createWorkflowResult(
  contract: WorkflowContract,
  stepResults: StepResult[],
  elapsedMs: number
): WorkflowResult {
  const completedCount = stepResults.filter(
    (r) => r.status === StepStatus.SUCCEEDED
  ).length;
  const failedCount = stepResults.filter(
    (r) => r.status === StepStatus.HARD_FAILED || r.status === StepStatus.SOFT_FAILED
  ).length;
  const skippedCount = stepResults.filter(
    (r) => r.status === StepStatus.SKIPPED
  ).length;

  let finalStatus: WorkflowStatus;
  if (failedCount > 0) {
    finalStatus = completedCount > 0 ? WorkflowStatus.PARTIAL_SUCCESS : WorkflowStatus.FAILED;
  } else if (skippedCount > 0) {
    finalStatus = WorkflowStatus.PARTIAL_SUCCESS;
  } else {
    finalStatus = WorkflowStatus.COMPLETED;
  }

  // Aggregate final bindings from all steps
  const finalBindings = new Map<string, WorkflowBinding>();
  for (const result of stepResults) {
    if (result.outputBindings) {
      for (const [key, binding] of result.outputBindings) {
        finalBindings.set(key, binding);
      }
    }
  }

  return {
    workflowId: contract.workflowId,
    finalStatus,
    stepResults,
    completedStepCount: completedCount,
    failedStepCount: failedCount,
    skippedStepCount: skippedCount,
    rollbackApplied: false,
    undoRegistered: false,
    recoveryOptions: [],
    elapsedMs,
    warnings: [],
    finalBindings,
  };
}

/**
 * Workflow Contract Service class
 */
export default class WorkflowContractService {
  private workflows: Map<string, WorkflowContract> = new Map();
  private results: Map<string, WorkflowResult> = new Map();

  /**
   * Create a new workflow
   */
  createWorkflow(
    sourceUtterance: string,
    workflowClass: WorkflowClass,
    steps: Omit<WorkflowStepContract, "stepId" | "status">[],
    options: {
      origin?: "user" | "nexus_proposal" | "macro";
      proposalId?: string;
      delegationGrantId?: string;
      authorityContext?: WorkflowAuthorityContext;
    } = {}
  ): WorkflowContract {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contract = createWorkflowContract(
      workflowId,
      sourceUtterance,
      workflowClass,
      steps,
      options
    );

    // Compute risk level
    contract.riskLevel = computeWorkflowRiskLevel(contract.steps);

    this.workflows.set(workflowId, contract);
    log(`Workflow created: ${workflowId}, risk: ${contract.riskLevel}`);

    return contract;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowContract | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Validate a workflow
   */
  validateWorkflow(workflowId: string): { valid: boolean; errors: string[] } {
    const contract = this.workflows.get(workflowId);
    if (!contract) {
      return { valid: false, errors: ["Workflow not found"] };
    }
    return validateWorkflowContract(contract);
  }

  /**
   * Update workflow status
   */
  updateWorkflowStatus(workflowId: string, status: WorkflowStatus): void {
    const contract = this.workflows.get(workflowId);
    if (contract) {
      contract.status = status;
      if (status === WorkflowStatus.RUNNING && !contract.startedAt) {
        contract.startedAt = new Date();
      }
      if (
        status === WorkflowStatus.COMPLETED ||
        status === WorkflowStatus.FAILED ||
        status === WorkflowStatus.CANCELLED
      ) {
        contract.completedAt = new Date();
      }
    }
  }

  /**
   * Get current step index
   */
  getCurrentStepIndex(workflowId: string): number {
    const contract = this.workflows.get(workflowId);
    if (!contract) return -1;

    for (let i = 0; i < contract.steps.length; i++) {
      if (contract.steps[i].status === StepStatus.PENDING) {
        return i;
      }
    }
    return contract.steps.length - 1;
  }

  /**
   * Store workflow result
   */
  storeWorkflowResult(result: WorkflowResult): void {
    this.results.set(result.workflowId, result);
  }

  /**
   * Get workflow result
   */
  getWorkflowResult(workflowId: string): WorkflowResult | undefined {
    return this.results.get(workflowId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowContract[] {
    return Array.from(this.workflows.values()).filter(
      (w) =>
        w.status === WorkflowStatus.RUNNING ||
        w.status === WorkflowStatus.AWAITING_CONFIRMATION ||
        w.status === WorkflowStatus.CREATED
    );
  }

  /**
   * Cancel workflow
   */
  cancelWorkflow(workflowId: string): boolean {
    const contract = this.workflows.get(workflowId);
    if (!contract) return false;

    if (
      contract.status === WorkflowStatus.COMPLETED ||
      contract.status === WorkflowStatus.FAILED ||
      contract.status === WorkflowStatus.CANCELLED
    ) {
      return false;
    }

    contract.status = WorkflowStatus.CANCELLED;
    contract.completedAt = new Date();

    // Mark remaining pending steps as cancelled
    for (const step of contract.steps) {
      if (step.status === StepStatus.PENDING || step.status === StepStatus.RUNNING) {
        step.status = StepStatus.CANCELLED;
      }
    }

    log(`Workflow cancelled: ${workflowId}`);
    return true;
  }

  /**
   * Check if workflow requires confirmation
   */
  requiresConfirmation(workflowId: string): boolean {
    const contract = this.workflows.get(workflowId);
    if (!contract) return false;

    if (contract.confirmationPolicy === ConfirmationPolicy.NONE) {
      return false;
    }

    if (contract.confirmationPolicy === ConfirmationPolicy.PREFLIGHT) {
      return true;
    }

    if (contract.confirmationPolicy === ConfirmationPolicy.PER_STEP) {
      // Check if any step is high risk
      return contract.riskLevel === WorkflowRiskLevel.HIGH ||
        contract.riskLevel === WorkflowRiskLevel.PRIVILEGED;
    }

    // POLICY_DRIVEN - check risk level
    return (
      contract.riskLevel === WorkflowRiskLevel.HIGH ||
      contract.riskLevel === WorkflowRiskLevel.PRIVILEGED
    );
  }
}
