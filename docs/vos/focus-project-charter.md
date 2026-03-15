# Focus Project Charter v0.1

**Version:** 0.1  
**Status:** Draft  
**Branch:** `feature/focus-architecture-v2`  
**Last Updated:** 2026-03-15

---

## 1. Header and Purpose

### 1.1 Document Title
Focus Project Charter v0.1

### 1.2 Purpose

This charter establishes governance, defines canonical terminology, and sets explicit boundaries for the Focus Project—the initiative to implement a layered, robust focus management system for the Arqon Maestro voice operating system.

The Focus Project addresses the fundamental challenge of reliably transferring input focus between entities in a multi-application, multi-window computing environment. By implementing a layered architecture, we ensure that focus transfers are verifiable, recoverable, and extensible.

### 1.3 Scope

This charter governs:
- The implementation of focus management layers (Layer 2 through Layer 8)
- The definition of focus-related terminology across the codebase
- The acceptance criteria for progressing through Focus Project milestones (FP-0 through FP-5)
- The governance of decisions affecting the focus system

---

## 2. Governance

### 2.1 FP-0 Owners and Stakeholders

| Role | Responsibility |
|------|----------------|
| **FP-0 Lead** | Maintains this charter, coordinates FP-0 deliverables, arbitrates terminology disputes |
| **Architecture Owner** | Approves layer boundaries, validates architectural consistency |
| **Implementation Lead** | Owns the current implementation in `maestro/client/src/main/` |
| **Review Committee** | Three senior engineers required for breaking changes to lower layers |

**Initial Stakeholders:**
- Focus Architecture Team
- Maestro Core Maintainers
- Voice UI Interaction Designers

### 2.2 Decision-Making Process

1. **Terminology Changes**: FP-0 Lead has final authority; must update this charter within 48 hours of change
2. **Layer Boundary Changes**: Require Architecture Owner approval and RFC to review committee
3. **Breaking Changes to Lower Layers**: Require FP-x approval (see Section 8)
4. **Deferred Item Re-evaluation**: Can be proposed at any FP-x review; requires 2/3 majority of Review Committee

### 2.3 Review Cadence

| Meeting | Frequency | Purpose |
|---------|-----------|---------|
| FP Standup | Weekly | Progress check, blocker identification |
| FP Review | Bi-weekly | Accept/reject FP-x deliverables |
| Governance Sync | Monthly | Charter updates, policy review |

---

## 3. Canonical Terminology List

This section defines the authoritative terminology for all focus-related concepts in the Maestro codebase. All documentation, code comments, and APIs must use these terms with these precise meanings.

### 3.1 Core Focus Terms

| Term | Definition |
|------|------------|
| **Focus Transfer** | The operation of moving input focus from one entity to another. A focus transfer is initiated by a user command or system event and results in a target entity receiving input capability. |
| **Application Focus (Layer 2)** | Focus at the application level. When an application has Layer 2 focus, it is the active application in the operating system and receives keyboard input by default. |
| **Window Focus (Layer 3)** | Focus at the window level within an application. When a window has Layer 3 focus, it is the active window within its application and receives input within that application's window stack. |

### 3.2 Deferred Layers (NOT YET IMPLEMENTED)

| Term | Layer | Definition |
|------|-------|------------|
| **Region** | Layer 4 | Focus within a specific region of a window (e.g., sidebar, content area, toolbar). Enables targeting focus to functional subdivisions within a single window. **FP-3A implements canonical model for VS Code and Chrome.** |
| **Control** | Layer 5 | Focus on a specific UI control within a region (e.g., a button, text field, dropdown). Enables targeting individual interactive elements. |
| **Item** | Layer 6 | Focus on items within controls (e.g., list items, grid rows, tree nodes). Enables targeting specific data elements within list-based or grid-based controls. |
| **Caret** | Layer 7 | Text caret positioning within text controls. Enables precise character-level focus for text editing operations. |
| **Semantic Routing** | Layer 8 | Route focus transfers based on meaning rather than structure. Uses ML models or heuristics to determine the most appropriate focus target given user intent. |

### 3.3 Supporting Concepts

| Term | Definition |
|------|------------|
| **Source of Truth** | The authoritative system that maintains the definitive record of current focus state. The Source of Truth may be the operating system, the application, or Maestro's internal state, depending on the layer and verification strategy. |
| **Confidence Score** | A probability value (0.0 to 1.0) indicating the likelihood that a focus transfer succeeded. Higher scores indicate higher confidence; threshold values determine whether verification or recovery is required. |

---

## 4. Current Implementation Boundary (Layers 2-3)

The following components are currently implemented and constitute the baseline for FP-0. These layers are stable and ready for FP-1 work to build upon.

### 4.1 Implemented Components

| Component | Location | Layer | Description |
|-----------|----------|-------|-------------|
| Application Focus | [`maestro/client/src/main/driver/stub.ts`](maestro/client/src/main/driver/stub.ts) | Layer 2 | Detects and manages focus at the application level |
| Window Focus | [`maestro/client/src/main/driver/stub.ts`](maestro/client/src/main/driver/stub.ts) | Layer 3 | Detects and manages focus at the window level within applications |
| Basic Transfer | [`maestro/client/src/main/execute/executor.ts`](maestro/client/src/main/execute/executor.ts) | 2-3 | Executes focus transfer operations between applications and windows |
| Basic History | [`maestro/client/src/main/runtime/focus-history-service.ts`](maestro/client/src/main/runtime/focus-history-service.ts) | 2-3 | Maintains a rolling history of focus transitions for navigation |
| Basic Post-Transfer Refresh | [`maestro/client/src/main/execute/system.ts`](maestro/client/src/main/execute/system.ts) | 2-3 | Refreshes focus state after transfer to verify success |

