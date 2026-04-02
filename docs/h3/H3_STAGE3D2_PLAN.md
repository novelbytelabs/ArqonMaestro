# H3 Stage 3D2 Plan

Status: Planning only (no implementation)
Scope: Stage 3D2 - warm-path exploitation for validated v1 families

## Objective

Exploit Stage 3D1 semantic-address warm hits to reduce repeated-command latency for validated v1 families while keeping governance, geometric truth, and fallback safety unchanged.

Primary objective:
- use warm-hit signals to accelerate candidate selection and tail strategy setup

Hard safety objective:
- warm-hit signals may accelerate routing preparation but must never authorize execution.

## Exact v1 Validation Set

Validated v1 families only:
- reflex: `pause`
- closed-structure: `new tab`
- parameterized numeric: `go to line 52`
- parameterized open: `go to wikipedia dot org`
- parameterized open: `open github dot com`

Required negative/guardrail cases:
- geometric event present but warm miss for v1 command
- weak warm hit followed by conflicting live geometric evidence
- rejected/non-executable outcome must not register/authorize from warm state
- H3-off baseline: `H3_GEOMETRIC_ENABLED=false`

## Warm-Hit Usage Rules

Allowed warm-path uses:
- pre-select likely command family candidate for scoring order
- pre-arm likely tail specialization (`numeric` vs `open`) as advisory
- set tighter candidate shortlist before full tail decode
- prefill expected canonical prefix for merge validation

Disallowed warm-path uses:
- direct execution authorization
- skipping geometric evidence checks
- skipping H23/H24 checks
- bypassing reject/non-executable paths

Decision hierarchy:
1. live geometric evidence (current chunk)
2. live tail normalization/validation
3. governance outcome (H23/H24)
4. warm cache memory (advisory only)

## Strong vs Weak Warm-Hit Semantics

`warm_hit_strong`:
- score above strong threshold
- may enable aggressive shortlist narrowing
- may reduce tail-decode branch fanout
- still requires full live geometric + governance pass

`warm_hit_weak`:
- score above weak threshold but below strong
- advisory ranking only
- must preserve broad fallback path
- must never suppress contradictory live evidence

`warm_miss`:
- continue normal Stage 3A/3B path
- no penalty, no rejection by cache absence

Conflict rule:
- if live geometric evidence disagrees with warm candidate, live evidence wins immediately.

## Atlas Compatibility Rules

Warm-hit candidate is usable only when:
- `atlasSchema` matches supported schema (`h3_command_atlas_v1`)
- `atlasVersion` is compatible with currently loaded atlas version
- `regionId` and `parameterType` are valid v1 family members

When incompatible:
- classify as `warm_miss_atlas_incompatible`
- continue standard path
- emit explicit evidence with mismatch reason

## Acceleration Boundaries

Acceleration may change:
- candidate ordering
- shortlist size
- advisory strategy pre-arm timing

Acceleration may not change:
- Stage 3A geometric activation logic
- numeric/open normalization rules
- rejection semantics for malformed tails
- H23/H24 decision gates
- command dispatch authorization rules

Operational boundary:
- in-memory runtime cache only (no persistence/distributed cache in Stage 3D2)

## Evidence Events/Fields

Required events:
- `voice_semantic_address_lookup_started`
- `voice_semantic_address_lookup_completed`
- `voice_semantic_address_warm_hit`
- `voice_semantic_address_warm_miss`
- `voice_semantic_address_warm_applied` (new)
- `voice_semantic_address_warm_discarded` (new)

Required fields (all):
- `chunkId`
- `timestampMs`
- `source`
- `regionId`
- `commandClass`
- `parameterType`
- `semanticAddressId`
- `atlasVersion`
- `routeBefore`
- `routeAfter`
- `reason`
- `governanceRequired` (always true)

Warm-exploitation-specific fields:
- `warmHitClass` (`strong | weak | miss`)
- `lookupCandidateCount`
- `bestCandidateId`
- `bestCandidateScore`
- `warmApplied` (boolean)
- `warmAppliedStage` (`candidate_rank | tail_strategy_prearm | shortlist_only`)
- `warmDiscardReason` (if discarded)
- `liveEvidenceOverride` (boolean)

## Acceptance Criteria

Stage 3D2 is complete only when implementation proves:
1. warm hits accelerate eligible v1 flows measurably (at least one stage timing reduction)
2. warm hit never authorizes execution on its own
3. live geometric evidence always outranks warm cache memory
4. no H23/H24 bypass occurs
5. no regression in v1 family behavior (`pause`, `new tab`, `go to line`, `go to`, `open`)
6. malformed/rejected tails remain non-executable
7. no persistence/distributed cache added
8. no non-v1 family expansion introduced

## Risks

- over-trusting strong warm hits in noisy audio
- weak-hit ambiguity adding complexity without meaningful gain
- atlas-version mismatch edge cases causing silent misrouting if not explicit
- evidence noise if warm apply/discard events are too chatty
- subtle latency regressions if warm logic adds overhead on miss-heavy traffic

## Non-Goals

- persistence/distributed semantic-address cache
- Turbo/Tight/Ultra regime work
- non-v1 family expansion
- policy/governance redesign
- replacing live geometric path with cache-first execution
- large optimization campaign beyond bounded warm-path exploitation

