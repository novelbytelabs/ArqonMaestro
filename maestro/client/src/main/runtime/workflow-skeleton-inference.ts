export const WORKFLOW_SKELETON_INFERENCE_SCHEMA_VERSION =
  "3j_workflow_skeleton_inference_v1";
export const WORKFLOW_SKELETON_INFERENCE_POLICY_VERSION =
  "3j_bounded_skeleton_inference_v1";

export interface WorkflowSkeletonInferenceState {
  familyVariants: Record<string, string[][]>;
}

export interface WorkflowSkeletonInferenceInput {
  discoverySequenceSemanticAddressIds?: string[] | null;
  discoveryPatternKey?: string | null;
  discoveryThresholdMet?: boolean | null;
  source?: string | null;
  previousState?: WorkflowSkeletonInferenceState | null;
}

export interface WorkflowSkeletonInferenceFields {
  workflowSkeletonInferenceSchemaVersion: string | null;
  workflowSkeletonInferencePolicyVersion: string | null;
  workflowSkeletonInferenceEligible: boolean | null;
  workflowSkeletonInferenceFamilyKey: string | null;
  workflowSkeletonInferencePatternKey: string | null;
  workflowSkeletonInferenceCanonicalStepSemanticAddressIds: string[] | null;
  workflowSkeletonInferenceFixedStepIndices: number[] | null;
  workflowSkeletonInferenceVariableStepIndices: number[] | null;
  workflowSkeletonInferenceOptionalStepIndices: number[] | null;
  workflowSkeletonInferenceInferredSlotCount: number | null;
  workflowSkeletonInferenceGeneralizationConfidence: number | null;
  workflowSkeletonInferenceAbstractionEligible: boolean | null;
  workflowSkeletonInferenceFamilyVariantCount: number | null;
  workflowSkeletonInferenceFamilySplitRequired: boolean | null;
  workflowSkeletonInferenceGovernedStateUpdated: boolean | null;
  workflowSkeletonInferenceSource: string | null;
  workflowSkeletonInferenceReasonCodes: string[] | null;
  nextState?: WorkflowSkeletonInferenceState;
}

export function deriveEmptyWorkflowSkeletonInferenceState(): WorkflowSkeletonInferenceState {
  return { familyVariants: {} };
}

