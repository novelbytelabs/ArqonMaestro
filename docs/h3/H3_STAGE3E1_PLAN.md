# H3 Stage 3E1 Plan

Status: Slice S1 contract bundle
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

Slice S1 implemented in this bundle:
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

## Bounded Defaults

Initial bounded defaults in Slice S1:
- freshness window: `60 seconds`
- minimum focus confidence: `0.75`
- max focus-delta entries: `8`
- max task-history entries: `8`
- verified authority required for context eligibility

## Acceptance Criteria for S1

Slice S1 is acceptable only if:
- the contract is pure and bounded
- stale or low-confidence focus snapshots become ineligible
- heuristic/unverified authority does not become eligible
- missing snapshot remains observational only
- no execution path is changed
- no ranking/governance bypass is introduced

## Follow-on Slices

Planned next slices after S1:
- S2: carry context envelope metadata into H3 runtime evidence
- S3: narrow ranking reshaping pilot for `open`, `go to`, and `focus`
- S4: legality shaping pilot for deictic commands such as `open it` / `go there`
- S5: task-history delta pilot with bounded workflow momentum
