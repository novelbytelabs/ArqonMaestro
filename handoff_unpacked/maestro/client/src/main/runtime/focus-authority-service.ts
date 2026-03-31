/**
 * Focus Authority Service
 *
 * Provides source-of-truth classification for focus state.
 * Part of FP-1.2: Source-of-truth classification for focus state.
 *
 * This service:
 * 1. Classifies the authority level for focus state from various sources
 * 2. Determines primary authority when multiple sources exist
 * 3. Detects conflicts between different authority sources
 */

import { FocusState, FocusSourceOfTruth, FocusLayer } from "./focus-verification-service";

/**
 * Focus Authority Levels - hierarchical trust levels for focus state
 *
 * OS_NATIVE: Operating system's native focus (xdotool, native APIs)
 * APPLICATION: Application-reported focus state
 * MAESTRO_DRIVER: Maestro's driver-level knowledge
 * VERIFICATION: Verification service's assessed state
 */
export enum FocusAuthority {
  /** Operating system's native focus tracking (xdotool, native APIs) */
  OS_NATIVE = "OS_NATIVE",
  /** Application-reported focus state */
  APPLICATION = "APPLICATION",
  /** Maestro's driver-level knowledge */
  MAESTRO_DRIVER = "MAESTRO_DRIVER",
  /** Verification service's assessed state */
  VERIFICATION = "VERIFICATION",
}

/**
 * Authority priority for determining primary source
 * Higher priority = more trusted source
 */
export const FocusAuthorityPriority: Record<FocusAuthority, number> = {
  [FocusAuthority.OS_NATIVE]: 4, // Highest - OS is ground truth
  [FocusAuthority.MAESTRO_DRIVER]: 3, // Driver has direct system access
  [FocusAuthority.APPLICATION]: 2, // App reports what it thinks
  [FocusAuthority.VERIFICATION]: 1, // Verification is assessed opinion
};

/**
 * Classification result for a single focus state
 */
export interface FocusAuthorityClassification {
  /** The authority level */
  authority: FocusAuthority;
  /** The original source of truth from the focus state */
  sourceOfTruth: FocusSourceOfTruth;
  /** The focus layer this classification applies to */
  layer: FocusLayer;
  /** Confidence in this classification [0.0, 1.0] */
  confidence: number;
  /** Human-readable description */
  description: string;
}

/**
 * Result of authority analysis with multiple sources
 */
export interface FocusAuthorityAnalysis {
  /** Classifications for each focus state */
  classifications: FocusAuthorityClassification[];
  /** The primary (most trusted) authority */
  primaryAuthority: FocusAuthority;
  /** Whether there are conflicts between sources */
  hasConflicts: boolean;
  /** Details about any conflicts */
  conflictDetails?: string[];
  /** Timestamp of the analysis */
  timestamp: string;
}

/**
 * Query filter for history by authority source
 */
export interface FocusAuthorityQuery {
  /** Filter by authority level */
  authority?: FocusAuthority;
  /** Filter by minimum confidence */
  minConfidence?: number;
}

export default class FocusAuthorityService {
  /**
   * Classify the authority level for a given focus state
   *
   * @param focusState - The focus state to classify
   * @returns The authority classification
   */
  classifyFocusSource(focusState: FocusState): FocusAuthorityClassification {
    const { sourceOfTruth, layer } = focusState;

    // Map the existing FocusSourceOfTruth to the new FocusAuthority
    let authority: FocusAuthority;
    let description: string;
    let confidence: number;

    switch (sourceOfTruth) {
      case FocusSourceOfTruth.OPERATING_SYSTEM:
        authority = FocusAuthority.OS_NATIVE;
        description = "Operating system native focus tracking";
        // OS is most reliable at application layer
        confidence = layer === FocusLayer.APPLICATION ? 1.0 : 0.9;
        break;

      case FocusSourceOfTruth.APPLICATION:
        authority = FocusAuthority.APPLICATION;
        description = "Application-reported focus state";
        // Apps may not always accurately report focus
        confidence = 0.7;
        break;

      case FocusSourceOfTruth.MAESTRO:
        authority = FocusAuthority.MAESTRO_DRIVER;
        description = "Maestro's driver-level knowledge";
        // Driver has direct system access
        confidence = 0.85;
        break;

      default:
        // Unknown source - treat as VERIFICATION (assessed)
        authority = FocusAuthority.VERIFICATION;
        description = "Verification service assessed state";
        confidence = 0.5;
    }

    return {
      authority,
      sourceOfTruth,
      layer,
      confidence,
      description,
    };
  }

