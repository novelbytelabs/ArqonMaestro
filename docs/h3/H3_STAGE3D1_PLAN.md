# H3 Stage 3D1 Plan

Status: Planning + first implementation slice definition only
Scope: Stage 3D1 - SAS / ArqonReflex Voice Semantic Address Registration

## Objective

When an atlas-backed geometric recognition successfully reaches executable completion, register that successful command trajectory as a Semantic Address (SAS / ArqonReflex-style) so future utterances of the same command can hit a warm geometric cache via `hume_scan_batch`, while preserving H23/H24 governance and Stage 3A foundations.

Primary goal:
- reduce repeated-command cold-path overhead for validated v1 families through safe warm lookup

Without changing:
- Stage 3A geometric activation logic
- numeric/open-tail specialization semantics (Stage 3B1/3B2)
- H23/H24 governance flow or proof behavior

## Validated v1 Family Scope

Only these families are in scope for Stage 3D1:
- `pause`
- `new tab`
- `go to line`
- `go to <target>`
- `open <target>`

Out-of-scope families stay on existing paths.

## Voice Semantic-Address Schema

Proposed artifact form: append-only runtime registry (JSONL or structured event store) plus in-memory index.

Semantic Address record (`voice_semantic_address_registered` payload basis):
- `semanticAddressId`: stable ID (hash of canonical fields)
- `schemaVersion`: `h3_voice_semantic_address_v1`
- `createdAtMs`
- `updatedAtMs`
- `source`: `spectral_manifold`
- `atlasVersion`
- `atlasSchema`
- `regionId`
- `commandClass`
- `parameterType` (`null | numeric | open`)
- `commandFamily` (`reflex | closed_structure | parameterized_numeric | parameterized_open`)
- `canonicalPrefix` (e.g. `go to line`, `go to`, `open`)
- `canonicalMergedText` (post-normalization final text)
- `slotSignature` (e.g. `goto_line:52`, `goto_open:wikipedia.org`, `open_target:chrome`)
- `geometricSignatureWords` (u64 words from lift/manifold path, bounded)
- `captureRadius`
- `minFrames`
- `activationThreshold`
- `successCount`
- `lastSuccessChunkId`
- `lastSuccessSessionId`
- `governanceVersion`: `{ h23: string, h24: string }`
- `governanceQualified`: boolean (true only when execution passed governance)
- `evictionScore` (runtime-maintained)

Index keys:
- `regionId + slotSignature`
- `canonicalMergedText`
- optional geometric hash bucket key for warm scan prefilter

## Registration Path Design

Registration trigger (strict):
1. atlas-backed geometric route activates
2. specialization/merge succeeds (or reflex/closed direct success)
3. command reaches executable completion path
4. H23 trace written and H24 proof/write path completed without rejection

Only then register/update semantic address.

Registration flow:
1. collect normalized command outcome context from existing H3 evidence chain
2. derive canonical semantic tuple (`regionId`, `parameterType`, `slotSignature`, `canonicalMergedText`)
3. attach bounded geometric signature representation for warm scan
4. upsert in runtime semantic-address registry
5. emit `voice_semantic_address_registered` or `voice_semantic_address_refreshed`

Safety gates:
- no registration on rejection/non-executable outcomes
- no registration when governance result is blocked/denied
- no registration for non-v1 families in Stage 3D1

## Lookup Path Design

Lookup trigger (candidate warm path):
- incoming geometric event arrives for a v1 family before full tail completion
- runtime attempts semantic-address warm lookup using:
  - geometric nearest candidates (`hume_scan_batch` score neighborhood)
  - region/parameter compatibility
  - slot-signature compatibility when available

Lookup outcomes:
- `warm_hit_strong`: may fast-track to existing merge path with advisory confidence
- `warm_hit_weak`: advisory only; continue normal path
- `warm_miss`: continue normal path

Hard rule:
- warm lookup is advisory for routing acceleration only; it does not bypass H23/H24 governance.

Execution contract:
- final dispatch still requires normal executable payload + governance approval
- no direct actuation from cache lookup alone

## First Implementation Slice (Stage 3D1-S1)

Implement only foundation plumbing:
1. semantic-address schema/types and registry interface
2. in-memory registry with bounded LRU/TTL
3. registration hook at post-governed successful execution points for v1 families
4. lookup API stub that scores/returns candidates without changing dispatch semantics
5. structured evidence events for registration + lookup result

No aggressive fast-path execution in S1.

## Required Evidence Events/Fields

New events:
- `voice_semantic_address_registered`
- `voice_semantic_address_refreshed`
- `voice_semantic_address_lookup_started`
- `voice_semantic_address_lookup_completed`
- `voice_semantic_address_warm_hit`
- `voice_semantic_address_warm_miss`

Required fields (all events):
- `chunkId`
- `timestampMs`
- `source`
- `regionId`
- `commandClass`
- `parameterType`
- `semanticAddressId`
- `canonicalMergedText`
- `slotSignature`
- `atlasVersion`
- `routeBefore`
- `routeAfter`
- `reason`

Lookup-specific fields:
- `lookupCandidateCount`
- `bestCandidateId`
- `bestCandidateScore`
- `warmHitClass` (`strong | weak | miss`)
- `governanceRequired` (always true)

Registration-specific fields:
- `governanceQualified`
- `h23StepCount`
- `h24FinalGranted`
- `successCount`

## Acceptance Criteria

Stage 3D1 planning/slice acceptance is satisfied when implementation proves:
1. semantic-address records are created only for successful governed v1 commands
2. registration never occurs for rejected/non-executable outcomes
3. lookup runs for v1 families and emits deterministic hit/miss evidence
4. warm lookup does not bypass H23/H24 governance
5. Stage 3A activation logic remains unchanged
6. numeric-tail (`go to line`) and open-tail (`go to` / `open`) behavior remains non-regressed
7. no scope expansion beyond listed v1 families

## Risks

- cache poisoning from incorrect canonicalization if registration gates are too loose
- over-aggressive warm-hit interpretation causing false positives
- evidence noise/volume increase from lookup events
- memory growth if registry retention is not bounded
- subtle drift between atlas versions and cached semantic-address entries

## Non-Goals

- Turbo/Tight/Ultra regime work
- Stage 3E+ optimization campaigns
- non-v1 command family registration
- bypassing governance for latency
- replacing atlas or Stage 3A geometric activation logic
- large persistence/distributed cache system in Stage 3D1-S1

