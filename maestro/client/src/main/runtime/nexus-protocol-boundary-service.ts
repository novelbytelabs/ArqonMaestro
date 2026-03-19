/**
 * Maestro-Nexus Protocol Boundary Service
 *
 * Implements the message boundary between Maestro and Nexus.
 * Part of FP-2B: Workflow and Delegation
 *
 * This service:
 * 1. Handles Nexus proposals and converts them to Maestro contracts
 * 2. Manages delegation grants and scope validation
 * 3. Emits structured outcomes back to Nexus
 * 4. Enforces Maestro's authority over execution
 */

// Use console.log - can be replaced with proper logger in production
const log = (message: string): void => console.log(message);

import { WorkflowRiskLevel } from "./workflow-contract-service";

/**
 * Authority phases
 */
export enum AuthorityPhase {
  ADVISORY = "advisory",
  SCOPED_AUTONOMY = "scoped_autonomy",
  PROXY_AUTHORITY = "proxy_authority",
}

/**
 * Proposal types
 */
export enum ProposalType {
  PROPOSED_COMMAND = "proposed_command",
  PROPOSED_WORKFLOW = "proposed_workflow",
  SUGGESTED_PREFERENCE = "suggested_preference",
  SUGGESTED_CONTEXT = "suggested_context",
  REMINDER_OR_NUDGE = "reminder_or_nudge",
}

/**
 * Outcome statuses
 */
export enum ExecutionOutcomeStatus {
  EXECUTED = "executed",
  BLOCKED = "blocked",
  CONFIRMATION_REQUIRED = "confirmation_required",
  CHOOSER_REQUIRED = "chooser_required",
  REFUSED = "refused",
  FAILED = "failed",
}

/**
 * Delegation scope
 */
export interface DelegationScope {
  allowedCommandFamilies: string[];
  allowedRiskLevels: WorkflowRiskLevel[];
  blockedCommands: string[];
  maxSteps?: number;
  expirationMinutes?: number;
}

/**
 * Delegation grant
 */
export interface DelegationGrant {
  grantId: string;
  grantorIdentity: string;
  grantee: string;
  authorityPhase: AuthorityPhase;
  scope: DelegationScope;
  allowedRiskLevel: WorkflowRiskLevel;
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
  revocationReason?: string;
}

/**
 * Nexus proposal
 */
export interface NexusProposal {
  proposalId: string;
  proposalType: ProposalType;
  sourceGoal?: string;
  requestedIntent: string;
  requestedScope?: string;
  confidence: number;
  authorityBasis?: string;
  rationale?: string;
  noveltyLevel: "known" | "familiar" | "novel";
  requiresHumanConfirmation: boolean;
  delegationGrantId?: string;
  proposedWorkflow?: {
    steps: Array<{
      commandVerb: string;
      commandFamily: string;
      target?: string;
      riskLevel?: WorkflowRiskLevel;
    }>;
  };
}

export interface ProposalExecutionContext {
  securityMode: "normal" | "secure" | "restricted" | "shared_room";
  interactionMode: "command" | "dictation" | "conversation";
  identityState: string;
  speakerVerified: boolean;
  contaminated: boolean;
  identityEvidenceReady: boolean;
}

/**
 * Nexus context bundle
 */
export interface NexusContextBundle {
  bundleId: string;
  userId: string;
  memoryRefs: string[];
  preferenceRefs: string[];
  activeGoalRefs: string[];
  productRefs: string[];
  delegationState?: {
    activeGrantId?: string;
    authorityPhase: AuthorityPhase;
  };
  freshness: Date;
}

/**
 * Maestro execution outcome
 */
export interface MaestroExecutionOutcome {
  executionId: string;
  source: "user" | "nexus_proposal" | "macro";
  commandOrWorkflowId: string;
  status: ExecutionOutcomeStatus;
  routeSelected?: string;
  policyDecision: string;
  confirmationApplied: boolean;
  chooserApplied: boolean;
  elapsedMs: number;
  auditRef?: string;
  refusalReason?: string;
}

/**
 * Preference training signal
 */
