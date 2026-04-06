# 3J Spec 11 — Draft and Library API

## Document identity

**Title:**
Arqon Maestro 3J Draft and Library API

**Stage:**
`3J`

**Spec role:**
Artifact-surface and API contract specification

**Purpose:**
Define the API-ready artifact model and service surfaces that `3J` must provide for:

* workflow candidate drafts
* persistent draft storage
* approved reusable workflow library entries
* review/update/dismiss actions
* organization and sharing hooks
* future UX/UI surfaces in `3K` or later

This spec exists so `3J` can build the necessary backend interfaces now, while leaving the major visual UI/UX build for later.

---

## 1. Mission

`3J` needs draft and library APIs because excellent workflow discovery and promotion are not enough if the resulting artifacts cannot be:

* stored
* reviewed
* updated
* organized
* promoted
* suppressed
* shared later
* surfaced consistently across future UX/UI

The mission of this spec is:

**define the stable artifact and service contracts that let workflow candidates become drafts and later reusable workflow/library objects without requiring the final UI to exist yet.**

This is the backend-facing artifact discipline layer of `3J`.

---

## 2. Core thesis

`3J` should not wait for the full UI/UX to define how workflow artifacts are represented and manipulated.

If the UI comes later, then the APIs and data contracts must come first.

So the core thesis is:

**workflow intelligence should produce stable, inspectable, API-ready artifacts now, so later UX/UI can be excellent rather than improvised.**

This is especially important because you want future support for:

* fine-grained control
* excellent organization tools
* fast editing/updating
* custom storage/organization methods
* sharing with others

That all depends on having the artifact model right.

---

## 3. Constitutional status

This spec is governed by:

* `H3_STAGE3J_SPEC_01_DOCTRINE_AND_PROMOTION_CONSTITUTION.md`
* `H3_STAGE3J_SPEC_02_WORKFLOW_CANDIDATE_MODEL.md`
* `H3_STAGE3J_SPEC_06_PROMOTION_ENGINE.md`
* `H3_STAGE3J_SPEC_10_PREFERENCES_AND_TRUST_POLICY.md`

This API layer governs **creation artifacts**, not execution behavior.

It may support:

* candidate review
* draft creation
* draft storage
* approval flows
* organization flows

It may not:

* imply execution permission
* auto-run workflows
* blur creation and execution
* hide workflow artifacts from user governance

---

## 4. Design requirements

The draft and library API must be:

* versioned
* inspectable
* explainable
* artifact-first
* storage-agnostic
* organization-ready
* sharing-ready later
* compatible with future UI surfaces
* compatible with quiet/suggestion/inbox/digest flows
* class-aware
* review-state-aware

It must avoid:

* hidden artifact mutation
* UI-coupled backend shapes
* execution leakage into draft/library artifacts
* unclear lifecycle transitions
* impossible-to-organize draft blobs
* unstructured sharing later

---

## 5. Core artifact classes

The API must distinguish at least these artifact classes:

1. workflow candidate
2. workflow draft
3. persistent draft
4. approved reusable workflow
5. archived/suppressed artifact
6. shared/exportable workflow descriptor

### 5.1 Workflow candidate

Internal or semi-exposed structured artifact from `3J` discovery/inference/promotion.

Defined primarily by Spec 2.

### 5.2 Workflow draft

A promoted creation artifact derived from a workflow candidate and ready for user review, editing, or storage.

### 5.3 Persistent draft

A saved draft artifact that remains non-executable by default but is durably stored.

### 5.4 Approved reusable workflow

A later promoted artifact intended for explicit invocation under later stages.

Not fully defined here, but must have a placeholder-compatible contract.

### 5.5 Archived/suppressed artifact

An artifact no longer actively surfaced but preserved for lineage, suppression, or future reference.

### 5.6 Shared/exportable workflow descriptor

A future-facing portable representation suitable for sharing with others.

This should be anticipated now, even if not fully enabled in `3J`.

---

## 6. Core service surfaces

The API layer should provide service surfaces for:

* candidate retrieval
* draft creation
* draft retrieval
* draft update/edit
* draft persistence
* approval/rejection actions
* suppression/dismissal actions
* organization metadata updates
* sharing/export preparation
* policy-aware listing/filtering

These are backend/API responsibilities, not UI responsibilities.

---

## 7. Workflow draft object

The `workflow draft` is the most important new artifact in this spec.

It should contain at minimum:

### Identity

* `workflowDraftId`
* `workflowDraftSchemaVersion`
* `workflowDraftCreatedAtMs`
* `workflowDraftLastUpdatedAtMs`

