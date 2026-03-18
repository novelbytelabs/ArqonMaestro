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

* Date: 2026-03-18
* Program state: Phase 1 complete; Voice Plane Modernization is the active implementation wave
* Active wave: **Wave A** - Audio Front-End Modernization
* Wave A Status: **Patch 3 implemented (shadow mode)** - Silero shadow VAD + turn-event enrichment added; primary VAD remains authoritative
* Phase 2A/2B: Scaffolding integrated, implementations stubbed - cannot complete until Waves A-D complete
* Reasoning posture: `high` is appropriate while voice plane modernization begins

## Wave A Implementation Status (Audio Front-End Modernization)

### Patch 1: Frame Contract + Timestamps
- **Status**: ✅ Hard-closed
- **Files**: `maestro/client/src/main/audio/index.ts`
- **Changes**: Added AudioFrame interface with frameIndex, timestampMs, streamTimeMs, captureStartWallClockMs, sampleRate, channels

### Patch 2: Provider Boundaries
- **Status**: ✅ Hard-closed
- **Files**: 
  - `maestro/client/src/main/audio/denoise-provider.ts` - DenoiseProvider interface + NoopDenoiseProvider
  - `maestro/client/src/main/audio/vad-provider.ts` - VadProvider interface + DefaultVadProvider
- **Changes**: Wrapped existing VAD logic in DefaultVadProvider, added provider chain

### Test Suite
- **Status**: ✅ Audio suite passing (`56/56` tests, `9/9` suites)
- **Categories**: Unit, Integration, E2E, Regression (baseline commit `a05bf45` vs current), Adversarial
- **Location**: `maestro/client/src/test/audio/`

### Wave A Patch 1+2 Hard-Close Acceptance Record
- **Closeout date**: 2026-03-18
- **Evidence run**: `cd maestro/client && ./node_modules/.bin/jest src/test/audio --runInBand`
- **What Patch 1 delivered**: coherent frame timestamp contract validated on real recorder path (`frameIndex`, `streamTimeMs`, `timestampMs`)
- **What Patch 2 delivered**: provider boundaries validated in recorder path (`NoopDenoiseProvider` -> `DefaultVadProvider`) with transition parity checks
- **Regression status**: fixture-based baseline comparison against commit `2c2a7b7` passed for event ordering, start/end counts, and pre-roll behavior
- **Production-code delta during closeout**: none required (closeout changes were test/docs only)
- **Patch 3 status**: still open; no Patch 3 scope was pulled into this closeout

### Patch 3: Silero Shadow Mode + Turn Event Enrichment
- **Status**: ✅ Implemented (shadow-only, no primary cutover)
- **Primary behavior**: `DefaultVadProvider` still drives live speaking state and chunk transitions
- **Shadow behavior**: `SileroVadProvider` runs on the same frames and emits frame-by-frame comparison telemetry
- **Turn layer additions**: `speech_start`, `speech_end`, `barge_in_candidate`, `interrupt_candidate`
- **Comparison surface**: per-frame agreement/disagreement + speech-probability delta + shadow lead frame count
- **Patch boundary**: this patch does not replace the primary VAD path and does not implement final playback interruption policy

---

## Phase 2A/2B Implementation Status

> **⚠️ IMPORTANT**: Phase 2A and 2B have been integrated into the executor but contain STUBBED implementations. These phases cannot complete until **Voice Plane Modernization (Waves A-D)** is complete. See [`maestro-project-roadmap.md`](./maestro-project-roadmap.md) for detailed gap analysis and prerequisite order.

> **⚠️ GOVERNANCE NOTE**: `maestro-project-roadmap.md` is the canonical phase authority. This document is a code snapshot. If they conflict, the roadmap wins.

