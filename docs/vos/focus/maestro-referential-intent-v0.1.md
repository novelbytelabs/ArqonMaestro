# FP-7: Referential Intent — Making Maestro Speak Like Language

**Version:** v0.1  
**Status:** Draft  
**Focus Phase:** FP-7  
**Date:** 2026-03-18

---

## Overview

FP-7 covers **Referential Intent** — making Maestro speak like a language rather than just accepting named commands. This phase introduces bounded support for referents like "this", "that", "it", "here", enabling more natural, conversational interactions while maintaining the precision and safety discipline that Maestro requires.

Referential intent is fundamental to closing the gap between command-based voice control and natural language. When a user says "delete this" or "move that over there," Maestro must determine with high confidence what "this" and "that" refer to before acting.

---

## FP-7A — Referential Intent Foundations

### Scope

FP-7A introduces **bounded support** for referential expressions in tightly constrained cases only. This is not a general-purpose natural language understanding system — it is a precision-focused mechanism for handling the most common and unambiguous referents in the IDE context.

### Supported Referents

The following referents are supported in FP-7A:

| Referent | Description | Example |
|----------|-------------|---------|
| **this** | The currently selected or focused entity | "delete this" — deletes the selected file/function |
| **that** | The most recently referenced or mentioned entity | "undo that" — undoes the last action |
| **it** | The subject of the current conversation context | "rename it to foo" — renames the current subject |
| **here** | The current location in the codebase | "add comment here" — adds comment at cursor |

### Core Determinations

FP-7A establishes the foundational logic for referent resolution:

1. **Referent Candidate Set** — Determining what entities can potentially be referred to
2. **Focus Scope Binding** — Binding the referent to the current focus scope
3. **Uniqueness Detection** — Determining whether exactly one lawful target exists
4. **Grounding Classification** — Classifying whether speech is grounded to app, pane, selection, or element

### Candidate Set Determination

The referent candidate set is derived from:

- **Active selection** — What is currently selected in the editor
- **Focus hierarchy** — The chain of focused elements (app → window → pane → editor → scope)
- **Recent references** — Entities referenced in the last N commands or within the current conversation session
- **Visible entities** — Entities currently visible in the viewport or navigation tree

### Focus Scope Binding

Referents must be bound to a focus scope to be resolved. The focus scope provides the context that disambiguates "this" from a global search:

- **Application scope** — The entire IDE application
- **Pane scope** — A specific panel or window
- **Editor scope** — Within a specific file or editor
- **Selection scope** — Within the current text selection

### Uniqueness Detection

FP-7A implements **exactly-one-lawful-target** detection:

- If exactly one candidate exists in the current scope → resolve directly
- If zero candidates exist → abort with clear error
- If multiple candidates exist → escalate to FP-7B for disambiguation

This is a critical safety mechanism. Maestro must not guess when multiple valid targets exist.

### Grounding Classification

Every referential command is classified by its grounding type:

| Grounding Type | Description | Example |
|----------------|-------------|---------|
| **app** | Grounded to the application itself | "quit this app" |
| **pane** | Grounded to a specific panel or window | "close that pane" |
| **selection** | Grounded to the current selection | "format this" |
| **element** | Grounded to a specific code element | "rename that function" |

---

## FP-7B — Referential Hardening + Disambiguation

### Scope

FP-7B builds on FP-7A's foundations by adding the confidence, telemetry, and disambiguation infrastructure needed for production deployment. This phase ensures referential intent is safe, explainable, and recoverable.

### Referent Confidence

FP-7B introduces a **referent confidence scoring system**:

- **High confidence (≥0.9)** — Resolve directly, no user confirmation needed
- **Medium confidence (0.7–0.9)** — Resolve with implicit confirmation (e.g., brief visual indicator)
- **Low confidence (0.5–0.7)** — Trigger explicit disambiguation
- **Very low confidence (<0.5)** — Safe abort with error message

Confidence is computed from:

- Uniqueness of candidate (strong positive signal)
- Recency of candidate in focus history
- Explicit user reference (e.g., cursor position)
- Structural cues (e.g., "this function" vs. "this file")

### Referent Telemetry

Comprehensive telemetry is captured for referential resolution:

- **Resolution success/failure rate** by referent type
- **Disambiguation frequency** — how often users are prompted
- **Abort frequency** — how often resolution fails
- **Candidate set sizes** at failure points
- **User correction patterns** — how users recover from failed resolutions

