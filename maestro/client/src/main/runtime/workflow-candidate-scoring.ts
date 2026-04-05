export const WORKFLOW_CANDIDATE_SCORING_SCHEMA_VERSION =
  "3j_workflow_candidate_scoring_v1";
export const WORKFLOW_CANDIDATE_SCORING_POLICY_VERSION =
  "3j_bounded_scoring_risk_v1";
export const WORKFLOW_CANDIDATE_SCORE_VERSION =
  "3j_score_family_v1";

export type WorkflowCandidateCreationRiskBand =
  | "very_low"
  | "low"
  | "moderate"
  | "high"
  | "very_high";

export interface WorkflowCandidateScoringInput {
  discoveryEligible?: boolean | null;
  discoveryOccurrenceCount?: number | null;
  discoveryDistinctRunCount?: number | null;
  discoverySequenceLength?: number | null;
  discoveryStartBoundaryConfidence?: number | null;
  discoveryEndBoundaryConfidence?: number | null;
  discoveryRepeatedSubsequenceDetected?: boolean | null;
  discoveryRediscoveryMerged?: boolean | null;
  skeletonEligible?: boolean | null;
  skeletonCanonicalStepSemanticAddressIds?: string[] | null;
  skeletonFixedStepIndices?: number[] | null;
  skeletonVariableStepIndices?: number[] | null;
  skeletonOptionalStepIndices?: number[] | null;
  skeletonInferredSlotCount?: number | null;
  skeletonGeneralizationConfidence?: number | null;
  skeletonAbstractionEligible?: boolean | null;
  skeletonFamilyVariantCount?: number | null;
  skeletonFamilySplitRequired?: boolean | null;
  source?: string | null;
}

