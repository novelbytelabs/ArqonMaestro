# H3_STAGE3H_ARCHITECTURE

Date:
April 3, 2026

Status:
Architectural design note

Purpose:
Describe how Stage 3H should be built in runtime terms.

## Architectural thesis

Stage 3H is a homeostatic precision-control subsystem for the recognizer.

It exists to answer:
- how much compute and interpretation depth should we spend right now?
- when should we escalate?
- when should we de-escalate?
- how do we do that without breaking governance?

## Core model

The 3H architecture is a two-loop system:

### Inner loop
Role:
Real-time recognition at the currently active regime.

Responsibilities:
- process live voice geometry
- operate with the current budget and strategy profile
- emit metrics and stress indicators

### Outer loop
Role:
Observes the inner loop and proposes regime changes.

Responsibilities:
- watch ambiguity, instability, latency pressure, and recognition quality
- ask the HPO layer for proposed adjustments
- recommend escalation or de-escalation
- never directly authorize command execution

### Governance layer
Role:
Decide whether a proposed regime change may take effect.

Responsibilities:
- verify that the proposal is allowed
- preserve doctrine
- prevent oscillation or pathological escalation

## Signal sources

3H may consume:
- ambiguity from 3G-S2
- repair signals from 3G-S3
- guardrail signals from 3G-S4
- stress/repair evidence from later 3G and HPO integration
- command family classification
- latency / quality telemetry from the recognizer

## Regime transition logic

Allowed transition concept:
- Turbo -> Tight
- Tight -> Ultra
- Ultra -> Tight
- Tight -> Turbo

Direct Turbo -> Ultra should be exceptional and governed.

## Family-aware expectations

### Reflex / highly structured commands
Likely preference:
Turbo or Tight

Expected landscape:
structured

Preferred strategy source:
structured optimizer behavior

### Numeric / parameterized commands
Likely preference:
Tight

Expected landscape:
more chaotic than reflex, less open than free-form

Preferred strategy source:
mixed / adaptive

### Open-tail commands
Likely preference:
Tight or Ultra

Expected landscape:
high ambiguity and higher budget need

Preferred strategy source:
higher-budget search with stronger hysteresis

## Runtime surfaces to document and later implement

3H should eventually surface:
- current regime id
- proposed regime id
- transition reason
- stress band
- hysteresis state
- escalation allowed / rejected
- source subsystem
- family-specific policy id

## Safety boundaries

3H may:
- change interpretation budget
- change bounded search depth
- change bounded regime-specific thresholds

3H may not:
- authorize execution
- bypass H23/H24
- rewrite constitutional order
- silently persist state without explicit design and review

## Integration points

Nearest future integration points:
- H3 runtime evidence event model
- chunk-manager evidence emission path
- HPO / homeostasis actuation interface

Later integration points:
- 3G stress/repair-informed guardrail logic
- memory-conditioned perception in 3I
- atlas intelligence in 3J
