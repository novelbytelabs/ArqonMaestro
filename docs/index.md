# Arqon Maestro Docs

Arqon Maestro is the voice-first control layer for the Arqon ecosystem.

These docs exist to explain what Maestro is, how it fits into Arqon, what parts of the system are working today, and where the remaining modernization effort is focused.

## What Maestro Is

Arqon Maestro provides a natural-language interface for:

- coding
- navigation
- tool control
- workflow execution
- voice-driven interaction across Arqon systems

It is part of a broader ecosystem design in which voice acts as a practical control plane.

```mermaid
flowchart LR
  U[User Intent] --> M[Arqon Maestro]
  M --> A[Audio and Speech Pipeline]
  M --> I[Intent and Command Layer]
  M --> P[Plugins and Editors]
  M --> W[Arqon Workflows]
```

## What This Documentation Covers

- the current architectural direction
- major technical decisions
- modernization status by subsystem
- the role of Maestro inside the Arqon ecosystem

## Start Here

- [Decision Log](decision-log.md): key decisions and rationale
- [Modernization Matrix](modernization-matrix.md): current status of major modules and priorities
- [Maestro In Arqon](overview/ecosystem.md): how Maestro fits the larger ecosystem

## Current Focus

The current work in this repository is centered on:

- keeping the desktop voice pipeline operational
- modernizing the build and runtime stack
- aligning branding and documentation with Arqon Maestro
- preparing the codebase for deeper ecosystem integration

## Documentation Shape

- `Overview`: ecosystem framing and system purpose
- `Guides`: setup and operational entry points
- `Architecture`: runtime design and request flow
- `Models`: training and engine internals
- `Operations`: configuration and troubleshooting
- `Development`: extension and implementation guidance
