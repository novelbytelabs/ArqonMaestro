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

import { SpeakerRole } from "./speaker-enrollment-service";
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
    }>;
  };
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
  processNexusProposal(proposal: NexusProposal): {
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

    // Check if delegation grant is required and valid
    if (proposal.delegationGrantId) {
      const validation = this.validateDelegationGrant(
        proposal.delegationGrantId,
        proposal.proposedWorkflow?.steps[0]?.commandFamily || "default",
        WorkflowRiskLevel.MODERATE
      );

      if (!validation.valid) {
        return {
          accepted: false,
          reason: validation.reason,
          requiresConfirmation: true,
        };
      }
    } else if (proposal.confidence > 0.8) {
      // High confidence but no grant - treat as advisory
      return {
        accepted: false,
        reason: "Nexus proposals without delegation grant require explicit user approval",
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
