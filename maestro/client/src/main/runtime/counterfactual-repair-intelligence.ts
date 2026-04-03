export const COUNTERFACTUAL_REPAIR_SCHEMA_VERSION = "h3_counterfactual_repair_v1" as const;
export const COUNTERFACTUAL_REPAIR_POLICY_VERSION = "3g_counterfactual_repair_v1" as const;
export const COUNTERFACTUAL_SELECTION_FUNCTION_VERSION = "3g_selection_function_v1" as const;
export const COUNTERFACTUAL_AMBIGUITY_PILOT_VERSION = "3g_nearest_alternative_ambiguity_v1" as const;
export const COUNTERFACTUAL_AMBIGUITY_MAX_SCORE_GAP = 0.12 as const;
export const COUNTERFACTUAL_REPAIR_SIGNAL_PILOT_VERSION = "3g_repair_signal_pilot_v1" as const;
export const COUNTERFACTUAL_RANKING_GUARDRAIL_PILOT_VERSION = "3g_counterfactual_ranking_guardrail_v1" as const;
export const COUNTERFACTUAL_COUNTEREXAMPLE_FORMAT_VERSION = "3g_counterexample_format_v1" as const;
export const COUNTERFACTUAL_ANTIBODY_PILOT_VERSION = "3g_antibody_counterexample_pilot_v1" as const;

export interface CounterfactualRepairSeed {
  semanticAddressId: string | null;
  canonicalMergedText: string | null;
  regionId: string | null;
  commandClass: string | null;
  parameterType: "numeric" | "open" | null;
  transcriptText?: string | null;
  eventName?: string | null;
  reason?: string | null;
  finalGranted?: boolean | null;
}

interface CounterfactualPopulationCandidate {
  semanticAddressId: string;
  canonicalMergedText: string;
  normalizedScore: number;
}

interface CounterfactualAmbiguityPilot {
  applied: boolean;
  primaryScore: number | null;
  alternativeScore: number | null;
  scoreGap: number | null;
  escalationSuggested: boolean;
  escalationKind: "hold_for_tail" | "request_disambiguation" | "none" | null;
  reasonCodes: string[];
}

interface CounterfactualRepairSignalPilot {
  applied: boolean;
  trajectoryState: "restart" | "reversal" | "steady" | null;
  abortedTrajectoryDetected: boolean;
  directionReversalDetected: boolean;
  selfCorrectionDetected: boolean;
  repairWindowOpen: boolean;
  escalationSuggested: boolean;
  escalationKind: "hold_for_repair" | "continue_observing" | "none" | null;
  reasonCodes: string[];
}
interface CounterfactualRankingGuardrailPilot {
  applied: boolean;
  primaryScore: number | null;
  alternativeScore: number | null;
  scoreGap: number | null;
  stressAdjusted: boolean;
  repairAdjusted: boolean;
  guardrailSuggested: boolean;
  guardrailKind: "hold_for_repair" | "request_disambiguation" | "continue_observing" | null;
  reasonCodes: string[];
}

interface CounterfactualAntibodyPilot {
  applied: boolean;
  counterexampleEventClass: "recognition_rejection" | "recognition_failure" | null;
  counterexampleSignature: string | null;
  counterexampleTranscriptDigest: string | null;
  antibodyMintSuggested: boolean;
  antibodyMintKey: string | null;
  antibodyQuarantineSuggested: boolean;
  antibodyQuarantineBand: "degraded" | "quarantine" | null;
  antibodyValidationGateHint: "protocol_gate" | "negative_gate" | null;
  reasonCodes: string[];
}

export interface CounterfactualRepairEvidenceFields {
  counterfactualRepairSchemaVersion: string | null;
  counterfactualRepairPolicyVersion: string | null;
  counterfactualRepairEligible: boolean | null;
  counterfactualRepairPrimarySemanticAddressId: string | null;
  counterfactualRepairNearestAlternativeSemanticAddressId: string | null;
  counterfactualRepairNearestAlternativeCanonicalMergedText: string | null;
  counterfactualRepairAmbiguityBand: "low" | "medium" | "high" | null;
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
  counterfactualRepairStressBand: "nominal" | "elevated" | "critical" | null;
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
}

