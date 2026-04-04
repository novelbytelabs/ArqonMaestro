import fs from "fs";
import path from "path";

export interface H3RuntimeEvidenceEvent {
  event: string;
  chunkId: string;
  timestampMs: number;
  source: string | null;
  regionId: string | null;
  commandClass: string | null;
  hadTranscriptText: boolean | null;
  transcriptText: string | null;
  routeBefore: string | null;
  routeAfter: string | null;
  tailStartMs: number | null;
  tailEndMs: number | null;
  tailText: string | null;
  mergedText: string | null;
  stepCount: number | null;
  finalGranted: boolean | null;
  reason: string | null;
  parameterType: string | null;
  numericRaw: string | null;
  numericNormalized: string | null;
  numericParseConfidence: number | null;
  numericStrategyVersion: string | null;
  openRaw: string | null;
  openNormalized: string | null;
  openParseConfidence: number | null;
  openStrategyVersion: string | null;
  openTargetKind: string | null;
  semanticAddressId: string | null;
  canonicalMergedText: string | null;
  slotSignature: string | null;
  atlasVersion: string | null;
  lookupCandidateCount: number | null;
  bestCandidateId: string | null;
  bestCandidateScore: number | null;
  warmHitClass: string | null;
  governanceRequired: boolean | null;
  governanceQualified: boolean | null;
  h23StepCount: number | null;
  h24FinalGranted: boolean | null;
  successCount: number | null;
  warmApplied: boolean | null;
  warmAppliedStage: string | null;
  confidencePolicyVersion: string | null;
  weakThreshold: number | null;
  strongThreshold: number | null;
  candidateAgeMs: number | null;
  recentConflictPenaltyApplied: boolean | null;
  staleProtectionApplied: boolean | null;
  focusRankingApplied: boolean | null;
  focusRankingBoost: number | null;
  focusRankingReasonCodes: string[] | null;
  focusLegalityApplied: boolean | null;
  focusLegalityLawful: boolean | null;
  focusLegalityPenaltyApplied: boolean | null;
  focusLegalityPenalty: number | null;
  focusLegalityReasonCodes: string[] | null;
  focusLegalityCommandKind: string | null;
  focusTaskMomentumApplied: boolean | null;
  focusTaskMomentumBoost: number | null;
  focusTaskMomentumPenaltyApplied: boolean | null;
  focusTaskMomentumPenalty: number | null;
  focusTaskMomentumReasonCodes: string[] | null;
  focusTaskMomentumMatchedSemanticAddressId: string | null;
  warmDiscardReason: string | null;
  liveEvidenceOverride: boolean | null;
  lookupPath: string | null;
  focusContextSchemaVersion: string | null;
  focusContextEligible: boolean | null;
  focusSnapshotFresh: boolean | null;
  focusAuthorityType: string | null;
  focusAppId: string | null;
  focusWindowId: string | null;
  focusRegionId: string | null;
  focusSubregionId: string | null;
  focusControlId: string | null;
  focusHasSelection: boolean | null;
  focusSelectionTextLength: number | null;
  focusCaretOffset: number | null;
  focusSnapshotAgeMs: number | null;
  focusConfidence: number | null;
  focusRecentDeltaCount: number | null;
  focusRecentTaskHistoryCount: number | null;
  focusDeicticResolutionEligible: boolean | null;
  focusRankingEligible: boolean | null;
  focusLegalityEligible: boolean | null;
  focusReasonCodes: string[] | null;
  atlasShardPolicyVersion: string | null;
  atlasShardHintId: string | null;
  atlasShardHintEligible: boolean | null;
  atlasShardHintSource: string | null;
  atlasShardHintPriority: number | null;
  atlasShardReasonCodes: string[] | null;
  atlasShardRankingApplied: boolean | null;
  atlasShardRankingBoost: number | null;
  atlasShardRankingReasonCodes: string[] | null;
  atlasShardRankingCandidateKind: string | null;
  atlasShardNarrowingApplied: boolean | null;
  atlasShardNarrowingFallbackUsed: boolean | null;
  atlasShardNarrowingCandidateCountBefore: number | null;
  atlasShardNarrowingCandidateCountAfter: number | null;
  atlasShardNarrowingReasonCodes: string[] | null;
  atlasShardNarrowingAllowedCandidateKinds: string[] | null;
  multiResolutionAtlasSchemaVersion: string | null;
  multiResolutionAtlasPolicyVersion: string | null;
  multiResolutionAtlasEligible: boolean | null;
  multiResolutionAtlasCoarseRegionId: string | null;
  multiResolutionAtlasFamilyAtlasId: string | null;
  multiResolutionAtlasPrefixBandId: string | null;
  multiResolutionAtlasTailStrategyId: string | null;
  multiResolutionAtlasSource: string | null;
  multiResolutionAtlasReasonCodes: string[] | null;
  multiResolutionAtlasFamilyRoutingApplied: boolean | null;
  multiResolutionAtlasFamilyRoutingBoost: number | null;
  multiResolutionAtlasFamilyRoutingReasonCodes: string[] | null;
  multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId: string | null;
  multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId: string | null;
  multiResolutionAtlasPrefixBandRoutingApplied: boolean | null;
  multiResolutionAtlasPrefixBandRoutingBoost: number | null;
  multiResolutionAtlasPrefixBandRoutingReasonCodes: string[] | null;
  multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId: string | null;
  multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId: string | null;
  multiResolutionAtlasTailStrategyRoutingApplied: boolean | null;
  multiResolutionAtlasTailStrategyRoutingBoost: number | null;
  multiResolutionAtlasTailStrategyRoutingReasonCodes: string[] | null;
  multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId: string | null;
  multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId: string | null;
  counterfactualRepairSchemaVersion: string | null;
  counterfactualRepairPolicyVersion: string | null;
  counterfactualRepairEligible: boolean | null;
  counterfactualRepairPrimarySemanticAddressId: string | null;
  counterfactualRepairNearestAlternativeSemanticAddressId: string | null;
  counterfactualRepairNearestAlternativeCanonicalMergedText: string | null;
  counterfactualRepairAmbiguityBand: string | null;
  counterfactualRepairRepairEligible: boolean | null;
  counterfactualRepairRepairSignal: string | null;
  counterfactualRepairSelectionFunctionVersion: string | null;
  counterfactualRepairCandidatePopulationSize: number | null;
  counterfactualRepairTopCandidateSemanticAddressIds: string[] | null;
  counterfactualRepairTopCandidateNormalizedScores: number[] | null;
  counterfactualRepairSelectionWinnerSemanticAddressId: string | null;
  counterfactualRepairDeadDetected: boolean | null;
  counterfactualRepairDeadReason: string | null;
  counterfactualRepairCounterexampleCaptured: boolean | null;
  counterfactualRepairCounterexampleKind: string | null;
  counterfactualRepairAntibodyEligible: boolean | null;
  counterfactualRepairAntibodyHint: string | null;
  counterfactualRepairStressEvent: string | null;
  counterfactualRepairStressBand: string | null;
  counterfactualRepairOuroborosEvent: string | null;
  counterfactualRepairSource: string | null;
  counterfactualRepairReasonCodes: string[] | null;
  counterfactualRepairAmbiguityPilotVersion: string | null;
  counterfactualRepairAmbiguityPilotApplied: boolean | null;
  counterfactualRepairAmbiguityPrimaryScore: number | null;
  counterfactualRepairAmbiguityAlternativeScore: number | null;
  counterfactualRepairAmbiguityScoreGap: number | null;
  counterfactualRepairAmbiguityEscalationSuggested: boolean | null;
  counterfactualRepairAmbiguityEscalationKind: string | null;
  counterfactualRepairAmbiguityReasonCodes: string[] | null;
  counterfactualRepairSignalPilotVersion: string | null;
  counterfactualRepairSignalPilotApplied: boolean | null;
  counterfactualRepairSignalTrajectoryState: string | null;
  counterfactualRepairSignalAbortedTrajectoryDetected: boolean | null;
  counterfactualRepairSignalDirectionReversalDetected: boolean | null;
  counterfactualRepairSignalSelfCorrectionDetected: boolean | null;
  counterfactualRepairSignalRepairWindowOpen: boolean | null;
  counterfactualRepairSignalEscalationSuggested: boolean | null;
  counterfactualRepairSignalEscalationKind: string | null;
  counterfactualRepairSignalReasonCodes: string[] | null;
  counterfactualRepairRankingPilotVersion: string | null;
  counterfactualRepairRankingPilotApplied: boolean | null;
  counterfactualRepairRankingPrimaryScore: number | null;
  counterfactualRepairRankingAlternativeScore: number | null;
  counterfactualRepairRankingScoreGap: number | null;
  counterfactualRepairRankingStressAdjusted: boolean | null;
  counterfactualRepairRankingRepairAdjusted: boolean | null;
  counterfactualRepairRankingGuardrailSuggested: boolean | null;
  counterfactualRepairRankingGuardrailKind: string | null;
  counterfactualRepairRankingReasonCodes: string[] | null;
  counterfactualRepairCounterexampleFormatVersion: string | null;
  counterfactualRepairAntibodyPilotVersion: string | null;
  counterfactualRepairAntibodyPilotApplied: boolean | null;
  counterfactualRepairCounterexampleEventClass: string | null;
  counterfactualRepairCounterexampleSignature: string | null;
  counterfactualRepairCounterexampleTranscriptDigest: string | null;
  counterfactualRepairAntibodyMintSuggested: boolean | null;
  counterfactualRepairAntibodyMintKey: string | null;
  counterfactualRepairAntibodyQuarantineSuggested: boolean | null;
  counterfactualRepairAntibodyQuarantineBand: string | null;
  counterfactualRepairAntibodyValidationGateHint: string | null;
  counterfactualRepairAntibodyPilotReasonCodes: string[] | null;
  dynamicPrecisionSchemaVersion: string | null;
  dynamicPrecisionPolicyVersion: string | null;
  dynamicPrecisionEscalationPilotVersion: string | null;
  dynamicPrecisionFamilySwitchingVersion: string | null;
  dynamicPrecisionHysteresisVersion: string | null;
  dynamicPrecisionEligible: boolean | null;
  dynamicPrecisionObservedFamily: string | null;
  dynamicPrecisionBaselineRegime: string | null;
  dynamicPrecisionSuggestedRegime: string | null;
  dynamicPrecisionCurrentRegime: string | null;
  dynamicPrecisionProposedRegime: string | null;
  dynamicPrecisionEscalationEligible: boolean | null;
  dynamicPrecisionEscalationSuggested: boolean | null;
  dynamicPrecisionDeescalationEligible: boolean | null;
  dynamicPrecisionDeescalationSuggested: boolean | null;
  dynamicPrecisionObservedAmbiguityBand: string | null;
  dynamicPrecisionObservedRepairWindowOpen: boolean | null;
  dynamicPrecisionObservedStressBand: string | null;
  dynamicPrecisionObservedGuardrailSuggested: boolean | null;
  dynamicPrecisionObservedGuardrailKind: string | null;
  dynamicPrecisionSource: string | null;
  dynamicPrecisionFamilyPolicyId: string | null;
  dynamicPrecisionHysteresisState: string | null;
  dynamicPrecisionStabilityTickCount: number | null;
  dynamicPrecisionCooldownTicksRemaining: number | null;
  dynamicPrecisionTransitionAllowed: boolean | null;
  dynamicPrecisionTransitionDecision: string | null;
  dynamicPrecisionActiveRegime: string | null;
  dynamicPrecisionSwitchApplied: boolean | null;
  dynamicPrecisionStrategyProfileId: string | null;
  dynamicPrecisionReasonCodes: string[] | null;
  workflowMemorySchemaVersion: string | null;
  workflowMemoryPolicyVersion: string | null;
  workflowMemoryEligible: boolean | null;
  workflowMemoryCurrentSemanticAddressId: string | null;
  workflowMemoryPreviousSemanticAddressId: string | null;
  workflowMemoryTransitionObserved: boolean | null;
  workflowMemoryTransitionKey: string | null;
  workflowMemoryTransitionSeenBefore: boolean | null;
  workflowMemoryTransitionCount: number | null;
  workflowMemorySequenceLength: number | null;
  workflowMemoryRepeatDetected: boolean | null;
  workflowMemoryRepeatCount: number | null;
  workflowMemoryContinuationSuggested: boolean | null;
  workflowMemoryGovernedStateUpdated: boolean | null;
  workflowMemorySource: string | null;
  workflowMemoryReasonCodes: string[] | null;
  workflowMemoryRankingVersion: string | null;
  workflowMemoryRankingEligible: boolean | null;
  workflowMemoryRankingApplied: boolean | null;
  workflowMemoryRankingBoost: number | null;
  workflowMemoryRankingPreviousSemanticAddressId: string | null;
  workflowMemoryRankingCandidateSemanticAddressId: string | null;
  workflowMemoryRankingMatchedTransitionKey: string | null;
  workflowMemoryRankingTransitionCount: number | null;
  workflowMemoryRankingSeenBefore: boolean | null;
  workflowMemoryRankingSource: string | null;
  workflowMemoryRankingReasonCodes: string[] | null;
  workflowMemoryOrderingVersion: string | null;
  workflowMemoryOrderingEligible: boolean | null;
  workflowMemoryOrderingApplied: boolean | null;
  workflowMemoryOrderingBaseScore: number | null;
  workflowMemoryOrderingAdjustedScore: number | null;
  workflowMemoryOrderingBoost: number | null;
  workflowMemoryOrderingPreviousSemanticAddressId: string | null;
  workflowMemoryOrderingCandidateSemanticAddressId: string | null;
  workflowMemoryOrderingMatchedTransitionKey: string | null;
  workflowMemoryOrderingTransitionCount: number | null;
  workflowMemoryOrderingSource: string | null;
  workflowMemoryOrderingReasonCodes: string[] | null;
  workflowMemoryCandidatePoolOrderingVersion: string | null;
  workflowMemoryCandidatePoolOrderingEligible: boolean | null;
  workflowMemoryCandidatePoolOrderingApplied: boolean | null;
  workflowMemoryCandidatePoolCandidateCountBefore: number | null;
  workflowMemoryCandidatePoolCandidateCountAfter: number | null;
  workflowMemoryCandidatePoolSemanticAddressIdsBefore: string[] | null;
  workflowMemoryCandidatePoolSemanticAddressIdsAfter: string[] | null;
  workflowMemoryCandidatePoolScoresBefore: number[] | null;
  workflowMemoryCandidatePoolScoresAfter: number[] | null;
  workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore: string | null;
  workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter: string | null;
  workflowMemoryCandidatePoolTopCandidateScoreBefore: number | null;
  workflowMemoryCandidatePoolTopCandidateScoreAfter: number | null;
  workflowMemoryCandidatePoolSource: string | null;
  workflowMemoryCandidatePoolReasonCodes: string[] | null;
}

