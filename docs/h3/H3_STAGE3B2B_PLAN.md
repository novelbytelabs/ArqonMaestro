# H3 Stage 3B2B Plan

Status: Planning only (no implementation)
Scope: Stage 3B2B - Open-tail specialization for `open <target>` only

## Objective

After atlas-backed geometric prefix activation for `open`, apply an open-tail strategy that improves target-text stability, normalization consistency, and merge correctness for open-target commands while preserving Stage 3A routing foundations.

Improve:
- open-tail target stability for `open <target>`
- open-tail normalization correctness
- merge correctness (`open` + normalized target)
- evidence clarity for open-tail outcomes

Without changing:
- Stage 3A geometric activation logic
- `geometric_prefix_asr_tail` route trigger semantics
- H23/H24 compatibility expectations
- H3-off fallback behavior
- existing `go to <target>` and numeric-tail (`go to line <n>`) behavior

## Exact Validation Command Set

Primary positive set:
- `open chrome`
- `open settings`
- `open wikipedia`
- `open wikipedia.org`
- `open github dot com`
- `open stack overflow`

Variant normalization set:
- `open wikipedia dot org`
- `open github.com`
- `open developer dot mozilla dot org`
- `open bbc dot co dot uk`
- `open open ai docs`

Guardrail/negative set:
- `open` (missing open tail)
- `open uh` (filler-only tail)
- `open maybe` (non-target ambiguous tail)
- `open and` (connector-only tail)

Required explicit rejection case:
- geometric `open` prefix activates, open-tail strategy arms, tail is rejected, and no executable merged target is emitted

Compatibility checks:
- `go to <target>` unaffected: `go to wikipedia dot org`
- numeric-tail unaffected: `go to line 52`
- reflex unaffected: `pause`
- closed-structure unaffected: `new tab`
- H3-off path check with `H3_GEOMETRIC_ENABLED=false`

## Open-Tail Strategy Design for `open`

Activation conditions:
- route is `geometric_prefix_asr_tail`
- geometric event source is `spectral_manifold`
- atlas-derived command class is `parameterized`
- atlas-derived parameter type is `open`
- atlas-derived region is `open`

Strategy behavior:
- capture tail audio after geometric `open` prefix activation
- decode tail with open-target biased handling (text preservation preferred)
- score target-likeness and structural completeness
- classify outcome as one of:
  - `open_tail_ok`
  - `open_tail_partial`
  - `open_tail_invalid`

Decision policy:
- on `open_tail_ok`: merge and dispatch
- on `open_tail_partial` or `open_tail_invalid`: explicit non-executable rejection path
- no transcript-only fallback should bypass open-tail guard when strategy is armed

## Normalization Rules

Canonical target output:
- lowercase target text
- collapse repeated whitespace
- trim leading/trailing punctuation and filler terms

Domain normalization rules:
- normalize spoken dots (`dot`) to `.` only when pattern is clearly domain-like
- collapse spaced domain fragments (`github dot com` -> `github.com`)
- preserve multi-label domains (`bbc dot co dot uk` -> `bbc.co.uk`)

Text-target normalization rules:
- preserve meaningful tokens for app/site/page names (`stack overflow`, `open ai docs`)
- remove filler-only content (`uh`, `um`) when standalone
- reject connector-only tails (`and`, `or`, `then`) and empty tails

Safety/validity rules:
- empty target is invalid
- filler-only/connector-only targets are invalid
- mixed garbage tail tokens may be classified as partial/invalid

## Merge Semantics

Merge contract:
- prefix remains geometric-derived `open`
- tail is normalized open target
- merged final text canonical form:
  - `open <normalized_target>`

Trace semantics:
- preserve H23 step progression and output shape
- include open-tail normalization/rejection evidence
- do not alter upstream geometric event contract from Stage 3A

Failure semantics:
- partial/invalid open tails terminate with explicit non-executable rejection
- no silent coercion into executable open-target payload

## Required Evidence Events/Fields

Required per-chunk chain for `open` open-tail path:
- `geometric_event_emitted`
- `geometric_event_received`
- `route_activation` (`routeAfter=geometric_prefix_asr_tail`)
- `open_tail_strategy_selected`
- `tail_capture_started`
- `tail_capture_completed`
- `open_tail_decode_started`
- `open_tail_decode_completed`
- `open_tail_normalized` or `open_tail_rejected`
- `merged_transcript_emitted` (success only)
- `h23_trace_written`
- `h24_proof_written`

Required common fields:
- `chunkId`
- `timestampMs`
- `source`
- `regionId`
- `commandClass`
- `hadTranscriptText`
- `transcriptText`
- `routeBefore`
- `routeAfter`
- `tailText`
- `mergedText`
- `stepCount`
- `finalGranted`
- `reason`

Open-tail-specific additions:
- `parameterType` (must be `open`)
- `openRaw`
- `openNormalized`
- `openParseConfidence`
- `openStrategyVersion`
- `openTailClass` (`ok | partial | invalid`)
- `openTargetKind` (`domain | text | unknown`)

## Acceptance Criteria

Stage 3B2B planning is satisfied only when implementation later proves:
1. open-tail strategy is selected only after atlas-backed `open` prefix activation
2. valid `open <target>` commands execute with correct normalized target merge
3. malformed/missing open tails do not execute and emit explicit rejection
4. evidence chain clearly shows open-tail normalization or rejection for `open`
5. `go to <target>` path remains unaffected
6. numeric path (`go to line`) remains unaffected
7. H23/H24 compatibility remains intact
8. Stage 3A activation logic remains unchanged
9. H3-off fallback remains intact

## Risks

- open-tail ambiguity may over-accept weak `open` targets
- over-strict normalization may reject useful natural targets
- domain/text target boundary may be misclassified
- filler handling may remove meaningful tokens in edge utterances
- evidence stream noise if partial updates are over-emitted

## Non-Goals

- Stage 3B2 beyond `open <target>`
- Stage 3C optimization/perf tuning
- Turbo/Tight/Ultra work
- broad command vocabulary expansion
- any changes to Stage 3A geometric activation logic
- any regression-inducing changes to `go to <target>` or numeric-tail behavior
- implementation in this planning step