export function deriveCounterfactualRepairEvidenceFields(
  seed: CounterfactualRepairSeed | null | undefined
): CounterfactualRepairEvidenceFields {
  const semanticAddressId = seed?.semanticAddressId ?? null;
  const canonicalMergedText = seed?.canonicalMergedText?.trim() ?? null;
  const transcriptText = seed?.transcriptText ?? null;
  const eventName = seed?.eventName ?? null;
  const reason = seed?.reason ?? null;
  const finalGranted = seed?.finalGranted ?? null;
  const hasFailureObservation = isFailureObservation(eventName, reason, finalGranted);

  if (!semanticAddressId || !canonicalMergedText) {
    const counterexampleKind = hasFailureObservation ? deriveCounterexampleKind(eventName, reason) : null;
    const counterexampleCaptured = counterexampleKind !== null;
    const antibodyEligible = counterexampleCaptured;
    return {
      counterfactualRepairSchemaVersion: COUNTERFACTUAL_REPAIR_SCHEMA_VERSION,
      counterfactualRepairPolicyVersion: COUNTERFACTUAL_REPAIR_POLICY_VERSION,
      counterfactualRepairEligible: hasFailureObservation,
      counterfactualRepairPrimarySemanticAddressId: null,
      counterfactualRepairNearestAlternativeSemanticAddressId: null,
      counterfactualRepairNearestAlternativeCanonicalMergedText: null,
      counterfactualRepairAmbiguityBand: null,
      counterfactualRepairRepairEligible: false,
      counterfactualRepairRepairSignal: null,
      counterfactualRepairSelectionFunctionVersion: hasFailureObservation ? COUNTERFACTUAL_SELECTION_FUNCTION_VERSION : null,
      counterfactualRepairCandidatePopulationSize: 0,
      counterfactualRepairTopCandidateSemanticAddressIds: null,
      counterfactualRepairTopCandidateNormalizedScores: null,
      counterfactualRepairSelectionWinnerSemanticAddressId: null,
      counterfactualRepairDeadDetected: false,
      counterfactualRepairDeadReason: null,
      counterfactualRepairCounterexampleCaptured: counterexampleCaptured,
      counterfactualRepairCounterexampleKind: counterexampleKind,
      counterfactualRepairAntibodyEligible: antibodyEligible,
      counterfactualRepairAntibodyHint: antibodyEligible && counterexampleKind ? `antibody_placeholder_${counterexampleKind}` : null,
      counterfactualRepairStressEvent: counterexampleCaptured ? 'metabolic_stress_observed' : null,
      counterfactualRepairStressBand: counterexampleCaptured ? 'critical' : null,
      counterfactualRepairOuroborosEvent: counterexampleCaptured ? 'ouroboros_failure_observed' : null,
      counterfactualRepairSource: hasFailureObservation ? 'failure_observer' : 'none',
      counterfactualRepairReasonCodes: hasFailureObservation
        ? [
            'counterfactual_not_eligible',
            'counterfactual_failure_observation',
            counterexampleKind ? `counterfactual_counterexample_${counterexampleKind}` : 'counterfactual_counterexample_none',
          ]
        : ['counterfactual_not_eligible'],
      counterfactualRepairAmbiguityPilotVersion: hasFailureObservation ? COUNTERFACTUAL_AMBIGUITY_PILOT_VERSION : null,
      counterfactualRepairAmbiguityPilotApplied: false,
      counterfactualRepairAmbiguityPrimaryScore: null,
      counterfactualRepairAmbiguityAlternativeScore: null,
      counterfactualRepairAmbiguityScoreGap: null,
      counterfactualRepairAmbiguityEscalationSuggested: false,
      counterfactualRepairAmbiguityEscalationKind: null,
      counterfactualRepairAmbiguityReasonCodes: hasFailureObservation ? ['counterfactual_ambiguity_not_eligible'] : null,
      counterfactualRepairSignalPilotVersion: hasFailureObservation ? COUNTERFACTUAL_REPAIR_SIGNAL_PILOT_VERSION : null,
      counterfactualRepairSignalPilotApplied: false,
      counterfactualRepairSignalTrajectoryState: null,
      counterfactualRepairSignalAbortedTrajectoryDetected: false,
      counterfactualRepairSignalDirectionReversalDetected: false,
      counterfactualRepairSignalSelfCorrectionDetected: false,
      counterfactualRepairSignalRepairWindowOpen: false,
      counterfactualRepairSignalEscalationSuggested: false,
      counterfactualRepairSignalEscalationKind: null,
      counterfactualRepairSignalReasonCodes: hasFailureObservation ? ['counterfactual_repair_signal_not_eligible'] : null,
      counterfactualRepairRankingPilotVersion: null,
      counterfactualRepairRankingPilotApplied: false,
      counterfactualRepairRankingPrimaryScore: null,
      counterfactualRepairRankingAlternativeScore: null,
      counterfactualRepairRankingScoreGap: null,
      counterfactualRepairRankingStressAdjusted: false,
      counterfactualRepairRankingRepairAdjusted: false,
      counterfactualRepairRankingGuardrailSuggested: false,
      counterfactualRepairRankingGuardrailKind: null,
      counterfactualRepairRankingReasonCodes: hasFailureObservation ? ['counterfactual_ranking_not_eligible'] : null,
      counterfactualRepairCounterexampleFormatVersion: hasFailureObservation ? COUNTERFACTUAL_COUNTEREXAMPLE_FORMAT_VERSION : null,
      counterfactualRepairAntibodyPilotVersion: hasFailureObservation ? COUNTERFACTUAL_ANTIBODY_PILOT_VERSION : null,
      counterfactualRepairAntibodyPilotApplied: hasFailureObservation && counterexampleCaptured,
      counterfactualRepairCounterexampleEventClass: counterexampleKind,
      counterfactualRepairCounterexampleSignature: counterexampleCaptured ? buildCounterexampleSignature(counterexampleKind, transcriptText, reason) : null,
      counterfactualRepairCounterexampleTranscriptDigest: counterexampleCaptured ? buildCounterexampleTranscriptDigest(transcriptText) : null,
      counterfactualRepairAntibodyMintSuggested: counterexampleCaptured,
      counterfactualRepairAntibodyMintKey: counterexampleCaptured ? buildAntibodyMintKey(counterexampleKind, transcriptText) : null,
      counterfactualRepairAntibodyQuarantineSuggested: counterexampleKind === 'recognition_failure',
      counterfactualRepairAntibodyQuarantineBand: counterexampleKind === 'recognition_failure' ? 'quarantine' : counterexampleCaptured ? 'degraded' : null,
      counterfactualRepairAntibodyValidationGateHint: counterexampleKind === 'recognition_failure' ? 'negative_gate' : counterexampleCaptured ? 'protocol_gate' : null,
      counterfactualRepairAntibodyPilotReasonCodes: hasFailureObservation
        ? deriveCounterfactualAntibodyPilot(counterexampleKind, transcriptText, reason).reasonCodes
        : null,
    };
  }

  const normalized = canonicalMergedText.toLowerCase();
  const alternative = deriveNearestAlternative(semanticAddressId, normalized);
  const repairSignal = deriveRepairSignal(transcriptText, normalized);
  const ambiguityBand = deriveAmbiguityBand(normalized, alternative != null);
  const repairEligible = repairSignal !== null || ambiguityBand === 'high';
  const population = deriveCandidatePopulation(semanticAddressId, normalized, alternative);
  const winner = selectCounterfactualWinner(population);
  const deadObservation = deriveDeadObservation(repairSignal, eventName, reason);
  const counterexampleKind = deriveCounterexampleKind(eventName, reason, deadObservation.reason);
  const counterexampleCaptured = counterexampleKind !== null;
  const antibodyEligible = counterexampleCaptured;
  const stressBand = deriveStressBand(deadObservation.detected, counterexampleCaptured, ambiguityBand);
  const stressEvent = deriveStressEvent(counterexampleCaptured, deadObservation.detected, ambiguityBand);
  const ouroborosEvent = deriveOuroborosEvent(counterexampleCaptured, deadObservation.detected);
  const ambiguityPilot = deriveAmbiguityPilot(population, ambiguityBand, repairSignal);
  const repairSignalPilot = deriveRepairSignalPilot(repairSignal, deadObservation);
  const rankingGuardrailPilot = deriveCounterfactualRankingGuardrailPilot(population, ambiguityPilot, repairSignalPilot, stressBand);
  const antibodyPilot = deriveCounterfactualAntibodyPilot(counterexampleKind, transcriptText, reason);

  return {
    counterfactualRepairSchemaVersion: COUNTERFACTUAL_REPAIR_SCHEMA_VERSION,
    counterfactualRepairPolicyVersion: COUNTERFACTUAL_REPAIR_POLICY_VERSION,
    counterfactualRepairEligible: true,
    counterfactualRepairPrimarySemanticAddressId: semanticAddressId,
    counterfactualRepairNearestAlternativeSemanticAddressId: alternative?.semanticAddressId ?? null,
    counterfactualRepairNearestAlternativeCanonicalMergedText: alternative?.canonicalMergedText ?? null,
    counterfactualRepairAmbiguityBand: ambiguityBand,
    counterfactualRepairRepairEligible: repairEligible,
    counterfactualRepairRepairSignal: repairSignal,
    counterfactualRepairSelectionFunctionVersion: COUNTERFACTUAL_SELECTION_FUNCTION_VERSION,
    counterfactualRepairCandidatePopulationSize: population.length,
    counterfactualRepairTopCandidateSemanticAddressIds: population.map((candidate) => candidate.semanticAddressId),
    counterfactualRepairTopCandidateNormalizedScores: population.map((candidate) => candidate.normalizedScore),
    counterfactualRepairSelectionWinnerSemanticAddressId: winner?.semanticAddressId ?? null,
    counterfactualRepairDeadDetected: deadObservation.detected,
    counterfactualRepairDeadReason: deadObservation.reason,
    counterfactualRepairCounterexampleCaptured: counterexampleCaptured,
    counterfactualRepairCounterexampleKind: counterexampleKind,
    counterfactualRepairAntibodyEligible: antibodyEligible,
    counterfactualRepairAntibodyHint: antibodyEligible && counterexampleKind ? `antibody_placeholder_${counterexampleKind}` : null,
    counterfactualRepairStressEvent: stressEvent,
    counterfactualRepairStressBand: stressBand,
    counterfactualRepairOuroborosEvent: ouroborosEvent,
    counterfactualRepairSource: hasFailureObservation ? 'heuristic_shadow_with_failure_observer' : 'heuristic_shadow',
    counterfactualRepairReasonCodes: [
      `counterfactual_primary_${normalizeReasonToken(semanticAddressId)}`,
      alternative ? `counterfactual_alt_${normalizeReasonToken(alternative.semanticAddressId)}` : 'counterfactual_alt_none',
      `counterfactual_population_${population.length}`,
      `counterfactual_ambiguity_${ambiguityBand}`,
      repairSignal ? `counterfactual_repair_${repairSignal}` : 'counterfactual_repair_none',
      deadObservation.detected && deadObservation.reason
        ? `counterfactual_dead_${normalizeReasonToken(deadObservation.reason)}`
        : 'counterfactual_dead_none',
      counterexampleKind
        ? `counterfactual_counterexample_${normalizeReasonToken(counterexampleKind)}`
        : 'counterfactual_counterexample_none',
      stressEvent ? `counterfactual_stress_${normalizeReasonToken(stressEvent)}` : 'counterfactual_stress_none',
    ],
    counterfactualRepairAmbiguityPilotVersion: COUNTERFACTUAL_AMBIGUITY_PILOT_VERSION,
    counterfactualRepairAmbiguityPilotApplied: ambiguityPilot.applied,
    counterfactualRepairAmbiguityPrimaryScore: ambiguityPilot.primaryScore,
    counterfactualRepairAmbiguityAlternativeScore: ambiguityPilot.alternativeScore,
    counterfactualRepairAmbiguityScoreGap: ambiguityPilot.scoreGap,
    counterfactualRepairAmbiguityEscalationSuggested: ambiguityPilot.escalationSuggested,
    counterfactualRepairAmbiguityEscalationKind: ambiguityPilot.escalationKind,
    counterfactualRepairAmbiguityReasonCodes: ambiguityPilot.reasonCodes,
    counterfactualRepairSignalPilotVersion: COUNTERFACTUAL_REPAIR_SIGNAL_PILOT_VERSION,
    counterfactualRepairSignalPilotApplied: repairSignalPilot.applied,
    counterfactualRepairSignalTrajectoryState: repairSignalPilot.trajectoryState,
    counterfactualRepairSignalAbortedTrajectoryDetected: repairSignalPilot.abortedTrajectoryDetected,
    counterfactualRepairSignalDirectionReversalDetected: repairSignalPilot.directionReversalDetected,
    counterfactualRepairSignalSelfCorrectionDetected: repairSignalPilot.selfCorrectionDetected,
    counterfactualRepairSignalRepairWindowOpen: repairSignalPilot.repairWindowOpen,
    counterfactualRepairSignalEscalationSuggested: repairSignalPilot.escalationSuggested,
    counterfactualRepairSignalEscalationKind: repairSignalPilot.escalationKind,
    counterfactualRepairSignalReasonCodes: repairSignalPilot.reasonCodes,
    counterfactualRepairRankingPilotVersion: COUNTERFACTUAL_RANKING_GUARDRAIL_PILOT_VERSION,
    counterfactualRepairRankingPilotApplied: rankingGuardrailPilot.applied,
    counterfactualRepairRankingPrimaryScore: rankingGuardrailPilot.primaryScore,
    counterfactualRepairRankingAlternativeScore: rankingGuardrailPilot.alternativeScore,
    counterfactualRepairRankingScoreGap: rankingGuardrailPilot.scoreGap,
    counterfactualRepairRankingStressAdjusted: rankingGuardrailPilot.stressAdjusted,
    counterfactualRepairRankingRepairAdjusted: rankingGuardrailPilot.repairAdjusted,
    counterfactualRepairRankingGuardrailSuggested: rankingGuardrailPilot.guardrailSuggested,
    counterfactualRepairRankingGuardrailKind: rankingGuardrailPilot.guardrailKind,
    counterfactualRepairRankingReasonCodes: rankingGuardrailPilot.reasonCodes,
    counterfactualRepairCounterexampleFormatVersion: COUNTERFACTUAL_COUNTEREXAMPLE_FORMAT_VERSION,
    counterfactualRepairAntibodyPilotVersion: COUNTERFACTUAL_ANTIBODY_PILOT_VERSION,
    counterfactualRepairAntibodyPilotApplied: antibodyPilot.applied,
    counterfactualRepairCounterexampleEventClass: antibodyPilot.counterexampleEventClass,
    counterfactualRepairCounterexampleSignature: antibodyPilot.counterexampleSignature,
    counterfactualRepairCounterexampleTranscriptDigest: antibodyPilot.counterexampleTranscriptDigest,
    counterfactualRepairAntibodyMintSuggested: antibodyPilot.antibodyMintSuggested,
    counterfactualRepairAntibodyMintKey: antibodyPilot.antibodyMintKey,
    counterfactualRepairAntibodyQuarantineSuggested: antibodyPilot.antibodyQuarantineSuggested,
    counterfactualRepairAntibodyQuarantineBand: antibodyPilot.antibodyQuarantineBand,
    counterfactualRepairAntibodyValidationGateHint: antibodyPilot.antibodyValidationGateHint,
    counterfactualRepairAntibodyPilotReasonCodes: antibodyPilot.reasonCodes,
  };
}

