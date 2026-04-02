import * as crypto from "crypto";
import { normalizeNumericTail } from "../stream/numeric-tail-normalizer";
import { normalizeOpenTail } from "../stream/open-tail-normalizer";
import {
  FocusConditionedCommandContextEnvelope,
  deriveFocusContextLegalityAssessment,
  deriveFocusContextRankingAdjustment,
  deriveFocusContextTaskMomentumAssessment,
} from "./focus-conditioned-command-context";
import {
  PolicyShapedAtlasShardHint,
  derivePolicyShapedAtlasShardLookupNarrowing,
  derivePolicyShapedAtlasShardRankingAdjustment,
} from "./policy-shaped-atlas-shards";

export type SemanticCommandFamily =
  | "reflex"
  | "closed_structure"
  | "parameterized_numeric"
  | "parameterized_open";

export interface SemanticAddressRecord {
  semanticAddressId: string;
  schemaVersion: "h3_voice_semantic_address_v1";
  createdAtMs: number;
  updatedAtMs: number;
  source: "spectral_manifold";
  atlasVersion: string;
  atlasSchema: string;
  regionId: string;
  commandClass: string;
  parameterType: "numeric" | "open" | null;
  commandFamily: SemanticCommandFamily;
  canonicalPrefix: string;
  canonicalMergedText: string;
  slotSignature: string;
  geometricSignatureWords: number[];
  captureRadius: number;
  minFrames: number;
  activationThreshold: number;
  successCount: number;
  lastSuccessChunkId: string;
  lastSuccessSessionId: string | null;
  conflictCount: number;
  lastConflictAtMs: number | null;
  governanceVersion: { h23: string; h24: string };
  governanceQualified: boolean;
  evictionScore: number;
}

interface WarmPolicyProfile {
  weakThreshold: number;
  strongThreshold: number;
  decayFloor: number;
  staleMs: number;
  recentConflictMultiplier: number;
}

interface PendingGeometricContext {
  chunkId: string;
  source: "spectral_manifold";
  regionId: string;
  commandClass: string;
  parameterType: "numeric" | "open" | null;
  atlasVersion: string;
  atlasSchema: string;
  confidence: number;
  frameCount: number;
  updatedAtMs: number;
}

interface RegistrationInput {
  chunkId: string;
  transcript: string;
  policyGranted: boolean;
  h23StepCount: number;
  h24FinalGranted: boolean | null;
  sessionId?: string;
}

interface LookupInput {
  chunkId: string;
  regionId: string;
  parameterType: "numeric" | "open" | null;
  transcriptTailHint?: string;
  atlasVersion?: string;
  atlasSchema?: string;
  forceCandidateScan?: boolean;
  focusContextEnvelope?: FocusConditionedCommandContextEnvelope | null;
  atlasShardHint?: PolicyShapedAtlasShardHint | null;
}

export interface LookupResult {
  lookupCandidateCount: number;
  bestCandidateId: string | null;
  bestCandidateScore: number | null;
  bestCanonicalMergedText: string | null;
  warmHitClass: "strong" | "weak" | "miss";
  lookupPath: "slot_signature_index" | "candidate_scan" | "none";
  slotSignature: string | null;
  atlasCompatible: boolean;
  mismatchReason: string | null;
  confidencePolicyVersion: string;
  weakThreshold: number;
  strongThreshold: number;
  candidateAgeMs: number | null;
  recentConflictPenaltyApplied: boolean;
  staleProtectionApplied: boolean;
  focusRankingApplied: boolean;
  focusRankingBoost: number;
  focusRankingReasonCodes: string[];
  focusLegalityApplied: boolean;
  focusLegalityLawful: boolean | null;
  focusLegalityPenaltyApplied: boolean;
  focusLegalityPenalty: number;
  focusLegalityReasonCodes: string[];
  focusLegalityCommandKind: string | null;
  focusTaskMomentumApplied?: boolean;
  focusTaskMomentumBoost?: number;
  focusTaskMomentumPenaltyApplied?: boolean;
  focusTaskMomentumPenalty?: number;
  focusTaskMomentumReasonCodes?: string[];
  focusTaskMomentumMatchedSemanticAddressId?: string | null;
  atlasShardRankingApplied: boolean;
  atlasShardRankingBoost: number;
  atlasShardRankingReasonCodes: string[];
  atlasShardRankingCandidateKind: string | null;
  atlasShardNarrowingApplied?: boolean;
  atlasShardNarrowingFallbackUsed?: boolean;
  atlasShardNarrowingCandidateCountBefore?: number;
  atlasShardNarrowingCandidateCountAfter?: number;
  atlasShardNarrowingReasonCodes?: string[];
  atlasShardNarrowingAllowedCandidateKinds?: string[] | null;
}

