# H3 Stage 3B1 Plan

Status: Planning only (no implementation)
Scope: Stage 3B1 - Numeric Tail Specialization

## Objective

After atlas-backed geometric prefix activation, use a numeric-specific tail strategy for parameterized commands such as `go to line <n>`.

Improve:
- numeric tail stability
- numeric normalization correctness
- merge correctness (prefix + numeric tail)
- evidence clarity

Without changing Stage 3A routing foundations:
- keep geometric activation as route trigger
- keep existing `geometric_prefix_asr_tail` routing semantics
- preserve H23/H24 compatibility and H3-off fallback

## Exact Validation Command Set

Primary positive set:
- `go to line 1`
- `go to line 9`
- `go to line 10`
- `go to line 52`
- `go to line 100`
- `go to line 243`
- `go to line 1000`

Spoken-number variant set:
- `go to line fifty two`
- `go to line one hundred`
- `go to line two hundred forty three`
- `go to line one thousand`

Negative / guardrail set:
- `go to line` (missing numeric tail)
- `go to line maybe` (non-numeric tail)
- non-parameterized utterance while numeric strategy is armed

Compatibility checks:
- reflex command still unaffected: `pause`
- closed-structure command still unaffected: `new tab`
- H3-off path check with `H3_GEOMETRIC_ENABLED=false`

## Numeric Tail Strategy Design

Activation conditions:
- route is already `geometric_prefix_asr_tail`
- geometric event source is `spectral_manifold`
- atlas-derived command class is `parameterized`
- atlas-derived parameter type is `numeric`

Strategy behavior:
- start a numeric-tail capture window after prefix activation
- decode tail with a numeric-biased decoding profile
- constrain candidate output to numeric-friendly token patterns
- maintain confidence and fallback indicators per chunk

Decision policy:
- if numeric parse confidence passes threshold: use numeric-specialized result
- if below threshold: retain existing fallback behavior (no routing foundation change)
- never promote transcript heuristics above geometric-triggered route selection

## Normalization Rules

Canonical output target:
- integer string (base-10), no commas, no extra words

Normalization steps:
- lowercase and trim whitespace
- map spoken number words to integer form
- support compound forms:
  - tens + ones (`fifty two` -> `52`)
  - hundreds (`one hundred` -> `100`)
  - hundreds with suffix (`two hundred forty three` -> `243`)
  - thousands (`one thousand` -> `1000`)
- allow direct digit strings (`52`, `1000`)
- reject mixed non-numeric tail content for numeric parameter type

Validation bounds:
- parse must produce a positive integer
- optional command-specific bounds can be applied later (out of scope for 3B1 unless already existing)

## Merge Semantics

Merge contract:
- prefix text remains geometric-derived command prefix (`go to line`)
- tail text is numeric normalized value
- merged final text canonical form:
  - `go to line <normalized_integer>`

Trace semantics:
- preserve current H23 step structure
- append evidence that numeric tail normalization was applied
- do not alter upstream geometric event contract fields from Stage 3A

Failure semantics:
- if numeric tail missing/invalid, emit explicit non-executable reason for numeric-tail failure path
- do not silently coerce invalid tails into executable numeric payloads

## Required Evidence Events

Required per-chunk chain (for numeric commands):
- `geometric_event_emitted`
- `geometric_event_received`
- `route_activation` (`routeAfter=geometric_prefix_asr_tail`)
- `numeric_tail_strategy_selected`
- `tail_capture_started`
- `tail_capture_completed`
- `numeric_tail_decode_started`
- `numeric_tail_decode_completed`
- `numeric_tail_normalized`
- `merged_transcript_emitted`
- `h23_trace_written`
- `h24_proof_written`

Required event fields (minimum):
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

Numeric-specific additions:
- `parameterType` (must be `numeric`)
- `numericRaw`
- `numericNormalized`
- `numericParseConfidence`
- `numericStrategyVersion`

## Acceptance Criteria

Stage 3B1 planning is satisfied only when implementation later proves:
1. numeric strategy is selected only after atlas-backed geometric prefix activation
2. `go to line <n>` commands in validation set execute with correct normalized integer payload
3. merged transcript format is canonical (`go to line <int>`)
4. evidence chain includes numeric-specific events and fields
5. H23/H24 compatibility remains intact
6. reflex/closed-structure commands remain unaffected
7. H3-off fallback remains intact

## Risks

- spoken-number ambiguity (homophones, accents, pacing)
- over-constrained decoder dropping valid numeric tails
- under-constrained decoder admitting non-numeric content
- normalization edge cases (compound forms, partial utterances)
- evidence verbosity/noise if numeric events are emitted too frequently

## Non-Goals

- Stage 3B2 open-tail specialization
- Turbo/Tight/Ultra regime tuning
- broad optimization campaign
- vocabulary expansion beyond numeric-tail use cases
- changing Stage 3A geometric routing activation logic
- large refactors unrelated to numeric tail specialization