### Provenance

* `sourceWorkflowCandidateId`
* `sourcePromotionDecision`
* `sourcePatternKey`
* `sourceStage`
* `sourceReasonCodes`

### Classification

* `workflowClass`
* `workflowSubtype`
* `workflowRiskClass`
* `workflowComplexityClass`

### Structure

* `workflowTitle`
* `workflowSummary`
* `orderedSteps`
* `fixedStepIndices`
* `variableStepIndices`
* `optionalStepIndices`
* `inferredSlots`
* `suggestedNextStepMetadata` when relevant

### Review state

* `reviewState`
* `createdBy`
* `autoCreated`
* `autoSaved`
* `approvalRequired`
* `userEdited`
* `presentedCount`
* `lastPresentedAtMs`

### Explanation

* `whyDetected`
* `whyUseful`
* `whyLowOrHighRisk`
* `whyPromoted`
* `estimatedTimeSaved`
* `estimatedFrictionReduction`

### Organization

* `tags`
* `folderId`
* `workspaceId`
* `customLabels`
* `favorite`
* `hidden`
* `archived`

### Library relationship

* `eligibleForLibraryPromotion`
* `libraryPromotionState`
* `approvedWorkflowId`

### Sharing preparation

* `shareabilityClass`
* `shareTemplateEligible`
* `containsUserSpecificBindings`

### Lifecycle

* `draftLifecycleState`
* `suppressedUntilMs`
* `invalidated`
* `invalidationReason`

---

## 8. Ordered step object in drafts

Each step in a draft should be explicit and structured.

A step should carry at minimum:

* `stepIndex`
* `semanticAddressId`
* `semanticAddressLabel`
* `commandClass`
* `commandFamily`
* `isFixed`
* `isOptional`
* `slotBindings`
* `stepReasonCodes`

This keeps drafts editable and organization-ready later.

---

## 9. Slot object in drafts

Slots must be first-class because future editing and reuse depend on them.

Each slot should carry:

* `slotId`
* `slotName`
* `slotType`
* `slotRequired`
* `slotDefaultValue`
* `slotObservedExamples`
* `slotInferenceConfidence`
* `slotNormalizationKind`
* `slotEditable`
* `slotReasonCodes`

This is necessary for later:

* editing
* promotion
* storage
* sharing
* templating

---

## 10. Persistent draft object

A persistent draft is a durably stored draft artifact.

It should preserve everything from the workflow draft plus storage-specific surfaces such as:

* `persistentDraftId`
* `storageScope`
* `storageClass`
* `savedAtMs`
* `savedByPolicy`
* `savedByUserAction`
* `storageReasonCodes`
* `dedupFingerprint`
* `organizationVersion`

Persistent draft storage must remain non-executable by default.

---

## 11. Approved reusable workflow placeholder contract

Even though full execution is out of scope, the API should prepare for future approved reusable workflows.

At minimum, an approved reusable workflow placeholder should preserve:

* `approvedWorkflowId`
* `sourceDraftId`
* `approvalTimestampMs`
* `workflowVersion`
* `workflowLibraryState`
* `executionPolicyRequired = true`
* `executableByDefault = false`

This preserves the creation/execution separation cleanly.

---

## 12. Candidate-to-draft transition

The API must support a clean transition from `workflow candidate` to `workflow draft`.

This transition must preserve:

* provenance
* promotion decision
* explanation surfaces
* structure and slots
* trust/risk rationale
* reviewability

No draft should appear as if it came from nowhere.

---

## 13. Draft lifecycle states

A workflow draft should support explicit lifecycle states such as:

* `created`
* `queued_for_review`
* `presented`
* `edited`
* `accepted`
* `dismissed`
* `suppressed`
* `persisted`
* `archived`
* `invalidated`
* `promoted_to_library_candidate`

This is necessary for organization and later UX coherence.

---

## 14. Required API operations

At minimum, the API layer should conceptually support the following operations.

### Candidate operations

* `listWorkflowCandidates`
* `getWorkflowCandidate`
* `suppressWorkflowCandidate`
* `archiveWorkflowCandidate`
* `mergeWorkflowCandidates`

### Draft operations

* `createWorkflowDraftFromCandidate`
* `getWorkflowDraft`
* `listWorkflowDrafts`
* `updateWorkflowDraft`
* `persistWorkflowDraft`
* `archiveWorkflowDraft`
* `dismissWorkflowDraft`
* `suppressWorkflowDraft`

