# Focus Technical Note

> **Version:** 1.0  
> **Date:** 2026-03-17  
> **Status:** COMPLETE - Phase 1 (1A, 1B, 1C) Hard Closed

## Overview

This document catalogs the core implementation files for the Arqon Maestro Focus System. The Focus System implements a layered focus management architecture covering Layers 2-8, with comprehensive recovery, safety, and validation capabilities.

---

## Architecture Summary

The Focus System implements 8 layers:

| Layer | Name | Description |
|-------|------|-------------|
| 2 | Application Focus | Focus at the OS application level |
| 3 | Window Focus | Focus within an application window |
| 4 | Region | Focus within a window region (sidebar, terminal, editor) |
| 5 | Control | Focus on specific UI controls |
| 6 | Item | Focus on items within controls |
| 7 | Caret | Text caret positioning |
| 8 | Semantic Routing | Intent-based focus routing |

---

## Core Implementation Files

### Location: `maestro/client/src/main/runtime/`

Total: **19 core TypeScript files**

### 1. Recovery System (FP-5A/5B)

| File | Size | Purpose |
|------|------|---------|
| [`focus-recovery-service.ts`](../../maestro/client/src/main/runtime/focus-recovery-service.ts) | 45KB | **Main orchestrator** - Recovery engine, delegates to subsystems (ADM-048) |
| [`focus-recovery-analyzer.ts`](../../maestro/client/src/main/runtime/focus-recovery-analyzer.ts) | 17KB | Drift detection, state integrity classification |
| [`focus-recovery-policy.ts`](../../maestro/client/src/main/runtime/focus-recovery-policy.ts) | 10KB | Recovery policy selection (RETRY, RESTORE, ABORT) |

### 2. Region Focus (FP-3A/3B)

| File | Size | Purpose |
|------|------|---------|
| [`focus-region-service.ts`](../../maestro/client/src/main/runtime/focus-region-service.ts) | 26KB | Canonical region model for VS Code, Chrome |
| [`focus-region-handler.ts`](../../maestro/client/src/main/runtime/focus-region-handler.ts) | 23KB | Region transfer handlers with fallback |
| [`focus-region-verification.ts`](../../maestro/client/src/main/runtime/focus-region-verification.ts) | 9KB | Region verification |
| [`focus-region-test-matrix.ts`](../../maestro/client/src/main/runtime/focus-region-test-matrix.ts) | 11KB | Test coverage matrix |

### 3. Precision Focus (FP-4A/4B)

| File | Size | Purpose |
|------|------|---------|
| [`focus-precision-service.ts`](../../maestro/client/src/main/runtime/focus-precision-service.ts) | 40KB | Layer 5-7 precision focus, caret detection, text insertion safety |

### 4. Validation & Safety (FP-2)

| File | Size | Purpose |
|------|------|---------|
| [`focus-pre-validator.ts`](../../maestro/client/src/main/runtime/focus-pre-validator.ts) | 16KB | Pre-transfer validation checks |
| [`focus-post-validator.ts`](../../maestro/client/src/main/runtime/focus-post-validator.ts) | 14KB | Post-transfer contract verification |
| [`focus-safety-monitor.ts`](../../maestro/client/src/main/runtime/focus-safety-monitor.ts) | 15KB | Safety invariant monitoring |
| [`focus-transfer-contract.ts`](../../maestro/client/src/main/runtime/focus-transfer-contract.ts) | 16KB | Transfer contract definitions |

### 5. Verification & Authority (FP-1)

| File | Size | Purpose |
|------|------|---------|
| [`focus-verification-service.ts`](../../maestro/client/src/main/runtime/focus-verification-service.ts) | 9KB | Post-transfer verification |
| [`focus-authority-service.ts`](../../maestro/client/src/main/runtime/focus-authority-service.ts) | 8KB | Source-of-truth classification |

### 6. History & Telemetry

| File | Size | Purpose |
|------|------|---------|
| [`focus-history-service.ts`](../../maestro/client/src/main/runtime/focus-history-service.ts) | 20KB | Focus transition history with timestamps |

