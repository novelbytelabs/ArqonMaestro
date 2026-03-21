export type Phase3BAuditCategory =
  | "dispatch_decision"
  | "authorization_decision"
  | "workflow_transition"
  | "workflow_step"
  | "nexus_boundary"
  | "delegation_grant"
  | "execution_outcome";

interface Phase3BAuditRecordBase {
  sequence: number;
  recordedAt: string;
  category: Phase3BAuditCategory;
}

export interface DispatchDecisionAuditRecord extends Phase3BAuditRecordBase {
  category: "dispatch_decision";
  chunkId: string;
  sessionId?: string;
  executionOrigin: "user" | "nexus_proposal" | "macro";
  delegationGrantId?: string;
  nexusProposalId?: string;
  dispatchRoute: string;
  dispatchFamily: string;
  dispatchReason: string;
  policyDecision: string;
  policySummary?: string;
  approvedRoute?: string;
  trustTier?: number;
  confirmationRequired: boolean;
  chooserRequired: boolean;
  securityMode: "standard" | "secure" | "shared_room";
  speakerVerified: boolean;
  interactionMode: "command" | "dictation" | "conversation";
  boundaryBlocked: boolean;
  boundaryBlockReason?: string;
  outcomeType?: string;
}

export interface AuthorizationDecisionAuditRecord extends Phase3BAuditRecordBase {
  category: "authorization_decision";
  commandFamily: string;
  commandVerb: string;
  target?: string;
  riskLevel: string;
  decision: string;
  reason: string;
  confirmationLevel?: "low" | "medium" | "high";
  isFallback: boolean;
  securityMode: string;
  sharedRoomMode: boolean;
  interactionMode: "command" | "dictation" | "conversation";
  identityState: string;
  identityId?: string;
  speakerVerified: boolean;
  contaminated: boolean;
  identityEvidenceReady: boolean;
}

export interface WorkflowTransitionAuditRecord extends Phase3BAuditRecordBase {
  category: "workflow_transition";
  workflowId: string;
  origin: "user" | "nexus_proposal" | "macro";
  fromStatus?: string;
  toStatus: string;
  reason: string;
  riskLevel?: string;
  delegationGrantId?: string;
  proposalId?: string;
  authorityContext?: {
    securityMode: string;
    interactionMode: string;
    identityState: string;
    speakerVerified: boolean;
    contaminated: boolean;
    identityEvidenceReady: boolean;
  };
}

export interface WorkflowStepAuditRecord extends Phase3BAuditRecordBase {
  category: "workflow_step";
  workflowId: string;
  stepId: string;
  stepIndex: number;
  totalSteps: number;
  commandFamily: string;
  commandVerb: string;
  status: string;
  success: boolean;
  elapsedMs: number;
  errorCode?: string;
  errorMessage?: string;
  origin: "user" | "nexus_proposal" | "macro";
  delegationGrantId?: string;
  proposalId?: string;
}

export interface NexusBoundaryAuditRecord extends Phase3BAuditRecordBase {
  category: "nexus_boundary";
  proposalId: string;
  proposalType: string;
  accepted: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  delegationGrantId?: string;
  highestRequestedRisk?: string;
  context?: {
    securityMode: string;
    interactionMode: string;
    identityState: string;
    speakerVerified: boolean;
    contaminated: boolean;
    identityEvidenceReady: boolean;
  };
}

export interface DelegationGrantAuditRecord extends Phase3BAuditRecordBase {
  category: "delegation_grant";
  action: "created" | "validated" | "revoked";
  grantId: string;
  authorityPhase?: string;
  valid?: boolean;
  reason?: string;
  commandFamily?: string;
  riskLevel?: string;
}

export interface ExecutionOutcomeAuditRecord extends Phase3BAuditRecordBase {
  category: "execution_outcome";
  executionId: string;
  source: "user" | "nexus_proposal" | "macro";
  status: string;
  policyDecision: string;
  confirmationApplied: boolean;
  chooserApplied: boolean;
  routeSelected?: string;
  refusalReason?: string;
  elapsedMs: number;
  auditRef?: string;
}

export type Phase3BAuditRecord =
  | DispatchDecisionAuditRecord
  | AuthorizationDecisionAuditRecord
  | WorkflowTransitionAuditRecord
  | WorkflowStepAuditRecord
  | NexusBoundaryAuditRecord
  | DelegationGrantAuditRecord
  | ExecutionOutcomeAuditRecord;

export interface Phase3BReplayAuditSnapshot {
  generatedAt: string;
  totalRecords: number;
  recordsByCategory: Record<Phase3BAuditCategory, number>;
  records: Phase3BAuditRecord[];
}

const createCategoryCounts = (): Record<Phase3BAuditCategory, number> => ({
  dispatch_decision: 0,
  authorization_decision: 0,
  workflow_transition: 0,
  workflow_step: 0,
  nexus_boundary: 0,
  delegation_grant: 0,
  execution_outcome: 0,
});

export default class Phase3BReplayAuditService {
  private records: Phase3BAuditRecord[] = [];
  private nextSequence = 1;

  constructor(private maxRecords = 2000) {}

  reset(): void {
    this.records = [];
    this.nextSequence = 1;
  }

  getSnapshot(): Phase3BReplayAuditSnapshot {
    const recordsByCategory = createCategoryCounts();
    for (const record of this.records) {
      recordsByCategory[record.category] += 1;
    }
    return {
      generatedAt: new Date().toISOString(),
      totalRecords: this.records.length,
      recordsByCategory,
      records: [...this.records],
    };
  }

  recordDispatchDecision(
    input: Omit<DispatchDecisionAuditRecord, "category" | "sequence" | "recordedAt">
  ): void {
    this.push({ ...input, category: "dispatch_decision" });
  }

  recordAuthorizationDecision(
    input: Omit<AuthorizationDecisionAuditRecord, "category" | "sequence" | "recordedAt">
  ): void {
    this.push({ ...input, category: "authorization_decision" });
  }

  recordWorkflowTransition(
    input: Omit<WorkflowTransitionAuditRecord, "category" | "sequence" | "recordedAt">
  ): void {
    this.push({ ...input, category: "workflow_transition" });
  }

  recordWorkflowStep(input: Omit<WorkflowStepAuditRecord, "category" | "sequence" | "recordedAt">): void {
    this.push({ ...input, category: "workflow_step" });
  }

  recordNexusBoundaryDecision(
    input: Omit<NexusBoundaryAuditRecord, "category" | "sequence" | "recordedAt">
  ): void {
    this.push({ ...input, category: "nexus_boundary" });
  }

  recordDelegationGrant(
    input: Omit<DelegationGrantAuditRecord, "category" | "sequence" | "recordedAt">
  ): void {
    this.push({ ...input, category: "delegation_grant" });
  }

  recordExecutionOutcome(
    input: Omit<ExecutionOutcomeAuditRecord, "category" | "sequence" | "recordedAt">
  ): void {
    this.push({ ...input, category: "execution_outcome" });
  }

  private push(record: Omit<Phase3BAuditRecord, "sequence" | "recordedAt">): void {
    const nextRecord = {
      ...record,
      sequence: this.nextSequence++,
      recordedAt: new Date().toISOString(),
    } as Phase3BAuditRecord;
    this.records.push(nextRecord);
    if (this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }
  }
}

export const phase3BReplayAuditService = new Phase3BReplayAuditService();