This telemetry feeds the continuous improvement loop and enables detection of systematic resolution failures.

### Explicit Disambiguation Behavior

When referent confidence is insufficient for automatic resolution, FP-7B presents a **disambiguation UI**:

- Display candidate entities ranked by likelihood
- Allow single-click or voice selection
- Provide clear context for each candidate (e.g., "function foo in bar.js")
- Support partial matches with user confirmation

The disambiguation UI is designed to be:

- **Fast** — Appear within 200ms of detection
- **Non-intrusive** — Minimal visual disruption
- **Recoverable** — Easy to cancel and retry

### Safe Abort Rules

When referent certainty is too weak, FP-7B implements **safe abort** rather than guessing:

1. **Never guess** — If confidence < 0.5, always abort
2. **Clear error message** — Tell the user what went wrong and why
3. **Provide guidance** — Suggest how to be more explicit (e.g., "Did you mean 'this function' or 'this file'?")
4. **Log for improvement** — Record the failure for telemetry analysis
5. **Preserve state** — Do not modify any state when aborting

---

## Acceptance Criteria

| ID | Criterion | Description |
|----|-----------|-------------|
| FP-7.1 | Referent Candidate Set | Determine what entities can be referred to |
| FP-7.2 | Focus Scope Binding | Bind referent to current focus scope |
| FP-7.3 | Uniqueness Detection | Detect when exactly one lawful target exists |
| FP-7.4 | Grounding Classification | Classify whether speech is grounded to app/pane/selection/element |
| FP-7.5 | Referent Confidence | Score confidence that referent is correct |
| FP-7.6 | Disambiguation UI | Show candidates when referent is ambiguous |
| FP-7.7 | Safe Abort | Abort safely when confidence is too low |

---

## What This Addresses

### Referential Law → Directly

FP-7 is the primary implementation of the Referential Law, which states that Maestro must reliably determine what the user is referring to before acting. By implementing candidate sets, uniqueness detection, and confidence scoring, FP-7 makes referential resolution explicit and verifiable.

### Explicit Focus Law → Partially

The Explicit Focus Law requires that focus be explicitly tracked and verifiable. FP-7 builds on the focus system established in earlier Focus phases, using focus scope as the primary context for referent resolution. However, FP-7 does not implement all aspects of explicit focus (e.g., focus history reconstruction).

### Safety/Precision Discipline → Strongly

FP-7 is designed with safety as a primary constraint:

- The uniqueness detection ensures Maestro never acts on ambiguous references
- The confidence scoring prevents low-probability guesses
- The safe abort rules ensure failures are clean and recoverable
- The disambiguation UI gives users explicit control when needed

### Telemetry/Explainability → Strongly

FP-7B's telemetry infrastructure provides deep insight into referential resolution behavior:

- Every resolution attempt is logged with its inputs and outcome
- Disambiguation patterns reveal where the system lacks confidence
- Abort patterns identify systematic gaps in candidate detection
- This data directly feeds model improvement and system hardening

---

## What This Does NOT Solve

### Modals

FP-7 does not address modal dialogs, overlays, or other transient UI states that interrupt the normal focus hierarchy. Modal awareness is addressed in FP-8.

### Restore

FP-7 does not implement state restoration or rollback capabilities. While "that" may reference recent actions, FP-7 does not solve the problem of recovering from unintended actions or restoring previous application states.

### Cross-Surface Unification

FP-7 operates within the current surface (IDE context). It does not address unifying referents across multiple surfaces (e.g., browser + IDE + terminal). Cross-surface unification is addressed in later phases.

---

## Dependencies

- **FP-1 through FP-6** — Focus foundation and recovery systems
- **Focus Scope System** — Must be operational for candidate set determination
- **Maestro Lexicon** — Referent vocabulary ("this", "that", "it", "here") must be defined
- **Disambiguation UI** — Requires chooser UX infrastructure from earlier phases

---

## Future Phases

- **FP-8** — Modal Awareness + Restore
- **FP-9** — Surface Expansion
- **FP-10** — Language/System Integration

---

## Notes

- FP-7 is intentionally bounded. General-purpose referential resolution is out of scope. The goal is to handle the most common cases (80/20) with high confidence.
- Confidence thresholds may need adjustment based on telemetry from early deployment.
- The referent vocabulary may expand in future phases based on user feedback and telemetry analysis.
