# H3 Stage 3E1 Plan

Status: Stage 3E1 closed by Slice S6 closure/validation bundle
Scope: Focus-Conditioned Command Geometry pilot with bounded advisory-only ranking, legality shaping, and task-history momentum

## Objective

Introduce a structured focus-conditioned context envelope that shapes ranking, legality, and bounded workflow continuity without ever replacing live geometric command truth, tail-normalized truth, or H23/H24 governance.

## Stage 3E1 Doctrine

Decision hierarchy remains:
1. live voice geometry
2. specialized tail normalization / canonical merge
3. H23 / H24 governance
4. focus-conditioned command context
5. warm memory / SAS priors

Focus context may shape ranking.
Focus context may shape bounded legality.
Focus context may shape bounded task-history momentum.
Focus context may not authorize execution.

## Slice S1

Slice S1 implemented previously:
- define the `h3_focus_command_context_v1` envelope contract
- model three layers:
  - Focus Snapshot
  - Focus Delta
  - Task History Delta
- normalize and bound the envelope in-memory
- expose advisory hints only:
  - ranking eligible
  - legality eligible
  - deictic resolution eligible
- keep the slice observational only with no runtime routing or execution changes

## Slice S2

Slice S2 implemented previously:
- carry bounded focus-context metadata into H3 runtime evidence
- derive observational evidence fields from the context envelope summary and advisory hints
- attach focus metadata per chunk without changing routing, governance, or execution behavior
- keep null evidence fields when no focus envelope is attached

## Bounded Defaults

Initial bounded defaults retained through Stage 3E1:
- freshness window: `60 seconds`
- minimum focus confidence: `0.75`
- max focus-delta entries: `8`
- max task-history entries: `8`
- verified authority required for context eligibility

## Slice S3

Slice S3 implemented previously:
- pass the advisory focus envelope into warm semantic lookup
- apply a bounded focus-conditioned ranking boost for v1 open-command candidates only
- keep the pilot constrained to `open` / `go to` style parameterized-open families
- keep ranking advisory-only with no authorization effect
- emit advisory ranking metadata through existing H3 evidence

## Slice S4

Slice S4 implemented previously:
- add bounded advisory legality shaping for v1 deictic open-family commands
- start with `open it` and `go there` only
- treat focus legality as a bounded penalty, not as authorization
- carry legality metadata through lookup results and H3 runtime evidence
- keep live geometry and H23/H24 as the only execution authority

## Slice S5

Slice S5 implemented previously:
- add bounded advisory task-history momentum shaping for recent workflow continuity
- use recent success/undo outcomes to add a bounded boost or penalty during warm candidate scoring
- keep the pilot constrained to v1 parameterized-open and parameterized-numeric families
- emit advisory task-momentum metadata through lookup/warm/merged evidence

## Slice S6

Slice S6 implemented in this bundle:
- close Stage 3E1 with a validation and closure pass only
- freeze Stage 3E1 scope and doctrine in docs
- record the acceptance criteria satisfied across S1-S5
- hand off the next stage as Stage 3E2 policy-shaped atlas shards

## Stage 3E1 Acceptance Criteria

Stage 3E1 is acceptable only if all of the following remain true:
- focus-context signals stay bounded and advisory-only
- warm/focus/task-history state never authorizes execution
- live geometry plus live tail normalization remain authoritative
- H23/H24 remain final authority
- no Stage 3A activation drift is introduced
- no persistence/distributed cache is introduced
- no Turbo/Tight/Ultra work is introduced in Stage 3E1
- v1 families remain the only broadened surface

## Stage 3E1 Closure Summary

Stage 3E1 now provides:
- a bounded focus-context envelope contract
- runtime evidence propagation for focus/context metadata
- advisory ranking shaping for a narrow open-command pilot
- advisory deictic legality shaping for `open it` / `go there`
- advisory task-history momentum shaping for recent continuity and recent undo

Stage 3E1 does not provide:
- execution authorization from focus, warm state, or task history
- governance bypass
- persistence/distributed cache
- policy-shaped atlas shards
- multi-resolution atlas
- counterfactual shadow reasoning

## Next Stage

Next planned stage after Stage 3E1:
- Stage 3E2 — policy-shaped atlas shards
