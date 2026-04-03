# H3 Runtime Evidence Schema

## Stage 3G — Counterfactual + Repair Intelligence

Stage 3G-S1 established the observational contract for nearest-alternative, ambiguity-band, and repair-signal evidence.

Stage 3G-S1.5 adds RSI/Lazarus observability hardening fields in `3g_counterfactual_repair_v1`:
- `counterfactualRepairSelectionFunctionVersion`
- `counterfactualRepairCandidatePopulationSize`
- `counterfactualRepairTopCandidateSemanticAddressIds`
- `counterfactualRepairTopCandidateNormalizedScores`
- `counterfactualRepairSelectionWinnerSemanticAddressId`
- `counterfactualRepairDeadDetected`
- `counterfactualRepairDeadReason`
- `counterfactualRepairCounterexampleCaptured`
- `counterfactualRepairCounterexampleKind`
- `counterfactualRepairAntibodyEligible`
- `counterfactualRepairAntibodyHint`
- `counterfactualRepairStressEvent`
- `counterfactualRepairStressBand`
- `counterfactualRepairOuroborosEvent`

Stage 3G-S2 adds bounded nearest-alternative ambiguity pilot fields in `3g_nearest_alternative_ambiguity_v1`:
- `counterfactualRepairAmbiguityPilotVersion`
- `counterfactualRepairAmbiguityPilotApplied`
- `counterfactualRepairAmbiguityPrimaryScore`
- `counterfactualRepairAmbiguityAlternativeScore`
- `counterfactualRepairAmbiguityScoreGap`
- `counterfactualRepairAmbiguityEscalationSuggested`
- `counterfactualRepairAmbiguityEscalationKind`
- `counterfactualRepairAmbiguityReasonCodes`

Meaning:
- nearest-alternative is surfaced as a bounded observational candidate population with normalized scores
- a deterministic observational Selection Function contract picks the current winner
- Lazarus DEAD-style trajectory restart/reversal can be surfaced in evidence
- recognition-failure / rejection paths may emit counterexample-capture and antibody-placeholder metadata
- the ambiguity pilot observes when the top-2 nearest alternatives are close enough to justify advisory escalation
- `hold_for_tail` vs `request_disambiguation` remains advisory-only in this slice
- Stage 3G-S2 remains advisory-only and may not alter lookup authority, governance, or execution rights
