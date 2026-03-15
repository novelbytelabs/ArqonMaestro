# Maestro VOS Implementation Progress

> **Important**: This document is now aligned with the Focus Project Charter (FP-0). See [`focus-project-charter.md`](./focus-project-charter.md) for governance, terminology, and acceptance criteria.

## Focus Project Context

The Focus Project implements a layered focus management system for Arqon Maestro. The architecture is organized into 8 layers, where lower layers provide the foundation for higher layers.

### Focus Layer Architecture

| Layer | Name | Description |
|-------|------|-------------|
| 2 | **Application Focus** | Focus at the application level. When an application has Application Focus, it is the active application in the OS and receives keyboard input by default. |
| 3 | **Window Focus** | Focus at the window level within an application. When a window has Window Focus, it is the active window within its application and receives input within that application's window stack. |
| 4 | **Region** | Focus within a specific region of a window (e.g., sidebar, content area, toolbar). |
| 5 | **Control** | Focus on a specific UI control within a region (e.g., button, text field, dropdown). |
| 6 | **Item** | Focus on items within controls (e.g., list items, grid rows, tree nodes). |
| 7 | **Caret** | Text caret positioning within text controls for precise character-level focus. |
| 8 | **Semantic Routing** | Route focus transfers based on meaning rather than structure using ML models or heuristics. |

### Key Terminology

- **Focus Transfer**: The operation of moving input focus from one entity to another. A focus transfer is initiated by a user command or system event and results in a target entity receiving input capability.
- **Source of Truth**: The authoritative system that maintains the definitive record of current focus state. The Source of Truth may be the operating system, the application, or Maestro's internal state, depending on the layer and verification strategy.
- **Confidence Score**: A probability value (0.0 to 1.0) indicating the likelihood that a focus transfer succeeded. Higher scores indicate higher confidence; threshold values determine whether verification or recovery is required.

---

## Current snapshot

* Date: 2026-03-15
* Program state: FP-3B in progress
* Active phase: Focus Project - FP-3B (Region Hardening + Ambiguity Control)
* Reasoning posture: `high` is appropriate while FP-3B acceptance criteria are being implemented

---

## Layer Implementation Status

| Layer | Name | Status | Implementation Notes |
|-------|------|--------|---------------------|
| 2 | Application Focus | ✅ Complete | stub.ts driver + verification |
| 3 | Window Focus | ✅ Complete | stub.ts driver + verification |
| 4 | Region | ⏸ In Progress (FP-3B) | Hardening + Ambiguity Control |
| 5 | Control | ⏸ Deferred | Not in FP-1 scope |
| 6 | Item | ⏸ Deferred | Not in FP-1 scope |
| 7 | Caret | ⏸ Deferred | Not in FP-1 scope |
| 8 | Semantic Routing | ⏸ Deferred | Not in FP-1 scope |

---

## FP-1 Acceptance Criteria Tracking

FP-1 (Verified Focus Core) builds on the implemented Layers 2-3 to add verification, source-of-truth classification, expanded history, and confidence scoring.

| ID | Criterion | Status |
|----|-----------|--------|
| FP-1.1 | Verification Step After Focus Transfer | [x] Complete |
| FP-1.2 | Source-of-Truth Classification | [x] Complete |
| FP-1.3 | Expanded History Model | [x] Complete |
| FP-1.4 | Coarse Confidence Scoring | [x] Complete |

### FP-1.1: Verification Step After Focus Transfer
- [ ] Transfer to application A results in Application Focus on A
- [ ] Transfer to window B in application A results in Window Focus on B
- [ ] Failed verification triggers appropriate error handling
- [ ] Verification latency is under 500ms for 90th percentile transfers

### FP-1.2: Source-of-Truth Classification
- [ ] Each focus state query returns the identified Source of Truth
- [ ] Source of Truth can be: Operating System, Application, or Maestro
- [ ] Classification is logged for audit purposes
- [ ] Discrepancies between expected and actual Source of Truth are flagged

### FP-1.3: Expanded History Model
- [ ] History entries include timestamp (ISO 8601)
- [ ] History entries include success/failure status
- [ ] History entries include layer information (2 or 3)
- [ ] History is queryable by time range, application, and layer
- [ ] History supports at least 100 entries in memory