const V1_REGION_IDS = new Set(["pause", "new tab", "go to line", "go to", "open"]);
const SCHEMA_VERSION = "h3_voice_semantic_address_v1" as const;
const H23_VERSION = "h23_live_trace_v1";
const H24_VERSION = "h24_policy_proof_v1";
export const VOICE_SEMANTIC_WARM_POLICY_VERSION = "3d3_conflict_aware_warm_confidence_v1";
export const VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD = 0.78;
export const VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD = 0.93;
export const VOICE_SEMANTIC_WARM_DECAY_WINDOW_MS = 5 * 60 * 1000;
export const VOICE_SEMANTIC_WARM_STALE_MS = 10 * 60 * 1000;
export const VOICE_SEMANTIC_WARM_DECAY_FLOOR = 0.88;
export const VOICE_SEMANTIC_WARM_RECENT_CONFLICT_WINDOW_MS = 2 * 60 * 1000;
export const VOICE_SEMANTIC_WARM_RECENT_CONFLICT_MULTIPLIER = 0.84;
export const VOICE_SEMANTIC_WARM_NUMERIC_WEAK_THRESHOLD = 0.76;
export const VOICE_SEMANTIC_WARM_NUMERIC_STRONG_THRESHOLD = 0.92;
export const VOICE_SEMANTIC_WARM_NUMERIC_DECAY_FLOOR = 0.9;
export const VOICE_SEMANTIC_WARM_NUMERIC_STALE_MS = 10 * 60 * 1000;
export const VOICE_SEMANTIC_WARM_NUMERIC_RECENT_CONFLICT_MULTIPLIER = 0.86;
export const VOICE_SEMANTIC_WARM_OPEN_WEAK_THRESHOLD = 0.82;
export const VOICE_SEMANTIC_WARM_OPEN_STRONG_THRESHOLD = 0.95;
export const VOICE_SEMANTIC_WARM_OPEN_DECAY_FLOOR = 0.84;
export const VOICE_SEMANTIC_WARM_OPEN_STALE_MS = 7 * 60 * 1000;
export const VOICE_SEMANTIC_WARM_OPEN_RECENT_CONFLICT_MULTIPLIER = 0.8;

export class VoiceSemanticAddressRegistry {
  private recordsById = new Map<string, SemanticAddressRecord>();
  private idsByRegionAndSlot = new Map<string, string>();
  private pendingByChunk = new Map<string, PendingGeometricContext>();
  private readonly maxEntries = 512;

  markGeometricContext(input: {
    chunkId: string;
    source: string;
    regionId: string;
    commandClass: string;
    parameterType: "numeric" | "open" | null | undefined;
    atlasVersion?: string;
    atlasSchema?: string;
    confidence?: number;
    frameCount?: number;
  }): void {
    if (input.source !== "spectral_manifold") {
      return;
    }
    if (!V1_REGION_IDS.has(input.regionId)) {
      return;
    }
    this.pendingByChunk.set(input.chunkId, {
      chunkId: input.chunkId,
      source: "spectral_manifold",
      regionId: input.regionId,
      commandClass: input.commandClass,
      parameterType: input.parameterType ?? null,
      atlasVersion: input.atlasVersion ?? "unknown",
      atlasSchema: input.atlasSchema ?? "unknown",
      confidence: input.confidence ?? 0,
      frameCount: input.frameCount ?? 0,
      updatedAtMs: Date.now(),
    });
  }