### 4.2 Implementation Notes

- The current implementation uses stub drivers in `stub.ts` for focus detection
- The history service provides basic last-N tracking without persistence
- Verification is minimal—post-transfer refresh confirms the target received focus but does not compute confidence scores

---

## 5. Deferred Items List

The following items are **explicitly out of scope** for FP-1 and must not be implemented until the FP-1 acceptance criteria are met and approved. These represent higher-layer focus capabilities that require the foundation established in FP-1.

### 5.1 Explicitly Deferred (NOT YET IMPLEMENTED)

| Item | Layer | Rationale for Deferral |
|------|-------|------------------------|
| **Region Focus** | Layer 4 | **FP-3A COMPLETE**: Canonical model implemented for VS Code and Chrome. |
| **Control Focus** | Layer 5 | Requires UI element introspection that is not yet available |
| **Item Focus** | Layer 6 | Requires list/grid enumeration capabilities |
| **Caret Positioning** | Layer 7 | Requires text-specific focus detection |
| **Semantic Routing** | Layer 8 | Requires ML model integration and training data |
| **Modal Policy** | N/A | Requires understanding of focus constraints across layers |
| **Recovery Engine** | N/A | Requires confidence scoring (FP-1.4) before implementation |

### 5.2 Out-of-Scope Declaration

> **IMPORTANT**: Teams working on FP-0 and FP-1 must not implement any items from this deferred list. Attempting to implement deferred items before the foundational layers are stable will result in architectural inconsistency and technical debt.

---

## 6. FP-1 Acceptance Criteria

FP-0 closes when all of the following acceptance criteria are met. These criteria define the requirements for **FP-1 Milestone A** (Verified Focus Core).

### 6.1 Acceptance Criteria Overview

| ID | Criterion | Description |
|----|-----------|-------------|
| **FP-1.1** | Verification Step After Focus Transfer | Implement a post-transfer verification step that confirms focus arrived at the intended target |
| **FP-1.2** | Source-of-Truth Classification | Classify and track which system (OS, application, Maestro) is the Source of Truth for focus state at each layer |
| **FP-1.3** | Expanded History Model | Extend the basic history service to include timestamps, transfer success/failure status, and layer information |
| **FP-1.4** | Coarse Confidence Scoring | Implement confidence scoring that distinguishes high-confidence transfers from uncertain transfers |

### 6.2 Detailed Criteria

#### FP-1.1: Verification Step After Focus Transfer

**Requirement**: After any focus transfer, the system must verify that focus arrived at the intended target.

**Acceptance Tests**:
- [ ] Transfer to application A results in Application Focus on A
- [ ] Transfer to window B in application A results in Window Focus on B
- [ ] Failed verification triggers appropriate error handling
- [ ] Verification latency is under 500ms for 90th percentile transfers

#### FP-1.2: Source-of-Truth Classification

**Requirement**: The system must classify and track the Source of Truth for focus state.

**Acceptance Tests**:
- [ ] Each focus state query returns the identified Source of Truth
- [ ] Source of Truth can be: Operating System, Application, or Maestro
- [ ] Classification is logged for audit purposes
- [ ] Discrepancies between expected and actual Source of Truth are flagged

#### FP-1.3: Expanded History Model

**Requirement**: The history service must track rich metadata about focus transitions.

**Acceptance Tests**:
- [ ] History entries include timestamp (ISO 8601)
- [ ] History entries include success/failure status
- [ ] History entries include layer information (2 or 3)
- [ ] History is queryable by time range, application, and layer
- [ ] History supports at least 100 entries in memory

#### FP-1.4: Coarse Confidence Scoring

**Requirement**: The system must compute confidence scores for focus transfers.

**Acceptance Tests**:
- [ ] Confidence scores are in range [0.0, 1.0]
- [ ] High-confidence transfers (score >= 0.8) do not require user confirmation
- [ ] Low-confidence transfers (score < 0.8) trigger verification or recovery
- [ ] Confidence score computation is deterministic for same-state transfers

---

## 7. Architecture Principles

The following principles govern the evolution of the Focus Project and must be followed by all contributors.

### 7.1 Layered Implementation

**Principle**: Focus layers must be implemented sequentially. No skipping layers.

**Rationale**: Each layer depends on the stability of lower layers. Skipping layers creates architectural fragility and makes debugging focus issues extremely difficult.

**Implication**: Layer 4 cannot begin until Layer 3 is stable and FP-1 is complete.

### 7.2 Stability Requirement

**Principle**: Each layer must be stable before moving to the next.

**Definition of Stability**:
- All acceptance criteria for the current FP-x are met
- No critical or high-severity bugs are open
- Code review sign-off from Architecture Owner

### 7.3 Breaking Change Governance

**Principle**: Breaking changes to lower layers require FP-x approval.

**Process**:
1. RFC document describing the breaking change
2. Impact assessment covering all dependent layers
3. Review Committee votes (2/3 majority required)
4. FP-x lead approval
5. Migration path documented

**Lower Layers**: Layers 2-3 (currently implemented)  
**Higher Layers**: Layers 4-8 (deferred)

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-03-15 | FP-0 Lead | Initial charter draft |

---

## 9. References

- [Maestro Focus Phase Handoff](maestro-focus-phase-handoff.md)
- [Maestro Executor Architecture](maestro-executor-architecture.md)