const h3EvidenceDir = path.resolve(process.cwd(), "artifacts/reports/h3_runtime_evidence");
const h3EvidenceFile = path.join(h3EvidenceDir, "events.ndjson");
const pendingLines: string[] = [];
let flushScheduled = false;
let writeInFlight = false;

function buildDefaultEvent(input: Partial<H3RuntimeEvidenceEvent>): H3RuntimeEvidenceEvent {
  return {
    event: input.event ?? "unknown",
    chunkId: input.chunkId ?? "unknown",
    timestampMs: input.timestampMs ?? Date.now(),
    source: input.source ?? null,
    regionId: input.regionId ?? null,
    commandClass: input.commandClass ?? null,
    hadTranscriptText: input.hadTranscriptText ?? null,
    transcriptText: input.transcriptText ?? null,
    routeBefore: input.routeBefore ?? null,
    routeAfter: input.routeAfter ?? null,
    tailStartMs: input.tailStartMs ?? null,
    tailEndMs: input.tailEndMs ?? null,
    tailText: input.tailText ?? null,
    mergedText: input.mergedText ?? null,
    stepCount: input.stepCount ?? null,
    finalGranted: input.finalGranted ?? null,
    reason: input.reason ?? null,
    parameterType: input.parameterType ?? null,
    numericRaw: input.numericRaw ?? null,
    numericNormalized: input.numericNormalized ?? null,
    numericParseConfidence: input.numericParseConfidence ?? null,
    numericStrategyVersion: input.numericStrategyVersion ?? null,
    openRaw: input.openRaw ?? null,
    openNormalized: input.openNormalized ?? null,
    openParseConfidence: input.openParseConfidence ?? null,
    openStrategyVersion: input.openStrategyVersion ?? null,
    openTargetKind: input.openTargetKind ?? null,
    semanticAddressId: input.semanticAddressId ?? null,
    canonicalMergedText: input.canonicalMergedText ?? null,
    slotSignature: input.slotSignature ?? null,
    atlasVersion: input.atlasVersion ?? null,
    lookupCandidateCount: input.lookupCandidateCount ?? null,
    bestCandidateId: input.bestCandidateId ?? null,
    bestCandidateScore: input.bestCandidateScore ?? null,
    warmHitClass: input.warmHitClass ?? null,
    governanceRequired: input.governanceRequired ?? null,
    governanceQualified: input.governanceQualified ?? null,
    h23StepCount: input.h23StepCount ?? null,
    h24FinalGranted: input.h24FinalGranted ?? null,
    successCount: input.successCount ?? null,
    warmApplied: input.warmApplied ?? null,
    warmAppliedStage: input.warmAppliedStage ?? null,
    confidencePolicyVersion: input.confidencePolicyVersion ?? null,
    weakThreshold: input.weakThreshold ?? null,
    strongThreshold: input.strongThreshold ?? null,
    candidateAgeMs: input.candidateAgeMs ?? null,
    recentConflictPenaltyApplied: input.recentConflictPenaltyApplied ?? null,
    staleProtectionApplied: input.staleProtectionApplied ?? null,
    focusRankingApplied: input.focusRankingApplied ?? null,
    focusRankingBoost: input.focusRankingBoost ?? null,
    focusRankingReasonCodes: input.focusRankingReasonCodes ?? null,
    focusLegalityApplied: input.focusLegalityApplied ?? null,
    focusLegalityLawful: input.focusLegalityLawful ?? null,
    focusLegalityPenaltyApplied: input.focusLegalityPenaltyApplied ?? null,
    focusLegalityPenalty: input.focusLegalityPenalty ?? null,
    focusLegalityReasonCodes: input.focusLegalityReasonCodes ?? null,
    focusLegalityCommandKind: input.focusLegalityCommandKind ?? null,
    focusTaskMomentumApplied: input.focusTaskMomentumApplied ?? null,
    focusTaskMomentumBoost: input.focusTaskMomentumBoost ?? null,
    focusTaskMomentumPenaltyApplied: input.focusTaskMomentumPenaltyApplied ?? null,
    focusTaskMomentumPenalty: input.focusTaskMomentumPenalty ?? null,
    focusTaskMomentumReasonCodes: input.focusTaskMomentumReasonCodes ?? null,
    focusTaskMomentumMatchedSemanticAddressId: input.focusTaskMomentumMatchedSemanticAddressId ?? null,
    warmDiscardReason: input.warmDiscardReason ?? null,
    liveEvidenceOverride: input.liveEvidenceOverride ?? null,
    lookupPath: input.lookupPath ?? null,
    focusContextSchemaVersion: input.focusContextSchemaVersion ?? null,
    focusContextEligible: input.focusContextEligible ?? null,
    focusSnapshotFresh: input.focusSnapshotFresh ?? null,
    focusAuthorityType: input.focusAuthorityType ?? null,
    focusAppId: input.focusAppId ?? null,
    focusWindowId: input.focusWindowId ?? null,
    focusRegionId: input.focusRegionId ?? null,
    focusSubregionId: input.focusSubregionId ?? null,
    focusControlId: input.focusControlId ?? null,
    focusHasSelection: input.focusHasSelection ?? null,
    focusSelectionTextLength: input.focusSelectionTextLength ?? null,
    focusCaretOffset: input.focusCaretOffset ?? null,
    focusSnapshotAgeMs: input.focusSnapshotAgeMs ?? null,
    focusConfidence: input.focusConfidence ?? null,
    focusRecentDeltaCount: input.focusRecentDeltaCount ?? null,
    focusRecentTaskHistoryCount: input.focusRecentTaskHistoryCount ?? null,
    focusDeicticResolutionEligible: input.focusDeicticResolutionEligible ?? null,
    focusRankingEligible: input.focusRankingEligible ?? null,
    focusLegalityEligible: input.focusLegalityEligible ?? null,
    focusReasonCodes: input.focusReasonCodes ?? null,
    atlasShardPolicyVersion: input.atlasShardPolicyVersion ?? null,
    atlasShardHintId: input.atlasShardHintId ?? null,
    atlasShardHintEligible: input.atlasShardHintEligible ?? null,
    atlasShardHintSource: input.atlasShardHintSource ?? null,
    atlasShardHintPriority: input.atlasShardHintPriority ?? null,
    atlasShardReasonCodes: input.atlasShardReasonCodes ?? null,
    atlasShardRankingApplied: input.atlasShardRankingApplied ?? null,
    atlasShardRankingBoost: input.atlasShardRankingBoost ?? null,
    atlasShardRankingReasonCodes: input.atlasShardRankingReasonCodes ?? null,
    atlasShardRankingCandidateKind: input.atlasShardRankingCandidateKind ?? null,
    atlasShardNarrowingApplied: input.atlasShardNarrowingApplied ?? null,
    atlasShardNarrowingFallbackUsed: input.atlasShardNarrowingFallbackUsed ?? null,
    atlasShardNarrowingCandidateCountBefore: input.atlasShardNarrowingCandidateCountBefore ?? null,
    atlasShardNarrowingCandidateCountAfter: input.atlasShardNarrowingCandidateCountAfter ?? null,
    atlasShardNarrowingReasonCodes: input.atlasShardNarrowingReasonCodes ?? null,
    atlasShardNarrowingAllowedCandidateKinds: input.atlasShardNarrowingAllowedCandidateKinds ?? null,
    multiResolutionAtlasSchemaVersion: input.multiResolutionAtlasSchemaVersion ?? null,
    multiResolutionAtlasPolicyVersion: input.multiResolutionAtlasPolicyVersion ?? null,
    multiResolutionAtlasEligible: input.multiResolutionAtlasEligible ?? null,
    multiResolutionAtlasCoarseRegionId: input.multiResolutionAtlasCoarseRegionId ?? null,
    multiResolutionAtlasFamilyAtlasId: input.multiResolutionAtlasFamilyAtlasId ?? null,
    multiResolutionAtlasPrefixBandId: input.multiResolutionAtlasPrefixBandId ?? null,
    multiResolutionAtlasTailStrategyId: input.multiResolutionAtlasTailStrategyId ?? null,
    multiResolutionAtlasSource: input.multiResolutionAtlasSource ?? null,
    multiResolutionAtlasReasonCodes: input.multiResolutionAtlasReasonCodes ?? null,
    multiResolutionAtlasFamilyRoutingApplied: input.multiResolutionAtlasFamilyRoutingApplied ?? null,
    multiResolutionAtlasFamilyRoutingBoost: input.multiResolutionAtlasFamilyRoutingBoost ?? null,
    multiResolutionAtlasFamilyRoutingReasonCodes:
      input.multiResolutionAtlasFamilyRoutingReasonCodes ?? null,
    multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
      input.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? null,
    multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
      input.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? null,
    multiResolutionAtlasPrefixBandRoutingApplied:
      input.multiResolutionAtlasPrefixBandRoutingApplied ?? null,
    multiResolutionAtlasPrefixBandRoutingBoost:
      input.multiResolutionAtlasPrefixBandRoutingBoost ?? null,
    multiResolutionAtlasPrefixBandRoutingReasonCodes:
      input.multiResolutionAtlasPrefixBandRoutingReasonCodes ?? null,
    multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId:
      input.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId ?? null,
    multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId:
      input.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId ?? null,
    multiResolutionAtlasTailStrategyRoutingApplied:
      input.multiResolutionAtlasTailStrategyRoutingApplied ?? null,
    multiResolutionAtlasTailStrategyRoutingBoost:
      input.multiResolutionAtlasTailStrategyRoutingBoost ?? null,
    multiResolutionAtlasTailStrategyRoutingReasonCodes:
      input.multiResolutionAtlasTailStrategyRoutingReasonCodes ?? null,
    multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId:
      input.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId ?? null,
    multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId:
      input.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId ?? null,
    counterfactualRepairSchemaVersion: input.counterfactualRepairSchemaVersion ?? null,
    counterfactualRepairPolicyVersion: input.counterfactualRepairPolicyVersion ?? null,
    counterfactualRepairEligible: input.counterfactualRepairEligible ?? null,
    counterfactualRepairPrimarySemanticAddressId: input.counterfactualRepairPrimarySemanticAddressId ?? null,
    counterfactualRepairNearestAlternativeSemanticAddressId:
      input.counterfactualRepairNearestAlternativeSemanticAddressId ?? null,
    counterfactualRepairNearestAlternativeCanonicalMergedText:
      input.counterfactualRepairNearestAlternativeCanonicalMergedText ?? null,
    counterfactualRepairAmbiguityBand: input.counterfactualRepairAmbiguityBand ?? null,
    counterfactualRepairRepairEligible: input.counterfactualRepairRepairEligible ?? null,
    counterfactualRepairRepairSignal: input.counterfactualRepairRepairSignal ?? null,
    counterfactualRepairSelectionFunctionVersion:
      input.counterfactualRepairSelectionFunctionVersion ?? null,
    counterfactualRepairCandidatePopulationSize:
      input.counterfactualRepairCandidatePopulationSize ?? null,
    counterfactualRepairTopCandidateSemanticAddressIds:
      input.counterfactualRepairTopCandidateSemanticAddressIds ?? null,
    counterfactualRepairTopCandidateNormalizedScores:
      input.counterfactualRepairTopCandidateNormalizedScores ?? null,
    counterfactualRepairSelectionWinnerSemanticAddressId:
      input.counterfactualRepairSelectionWinnerSemanticAddressId ?? null,
    counterfactualRepairDeadDetected: input.counterfactualRepairDeadDetected ?? null,
    counterfactualRepairDeadReason: input.counterfactualRepairDeadReason ?? null,
    counterfactualRepairCounterexampleCaptured:
      input.counterfactualRepairCounterexampleCaptured ?? null,
    counterfactualRepairCounterexampleKind:
      input.counterfactualRepairCounterexampleKind ?? null,
    counterfactualRepairAntibodyEligible:
      input.counterfactualRepairAntibodyEligible ?? null,
    counterfactualRepairAntibodyHint: input.counterfactualRepairAntibodyHint ?? null,
    counterfactualRepairStressEvent: input.counterfactualRepairStressEvent ?? null,
    counterfactualRepairStressBand: input.counterfactualRepairStressBand ?? null,
    counterfactualRepairOuroborosEvent: input.counterfactualRepairOuroborosEvent ?? null,
    counterfactualRepairSource: input.counterfactualRepairSource ?? null,
    counterfactualRepairReasonCodes: input.counterfactualRepairReasonCodes ?? null,
    counterfactualRepairAmbiguityPilotVersion:
      input.counterfactualRepairAmbiguityPilotVersion ?? null,
    counterfactualRepairAmbiguityPilotApplied:
      input.counterfactualRepairAmbiguityPilotApplied ?? null,
    counterfactualRepairAmbiguityPrimaryScore:
      input.counterfactualRepairAmbiguityPrimaryScore ?? null,
    counterfactualRepairAmbiguityAlternativeScore:
      input.counterfactualRepairAmbiguityAlternativeScore ?? null,
    counterfactualRepairAmbiguityScoreGap:
      input.counterfactualRepairAmbiguityScoreGap ?? null,
    counterfactualRepairAmbiguityEscalationSuggested:
      input.counterfactualRepairAmbiguityEscalationSuggested ?? null,
    counterfactualRepairAmbiguityEscalationKind:
      input.counterfactualRepairAmbiguityEscalationKind ?? null,
    counterfactualRepairAmbiguityReasonCodes:
      input.counterfactualRepairAmbiguityReasonCodes ?? null,
    counterfactualRepairSignalPilotVersion:
      input.counterfactualRepairSignalPilotVersion ?? null,
    counterfactualRepairSignalPilotApplied:
      input.counterfactualRepairSignalPilotApplied ?? null,
    counterfactualRepairSignalTrajectoryState:
      input.counterfactualRepairSignalTrajectoryState ?? null,
    counterfactualRepairSignalAbortedTrajectoryDetected:
      input.counterfactualRepairSignalAbortedTrajectoryDetected ?? null,
    counterfactualRepairSignalDirectionReversalDetected:
      input.counterfactualRepairSignalDirectionReversalDetected ?? null,
    counterfactualRepairSignalSelfCorrectionDetected:
      input.counterfactualRepairSignalSelfCorrectionDetected ?? null,
    counterfactualRepairSignalRepairWindowOpen:
      input.counterfactualRepairSignalRepairWindowOpen ?? null,
    counterfactualRepairSignalEscalationSuggested:
      input.counterfactualRepairSignalEscalationSuggested ?? null,
    counterfactualRepairSignalEscalationKind:
      input.counterfactualRepairSignalEscalationKind ?? null,
    counterfactualRepairSignalReasonCodes:
      input.counterfactualRepairSignalReasonCodes ?? null,
    counterfactualRepairRankingPilotVersion:
      input.counterfactualRepairRankingPilotVersion ?? null,
    counterfactualRepairRankingPilotApplied:
      input.counterfactualRepairRankingPilotApplied ?? null,
    counterfactualRepairRankingPrimaryScore:
      input.counterfactualRepairRankingPrimaryScore ?? null,
    counterfactualRepairRankingAlternativeScore:
      input.counterfactualRepairRankingAlternativeScore ?? null,
    counterfactualRepairRankingScoreGap:
      input.counterfactualRepairRankingScoreGap ?? null,
    counterfactualRepairRankingStressAdjusted:
      input.counterfactualRepairRankingStressAdjusted ?? null,
    counterfactualRepairRankingRepairAdjusted:
      input.counterfactualRepairRankingRepairAdjusted ?? null,
    counterfactualRepairRankingGuardrailSuggested:
      input.counterfactualRepairRankingGuardrailSuggested ?? null,
    counterfactualRepairRankingGuardrailKind:
      input.counterfactualRepairRankingGuardrailKind ?? null,
    counterfactualRepairRankingReasonCodes:
      input.counterfactualRepairRankingReasonCodes ?? null,
    counterfactualRepairCounterexampleFormatVersion:
      input.counterfactualRepairCounterexampleFormatVersion ?? null,
    counterfactualRepairAntibodyPilotVersion:
      input.counterfactualRepairAntibodyPilotVersion ?? null,
    counterfactualRepairAntibodyPilotApplied:
      input.counterfactualRepairAntibodyPilotApplied ?? null,
    counterfactualRepairCounterexampleEventClass:
      input.counterfactualRepairCounterexampleEventClass ?? null,
    counterfactualRepairCounterexampleSignature:
      input.counterfactualRepairCounterexampleSignature ?? null,
    counterfactualRepairCounterexampleTranscriptDigest:
      input.counterfactualRepairCounterexampleTranscriptDigest ?? null,
    counterfactualRepairAntibodyMintSuggested:
      input.counterfactualRepairAntibodyMintSuggested ?? null,
    counterfactualRepairAntibodyMintKey:
      input.counterfactualRepairAntibodyMintKey ?? null,
    counterfactualRepairAntibodyQuarantineSuggested:
      input.counterfactualRepairAntibodyQuarantineSuggested ?? null,
    counterfactualRepairAntibodyQuarantineBand:
      input.counterfactualRepairAntibodyQuarantineBand ?? null,
    counterfactualRepairAntibodyValidationGateHint:
      input.counterfactualRepairAntibodyValidationGateHint ?? null,
    counterfactualRepairAntibodyPilotReasonCodes:
      input.counterfactualRepairAntibodyPilotReasonCodes ?? null,
    dynamicPrecisionSchemaVersion:
      input.dynamicPrecisionSchemaVersion ?? null,
    dynamicPrecisionPolicyVersion:
      input.dynamicPrecisionPolicyVersion ?? null,
    dynamicPrecisionEscalationPilotVersion:
      input.dynamicPrecisionEscalationPilotVersion ?? null,
    dynamicPrecisionFamilySwitchingVersion:
      input.dynamicPrecisionFamilySwitchingVersion ?? null,
    dynamicPrecisionHysteresisVersion:
      input.dynamicPrecisionHysteresisVersion ?? null,
    dynamicPrecisionEligible:
      input.dynamicPrecisionEligible ?? null,
    dynamicPrecisionObservedFamily:
      input.dynamicPrecisionObservedFamily ?? null,
    dynamicPrecisionBaselineRegime:
      input.dynamicPrecisionBaselineRegime ?? null,
    dynamicPrecisionSuggestedRegime:
      input.dynamicPrecisionSuggestedRegime ?? null,
    dynamicPrecisionCurrentRegime:
      input.dynamicPrecisionCurrentRegime ?? null,
    dynamicPrecisionProposedRegime:
      input.dynamicPrecisionProposedRegime ?? null,
    dynamicPrecisionEscalationEligible:
      input.dynamicPrecisionEscalationEligible ?? null,
    dynamicPrecisionEscalationSuggested:
      input.dynamicPrecisionEscalationSuggested ?? null,
    dynamicPrecisionDeescalationEligible:
      input.dynamicPrecisionDeescalationEligible ?? null,
    dynamicPrecisionDeescalationSuggested:
      input.dynamicPrecisionDeescalationSuggested ?? null,
    dynamicPrecisionObservedAmbiguityBand:
      input.dynamicPrecisionObservedAmbiguityBand ?? null,
    dynamicPrecisionObservedRepairWindowOpen:
      input.dynamicPrecisionObservedRepairWindowOpen ?? null,
    dynamicPrecisionObservedStressBand:
      input.dynamicPrecisionObservedStressBand ?? null,
    dynamicPrecisionObservedGuardrailSuggested:
      input.dynamicPrecisionObservedGuardrailSuggested ?? null,
    dynamicPrecisionObservedGuardrailKind:
      input.dynamicPrecisionObservedGuardrailKind ?? null,
    dynamicPrecisionSource:
      input.dynamicPrecisionSource ?? null,
    dynamicPrecisionFamilyPolicyId:
      input.dynamicPrecisionFamilyPolicyId ?? null,
    dynamicPrecisionHysteresisState:
      input.dynamicPrecisionHysteresisState ?? null,
    dynamicPrecisionStabilityTickCount:
      input.dynamicPrecisionStabilityTickCount ?? null,
    dynamicPrecisionCooldownTicksRemaining:
      input.dynamicPrecisionCooldownTicksRemaining ?? null,
    dynamicPrecisionTransitionAllowed:
      input.dynamicPrecisionTransitionAllowed ?? null,
    dynamicPrecisionTransitionDecision:
      input.dynamicPrecisionTransitionDecision ?? null,
    dynamicPrecisionActiveRegime:
      input.dynamicPrecisionActiveRegime ?? null,
    dynamicPrecisionSwitchApplied:
      input.dynamicPrecisionSwitchApplied ?? null,
    dynamicPrecisionStrategyProfileId:
      input.dynamicPrecisionStrategyProfileId ?? null,
    dynamicPrecisionReasonCodes:
      input.dynamicPrecisionReasonCodes ?? null,
    workflowMemorySchemaVersion:
      input.workflowMemorySchemaVersion ?? null,
    workflowMemoryPolicyVersion:
      input.workflowMemoryPolicyVersion ?? null,
    workflowMemoryEligible:
      input.workflowMemoryEligible ?? null,
    workflowMemoryCurrentSemanticAddressId:
      input.workflowMemoryCurrentSemanticAddressId ?? null,
    workflowMemoryPreviousSemanticAddressId:
      input.workflowMemoryPreviousSemanticAddressId ?? null,
    workflowMemoryTransitionObserved:
      input.workflowMemoryTransitionObserved ?? null,
    workflowMemoryTransitionKey:
      input.workflowMemoryTransitionKey ?? null,
    workflowMemoryTransitionSeenBefore:
      input.workflowMemoryTransitionSeenBefore ?? null,
    workflowMemoryTransitionCount:
      input.workflowMemoryTransitionCount ?? null,
    workflowMemorySequenceLength:
      input.workflowMemorySequenceLength ?? null,
    workflowMemoryRepeatDetected:
      input.workflowMemoryRepeatDetected ?? null,
    workflowMemoryRepeatCount:
      input.workflowMemoryRepeatCount ?? null,
    workflowMemoryContinuationSuggested:
      input.workflowMemoryContinuationSuggested ?? null,
    workflowMemoryGovernedStateUpdated:
      input.workflowMemoryGovernedStateUpdated ?? null,
    workflowMemorySource:
      input.workflowMemorySource ?? null,
    workflowMemoryReasonCodes:
      input.workflowMemoryReasonCodes ?? null,
    workflowMemoryRankingVersion:
      input.workflowMemoryRankingVersion ?? null,
    workflowMemoryRankingEligible:
      input.workflowMemoryRankingEligible ?? null,
    workflowMemoryRankingApplied:
      input.workflowMemoryRankingApplied ?? null,
    workflowMemoryRankingBoost:
      input.workflowMemoryRankingBoost ?? null,
    workflowMemoryRankingPreviousSemanticAddressId:
      input.workflowMemoryRankingPreviousSemanticAddressId ?? null,
    workflowMemoryRankingCandidateSemanticAddressId:
      input.workflowMemoryRankingCandidateSemanticAddressId ?? null,
    workflowMemoryRankingMatchedTransitionKey:
      input.workflowMemoryRankingMatchedTransitionKey ?? null,
    workflowMemoryRankingTransitionCount:
      input.workflowMemoryRankingTransitionCount ?? null,
    workflowMemoryRankingSeenBefore:
      input.workflowMemoryRankingSeenBefore ?? null,
    workflowMemoryRankingSource:
      input.workflowMemoryRankingSource ?? null,
    workflowMemoryRankingReasonCodes:
      input.workflowMemoryRankingReasonCodes ?? null,
    workflowMemoryOrderingVersion:
      input.workflowMemoryOrderingVersion ?? null,
    workflowMemoryOrderingEligible:
      input.workflowMemoryOrderingEligible ?? null,
    workflowMemoryOrderingApplied:
      input.workflowMemoryOrderingApplied ?? null,
    workflowMemoryOrderingBaseScore:
      input.workflowMemoryOrderingBaseScore ?? null,
    workflowMemoryOrderingAdjustedScore:
      input.workflowMemoryOrderingAdjustedScore ?? null,
    workflowMemoryOrderingBoost:
      input.workflowMemoryOrderingBoost ?? null,
    workflowMemoryOrderingPreviousSemanticAddressId:
      input.workflowMemoryOrderingPreviousSemanticAddressId ?? null,
    workflowMemoryOrderingCandidateSemanticAddressId:
      input.workflowMemoryOrderingCandidateSemanticAddressId ?? null,
    workflowMemoryOrderingMatchedTransitionKey:
      input.workflowMemoryOrderingMatchedTransitionKey ?? null,
    workflowMemoryOrderingTransitionCount:
      input.workflowMemoryOrderingTransitionCount ?? null,
    workflowMemoryOrderingSource:
      input.workflowMemoryOrderingSource ?? null,
    workflowMemoryOrderingReasonCodes:
      input.workflowMemoryOrderingReasonCodes ?? null,
    workflowMemoryCandidatePoolOrderingVersion:
      input.workflowMemoryCandidatePoolOrderingVersion ?? null,
    workflowMemoryCandidatePoolOrderingEligible:
      input.workflowMemoryCandidatePoolOrderingEligible ?? null,
    workflowMemoryCandidatePoolOrderingApplied:
      input.workflowMemoryCandidatePoolOrderingApplied ?? null,
    workflowMemoryCandidatePoolCandidateCountBefore:
      input.workflowMemoryCandidatePoolCandidateCountBefore ?? null,
    workflowMemoryCandidatePoolCandidateCountAfter:
      input.workflowMemoryCandidatePoolCandidateCountAfter ?? null,
    workflowMemoryCandidatePoolSemanticAddressIdsBefore:
      input.workflowMemoryCandidatePoolSemanticAddressIdsBefore ?? null,
    workflowMemoryCandidatePoolSemanticAddressIdsAfter:
      input.workflowMemoryCandidatePoolSemanticAddressIdsAfter ?? null,
    workflowMemoryCandidatePoolScoresBefore:
      input.workflowMemoryCandidatePoolScoresBefore ?? null,
    workflowMemoryCandidatePoolScoresAfter:
      input.workflowMemoryCandidatePoolScoresAfter ?? null,
    workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore:
      input.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore ?? null,
    workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter:
      input.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter ?? null,
    workflowMemoryCandidatePoolTopCandidateScoreBefore:
      input.workflowMemoryCandidatePoolTopCandidateScoreBefore ?? null,
    workflowMemoryCandidatePoolTopCandidateScoreAfter:
      input.workflowMemoryCandidatePoolTopCandidateScoreAfter ?? null,
    workflowMemoryCandidatePoolSource:
      input.workflowMemoryCandidatePoolSource ?? null,
    workflowMemoryCandidatePoolReasonCodes:
      input.workflowMemoryCandidatePoolReasonCodes ?? null,
  };
}

export function emitH3RuntimeEvidence(input: Partial<H3RuntimeEvidenceEvent>): H3RuntimeEvidenceEvent {
  const event = buildDefaultEvent(input);
  const line = JSON.stringify(event);
  console.log(`[H3_EVIDENCE] ${line}`);
  enqueueEvidenceLine(`${line}\n`);
  return event;
}

function enqueueEvidenceLine(line: string): void {
  pendingLines.push(line);
  if (flushScheduled) {
    return;
  }
  flushScheduled = true;
  setTimeout(() => {
    flushScheduled = false;
    void flushEvidenceLines();
  }, 0);
}

async function flushEvidenceLines(): Promise<void> {
  if (writeInFlight || pendingLines.length === 0) {
    return;
  }
  writeInFlight = true;
  const payload = pendingLines.splice(0, pendingLines.length).join("");
  try {
    await fs.promises.mkdir(h3EvidenceDir, { recursive: true });
    await fs.promises.appendFile(h3EvidenceFile, payload, "utf8");
  } catch {
    // Best-effort telemetry write only; runtime behavior must remain unchanged.
  } finally {
    writeInFlight = false;
    if (pendingLines.length > 0) {
      void flushEvidenceLines();
    }
  }
}