  lookup(input: LookupInput): LookupResult {
    const normalizedHint = (input.transcriptTailHint || "").trim().toLowerCase();
    const derivedSlotSignature = this.deriveSlotSignature(
      input.regionId,
      input.parameterType,
      normalizedHint
    );
    const lookupProfile = this.getWarmPolicyProfileForCommandFamily(
      this.inferCommandFamily(input.regionId, input.parameterType)
    );
    if (derivedSlotSignature && input.forceCandidateScan !== true) {
      const indexedId = this.idsByRegionAndSlot.get(`${input.regionId}|${derivedSlotSignature}`) ?? null;
      if (indexedId) {
        const indexedRecord = this.recordsById.get(indexedId);
        if (indexedRecord) {
          const atlasCompatible = this.isAtlasCompatible(indexedRecord, input);
          if (!atlasCompatible) {
            return {
              lookupCandidateCount: 1,
              bestCandidateId: indexedRecord.semanticAddressId,
              bestCandidateScore: null,
              bestCanonicalMergedText: indexedRecord.canonicalMergedText,
              warmHitClass: "miss",
              lookupPath: "slot_signature_index",
              slotSignature: derivedSlotSignature,
              atlasCompatible: false,
              mismatchReason: "warm_miss_atlas_incompatible",
              confidencePolicyVersion: VOICE_SEMANTIC_WARM_POLICY_VERSION,
              weakThreshold: this.getWarmPolicyProfileForCommandFamily(indexedRecord.commandFamily)
                .weakThreshold,
              strongThreshold: this.getWarmPolicyProfileForCommandFamily(indexedRecord.commandFamily)
                .strongThreshold,
              candidateAgeMs: Math.max(0, Date.now() - indexedRecord.updatedAtMs),
              recentConflictPenaltyApplied: false,
              staleProtectionApplied: false,
              focusRankingApplied: false,
              focusRankingBoost: 0,
              focusRankingReasonCodes: ["focus_ranking_not_evaluated"],
              focusLegalityApplied: false,
              focusLegalityLawful: null,
              focusLegalityPenaltyApplied: false,
              focusLegalityPenalty: 0,
              focusLegalityReasonCodes: ["focus_legality_not_evaluated"],
              focusLegalityCommandKind: null,
              focusTaskMomentumApplied: false,
              focusTaskMomentumBoost: 0,
              focusTaskMomentumPenaltyApplied: false,
              focusTaskMomentumPenalty: 0,
              focusTaskMomentumReasonCodes: ["focus_task_momentum_not_evaluated"],
              focusTaskMomentumMatchedSemanticAddressId: null,
              atlasShardRankingApplied: false,
              atlasShardRankingBoost: 0,
              atlasShardRankingReasonCodes: ["atlas_shard_ranking_not_evaluated"],
              atlasShardRankingCandidateKind: null,
              atlasShardNarrowingApplied: false,
              atlasShardNarrowingFallbackUsed: false,
              atlasShardNarrowingCandidateCountBefore: 1,
              atlasShardNarrowingCandidateCountAfter: 1,
              atlasShardNarrowingReasonCodes: ["atlas_shard_narrowing_not_evaluated_slot_signature_index"],
              atlasShardNarrowingAllowedCandidateKinds: null,
            };
          }
          const indexedProfile = this.getWarmPolicyProfileForCommandFamily(indexedRecord.commandFamily);
          const focusAdjustment = this.deriveFocusRankingAdjustment(input, indexedRecord);
          const focusLegality = this.deriveFocusLegalityAssessment(input, indexedRecord);
          const focusTaskMomentum = this.deriveFocusTaskMomentumAssessment(input, indexedRecord);
          const atlasShardAdjustment = this.deriveAtlasShardRankingAdjustment(input, indexedRecord);
          const indexedBaseScore = Math.max(
            0,
            Math.min(
              0.999,
              this.scoreCandidate(indexedRecord, normalizedHint) +
                focusAdjustment.focusRankingBoost -
                focusLegality.focusLegalityPenalty +
                focusTaskMomentum.focusTaskMomentumBoost -
                focusTaskMomentum.focusTaskMomentumPenalty +
                atlasShardAdjustment.atlasShardRankingBoost
            )
          );
          const policy = this.applyConfidencePolicy(indexedRecord, indexedBaseScore, indexedProfile);
          return {
            lookupCandidateCount: 1,
            bestCandidateId: indexedRecord.semanticAddressId,
            bestCandidateScore: policy.score,
            bestCanonicalMergedText: indexedRecord.canonicalMergedText,
            warmHitClass: policy.warmHitClass,
            lookupPath: "slot_signature_index",
            slotSignature: derivedSlotSignature,
            atlasCompatible: true,
            mismatchReason: policy.mismatchReason,
            confidencePolicyVersion: VOICE_SEMANTIC_WARM_POLICY_VERSION,
            weakThreshold: indexedProfile.weakThreshold,
            strongThreshold: indexedProfile.strongThreshold,
            candidateAgeMs: policy.ageMs,
            recentConflictPenaltyApplied: policy.recentConflictPenaltyApplied,
            staleProtectionApplied: policy.staleProtectionApplied,
            focusRankingApplied: focusAdjustment.focusRankingApplied,
            focusRankingBoost: focusAdjustment.focusRankingBoost,
            focusRankingReasonCodes: focusAdjustment.focusRankingReasonCodes,
            focusLegalityApplied: focusLegality.focusLegalityApplied,
            focusLegalityLawful: focusLegality.focusLegalityLawful,
            focusLegalityPenaltyApplied: focusLegality.focusLegalityPenaltyApplied,
            focusLegalityPenalty: focusLegality.focusLegalityPenalty,
            focusLegalityReasonCodes: focusLegality.focusLegalityReasonCodes,
            focusLegalityCommandKind: focusLegality.focusLegalityCommandKind,
            focusTaskMomentumApplied: focusTaskMomentum.focusTaskMomentumApplied,
            focusTaskMomentumBoost: focusTaskMomentum.focusTaskMomentumBoost,
            focusTaskMomentumPenaltyApplied: focusTaskMomentum.focusTaskMomentumPenaltyApplied,
            focusTaskMomentumPenalty: focusTaskMomentum.focusTaskMomentumPenalty,
            focusTaskMomentumReasonCodes: focusTaskMomentum.focusTaskMomentumReasonCodes,
            focusTaskMomentumMatchedSemanticAddressId: focusTaskMomentum.focusTaskMomentumMatchedSemanticAddressId,
            atlasShardRankingApplied: atlasShardAdjustment.atlasShardRankingApplied,
            atlasShardRankingBoost: atlasShardAdjustment.atlasShardRankingBoost,
            atlasShardRankingReasonCodes: atlasShardAdjustment.atlasShardRankingReasonCodes,
            atlasShardRankingCandidateKind: atlasShardAdjustment.atlasShardRankingCandidateKind,
            atlasShardNarrowingApplied: false,
            atlasShardNarrowingFallbackUsed: false,
            atlasShardNarrowingCandidateCountBefore: 1,
            atlasShardNarrowingCandidateCountAfter: 1,
            atlasShardNarrowingReasonCodes: ["atlas_shard_narrowing_not_evaluated_slot_signature_index"],
            atlasShardNarrowingAllowedCandidateKinds: null,
          };
        }
      }
    }

    const candidates = [...this.recordsById.values()].filter(
      (record) => record.regionId === input.regionId && record.parameterType === input.parameterType
    );
    const atlasShardNarrowing = this.deriveAtlasShardLookupNarrowing(input, candidates);
    const narrowedCandidates = atlasShardNarrowing.narrowedCandidates as SemanticAddressRecord[];
    if (candidates.length === 0) {
      return {
        lookupCandidateCount: 0,
        bestCandidateId: null,
        bestCandidateScore: null,
        bestCanonicalMergedText: null,
        warmHitClass: "miss",
        lookupPath: "candidate_scan",
        slotSignature: derivedSlotSignature,
        atlasCompatible: true,
        mismatchReason: null,
        confidencePolicyVersion: VOICE_SEMANTIC_WARM_POLICY_VERSION,
        weakThreshold: lookupProfile.weakThreshold,
        strongThreshold: lookupProfile.strongThreshold,
        candidateAgeMs: null,
        recentConflictPenaltyApplied: false,
        staleProtectionApplied: false,
        focusRankingApplied: false,
        focusRankingBoost: 0,
        focusRankingReasonCodes: ["focus_ranking_not_evaluated"],
        focusLegalityApplied: false,
        focusLegalityLawful: null,
        focusLegalityPenaltyApplied: false,
        focusLegalityPenalty: 0,
        focusLegalityReasonCodes: ["focus_legality_not_evaluated"],
        focusLegalityCommandKind: null,
        focusTaskMomentumApplied: false,
        focusTaskMomentumBoost: 0,
        focusTaskMomentumPenaltyApplied: false,
        focusTaskMomentumPenalty: 0,
        focusTaskMomentumReasonCodes: ["focus_task_momentum_not_evaluated"],
        focusTaskMomentumMatchedSemanticAddressId: null,
        atlasShardRankingApplied: false,
        atlasShardRankingBoost: 0,
        atlasShardRankingReasonCodes: ["atlas_shard_ranking_not_evaluated"],
        atlasShardRankingCandidateKind: null,
        atlasShardNarrowingApplied: atlasShardNarrowing.atlasShardNarrowingApplied,
        atlasShardNarrowingFallbackUsed: atlasShardNarrowing.atlasShardNarrowingFallbackUsed,
        atlasShardNarrowingCandidateCountBefore: atlasShardNarrowing.atlasShardNarrowingCandidateCountBefore,
        atlasShardNarrowingCandidateCountAfter: atlasShardNarrowing.atlasShardNarrowingCandidateCountAfter,
        atlasShardNarrowingReasonCodes: atlasShardNarrowing.atlasShardNarrowingReasonCodes,
        atlasShardNarrowingAllowedCandidateKinds: atlasShardNarrowing.atlasShardNarrowingAllowedCandidateKinds,
      };
    }

    let best: SemanticAddressRecord | null = null;
    let bestPolicy:
      | {
          score: number | null;
          warmHitClass: "strong" | "weak" | "miss";
          mismatchReason: string | null;
          ageMs: number;
          recentConflictPenaltyApplied: boolean;
          staleProtectionApplied: boolean;
          focusRankingApplied: boolean;
          focusRankingBoost: number;
          focusRankingReasonCodes: string[];
          focusLegalityApplied: boolean;
          focusLegalityLawful: boolean | null;
          focusLegalityPenaltyApplied: boolean;
          focusLegalityPenalty: number;
          focusLegalityReasonCodes: string[];
          focusLegalityCommandKind: string | null;
          focusTaskMomentumApplied: boolean;
          focusTaskMomentumBoost: number;
          focusTaskMomentumPenaltyApplied: boolean;
          focusTaskMomentumPenalty: number;
          focusTaskMomentumReasonCodes: string[];
          focusTaskMomentumMatchedSemanticAddressId: string | null;
          atlasShardRankingApplied: boolean;
          atlasShardRankingBoost: number;
          atlasShardRankingReasonCodes: string[];
          atlasShardRankingCandidateKind: string | null;
          atlasShardNarrowingApplied: boolean;
          atlasShardNarrowingFallbackUsed: boolean;
          atlasShardNarrowingCandidateCountBefore: number;
          atlasShardNarrowingCandidateCountAfter: number;
          atlasShardNarrowingReasonCodes: string[];
          atlasShardNarrowingAllowedCandidateKinds: string[] | null;
        }
      | null = null;
    let bestComparableScore = -2;
    for (const candidate of narrowedCandidates) {
      if (!this.isAtlasCompatible(candidate, input)) {
        continue;
      }
      const candidateProfile = this.getWarmPolicyProfileForCommandFamily(candidate.commandFamily);
      const focusAdjustment = this.deriveFocusRankingAdjustment(input, candidate);
      const focusLegality = this.deriveFocusLegalityAssessment(input, candidate);
      const focusTaskMomentum = this.deriveFocusTaskMomentumAssessment(input, candidate);
      const atlasShardAdjustment = this.deriveAtlasShardRankingAdjustment(input, candidate);
      const candidateBaseScore = Math.max(
        0,
        Math.min(
          0.999,
          this.scoreCandidate(candidate, normalizedHint) +
            focusAdjustment.focusRankingBoost -
            focusLegality.focusLegalityPenalty +
            focusTaskMomentum.focusTaskMomentumBoost -
            focusTaskMomentum.focusTaskMomentumPenalty +
            atlasShardAdjustment.atlasShardRankingBoost
        )
      );
      const basePolicy = this.applyConfidencePolicy(candidate, candidateBaseScore, candidateProfile);
      const policy = {
        ...basePolicy,
        focusRankingApplied: focusAdjustment.focusRankingApplied,
        focusRankingBoost: focusAdjustment.focusRankingBoost,
        focusRankingReasonCodes: focusAdjustment.focusRankingReasonCodes,
        focusLegalityApplied: focusLegality.focusLegalityApplied,
        focusLegalityLawful: focusLegality.focusLegalityLawful,
        focusLegalityPenaltyApplied: focusLegality.focusLegalityPenaltyApplied,
        focusLegalityPenalty: focusLegality.focusLegalityPenalty,
        focusLegalityReasonCodes: focusLegality.focusLegalityReasonCodes,
        focusLegalityCommandKind: focusLegality.focusLegalityCommandKind,
        focusTaskMomentumApplied: focusTaskMomentum.focusTaskMomentumApplied,
        focusTaskMomentumBoost: focusTaskMomentum.focusTaskMomentumBoost,
        focusTaskMomentumPenaltyApplied: focusTaskMomentum.focusTaskMomentumPenaltyApplied,
        focusTaskMomentumPenalty: focusTaskMomentum.focusTaskMomentumPenalty,
        focusTaskMomentumReasonCodes: focusTaskMomentum.focusTaskMomentumReasonCodes,
        focusTaskMomentumMatchedSemanticAddressId: focusTaskMomentum.focusTaskMomentumMatchedSemanticAddressId,
        atlasShardRankingApplied: atlasShardAdjustment.atlasShardRankingApplied,
        atlasShardRankingBoost: atlasShardAdjustment.atlasShardRankingBoost,
        atlasShardRankingReasonCodes: atlasShardAdjustment.atlasShardRankingReasonCodes,
        atlasShardRankingCandidateKind: atlasShardAdjustment.atlasShardRankingCandidateKind,
        atlasShardNarrowingApplied: atlasShardNarrowing.atlasShardNarrowingApplied,
        atlasShardNarrowingFallbackUsed: atlasShardNarrowing.atlasShardNarrowingFallbackUsed,
        atlasShardNarrowingCandidateCountBefore: atlasShardNarrowing.atlasShardNarrowingCandidateCountBefore,
        atlasShardNarrowingCandidateCountAfter: atlasShardNarrowing.atlasShardNarrowingCandidateCountAfter,
        atlasShardNarrowingReasonCodes: atlasShardNarrowing.atlasShardNarrowingReasonCodes,
        atlasShardNarrowingAllowedCandidateKinds: atlasShardNarrowing.atlasShardNarrowingAllowedCandidateKinds,
      };
      const comparableScore = policy.score ?? -1;
      if (comparableScore > bestComparableScore) {
        best = candidate;
        bestPolicy = policy;
        bestComparableScore = comparableScore;
      }
    }
    if (!best || !bestPolicy) {
      return {
        lookupCandidateCount: atlasShardNarrowing.atlasShardNarrowingCandidateCountAfter,
        bestCandidateId: null,
        bestCandidateScore: null,
        bestCanonicalMergedText: null,
        warmHitClass: "miss",
        lookupPath: "candidate_scan",
        slotSignature: derivedSlotSignature,
        atlasCompatible: false,
        mismatchReason: "warm_miss_atlas_incompatible",
        confidencePolicyVersion: VOICE_SEMANTIC_WARM_POLICY_VERSION,
        weakThreshold: lookupProfile.weakThreshold,
        strongThreshold: lookupProfile.strongThreshold,
        candidateAgeMs: null,
        recentConflictPenaltyApplied: false,
        staleProtectionApplied: false,
        focusRankingApplied: false,
        focusRankingBoost: 0,
        focusRankingReasonCodes: ["focus_ranking_not_evaluated"],
        focusLegalityApplied: false,
        focusLegalityLawful: null,
        focusLegalityPenaltyApplied: false,
        focusLegalityPenalty: 0,
        focusLegalityReasonCodes: ["focus_legality_not_evaluated"],
        focusLegalityCommandKind: null,
        focusTaskMomentumApplied: false,
        focusTaskMomentumBoost: 0,
        focusTaskMomentumPenaltyApplied: false,
        focusTaskMomentumPenalty: 0,
        focusTaskMomentumReasonCodes: ["focus_task_momentum_not_evaluated"],
        focusTaskMomentumMatchedSemanticAddressId: null,
        atlasShardRankingApplied: false,
        atlasShardRankingBoost: 0,
        atlasShardRankingReasonCodes: ["atlas_shard_ranking_not_evaluated"],
        atlasShardRankingCandidateKind: null,
        atlasShardNarrowingApplied: atlasShardNarrowing.atlasShardNarrowingApplied,
        atlasShardNarrowingFallbackUsed: atlasShardNarrowing.atlasShardNarrowingFallbackUsed,
        atlasShardNarrowingCandidateCountBefore: atlasShardNarrowing.atlasShardNarrowingCandidateCountBefore,
        atlasShardNarrowingCandidateCountAfter: atlasShardNarrowing.atlasShardNarrowingCandidateCountAfter,
        atlasShardNarrowingReasonCodes: atlasShardNarrowing.atlasShardNarrowingReasonCodes,
        atlasShardNarrowingAllowedCandidateKinds: atlasShardNarrowing.atlasShardNarrowingAllowedCandidateKinds,
      };
    }

    return {
      lookupCandidateCount: atlasShardNarrowing.atlasShardNarrowingCandidateCountAfter,
      bestCandidateId: best.semanticAddressId,
      bestCandidateScore: bestPolicy.score,
      bestCanonicalMergedText: best.canonicalMergedText,
      warmHitClass: bestPolicy.warmHitClass,
      lookupPath: "candidate_scan",
      slotSignature: derivedSlotSignature,
      atlasCompatible: true,
      mismatchReason: bestPolicy.mismatchReason,
      confidencePolicyVersion: VOICE_SEMANTIC_WARM_POLICY_VERSION,
      weakThreshold: this.getWarmPolicyProfileForCommandFamily(best.commandFamily).weakThreshold,
      strongThreshold: this.getWarmPolicyProfileForCommandFamily(best.commandFamily).strongThreshold,
      candidateAgeMs: bestPolicy.ageMs,
      recentConflictPenaltyApplied: bestPolicy.recentConflictPenaltyApplied,
      staleProtectionApplied: bestPolicy.staleProtectionApplied,
      focusRankingApplied: bestPolicy.focusRankingApplied,
      focusRankingBoost: bestPolicy.focusRankingBoost,
      focusRankingReasonCodes: bestPolicy.focusRankingReasonCodes,
      focusLegalityApplied: bestPolicy.focusLegalityApplied,
      focusLegalityLawful: bestPolicy.focusLegalityLawful,
      focusLegalityPenaltyApplied: bestPolicy.focusLegalityPenaltyApplied,
      focusLegalityPenalty: bestPolicy.focusLegalityPenalty,
      focusLegalityReasonCodes: bestPolicy.focusLegalityReasonCodes,
      focusLegalityCommandKind: bestPolicy.focusLegalityCommandKind,
      focusTaskMomentumApplied: bestPolicy.focusTaskMomentumApplied,
      focusTaskMomentumBoost: bestPolicy.focusTaskMomentumBoost,
      focusTaskMomentumPenaltyApplied: bestPolicy.focusTaskMomentumPenaltyApplied,
      focusTaskMomentumPenalty: bestPolicy.focusTaskMomentumPenalty,
      focusTaskMomentumReasonCodes: bestPolicy.focusTaskMomentumReasonCodes,
      focusTaskMomentumMatchedSemanticAddressId: bestPolicy.focusTaskMomentumMatchedSemanticAddressId,
      atlasShardRankingApplied: bestPolicy.atlasShardRankingApplied,
      atlasShardRankingBoost: bestPolicy.atlasShardRankingBoost,
      atlasShardRankingReasonCodes: bestPolicy.atlasShardRankingReasonCodes,
      atlasShardRankingCandidateKind: bestPolicy.atlasShardRankingCandidateKind,
      atlasShardNarrowingApplied: bestPolicy.atlasShardNarrowingApplied,
      atlasShardNarrowingFallbackUsed: bestPolicy.atlasShardNarrowingFallbackUsed,
      atlasShardNarrowingCandidateCountBefore: bestPolicy.atlasShardNarrowingCandidateCountBefore,
      atlasShardNarrowingCandidateCountAfter: bestPolicy.atlasShardNarrowingCandidateCountAfter,
      atlasShardNarrowingReasonCodes: bestPolicy.atlasShardNarrowingReasonCodes,
      atlasShardNarrowingAllowedCandidateKinds: bestPolicy.atlasShardNarrowingAllowedCandidateKinds,
    };
  }

