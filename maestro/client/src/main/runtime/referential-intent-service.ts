/**
 * Referential Intent Service
 *
 * Part of FP-7A: Referential Intent Foundations (Phase 4A)
 *
 * Provides bounded, deterministic resolution of referent markers in command transcripts.
 * Supported markers: "this", "that", "it", "here"
 *
 * =============================================================================
 * ARCHITECTURAL RULES (Phase 4A)
 * =============================================================================
 *
 * 1. Resolution is deterministic and local — no LLM, no remote call (Rule 1)
 * 2. Resolution requires exactly one lawful candidate — ambiguity → abort (Rule 2)
 * 3. Confidence must pass threshold or resolution aborts safely (Rule 3)
 * 4. Policy/mode state may reject weak or unlawful candidates (Rule 4)
 *    but must not reinterpret commands or invent new targets (Rule 5)
 * 5. Grounding types are minimal — only what current runtime/docs need (Rule 6)
 *
 * =============================================================================
 * OUT OF SCOPE (Phase 4A)
 * =============================================================================
 *
 * - Disambiguation UI (FP-7B)
 * - Confidence telemetry pipeline (FP-7B)
 * - Cross-surface referential unification (Phase 4C)
 * - Modal-aware referent tracking (Phase 4B)
 * - Broad semantic graph resolution
 * - Pronouns beyond the four supported markers
 */

import { ReferentialReferenceStack, ReferentEntryType } from "./referential-reference-stack";

// =============================================================================
// SUPPORTED REFERENT MARKERS
// =============================================================================

/**
 * The four supported referent markers for Phase 4A.
 * Intentionally narrow — expanding this set is out of scope.
 */
export type ReferentMarker = "this" | "that" | "it" | "here";

const ALL_MARKERS: ReferentMarker[] = ["this", "that", "it", "here"];

// =============================================================================
// GROUNDING TYPES
// =============================================================================

/**
 * Grounding type for a referent.
 * Minimal set — only what current runtime/docs require for Phase 4A.
 *
 * - selection: grounded to the current text selection or selected element
 * - element:   grounded to a code element at the current cursor/location
 * - pane:      grounded to a specific panel or window
 * - app:       grounded to the application itself
 * - unknown:   cannot determine grounding from available context
 */
export type GroundingType = "selection" | "element" | "pane" | "app" | "unknown";

// =============================================================================
// REFERENTIAL CANDIDATE
// =============================================================================

/**
 * A single candidate entity that a referent might resolve to.
 */
export interface ReferentialCandidate {
  /** Human-readable label for this candidate */
  label: string;
  /** Opaque identifier (path, id, range, etc.) */
  id: string;
  /** What type of entity this is */
  entityType: ReferentEntryType;
  /** How confident we are that this is the right target (0–1) */
  confidence: number;
  /** Where this candidate came from */
  source: "active_selection" | "focus_scope" | "reference_stack" | "visible_context";
}

// =============================================================================
// RESOLUTION OUTCOME
// =============================================================================

/**
 * All possible outcomes from a referential resolution attempt.
 *
 * - resolved:         exactly one lawful candidate, confidence at/above threshold
 * - ambiguous:        multiple candidates exist — safe abort (FP-7B handles disambiguation)
 * - no_referent:      zero candidates found for the detected marker
 * - weak_confidence:  one candidate exists but confidence is below threshold
 * - no_marker:        no supported referent marker was detected in the transcript
 */
export type ReferentialResolutionOutcome =
  | "resolved"
  | "ambiguous"
  | "no_referent"
  | "weak_confidence"
  | "no_marker";

/**
 * The result of a referential resolution attempt.
 * Always structured and inspectable — never a silent guess.
 */
export interface ReferentialResolutionResult {
  outcome: ReferentialResolutionOutcome;
  /** The detected referent marker, if any */
  detectedMarker: ReferentMarker | null;
  /** Grounding classification for the detected marker */
  grounding: GroundingType;
  /** The resolved candidate, if outcome is "resolved" */
  resolved: ReferentialCandidate | null;
  /** All candidates considered during resolution */
  candidatesConsidered: ReferentialCandidate[];
  /** Human-readable explanation for the outcome */
  reason: string;
  /** Timestamp of the resolution attempt (ms) */
  timestamp: number;
}

