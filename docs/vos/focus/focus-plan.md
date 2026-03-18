# Focus Project Master Plan

> **Document Type:** Master Plan Overview  
> **Version:** 1.0  
> **Last Updated:** 2026-03-18  
> **Status:** Active

---

## 1. Introduction

The **Focus Project** is a systematic initiative to build robust, context-aware focus management into the Arqon Maestro voice operating system. Focus—the system responsible for determining which application, window, or region should receive voice commands—is a foundational capability that enables reliable voice control across the entire computing environment.

The Focus Project addresses a fundamental challenge in voice-driven computing: **determining intent with precision**. When a user speaks a command, the system must accurately identify:

- **Which application** should receive the command
- **Which window or tab** within that application
- **Which region** of the interface (e.g., editor panel, terminal, sidebar)
- **What the user is referring to** when using contextual pronouns

The project progresses through 10 phases (FP-1 through FP-10), each building on the previous to create a comprehensive focus management system. By FP-6, the core focus infrastructure is complete; subsequent phases extend capabilities toward human-like contextual understanding.

---

## 2. Phase Overview Table

| Phase | Name | Status | Description | Key Deliverables |
|-------|------|--------|-------------|------------------|
| **FP-1** | Verification | ✅ Complete | Verified focus core | Core focus detection working |
| **FP-2** | Safety + Contracts | ✅ Complete | Pre/post validation, safety invariants | Pre/post validators, safety invariants |
| **FP-3** | Region Focus | ✅ Complete | VS Code, Chrome regions | VS Code + Chrome region detection |
| **FP-4** | Precision Focus | ✅ Complete | Control, caret detection | Caret position tracking, control focus |
| **FP-5** | Recovery | ✅ Complete | Drift detection, bounded recovery | Drift detection, recovery mechanisms |
| **FP-6** | Intent Routing | ✅ Complete | Explicit + implicit routing | Explicit/implicit routing rules |
| **FP-7** | Referential Intent | 📋 In Progress | "this", "that", "it" support | Pronoun resolution, referential context |
| **FP-8** | Modal + Restore | 📋 Proposed | Modal detection + focus restore | Modal awareness, focus restoration |
| **FP-9** | Surface Expansion | 📋 Proposed | Cross-surface unification | Multi-surface coordination |
| **FP-10** | Language Integration | 📋 Proposed | Complete VOS runtime | Full VOS runtime integration |

---

## 3. Current Status

**Current Phase:** FP-6B (Intent Routing - Complete)

The Focus Project has completed its first six phases, establishing a robust foundation for focus management:

- ✅ **FP-1 through FP-6A:** Core focus infrastructure complete
- ✅ **FP-6B:** Intent routing implementation finalized
- 📋 **FP-7:** Referential Intent is currently in progress

The completed phases provide:
- Accurate focus detection across applications
- Safe pre/post validation of focus state
- Region-level focus within VS Code and Chrome
- Precise caret and control tracking
- Drift detection and bounded recovery
- Explicit and implicit intent routing

---

## 4. Completed Phases

### FP-1: Verification
**Status:** ✅ Complete

Verified that the core focus detection mechanism works correctly. Established baseline functionality for determining which application and window has focus.

**Key Achievements:**
- Core focus detection pipeline operational
- Cross-application focus tracking verified

**Related Documentation:**
- [Focus Project Charter](./focus-project-charter.md)
- [Focus Validation Note FP-1 FP-2](./focus-project-validation-note-fp1-fp2.md)

---

### FP-2: Safety + Contracts
**Status:** ✅ Complete

Implemented pre/post validation and safety invariants to ensure focus operations are safe and predictable. Created contracts that guarantee focus state integrity.

**Key Achievements:**
- Pre-validator ensures safe focus transitions
- Post-validator confirms correct focus state
- Safety invariants prevent focus drift

**Related Documentation:**
- [Focus Validation Note FP-1 FP-2](./focus-project-validation-note-fp1-fp2.md)

---

### FP-3: Region Focus
**Status:** ✅ Complete