  registerFromGovernedExecution(input: RegistrationInput): SemanticAddressRecord | null {
    if (!input.policyGranted) {
      return null;
    }
    const pending = this.pendingByChunk.get(input.chunkId);
    if (!pending || pending.source !== "spectral_manifold") {
      return null;
    }

    const normalized = this.normalizeTranscriptForRegion(pending.regionId, input.transcript);
    if (!normalized) {
      return null;
    }

    const semanticAddressId = this.makeSemanticAddressId(
      pending.regionId,
      normalized.slotSignature,
      normalized.canonicalMergedText
    );
    const existing = this.recordsById.get(semanticAddressId);
    const now = Date.now();
    const record: SemanticAddressRecord = {
      semanticAddressId,
      schemaVersion: SCHEMA_VERSION,
      createdAtMs: existing?.createdAtMs ?? now,
      updatedAtMs: now,
      source: "spectral_manifold",
      atlasVersion: pending.atlasVersion,
      atlasSchema: pending.atlasSchema,
      regionId: pending.regionId,
      commandClass: pending.commandClass,
      parameterType: pending.parameterType,
      commandFamily: normalized.commandFamily,
      canonicalPrefix: normalized.canonicalPrefix,
      canonicalMergedText: normalized.canonicalMergedText,
      slotSignature: normalized.slotSignature,
      geometricSignatureWords: [],
      captureRadius: 0.12,
      minFrames: Math.max(1, pending.frameCount),
      activationThreshold: Math.max(0, Math.min(1, pending.confidence)),
      successCount: (existing?.successCount ?? 0) + 1,
      lastSuccessChunkId: input.chunkId,
      lastSuccessSessionId: input.sessionId ?? null,
      conflictCount: 0,
      lastConflictAtMs: null,
      governanceVersion: { h23: H23_VERSION, h24: H24_VERSION },
      governanceQualified: input.h24FinalGranted === true,
      evictionScore: Math.max(0, input.h23StepCount - 1),
    };

    this.recordsById.set(semanticAddressId, record);
    this.idsByRegionAndSlot.set(`${record.regionId}|${record.slotSignature}`, semanticAddressId);
    this.pendingByChunk.delete(input.chunkId);
    this.evictIfNeeded();
    return record;
  }

