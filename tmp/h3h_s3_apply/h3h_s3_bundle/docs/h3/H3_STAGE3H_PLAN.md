# H3_STAGE3H_PLAN

Date:
April 3, 2026

Stage:
3H — Dynamic Precision Regimes

Status:
S3 implemented, S4 next

Audience:
- engineers
- PM AI
- reviewers
- research leads

Purpose:
Define the execution plan for Turbo / Tight / Ultra as a governed, homeostatic, family-aware regime system.

## Executive summary

Stage 3H is where dynamic precision becomes a real product capability.

3H is not “three modes” as a UI gimmick.
It is a governed regime system that:
- starts cheap and fast when possible
- detects ambiguity, instability, or stress
- escalates only when needed
- de-escalates when quality restabilizes
- keeps governance sacred

3H must be heavily documented before implementation accelerates.

## Constitutional doctrine

3H must preserve:
- live voice geometry proposes
- focus/task reshapes ranking and legality
- memory supplies priors
- governance decides execution

3H-specific doctrine:
- regime changes may shape cost, depth, and bounded interpretation behavior
- regime changes may not authorize execution
- regime changes may not bypass H23/H24
- regime changes may not create Stage 3A drift
- regime changes may not silently introduce distributed persistence
- internal communication remains protobuf / type-directed
- JSON remains human-facing only

## Regime definitions

### Turbo
Purpose:
Fast-path regime for simple, stable, low-risk command situations.

Intended characteristics:
- lowest latency
- lowest compute budget
- minimal search breadth
- strict fast-path use for reflex / stable closed structure

### Tight
Purpose:
Intermediate regime for moderate ambiguity or moderate instability.

Intended characteristics:
- moderate compute budget
- greater candidate evaluation depth
- stronger local disambiguation than Turbo
- suitable for many numeric or mid-complexity cases

### Ultra
Purpose:
High-fidelity regime for open-tail, unstable, high-ambiguity, or high-risk situations.

Intended characteristics:
- highest compute budget within allowed budget envelope
- broadest bounded candidate evaluation
- longest safe evidence accumulation window
- strongest need for governance and hysteresis

## Primary design pattern

3H follows the EO6 Two-Loop pattern:
- Inner Loop:
    current recognizer operating at the active regime
- Outer Loop:
    observer watching recognition metrics and proposing regime changes
- Governance Cycle:
    evaluate proposed change, promote or reject, continue

ArqonHPO acts as the primary actuation engine.

## Slice plan

### 3H-S1 — regime observational contract
Status:
Implemented

Scope:
- add regime evidence surface only
- define regime identifiers, sources, reasons, and state fields
- no live switching yet

Delivered:
- observational regime evidence derived from 3G ambiguity / repair / stress signals
- family-aware baseline regime mapping for reflex / bounded / numeric / open
- protobuf/type-directed internal note preserved
- no live regime switching or authority change

### 3H-S2 — bounded escalation trigger pilot
Status:
Implemented

Scope:
- use ambiguity and instability signals to propose regime escalation
- no autonomous authority change
- bounded pilot only

### 3H-S3 — family-aware regime switching
Status:
Implemented

Scope:
- different regime strategies by family:
    - reflex / structured
    - numeric / semi-chaotic
    - open-tail / high-ambiguity
- still bounded and governed

Delivered:
- family-aware strategy profile ids surfaced in runtime evidence
- bounded upward switching enabled by family policy:
    - structured families may switch `turbo -> tight`
    - numeric families may switch `tight -> ultra`
- runtime-local active regime tracking added for chunk-local evidence continuity
- de-escalation remains deferred to 3H-S4
- no authority change, no H23/H24 bypass, no Stage 3A drift
- no persistence / distributed cache; active regime state is runtime-local only

### 3H-S4 — hysteresis / de-escalation
Status:
Next

Scope:
- prevent oscillation
- add decay / cool-down logic
- ensure regime transitions are explainable and auditable

### 3H-S5 — closure / validation
Scope:
- stage closure report
- doctrine freeze
- regression expectations

## Inputs expected from adjacent systems

3H will consume signals from:
- 3G ambiguity / repair / guardrail band
- existing H3 evidence stream
- ArqonHPO homeostasis telemetry
- future MetabolicMonitor stress signals

## Explicit non-goals for early 3H

Not in early 3H:
- distributed regime coordination
- persistent learned regime memories
- user-visible mode marketing language as implementation truth
- hidden “smart” authority jumps

## Required docs before deeper coding

Before major 3H implementation accelerates, the following docs must exist:
- H3_STAGE3H_ARCHITECTURE.md
- H3_HOMEOSTASIS_HPO_INTEGRATION.md
- H3_DYNAMIC_PRECISION_REGIMES_NOTE.md
- H3_PROTOBUF_INTERNALS_NOTE.md
- H3_VALIDATION_GATES_GUIDE.md
