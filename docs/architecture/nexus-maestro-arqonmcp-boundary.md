# Nexus / Maestro / ArqonMCP Boundary Technote

**Date:** 2026-03-26  
**Status:** Canonical boundary reference

## 1. Purpose

This technote locks ownership boundaries before deeper implementation work.

Design rule:

- Nexus shapes intent
- ArqonMCP orchestrates capability
- Maestro embodies interaction and actuation

## 2. Clean Division

## Nexus

Owns:

- deliberation
- negotiation
- intent refinement
- top-level planning with the human
- assistant-style partnership

Nexus is the intent companion.

## ArqonMCP

Owns:

- workflow orchestration
- capability routing
- skill lookup and recall
- tool dispatch and cross-tool composition
- prompt/resource/tool binding
- reusable procedure execution
- cached reasoning patterns and operational memory

ArqonMCP is the capability fabric and execution router.

## Maestro

Owns:

- voice input/output
- command grammar and lane control
- dictation and app control
- UI actuation and low-level actions
- confirmations and live spoken supervision
- real-time interaction, interruption, and intervention

Maestro is the human-facing voice shell and actuation surface.

## 3. Interaction Contract

Canonical flow:

1. human speaks to Maestro (or works via Nexus)
2. Maestro parses spoken command into structured envelope
3. Maestro submits capability request to ArqonMCP
4. ArqonMCP routes via speed ladder and capability fabric
5. ArqonMCP executes/composes workflow
6. Maestro mediates confirmations, progress, escalation, and spoken/visual output

Key rule: Maestro invokes and mediates workflows; ArqonMCP orchestrates them.

## 4. MCP Protocol Posture

ArqonMCP should preserve MCP compatibility while keeping Arqon performance and governance goals.

- JSON-RPC 2.0 at MCP edges
- `stdio`/SSE/WebSocket transport by deployment context
- Arqon-native internal contracts may remain protobuf-first where required

## 5. Speed Ladder and Skill Memory Role

ArqonMCP is not just MCP transport. It is also:

- a reasoning cache
- a skill router
- a workflow execution substrate
- a cross-agent capability bus
- a learned operational memory

This is why workflow ownership belongs in ArqonMCP.

## 6. Vibe Mode Clarification

Vibe mode is an interaction mode, not a separate orchestration engine.

- Maestro provides live interface and intervention controls
- Nexus refines intent/specs
- ArqonMCP runs orchestrated workflows

## 7. Boundary Laws

1. Maestro must not become the primary workflow orchestrator.
2. ArqonMCP must not be bypassed for multi-step capability routing.
3. Nexus must not absorb deterministic operating control.
4. High-impact actions remain policy-gated and fail-closed.
5. Ownership must remain legible in docs, APIs, and runtime boundaries.

## 8. Implementation Guidance

When a design choice is ambiguous, classify it by question:

- "What does the human mean?" -> Nexus
- "How do we execute/reuse/route this capability chain?" -> ArqonMCP
- "How does the human control, supervise, and interrupt in real time?" -> Maestro
