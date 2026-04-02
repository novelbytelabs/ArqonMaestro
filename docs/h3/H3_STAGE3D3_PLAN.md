# H3 Stage 3D3 Plan

Status: Slice planning + minimal slice S1 implementation bundle
Scope: conflict-aware warm-hit confidence policy for validated v1 families only

## Objective

Add a bounded confidence policy above the Stage 3D2 advisory warm path so warmed candidates are ranked more cautiously when they are old or recently contradicted by live geometric truth.

Primary objective:
- make warm-hit confidence conflict-aware through bounded decay, stale protection, and recent-override penalty

Hard safety objective:
- warm state remains advisory only and may never authorize execution

## Stage 3D3 Boundaries

Still in scope:
- in-memory confidence policy only
- validated v1 families only
- conflict-aware strong/weak classification
- bounded freshness decay
- hard stale cutoff to warm miss
- recent live-truth override penalty

Still out of scope:
- persistence or distributed cache
- governance changes
- Turbo / Tight / Ultra
- non-v1 family expansion
- any command authorization from warm state

## Decision Hierarchy

1. live geometric evidence
2. live tail normalization / canonical merge validation
3. H23 / H24 governance
4. warm memory confidence policy

Warm memory may accelerate preparation only. It may not outrank live evidence or governance.

## Slice S1

Slice S1 implemented in this bundle:
- add confidence policy metadata to semantic lookup results
- decay warm score as records age
- convert warm lookups to `miss` once stale threshold is crossed
- record recent live-truth override conflicts against the warmed semantic address
- penalize subsequent warm confidence for recently conflicted entries
- keep all behavior advisory only

Minimal runtime path added:
- when Stage 3D2 override/discard fires, the chunk manager notifies the semantic registry of a live-truth conflict for that warmed semantic address
- future lookups for that address are demoted by the confidence policy until a fresh governed success refreshes the record

## Proposed Policy Constants

Policy version:
- `3d3_conflict_aware_warm_confidence_v1`

Initial bounded constants in Slice S1:
- weak threshold: `0.78`
- strong threshold: `0.93`
- decay window: `5 minutes`
- stale cutoff: `10 minutes`
- decay floor: `0.88`
- recent conflict window: `2 minutes`
- recent conflict multiplier: `0.84`

Interpretation:
- freshness decay is mild and bounded
- stale entries become advisory miss
- recent conflicts demote confidence but do not remove the underlying record
- a new governed success clears the conflict penalty state for that semantic address

## Required Evidence / Test Intent

Slice S1 must prove:
- recent override conflict demotes subsequent warm confidence
- stale records become warm miss with explicit stale-protection reason
- bounded age decay reduces score before stale cutoff
- override/discard path records conflict penalty input while live merged truth still executes
- advisory-only doctrine remains intact

## Acceptance Criteria for S1

Slice S1 is acceptable only if:
- warm hit never authorizes execution
- live geometric truth still overrides warmed expectation
- recent override conflict demotes future warm confidence in-memory
- stale entries return warm miss
- fresh governed success resets prior conflict penalty state
- no persistence/distributed cache is introduced
- no H23/H24 bypass is introduced
- no Stage 3A activation behavior changes

## Follow-on Slices

Potential later Stage 3D3 slices:
- S3: family-specific confidence tuning for numeric vs open tails
- S4: bounded in-memory eviction / reheating heuristics

None of those are included in this bundle.


## Slice S2

Slice S2 implemented in this bundle:
- surface confidence-policy metadata into H3 runtime evidence events
- preserve advisory-only doctrine while making warm-hit reasoning auditable in reports
- carry threshold, age, stale-protection, and recent-conflict flags through pre-dispatch and finalize-stage evidence

Slice S2 must prove:
- lookup-completed evidence exposes the active confidence-policy metadata
- warm-hit / warm-discard evidence carries the same metadata for auditability
- live override + merged-transcript evidence preserve the carried metadata without granting warm authority
- all policy metadata remains observational only
