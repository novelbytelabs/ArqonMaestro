# FP-8: Modal Awareness + Restore — Handling Transient UI States

**Version:** v0.1  
**Status:** Draft  
**Focus Phase:** FP-8  
**Date:** 2026-03-18

---

## Overview

FP-8 covers **Modal Awareness + Restore** — enabling Maestro to detect, navigate, and recover from modal dialogs, overlays, and other transient UI states that interrupt the normal focus hierarchy. This phase is critical for maintaining reliable voice control in real-world IDE usage where modals, dialogs, and popups frequently interrupt workflow.

Modal states are one of the primary failure modes for voice control systems. When a dialog appears, the normal focus hierarchy is disrupted, and commands that worked moments before may fail or, worse, act on the wrong target. FP-8 addresses this gap.

---

## FP-8A — Modal Awareness Foundations

### Scope

FP-8A introduces **modal detection and classification** — the ability for Maestro to recognize when the UI has entered a modal or transient state and adapt accordingly.

### Modal Types

The following modal types are supported in FP-8A:

| Modal Type | Description | Examples |
|------------|-------------|----------|
| **Dialog** | Standard modal dialogs | Save confirmation, Delete warning |
| **Popup** | Non-modal popups and dropdowns | Autocomplete, Quick fix menu |
| **Overlay** | Full-screen overlays | Settings panel, Welcome screen |
| **Notification** | Toast notifications and alerts | Build errors, Lint warnings |
| **Quick Open** | Command palettes and quick openers | VS Code command palette, Go to file |

### Detection Mechanisms

FP-8A implements multiple detection mechanisms:

1. **DOM/UI Tree Inspection** — Detecting modal containers, overlay backdrops, and dialog elements
2. **Focus Tracking** — Detecting focus traps and unexpected focus shifts
3. **Window State Monitoring** — Detecting modal windows and dialogs at the OS level
4. **Event Listeners** — Reacting to show/hide events from the IDE's event system

### Modal Classification

When a modal is detected, FP-8A classifies it to determine the appropriate response:

- **Blocking** — User must respond before continuing (e.g., Save dialog)
- **Informational** — Modal displays information, may auto-dismiss (e.g., Toast)
- **Navigation** — Modal replaces the main view (e.g., Settings panel)
- **Transient** — Modal appears briefly and may auto-dismiss (e.g., Autocomplete)

### Focus Behavior in Modal Context

FP-8A establishes how focus behaves when modals are present:

- Focus is **trapped** within blocking modals
- Focus **shifts** to modal when it appears
- Focus **returns** to previous context when modal closes
- Modal may create a **new focus scope** (e.g., dialog → button)

---

## FP-8B — Restore + Recovery

### Scope

FP-8B builds on FP-8A's detection by implementing **restore and recovery mechanisms** — the ability to recover gracefully from modal interactions, undo unintended changes, and restore focus to its pre-modal state.

### Focus Restore

FP-8B implements **focus restoration** after modal dismissal:

- **Pre-modal focus capture** — Record focus state before modal appears
- **Post-modal focus restoration** — Restore focus to the original location
- **Fallback restoration** — If original focus is invalid, restore to safe default (e.g., editor)
- **Delay handling** — Account for animation/transition delays before restoring

### State Verification

Before and after modal operations, FP-8B verifies state:

- **Pre-condition verification** — Confirm the action is still valid after modal closes
- **Post-condition verification** — Confirm the expected state change occurred
- **Conflict detection** — Detect if another change invalidated the action

### Recovery Paths

FP-8B provides recovery paths for common modal-related failures:

| Failure Scenario | Recovery Path |
|------------------|---------------|
| Modal closed before action completed | Abort gracefully, log for telemetry |
| Focus not restored automatically | Manual focus restoration trigger |
| Action target changed while modal open | Re-evaluate target, abort if invalid |
| Modal content changed while open | Refresh modal context, re-evaluate |

### Safe Abort in Modal Context

When modal handling fails, FP-8B implements safe abort:

1. **Never assume** — Don't assume modal state or content
2. **Verify on resume** — Re-verify state after modal closes
3. **Preserve user intent** — If action is ambiguous, prompt user
4. **Log failures** — Record modal failures for analysis

---

## Acceptance Criteria

| ID | Criterion | Description |
|----|-----------|-------------|
| FP-8.1 | Modal Detection | Detect when a modal or overlay appears |
| FP-8.2 | Modal Classification | Classify the type of modal detected |
| FP-8.3 | Focus Trap Handling | Handle focus being trapped within modals |
| FP-8.4 | Focus Restore | Restore focus to pre-modal location after dismissal |
| FP-8.5 | State Verification | Verify state before and after modal operations |
| FP-8.6 | Recovery Path | Provide recovery paths for modal-related failures |
| FP-8.7 | Safe Abort | Abort safely when modal handling fails |

---

## What This Addresses

### Referential Law → Partially

Modal awareness supports referential intent by ensuring that references made while a modal is present are correctly attributed. However, FP-8 does not directly implement referential resolution.

### Explicit Focus Law → Strongly

FP-8 is a primary implementation of the Explicit Focus Law. It explicitly tracks focus across modal boundaries, captures pre-modal focus state, and restores focus after modal dismissal. This makes focus behavior visible and verifiable.

### Safety/Precision Discipline → Strongly

FP-8 prevents a major class of voice control failures — the "wrong target" problem where commands act on the wrong element because focus shifted unexpectedly. By verifying state before and after modal interactions, FP-8 ensures actions are applied to the correct targets.

### Telemetry/Explainability → Partially

FP-8 captures telemetry on modal detection and recovery, but this is secondary to the primary safety and correctness goals.

---

## What This Does NOT Solve

### Cross-Surface Modal Handling

FP-8 operates within a single IDE instance. It does not address modals that span multiple surfaces or applications.

### Restore/Undo Capabilities

FP-8 handles focus restoration but does not implement application state restoration or undo capabilities. The "restore" in FP-8 refers to focus restoration, not state rollback.

### Natural Language Modal Interaction

FP-8 does not implement natural language understanding for modal content. It detects and handles modals structurally, not semantically.

---

## Dependencies

- **FP-1 through FP-6** — Focus foundation and recovery systems
- **FP-7** — Referential Intent (modal contexts may contain referents)
- **Focus Scope System** — Required for focus capture and restoration
- **Event System** — Required for modal show/hide detection

---

## Future Phases

- **FP-9** — Surface Expansion
- **FP-10** — Language/System Integration

---

## Notes

- Modal detection may vary significantly between IDEs. Platform-specific adapters may be required.
- Some modals are intentionally non-blocking. FP-8 must distinguish between blocking and non-blocking modals.
- Focus restore timing is critical — too early causes errors, too late frustrates users. Telemetry will guide tuning.
