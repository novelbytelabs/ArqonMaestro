# Maestro Actuation And Control Stack

This document defines how Arqon Maestro performs action in the world.

It is the formal stack reference for control and execution boundaries across desktop, browser, and mixed-interface environments.

## Core Position

Maestro is a Voice Operating System, not a personal assistant shell.

The actuation model must therefore be:

- deterministic first
- layered by capability
- explicit about fallback order
- fail-closed when policy or identity is uncertain

## AGO Boundary

Maestro and Nexus are separate sibling AGOs:

- `Maestro` owns spoken operating, command interpretation, and governed actuation
- `Nexus` owns assistant continuity, personal context, and long-horizon guidance

Nexus must not absorb Maestro's operating control boundary.

## Why A Multi-Layer Stack

No single automation technology can reliably cover:

- global desktop surfaces
- structured web app automation
- visually dynamic/OCR-only interfaces
- mixed native + browser + remote UI environments

The stack is intentionally layered so each layer is used for what it is best at.

## Layered Actuation Model

### Layer 0: Native/Semantic Control First

Use deterministic semantic control whenever available:

- explicit command grammars
- MCP-routed skill execution
- app/tool APIs and structured selectors

This is the default lane for trustworthy operating behavior.

### Layer 1: Talon For Global Desktop Control

`Talon` is the adopted global desktop control layer for cross-application OS interaction, input synthesis, and broad desktop reach.

Use when:

- command intent targets native desktop surfaces
- no stronger app-specific semantic interface exists
- low-friction global control is required

### Layer 2: Playwright For Structured Web Automation

`Playwright` is the adopted structured browser/web automation layer.

Use when:

- the target is a web page/app with stable DOM semantics
- robust selector-driven control is possible
- repeatable browser automation is needed

### Layer 3: UI.Vision For Visual/OCR Fallback

`UI.Vision` is retained as a bounded visual/OCR fallback, not the primary universal controller.

Use when:

- semantic control is unavailable or insufficient
- the interface is visually rendered or selector-hostile
- OCR/image matching is required for progress

## Control Selection Policy

Actuation should follow this order:

1. native/semantic control
2. structured browser automation (`Playwright`)
3. global desktop control (`Talon`) when semantic routes are unavailable
4. visual/OCR fallback (`UI.Vision`) only when higher-confidence paths fail

Architectural rule:

- prefer native/semantic control before visual fallback
- do not bypass higher-confidence layers without explicit reason

## Security And Identity

Voice identity is a first-class security signal in this stack.

High-impact actions should include:

- speaker-aware authorization checks where policy requires it
- mode-aware capability constraints
- fail-closed refusal when identity/policy confidence is insufficient

This applies across all actuation layers, including fallback layers.

## STT/TTS Contract Position

STT and TTS remain provider contracts:

- STT: dual-profile routing (`command-fast`, `dictation-accurate`) with provider flexibility
- TTS: persona-driven broker with fallback behavior and provider abstraction

Adopted providers are implementation defaults, not lock-in points.

## Shell And Runtime Boundary

Shell and runtime are intentionally separated:

- shell hosts UX, tray, and operator controls
- runtime owns hot path, routing, governance, and actuation policy

Shell migration (Electron to Tauri) must not change actuation contracts.

## Rejected Architecture

The stack rejects a single-tool control model.

Reasons:

- brittle across heterogeneous targets
- poor reliability in dynamic UIs
- weak governance boundaries
- high operational coupling and lock-in risk

## Decision Cross-References

This document is the detailed rationale reference for:

- `ADM-040` through `ADM-047` in the decision log
- the Voice OS identity and layered control commitments