### FP-2A: Identity and Safety Gating

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Speaker Enrollment | `maestro/client/src/main/runtime/speaker-enrollment-service.ts` | STUB | In-memory Map, no persistence |
| Speaker Verification | `maestro/client/src/main/runtime/speaker-verification-service.ts` | STUB | Returns mock states, no STT integration |
| Authorization Service | `maestro/client/src/main/runtime/authorization-service.ts` | ✅ REAL | Decision logic is functional |
| Security Mode | `maestro/client/src/main/runtime/security-mode-service.ts` | ✅ REAL | State machine works |
| Identity Gateway | `maestro/client/src/main/runtime/identity-gateway-service.ts` | ✅ REAL | API integrated in executor |

**Integration Status:**
- ✅ Identity gateway integrated into executor.ts
- ✅ Authorization check runs before command execution
- ✅ LOW risk commands (focus, navigation) pass for unknown speakers
- ⚠️ HIGH risk commands blocked (as designed, but based on stub data)

### FP-2B: Workflow and Delegation

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Workflow Contracts | `maestro/client/src/main/runtime/workflow-contract-service.ts` | ✅ REAL | Types and execution logic |
| Workflow Execution | `maestro/client/src/main/runtime/workflow-nexus-integration.ts` | STUB | Not integrated into command chain |
| Nexus Protocol | `maestro/client/src/main/runtime/nexus-protocol-boundary-service.ts` | STUB | Protocol defined, no IPC |
| Delegation Grants | `maestro/client/src/main/runtime/delegation-grant-service.ts` | STUB | In-memory only |

**Integration Status:**
- ⚠️ Workflow service instantiated in executor but not used
- ⚠️ Nexus boundary instantiated but not connected to Arqon Bus

### To Complete FP-2A:

1. **Add persistence to Speaker Enrollment**
   - File: [`speaker-enrollment-service.ts`](../../maestro/client/src/main/runtime/speaker-enrollment-service.ts)
   - Add: `persist()` / `load()` methods using file system or database

2. **Integrate Dedicated Speaker Verification Backend**
   - File: [`speaker-verification-service.ts`](../../maestro/client/src/main/runtime/speaker-verification-service.ts)
   - Add: Call to dedicated verification backend (pyannote.audio or WeSpeaker) for voiceprint matching
   - Note: Speaker verification is separate from STT; it consumes audio segments but does not depend on STT provider integration
   - Methods to implement: `verifySpeaker()`, `enrollSpeaker()`, `getVoiceProfile()`

3. **Add Diarization Support**
   - File: [`speaker-verification-service.ts`](../../maestro/client/src/main/runtime/speaker-verification-service.ts)
   - Add: Multi-speaker detection for shared-room mode

4. **Add Tests**
   - Unit tests for authorization decisions
   - Integration tests for identity flow

### To Complete FP-2B:

1. **Integrate Workflow into Command Chain**
   - File: [`executor.ts`](../../maestro/client/src/main/execute/executor.ts)
   - Add: Workflow execution step after command parsing for multi-step commands

2. **Add Arqon Bus IPC for Nexus**
   - File: [`nexus-protocol-boundary-service.ts`](../../maestro/client/src/main/runtime/nexus-protocol-boundary-service.ts)
   - Add: Real IPC calls to Nexus instead of in-memory message store

3. **Add Delegation Persistence**
   - File: [`delegation-grant-service.ts`](../../maestro/client/src/main/runtime/delegation-grant-service.ts)
   - Add: File-based or database storage for grants

4. **Add Tests**
   - Unit tests for workflow state machine
   - Integration tests for Nexus boundary

---

## Layer Implementation Status

| Layer | Name | Status | Implementation Notes |
|-------|------|--------|---------------------|
| 2 | Application Focus | ✅ Complete | stub.ts driver + verification |
| 3 | Window Focus | ✅ Complete | stub.ts driver + verification |
| 4 | Region | ✅ Complete (FP-3B) | Hardening + Ambiguity Control |
| 5 | Control | ✅ Complete (FP-4B) | Precision Focus Hardening |
| 6 | Item | ⏸ Deferred | Not in FP-4 scope |
| 7 | Caret | ✅ Complete (FP-4B) | Precision Focus Hardening |
| 8 | Semantic Routing | ✅ Complete (FP-6B) | Intent Routing Hardening |

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

FP-6A and FP-6B are complete. Focus Project is now fully complete through Layer 8.