### FP-1.4: Coarse Confidence Scoring
- [ ] Confidence scores are in range [0.0, 1.0]
- [ ] High-confidence transfers (score >= 0.8) do not require user confirmation
- [ ] Low-confidence transfers (score < 0.8) trigger verification or recovery
- [ ] Confidence score computation is deterministic for same-state transfers

---

## Completed recently

* Finished the VOS planning corpus under `/docs/vos`
* Created Focus Project Charter (FP-0) at [`focus-project-charter.md`](./focus-project-charter.md)
* Implemented Layers 2-3 (Application Focus and Window Focus) with stub.ts drivers
* Expanded [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) into explicit prototype, integration, hardening, benchmark, deferral, and readiness sections
* Created a renderer shell boundary at [`maestro/client/src/renderer/shell/index.ts`](../../maestro/client/src/renderer/shell/index.ts)
* Moved renderer UI modules off raw Electron IPC and onto the renderer shell adapter
* Verified that raw `ipcRenderer` usage in `maestro/client/src/renderer` is now isolated to the shell adapter itself
* Extracted the first main-process runtime-spine module at [`maestro/client/src/main/runtime/runtime-spine.ts`](../../maestro/client/src/main/runtime/runtime-spine.ts)
* Moved hot-path/STT cluster wiring out of inline `App.create()` boot code and into the runtime-spine module

---

## Current in-progress area

FP-3A is complete. FP-3B (Region Hardening + Ambiguity Control) is now the active focus area.

### Completed inside FP-3A:
* FP-3A charter creation and region model definition
* Canonical region model for VS Code (editor, terminal, sidebar, panel, etc.)
* Canonical region model for Chrome (page, address_bar, tab_bar, devtools, etc.)
* Extended FocusTarget and FocusState with regionKind and regionId
* FocusRegionService with region definitions and confidence calculation
* FocusRegionHandler for executing region transfers
* FocusRegionVerificationService for verifying region transfers
* FocusAmbiguityPolicy for resolving "terminal" ambiguity

### Completed inside FP-3B:
* Explicit fallback policy per supported region command
* Stable debug event shape for region transfers
* Region test matrix covering success/failure/ambiguity
* Hardened terminal ambiguity policy with fallback handling
* Chrome page/address bar behavior explicitly documented
* Heuristic vs verified region detections documented

---

## Next implementation target

The next best move is:

1. Complete FP-3B acceptance criteria verification
2. Move to FP-4A: Precision Focus Foundations

---

## FP-2: Safety + Contracts

FP-2 builds on the verified focus core (FP-1) to add safety guarantees through contracts and failure recovery.

### FP-2 Goals

1. **Focus Transfer Contracts**: Define preconditions and postconditions for all focus transfer operations
2. **Safety Invariants Enforcement**: Maintain critical focus state invariants across all operations
3. **Transfer Validation Pipeline**: Create a comprehensive validation pipeline for all focus transfers
4. **Failure Mode Analysis**: Document and handle all failure modes with appropriate recovery strategies

### FP-2 Deliverables

- Focus transfer contract interface
- Pre-transfer validation checks
- Post-transfer contract verification
- Safety invariant checks
- Failure recovery contracts
- Failure mode documentation

### FP-2 Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-2.1 | Pre-transfer validation checks | [x] Complete |
| FP-2.2 | Post-transfer contract verification | [x] Complete |
| FP-2.3 | Safety invariant enforcement | [x] Complete |
| FP-2.4 | Failure mode documentation | [x] Complete |

