# Maestro Workflow Contract Service

> **Status**: IMPLEMENTED (FP-2B) - STUBBED
> 
> ⚠️ **Note**: This service is implemented but not integrated into the command chain. See [maestro-project-roadmap.md](./maestro-project-roadmap.md) for completion requirements.

## Overview

The Workflow Contract Service manages multi-step command workflows with governance, pause/cancel semantics, and delegation support. It is part of FP-2B (Workflow and Delegation).

## Purpose

1. Compile lawful multi-step workflow contracts into execution plans
2. Manage workflow lifecycle (pause, resume, cancel)
3. Handle step failure policies
4. Support Nexus delegation proposals

## Key Concepts

### Workflow Classes

| Class | Description |
|-------|-------------|
| ATOMIC | Single-step, no pause/cancel |
| SEQUENTIAL | Ordered steps, can pause between |
| PARALLEL | Concurrent steps, all must complete |
| GOVERNED | Conditional branching with policy |

### Step Roles

| Role | Description |
|------|-------------|
| PRIMARY | Main executor |
| DELEGATED | Runs on behalf of primary |
| GUARDED | Policy enforcement step |

### Failure Policies

| Policy | Behavior |
|--------|-----------|
| ABORT | Stop workflow immediately |
| RETRY | Attempt step again (max N times) |
| FALLBACK | Use alternative step |
| CONTINUE | Skip failed step |

## Usage

```typescript
import WorkflowContractService from "./workflow-contract-service";

const workflowService = new WorkflowContractService();

// Create a workflow
const workflow = await workflowService.createWorkflow({
  class: WorkflowClass.SEQUENTIAL,
  steps: [
    { id: "1", action: "focus editor", role: StepRole.PRIMARY },
    { id: "2", action: "insert text", role: StepRole.PRIMARY, failurePolicy: StepFailurePolicy.RETRY },
  ],
  metadata: { name: "Open and Insert" }
});

// Execute workflow
const result = await workflowService.executeWorkflow(
  async (step) => {
    // Execute actual command
    return { success: true, output: "done" };
  },
  workflow
);
```

## Related Files

- [`maestro/client/src/main/runtime/workflow-contract-service.ts`](../../maestro/client/src/main/runtime/workflow-contract-service.ts) - Implementation
- [`maestro/client/src/main/runtime/workflow-nexus-integration.ts`](../../maestro/client/src/main/runtime/workflow-nexus-integration.ts) - Nexus integration
- [`maestro/client/src/main/runtime/delegation-grant-service.ts`](../../maestro/client/src/main/runtime/delegation-grant-service.ts) - Delegation (STUBBED)

## TODO

- [ ] Integrate workflow execution into command pipeline
- [ ] Add persistence for workflow state
- [ ] Connect Nexus boundary for proposals
- [ ] Add unit tests for state machine
- [ ] Add integration tests for Nexus boundary