function deriveNearestAlternative(
  semanticAddressId: string,
  canonicalMergedText: string
): { semanticAddressId: string; canonicalMergedText: string } | null {
  if (canonicalMergedText.startsWith('open ')) {
    const tail = canonicalMergedText.slice(5).trim();
    return {
      semanticAddressId: `${semanticAddressId}_counterfactual_go_to`,
      canonicalMergedText: tail ? `go to ${tail}` : 'go to target',
    };
  }
  if (canonicalMergedText.startsWith('go to ')) {
    const tail = canonicalMergedText.slice(6).trim();
    return {
      semanticAddressId: `${semanticAddressId}_counterfactual_open`,
      canonicalMergedText: tail ? `open ${tail}` : 'open target',
    };
  }
  if (canonicalMergedText.startsWith('focus ')) {
    const tail = canonicalMergedText.slice(6).trim();
    return {
      semanticAddressId: `${semanticAddressId}_counterfactual_open`,
      canonicalMergedText: tail ? `open ${tail}` : 'open target',
    };
  }
  return null;
}

function deriveRepairSignal(transcriptText: string | null, canonicalMergedText: string): string | null {
  if (!transcriptText) {
    return null;
  }
  const normalizedTranscript = transcriptText.toLowerCase();
  if (normalizedTranscript.includes(' no ') || normalizedTranscript.includes(' actually ')) {
    return 'spoken_reversal_hint';
  }
  if (/(?:^|\s)\w{1,8}[-—]\s*\w+/.test(normalizedTranscript)) {
    return 'self_correction_hint';
  }
  if (normalizedTranscript.trim() && normalizedTranscript.trim() !== canonicalMergedText) {
    return 'transcript_merge_divergence';
  }
  return null;
}

