# H3 Stage 3F — Multi-Resolution Atlas

## Stage objective

Introduce a bounded, advisory multi-resolution atlas route model so H3 can reason about commands as:

- coarse atlas region
- family atlas
- prefix band
- tail strategy

The route model is observational first. It may shape later narrowing and ranking work, but it may not authorize execution.

## Doctrine lock

- warm hit may accelerate but may not authorize
- live geometric evidence outranks cache memory
- focus, shard, and task-history signals remain advisory only
- no H23/H24 bypass
- no Stage 3A activation drift
- no persistence/distributed cache
- no Turbo/Tight/Ultra in Stage 3F
- v1 families only

## Slice plan

### S1 — Observational route contract
Implemented.

### S2 — Family atlas routing pilot
Implemented.

### S3 — Prefix-band routing pilot
Implemented in this slice.

Scope:
- add bounded advisory prefix-band routing boost during lookup scoring
- allow family-atlas candidate pooling for candidate-scan lookup so prefix-band routing can discriminate within the family
- propagate prefix-band routing metadata through lookup/warm/merged evidence
- keep advisory-only behavior and fallback-safe candidate selection

### S4 — Tail-strategy routing pilot
Implemented in this slice.

Scope:
- add bounded advisory tail-strategy routing for numeric vs open strategy alignment
- refine open-tail routing into locator vs symbolic tail strategies for v1 only
- propagate tail-strategy routing metadata through H3 evidence
- keep advisory-only behavior

### S5 — Closure/validation
Next.

Scope:
- docs/report closure
- freeze doctrine + acceptance criteria
