import { core } from "../../gen/core";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";
import IdentityGatewayService from "../../main/runtime/identity-gateway-service";
import { CommandRiskLevel, InteractionMode } from "../../main/runtime/authorization-service";
import NexusProtocolBoundaryService, {
  ProposalType,
  AuthorityPhase,
} from "../../main/runtime/nexus-protocol-boundary-service";
import WorkflowContractService, {
  WorkflowClass,
  StepRole,
  StepFailurePolicy,
  StepStatus,
  WorkflowRiskLevel,
} from "../../main/runtime/workflow-contract-service";
import WorkflowExecutionService from "../../main/runtime/workflow-nexus-integration";
import { phase3BReplayAuditService } from "../../main/runtime/phase3b-replay-audit-service";

describe("Phase 3B replay/audit hardening", () => {
  beforeEach(() => {
    phase3BReplayAuditService.reset();
  });

  it("captures dispatch decisions with boundary block evidence", async () => {
    const log = { logVerbose: () => {} } as any;
    const custom = {} as any;
    const emitter = new RuntimeCommandEmitter(log);
    const executor = {
      executeLocalRoute: jest.fn(async () => {}),
      executePluginAssistedRoute: jest.fn(async () => {}),
      execute: jest.fn(async () => {}),
    } as any;
    const dispatcher = new RuntimeCommandDispatcher(custom, emitter, executor, log);

    const response = {
      execute: {
        commands: [{ type: 999 }],
        transcript: "unknown command",
      },
      final: true,
      chunkId: "c-replay-1",
    } as unknown as core.ICommandsResponse;

    await dispatcher.dispatch(response, {
      executionOrigin: "nexus_proposal",
      delegationGrantId: "grant_1",
    });

    const snapshot = phase3BReplayAuditService.getSnapshot();
    const dispatchRecords = snapshot.records.filter((record) => record.category === "dispatch_decision");
    expect(dispatchRecords).toHaveLength(1);
    const record = dispatchRecords[0] as any;
    expect(record.boundaryBlocked).toBe(true);
    expect(record.boundaryBlockReason).toBe("nexus_proposal_requires_lawful_non_legacy_route");
    expect(record.dispatchRoute).toBe("unknown_legacy");
  });

  it("captures authorization outcomes with identity/security context", async () => {
    const gateway = new IdentityGatewayService();
    gateway.setInteractionMode(InteractionMode.DICTATION);

    const result = await gateway.authorize({
      commandFamily: "terminal",
      commandVerb: "run build",
      riskLevel: CommandRiskLevel.MEDIUM,
    });

    expect(result.decision).toBe("block");

    const snapshot = phase3BReplayAuditService.getSnapshot();
    const authRecords = snapshot.records.filter((record) => record.category === "authorization_decision");
    expect(authRecords).toHaveLength(1);
    const record = authRecords[0] as any;
    expect(record.interactionMode).toBe("dictation");
    expect(record.riskLevel).toBe("medium");
    expect(record.decision).toBe("block");

    gateway.destroy();
  });

  it("captures Nexus boundary and delegation-grant audit outcomes", () => {
    const boundary = new NexusProtocolBoundaryService();
    const noGrantResult = boundary.processNexusProposal({
      proposalId: "proposal-1",
      proposalType: ProposalType.PROPOSED_WORKFLOW,
      requestedIntent: "run build",
      confidence: 0.95,
      noveltyLevel: "known",
      requiresHumanConfirmation: false,
      proposedWorkflow: {
        steps: [{ commandVerb: "run build", commandFamily: "terminal" }],
      },
    });

    expect(noGrantResult.accepted).toBe(false);

    const grant = boundary.createDelegationGrant(
      "owner-1",
      "nexus",
      AuthorityPhase.SCOPED_AUTONOMY,
      {
        allowedCommandFamilies: ["focus"],
        allowedRiskLevels: [WorkflowRiskLevel.LOW],
        blockedCommands: [],
      },
      WorkflowRiskLevel.LOW
    );
    const validation = boundary.validateDelegationGrant(grant.grantId, "terminal", WorkflowRiskLevel.MODERATE);
    expect(validation.valid).toBe(false);

    const snapshot = phase3BReplayAuditService.getSnapshot();
    expect(snapshot.recordsByCategory.nexus_boundary).toBeGreaterThan(0);
    expect(snapshot.recordsByCategory.delegation_grant).toBeGreaterThan(0);
  });

  it("captures workflow transitions and step outcomes", async () => {
    const workflowService = new WorkflowContractService();
    const boundary = new NexusProtocolBoundaryService();
    const execution = new WorkflowExecutionService(workflowService, boundary);

    const workflow = workflowService.createWorkflow(
      "focus terminal",
      WorkflowClass.INLINE_CHAIN,
      [
        {
          orderIndex: 0,
          commandVerb: "focus terminal",
          commandFamily: "focus",
          commandTarget: "terminal",
          stepRole: StepRole.PRIMARY_ACTION,
          required: true,
          inputBindings: [],
          outputBindings: [],
          onFailure: StepFailurePolicy.ABORT_WORKFLOW,
        },
      ],
      { origin: "user" }
    );

    await execution.executeWorkflow(workflow.workflowId, async (step) => ({
      stepId: step.stepId,
      status: StepStatus.SUCCEEDED,
      commandVerb: step.commandVerb,
      success: true,
      outputBindings: new Map(),
      warnings: [],
      elapsedMs: 2,
    }));

    const snapshot = phase3BReplayAuditService.getSnapshot();
    const transitions = snapshot.records.filter((record) => record.category === "workflow_transition") as any[];
    const steps = snapshot.records.filter((record) => record.category === "workflow_step") as any[];
    expect(transitions.some((record) => record.toStatus === "running")).toBe(true);
    expect(transitions.some((record) => record.toStatus === "completed")).toBe(true);
    expect(steps).toHaveLength(1);
    expect(steps[0].status).toBe("succeeded");
  });
});
