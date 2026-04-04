# 3J Spec 7 — Workflow Discovery

## Document identity

**Title:**
Arqon Maestro 3J Workflow Discovery

**Stage:**
`3J`

**Spec role:**
Discovery-system specification

**Purpose:**
Define how `3J` discovers workflow and macro candidates from governed user behavior, including repeated subsequence detection, boundary discipline, repeat thresholds, variation handling, canonicalization, and evidence windows.

This spec defines the front door of `3J`: how raw governed behavioral history becomes candidate-worthy workflow patterns.

## 1. Mission

`3J` needs a discovery system because workflow creation cannot begin from vague impressions.

Before a workflow can be scored, risk-evaluated, abstracted, promoted, drafted, or saved, the system must first identify:

* what repeated behavior exists
* whether it is workflow-shaped
* whether the repetition is coherent enough to matter
* whether it has boundaries
* whether it is just noise or a real reusable structure

The mission of workflow discovery is therefore:

**detect governed, repeatable, bounded workflow-like patterns from user behavior without collapsing noise into artifacts.**

Discovery is the first real compression step of `3J`.

## 2. Core thesis

Workflow discovery must be governed by **bounded repeated subsequence recognition**, not by naïve event counting.

A workflow is not:

* one repeated command
* one repeated transition only
* any repeated motion in the stream
* any fragment that happens to recur

A discoverable workflow candidate is a repeated, sufficiently coherent, governed subsequence with usable structure.

So the core thesis is:

