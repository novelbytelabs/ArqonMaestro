# Workflow Candidate Model

## filename

`docs/h3/H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`

## Document identity

**Title:**
Arqon Maestro 3J Workflow Candidate Model

**Stage:**
`3J`

**Spec role:**
Core data-model specification

**Purpose:**
Define the canonical structure of a workflow candidate in `3J`, including identity, provenance, observed sequence structure, abstraction fields, scoring surfaces, promotion state, review state, and storage lifecycle.

This spec defines the object model that all later `3J` logic must use.

---

## 1. Mission

A workflow candidate is the canonical artifact by which `3J` represents a discovered reusable pattern in user behavior.

It exists before execution.
It exists before approval.
It exists before persistent library membership.

A workflow candidate is the formal container for:

* discovered evidence
* inferred structure
* bounded abstraction
* scores
* risk
* rubric outcomes
* promotion decisions
* user review state
* future workflow draft promotion

Without a precise workflow candidate model, `3J` cannot remain coherent, explainable, or safe.

---

## 2. Core thesis

A workflow candidate is not:

* a raw event stream
* a finished macro
* an executable workflow
* a suggestion string
* a UI card only

A workflow candidate is a **structured, inspectable, versioned intermediate artifact** that connects:

* observed governed sequences
* inferred workflow structure
* scoring and risk judgment
* promotion decisions
* future draft/library persistence