### Promotion/review operations

* `approveWorkflowDraft`
* `rejectWorkflowDraft`
* `markNeverSuggestAgain`
* `markClassPreferenceAdjustment`
* `recordDraftEditOutcome`

### Organization operations

* `assignWorkflowTags`
* `moveWorkflowDraftToFolder`
* `setWorkflowFavorite`
* `setWorkflowCustomLabels`
* `archiveWorkflowGroup`

### Sharing/export preparation operations

* `prepareWorkflowShareDescriptor`
* `cloneWorkflowAsTemplate`
* `stripUserSpecificBindingsForShare`

These names are conceptual, but the capabilities should exist.

---

## 15. Review action semantics

The API must support explicit review outcomes.

Examples:

* accepted
* dismissed
* ignored
* edited
* never-suggest-again
* save-as-draft
* promote-to-library-candidate

These actions are not just UI actions.
They are learning signals for trust, clutter control, and future promotion behavior.

---

## 16. Organization surfaces

You explicitly want fine-grained control, organization, and custom storage methods later.

So the API must already support:

* tags
* folders/collections
* custom labels
* favorites/pins
* archived groups
* class-based filtering
* risk-based filtering
* trust-based filtering
* source-based filtering
* draft-vs-approved separation

This should be built into the data model now, even if the UI comes later.

---

## 17. Custom storage and organization readiness

The system should be designed so that future storage backends or custom storage methods can preserve the same canonical artifact shape.

That means the API must be:

* storage-agnostic
* identity-stable
* exportable
* portable across organization layers

This is important because you already anticipate sophisticated storage and organization behavior.

---

## 18. Sharing readiness

You mentioned sharing workflows/macros with others.

That means the API must prepare for the fact that some workflows may be:

* highly user-specific
* partially templatable
* safely shareable after parameter stripping
* not shareable due to bindings or privacy

So artifacts should preserve fields like:

* `containsUserSpecificBindings`
* `shareTemplateEligible`
* `shareabilityClass`

This does not fully implement sharing, but it prevents later architectural regret.

---

## 19. API relation to preferences and trust

The API must preserve enough metadata so later systems can understand:

* why a draft was auto-created
* why it was not auto-saved
* which policy allowed it
* what trust state supported the promotion
* whether the user later approved or rejected it

That means creation policy provenance must not be lost.

---

## 20. API relation to timing/surfacing

The API must also support surfacing history and suppression state.

Examples:

* when a draft or candidate was shown
* in which channel it was shown
* whether it was held for digest
* when it was last suppressed
* when it is allowed to resurface again

This matters because timing discipline is part of trust.

---

## 21. Explainability requirements

Every draft and later library-adjacent artifact must remain explainable.

The API must preserve fields that support answers like:

* why was this created
* why was it auto-created
* why was it suggested now
* why is it low risk
* why is it in this class
* why was this slot inferred
* why is this candidate shareable or not

Without that, later UX/UI will feel untrustworthy.

---

## 22. Non-goals of this spec

This spec does not fully define:

* the final UX/UI layout
* execution semantics
* workflow replay behavior
* storage backend implementation details
* collaboration protocol details
* permissioning for shared workflows

It defines the artifact and API contracts that make those later things possible.

---

## 23. Failure modes this spec is designed to prevent

This spec exists to prevent:

* drafts with weak provenance
* uneditable workflow artifacts
* API/UI drift later
* storage blobs with no organization model
* impossible future sharing because fields were never modeled
* auto-created drafts with no traceable rationale
* hidden transition from candidate to persistent artifact
* creation/execution confusion in artifact types

---

## 24. Why this spec is holy-grail critical

If `3J` is the capstone, then the artifact layer must be worthy of the intelligence behind it.

That means the drafts and library-facing objects must be:

* structured
* editable
* inspectable
* portable
* organization-ready
* share-ready later
* richly explainable

Otherwise the system may discover great workflows but still feel amateurish and brittle.

This spec is what lets future `3K` UI/UX become elegant instead of compensating for weak backend artifact design.

---

## 25. Summary

The `3J` Draft and Library API defines the backend artifact and operation surfaces needed to turn workflow candidates into durable, reviewable, organization-ready workflow drafts and later library objects.

It defines:

* workflow draft structure
* persistent draft structure
* approved workflow placeholder surfaces
* lifecycle states
* review operations
* organization operations
* sharing-readiness fields
* provenance and explainability preservation

This spec ensures that `3J` builds the right interfaces now so later UI/UX can be powerful, calm, and well organized.