  markWarmConflict(semanticAddressId: string): SemanticAddressRecord | null {
    const existing = this.recordsById.get(semanticAddressId);
    if (!existing) {
      return null;
    }
    const updated: SemanticAddressRecord = {
      ...existing,
      conflictCount: existing.conflictCount + 1,
      lastConflictAtMs: Date.now(),
    };
    this.recordsById.set(semanticAddressId, updated);
    return updated;
  }

  clearChunk(chunkId: string): void {
    this.pendingByChunk.delete(chunkId);
  }

  private normalizeTranscriptForRegion(
    regionId: string,
    transcript: string
  ):
    | {
        commandFamily: SemanticCommandFamily;
        canonicalPrefix: string;
        canonicalMergedText: string;
        slotSignature: string;
      }
    | null {
    const t = transcript.trim().toLowerCase();
    if (!t) {
      return null;
    }
    if (regionId === "pause" && t === "pause") {
      return {
        commandFamily: "reflex",
        canonicalPrefix: "pause",
        canonicalMergedText: "pause",
        slotSignature: "pause",
      };
    }
    if (regionId === "new tab" && t === "new tab") {
      return {
        commandFamily: "closed_structure",
        canonicalPrefix: "new tab",
        canonicalMergedText: "new tab",
        slotSignature: "new_tab",
      };
    }
    if (regionId === "go to line" && t.startsWith("go to line")) {
      const tail = t.slice("go to line".length).trim();
      const normalized = normalizeNumericTail(tail);
      if (!normalized.normalized) {
        return null;
      }
      return {
        commandFamily: "parameterized_numeric",
        canonicalPrefix: "go to line",
        canonicalMergedText: `go to line ${normalized.normalized}`,
        slotSignature: `goto_line:${normalized.normalized}`,
      };
    }
    if (regionId === "go to" && t.startsWith("go to")) {
      const tail = t.slice("go to".length).trim();
      const normalized = normalizeOpenTail(tail, { commandPrefix: "go to" });
      if (normalized.status !== "ok" || !normalized.normalized) {
        return null;
      }
      return {
        commandFamily: "parameterized_open",
        canonicalPrefix: "go to",
        canonicalMergedText: `go to ${normalized.normalized}`,
        slotSignature: `goto_open:${normalized.normalized}`,
      };
    }
    if (regionId === "open" && t.startsWith("open")) {
      const tail = t.slice("open".length).trim();
      const normalized = normalizeOpenTail(tail, { commandPrefix: "open" });
      if (normalized.status !== "ok" || !normalized.normalized) {
        return null;
      }
      return {
        commandFamily: "parameterized_open",
        canonicalPrefix: "open",
        canonicalMergedText: `open ${normalized.normalized}`,
        slotSignature: `open_target:${normalized.normalized}`,
      };
    }
    return null;
  }