This artifact is the backbone of `3J`.

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`

This model must preserve the constitutional separation between:

* creation
* promotion
* persistence
* execution

A workflow candidate may support later draft creation and approval, but it must never imply execution authority.

---

## 4. Design requirements

The workflow candidate model must be:

* inspectable
* explainable
* versioned
* promotable
* reviewable
* extensible
* non-executable by default
* precise enough for API/UI use later
* structured enough for scoring/risk/rubric logic
* stable enough to survive future stage growth without becoming ambiguous

---

## 5. Candidate lifecycle role

The workflow candidate is the artifact that moves through the early `3J` lifecycle:

1. discovered
2. normalized
3. abstracted
4. scored
5. risk-evaluated
6. rubric-evaluated
7. promotion-decided
8. optionally surfaced
9. optionally drafted
10. optionally persisted as draft artifact
11. optionally later promoted into an approved reusable workflow

The workflow candidate remains the truth-bearing intermediary until a later artifact supersedes it by explicit policy.

---

## 6. Candidate object classes

The system should distinguish at least these conceptual layers:

### 6.1 Observation sequence

Raw governed evidence of repeated semantic-address behavior.

This is not yet a workflow candidate.

### 6.2 Workflow candidate

The structured pattern hypothesis.
This spec defines this object.

### 6.3 Workflow draft

A promoted artifact derived from a workflow candidate and ready for user review or library persistence.

Not defined in full here.

### 6.4 Approved reusable workflow

A later persistent, approved artifact suitable for explicit invocation under later stages.

Not defined in full here.

---

## 7. Canonical workflow candidate schema

A workflow candidate should contain these major sections:

1. identity
2. provenance
3. classification
4. observation basis
5. structural model
6. abstraction model
7. scoring surfaces
8. risk surfaces
9. rubric evaluation surfaces
10. promotion surfaces
11. review surfaces
12. persistence surfaces
13. explainability surfaces
14. status / lifecycle metadata

---

## 8. Identity block

Every workflow candidate must have a stable identity block.

### Required fields

* `workflowCandidateId`
* `workflowCandidateSchemaVersion`
* `workflowCandidateModelVersion`
* `workflowCandidatePatternKey`
* `workflowCandidateDiscoverySessionId`
* `workflowCandidateCreatedAtMs`
* `workflowCandidateLastUpdatedAtMs`

### Field meanings

#### `workflowCandidateId`

Globally unique id for the candidate artifact.

#### `workflowCandidateSchemaVersion`

Version of the candidate object schema.

#### `workflowCandidateModelVersion`

Version of the discovery/abstraction model that produced the candidate.

#### `workflowCandidatePatternKey`

Canonical semantic fingerprint of the discovered pattern.

Used for:

* deduplication
* near-duplicate comparison
* rediscovery merging
* candidate family grouping

#### `workflowCandidateDiscoverySessionId`

Session identity for the discovery context.

#### `workflowCandidateCreatedAtMs`

Creation timestamp.

#### `workflowCandidateLastUpdatedAtMs`

Last mutation timestamp.

---

## 9. Provenance block

Every candidate must preserve why it exists.

### Required fields

* `workflowCandidateSource`
* `workflowCandidateSourceStage`
* `workflowCandidateObservedFromGovernedHistory`
* `workflowCandidateEvidenceWindowStartMs`
* `workflowCandidateEvidenceWindowEndMs`
* `workflowCandidateObservedSequenceIds`
* `workflowCandidateObservedChunkIds`
* `workflowCandidateObservedEventCount`
* `workflowCandidateObservedGovernedCount`

### Field meanings

#### `workflowCandidateSource`

Origin source, such as:

* `repeated_sequence_discovery`
* `workflow_reuse_substrate`
* `sleep_mode_digest_mining`

#### `workflowCandidateSourceStage`

Expected initial value:

* `3J`

#### `workflowCandidateObservedFromGovernedHistory`

Boolean.
Must be true if derived from governed observations only.

#### `workflowCandidateEvidenceWindowStartMs`

Start of the evidence window.

#### `workflowCandidateEvidenceWindowEndMs`

End of the evidence window.

#### `workflowCandidateObservedSequenceIds`

Ids for the sequences from which the candidate was inferred.

#### `workflowCandidateObservedChunkIds`

Optional chunk/event lineage for detailed tracing.

#### `workflowCandidateObservedEventCount`

Total relevant observed events.

#### `workflowCandidateObservedGovernedCount`

Total governed events supporting the candidate.

---

## 10. Classification block

A candidate must be classifiable.

### Required fields

* `workflowCandidateClass`
* `workflowCandidateSubtype`
* `workflowCandidateDomain`
* `workflowCandidateRiskClass`
* `workflowCandidateComplexityClass`
* `workflowCandidateParameterizationClass`

### Expected examples

#### `workflowCandidateClass`

Examples:

* `editor`
* `browser`
* `navigation`
* `shell`
* `cross_app`
* `mixed_surface`

#### `workflowCandidateSubtype`

Examples:

* `test_run_sequence`
* `project_open_sequence`
* `browser_lookup_sequence`

#### `workflowCandidateDomain`

Human-meaningful domain bucket.

#### `workflowCandidateRiskClass`

Examples:

* `low`
* `moderate`
* `high`
* `privileged_review_only`

#### `workflowCandidateComplexityClass`

Examples:

* `fixed_short`
* `fixed_multi_step`
* `parameterized`
* `branching`

#### `workflowCandidateParameterizationClass`

Examples:

* `fixed`
* `lightly_parameterized`
* `slot_heavy`

---

## 11. Observation basis block

This section describes what was actually observed.

### Required fields

* `workflowCandidateOccurrenceCount`
* `workflowCandidateDistinctRunCount`
* `workflowCandidateSequenceLengthObservedMin`
* `workflowCandidateSequenceLengthObservedMax`
* `workflowCandidateSequenceLengthObservedAvg`
* `workflowCandidateStepSemanticAddressIdsObserved`
* `workflowCandidateTransitionKeysObserved`
* `workflowCandidateRepeatedSubsequenceDetected`
* `workflowCandidateKnownNextStepDetected`

### Field meanings

#### `workflowCandidateOccurrenceCount`

How many total times the candidate pattern was seen.

#### `workflowCandidateDistinctRunCount`

How many distinct run instances contributed.

#### `workflowCandidateSequenceLengthObservedMin/Max/Avg`

Observed sequence length distribution.

#### `workflowCandidateStepSemanticAddressIdsObserved`

Observed semantic-address ids participating in the pattern.

#### `workflowCandidateTransitionKeysObserved`

Observed transition keys across the pattern.

#### `workflowCandidateRepeatedSubsequenceDetected`

Boolean indicating repeated subsequence evidence.

#### `workflowCandidateKnownNextStepDetected`

Boolean indicating that a repeated sequence is frequently followed by a stable next step.

---

## 12. Structural model block

This defines the discovered workflow shape before higher abstraction.

### Required fields

* `workflowCandidateOrderedSteps`
* `workflowCandidateStartBoundaryConfidence`
* `workflowCandidateEndBoundaryConfidence`
* `workflowCandidateBoundaryReasonCodes`
* `workflowCandidateBranchingDetected`
* `workflowCandidateOptionalStepsDetected`
* `workflowCandidateCanonicalStepCount`

### `workflowCandidateOrderedSteps`

This should be an ordered array of step objects.

Each step should contain fields like:

* `stepIndex`
* `semanticAddressId`
* `semanticAddressLabel`
* `commandFamily`
* `commandClass`
* `observedCount`
* `positionStability`
* `isFixed`
* `isOptional`
* `variableSlotsPresent`
* `slotNames`
* `reasonCodes`

### Structural purpose

This block should answer:

* what are the steps
* what order do they appear in
* how stable is that order
* where are the edges
* is there branching
* are there optional positions

---

## 13. Abstraction model block

This is where the candidate stops being raw pattern and becomes reusable structure.

### Required fields

* `workflowCandidateAbstractionEligible`
* `workflowCandidateAbstractionVersion`
* `workflowCandidateFixedStepIndices`
* `workflowCandidateVariableStepIndices`
* `workflowCandidateOptionalStepIndices`
* `workflowCandidateInferredSlots`
* `workflowCandidateGeneralizationConfidence`
* `workflowCandidateAbstractionRisk`
* `workflowCandidateAbstractionReasonCodes`

### `workflowCandidateInferredSlots`

Each inferred slot should carry:

* `slotId`
* `slotName`
* `slotType`
* `slotSourceStepIndex`
* `slotRequired`
* `slotInferenceConfidence`
* `slotObservedValueCount`
* `slotNormalizationKind`
* `slotReasonCodes`

Examples of slot types:

* `file_path`
* `project_name`
* `url`
* `query_text`
* `surface_name`
* `task_name`

### Abstraction purpose

This block answers:

* what is fixed
* what varies
* can the pattern become reusable
* how risky is the generalization

---

## 14. Scoring block

This spec does not fully define the scoring model, but the candidate must hold its score surfaces.

### Required fields

* `workflowCandidateConfidenceScore`
* `workflowCandidateUtilityScore`
* `workflowCandidateCreationRiskScore`
* `workflowCandidateSuggestionPressureScore`
* `workflowCandidateTrustScore`
* `workflowCandidateNoveltyScore`
* `workflowCandidateDuplicateRiskScore`
* `workflowCandidateScoreVersion`

### Purpose

This block makes the candidate promotable.

These scores must always be explicitly attached to the candidate so downstream promotion is explainable.

---

## 15. Risk block

This spec does not fully define the risk engine, but the candidate must hold the decomposed risk surfaces.

### Required fields

* `workflowCandidateStructuralStabilityRisk`
* `workflowCandidateParameterVolatilityRisk`
* `workflowCandidateBoundaryClarityRisk`
* `workflowCandidateAbstractionRiskComponent`
* `workflowCandidateLatentExecutionHazardRisk`
* `workflowCandidateClutterRisk`
* `workflowCandidateUserMisalignmentRisk`
* `workflowCandidateCreationRiskBand`
* `workflowCandidateRiskReasonCodes`

### Risk bands

Examples:

* `very_low`
* `low`
* `moderate`
* `high`
* `very_high`

### Purpose

This block ensures risk is inspectable and not hidden inside one opaque score.

---

## 16. Rubric evaluation block

A candidate must record how rubric logic evaluated it.

### Required fields

* `workflowCandidateBaselineRubricPassed`
* `workflowCandidateClassRubricPassed`
* `workflowCandidateUserRubricPassed`
* `workflowCandidateTimingRubricPassed`
* `workflowCandidateRubricVetoApplied`
* `workflowCandidateRubricReasonCodes`

### Purpose

This allows the system to explain:

* why a seemingly good candidate was held
* why a low-risk candidate was still not auto-created
* why timing suppressed promotion
* why class-specific caution overrode baseline quality

---

## 17. Promotion block

This is the core decision surface.

### Required fields

* `workflowCandidatePromotionDecision`
* `workflowCandidatePromotionEligible`
* `workflowCandidatePromotionDecisionVersion`
* `workflowCandidatePromotionReasonCodes`
* `workflowCandidatePromotionConfidence`
* `workflowCandidateAutoCreateEligible`
* `workflowCandidateAutoSaveEligible`

### Allowed values for `workflowCandidatePromotionDecision`

* `observe_only`
* `hold_for_more_evidence`
* `suggest_in_inbox`
* `suggest_inline`
* `auto_create_draft`
* `auto_save_draft`

No execution-related state belongs here.

---

## 18. Review block

A candidate must carry user-facing review and feedback state.

### Required fields

* `workflowCandidateReviewState`
* `workflowCandidatePresentedCount`
* `workflowCandidateDismissedCount`
* `workflowCandidateAcceptedCount`
* `workflowCandidateEditedCount`
* `workflowCandidateIgnoredCount`
* `workflowCandidateLastPresentedAtMs`
* `workflowCandidateSuppressedUntilMs`
* `workflowCandidateNeverSuggestAgain`

### Allowed review states

Examples:

* `unseen`
* `queued`
* `presented`
* `accepted`
* `dismissed`
* `edited`
* `suppressed`
* `archived`

### Purpose

This block is necessary to avoid spam, duplicates, and rediscovery noise.

---

## 19. Persistence block

A candidate may later be draft-persisted, but this must be explicit.

### Required fields

* `workflowCandidateDraftCreated`
* `workflowCandidateDraftId`
* `workflowCandidateDraftPersisted`
* `workflowCandidatePersistencePolicySource`
* `workflowCandidatePersistenceReasonCodes`

### Purpose

This preserves the distinction between:

* candidate
* draft
* persisted draft
* later approved reusable workflow

---

## 20. Explainability block

A candidate must always be explainable.

### Required fields

* `workflowCandidateSuggestedTitle`
* `workflowCandidateHumanSummary`
* `workflowCandidateWhyDetected`
* `workflowCandidateWhyNow`
* `workflowCandidateWhyLowOrHighRisk`
* `workflowCandidateWhyPromoted`
* `workflowCandidateEstimatedTimeSaved`
* `workflowCandidateEstimatedFrictionReduction`

### Purpose

This is what makes a future inbox, digest, or API response feel intelligent and trustworthy.

---

## 21. Lifecycle block

A candidate must have explicit lifecycle state.

### Required fields

* `workflowCandidateLifecycleState`
* `workflowCandidateArchived`
* `workflowCandidateSupersededByCandidateId`
* `workflowCandidateMergedIntoCandidateId`
* `workflowCandidateInvalidated`
* `workflowCandidateInvalidationReason`

### Allowed lifecycle states

Examples:

* `active`
* `held`
* `queued`
* `drafted`
* `persisted_as_draft`
* `archived`
* `invalidated`
* `superseded`
* `merged`

### Purpose

This avoids candidate clutter and prevents stale artifacts from lingering ambiguously.

---

## 22. Minimal canonical JSON-like shape

A workflow candidate should conceptually look like:

```text
{
  identity: {...},
  provenance: {...},
  classification: {...},
  observationBasis: {...},
  structuralModel: {...},
  abstractionModel: {...},
  scoring: {...},
  risk: {...},
  rubricEvaluation: {...},
  promotion: {...},
  review: {...},
  persistence: {...},
  explainability: {...},
  lifecycle: {...}
}
```

That block layout should remain stable.

---

## 23. Required invariants

The workflow candidate model must obey these invariants:

### 23.1 No execution authority

No field may imply execution authorization.

### 23.2 Governed provenance

A candidate must never claim governed origin without evidence.

### 23.3 Promotion must be explicit

A candidate must never be “implicitly” promoted.
Promotion state must be recorded.

### 23.4 Risk must be inspectable

A candidate must never hide risk in an opaque black box.

### 23.5 Reviewability must be preserved

Auto-created drafts must remain traceable to the originating candidate.

### 23.6 No silent duplication

If a candidate is merged, superseded, or suppressed, that must be explicit.

### 23.7 Explainability is mandatory

A candidate must be able to explain:

* what it is
* why it exists
* why it was promoted or held

---

## 24. Deduplication and merging rules

The candidate model must support deduplication.

### Required semantics

* candidates with the same `workflowCandidatePatternKey` may be merged
* near-duplicates may be marked related but not automatically merged
* merged/superseded lineage must remain explicit
* prior review outcomes must be preserved during merges

This is critical for avoiding workflow suggestion spam.

---

## 25. Relationship to future API/UI surfaces

This model is intentionally API-ready.

Later surfaces such as:

* workflow inbox
* workflow draft editor
* workflow library
* suggestion digest
* sharing surfaces
* organization tools
* preference settings

should be able to consume this object model without requiring ad hoc hidden reconstruction.

That is why this spec must be rich now.

---

## 26. Non-goals of this spec

This spec does not fully define:

* the scoring formulas
* the risk formulas
* the rubric weighting system
* the promotion decision thresholds
* the workflow discovery algorithm
* the workflow execution model
* the final UI

Those belong to later specs.

This spec defines the artifact that those systems operate on.

---

## 27. Why this model is holy-grail critical

`3J` will only feel like the holy grail if its workflow artifacts are:

* coherent
* trustworthy
* non-duplicative
* explainable
* stable
* editable
* organization-ready
* shareable later
* promotion-aware
* risk-aware

That all starts here.

If the workflow candidate object is weak, everything later becomes messy:

* bad drafts
* unclear suggestions
* duplicate clutter
* weak explainability
* broken trust
* UI/API drift

So this spec is not just technical structure.
It is the skeleton of the capstone.

---

## 28. Summary

A workflow candidate is the canonical `3J` artifact representing a discovered reusable behavior pattern before execution and before final approval.

It must preserve:

* identity
* provenance
* structure
* abstraction
* scores
* risk
* rubric results
* promotion state
* review state
* persistence lineage
* explainability
* lifecycle control

It is the central object through which `3J` becomes lawful, intelligent, and worthy of trust.