Extended focus detection to the region level within VS Code and Chrome. Enables commands to target specific areas within an application.

**Key Achievements:**
- VS Code region detection (editor, terminal, sidebar, panel)
- Chrome region detection (tabs, address bar, content area)
- Region context available for command routing

**Related Documentation:**
- [Focus Technote](./focus-technote.md)

---

### FP-4: Precision Focus
**Status:** ✅ Complete

Achieved sub-element focus precision with caret position tracking and control-level focus detection.

**Key Achievements:**
- Caret position detection within text editors
- Control-level focus (buttons, inputs, menus)
- Precise focus for granular command targeting

**Related Documentation:**
- [Maestro Focus Precision v0.1](./maestro-focus-precision-v0.1.md)
- [Focus Technote](./focus-technote.md)

---

### FP-5: Recovery
**Status:** ✅ Complete

Implemented drift detection and bounded recovery mechanisms to handle focus failures gracefully.

**Key Achievements:**
- Drift detection identifies when focus becomes unreliable
- Bounded recovery attempts to restore correct focus state
- Recovery truthfulness validation

**Related Documentation:**
- [Focus Recovery Technical Documentation](./focus-recovery-technical-documentation.md)
- [Maestro Focus Recovery Plan](./maestro-focus-recovery-plan.md)
- [Maestro Focus Recovery v0.1](./maestro-focus-recovery-v0.1.md)
- [Recovery Truthfulness Test Sheet](./recovery-truthfulness-test-sheet.md)

---

### FP-6: Intent Routing
**Status:** ✅ Complete

Implemented explicit and implicit intent routing to determine command destination based on user input and context.

**Key Achievements:**
- Explicit routing via direct application naming
- Implicit routing based on context and history
- Fallback strategies for ambiguous commands

**Related Documentation:**
- [Maestro Focus Phase Handoff](./maestro-focus-phase-handoff.md)
- [Maestro Intent Routing v0.1](./maestro-intent-routing-v0.1.md) *(referenced in maestro-vos-plan.md)*

---

## 5. Future Phases

### FP-7: Referential Intent
**Status:** 📋 In Progress

Implements support for contextual pronouns ("this", "that", "it") to enable natural reference to previously mentioned targets.

**Goals:**
- Track recent focus targets in context window
- Resolve pronouns to specific UI elements
- Handle chain references ("do that again")

**Key Challenges:**
- Maintaining referential context across commands
- Handling ambiguous pronoun resolution
- Memory management for context history

**Related Documentation:**
- [Maestro Referential Intent v0.1](./maestro-referential-intent-v0.1.md)

---

### FP-8: Modal + Restore
**Status:** 📋 Proposed

Detect modal dialogs and overlays, enabling proper focus restoration after modal interactions.

**Goals:**
- Identify modal windows and dialogs
- Track focus state before modal activation
- Restore focus to correct element after modal closes

**Related Documentation:**
- [Maestro Modal Awareness v0.1](./maestro-modal-awareness-v0.1.md)

---

### FP-9: Surface Expansion
**Status:** 📋 Proposed

Unify focus management across multiple surfaces (desktop, browser, terminal) for seamless cross-surface operation.

**Goals:**
- Coordinate focus across different computing surfaces
- Enable surface-hopping commands ("switch to terminal")
- Unified surface state representation

**Related Documentation:**
- [Maestro Surface Expansion v0.1](./maestro-surface-expansion-v0.1.md)

---

### FP-10: Language Integration
**Status:** 📋 Proposed

Complete the VOS runtime integration, embedding focus management deeply into the language understanding pipeline.

**Goals:**
- Integrate focus state into language model context
- Enable focus-aware command interpretation
- Complete end-to-end focus management system

**Related Documentation:**
- [Maestro Language System Integration v0.1](./maestro-language-system-integration-v0.1.md)

---

## 6. Phase Dependencies

The Focus Project phases are designed to build upon each other sequentially:

```
FP-1 (Verification)
    ↓
FP-2 (Safety + Contracts)    [Requires FP-1]
    ↓
FP-3 (Region Focus)           [Requires FP-2]
    ↓
FP-4 (Precision Focus)        [Requires FP-3]
    ↓
FP-5 (Recovery)               [Requires FP-4]
    ↓
FP-6 (Intent Routing)         [Requires FP-5]
    ↓
FP-7 (Referential Intent)     [Requires FP-6]
    ↓
FP-8 (Modal + Restore)        [Requires FP-7]
    ↓
FP-9 (Surface Expansion)      [Requires FP-8]
    ↓
FP-10 (Language Integration)  [Requires FP-9]
```

### Dependency Rationale

1. **FP-1 → FP-2:** Safety mechanisms require a verified core to protect
2. **FP-2 → FP-3:** Safe region detection builds on validated focus
3. **FP-3 → FP-4:** Precision requires region context
4. **FP-4 → FP-5:** Recovery needs precise focus tracking
5. **FP-5 → FP-6:** Routing benefits from recovery capabilities
6. **FP-6 → FP-7:** Referential intent requires routing infrastructure
7. **FP-7 → FP-8:** Modal detection builds on referential tracking
8. **FP-8 → FP-9:** Surface expansion requires modal awareness
9. **FP-9 → FP-10:** Language integration completes the stack

---

## 7. Documentation Index

### Core Project Documents
| Document | Description |
|----------|-------------|
| [Focus Project Charter](./focus-project-charter.md) | Original project charter and scope |
| [Focus Technote](./focus-technote.md) | Technical overview and architecture |
| [Focus Plan (This Document)](./focus-plan.md) | Master plan overview |

### Phase-Specific Documents
| Document | Phase(s) |
|----------|----------|
| [Focus Validation Note FP-1 FP-2](./focus-project-validation-note-fp1-fp2.md) | FP-1, FP-2 |
| [Maestro Focus Precision v0.1](./maestro-focus-precision-v0.1.md) | FP-4 |
| [Maestro Focus Recovery Plan](./maestro-focus-recovery-plan.md) | FP-5 |
| [Maestro Focus Recovery v0.1](./maestro-focus-recovery-v0.1.md) | FP-5 |
| [Maestro Focus Phase Handoff](./maestro-focus-phase-handoff.md) | FP-6 |
| [Maestro Referential Intent v0.1](./maestro-referential-intent-v0.1.md) | FP-7 |
| [Maestro Modal Awareness v0.1](./maestro-modal-awareness-v0.1.md) | FP-8 |
| [Maestro Surface Expansion v0.1](./maestro-surface-expansion-v0.1.md) | FP-9 |
| [Maestro Language System Integration v0.1](./maestro-language-system-integration-v0.1.md) | FP-10 |

### Supporting Documents
| Document | Description |
|----------|-------------|
| [Focus Recovery Technical Documentation](./focus-recovery-technical-documentation.md) | Technical deep-dive on recovery |
| [Maestro Focus Test Plan](./maestro-focus-test-plan.md) | Testing strategy |
| [Recovery Truthfulness Test Sheet](./recovery-truthfulness-test-sheet.md) | Validation test cases |

### External References
| Document | Description |
|----------|-------------|
| [Maestro VOS Plan](../maestro-vos-plan.md) | Overall VOS roadmap |
| [Maestro Overview](../maestro-overview.md) | VOS system overview |

---

## 8. Quick Reference

### Status Legend
- ✅ Complete - Phase fully implemented and tested
- 📋 In Progress - Active development
- 📋 Proposed - Planned but not started
- 🔄 In Review - Undergoing validation

### Key Contacts
- **Focus Project Lead:** (See maestro-vos-plan.md)
- **Documentation Owner:** docs/vos/focus/

### Related Projects
- **Intent Routing:** Part of Maestro Command System
- **Surface Model:** maestro-surface-model.md
- **Language Constitution:** maestro-language-constitution.md

---

*This document is maintained as part of the Focus Project. For questions or updates, refer to the documentation index or contact the VOS team.*