  private deriveFocusRankingAdjustment(
    input: LookupInput,
    candidate: SemanticAddressRecord
  ): { focusRankingApplied: boolean; focusRankingBoost: number; focusRankingReasonCodes: string[] } {
    return deriveFocusContextRankingAdjustment(input.focusContextEnvelope ?? null, {
      regionId: candidate.regionId,
      canonicalPrefix: candidate.canonicalPrefix,
      canonicalMergedText: candidate.canonicalMergedText,
      commandFamily: candidate.commandFamily,
    });
  }

  private deriveFocusLegalityAssessment(input: LookupInput, candidate: SemanticAddressRecord): {
    focusLegalityApplied: boolean;
    focusLegalityLawful: boolean | null;
    focusLegalityPenaltyApplied: boolean;
    focusLegalityPenalty: number;
    focusLegalityReasonCodes: string[];
    focusLegalityCommandKind: string | null;
  } {
    return deriveFocusContextLegalityAssessment(input.focusContextEnvelope ?? null, {
      regionId: candidate.regionId,
      canonicalPrefix: candidate.canonicalPrefix,
      canonicalMergedText: candidate.canonicalMergedText,
      commandFamily: candidate.commandFamily,
    });
  }


  private deriveFocusTaskMomentumAssessment(input: LookupInput, candidate: SemanticAddressRecord): {
    focusTaskMomentumApplied: boolean;
    focusTaskMomentumBoost: number;
    focusTaskMomentumPenaltyApplied: boolean;
    focusTaskMomentumPenalty: number;
    focusTaskMomentumReasonCodes: string[];
    focusTaskMomentumMatchedSemanticAddressId: string | null;
  } {
    return deriveFocusContextTaskMomentumAssessment(input.focusContextEnvelope ?? null, {
      semanticAddressId: candidate.semanticAddressId,
      regionId: candidate.regionId,
      canonicalPrefix: candidate.canonicalPrefix,
      canonicalMergedText: candidate.canonicalMergedText,
      commandFamily: candidate.commandFamily,
    });
  }