// =============================================================================
// REFERENTIAL CONTEXT
// =============================================================================

/**
 * Context snapshot provided to the referential intent service.
 * Contains the minimum set of state needed for deterministic local resolution.
 *
 * The caller is responsible for providing an accurate snapshot.
 * This service does not query external state.
 */
export interface ReferentialContext {
  /**
   * The currently active text selection (null if nothing is selected).
   * Used to resolve "this" and "here" in selection grounding.
   */
  activeSelection: { label: string; id: string } | null;

  /**
   * The focused surface/pane (null if no focused pane is known).
   * Used to resolve "this" in pane grounding, and "here" in element grounding.
   */
  focusedPane: { label: string; id: string } | null;

  /**
   * The active application (null if not known).
   * Used to resolve "this" in app grounding.
   */
  activeApp: { label: string; id: string } | null;

  /**
   * Current security mode — may cause rejection of weak candidates in secure/shared_room.
   */
  securityMode: "standard" | "secure" | "shared_room";

  /**
   * Whether the speaker has been verified.
   * Weak candidates may be rejected for unverified speakers in stricter modes.
   */
  speakerVerified: boolean;

  /**
   * Reference stack to use for "that" / "it" resolution.
   * Caller provides the current instance.
   */
  referenceStack: ReferentialReferenceStack;
}

// =============================================================================
// CONFIDENCE THRESHOLDS
// =============================================================================

/**
 * Minimum confidence to allow resolution.
 * Below this, outcome is "weak_confidence" and we abort safely.
 *
 * Phase 4A uses a single threshold — no complex band taxonomy.
 */
export const RESOLUTION_CONFIDENCE_THRESHOLD = 0.7;

// =============================================================================
// SERVICE
// =============================================================================

/**
 * ReferentialIntentService
 *
 * Detects, grounds, and resolves referent markers in command transcripts.
 * Fails safely when candidate set is ambiguous, empty, or low-confidence.
 *
 * Phase 4A: supports "this", "that", "it", "here" only.
 */
export default class ReferentialIntentService {

  /**
   * Main entry point.
   *
   * Given a normalized transcript and a context snapshot, determines
   * whether the transcript contains a referent marker and, if so,
   * attempts to resolve it to exactly one lawful candidate.
   */
  resolve(transcript: string, context: ReferentialContext): ReferentialResolutionResult {
    const now = Date.now();
    const lower = transcript.toLowerCase().trim();

    // 1. Detect referent marker
    const marker = this.detectMarker(lower);
    if (!marker) {
      return {
        outcome: "no_marker",
        detectedMarker: null,
        grounding: "unknown",
        resolved: null,
        candidatesConsidered: [],
        reason: "No supported referent marker detected in transcript",
        timestamp: now,
      };
    }

    // 2. Classify grounding type for this marker + context
    const grounding = this.classifyGrounding(marker, context);

    // 3. Build candidate set from context
    const candidates = this.buildCandidateSet(marker, grounding, context);

    // 4. Apply policy/mode filtering — may narrow candidates
    const filtered = this.applyPolicyFilter(candidates, context);

    // 5. Uniqueness detection — exactly one or fail
    if (filtered.length === 0) {
      return {
        outcome: "no_referent",
        detectedMarker: marker,
        grounding,
        resolved: null,
        candidatesConsidered: candidates,
        reason: `No lawful referent candidate found for marker "${marker}" (grounding: ${grounding})`,
        timestamp: now,
      };
    }

    if (filtered.length > 1) {
      return {
        outcome: "ambiguous",
        detectedMarker: marker,
        grounding,
        resolved: null,
        candidatesConsidered: filtered,
        reason: `Multiple referent candidates for "${marker}" — disambiguation required (FP-7B)`,
        timestamp: now,
      };
    }

    // 6. Single candidate — check confidence threshold
    const candidate = filtered[0];
    if (candidate.confidence < RESOLUTION_CONFIDENCE_THRESHOLD) {
      return {
        outcome: "weak_confidence",
        detectedMarker: marker,
        grounding,
        resolved: null,
        candidatesConsidered: filtered,
        reason: `Candidate "${candidate.label}" confidence ${candidate.confidence.toFixed(2)} below threshold ${RESOLUTION_CONFIDENCE_THRESHOLD}`,
        timestamp: now,
      };
    }

    // 7. Resolved
    return {
      outcome: "resolved",
      detectedMarker: marker,
      grounding,
      resolved: candidate,
      candidatesConsidered: filtered,
      reason: `Resolved "${marker}" → "${candidate.label}" (confidence ${candidate.confidence.toFixed(2)}, grounding: ${grounding})`,
      timestamp: now,
    };
  }

