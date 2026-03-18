# FP-9: Surface Expansion — Unified Control Across Multiple Surfaces

**Version:** v0.1  
**Status:** Draft  
**Focus Phase:** FP-9  
**Date:** 2026-03-18

---

## Overview

FP-9 covers **Surface Expansion** — extending Maestro's reach beyond the IDE to provide unified voice control across multiple surfaces (browser, terminal, system UI). This phase implements the cross-surface unification that earlier phases explicitly excluded.

While FP-1 through FP-8 focused on the IDE as the primary surface, real-world workflows frequently span multiple applications. A developer might edit code in the IDE, switch to the browser to check documentation, then return to the IDE. FP-9 enables Maestro to track and control this cross-surface context.

---

## Scope

FP-9 introduces **cross-surface awareness and coordination** — the ability for Maestro to:

1. Detect and track multiple surfaces
2. Maintain focus context across surface transitions
3. Coordinate actions that span multiple surfaces
4. Provide unified referential resolution across surfaces

### Supported Surfaces

FP-9 initially targets the following surfaces:

| Surface | Description | Priority |
|---------|-------------|----------|
| **IDE** | Primary development environment | Primary |
| **Browser** | Web browser for documentation and testing | High |
| **Terminal** | Command-line interface | High |
| **System** | OS-level UI (menus, dialogs) | Medium |

### Surface Scope

Each surface operates within its own scope, but FP-9 establishes mechanisms for cross-surface coordination:

- **Surface hierarchy** — Parent/child relationships between surfaces
- **Focus migration** — Tracking focus as it moves between surfaces
- **State synchronization** — Keeping context consistent across surfaces
- **Action coordination** — Executing multi-surface commands

---

## Core Capabilities

### Surface Detection

FP-9 implements detection mechanisms for multiple surfaces:

- **Window enumeration** — Detecting open windows across the system
- **Process tracking** — Monitoring which applications are running
- **Focus monitoring** — Detecting when focus changes surfaces
- **Surface metadata** — Collecting information about each surface (title, URL, process)

### Cross-Surface Focus

FP-9 extends the focus system to operate across surfaces:

- **Focus chain** — Tracking the full focus path including surface transitions
- **Surface-relative focus** — Expressing focus relative to the current surface
- **Focus history** — Maintaining a history of focus across surfaces
- **Focus restoration** — Restoring focus to a specific surface and location

### Cross-Surface Referentials

Building on FP-7's referential intent, FP-9 adds cross-surface referents:

| Referent | Description | Example |
|----------|-------------|---------|
| **that window** | Reference to a different window | "close that window" |
| **the browser** | Explicit surface reference | "refresh the browser" |
| **there** | Cross-surface location | "paste there" (in terminal) |

### Multi-Surface Actions

FP-9 enables actions that span multiple surfaces:

- **Context transfer** — Copy from IDE, paste to browser
- **Coordinated commands** — Execute across surfaces atomically
- **Surface orchestration** — Control multiple surfaces in sequence

---

## Technical Architecture

### Surface Adapter Layer

FP-9 introduces a **Surface Adapter Layer** that provides a unified interface to different surface types:

```
┌─────────────────────────────────────────┐
│           Maestro Core                  │
├─────────────────────────────────────────┤
│        Surface Adapter Layer           │
├──────────┬──────────┬──────────────────┤
│ IDE      │ Browser  │ Terminal │ System│
│ Adapter  │ Adapter  │ Adapter  │Adapter│
└──────────┴──────────┴──────────────────┘
```

Each adapter implements:

- Surface detection and tracking
- Focus observation and control
- Element introspection
- Action execution

### Surface Registry

FP-9 maintains a **Surface Registry** that tracks all known surfaces:

- Surface identification and metadata
- Current focus state per surface
- Focus history per surface
- Surface capabilities and limitations

### Focus Coordinator

The **Focus Coordinator** manages focus across surfaces:

- Detects cross-surface focus transitions
- Maintains global focus chain
- Resolves cross-surface referents
- Orchestrates multi-surface actions

---

## Acceptance Criteria

| ID | Criterion | Description |
|----|-----------|-------------|
| FP-9.1 | Surface Detection | Detect and track multiple surfaces |
| FP-9.2 | Surface Classification | Classify surfaces by type (IDE, browser, terminal, system) |
| FP-9.3 | Cross-Surface Focus | Track focus across surface boundaries |
| FP-9.4 | Focus History | Maintain focus history across surfaces |
| FP-9.5 | Cross-Surface Referents | Resolve referents that span surfaces |
| FP-9.6 | Multi-Surface Actions | Execute actions that span multiple surfaces |
| FP-9.7 | Surface Context | Maintain context when switching surfaces |

---

## What This Addresses

### Referential Law → Strongly

FP-9 extends referential intent (FP-7) to cross-surface contexts. Users can now reference elements in other surfaces ("that window", "the browser tab") with the same confidence as intra-surface references.

### Explicit Focus Law → Strongly

FP-9 is a primary implementation of cross-surface explicit focus. The focus chain now includes surface transitions, making the full focus path visible and verifiable.

### Safety/Precision Discipline → Partially

Cross-surface operations introduce new safety considerations. FP-9 implements verification for cross-surface actions but may have lower confidence than single-surface operations.

### Telemetry/Explainability → Partially

FP-9 captures telemetry on cross-surface operations, but this is secondary to the primary unification goals.

---

## What This Does NOT Solve

### Full Natural Language Cross-Surface Understanding

FP-9 enables structural cross-surface control but does not implement full natural language understanding across surfaces.

### Arbitrary Application Control

FP-9 supports specific surface types (IDE, browser, terminal, system). Arbitrary application control is not in scope.

### Cross-Surface State Synchronization

FP-9 maintains focus context but does not synchronize application state (e.g., file content) across surfaces.

---

## Dependencies

- **FP-1 through FP-8** — All prior focus phases
- **Surface Adapter Layer** — New architecture component
- **Focus Coordinator** — New coordination component
- **Surface Registry** — New state management component

---

## Future Phases

- **FP-10** — Language/System Integration

---

## Notes

- Cross-surface support significantly increases complexity. Start with IDE → browser and IDE → terminal, then expand.
- Security considerations apply when controlling multiple surfaces. Ensure user intent verification for sensitive operations.
- Cross-surface referents may have lower confidence than intra-surface referents. Telemetry will guide threshold tuning.
- Platform differences (Windows, macOS, Linux) require surface adapter specialization.