  private deriveAtlasShardRankingAdjustment(input: LookupInput, candidate: SemanticAddressRecord): {
    atlasShardRankingApplied: boolean;
    atlasShardRankingBoost: number;
    atlasShardRankingReasonCodes: string[];
    atlasShardRankingCandidateKind: string | null;
  } {
    return derivePolicyShapedAtlasShardRankingAdjustment(input.atlasShardHint ?? null, {
      regionId: candidate.regionId,
      canonicalPrefix: candidate.canonicalPrefix,
      canonicalMergedText: candidate.canonicalMergedText,
      commandFamily: candidate.commandFamily,
      parameterType: candidate.parameterType,
    });
  }

  private deriveAtlasShardLookupNarrowing(
    input: LookupInput,
    candidates: SemanticAddressRecord[]
  ): {
    atlasShardNarrowingApplied: boolean;
    atlasShardNarrowingFallbackUsed: boolean;
    atlasShardNarrowingCandidateCountBefore: number;
    atlasShardNarrowingCandidateCountAfter: number;
    atlasShardNarrowingReasonCodes: string[];
    atlasShardNarrowingAllowedCandidateKinds: string[] | null;
    narrowedCandidates: SemanticAddressRecord[];
  } {
    return derivePolicyShapedAtlasShardLookupNarrowing(
      input.atlasShardHint ?? null,
      candidates
    ) as {
      atlasShardNarrowingApplied: boolean;
      atlasShardNarrowingFallbackUsed: boolean;
      atlasShardNarrowingCandidateCountBefore: number;
      atlasShardNarrowingCandidateCountAfter: number;
      atlasShardNarrowingReasonCodes: string[];
      atlasShardNarrowingAllowedCandidateKinds: string[] | null;
      narrowedCandidates: SemanticAddressRecord[];
    };
  }

  private scoreCandidate(candidate: SemanticAddressRecord, normalizedHint: string): number {
    if (!normalizedHint) {
      return 0.76;
    }
    if (candidate.canonicalMergedText.endsWith(normalizedHint)) {
      return 0.98;
    }
    if (candidate.canonicalMergedText.includes(normalizedHint)) {
      return 0.85;
    }
    return 0.72;
  }

  private applyConfidencePolicy(
    candidate: SemanticAddressRecord,
    baseScore: number,
    profile: WarmPolicyProfile
  ): {
    score: number | null;
    warmHitClass: "strong" | "weak" | "miss";
    mismatchReason: string | null;
    ageMs: number;
    recentConflictPenaltyApplied: boolean;
    staleProtectionApplied: boolean;
    focusRankingApplied: boolean;
    focusRankingBoost: number;
    focusRankingReasonCodes: string[];
  } {
    const ageMs = Math.max(0, Date.now() - candidate.updatedAtMs);
    if (ageMs >= profile.staleMs) {
      return {
        score: null,
        warmHitClass: "miss",
        mismatchReason: "warm_miss_stale_protection",
        ageMs,
        recentConflictPenaltyApplied: false,
        staleProtectionApplied: true,
        focusRankingApplied: false,
        focusRankingBoost: 0,
        focusRankingReasonCodes: [],
      };
    }

    const boundedAgeMs = Math.min(ageMs, VOICE_SEMANTIC_WARM_DECAY_WINDOW_MS);
    const freshnessMultiplier =
      1 -
      (boundedAgeMs / VOICE_SEMANTIC_WARM_DECAY_WINDOW_MS) *
        (1 - profile.decayFloor);
    const recentConflictPenaltyApplied =
      candidate.lastConflictAtMs !== null &&
      Date.now() - candidate.lastConflictAtMs <= VOICE_SEMANTIC_WARM_RECENT_CONFLICT_WINDOW_MS;
    const conflictMultiplier = recentConflictPenaltyApplied
      ? profile.recentConflictMultiplier
      : 1;
    const score = Number((baseScore * freshnessMultiplier * conflictMultiplier).toFixed(3));
    const warmHitClass = this.classifyWarmHit(score, profile);
    return {
      score,
      warmHitClass,
      mismatchReason:
        warmHitClass === "miss" && recentConflictPenaltyApplied
          ? "warm_miss_conflict_penalized"
          : null,
      ageMs,
      recentConflictPenaltyApplied,
      staleProtectionApplied: false,
      focusRankingApplied: false,
      focusRankingBoost: 0,
      focusRankingReasonCodes: [],
    };
  }