function deriveAmbiguityBand(canonicalMergedText: string, hasAlternative: boolean): 'low' | 'medium' | 'high' {
  if (!hasAlternative) {
    return 'low';
  }
  if (canonicalMergedText.startsWith('open ') || canonicalMergedText.startsWith('go to ')) {
    return 'high';
  }
  return 'medium';
}

function deriveCandidatePopulation(
  semanticAddressId: string,
  canonicalMergedText: string,
  alternative: { semanticAddressId: string; canonicalMergedText: string } | null
): CounterfactualPopulationCandidate[] {
  const raw = [{ semanticAddressId, canonicalMergedText, rawScore: 1.0 }];
  if (alternative) {
    raw.push({
      semanticAddressId: alternative.semanticAddressId,
      canonicalMergedText: alternative.canonicalMergedText,
      rawScore: canonicalMergedText.startsWith('open ') || canonicalMergedText.startsWith('go to ') ? 0.82 : 0.7,
    });
  }
  const total = raw.reduce((sum, candidate) => sum + candidate.rawScore, 0);
  return raw
    .map((candidate) => ({
      semanticAddressId: candidate.semanticAddressId,
      canonicalMergedText: candidate.canonicalMergedText,
      normalizedScore: Number((candidate.rawScore / total).toFixed(4)),
    }))
    .sort((a, b) => b.normalizedScore - a.normalizedScore || a.semanticAddressId.localeCompare(b.semanticAddressId));
}