  // ---------------------------------------------------------------------------
  // MARKER DETECTION
  // ---------------------------------------------------------------------------

  /**
   * Detect whether a transcript contains a supported referent marker.
   * Returns the first marker found, or null.
   *
   * Priority order follows the reference resolution laws:
   * "here" is spatially specific (element/location grounding) → checked first.
   * "this" is the most direct current-focus reference → checked second.
   * "that" and "it" are persistent reference markers → checked last.
   */
  detectMarker(lowerTranscript: string): ReferentMarker | null {
    // Word-boundary aware: avoid matching within words (e.g. "ither", "there")
    const patterns: { marker: ReferentMarker; regex: RegExp }[] = [
      { marker: "here",  regex: /\bhere\b/ },
      { marker: "this",  regex: /\bthis\b/ },
      { marker: "that",  regex: /\bthat\b/ },
      { marker: "it",    regex: /\bit\b/ },
    ];

    for (const { marker, regex } of patterns) {
      if (regex.test(lowerTranscript)) {
        return marker;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // GROUNDING CLASSIFICATION
  // ---------------------------------------------------------------------------

  /**
   * Classify the grounding type for a marker given the current context.
   *
   * Rules:
   * - "here"  → "element" if in an editor context with pane, else "pane"
   * - "this"  → "selection" if active selection, else "pane" if focused pane, else "app"
   * - "that"  → "element" (refers to a previously-seen code entity)
   * - "it"    → "element" (refers to the last execution or selection target)
   */
  classifyGrounding(marker: ReferentMarker, context: ReferentialContext): GroundingType {
    switch (marker) {
      case "here":
        // "here" grounds to element when we have pane context (cursor location)
        if (context.focusedPane) return "element";
        if (context.activeApp) return "pane";
        return "unknown";

      case "this":
        if (context.activeSelection) return "selection";
        if (context.focusedPane) return "pane";
        if (context.activeApp) return "app";
        return "unknown";

      case "that":
      case "it":
        // These always ground to an element from the reference stack
        return "element";

      default:
        return "unknown";
    }
  }

  // ---------------------------------------------------------------------------
  // CANDIDATE SET BUILDING
  // ---------------------------------------------------------------------------

  /**
   * Build the candidate set from the context snapshot.
   * Only adds candidates that are actually present in context — never invents targets.
   */
  private buildCandidateSet(
    marker: ReferentMarker,
    grounding: GroundingType,
    context: ReferentialContext
  ): ReferentialCandidate[] {
    const candidates: ReferentialCandidate[] = [];

    switch (marker) {
      case "this":
        this.addThisCandidates(grounding, context, candidates);
        break;

      case "here":
        this.addHereCandidates(grounding, context, candidates);
        break;

      case "that":
      case "it":
        this.addPersistentReferenceCandidates(context, candidates);
        break;
    }

    return candidates;
  }

  /**
   * Build candidates for "this" — grounded to selection, pane, or app.
   */
  private addThisCandidates(
    grounding: GroundingType,
    context: ReferentialContext,
    out: ReferentialCandidate[]
  ): void {
    if (grounding === "selection" && context.activeSelection) {
      out.push({
        label: context.activeSelection.label,
        id: context.activeSelection.id,
        entityType: "selection",
        confidence: 0.95, // Active selection is the strongest signal for "this"
        source: "active_selection",
      });
    } else if (grounding === "pane" && context.focusedPane) {
      out.push({
        label: context.focusedPane.label,
        id: context.focusedPane.id,
        entityType: "surface",
        confidence: 0.80, // Focused pane is a solid signal
        source: "focus_scope",
      });
    } else if (grounding === "app" && context.activeApp) {
      out.push({
        label: context.activeApp.label,
        id: context.activeApp.id,
        entityType: "surface",
        confidence: 0.75,
        source: "focus_scope",
      });
    }
  }

  /**
   * Build candidates for "here" — grounded to element or pane location.
   */
  private addHereCandidates(
    grounding: GroundingType,
    context: ReferentialContext,
    out: ReferentialCandidate[]
  ): void {
    if (grounding === "element" && context.focusedPane) {
      // "here" in an editor → the current cursor/element location within the pane
      out.push({
        label: `${context.focusedPane.label}:cursor`,
        id: `${context.focusedPane.id}:cursor`,
        entityType: "selection",
        confidence: 0.88,
        source: "focus_scope",
      });
    } else if (grounding === "pane" && context.focusedPane) {
      out.push({
        label: context.focusedPane.label,
        id: context.focusedPane.id,
        entityType: "surface",
        confidence: 0.75,
        source: "focus_scope",
      });
    }
  }

  /**
   * Build candidates for "that" / "it" — resolved from the reference stack.
   * Tries entity types in priority order: selection, execution, error, file.
   */
  private addPersistentReferenceCandidates(
    context: ReferentialContext,
    out: ReferentialCandidate[]
  ): void {
    const typesByPriority: ReferentEntryType[] = ["selection", "execution", "error", "file"];

    for (const type of typesByPriority) {
      const entry = context.referenceStack.lookup(type);
      if (entry) {
        // Decay confidence proportionally to how old the entry is (max 30s TTL)
        // Fresher → higher confidence, older → lower (but still above 0.5)
        const ageMs = Date.now() - entry.pushedAt;
        const ageRatio = Math.min(ageMs / 30_000, 1.0);
        const confidence = 0.90 - (ageRatio * 0.25); // 0.90 → 0.65 as it ages

        out.push({
          label: entry.label,
          id: entry.id,
          entityType: type,
          confidence,
          source: "reference_stack",
        });
        // Only take the highest-priority type that has a live entry
        break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // POLICY FILTERING
  // ---------------------------------------------------------------------------

  /**
   * Apply policy/mode filtering to the candidate set.
   *
   * Phase 4A rules:
   * - In secure or shared_room mode, reject candidates with confidence < 0.80
   *   (stricter threshold than normal)
   * - If speaker is not verified in secure mode, reject ALL candidates from
   *   reference_stack (persistent references require verified identity)
   *
   * This gate rejects — it does not reinterpret or invent new candidates.
   */
  private applyPolicyFilter(
    candidates: ReferentialCandidate[],
    context: ReferentialContext
  ): ReferentialCandidate[] {
    if (context.securityMode === "standard") {
      return candidates;
    }

    // Stricter mode: require higher confidence
    const secureThreshold = 0.80;

    return candidates.filter(candidate => {
      // Reject low-confidence candidates in stricter modes
      if (candidate.confidence < secureThreshold) {
        return false;
      }

      // In secure mode, unverified speakers cannot use persistent reference stack
      if (
        context.securityMode === "secure" &&
        !context.speakerVerified &&
        candidate.source === "reference_stack"
      ) {
        return false;
      }

      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // UTILITY
  // ---------------------------------------------------------------------------

  /**
   * Check whether a transcript contains any supported referent marker.
   * Quick test before calling resolve() if the caller wants to short-circuit.
   */
  hasReferentMarker(transcript: string): boolean {
    return this.detectMarker(transcript.toLowerCase().trim()) !== null;
  }

  /**
   * Return the set of markers that would be detected in the given transcript.
   * Useful for diagnostics and understanding overlapping markers.
   */
  detectAllMarkers(transcript: string): ReferentMarker[] {
    const lower = transcript.toLowerCase().trim();
    return ALL_MARKERS.filter(marker => new RegExp(`\\b${marker}\\b`).test(lower));
  }
}
