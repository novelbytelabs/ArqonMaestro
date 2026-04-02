# H3 Stage 3E1 Plan

Status: Slice S4 legality shaping pilot bundle
Scope: Focus-Conditioned Command Geometry, starting with a bounded observational/advisory context envelope only

## Objective

Introduce a structured focus-conditioned context envelope that can later shape ranking and legality without ever replacing live geometric command truth or bypassing H23/H24 governance.

## Stage 3E1 Doctrine

Decision hierarchy remains:
1. live voice geometry
2. specialized tail normalization / canonical merge
3. H23 / H24 governance
4. focus-conditioned command context
5. warm memory / SAS priors

Focus context may shape interpretation later.
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

Slice S2 implemented in this bundle:
- carry bounded focus-context metadata into H3 runtime evidence
- derive observational evidence fields from the context envelope summary and advisory hints
- attach focus metadata per chunk without changing routing, governance, or execution behavior
- keep null evidence fields when no focus envelope is attached

## Bounded Defaults

Initial bounded defaults retained through S2:
- freshness window: `60 seconds`
- minimum focus confidence: `0.75`
- max focus-delta entries: `8`
- max task-history entries: `8`
- verified authority required for context eligibility

## Acceptance Criteria for S2

Slice S2 is acceptable only if:
- focus context remains advisory only
- evidence fields are emitted for attached eligible/ineligible envelopes
- missing focus context emits null focus evidence fields
- no execution path is changed
- no ranking/governance bypass is introduced

## Slice S3

Slice S3 implemented in this bundle:
- pass the advisory focus envelope into warm semantic lookup
- apply a bounded focus-conditioned ranking boost for v1 open-command candidates only
- keep the pilot constrained to `open` / `go to` style parameterized-open families
- keep ranking advisory-only with no authorization effect
- emit advisory ranking metadata through existing H3 evidence

## Acceptance Criteria for S3

Slice S3 is acceptable only if:
- focus ranking is bounded and advisory-only
- ineligible focus context produces zero ranking boost
- live geometry and H23/H24 remain the only execution authority
- no persistence/distributed cache is introduced

## Slice S4

Slice S4 implemented in this bundle:
- add bounded advisory legality shaping for v1 deictic open-family commands
- start with `open it` and `go there` only
- treat focus legality as a bounded penalty, not as authorization
- carry legality metadata through lookup results and H3 runtime evidence
- keep live geometry and H23/H24 as the only execution authority

## Acceptance Criteria for S4

Slice S4 is acceptable only if:
- legality shaping stays bounded and advisory-only
- deictic focus-ineligible lookups receive a bounded penalty
- lawful focus envelopes remove the penalty without authorizing execution
- H23/H24 remain final authority
- no persistence/distributed cache is introduced

## Follow-on Slices

Planned next slices after S4:
- S5: task-history delta pilot with bounded workflow momentum