**3J discovers workflow candidates by finding repeated governed subsequences with meaningful structural coherence, not by treating repetition alone as proof of workflowhood.**

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_03_SCORING_MODEL.md`
* `H3_STAGE3J_SPEC_04_RISK_ENGINE.md`
* `H3_STAGE3J_SPEC_05_RUBRIC_FRAMEWORK.md`
* `H3_STAGE3J_SPEC_06_PROMOTION_ENGINE.md`

This discovery system only discovers candidate patterns.
It does not:

* approve workflows
* save workflows
* execute workflows
* infer final promotion states by itself

Discovery is necessary, but not sufficient.

## 4. Design requirements

The discovery system must be:

* governed-history-based
* subsequence-aware
* boundary-aware
* repeat-aware
* tolerant to limited variation
* resistant to noise
* able to handle both short and multi-step patterns
* able to expose evidence windows and provenance
* conservative enough to avoid junk discovery
* extensible enough to support later abstraction and promotion

It must avoid:

* trivial repetition inflation
* accidental subsequence overfitting
* weak boundary merging
* discovering workflows from unguided or ungoverned noise
* collapsing unrelated actions into one candidate
* rediscovering the same thing endlessly without canonicalization

## 5. Discovery philosophy

The discovery system should behave like a disciplined miner, not a pattern-hoarding enthusiast.

That means:

* repeated patterns matter
* but not every repeated pattern deserves candidate status
* coherent subsequences matter more than isolated repeated steps
* governed observations matter more than fuzzy recollections
* clear boundaries matter more than long noisy chains
* candidate quality begins at discovery, not only later in scoring

A discovery engine that is too permissive creates clutter downstream.
A discovery engine that is too strict starves `3J`.

So discovery must be strong, but not reckless.

## 6. Discovery inputs

The workflow discovery system consumes primarily governed workflow-memory substrates from `3I`, including:

* governed semantic-address observations
* governed transition histories
* repeated subsequence histories
* continuity priors
* reuse priors
* observed sequence windows
* step timing and adjacency information
* session-local governed history

The discovery system must strongly prefer governed observations and governed sequence history as the foundation.

## 7. Governing law of discovery provenance

A workflow candidate may only be discovered from sufficiently grounded governed history.

That means:

* governed semantic-address observations are the main discovery substrate
* ungoverned or ambiguous observations may inform context, but must not alone mint workflow candidates
* warm/memory/context/history may shape discovery, but may not fabricate a governed workflow pattern where governed history is absent

This preserves continuity with prior doctrine:
live governed truth outranks weak or merely suggestive memory.

## 8. Discovery unit

The canonical discovery unit is the **governed subsequence**.

A governed subsequence is an ordered sequence of governed semantic-address observations occurring within a bounded window and preserving their transition relationships.

This is the atomic discovery substrate for `3J`.

It is richer than:

* individual steps
* pairwise transitions
* raw event counts

and more disciplined than:

* arbitrary long event trails

## 9. Discovery target

The discovery target is a repeated governed subsequence that is:

* bounded
* semantically coherent
* sufficiently stable
* likely reusable
* likely worth abstraction

This repeated subsequence becomes the seed for a workflow candidate.

## 10. Discovery modes

The system should support at least these discovery modes conceptually:

### 10.1 Online session discovery

Detect patterns within the active session as evidence accumulates.

Use when:

* repeated behavior appears quickly
* the user is in active training mode
* the system may want earlier candidate formation

### 10.2 Quiet/background discovery

Mine recent session-local governed history in calmer moments.

Use when:

* the system should avoid interruption
* candidate mining can happen without UX pressure

### 10.3 Sleep-mode discovery

Perform heavier discovery over accumulated governed sequence history.

Use when:

* longer-window pattern mining is beneficial
* clustering/merging needs more time
* daily or deferred digest preparation is desired

These modes differ in cadence and discovery aggressiveness, but must obey the same constitutional rules.

## 11. Sequence windowing

Discovery must operate over bounded evidence windows.

A workflow pattern must not be inferred from an unbounded rolling stream with no segmentation discipline.

The system should preserve:

* evidence window start
* evidence window end
* number of candidate-supporting runs
* number of candidate-supporting governed events
* local context around repeated subsequences

Windowing is necessary to:

* avoid over-absorption
* preserve provenance
* support future re-evaluation
* support sleep-mode or digest mining cleanly

## 12. Discovery sequence length discipline

The discovery system must support multiple sequence lengths, but bounded ones.

At minimum, it should be able to reason about:

* short sequences
* medium multi-step sequences
* repeated subsequences embedded inside longer chains

It should avoid premature discovery of:

* meaningless singletons
* huge chains with weak boundaries
* sprawling mixed workflows that should instead be decomposed

The system should prefer discovering:

* tight repeated subsequences
* then expanding them later only when supported

That is the correct discovery posture.

## 13. Minimum repeat support

No candidate should be discovered from a single observation.

The discovery system must require repeated evidence.

The exact thresholds may vary later by class or mode, but the principle is fixed:

* one occurrence is not enough
* two may be interesting but often weak
* stronger discovery generally requires repetition across distinct governed runs or distinct well-supported windows

Discovery should care not only about total occurrence count, but also about:

* distinct run count
* repeat separation quality
* recurrence over time
* recurrence consistency

This prevents one noisy burst from becoming a fake workflow.

## 14. Distinct run support

The discovery engine must distinguish between:

* repeated occurrences inside one local burst
* repeated occurrences across distinct runs

Distinct runs matter because they are stronger evidence that a pattern is reusable rather than accidental or self-corrective noise.

So discovery should preserve:

* total occurrence count
* distinct run count
* clustered-vs-separated recurrence profile

These later feed confidence and utility.

## 15. Repeated subsequence detection

This is the heart of discovery.

The system must identify repeated subsequences in governed history.

A repeated subsequence is a sequence of semantic-address steps that reappears with sufficient order and structural similarity across multiple supported runs.

The detector should preserve:

* ordered semantic-address ids
* transition keys
* occurrence counts
* positions within observed runs
* boundary confidence
* local context variance

The detector should support:

* exact repeated subsequences
* near-repeated subsequences with bounded tolerated variation

## 16. Exact subsequence discovery

Exact repeated subsequences are the easiest and safest discovery cases.

These occur when:

* the same ordered steps recur
* boundaries are similar
* the semantic-address sequence is stable

Exact discovery should be preferred when available because it offers:

* stronger evidence
* lower abstraction burden
* lower discovery ambiguity

These are the best early candidates.

## 17. Near-repeated subsequence discovery

The system must also support near-repeated sequences, because users often vary behavior slightly while still performing the same workflow.

Near-repeated patterns may include:

* minor parameter variation
* one optional step present/absent
* bounded tail variation
* bounded reorder-free local differences

However, near-repeated discovery must be tightly governed.

It must not:

* tolerate arbitrary reorderings
* collapse distinct workflows into one
* absorb unrelated branches
* invent workflow identity where cohesion is weak

Near-repeated discovery should feed abstraction, not replace it.

## 18. Variation tolerance

The discovery engine must tolerate some variation, but not indiscriminately.

Variation may be tolerated when:

* the core ordered semantic-address spine is stable
* optionality is bounded
* step roles remain coherent
* slot-like differences are inferable
* local differences do not destroy workflow identity

Variation should not be tolerated when:

* boundaries shift wildly
* step order is unstable
* too many positions change
* the candidate seems to be multiple workflow families collapsed together

Variation tolerance must be class-aware later, but discovery should already preserve the relevant evidence.

## 19. Boundary discipline

Discovery must be boundary-aware from the beginning.

A repeated subsequence is not enough if the system cannot reasonably infer where the workflow starts and ends.

The discovery engine must estimate:

* start boundary confidence
* end boundary confidence
* surrounding-event contamination risk
* fragment-vs-whole uncertainty

This is essential because poor boundary discovery leads directly to:

* junk drafts
* abstraction mistakes
* duplicate clutter
* user distrust

## 20. Boundary types

The discovery engine should conceptually recognize:

### 20.1 Clear boundaries

The workflow repeatedly starts and ends in similar places.

### 20.2 Soft boundaries

The core repeated subsequence is real, but entry/exit edges still vary.

### 20.3 Ambiguous boundaries

The pattern exists, but it is not yet safe to treat it as a candidate without more evidence.

These distinctions should feed later scoring and risk.

## 21. Start and end confidence

Discovery must emit explicit signals for:

* start boundary confidence
* end boundary confidence

These need not be final judgments, but they must exist.

Why:

A pattern with strong recurrence but weak boundaries may still be a:

* hold candidate
* or abstraction candidate

but usually not an aggressive draft candidate.

So boundary confidence must begin at discovery time, not appear only later.

## 22. Sequence canonicalization

Discovery must canonicalize repeated subsequences so the system does not rediscover semantically identical patterns endlessly.

Canonicalization should create a stable pattern identity from:

* ordered semantic-address ids
* stable transition keys
* normalized optionality handling
* normalized repeated structure
* bounded parameter abstraction markers where justified

This canonical output becomes:

* the candidate pattern key
* the deduplication anchor
* the basis for merging rediscoveries

Without canonicalization, `3J` becomes noisy and duplicative.

## 23. Discovery pattern key

Every discoverable repeated subsequence should be able to yield a stable pattern key.

The pattern key should reflect:

* core ordered structure
* normalized step identities
* bounded optionality or slot placeholders when justified

It should not collapse too aggressively.
It should preserve enough structure to distinguish materially different workflows.

The pattern key is discovery’s contribution to candidate identity.

## 24. Candidate emergence threshold

A discovered repeated subsequence should not instantly become a workflow candidate simply because it was found.

There should be an emergence threshold.

Conceptually, a pattern becomes candidate-worthy only when it is:

* sufficiently repeated
* sufficiently bounded
* sufficiently coherent
* sufficiently nontrivial
* sufficiently non-duplicative

Below that threshold, the pattern may remain a discovery trace rather than a full candidate.

This prevents clutter at the source.

## 25. Triviality suppression

The discovery engine should suppress patterns that are too trivial to justify candidate formation.

Examples of potential triviality:

* isolated repeated single-step reflexes
* tiny navigation motions that save no meaningful friction
* patterns already effectively covered by more general discovered candidates
* transient cleanup motions with weak reusable value

This does not mean trivial patterns are valueless.
It means they are usually not the right input for a workflow candidate.

## 26. Duplicate-aware discovery

Discovery must already be duplicate-aware.

If the system rediscovers:

* the same pattern key
* or a near-identical pattern family

it should prefer:

* updating candidate evidence
* merging discovery support
* increasing confidence
* refining structure

rather than minting a fresh duplicate candidate every time.

Discovery is the first place where clutter control begins.

## 27. Relationship to workflow reuse and continuity priors

`3J` discovery should leverage `3I` substrates without letting them overreach.

Examples:

* continuity priors may help identify likely coherent subsequences
* workflow reuse priors may suggest repeated sequences worth closer mining
* candidate-pool ordering history may reinforce sequence significance

But these priors may shape discovery, not fabricate it.

Discovery must still be grounded in governed repeated subsequences.

## 28. Discovery outputs

The discovery system should output a structured discovery artifact or discovery-ready candidate seed containing at least:

* sequence identity
* evidence window
* observed ordered semantic-address ids
* observed transition keys
* occurrence count
* distinct run count
* sequence length stats
* start boundary confidence
* end boundary confidence
* repeated subsequence detected flag
* optionality/variation hints
* canonical pattern key
* discovery reason codes

This discovery output becomes input to the candidate model and later abstraction.

## 29. Discovery reason codes

Discovery should emit structured reason codes such as:

* `discovery_exact_subsequence_repeat`
* `discovery_near_repeat_with_bounded_variation`
* `discovery_distinct_run_support_strong`
* `discovery_boundary_confidence_high`
* `discovery_boundary_confidence_soft`
* `discovery_pattern_too_trivial`
* `discovery_duplicate_pattern_merged`
* `discovery_candidate_emergence_threshold_met`
* `discovery_candidate_emergence_threshold_not_met`

These codes help later explain:

* why something was discovered
* why it was not yet promoted to candidate status
* why it was merged
* why it was held

## 30. Discovery relation to later abstraction

Discovery must stop at the right boundary.

It should provide enough structure to support later abstraction, but should not over-assume abstraction success.

Discovery should answer:

* what repeated subsequence exists
* how stable it is
* how bounded it is
* whether it looks workflow-shaped

Abstraction later answers:

* what is fixed
* what is variable
* what are the slots
* what the reusable skeleton is

Discovery and abstraction must remain distinct.

## 31. Discovery relation to risk

Discovery itself is not the risk engine, but it must produce the evidence needed for risk.

Especially:

* structural coherence
* parameter regularity hints
* boundary clarity
* duplicate proximity
* family collision hints

If discovery is sloppy, risk later becomes guesswork.

So discovery quality is a hidden foundation of safe promotion.

## 32. Discovery relation to user preferences

Discovery should remain mostly user-independent in its core detection logic, but user mode may affect:

* aggressiveness of candidate emergence
* background vs inline mining emphasis
* training mode thresholds
* digest mining behavior

Important law:

User preference may shape **when and how much discovery is surfaced**, but it should not completely redefine what counts as a real repeated subsequence.

Reality comes first.
Surfacing comes later.

## 33. Discovery modes by maturity

The system should support different discovery sensitivity profiles over time.

### Early training mode

* lower emergence thresholds
* more candidate traces preserved
* more patterns considered for feedback
* still bounded by governance

### Mature mode

* stricter emergence thresholds
* higher clutter discipline
* stronger deduplication
* fewer low-value candidate seeds

### Sleep-mode mining

* deeper sequence mining
* more clustering
* calmer output
* delayed surfacing

This matches your idea that the system learns aggressively early, then calms down as trust and understanding improve.

## 34. Discovery failures to avoid

This system must avoid:

* discovering workflows from one-offs
* over-absorbing unrelated adjacent actions
* treating repeated correction behavior as workflow structure
* discovering giant noisy chains instead of real reusable subsequences
* rediscovering the same workflow endlessly
* prematurely collapsing different patterns into one family
* inflating trivial repetitions into candidate spam

These are among the most damaging early-stage `3J` mistakes.

## 35. Discovery non-goals

This spec does not fully define:

* workflow skeleton inference
* scoring math
* risk formulas
* rubric arbitration
* promotion thresholds
* UI behavior
* persistence behavior
* execution behavior

This spec defines how repeated governed behavior becomes candidate-worthy discovery structure.

## 36. Why this spec is holy-grail critical

The capstone quality of `3J` starts here.

If discovery is weak:

* everything downstream gets polluted
* scoring becomes noisy
* risk becomes unstable
* suggestions become annoying
* the library fills with junk
* trust never matures

If discovery is disciplined:

* abstraction starts from real patterns
* scoring has substance
* risk has real foundations
* promotion becomes worthy
* the system can actually learn the user’s workflows instead of hallucinating them

So this spec is not just a preprocessing detail.
It is the first place where `3J` proves whether it deserves to exist.

## 37. Summary

The `3J` workflow discovery system discovers repeated governed subsequences that are:

* bounded
* coherent
* nontrivial
* sufficiently repeated
* candidate-worthy

It must support:

* exact repeated subsequence detection
* bounded near-repeat detection
* boundary-aware discovery
* canonicalization
* duplicate-aware rediscovery
* evidence windows
* candidate emergence thresholds

It must remain grounded in governed history and must stop short of doing abstraction, promotion, or execution.

This is the disciplined pattern-mining front door of `3J`.