export enum PreferenceSignalType {
  USER_CHOSE_ROUTE = "user_chose_route",
  USER_CONFIRMED_ACTION = "user_confirmed_action",
  USER_REJECTED_PROPOSAL = "user_rejected_proposal",
  USER_OVERRODE_PREFERENCE = "user_overrode_preference",
}

/**
 * Preference training signal
 */
export interface PreferenceTrainingSignal {
  signalType: PreferenceSignalType;
  userId: string;
  context: {
    commandFamily?: string;
    commandVerb?: string;
    workflowId?: string;
    chosenRoute?: string;
    rejectedProposalId?: string;
  };
  timestamp: Date;
}

/**
 * Session message types
 */
export enum SessionMessageType {
  SESSION_STARTED = "session_started",
  SESSION_RESUMED = "session_resumed",
  ACTIVE_MODE_CHANGED = "active_mode_changed",
  FOCUS_CHANGED = "focus_changed",
  WORKFLOW_STARTED = "workflow_started",
  WORKFLOW_COMPLETED = "workflow_completed",
}

/**
 * Session event
 */
export interface SessionEvent {
  eventType: SessionMessageType;
  sessionId: string;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Nexus protocol boundary service
 */
export default class NexusProtocolBoundaryService {
  private delegationGrants: Map<string, DelegationGrant> = new Map();
  private proposalHistory: Map<string, NexusProposal> = new Map();
  private outcomes: Map<string, MaestroExecutionOutcome> = new Map();

