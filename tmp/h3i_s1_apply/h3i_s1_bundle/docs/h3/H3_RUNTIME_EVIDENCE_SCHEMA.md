# H3 Runtime Evidence Schema

## Stage 3G — Counterfactual + Repair Intelligence

Stage 3G-S1 established the observational contract for nearest-alternative, ambiguity-band, and repair-signal evidence.

Stage 3G-S1.5 adds RSI/Lazarus observability hardening fields in 3g_counterfactual_repair_v1:
- counterfactualRepairSelectionFunctionVersion
- counterfactualRepairCandidatePopulationSize
- counterfactualRepairTopCandidateSemanticAddressIds
- counterfactualRepairTopCandidateNormalizedScores
- counterfactualRepairSelectionWinnerSemanticAddressId
- counterfactualRepairDeadDetected
- counterfactualRepairDeadReason
- counterfactualRepairCounterexampleCaptured
- counterfactualRepairCounterexampleKind
- counterfactualRepairAntibodyEligible
- counterfactualRepairAntibodyHint
- counterfactualRepairStressEvent
- counterfactualRepairStressBand
- counterfactualRepairOuroborosEvent

Stage 3G-S2 adds bounded nearest-alternative ambiguity pilot fields in 3g_nearest_alternative_ambiguity_v1:
- counterfactualRepairAmbiguityPilotVersion
- counterfactualRepairAmbiguityPilotApplied
- counterfactualRepairAmbiguityPrimaryScore
- counterfactualRepairAmbiguityAlternativeScore
- counterfactualRepairAmbiguityScoreGap
- counterfactualRepairAmbiguityEscalationSuggested
- counterfactualRepairAmbiguityEscalationKind
- counterfactualRepairAmbiguityReasonCodes

Stage 3G-S3 adds bounded repair-signal pilot fields in 3g_repair_signal_pilot_v1:
- counterfactualRepairSignalPilotVersion
- counterfactualRepairSignalPilotApplied
- counterfactualRepairSignalTrajectoryState
- counterfactualRepairSignalAbortedTrajectoryDetected
- counterfactualRepairSignalDirectionReversalDetected
- counterfactualRepairSignalSelfCorrectionDetected
- counterfactualRepairSignalRepairWindowOpen
- counterfactualRepairSignalEscalationSuggested
- counterfactualRepairSignalEscalationKind
- counterfactualRepairSignalReasonCodes

Stage 3G-S4 Counterfactual Ranking Guardrail Fields:
- counterfactualRepairRankingPilotVersion
- counterfactualRepairRankingPilotApplied
- counterfactualRepairRankingPrimaryScore
- counterfactualRepairRankingAlternativeScore
- counterfactualRepairRankingScoreGap
- counterfactualRepairRankingStressAdjusted
- counterfactualRepairRankingRepairAdjusted
- counterfactualRepairRankingGuardrailSuggested
- counterfactualRepairRankingGuardrailKind
- counterfactualRepairRankingReasonCodes

Stage 3G-S5 counterexample / antibody pilot:
- counterfactualRepairCounterexampleFormatVersion
- counterfactualRepairAntibodyPilotVersion
- counterfactualRepairAntibodyPilotApplied
- counterfactualRepairCounterexampleEventClass
- counterfactualRepairCounterexampleSignature
- counterfactualRepairCounterexampleTranscriptDigest
- counterfactualRepairAntibodyMintSuggested
- counterfactualRepairAntibodyMintKey
- counterfactualRepairAntibodyQuarantineSuggested
- counterfactualRepairAntibodyQuarantineBand
- counterfactualRepairAntibodyValidationGateHint
- counterfactualRepairAntibodyPilotReasonCodes

Notes:
- bounded advisory pilot only
- no persistence / registry minting yet
- no antibody gate activation yet
- internal surfaces remain type-directed / protobuf-aligned; JSON remains human-facing only

