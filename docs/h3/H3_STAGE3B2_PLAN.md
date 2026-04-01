# H3 Stage 3B2 Plan

Status: Planning only (no implementation)
Scope: Stage 3B2A - Open-tail specialization for `go to <target>` only

## Objective

After atlas-backed geometric prefix activation for `go to`, apply an open-tail strategy that improves target-text stability, normalization consistency, and merge correctness for navigation targets (e.g., domains, page names) while preserving Stage 3A routing foundations.

Improve:
- open-tail target stability
- open-tail normalization correctness
- merge correctness (`go to` + normalized target)
- evidence clarity for open-tail outcomes

Without changing:
- Stage 3A geometric activation logic
- `geometric_prefix_asr_tail` route trigger semantics
- H23/H24 compatibility expectations
- H3-off fallback behavior

## Exact Validation Command Set

Primary positive set:
- `go to wikipedia`
- `go to wikipedia.org`
- `go to docs python`
- `go to github dot com`
- `go to stack overflow`
- `go to open ai docs`

Variant normalization set:
- `go to wikipedia dot org`
- `go to github.com`
- `go to developer dot mozilla dot org`
- `go to bbc dot co dot uk`

Guardrail/negative set:
- `go to` (missing open tail)
- `go to uh` (filler-only tail)
- `go to maybe` (non-target ambiguous tail)
- `go to and` (connector-only tail)

Compatibility checks:
- numeric path unaffected: `go to line 52`
- reflex unaffected: `pause`
- closed-structure unaffected: `new tab`
- H3-off path check with `H3_GEOMETRIC_ENABLED=false`

## Open-Tail Strategy Design

Activation conditions:
- route is `geometric_prefix_asr_tail`
- geometric event source is `spectral_manifold`
- atlas-derived command class is `parameterized`
- atlas-derived parameter type is `open`
- atlas-derived region is `go to`

Strategy behavior:
- capture tail audio after geometric `go to` prefix activation
- decode tail with open-tail target-biased handling (text preservation preferred)
- score tail for target-likeness and structural completeness
- classify output as one of:
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
- normalize spoken dots (`dot`) to `.` where pattern is domain-like
- collapse spaced domain fragments (`github dot com` -> `github.com`)
- preserve multi-label domains (`bbc dot co dot uk` -> `bbc.co.uk`)

Text-target normalization rules:
- preserve meaningful tokens for page/app names (`stack overflow`, `open ai docs`)
- remove filler-only content (`uh`, `um`) when standalone
- reject connector-only tails (`and`, `or`, `then`) and empty tails

Safety/validity rules:
- empty target is invalid
- filler-only/connector-only targets are invalid
- mixed garbage tail tokens can be rejected as partial/invalid

## Merge Semantics

Merge contract:
- prefix remains geometric-derived `go to`
- tail is normalized open target
- merged final text canonical form:
  - `go to <normalized_target>`

Trace semantics:
- preserve H23 step progression and shape
- include open-tail normalization/rejection evidence
- do not alter upstream geometric event contract from Stage 3A

Failure semantics:
- partial/invalid open tails end in explicit non-executable rejection
- no silent coercion into executable target payload

## Required Evidence Events/Fields

Required per-chunk chain for `go to` open-tail path:
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

## Acceptance Criteria

Stage 3B2A is complete only when implementation later proves:
1. open-tail strategy is selected only after atlas-backed `go to` prefix activation
2. valid `go to <target>` commands execute with correct normalized target merge
3. malformed/missing open tails do not execute and emit explicit rejection
4. evidence chain clearly shows open-tail normalization or rejection
5. numeric path (`go to line`) remains unaffected
6. H23/H24 compatibility remains intact
7. Stage 3A activation logic remains unchanged
8. H3-off fallback remains intact

## Risks

- open-tail ambiguity may over-accept weak targets
- over-strict normalization may reject useful natural phrases
- domain/text target boundary may be misclassified
- filler word handling may remove meaningful tokens in edge utterances
- evidence stream noise if partial updates are over-emitted

## Non-Goals

- Stage 3B2 beyond `go to <target>` (no `open <target>` yet)
- Stage 3C optimization/perf tuning
- Turbo/Tight/Ultra work
- broad command vocabulary expansion
- any changes to Stage 3A geometric activation logic
- implementation in this planning step