### Completed inside FP-6A:
* Intent target model creation
* Explicit scope parsing (code → vscode, chrome → chrome)
* Implicit routing rules (paste → editor, run → terminal)
* Routing confidence computation
* Basic routing telemetry interface

### Completed inside FP-6B:
* Extended routing telemetry with outcome classification
* Focus-routing agreement checks
* Scoped action validation
* Degraded routing distinction (fallback != success)
* Precision and safety gate integration
* Expanded routing test matrix

---

## Next implementation target

Focus Project is complete through FP-6B. No further milestones currently authorized.

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

## FP-4: Precision Focus

FP-4 focuses on precision focus at Layer 5 (Control) and Layer 7 (Caret) for text insertion safety.

> **Note:** FP-4 has been split into FP-4A (Precision Focus Foundations) and FP-4B (Precision Focus Hardening) for better incremental delivery.

### FP-4A: Precision Focus Foundations

FP-4A establishes the precision focus model and text insertion safety checks.

#### FP-4A Goals

1. **Precision Surface Model**: Define approved surfaces for precision focus (VS Code editor, terminal, Chrome address bar)
2. **Caret Presence Detection**: Detect caret presence in text controls (not full semantics)
3. **Selection Tracking**: Track selection state where practical
4. **Text Insertion Precheck**: Safety check before text insertion operations
5. **Detection Authority**: Document how focus/caret is detected

#### FP-4A Deliverables

- [`focus-precision-service.ts`](../../maestro/client/src/main/runtime/focus-precision-service.ts) - Precision focus tracking
- Detection authority classification
- Text insertion safety checks
- Selection state tracking

#### FP-4A Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-4A.1 | Approved surfaces model | [x] Complete |
| FP-4A.2 | Caret presence detection | [x] Complete |
| FP-4A.3 | Selection tracking | [x] Complete |
| FP-4A.4 | Text insertion precheck | [x] Complete |
| FP-4A.5 | Detection authority documentation | [x] Complete |

---

### FP-4B: Precision Focus Hardening

FP-4B builds on FP-4A to add hardening and production-ready features.

#### FP-4B Goals (PM Hardening Notes)

1. **Normalize Precision State Model**: Separate "editable" from "caret present"
2. **Selection Authority**: Add selection authority to telemetry
3. **Terminal Caret Semantics**: Document exact detection method with conservative semantics
4. **Blocked Insertion Messages**: Add user-safe error messages for blocked insertions
5. **Insertion-Class Guards**: Integrate insertion-class command guards
6. **Test Matrix**: Build comprehensive precision test matrix

#### FP-4B Deliverables

- Normalized `PrecisionFocusState` with separated editable/caret
- `SelectionAuthority` enum for telemetry
- `TerminalCaretDetectionMethod` documentation
- `BlockedInsertionResult` with user-safe messages
- `InsertionCommandType` classification
- [`focus-precision-service.spec.ts`](../../maestro/client/src/test/focus-precision-service.spec.ts) - Test matrix

#### FP-4B Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-4B.1 | Normalized precision state model | [x] Complete |
| FP-4B.2 | Selection authority in telemetry | [x] Complete |
| FP-4B.3 | Terminal caret detection documented | [x] Complete |
| FP-4B.4 | Blocked insertion messages | [x] Complete |
| FP-4B.5 | Insertion-class command guards | [x] Complete |
| FP-4B.6 | Precision test matrix | [x] Complete |

#### FP-4B.1: Normalized Precision State Model

- [x] Add `EditableState` interface (separate from caret)
- [x] Add `CaretPresenceState` with hasCaret flag
- [x] Include both in `PrecisionFocusState`
- [x] Document: "editable" = can accept text, "caret" = cursor present

#### FP-4B.2: Selection Authority in Telemetry

- [x] Add `SelectionAuthority` enum (APPLICATION_API, ACCESSIBILITY, INFERRED)
- [x] Add confidence scores for each authority
- [x] Include in `SelectionState` interface
- [x] Map from detection authority to selection authority