  private classifyWarmHit(score: number, profile: WarmPolicyProfile): "strong" | "weak" | "miss" {
    if (score >= profile.strongThreshold) {
      return "strong";
    }
    if (score >= profile.weakThreshold) {
      return "weak";
    }
    return "miss";
  }

  private inferCommandFamily(
    regionId: string,
    parameterType: "numeric" | "open" | null
  ): SemanticCommandFamily | null {
    if (regionId === "pause" && parameterType === null) {
      return "reflex";
    }
    if (regionId === "new tab" && parameterType === null) {
      return "closed_structure";
    }
    if (parameterType === "numeric") {
      return "parameterized_numeric";
    }
    if (parameterType === "open") {
      return "parameterized_open";
    }
    return null;
  }

  private getWarmPolicyProfileForCommandFamily(
    commandFamily: SemanticCommandFamily | null
  ): WarmPolicyProfile {
    if (commandFamily === "parameterized_numeric") {
      return {
        weakThreshold: VOICE_SEMANTIC_WARM_NUMERIC_WEAK_THRESHOLD,
        strongThreshold: VOICE_SEMANTIC_WARM_NUMERIC_STRONG_THRESHOLD,
        decayFloor: VOICE_SEMANTIC_WARM_NUMERIC_DECAY_FLOOR,
        staleMs: VOICE_SEMANTIC_WARM_NUMERIC_STALE_MS,
        recentConflictMultiplier: VOICE_SEMANTIC_WARM_NUMERIC_RECENT_CONFLICT_MULTIPLIER,
      };
    }
    if (commandFamily === "parameterized_open") {
      return {
        weakThreshold: VOICE_SEMANTIC_WARM_OPEN_WEAK_THRESHOLD,
        strongThreshold: VOICE_SEMANTIC_WARM_OPEN_STRONG_THRESHOLD,
        decayFloor: VOICE_SEMANTIC_WARM_OPEN_DECAY_FLOOR,
        staleMs: VOICE_SEMANTIC_WARM_OPEN_STALE_MS,
        recentConflictMultiplier: VOICE_SEMANTIC_WARM_OPEN_RECENT_CONFLICT_MULTIPLIER,
      };
    }
    return {
      weakThreshold: VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD,
      strongThreshold: VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD,
      decayFloor: VOICE_SEMANTIC_WARM_DECAY_FLOOR,
      staleMs: VOICE_SEMANTIC_WARM_STALE_MS,
      recentConflictMultiplier: VOICE_SEMANTIC_WARM_RECENT_CONFLICT_MULTIPLIER,
    };
  }

  private isAtlasCompatible(record: SemanticAddressRecord, input: LookupInput): boolean {
    if (input.atlasSchema && input.atlasSchema !== record.atlasSchema) {
      return false;
    }
    if (input.atlasVersion && input.atlasVersion !== record.atlasVersion) {
      return false;
    }
    return true;
  }

  private deriveSlotSignature(
    regionId: string,
    parameterType: "numeric" | "open" | null,
    transcriptTailHint: string
  ): string | null {
    if (regionId === "pause" && parameterType === null) {
      return "pause";
    }
    if (regionId === "new tab" && parameterType === null) {
      return "new_tab";
    }
    if (regionId === "go to line" && parameterType === "numeric") {
      const normalized = normalizeNumericTail(transcriptTailHint);
      if (!normalized.normalized) {
        return null;
      }
      return `goto_line:${normalized.normalized}`;
    }
    if (regionId === "go to" && parameterType === "open") {
      const normalized = normalizeOpenTail(transcriptTailHint, { commandPrefix: "go to" });
      if (normalized.status !== "ok" || !normalized.normalized) {
        return null;
      }
      return `goto_open:${normalized.normalized}`;
    }
    if (regionId === "open" && parameterType === "open") {
      const normalized = normalizeOpenTail(transcriptTailHint, { commandPrefix: "open" });
      if (normalized.status !== "ok" || !normalized.normalized) {
        return null;
      }
      return `open_target:${normalized.normalized}`;
    }
    return null;
  }

  private makeSemanticAddressId(regionId: string, slotSignature: string, canonical: string): string {
    return crypto
      .createHash("sha1")
      .update(`${regionId}|${slotSignature}|${canonical}`)
      .digest("hex")
      .slice(0, 16);
  }

  private evictIfNeeded(): void {
    if (this.recordsById.size <= this.maxEntries) {
      return;
    }
    const ordered = [...this.recordsById.values()].sort((a, b) => a.updatedAtMs - b.updatedAtMs);
    const toDrop = ordered.slice(0, this.recordsById.size - this.maxEntries);
    for (const record of toDrop) {
      this.recordsById.delete(record.semanticAddressId);
      this.idsByRegionAndSlot.delete(`${record.regionId}|${record.slotSignature}`);
    }
  }
}

export const voiceSemanticAddressRegistry = new VoiceSemanticAddressRegistry();