### 7. Ambiguity & Failure Handling

| File | Size | Purpose |
|------|------|---------|
| [`focus-ambiguity-policy.ts`](../../maestro/client/src/main/runtime/focus-ambiguity-policy.ts) | 21KB | Handle ambiguous commands (e.g., "terminal") |
| [`focus-failure-modes.ts`](../../maestro/client/src/main/runtime/focus-failure-modes.ts) | 13KB | Catalog of failure modes |
| [`focus-failure-analyzer.ts`](../../maestro/client/src/main/runtime/focus-failure-analyzer.ts) | 17KB | Failure diagnosis and recovery suggestions |

### 8. Intent Routing (FP-6A/6B)

| File | Size | Purpose |
|------|------|---------|
| [`intent-routing-service.ts`](../../maestro/client/src/main/runtime/intent-routing-service.ts) | 34KB | Layer 8 semantic routing |

---

## Key Design Decisions (ADM)

| ADM | Decision | Reference |
|-----|----------|-----------|
| ADM-048 | Recovery is an orchestrator, NOT a driver - delegates to subsystems | [`focus-recovery-service.ts`](../../maestro/client/src/main/runtime/focus-recovery-service.ts) |
| ADM-049 | Recovery taxonomy includes PRECISION_GUARD_BLOCKED and SAFETY_GATE_BLOCKED | [`focus-recovery-policy.ts`](../../maestro/client/src/main/runtime/focus-recovery-policy.ts) |
| ADM-050 | Focus should NOT launch - keep focus vs launch separate | [`focus-pre-validator.ts`](../../maestro/client/src/main/runtime/focus-pre-validator.ts) |

---

## Recovery Truthfulness

The Focus System implements **honest recovery telemetry**:

- Reports deepest level actually verified
- Marks degraded outcomes correctly
- Never claims success when verification fails

### Test Results (All Pass)

| Test ID | Description | Status |
|---------|-------------|--------|
| REC-HONESTY-001 | Partial restore, not full | ✅ PASS |
| REC-HONESTY-002 | Full layered restore | ✅ PASS |
| REC-HONESTY-003 | Control recovery downgrade | ✅ PASS |
| REC-HONESTY-004 | Missing target restore (ADM-050) | ✅ PASS |
| REC-HONESTY-005 | Code path verification | ✅ PASS |
| REC-HONESTY-006 | Region focus verify | ✅ PASS |

See: [`recovery-truthfulness-test-sheet.md`](./recovery-truthfulness-test-sheet.md)

---

## Documentation References

| Document | Purpose |
|----------|---------|
| [`focus-project-charter.md`](./focus-project-charter.md) | Governance, terminology, acceptance criteria |
| [`focus-recovery-technical-documentation.md`](./focus-recovery-technical-documentation.md) | Recovery architecture details |
| [`maestro-focus-recovery-plan.md`](./maestro-focus-recovery-plan.md) | Recovery implementation details |
| [`maestro-focus-precision-v0.1.md`](./maestro-focus-precision-v0.1.md) | Precision focus specification |
| [`recovery-truthfulness-test-sheet.md`](./recovery-truthfulness-test-sheet.md) | Test evidence |

---

## Phase Status

| Phase | Status | Date |
|-------|--------|------|
| Phase 1A (Runtime Spine) | ✅ COMPLETE - HARD CLOSED | 2026-03-17 |
| Phase 1B (Core Operating Path) | ✅ COMPLETE - HARD CLOSED | 2026-03-17 |
| Phase 1C (First Execution Routes) | ✅ COMPLETE - HARD CLOSED | 2026-03-17 |
| Phase 2 (Integration) | ⏳ NOT YET STARTED | - |

---

## Future Work

- **FP-7: Modal Policy** - Handle modals/popups that steal focus
- **Phase 2A: Identity and Safety Gating** - Voice identity verification
- **Phase 2B: Workflow and Delegation** - Maestro-Nexus protocol
- **Phase 2C: Output and Feedback** - TTS broker with persona routing

---

*Last Updated: 2026-03-17*
