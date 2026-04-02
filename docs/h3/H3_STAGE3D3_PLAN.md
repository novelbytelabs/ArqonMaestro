# H3 Stage 3D3 Plan

Status: CLOSED (S1-S3 integrated in bundle lineage; closure docs added in finish bundle)
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
- S4: bounded in-memory eviction / reheating heuristics

Only Slice S3 is included in this bundle beyond S2.


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


## Slice S3

Slice S3 implemented in this bundle:
- add family-specific warm-confidence profiles for `parameterized_numeric` vs `parameterized_open`
- keep reflex / closed-structure behavior on the baseline profile
- make open tails stricter on warm reuse through higher thresholds and earlier stale cutoff
- keep numeric tails slightly more permissive than open tails while still advisory-only
- reuse existing Stage 3D3 evidence plumbing so the effective thresholds remain auditable without adding new authority paths

Slice S3 bounded profile choices:
- numeric:
  - weak threshold: `0.76`
  - strong threshold: `0.92`
  - decay floor: `0.90`
  - stale cutoff: `10 minutes`
  - recent conflict multiplier: `0.86`
- open:
  - weak threshold: `0.82`
  - strong threshold: `0.95`
  - decay floor: `0.84`
  - stale cutoff: `7 minutes`
  - recent conflict multiplier: `0.80`

Slice S3 must prove:
- numeric lookups expose numeric-family thresholds
- open lookups expose open-family thresholds
- recent conflict penalizes open warm reuse more aggressively than numeric warm reuse
- open warm entries stale out earlier than numeric entries
- advisory-only doctrine remains intact with no governance bypass


## Slice S4

Slice S4 implemented in this bundle:
- consolidate Stage 3D3 closure criteria into a dedicated validation report
- freeze the intended real-repo validation gates for the family-aware advisory warm policy
- record the doctrine boundary that warm confidence remains advisory-only even after profile specialization

Slice S4 adds no new authority path and no new runtime ranking source beyond the family-aware thresholds already introduced in Slice S3.

## Slice S5

Slice S5 implemented in this bundle:
- mark Stage 3D3 ready for closure once the real-repo gates pass after integration
- hand off the next-phase pivot target: Stage 3E1-S1 Focus-Conditioned Command Geometry contract
- leave runtime governance unchanged while moving the roadmap forward

## Closure Criteria

Stage 3D3 is considered closed only when the real ArqonMaestro checkout validates all of the following after integrating this finish bundle:
- `cd maestro/client && npx tsc --noEmit`
- `cd maestro/client && npx jest --config jest.config.js --runInBand src/test/audio/voice-semantic-address-registry.unit.spec.ts src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts`
- `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`

Closure doctrine remains:
- warm state may accelerate and shape ranking only
- warm state may never authorize execution
- live geometry outranks warm memory
- H23/H24 remain sacred
- no persistence/distributed cache
- v1 families only
