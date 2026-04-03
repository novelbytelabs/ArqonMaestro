# H3 Stage 3F — Multi-Resolution Atlas

## Stage objective

Introduce a bounded, advisory multi-resolution atlas route model so H3 can reason about commands as:

- coarse atlas region
- family atlas
- prefix band
- tail strategy

The route model is observational first. It may shape later narrowing/ranking work, but it may not authorize execution.

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
Implemented in this slice.

Scope:
- define a multi-resolution atlas plan contract
- derive advisory route fields from shard hint + geometric event shape
- emit route fields in H3 evidence
- no ranking/narrowing/authorization changes

### S2 — Family atlas routing pilot
Next.

Scope:
- use advisory route to expose family-atlas routing state during lookup
- keep advisory-only behavior

### S3 — Prefix-band routing pilot
Planned.

Scope:
- add bounded prefix-band route reasoning for lookup/diagnostics
- no authority change

### S4 — Closure/validation
Planned.

Scope:
- docs/report closure
- freeze doctrine + acceptance criteria