function selectCounterfactualWinner(
  population: CounterfactualPopulationCandidate[]
): CounterfactualPopulationCandidate | null {
  return population[0] ?? null;
}

function deriveAmbiguityPilot(
  population: CounterfactualPopulationCandidate[],
  ambiguityBand: 'low' | 'medium' | 'high',
  repairSignal: string | null
): CounterfactualAmbiguityPilot {
  const primary = population[0] ?? null;
  const alternative = population[1] ?? null;
  if (!primary || !alternative) {
    return {
      applied: false,
      primaryScore: primary?.normalizedScore ?? null,
      alternativeScore: null,
      scoreGap: null,
      escalationSuggested: false,
      escalationKind: null,
      reasonCodes: ['counterfactual_ambiguity_not_eligible'],
    };
  }
  const scoreGap = Number((primary.normalizedScore - alternative.normalizedScore).toFixed(4));
  const closeEnough = scoreGap <= COUNTERFACTUAL_AMBIGUITY_MAX_SCORE_GAP;
  const applied = closeEnough && (ambiguityBand === 'medium' || ambiguityBand === 'high');
  const escalationKind = !applied
    ? 'none'
    : ambiguityBand === 'high' || repairSignal === 'self_correction_hint'
      ? 'request_disambiguation'
      : 'hold_for_tail';
  return {
    applied,
    primaryScore: primary.normalizedScore,
    alternativeScore: alternative.normalizedScore,
    scoreGap,
    escalationSuggested: escalationKind !== 'none',
    escalationKind,
    reasonCodes: [
      closeEnough ? 'counterfactual_ambiguity_close_gap' : 'counterfactual_ambiguity_wide_gap',
      `counterfactual_ambiguity_band_${ambiguityBand}`,
      `counterfactual_ambiguity_escalation_${normalizeReasonToken(escalationKind)}`,
    ],
  };
}