#### FP-2.1: Pre-transfer Validation Checks
- [ ] Validate source focus state before transfer
- [ ] Validate target is reachable and valid
- [ ] Check layer compatibility (e.g., can't transfer to Layer 5 from Layer 2)
- [ ] Verify user has permission to transfer focus
- [ ] Check for conflicting transfers in progress

#### FP-2.2: Post-transfer Contract Verification
- [ ] Verify postconditions are met after transfer
- [ ] Confirm target entity received focus
- [ ] Validate confidence score thresholds
- [ ] Log verification results for audit

#### FP-2.3: Safety Invariant Enforcement
- [ ] Ensure exactly one entity has focus at any time (unless explicitly released)
- [ ] Maintain focus hierarchy (Window Focus requires Application Focus)
- [ ] Prevent focus leaks to non-interactive entities
- [ ] Handle focus transfer atomicity guarantees

#### FP-2.4: Failure Mode Documentation
- [ ] Document all possible failure modes
- [ ] Define recovery strategies for each failure mode
- [ ] Log failures with sufficient context for debugging
- [ ] Provide user-facing error messages with recovery suggestions

### FP-2 Implementation Notes

FP-2 introduced the following new services to implement safety guarantees and contract enforcement:

| Service | File | Description |
|---------|------|-------------|
| Focus Transfer Contract | `focus-transfer-contract.ts` | Contract definitions including preconditions, postconditions, and safety invariants for all focus transfer operations |
| Pre-Transfer Validator | `focus-pre-validator.ts` | Pre-transfer validation checks ensuring source state validity, target reachability, and layer compatibility |
| Post-Transfer Validator | `focus-post-validator.ts` | Post-transfer contract verification confirming postconditions are met and target received focus |
| Safety Monitor | `focus-safety-monitor.ts` | Safety invariant monitoring ensuring focus state consistency (exactly one entity focused, hierarchy maintained) |
| Failure Modes | `focus-failure-modes.ts` | Failure mode catalog documenting all possible failure modes with recovery strategies |
| Failure Analyzer | `focus-failure-analyzer.ts` | Failure analysis service for diagnosing failures and providing recovery suggestions |

---

## FP-3: Scope Expansion

FP-3 expands focus management to support region-level focus (Layer 4) and cross-application focus patterns.

> **Note:** FP-3 has been split into FP-3A (Region Foundation) and FP-3B (Region Hardening + Ambiguity Control) for better incremental delivery.

### FP-3A: Region Foundation

FP-3A establishes the canonical region model and region-aware focus transfer capabilities.

#### FP-3A Goals

1. **Canonical Region Model**: Define region types for supported applications (VS Code, Chrome)
2. **Region Target Extension**: Extend FocusTarget to include region kind
3. **Region Transfer Handlers**: Implement region transfer for supported surfaces
4. **Region Verification**: Verify region-level focus transfers
5. **Region-Aware Confidence**: Extend confidence scoring with region factors
6. **Ambiguity Policy**: Handle ambiguous commands like "terminal"

#### FP-3A Deliverables

- [`focus-region-service.ts`](../../maestro/client/src/main/runtime/focus-region-service.ts) - Canonical region model
- [`focus-region-handler.ts`](../../maestro/client/src/main/runtime/focus-region-handler.ts) - Region transfer handlers
- [`focus-region-verification.ts`](../../maestro/client/src/main/runtime/focus-region-verification.ts) - Region verification
- [`focus-ambiguity-policy.ts`](../../maestro/client/src/main/runtime/focus-ambiguity-policy.ts) - Terminal ambiguity resolution
- Extended FocusTarget and FocusState with region support

#### FP-3A Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-3A.1 | Canonical region model for VS Code | [x] Complete |
| FP-3A.2 | Canonical region model for Chrome | [x] Complete |
| FP-3A.3 | FocusTarget extended with regionKind | [x] Complete |
| FP-3A.4 | Region transfer handlers | [x] Complete |
| FP-3A.5 | Region verification | [x] Complete |
| FP-3A.6 | Region-aware confidence scoring | [x] Complete |
| FP-3A.7 | Ambiguity policy for "terminal" | [x] Complete |

#### FP-3A.1: Canonical Region Model for VS Code
- [x] Define editor region
- [x] Define terminal region
- [x] Define sidebar region
- [x] Define panel region
- [x] Define activity_bar region
- [x] Define status_bar region
- [x] Define other VS Code regions (explorer, search, extensions, etc.)

#### FP-3A.2: Canonical Region Model for Chrome
- [x] Define page region
- [x] Define address_bar region
- [x] Define tab_bar region
- [x] Define bookmarks_bar region
- [x] Define devtools region
- [x] Define other Chrome regions (downloads, history, settings, etc.)

#### FP-3A.3: FocusTarget Extended with RegionKind
- [x] Add regionKind to FocusTarget interface
- [x] Add regionId to FocusTarget interface
- [x] Add regionKind to FocusState interface
- [x] Add REGION to FocusLayer enum

#### FP-3A.4: Region Transfer Handlers
- [x] Implement region transfer for VS Code
- [x] Implement region transfer for Chrome
- [x] Support keyboard shortcut navigation
- [x] Support command palette navigation
- [x] Support explicit focus navigation

#### FP-3A.5: Region Verification
- [x] Implement region verification service
- [x] Verify region transfer success
- [x] Detect current region in application
- [x] Calculate verification confidence

#### FP-3A.6: Region-Aware Confidence Scoring
- [x] Add base confidence from Layer 2-3
- [x] Add region active bonus
- [x] Apply method reliability weighting
- [x] Apply application reliability weighting
- [x] Add shortcut availability bonus
- [x] Add recent context bonus

#### FP-3A.7: Ambiguity Policy for "Terminal"
- [x] Detect terminal ambiguity
- [x] Generate possible resolutions
- [x] Implement context-based resolution
- [x] Implement prefer_integrated strategy
- [x] Implement prefer_standalone strategy
- [x] Implement prefer_recent strategy
- [x] Implement prompt_user threshold

---

### FP-3B: Region Hardening + Ambiguity Control

FP-3B builds on FP-3A to add hardening and ambiguity control for production use.

#### FP-3B Goals

1. **Region Transfer Hardening**: Add explicit fallback policies when shortcuts fail
2. **Shortcut Failure Handling**: Implement fail-fast, downgrade confidence, or suggest alternate routes
3. **Stable Debug/Telemetry Shape**: Create consistent event logging format
4. **Ambiguity Handling Expansion**: Expand beyond "terminal" to other ambiguous commands
5. **Region Test Matrix**: Implement test coverage for success/failure/ambiguity

#### FP-3B Deliverables

- [`focus-region-handler.ts`](../../maestro/client/src/main/runtime/focus-region-handler.ts) - Enhanced with fallback handling
- [`focus-region-test-matrix.ts`](../../maestro/client/src/main/runtime/focus-region-test-matrix.ts) - Test coverage matrix
- Enhanced [`focus-ambiguity-policy.ts`](../../maestro/client/src/main/runtime/focus-ambiguity-policy.ts) - Hardened ambiguity handling
- Enhanced [`focus-region-service.ts`](../../maestro/client/src/main/runtime/focus-region-service.ts) - Detection method documentation

#### FP-3B Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-3B.1 | Explicit fallback policy per region command | [x] Complete |
| FP-3B.2 | Stable debug event shape | [x] Complete |
| FP-3B.3 | Region test matrix | [x] Complete |
| FP-3B.4 | Hardened terminal ambiguity policy | [x] Complete |
| FP-3B.5 | Chrome page/address bar behavior documented | [x] Complete |
| FP-3B.6 | Heuristic vs verified detections documented | [x] Complete |

#### FP-3B.1: Explicit Fallback Policy Per Region Command

- [x] Implement fallback sequence for each region transfer method
- [x] Support fail_fast policy
- [x] Support try_alternate policy
- [x] Support downgrade_confidence policy
- [x] Support suggest_alternate policy
- [x] Apply confidence penalty for shortcut failures (0.25)
- [x] Apply confidence penalty for fallback attempts (0.1)

#### FP-3B.2: Stable Debug Event Shape

- [x] Define `RegionTransferDebugEvent` interface
- [x] Include eventType: transfer_attempted | transfer_method | verification_result | transfer_completed | transfer_failed
- [x] Include timestamp (ISO 8601)
- [x] Include targetEntity and targetRegion
- [x] Include method used
- [x] Include verificationResult
- [x] Include confidence score [0.0, 1.0]
- [x] Include ambiguity flag
- [x] Include fallbackMethod if applicable

#### FP-3B.3: Region Test Matrix

- [x] VS Code success test cases (editor, terminal, sidebar, explorer, search)
- [x] VS Code failure test cases (invalid region, unsupported app)
- [x] VS Code ambiguity test cases (terminal ambiguity)
- [x] VS Code fallback test cases
- [x] Chrome success test cases (page, address_bar, tab_bar, devtools, downloads, history)
- [x] Chrome failure test cases (invalid region, unsupported app)
- [x] Chrome fallback test cases

#### FP-3B.4: Hardened Terminal Ambiguity Policy

- [x] Add `FallbackAction` type: fail_fast | try_standalone | try_integrated | suggest_alternate
- [x] Implement fallback resolution when primary has low confidence
- [x] Clarify "integrated terminal exists" as heuristic vs verified
- [x] Add `requireExplicitIntegratedDetection` config option
- [x] Add detectionMethod to resolution (heuristic vs verified)

#### FP-3B.5: Chrome Page/Address Bar Behavior

- [x] Document Chrome address_bar as VERIFIED (Ctrl+L always works)
- [x] Document Chrome page as HEURISTIC (default when nothing else focused)
- [x] Document Chrome page "do nothing" as INTENTIONAL, not failure
- [x] Document Chrome tab_bar as HEURISTIC
- [x] Document Chrome devtools as VERIFIED (F12 always works)

#### FP-3B.6: Heuristic vs Verified Detections

- [x] Add `DetectionMethod` enum (VERIFIED, HEURISTIC)
- [x] Add `RegionDetectionInfo` interface with reliability scores
- [x] Add detectionMethod to RegionDefinition
- [x] Document all VS Code regions as VERIFIED
- [x] Document Chrome page, tab_bar as HEURISTIC
- [x] Document Chrome address_bar, devtools as VERIFIED

---

### FP-3 Goals

1. **Region Focus Support**: Implement focus management at the region level within windows (e.g., sidebar, content area, toolbar)
2. **Cross-Application Focus Patterns**: Enable focus transfers that span multiple applications with proper scope rules
3. **Focus Scope Rules**: Define and enforce rules for focus scope boundaries
4. **Window Management Integration**: Integrate with OS window management for region-aware focus transfers

### FP-3 Deliverables

- Region focus detection and tracking
- Cross-application scope rule engine
- Window hierarchy awareness
- Scope validation pipeline

### FP-3 Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-3.1 | Region focus detection | [ ] Pending |
| FP-3.2 | Cross-application scope rules | [ ] Pending |
| FP-3.3 | Window hierarchy awareness | [ ] Pending |
| FP-3.4 | Scope validation | [ ] Pending |

---

## Suggested next files to inspect

* [`focus-project-charter.md`](./focus-project-charter.md) - Governance and acceptance criteria
* [`focus-verification-service.ts`](../../maestro/client/src/main/runtime/focus-verification-service.ts) - Post-transfer verification (FP-1.1)
* [`focus-authority-service.ts`](../../maestro/client/src/main/runtime/focus-authority-service.ts) - Source-of-truth classification (FP-1.2)
* [`focus-history-service.ts`](../../maestro/client/src/main/runtime/focus-history-service.ts) - Expanded history with confidence scoring (FP-1.3-1.4)
* [`maestro/client/src/main/driver/stub.ts`](../../maestro/client/src/main/driver/stub.ts) - Layer 2-3 implementation
* [`focus-region-handler.ts`](../../maestro/client/src/main/runtime/focus-region-handler.ts) - Region transfer with fallback (FP-3B)
* [`focus-region-test-matrix.ts`](../../maestro/client/src/main/runtime/focus-region-test-matrix.ts) - Test matrix (FP-3B)

---

## Resume checklist

When starting a new AI session, read these first:

1. [`focus-project-charter.md`](./focus-project-charter.md)
2. [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
3. [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
4. [`maestro-decision-log.md`](./maestro-decision-log.md)

---

## When to lower reasoning

Keep `high` while implementing FP-3 acceptance criteria.

It is usually safe to drop to `medium` once the work is a bounded local implementation slice inside a chosen boundary.

Use `extra high` only for:
* Protocol redesign
* Authority or delegation changes
* Security boundary changes
* Layer boundary changes (Layer 4+)
* Roadmap reshaping after new evidence