#### FP-4B.3: Terminal Caret Detection (PM Hardening Notes)

- [x] Add `TerminalCaretDetectionMethod` enum
- [x] Document VS Code Terminal API method
- [x] Document conservative fallback for unknown terminals
- [x] Add `TerminalCaretDetectionResult` interface
- [x] Use conservative confidence (0.7) for VS Code terminal

#### FP-4B.4: Blocked Insertion Messages

- [x] Add `BlockedInsertionResult` interface
- [x] Include userSafeMessage field
- [x] Add `checkBlockedInsertion()` method
- [x] Add `getBlockedInsertionUserMessage()` helper
- [x] Add `getAnyUserSafeMessage()` unified interface

#### FP-4B.5: Insertion-Class Command Guards

- [x] Add `InsertionCommandType` enum
- [x] Add `isInsertionClassCommand()` function
- [x] Add `classifyInsertionCommand()` function
- [x] Block insertions when no caret for text input commands
- [x] Allow paste without caret (safer)

#### FP-4B.6: Precision Test Matrix

- [x] Test detection authority confidence
- [x] Test selection authority confidence
- [x] Test insertion command detection
- [x] Test insertion command classification
- [x] Test precision surface detection
- [x] Test caret presence detection
- [x] Test editable state detection
- [x] Test terminal caret detection
- [x] Test selection state with authority
- [x] Test blocked insertion checks
- [x] Test user-safe error messages
- [x] Test complete precision focus state

---

## FP-5A: Recovery Foundations

FP-5A adds bounded recovery capabilities to handle focus drift and failure scenarios.

### FP-5A Goals

1. **Drift Detection**: Detect when focus state diverges from expected state
2. **Recovery Action Taxonomy**: Define recovery action types (refocus, restore, abort)
3. **Recovery Policy Selection**: Select appropriate recovery policy based on drift type
4. **Bounded Recovery**: Limit recovery attempts to prevent infinite loops
5. **User-Safe Messages**: Provide safe messages for recovery failures

### FP-5A Deliverables

- [`focus-recovery-service.ts`](../../maestro/client/src/main/runtime/focus-recovery-service.ts) - Recovery orchestration
- Drift detection logic
- Recovery policy selection
- Bounded retry logic
- User-safe error messages

### FP-5A Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-5A.1 | Drift detection | [x] Complete |
| FP-5A.2 | Recovery action taxonomy | [x] Complete |
| FP-5A.3 | Recovery policy selection | [x] Complete |
| FP-5A.4 | Bounded recovery | [x] Complete |
| FP-5A.5 | User-safe messages | [x] Complete |

---

## FP-5B: Recovery Hardening + State Integrity

FP-5B builds on FP-5A to add state integrity verification and production hardening.

### FP-5B Goals

1. **State Integrity Verification**: Verify focus state age and trust level
2. **Restoration Eligibility**: Determine if previous state can be restored
3. **Recovery Telemetry**: Add comprehensive recovery event logging
4. **Expiration Policies**: Implement state expiration thresholds
5. **Recovery Capabilities**: Define per-application recovery support

### FP-5B Deliverables

- State integrity thresholds (STALE: 5 min, EXPIRED: 10 min)
- Restoration eligibility checker
- Recovery telemetry interface
- Application recovery capabilities matrix

### FP-5B Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-5B.1 | State integrity thresholds | [x] Complete |
| FP-5B.2 | Restoration eligibility | [x] Complete |
| FP-5B.3 | Recovery telemetry | [x] Complete |
| FP-5B.4 | Expiration policies | [x] Complete |
| FP-5B.5 | Recovery capabilities | [x] Complete |

---

## FP-6A: Intent Routing Foundations

FP-6A adds intent-based routing with explicit scope and bounded implicit rules.

> **Note:** This is the first bounded move into Layer 8 — Intent Target.

### FP-6A Goals

1. **Intent Target Model**: Create distinct intent target model (separate from focus state)
2. **Explicit Scope Routing**: Route commands with explicit scope (e.g., "in code")
3. **Implicit Target Rules**: Apply bounded implicit rules for supported surfaces
4. **Routing Confidence**: Compute and report routing confidence
5. **Routing Telemetry**: Log routing decisions for debugging
6. **Safety Integration**: Ensure routing flows through safety/precision/recovery