function deriveRepairSignalPilot(
  repairSignal: string | null,
  deadObservation: { detected: boolean; reason: string | null }
): CounterfactualRepairSignalPilot {
  const selfCorrectionDetected = repairSignal === 'self_correction_hint';
  const directionReversalDetected = repairSignal === 'spoken_reversal_hint';
  const abortedTrajectoryDetected = deadObservation.detected;
  const applied = selfCorrectionDetected || directionReversalDetected || abortedTrajectoryDetected;
  if (!applied) {
    return {
      applied: false,
      trajectoryState: null,
      abortedTrajectoryDetected: false,
      directionReversalDetected: false,
      selfCorrectionDetected: false,
      repairWindowOpen: false,
      escalationSuggested: false,
      escalationKind: null,
      reasonCodes: ['counterfactual_repair_signal_not_eligible'],
    };
  }
  const trajectoryState = selfCorrectionDetected
    ? 'restart'
    : directionReversalDetected
      ? 'reversal'
      : 'steady';
  const escalationKind = selfCorrectionDetected || directionReversalDetected ? 'hold_for_repair' : 'continue_observing';
  return {
    applied: true,
    trajectoryState,
    abortedTrajectoryDetected,
    directionReversalDetected,
    selfCorrectionDetected,
    repairWindowOpen: abortedTrajectoryDetected,
    escalationSuggested: true,
    escalationKind,
    reasonCodes: [
      `counterfactual_repair_signal_${trajectoryState}`,
      abortedTrajectoryDetected ? 'counterfactual_repair_signal_dead_detected' : 'counterfactual_repair_signal_dead_not_detected',
      `counterfactual_repair_signal_escalation_${normalizeReasonToken(escalationKind)}`,
    ],
  };
}