  /**
   * Determine the primary authority from multiple sources
   *
   * @param authorities - Array of authority levels to evaluate
   * @returns The primary (most trusted) authority
   */
  determinePrimaryAuthority(authorities: FocusAuthority[]): FocusAuthority {
    if (authorities.length === 0) {
      return FocusAuthority.VERIFICATION;
    }

    if (authorities.length === 1) {
      return authorities[0];
    }

    // Sort by priority (highest first)
    const sorted = [...authorities].sort(
      (a, b) => FocusAuthorityPriority[b] - FocusAuthorityPriority[a]
    );

    return sorted[0];
  }

  /**
   * Detect conflicts between different authority sources
   *
   * @param authorities - Array of authority levels to check
   * @returns True if there are conflicts
   */
  detectConflicts(authorities: FocusAuthority[]): boolean {
    if (authorities.length < 2) {
      return false;
    }

    // Check if we have conflicting authorities (different priority levels)
    const uniqueAuthorities = new Set(authorities);
    return uniqueAuthorities.size > 1;
  }

  /**
   * Analyze multiple focus states and determine authority relationships
   *
   * @param focusStates - Array of focus states to analyze
   * @returns Complete authority analysis
   */
  analyzeAuthorities(focusStates: FocusState[]): FocusAuthorityAnalysis {
    if (focusStates.length === 0) {
      return {
        classifications: [],
        primaryAuthority: FocusAuthority.VERIFICATION,
        hasConflicts: false,
        timestamp: new Date().toISOString(),
      };
    }

    // Classify each focus state
    const classifications = focusStates.map((state) => this.classifyFocusSource(state));

    // Get the authority levels
    const authorities = classifications.map((c) => c.authority);

    // Determine primary authority
    const primaryAuthority = this.determinePrimaryAuthority(authorities);

    // Detect conflicts
    const hasConflicts = this.detectConflicts(authorities);

    // Build conflict details if there are conflicts
    let conflictDetails: string[] | undefined;
    if (hasConflicts) {
      conflictDetails = [];
      const uniqueAuths = [...new Set(authorities)];
      for (let i = 0; i < uniqueAuths.length; i++) {
        for (let j = i + 1; j < uniqueAuths.length; j++) {
          const auth1 = uniqueAuths[i];
          const auth2 = uniqueAuths[j];
          conflictDetails.push(
            `Conflict between ${auth1} (priority ${FocusAuthorityPriority[auth1]}) and ${auth2} (priority ${FocusAuthorityPriority[auth2]})`
          );
        }
      }
    }

    return {
      classifications,
      primaryAuthority,
      hasConflicts,
      conflictDetails,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get a human-readable priority description for an authority
   *
   * @param authority - The authority level
   * @returns Priority description
   */
  getAuthorityPriorityDescription(authority: FocusAuthority): string {
    const priority = FocusAuthorityPriority[authority];
    if (priority >= 4) return "Highest - OS ground truth";
    if (priority >= 3) return "High - Direct system access";
    if (priority >= 2) return "Medium - Application reported";
    return "Low - Assessed verification";
  }

  /**
   * Compare two authority levels
   *
   * @param a - First authority
   * @param b - Second authority
   * @returns True if a has higher priority than b
   */
  hasHigherPriority(a: FocusAuthority, b: FocusAuthority): boolean {
    return FocusAuthorityPriority[a] > FocusAuthorityPriority[b];
  }
}
