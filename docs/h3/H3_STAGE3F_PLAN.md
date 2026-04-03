# H3 Stage 3F — Multi-Resolution Atlas

## Stage objective

Introduce a bounded, advisory multi-resolution atlas route model so H3 can reason about commands as:

- coarse atlas region
- family atlas
- prefix band
- tail strategy

The route model is observational first. It may shape narrowing and ranking work, but it may not authorize execution.

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
Implemented.

### S4 — Tail-strategy routing pilot
Implemented.

### S5 — Closure/validation
Implemented in this slice.

Scope:
- docs/report closure only
- freeze doctrine + acceptance criteria
- record Stage 3F closeout against the corrected merged S4 baseline

## Stage acceptance criteria

Stage 3F is considered closed when all of the following are true:

- multi-resolution atlas observational route fields are present in H3 runtime evidence
- family-atlas routing remains bounded and advisory-only
- prefix-band routing remains bounded and advisory-only
- tail-strategy routing remains bounded and advisory-only
- candidate-scan family pooling remains bounded and fallback-safe
- no execution authorization path is introduced from atlas routing
- live geometric evidence, live tail normalization, and H23/H24 remain authoritative
- no persistence/distributed cache is introduced
- no Turbo/Tight/Ultra or non-v1 expansion is introduced

## Effective closure baseline

Stage 3F closure is assessed against the effective merged S4 baseline, including the small integration corrections required post-bundle:

- test syntax hygiene fixes in Stage 3F-S4 test files
- optional narrowing count fallback fields carried as `undefined` rather than `null` where the runtime shape is `number | undefined`
- browser/open tail-strategy expectation aligned to `open_locator_tail_v1`
- no architectural broadening beyond Stage 3F-S4 scope

## Next stage

Stage 3G — Counterfactual + Repair Intelligence