function deriveCounterfactualRankingGuardrailPilot(
  population: CounterfactualPopulationCandidate[],
  ambiguityPilot: CounterfactualAmbiguityPilot,
  repairSignalPilot: CounterfactualRepairSignalPilot,
  stressBand: 'nominal' | 'elevated' | 'critical' | null
): CounterfactualRankingGuardrailPilot {
  const primary = population[0] ?? null;
  const alternative = population[1] ?? null;
  if (!primary || !alternative) {
    return {
      applied: false,
      primaryScore: primary?.normalizedScore ?? null,
      alternativeScore: null,
      scoreGap: null,
      stressAdjusted: false,
      repairAdjusted: false,
      guardrailSuggested: false,
      guardrailKind: null,
      reasonCodes: ['counterfactual_ranking_not_eligible'],
    };
  }

  const scoreGap = Number((primary.normalizedScore - alternative.normalizedScore).toFixed(4));
  const stressAdjusted = stressBand === 'elevated' || stressBand === 'critical';
  const repairAdjusted = repairSignalPilot.applied;
  const ambiguityAdjusted = ambiguityPilot.applied;
  const applied = ambiguityAdjusted || repairAdjusted || stressAdjusted;

  if (!applied) {
    return {
      applied: false,
      primaryScore: primary.normalizedScore,
      alternativeScore: alternative.normalizedScore,
      scoreGap,
      stressAdjusted,
      repairAdjusted,
      guardrailSuggested: false,
      guardrailKind: null,
      reasonCodes: ['counterfactual_ranking_not_applied'],
    };
  }

  let guardrailKind: 'hold_for_repair' | 'request_disambiguation' | 'continue_observing' = 'continue_observing';
  let guardrailSuggested = false;
  if (repairAdjusted && repairSignalPilot.repairWindowOpen) {
    guardrailKind = 'hold_for_repair';
    guardrailSuggested = true;
  } else if (ambiguityAdjusted || stressBand === 'critical') {
    guardrailKind = 'request_disambiguation';
    guardrailSuggested = true;
  }

  return {
    applied: true,
    primaryScore: primary.normalizedScore,
    alternativeScore: alternative.normalizedScore,
    scoreGap,
    stressAdjusted,
    repairAdjusted,
    guardrailSuggested,
    guardrailKind,
    reasonCodes: [
      ambiguityAdjusted ? 'counterfactual_ranking_ambiguity_adjusted' : 'counterfactual_ranking_ambiguity_not_adjusted',
      repairAdjusted ? 'counterfactual_ranking_repair_adjusted' : 'counterfactual_ranking_repair_not_adjusted',
      stressAdjusted ? `counterfactual_ranking_stress_${normalizeReasonToken(stressBand)}` : 'counterfactual_ranking_stress_not_adjusted',
      `counterfactual_ranking_guardrail_${normalizeReasonToken(guardrailKind)}`,
    ],
  };
}

function deriveDeadObservation(
  repairSignal: string | null,
  eventName: string | null,
  reason: string | null
): { detected: boolean; reason: string | null } {
  if (repairSignal === 'self_correction_hint') {
    return { detected: true, reason: 'trajectory_restart_detected' };
  }
  if (repairSignal === 'spoken_reversal_hint') {
    return { detected: true, reason: 'trajectory_reversal_detected' };
  }
  if ((eventName ?? '').includes('rejected') || (reason ?? '').toLowerCase().includes('rejected')) {
    return { detected: false, reason: null };
  }
  return { detected: false, reason: null };
}

function deriveCounterexampleKind(
  eventName: string | null,
  reason: string | null,
  _deadReason: string | null = null
): string | null {
  const normalizedEvent = (eventName ?? '').toLowerCase();
  const normalizedReason = (reason ?? '').toLowerCase();
  if (normalizedEvent.includes('rejected') || normalizedReason.includes('rejected')) {
    return 'recognition_rejection';
  }
  if (normalizedEvent.includes('failed') || normalizedReason.includes('failed') || normalizedReason.includes('failure')) {
    return 'recognition_failure';
  }
  return null;
}