## Stage 3H-S1 dynamic precision observational contract
- dynamicPrecisionSchemaVersion
- dynamicPrecisionPolicyVersion
- dynamicPrecisionEligible
- dynamicPrecisionObservedFamily
- dynamicPrecisionBaselineRegime
- dynamicPrecisionSuggestedRegime
- dynamicPrecisionEscalationEligible
- dynamicPrecisionObservedAmbiguityBand
- dynamicPrecisionObservedRepairWindowOpen
- dynamicPrecisionObservedStressBand
- dynamicPrecisionSource
- dynamicPrecisionReasonCodes

Notes:
- observational contract only
- no live Turbo/Tight/Ultra switching yet
- internal surfaces remain type-directed / protobuf-aligned; JSON remains human-facing only

## Stage 3H-S2 bounded escalation trigger pilot
- dynamicPrecisionEscalationPilotVersion
- dynamicPrecisionCurrentRegime
- dynamicPrecisionProposedRegime
- dynamicPrecisionEscalationSuggested
- dynamicPrecisionObservedGuardrailSuggested
- dynamicPrecisionObservedGuardrailKind
- dynamicPrecisionFamilyPolicyId
- dynamicPrecisionHysteresisState
- dynamicPrecisionTransitionAllowed

Notes:
- bounded advisory pilot only
- ambiguity / repair / guardrail signals may suggest escalation
- dynamicPrecisionTransitionAllowed remains false in this slice
- no live Turbo/Tight/Ultra actuation yet
- no authority change, no H23/H24 bypass, no Stage 3A drift
- internal surfaces remain type-directed / protobuf-aligned; JSON remains human-facing only

## Stage 3H-S3 family-aware regime switching
- dynamicPrecisionFamilySwitchingVersion
- dynamicPrecisionTransitionDecision
- dynamicPrecisionActiveRegime
- dynamicPrecisionSwitchApplied
- dynamicPrecisionStrategyProfileId

Notes:
- bounded upward family-aware switching only
- structured families may switch turbo -> tight
- numeric families may switch tight -> ultra
- open-tail families remain at their governed active regime in this slice
- de-escalation is deferred until Stage 3H-S4
- no authority change, no H23/H24 bypass, no Stage 3A drift
- no persistence / distributed cache; active regime is runtime-local only in this slice
- internal surfaces remain type-directed / protobuf-aligned; JSON remains human-facing only

## Stage 3H-S4 hysteresis / de-escalation
- dynamicPrecisionHysteresisVersion
- dynamicPrecisionDeescalationEligible
- dynamicPrecisionDeescalationSuggested
- dynamicPrecisionStabilityTickCount
- dynamicPrecisionCooldownTicksRemaining

Notes:
- bounded hysteresis / de-escalation only
- structured and numeric families may de-escalate only after steady recovery evidence, cooldown exhaustion, and bounded stability threshold satisfaction
- open-tail families remain pinned to governed ultra in this slice
- no authority change, no H23/H24 bypass, no Stage 3A drift
- no persistence / distributed cache; hysteresis state is runtime-local only in this slice
- internal surfaces remain type-directed / protobuf-aligned; JSON remains human-facing only

## Stage 3H schema freeze at closure

Authoritative closure baseline:
- branch: feature/h3
- commit: cc385b1

Schema freeze statement:
- Stage 3H closes with the fields listed above
- Stage 3H-S5 introduces no additional runtime evidence fields
- future Dynamic Precision schema expansion must open under a new stage or a new bounded post-closure slice


## Stage 3I-S1 workflow memory observational contract
- workflowMemorySchemaVersion
- workflowMemoryPolicyVersion
- workflowMemoryEligible
- workflowMemoryCurrentSemanticAddressId
- workflowMemoryPreviousSemanticAddressId
- workflowMemoryTransitionObserved
- workflowMemoryTransitionKey
- workflowMemoryTransitionSeenBefore
- workflowMemoryTransitionCount
- workflowMemorySequenceLength
- workflowMemoryRepeatDetected
- workflowMemoryRepeatCount
- workflowMemoryContinuationSuggested
- workflowMemoryGovernedStateUpdated
- workflowMemorySource
- workflowMemoryReasonCodes

Notes:
- session-local observational contract only
- state advances only from governed semantic-address observations
- no persistence / distributed cache
- no ranking actuation yet
- no macro execution
- internal surfaces remain type-directed / protobuf-aligned; JSON remains human-facing only