### FP-6A Deliverables

- [`intent-routing-service.ts`](../../maestro/client/src/main/runtime/intent-routing-service.ts) - Intent routing service
- [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md) - Intent routing documentation
- IntentTarget model
- Explicit scope mappings (code → vscode, chrome → chrome)
- Implicit routing rules (paste → editor, run → terminal)
- Routing confidence computation
- Routing telemetry

### FP-6A Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-6A.1 | Intent target model exists | [x] Complete |
| FP-6A.2 | Explicit scope routing | [x] Complete |
| FP-6A.3 | Implicit target rules | [x] Complete |
| FP-6A.4 | Routing confidence | [x] Complete |
| FP-6A.5 | Routing telemetry | [x] Complete |
| FP-6A.6 | Safety integration | [x] Complete |
| FP-6A.7 | No regressions | [x] Complete |

---

## FP-6B: Intent Routing Hardening + Scoped Action Safety

FP-6B hardens intent routing so explicitly scoped and narrowly implicit actions are safer, more inspectable, and more resistant to focus/routing mismatch.

### FP-6B Goals

1. **Routing Telemetry Hardening**: Extend telemetry for operational inspection
2. **Focus-Routing Agreement**: Check compatibility before execution
3. **Scoped Action Validation**: Validate actions against compatible targets
4. **Degraded Routing Policy**: Make fallback visibly distinct from success
5. **Test Matrix Expansion**: Add comprehensive routing tests

### FP-6B Deliverables

- Extended routing telemetry with outcome classification
- Focus-routing agreement checking
- Scoped action validation
- Degraded routing distinction
- Precision and safety gate integration
- Expanded test matrix

### FP-6B Acceptance Criteria

| ID | Criterion | Status |
|----|-----------|--------|
| FP-6B.1 | Rich telemetry for inspection | [x] Complete |
| FP-6B.2 | Focus-routing agreement checks | [x] Complete |
| FP-6B.3 | Scoped action validation | [x] Complete |
| FP-6B.4 | Degraded routing distinction | [x] Complete |
| FP-6B.5 | Precision/safety gates | [x] Complete |
| FP-6B.6 | Test matrix expansion | [x] Complete |
| FP-6B.7 | No regressions | [x] Complete |

---

## Suggested next files to inspect

* [`focus-project-charter.md`](./focus-project-charter.md) - Governance and acceptance criteria
* [`focus-verification-service.ts`](../../maestro/client/src/main/runtime/focus-verification-service.ts) - Post-transfer verification (FP-1.1)
* [`focus-authority-service.ts`](../../maestro/client/src/main/runtime/focus-authority-service.ts) - Source-of-truth classification (FP-1.2)
* [`focus-history-service.ts`](../../maestro/client/src/main/runtime/focus-history-service.ts) - Expanded history with confidence scoring (FP-1.3-1.4)
* [`maestro/client/src/main/driver/stub.ts`](../../maestro/client/src/main/driver/stub.ts) - Layer 2-3 implementation
* [`focus-region-handler.ts`](../../maestro/client/src/main/runtime/focus-region-handler.ts) - Region transfer with fallback (FP-3B)
* [`focus-region-test-matrix.ts`](../../maestro/client/src/main/runtime/focus-region-test-matrix.ts) - Test matrix (FP-3B)
* [`focus-precision-service.ts`](../../maestro/client/src/main/runtime/focus-precision-service.ts) - Precision focus (FP-4A/4B)
* [`focus-recovery-service.ts`](../../maestro/client/src/main/runtime/focus-recovery-service.ts) - Recovery (FP-5A/5B)
* [`intent-routing-service.ts`](../../maestro/client/src/main/runtime/intent-routing-service.ts) - Intent routing (FP-6A)
* [`maestro-intent-routing-v0.1.md`](./maestro-intent-routing-v0.1.md) - Intent routing docs

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