function deriveCounterfactualAntibodyPilot(
  counterexampleKind: string | null,
  transcriptText: string | null,
  reason: string | null
): CounterfactualAntibodyPilot {
  if (!counterexampleKind) {
    return {
      applied: false,
      counterexampleEventClass: null,
      counterexampleSignature: null,
      counterexampleTranscriptDigest: null,
      antibodyMintSuggested: false,
      antibodyMintKey: null,
      antibodyQuarantineSuggested: false,
      antibodyQuarantineBand: null,
      antibodyValidationGateHint: null,
      reasonCodes: ['counterfactual_antibody_not_eligible'],
    };
  }

  const counterexampleEventClass = counterexampleKind === 'recognition_failure'
    ? 'recognition_failure'
    : 'recognition_rejection';
  const counterexampleSignature = buildCounterexampleSignature(counterexampleKind, transcriptText, reason);
  const counterexampleTranscriptDigest = buildCounterexampleTranscriptDigest(transcriptText);
  const antibodyMintKey = buildAntibodyMintKey(counterexampleKind, transcriptText);
  const antibodyQuarantineSuggested = counterexampleEventClass === 'recognition_failure';
  const antibodyQuarantineBand = antibodyQuarantineSuggested ? 'quarantine' : 'degraded';
  const antibodyValidationGateHint = antibodyQuarantineSuggested ? 'negative_gate' : 'protocol_gate';

  return {
    applied: true,
    counterexampleEventClass,
    counterexampleSignature,
    counterexampleTranscriptDigest,
    antibodyMintSuggested: true,
    antibodyMintKey,
    antibodyQuarantineSuggested,
    antibodyQuarantineBand,
    antibodyValidationGateHint,
    reasonCodes: [
      `counterfactual_antibody_event_${normalizeReasonToken(counterexampleEventClass)}`,
      `counterfactual_antibody_gate_${normalizeReasonToken(antibodyValidationGateHint)}`,
      `counterfactual_antibody_band_${normalizeReasonToken(antibodyQuarantineBand)}`,
    ],
  };
}

function buildCounterexampleSignature(
  counterexampleKind: string | null,
  transcriptText: string | null,
  reason: string | null
): string | null {
  if (!counterexampleKind) {
    return null;
  }
  const transcriptDigest = buildCounterexampleTranscriptDigest(transcriptText) ?? 'none';
  const reasonToken = normalizeReasonToken(reason);
  return `${normalizeReasonToken(counterexampleKind)}|${transcriptDigest}|${reasonToken}`;
}

function buildCounterexampleTranscriptDigest(transcriptText: string | null): string | null {
  const normalized = (transcriptText ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return null;
  }
  return normalizeReasonToken(normalized).slice(0, 32) || null;
}

function buildAntibodyMintKey(counterexampleKind: string | null, transcriptText: string | null): string | null {
  if (!counterexampleKind) {
    return null;
  }
  const digest = buildCounterexampleTranscriptDigest(transcriptText) ?? 'none';
  return `antibody_${normalizeReasonToken(counterexampleKind)}_${digest}`;
}

function deriveStressBand(
  deadDetected: boolean,
  counterexampleCaptured: boolean,
  ambiguityBand: 'low' | 'medium' | 'high' | null
): 'nominal' | 'elevated' | 'critical' | null {
  if (counterexampleCaptured) {
    return 'critical';
  }
  if (deadDetected || ambiguityBand === 'high') {
    return 'elevated';
  }
  return 'nominal';
}

function deriveStressEvent(
  counterexampleCaptured: boolean,
  deadDetected: boolean,
  ambiguityBand: 'low' | 'medium' | 'high' | null
): string | null {
  if (counterexampleCaptured) {
    return 'metabolic_failure_observed';
  }
  if (deadDetected) {
    return 'metabolic_repair_observed';
  }
  if (ambiguityBand === 'high') {
    return 'metabolic_ambiguity_observed';
  }
  return 'metabolic_nominal';
}

function deriveOuroborosEvent(counterexampleCaptured: boolean, deadDetected: boolean): string | null {
  if (counterexampleCaptured) {
    return 'ouroboros_failure_observed';
  }
  if (deadDetected) {
    return 'ouroboros_repair_observed';
  }
  return 'ouroboros_nominal';
}

function isFailureObservation(eventName: string | null, reason: string | null, finalGranted: boolean | null): boolean {
  const normalizedEvent = (eventName ?? '').toLowerCase();
  const normalizedReason = (reason ?? '').toLowerCase();
  return (
    normalizedEvent.includes('rejected') ||
    normalizedEvent.includes('failed') ||
    normalizedReason.includes('rejected') ||
    normalizedReason.includes('failed') ||
    normalizedReason.includes('failure') ||
    finalGranted === false
  );
}

function normalizeReasonToken(value: string | null): string {
  return (value ?? 'none').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
