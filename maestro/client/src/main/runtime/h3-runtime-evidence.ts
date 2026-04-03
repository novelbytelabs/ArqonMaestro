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
  counterfactualRepairSource: string | null;
  counterfactualRepairReasonCodes: string[] | null;
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
    counterfactualRepairPrimarySemanticAddressId:
      input.counterfactualRepairPrimarySemanticAddressId ?? null,
    counterfactualRepairNearestAlternativeSemanticAddressId:
      input.counterfactualRepairNearestAlternativeSemanticAddressId ?? null,
    counterfactualRepairNearestAlternativeCanonicalMergedText:
      input.counterfactualRepairNearestAlternativeCanonicalMergedText ?? null,
    counterfactualRepairAmbiguityBand: input.counterfactualRepairAmbiguityBand ?? null,
    counterfactualRepairRepairEligible: input.counterfactualRepairRepairEligible ?? null,
    counterfactualRepairRepairSignal: input.counterfactualRepairRepairSignal ?? null,
    counterfactualRepairSource: input.counterfactualRepairSource ?? null,
    counterfactualRepairReasonCodes: input.counterfactualRepairReasonCodes ?? null,
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