export interface WorkflowCandidateScoringFields {
  workflowCandidateScoringSchemaVersion: string | null;
  workflowCandidateScoringPolicyVersion: string | null;
  workflowCandidateScoringEligible: boolean | null;
  workflowCandidateScoreVersion: string | null;
  workflowCandidateConfidenceScore: number | null;
  workflowCandidateUtilityScore: number | null;
  workflowCandidateCreationRiskScore: number | null;
  workflowCandidateSuggestionPressureScore: number | null;
  workflowCandidateTrustScore: number | null;
  workflowCandidateNoveltyScore: number | null;
  workflowCandidateDuplicateRiskScore: number | null;
  workflowCandidateStructuralStabilityRisk: number | null;
  workflowCandidateParameterVolatilityRisk: number | null;
  workflowCandidateBoundaryClarityRisk: number | null;
  workflowCandidateAbstractionRiskComponent: number | null;
  workflowCandidateLatentExecutionHazardRisk: number | null;
  workflowCandidateClutterRisk: number | null;
  workflowCandidateUserMisalignmentRisk: number | null;
  workflowCandidateCreationRiskBand: WorkflowCandidateCreationRiskBand | null;
  workflowCandidateScoringSource: string | null;
  workflowCandidateScoringReasonCodes: string[] | null;
  workflowCandidateRiskReasonCodes: string[] | null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampScore(value: number): number {
  return Number(Math.min(100, Math.max(0, value)).toFixed(2));
}

function riskBandFor(score: number): WorkflowCandidateCreationRiskBand {
  if (score <= 20) return "very_low";
  if (score <= 40) return "low";
  if (score <= 60) return "moderate";
  if (score <= 80) return "high";
  return "very_high";
}

export function deriveWorkflowCandidateScoring(
  input: WorkflowCandidateScoringInput
): WorkflowCandidateScoringFields {
  const source = input.source ?? "h3_runtime_evidence";
  const discoveryEligible = input.discoveryEligible ?? null;
  const skeletonEligible = input.skeletonEligible ?? null;
  const sequence = Array.isArray(input.skeletonCanonicalStepSemanticAddressIds)
    ? input.skeletonCanonicalStepSemanticAddressIds.slice()
    : null;

  if (!discoveryEligible || !skeletonEligible || !sequence || !sequence.length) {
    return {
      workflowCandidateScoringSchemaVersion: WORKFLOW_CANDIDATE_SCORING_SCHEMA_VERSION,
      workflowCandidateScoringPolicyVersion: WORKFLOW_CANDIDATE_SCORING_POLICY_VERSION,
      workflowCandidateScoringEligible: false,
      workflowCandidateScoreVersion: WORKFLOW_CANDIDATE_SCORE_VERSION,
      workflowCandidateConfidenceScore: null,
      workflowCandidateUtilityScore: null,
      workflowCandidateCreationRiskScore: null,
      workflowCandidateSuggestionPressureScore: null,
      workflowCandidateTrustScore: null,
      workflowCandidateNoveltyScore: null,
      workflowCandidateDuplicateRiskScore: null,
      workflowCandidateStructuralStabilityRisk: null,
      workflowCandidateParameterVolatilityRisk: null,
      workflowCandidateBoundaryClarityRisk: null,
      workflowCandidateAbstractionRiskComponent: null,
      workflowCandidateLatentExecutionHazardRisk: null,
      workflowCandidateClutterRisk: null,
      workflowCandidateUserMisalignmentRisk: null,
      workflowCandidateCreationRiskBand: null,
      workflowCandidateScoringSource: source,
      workflowCandidateScoringReasonCodes: [
        "workflow_candidate_scoring_prerequisites_not_met",
      ],
      workflowCandidateRiskReasonCodes: [
        "workflow_candidate_scoring_prerequisites_not_met",
      ],
    };
  }

  const occurrenceCount = Math.max(0, input.discoveryOccurrenceCount ?? 0);
  const distinctRunCount = Math.max(0, input.discoveryDistinctRunCount ?? 0);
  const sequenceLength = Math.max(0, input.discoverySequenceLength ?? sequence.length);
  const startBoundary = clamp01(input.discoveryStartBoundaryConfidence ?? 0);
  const endBoundary = clamp01(input.discoveryEndBoundaryConfidence ?? 0);
  const boundaryAverage = (startBoundary + endBoundary) / 2;
  const repeated = input.discoveryRepeatedSubsequenceDetected === true;
  const rediscoveryMerged = input.discoveryRediscoveryMerged === true;
  const fixedStepCount = Array.isArray(input.skeletonFixedStepIndices)
    ? input.skeletonFixedStepIndices.length
    : 0;
  const variableStepCount = Array.isArray(input.skeletonVariableStepIndices)
    ? input.skeletonVariableStepIndices.length
    : 0;
  const optionalStepCount = Array.isArray(input.skeletonOptionalStepIndices)
    ? input.skeletonOptionalStepIndices.length
    : 0;
  const inferredSlotCount = Math.max(0, input.skeletonInferredSlotCount ?? 0);
  const generalizationConfidence = clamp01(
    input.skeletonGeneralizationConfidence ?? 0
  );
  const abstractionEligible = input.skeletonAbstractionEligible === true;
  const familyVariantCount = Math.max(1, input.skeletonFamilyVariantCount ?? 1);
  const familySplitRequired = input.skeletonFamilySplitRequired === true;

  const occurrenceStrength = clamp01((occurrenceCount - 1) / 3);
  const distinctRunStrength = clamp01((distinctRunCount - 1) / 3);
  const sequenceStrength = clamp01(sequenceLength / 4);
  const exactFamilyBonus =
    variableStepCount === 0 &&
    optionalStepCount === 0 &&
    familyVariantCount === 1 &&
    fixedStepCount === sequence.length
      ? 0.08
      : 0.0;

  const confidenceScore = clampScore(
    100 *
      clamp01(
        0.23 * occurrenceStrength +
          0.19 * distinctRunStrength +
          0.18 * boundaryAverage +
          0.26 * generalizationConfidence +
          0.08 * (repeated ? 1 : 0) +
          0.06 * (abstractionEligible ? 1 : 0) +
          exactFamilyBonus
      )
  );

  const utilityScore = clampScore(
    100 *
      clamp01(
        0.28 * occurrenceStrength +
          0.18 * distinctRunStrength +
          0.22 * sequenceStrength +
          0.18 * generalizationConfidence +
          0.08 * (variableStepCount + optionalStepCount > 0 ? 1 : 0) +
          0.06 * (repeated ? 1 : 0)
      )
  );

  const trustScore = Math.min(
    58,
    clampScore(
      100 *
        clamp01(
          0.35 * occurrenceStrength +
            0.25 * distinctRunStrength +
            0.15 * boundaryAverage +
            0.15 * generalizationConfidence +
            0.1 * (abstractionEligible ? 1 : 0)
        )
    )
  );

  const noveltyScore = clampScore(
    74 -
      (rediscoveryMerged ? 28 : 0) -
      Math.min(16, Math.max(0, familyVariantCount - 1) * 6) -
      (familySplitRequired ? 8 : 0)
  );

  const duplicateRiskScore = clampScore(
    12 +
      55 * (rediscoveryMerged ? 1 : 0) +
      18 * clamp01((familyVariantCount - 1) / 3) +
      10 * (familySplitRequired ? 1 : 0)
  );

  const structuralStabilityRisk = clampScore(
    100 *
      clamp01(
        0.45 * (1 - boundaryAverage) +
          0.25 * clamp01((variableStepCount + optionalStepCount) / 2) +
          0.2 * (1 - generalizationConfidence) +
          0.1 * (familySplitRequired ? 1 : 0)
      )
  );

  const parameterVolatilityRisk = clampScore(
    Math.max(
      10,
      100 *
        clamp01(
          0.3 * (variableStepCount > 0 ? 1 : 0) +
            0.2 * (optionalStepCount > 0 ? 1 : 0) +
            0.25 * clamp01(inferredSlotCount / 2) +
            0.25 * (familySplitRequired ? 1 : 0)
        )
    )
  );

  const boundaryClarityRisk = clampScore(
    Math.max(8, 100 * clamp01((1 - boundaryAverage) * 0.9 + (familySplitRequired ? 0.1 : 0)))
  );

  const abstractionRiskComponent = clampScore(
    Math.max(
      12,
      100 *
        clamp01(
          0.5 * (1 - generalizationConfidence) +
            0.25 * (abstractionEligible ? 0 : 1) +
            0.15 * (familySplitRequired ? 1 : 0) +
            0.1 * clamp01((variableStepCount + optionalStepCount) / 2)
        )
    )
  );

  const latentExecutionHazardRisk = clampScore(
    Math.min(40, 10 + 4 * sequenceLength + 6 * variableStepCount + 4 * optionalStepCount + 8 * (familySplitRequired ? 1 : 0))
  );

  const clutterRisk = clampScore(
    Math.max(
      8,
      100 *
        clamp01(
          0.55 * (rediscoveryMerged ? 1 : 0) +
            0.2 * clamp01((occurrenceCount - 2) / 4) +
            0.15 * clamp01((familyVariantCount - 1) / 3) +
            0.1 * (familySplitRequired ? 1 : 0)
        )
    )
  );

  const userMisalignmentRisk = clampScore(
    24 + (familySplitRequired ? 8 : 0) + (familyVariantCount > 2 ? 6 : 0) - (occurrenceCount > 2 ? 4 : 0)
  );

  const creationRiskScore = clampScore(
    0.23 * structuralStabilityRisk +
      0.17 * parameterVolatilityRisk +
      0.14 * boundaryClarityRisk +
      0.2 * abstractionRiskComponent +
      0.12 * latentExecutionHazardRisk +
      0.08 * clutterRisk +
      0.06 * userMisalignmentRisk +
      (familySplitRequired ? 10 : 0)
  );

  const suggestionPressureScore = clampScore(
    100 *
      clamp01(
        0.4 * (duplicateRiskScore / 100) +
          0.25 * (1 - utilityScore / 100) +
          0.2 * (creationRiskScore / 100) +
          0.15 * (rediscoveryMerged ? 1 : 0)
      )
  );

  const riskBand = riskBandFor(creationRiskScore);

  const scoringReasonCodes: string[] = [
    "workflow_candidate_scoring_governed_candidate_evaluated",
    repeated
      ? "workflow_candidate_scoring_repeated_support_present"
      : "workflow_candidate_scoring_repeated_support_weak",
    abstractionEligible
      ? "workflow_candidate_scoring_abstraction_eligible"
      : "workflow_candidate_scoring_abstraction_not_yet_eligible",
    rediscoveryMerged
      ? "workflow_candidate_scoring_rediscovery_merge_observed"
      : "workflow_candidate_scoring_new_or_fresh_candidate",
  ];
  if (familySplitRequired) {
    scoringReasonCodes.push("workflow_candidate_scoring_family_split_required");
  }
  if (variableStepCount > 0 || optionalStepCount > 0) {
    scoringReasonCodes.push("workflow_candidate_scoring_variation_present");
  } else {
    scoringReasonCodes.push("workflow_candidate_scoring_exact_family_shape");
  }

  const riskReasonCodes: string[] = [
    structuralStabilityRisk <= 20
      ? "workflow_candidate_risk_structural_stability_low"
      : "workflow_candidate_risk_structural_stability_elevated",
    parameterVolatilityRisk <= 25
      ? "workflow_candidate_risk_parameter_volatility_low"
      : "workflow_candidate_risk_parameter_volatility_elevated",
    boundaryClarityRisk <= 25
      ? "workflow_candidate_risk_boundary_clarity_low"
      : "workflow_candidate_risk_boundary_clarity_elevated",
    abstractionRiskComponent <= 25
      ? "workflow_candidate_risk_abstraction_low"
      : "workflow_candidate_risk_abstraction_elevated",
    clutterRisk <= 20
      ? "workflow_candidate_risk_clutter_low"
      : "workflow_candidate_risk_clutter_elevated",
    `workflow_candidate_risk_band_${riskBand}`,
  ];
  if (familySplitRequired) {
    riskReasonCodes.push("workflow_candidate_risk_family_split_required");
  }

  return {
    workflowCandidateScoringSchemaVersion: WORKFLOW_CANDIDATE_SCORING_SCHEMA_VERSION,
    workflowCandidateScoringPolicyVersion: WORKFLOW_CANDIDATE_SCORING_POLICY_VERSION,
    workflowCandidateScoringEligible: true,
    workflowCandidateScoreVersion: WORKFLOW_CANDIDATE_SCORE_VERSION,
    workflowCandidateConfidenceScore: confidenceScore,
    workflowCandidateUtilityScore: utilityScore,
    workflowCandidateCreationRiskScore: creationRiskScore,
    workflowCandidateSuggestionPressureScore: suggestionPressureScore,
    workflowCandidateTrustScore: trustScore,
    workflowCandidateNoveltyScore: noveltyScore,
    workflowCandidateDuplicateRiskScore: duplicateRiskScore,
    workflowCandidateStructuralStabilityRisk: structuralStabilityRisk,
    workflowCandidateParameterVolatilityRisk: parameterVolatilityRisk,
    workflowCandidateBoundaryClarityRisk: boundaryClarityRisk,
    workflowCandidateAbstractionRiskComponent: abstractionRiskComponent,
    workflowCandidateLatentExecutionHazardRisk: latentExecutionHazardRisk,
    workflowCandidateClutterRisk: clutterRisk,
    workflowCandidateUserMisalignmentRisk: userMisalignmentRisk,
    workflowCandidateCreationRiskBand: riskBand,
    workflowCandidateScoringSource: source,
    workflowCandidateScoringReasonCodes: scoringReasonCodes,
    workflowCandidateRiskReasonCodes: riskReasonCodes,
  };
}