  /**
   * Create a delegation grant
   */
  createDelegationGrant(
    grantorIdentity: string,
    grantee: string,
    authorityPhase: AuthorityPhase,
    scope: DelegationScope,
    allowedRiskLevel: WorkflowRiskLevel,
    expirationMinutes?: number
  ): DelegationGrant {
    const grantId = `grant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const grant: DelegationGrant = {
      grantId,
      grantorIdentity,
      grantee,
      authorityPhase,
      scope,
      allowedRiskLevel,
      createdAt: now,
      expiresAt: expirationMinutes
        ? new Date(now.getTime() + expirationMinutes * 60 * 1000)
        : undefined,
      revoked: false,
    };

    this.delegationGrants.set(grantId, grant);
    log(`Delegation grant created: ${grantId} (${authorityPhase})`);

    return grant;
  }

  /**
   * Get delegation grant
   */
  getDelegationGrant(grantId: string): DelegationGrant | undefined {
    return this.delegationGrants.get(grantId);
  }

  /**
   * Validate delegation grant
   */
  validateDelegationGrant(
    grantId: string,
    commandFamily: string,
    riskLevel: WorkflowRiskLevel
  ): { valid: boolean; reason?: string } {
    const grant = this.delegationGrants.get(grantId);

    if (!grant) {
      return { valid: false, reason: "Delegation grant not found" };
    }

    if (grant.revoked) {
      return { valid: false, reason: "Delegation grant has been revoked" };
    }

    if (grant.expiresAt && new Date() > grant.expiresAt) {
      return { valid: false, reason: "Delegation grant has expired" };
    }

    // Check authority phase
    if (grant.authorityPhase === AuthorityPhase.ADVISORY) {
      return { valid: false, reason: "Advisory phase does not allow autonomous execution" };
    }

    // Check command family scope
    if (
      grant.scope.allowedCommandFamilies.length > 0 &&
      !grant.scope.allowedCommandFamilies.includes(commandFamily)
    ) {
      return { valid: false, reason: `Command family '${commandFamily}' not in delegation scope` };
    }

    // Check blocked commands
    // (would need command verb here for full check)

    // Check risk level
    const riskLevelOrder = [
      WorkflowRiskLevel.LOW,
      WorkflowRiskLevel.MODERATE,
      WorkflowRiskLevel.HIGH,
      WorkflowRiskLevel.PRIVILEGED,
    ];
    const grantLevelIndex = riskLevelOrder.indexOf(grant.allowedRiskLevel);
    const requestLevelIndex = riskLevelOrder.indexOf(riskLevel);

    if (requestLevelIndex > grantLevelIndex) {
      return {
        valid: false,
        reason: `Risk level '${riskLevel}' exceeds grant level '${grant.allowedRiskLevel}'`,
      };
    }

    return { valid: true };
  }

  /**
   * Revoke delegation grant
   */
  revokeDelegationGrant(grantId: string, reason?: string): boolean {
    const grant = this.delegationGrants.get(grantId);
    if (!grant) return false;

    grant.revoked = true;
    grant.revocationReason = reason;

    log(`Delegation grant revoked: ${grantId}`);
    return true;
  }

  /**
   * Get active grants for a grantee
   */
  getActiveGrants(grantee: string): DelegationGrant[] {
    const now = new Date();
    return Array.from(this.delegationGrants.values()).filter(
      (grant) =>
        grant.grantee === grantee &&
        !grant.revoked &&
        (!grant.expiresAt || grant.expiresAt > now)
    );
  }

  /**
   * Process Nexus proposal
   */
  processNexusProposal(
    proposal: NexusProposal,
    context?: ProposalExecutionContext
  ): {
    accepted: boolean;
    reason?: string;
    convertedWorkflowId?: string;
    requiresConfirmation: boolean;
  } {
    // Store proposal in history
    this.proposalHistory.set(proposal.proposalId, proposal);

    // Validate novelty level
    if (proposal.noveltyLevel === "novel" && proposal.confidence < 0.9) {
      return {
        accepted: false,
        reason: "Novel proposals with low confidence require human review",
        requiresConfirmation: true,
      };
    }

    // Dictation mode is not a lawful auto-execution mode for Nexus-originated operating actions.
    if (context?.interactionMode === "dictation") {
      return {
        accepted: false,
        reason: "Dictation mode blocks Nexus-originated execution proposals",
        requiresConfirmation: true,
      };
    }

    const workflowSteps = proposal.proposedWorkflow?.steps || [];
    const highestRequestedRisk = this.computeHighestRequestedRisk(proposal);
    const requestedFamilies = new Set(workflowSteps.map((step) => step.commandFamily));

    // Contamination and degraded identity should tighten delegated authority, not loosen it.
    if (context?.contaminated && highestRequestedRisk !== WorkflowRiskLevel.LOW) {
      return {
        accepted: false,
        reason: "Contaminated speaker state blocks delegated medium/high-risk proposals",
        requiresConfirmation: true,
      };
    }

    if (
      context &&
      !context.identityEvidenceReady &&
      (highestRequestedRisk === WorkflowRiskLevel.HIGH ||
        highestRequestedRisk === WorkflowRiskLevel.PRIVILEGED)
    ) {
      return {
        accepted: false,
        reason: "Identity evidence unavailable for high-risk delegated proposal",
        requiresConfirmation: true,
      };
    }

    // Check if delegation grant is required and valid.
    // Nexus remains advisory unless explicit grant exists and passes Maestro policy.
    if (proposal.delegationGrantId) {
      for (const family of requestedFamilies.size > 0 ? requestedFamilies : new Set(["default"])) {
        const validation = this.validateDelegationGrant(
          proposal.delegationGrantId,
          family,
          highestRequestedRisk
        );
        if (!validation.valid) {
          return {
            accepted: false,
            reason: validation.reason,
            requiresConfirmation: true,
          };
        }
      }
    } else {
      // No delegation grant means proposal remains advisory and needs explicit human confirmation.
      // We return a controlled non-accept result to preserve Maestro ownership boundaries.
      if (
        proposal.proposalType === ProposalType.PROPOSED_COMMAND ||
        proposal.proposalType === ProposalType.PROPOSED_WORKFLOW
      ) {
        return {
          accepted: false,
          reason: "Nexus proposal without delegation grant requires explicit user approval",
          requiresConfirmation: true,
        };
      }
    }

    if (
      context?.securityMode === "secure" &&
      !context.speakerVerified &&
      highestRequestedRisk !== WorkflowRiskLevel.LOW
    ) {
      return {
        accepted: false,
        reason: "Secure mode requires verified speaker for delegated medium/high-risk proposals",
        requiresConfirmation: true,
      };
    }

    if (
      context?.securityMode === "shared_room" &&
      highestRequestedRisk !== WorkflowRiskLevel.LOW
    ) {
      return {
        accepted: false,
        reason: "Shared-room mode blocks delegated medium/high-risk proposals by default",
        requiresConfirmation: true,
      };
    }

    // Check if human confirmation is required by proposal
    if (proposal.requiresHumanConfirmation) {
      return {
        accepted: false,
        reason: "Proposal requires human confirmation",
        requiresConfirmation: true,
      };
    }

    log(`Nexus proposal accepted: ${proposal.proposalId}`);
    return {
      accepted: true,
      requiresConfirmation: false,
    };
  }

  private computeHighestRequestedRisk(proposal: NexusProposal): WorkflowRiskLevel {
    const explicitLevels =
      proposal.proposedWorkflow?.steps
        ?.map((step) => step.riskLevel)
        .filter((level): level is WorkflowRiskLevel => !!level) || [];
    if (explicitLevels.length > 0) {
      return explicitLevels.reduce((highest, next) =>
        this.compareRisk(next, highest) > 0 ? next : highest
      );
    }

    const families = proposal.proposedWorkflow?.steps?.map((step) => step.commandFamily) || [];
    if (families.length === 0) {
      return WorkflowRiskLevel.MODERATE;
    }
    let highest = WorkflowRiskLevel.LOW;
    for (const family of families) {
      const inferred = this.mapCommandFamilyToRisk(family);
      if (this.compareRisk(inferred, highest) > 0) {
        highest = inferred;
      }
    }
    return highest;
  }

  private compareRisk(left: WorkflowRiskLevel, right: WorkflowRiskLevel): number {
    const riskLevelOrder = [
      WorkflowRiskLevel.LOW,
      WorkflowRiskLevel.MODERATE,
      WorkflowRiskLevel.HIGH,
      WorkflowRiskLevel.PRIVILEGED,
    ];
    return riskLevelOrder.indexOf(left) - riskLevelOrder.indexOf(right);
  }

  private mapCommandFamilyToRisk(commandFamily: string): WorkflowRiskLevel {
    const normalized = (commandFamily || "").toLowerCase();
    if (["security", "admin", "privileged"].includes(normalized)) {
      return WorkflowRiskLevel.PRIVILEGED;
    }
    if (
      [
        "filesystem",
        "file_create",
        "file_delete",
        "file_rename",
        "system",
        "settings",
        "process",
      ].includes(normalized)
    ) {
      return WorkflowRiskLevel.HIGH;
    }
    if (["terminal", "execution", "build", "edit", "browser"].includes(normalized)) {
      return WorkflowRiskLevel.MODERATE;
    }
    return WorkflowRiskLevel.LOW;
  }

  /**
   * Emit execution outcome
   */
  emitExecutionOutcome(outcome: MaestroExecutionOutcome): void {
    this.outcomes.set(outcome.executionId, outcome);
    log(`Execution outcome emitted: ${outcome.executionId} - ${outcome.status}`);
  }

  /**
   * Get execution outcome
   */
  getExecutionOutcome(executionId: string): MaestroExecutionOutcome | undefined {
    return this.outcomes.get(executionId);
  }

  /**
   * Emit session event
   */
  emitSessionEvent(event: SessionEvent): void {
    log(`Session event: ${event.eventType} - ${event.sessionId}`);
    // In a real implementation, this would send to Nexus via Arqon Bus
  }

  /**
   * Emit preference training signal
   */
  emitPreferenceSignal(signal: PreferenceTrainingSignal): void {
    log(`Preference signal: ${signal.signalType}`);
    // In a real implementation, this would send to Nexus
  }

  /**
   * Create default delegation scope
   */
  static createDefaultScope(): DelegationScope {
    return {
      allowedCommandFamilies: ["focus", "navigation", "terminal", "edit", "execution"],
      allowedRiskLevels: [WorkflowRiskLevel.LOW, WorkflowRiskLevel.MODERATE],
      blockedCommands: ["delete", "remove", "destroy", "format", "drop"],
      maxSteps: 5,
    };
  }

  /**
   * Get proposal history
   */
  getProposalHistory(proposalId: string): NexusProposal | undefined {
    return this.proposalHistory.get(proposalId);
  }
}