function cloneState(previousState?: WorkflowSkeletonInferenceState | null): WorkflowSkeletonInferenceState {
  const safe = previousState ?? deriveEmptyWorkflowSkeletonInferenceState();
  const familyVariants: Record<string, string[][]> = {};
  for (const familyKey of Object.keys(safe.familyVariants ?? {})) {
    const variants = safe.familyVariants[familyKey];
    familyVariants[familyKey] = Array.isArray(variants)
      ? variants.map((variant) => variant.slice())
      : [];
  }
  return {
    familyVariants,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function sequencesEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function removeAt(sequence: string[], indexToRemove: number): string[] {
  return sequence.filter((_, index) => index !== indexToRemove);
}

function canonicalFamilyKey(sequence: string[]): string {
  if (!sequence.length) {
    return "workflow_skeleton_inference_empty_family";
  }
  return `${sequence[0]}=>${sequence[sequence.length - 1]}`;
}

function dedupeVariants(variants: string[][]): string[][] {
  const seen = new Set<string>();
  const unique: string[][] = [];
  for (const variant of variants) {
    const key = variant.join("::");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(variant.slice());
  }
  return unique;
}

function analyzeVariants(variants: string[][], currentSequence: string[]) {
  const uniqueVariants = dedupeVariants(variants);
  const familyVariantCount = uniqueVariants.length;
  const canonical = currentSequence.slice();
  const fixedStepIndices: number[] = [];
  const variableStepIndices: number[] = [];
  const optionalStepIndices: number[] = [];
  let inferredSlotCount = 0;
  let generalizationConfidence = 0.0;
  let abstractionEligible = true;
  let familySplitRequired = false;
  const reasonCodes: string[] = [];

  if (familyVariantCount === 1) {
    fixedStepIndices.push(...canonical.map((_, index) => index));
    generalizationConfidence = 0.86;
    reasonCodes.push(
      "workflow_skeleton_inference_exact_family",
      "workflow_skeleton_inference_all_steps_fixed"
    );
    return {
      canonical,
      fixedStepIndices,
      variableStepIndices,
      optionalStepIndices,
      inferredSlotCount,
      generalizationConfidence,
      abstractionEligible,
      familyVariantCount,
      familySplitRequired,
      reasonCodes,
    };
  }

  const longest = uniqueVariants.reduce((best, candidate) =>
    candidate.length > best.length ? candidate : best
  );
  let optionalIndex: number | null = null;
  for (let index = 0; index < longest.length; index += 1) {
    const withoutIndex = removeAt(longest, index);
    const optionalCompatible = uniqueVariants.every((variant) =>
      sequencesEqual(variant, longest) || sequencesEqual(variant, withoutIndex)
    );
    if (optionalCompatible) {
      optionalIndex = index;
      break;
    }
  }

  if (optionalIndex !== null) {
    const canonicalOptional = longest.slice();
    const fixed = canonicalOptional
      .map((_, index) => index)
      .filter((index) => index !== optionalIndex);
    generalizationConfidence = 0.74;
    reasonCodes.push(
      "workflow_skeleton_inference_optional_step_detected",
      "workflow_skeleton_inference_bounded_optional_family"
    );
    return {
      canonical: canonicalOptional,
      fixedStepIndices: fixed,
      variableStepIndices,
      optionalStepIndices: [optionalIndex],
      inferredSlotCount,
      generalizationConfidence,
      abstractionEligible,
      familyVariantCount,
      familySplitRequired,
      reasonCodes,
    };
  }

  const sameLength = uniqueVariants.every((variant) => variant.length === uniqueVariants[0].length);
  if (sameLength) {
    const length = uniqueVariants[0].length;
    const differingIndices: number[] = [];
    for (let index = 0; index < length; index += 1) {
      const values = new Set(uniqueVariants.map((variant) => variant[index]));
      if (values.size === 1) {
        fixedStepIndices.push(index);
      } else {
        differingIndices.push(index);
      }
    }
    if (differingIndices.length === 1) {
      variableStepIndices.push(differingIndices[0]);
      inferredSlotCount = 1;
      generalizationConfidence = 0.7;
      reasonCodes.push(
        "workflow_skeleton_inference_single_variable_position",
        "workflow_skeleton_inference_bounded_slot_foundation"
      );
      return {
        canonical,
        fixedStepIndices,
        variableStepIndices,
        optionalStepIndices,
        inferredSlotCount,
        generalizationConfidence,
        abstractionEligible,
        familyVariantCount,
        familySplitRequired,
        reasonCodes,
      };
    }
  }

  const maxLength = Math.max(...uniqueVariants.map((variant) => variant.length));
  for (let index = 0; index < maxLength; index += 1) {
    const presentValues = uniqueVariants
      .filter((variant) => index < variant.length)
      .map((variant) => variant[index]);
    if (!presentValues.length) {
      continue;
    }
    if (presentValues.length === uniqueVariants.length && new Set(presentValues).size === 1) {
      fixedStepIndices.push(index);
    }
  }

  abstractionEligible = false;
  familySplitRequired = true;
  generalizationConfidence = 0.46;
  reasonCodes.push(
    "workflow_skeleton_inference_family_split_required",
    "workflow_skeleton_inference_abstraction_not_yet_stable"
  );

  return {
    canonical,
    fixedStepIndices,
    variableStepIndices,
    optionalStepIndices,
    inferredSlotCount,
    generalizationConfidence,
    abstractionEligible,
    familyVariantCount,
    familySplitRequired,
    reasonCodes,
  };
}

export function deriveWorkflowSkeletonInference(
  input: WorkflowSkeletonInferenceInput
): WorkflowSkeletonInferenceFields {
  const discoverySequenceSemanticAddressIds = input.discoverySequenceSemanticAddressIds ?? null;
  const discoveryPatternKey = input.discoveryPatternKey ?? null;
  const discoveryThresholdMet = input.discoveryThresholdMet ?? null;
  const source = input.source ?? "h3_runtime_evidence";
  const nextState = cloneState(input.previousState ?? null);

  if (!discoveryThresholdMet || !Array.isArray(discoverySequenceSemanticAddressIds) || !discoverySequenceSemanticAddressIds.length) {
    return {
      workflowSkeletonInferenceSchemaVersion: WORKFLOW_SKELETON_INFERENCE_SCHEMA_VERSION,
      workflowSkeletonInferencePolicyVersion: WORKFLOW_SKELETON_INFERENCE_POLICY_VERSION,
      workflowSkeletonInferenceEligible: false,
      workflowSkeletonInferenceFamilyKey: null,
      workflowSkeletonInferencePatternKey: discoveryPatternKey,
      workflowSkeletonInferenceCanonicalStepSemanticAddressIds: null,
      workflowSkeletonInferenceFixedStepIndices: null,
      workflowSkeletonInferenceVariableStepIndices: null,
      workflowSkeletonInferenceOptionalStepIndices: null,
      workflowSkeletonInferenceInferredSlotCount: null,
      workflowSkeletonInferenceGeneralizationConfidence: null,
      workflowSkeletonInferenceAbstractionEligible: false,
      workflowSkeletonInferenceFamilyVariantCount: null,
      workflowSkeletonInferenceFamilySplitRequired: false,
      workflowSkeletonInferenceGovernedStateUpdated: false,
      workflowSkeletonInferenceSource: source,
      workflowSkeletonInferenceReasonCodes: ["workflow_skeleton_inference_discovery_threshold_not_met"],
      nextState,
    };
  }

  const familyKey = canonicalFamilyKey(discoverySequenceSemanticAddressIds);
  const familyVariants = nextState.familyVariants[familyKey]
    ? nextState.familyVariants[familyKey].map((variant) => variant.slice())
    : [];
  familyVariants.push(discoverySequenceSemanticAddressIds.slice());
  nextState.familyVariants[familyKey] = dedupeVariants(familyVariants);

  const analysis = analyzeVariants(nextState.familyVariants[familyKey], discoverySequenceSemanticAddressIds);

  return {
    workflowSkeletonInferenceSchemaVersion: WORKFLOW_SKELETON_INFERENCE_SCHEMA_VERSION,
    workflowSkeletonInferencePolicyVersion: WORKFLOW_SKELETON_INFERENCE_POLICY_VERSION,
    workflowSkeletonInferenceEligible: true,
    workflowSkeletonInferenceFamilyKey: familyKey,
    workflowSkeletonInferencePatternKey: discoveryPatternKey,
    workflowSkeletonInferenceCanonicalStepSemanticAddressIds: analysis.canonical,
    workflowSkeletonInferenceFixedStepIndices: analysis.fixedStepIndices,
    workflowSkeletonInferenceVariableStepIndices: analysis.variableStepIndices,
    workflowSkeletonInferenceOptionalStepIndices: analysis.optionalStepIndices,
    workflowSkeletonInferenceInferredSlotCount: analysis.inferredSlotCount,
    workflowSkeletonInferenceGeneralizationConfidence: Number(clamp01(analysis.generalizationConfidence).toFixed(2)),
    workflowSkeletonInferenceAbstractionEligible: analysis.abstractionEligible,
    workflowSkeletonInferenceFamilyVariantCount: analysis.familyVariantCount,
    workflowSkeletonInferenceFamilySplitRequired: analysis.familySplitRequired,
    workflowSkeletonInferenceGovernedStateUpdated: true,
    workflowSkeletonInferenceSource: source,
    workflowSkeletonInferenceReasonCodes: [
      "workflow_skeleton_inference_governed_family_evaluated",
      ...analysis.reasonCodes,
      ...(analysis.abstractionEligible
        ? ["workflow_skeleton_inference_abstraction_eligible"]
        : ["workflow_skeleton_inference_abstraction_not_eligible_yet"]),
    ],
    nextState,
  };
}
