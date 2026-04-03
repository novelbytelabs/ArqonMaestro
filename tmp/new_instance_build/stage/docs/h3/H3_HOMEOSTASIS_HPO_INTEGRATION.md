# H3_HOMEOSTASIS_HPO_INTEGRATION

Date:
April 3, 2026

Status:
Integration note

Purpose:
Define how ArqonHPO and homeostatic regulation should enter H3, especially Stage 3H.

## Why this matters

H3 without homeostasis can become brittle.
A holy-grail recognizer must not only recognize well.
It must regulate itself under stress.

ArqonHPO is the current best candidate actuation engine for that regulation.

## Core HPO model

ArqonHPO uses a Probe -> Classify -> Refine flow.

Interpretation for H3:
- Probe:
    sample regime / threshold / budget possibilities
- Classify:
    decide whether the current recognition landscape looks structured or chaotic
- Refine:
    use the appropriate optimization strategy for the landscape

## 3H mapping

### 3H-S1
Use HPO to define the observational contract only.
Surface:
- stress-like metrics
- regime proposal reasons
- family policy identifiers

### 3H-S2
Use HPO to propose escalation candidates when ambiguity or instability rises.
Do not authorize execution.
Do not bypass governance.

### 3H-S3
Allow different HPO configurations per command family.
Expected rough mapping:
- reflex / structured families:
    structured strategy bias
- numeric families:
    moderate-chaos strategy bias
- open-tail families:
    high-budget strategy bias

### 3H-S4
Use HPO and decay classifiers to support hysteresis and safe de-escalation.

## Homeostatic telemetry surfaces

The HPO layer should eventually observe:
- recognition latency
- ambiguity rate
- repair-signal rate
- ranking instability
- tail-normalization instability
- regime-switch frequency

These signals should inform regime proposals, not execution authority.

## MetabolicMonitor role

MetabolicMonitor gives a stress-index vocabulary that should later be bridged into H3.

Intended role:
- summarize system stress
- shape homeostatic proposals
- support later 3G ranking/guardrail adjustment and 3H regime transitions

## Dry-run requirement

All early 3H/HPO integration should support:
- dry-run observation
- proposal-only mode
- explicit gate before promotion to live actuation

## Non-goals

Not acceptable in early integration:
- silent self-tuning of authority thresholds
- hidden regime mutation with no evidence surface
- invisible persistence of learned homeostatic state

## Relationship to artificial surfaces

If HPO/homeostasis data is surfaced before actuation is live, that surface must be registered in H3_ARTIFICIAL_SURFACES_REGISTER.md as observational-only.
