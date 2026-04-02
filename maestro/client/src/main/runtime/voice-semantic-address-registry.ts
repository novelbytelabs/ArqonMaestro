import * as crypto from "crypto";
import { normalizeNumericTail } from "../stream/numeric-tail-normalizer";
import { normalizeOpenTail } from "../stream/open-tail-normalizer";

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
  governanceVersion: { h23: string; h24: string };
  governanceQualified: boolean;
  evictionScore: number;
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
}

const V1_REGION_IDS = new Set(["pause", "new tab", "go to line", "go to", "open"]);
const SCHEMA_VERSION = "h3_voice_semantic_address_v1" as const;
const H23_VERSION = "h23_live_trace_v1";
const H24_VERSION = "h24_policy_proof_v1";
export const VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD = 0.78;
export const VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD = 0.93;

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
            };
          }
          const score = this.scoreCandidate(indexedRecord, normalizedHint);
          return {
            lookupCandidateCount: 1,
            bestCandidateId: indexedRecord.semanticAddressId,
            bestCandidateScore: Number(score.toFixed(3)),
            bestCanonicalMergedText: indexedRecord.canonicalMergedText,
            warmHitClass: this.classifyWarmHit(score),
            lookupPath: "slot_signature_index",
            slotSignature: derivedSlotSignature,
            atlasCompatible: true,
            mismatchReason: null,
          };
        }
      }
    }

    const candidates = [...this.recordsById.values()].filter(
      (record) => record.regionId === input.regionId && record.parameterType === input.parameterType
    );
    if (candidates.length === 0) {
      return {
        lookupCandidateCount: 0,
        bestCandidateId: null,
        bestCandidateScore: null,
        bestCanonicalMergedText: null,
        warmHitClass: "miss",
        lookupPath: "none",
        slotSignature: derivedSlotSignature,
        atlasCompatible: true,
        mismatchReason: null,
      };
    }

    let best: SemanticAddressRecord | null = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      if (!this.isAtlasCompatible(candidate, input)) {
        continue;
      }
      const score = this.scoreCandidate(candidate, normalizedHint);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (!best || bestScore < 0) {
      return {
        lookupCandidateCount: candidates.length,
        bestCandidateId: null,
        bestCandidateScore: null,
        bestCanonicalMergedText: null,
        warmHitClass: "miss",
        lookupPath: "candidate_scan",
        slotSignature: derivedSlotSignature,
        atlasCompatible: false,
        mismatchReason: "warm_miss_atlas_incompatible",
      };
    }

    return {
      lookupCandidateCount: candidates.length,
      bestCandidateId: best?.semanticAddressId ?? null,
      bestCandidateScore: best ? Number(bestScore.toFixed(3)) : null,
      bestCanonicalMergedText: best?.canonicalMergedText ?? null,
      warmHitClass: this.classifyWarmHit(bestScore),
      lookupPath: "candidate_scan",
      slotSignature: derivedSlotSignature,
      atlasCompatible: true,
      mismatchReason: null,
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

  private classifyWarmHit(score: number): "strong" | "weak" | "miss" {
    if (score >= VOICE_SEMANTIC_WARM_HIT_STRONG_THRESHOLD) {
      return "strong";
    }
    if (score >= VOICE_SEMANTIC_WARM_HIT_WEAK_THRESHOLD) {
      return "weak";
    }
    return "miss";
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
