import { core } from "../../gen/core";
import RuntimeCommandDispatcher from "../../main/runtime/runtime-command-dispatcher";
import RuntimeCommandEmitter from "../../main/runtime/runtime-command-emitter";
import NexusProtocolBoundaryService, {
  AuthorityPhase,
  ProposalType,
} from "../../main/runtime/nexus-protocol-boundary-service";
import WorkflowContractService, { StepStatus, WorkflowRiskLevel } from "../../main/runtime/workflow-contract-service";
import WorkflowExecutionService from "../../main/runtime/workflow-nexus-integration";

describe("Phase 2B workflow / Nexus boundary", () => {
  it("keeps Nexus proposals advisory without delegation grant", () => {
    const boundary = new NexusProtocolBoundaryService();
    const result = boundary.processNexusProposal({
      proposalId: "p1",
      proposalType: ProposalType.PROPOSED_WORKFLOW,
      requestedIntent: "review logs",
      confidence: 0.95,
      noveltyLevel: "known",
      requiresHumanConfirmation: false,
      proposedWorkflow: {
        steps: [{ commandVerb: "run build", commandFamily: "terminal" }],
      },
    });

    expect(result.accepted).toBe(false);
    expect(result.requiresConfirmation).toBe(true);
    expect(result.reason).toContain("requires explicit user approval");
  });

  it("creates workflow with authority context when proposal is delegated and lawful", () => {
    const workflowService = new WorkflowContractService();
    const boundary = new NexusProtocolBoundaryService();
    const execution = new WorkflowExecutionService(workflowService, boundary);

    const grant = boundary.createDelegationGrant(
      "owner-1",
      "nexus",
      AuthorityPhase.SCOPED_AUTONOMY,
      {
        allowedCommandFamilies: ["terminal", "focus"],
        allowedRiskLevels: [WorkflowRiskLevel.LOW, WorkflowRiskLevel.MODERATE],
        blockedCommands: [],
      },
      WorkflowRiskLevel.MODERATE
    );

    const proposalResult = execution.processNexusProposal(
      {
        proposalId: "p2",
        proposalType: ProposalType.PROPOSED_WORKFLOW,
        requestedIntent: "run build and focus terminal",
        confidence: 0.98,
        noveltyLevel: "known",
        requiresHumanConfirmation: false,
        delegationGrantId: grant.grantId,
        proposedWorkflow: {
          steps: [
            { commandVerb: "run cargo build", commandFamily: "terminal" },
            { commandVerb: "focus terminal", commandFamily: "focus" },
          ],
        },
      },
      {
        securityMode: "normal",
        interactionMode: "command",
        identityState: "verified_primary",
        speakerVerified: true,
        contaminated: false,
        identityEvidenceReady: true,
      }
    );

    expect(proposalResult.accepted).toBe(true);
    expect(proposalResult.workflowId).toBeDefined();

    const workflow = workflowService.getWorkflow(proposalResult.workflowId!);
    expect(workflow).toBeDefined();
    expect(workflow!.origin).toBe("nexus_proposal");
    expect(workflow!.delegationGrantId).toBe(grant.grantId);
    expect(workflow!.authorityContext?.speakerVerified).toBe(true);
  });

  it("threads authority context through step execution", async () => {
    const workflowService = new WorkflowContractService();
    const boundary = new NexusProtocolBoundaryService();
    const execution = new WorkflowExecutionService(workflowService, boundary);

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

    const proposalResult = execution.processNexusProposal(
      {
        proposalId: "p3",
        proposalType: ProposalType.PROPOSED_WORKFLOW,
        requestedIntent: "focus terminal",
        confidence: 0.99,
        noveltyLevel: "known",
        requiresHumanConfirmation: false,
        delegationGrantId: grant.grantId,
        proposedWorkflow: {
          steps: [{ commandVerb: "focus terminal", commandFamily: "focus" }],
        },
      },
      {
        securityMode: "normal",
        interactionMode: "command",
        identityState: "verified_primary",
        speakerVerified: true,
        contaminated: false,
        identityEvidenceReady: true,
      }
    );

    const contexts: Array<{ origin: string; grant?: string }> = [];
    await execution.executeWorkflow(proposalResult.workflowId!, async (_step, context) => {
      contexts.push({
        origin: context.origin,
        grant: context.delegationGrantId,
      });
      return {
        stepId: "s1",
        status: StepStatus.SUCCEEDED,
        commandVerb: "focus terminal",
        success: true,
        outputBindings: new Map(),
        warnings: [],
        elapsedMs: 1,
      };
    });

    expect(contexts).toHaveLength(1);
    expect(contexts[0].origin).toBe("nexus_proposal");
    expect(contexts[0].grant).toBe(grant.grantId);
  });

  it("blocks Nexus-origin execution from unresolved legacy routes", async () => {
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
        transcript: "unknown",
      },
      final: true,
      chunkId: "c-boundary-1",
    } as unknown as core.ICommandsResponse;

    await dispatcher.dispatch(response, {
      executionOrigin: "nexus_proposal",
      delegationGrantId: "grant_123",
    });

    expect(executor.execute).not.toHaveBeenCalled();
    expect(executor.executeLocalRoute).not.toHaveBeenCalled();
    expect(executor.executePluginAssistedRoute).not.toHaveBeenCalled();
  });
});
