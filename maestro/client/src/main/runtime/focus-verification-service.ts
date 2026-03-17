/**
 * Focus Verification Service
 *
 * Provides post-transfer verification for focus operations.
 * Part of FP-1.1: Verification step after focus transfer.
 * Part of FP-1.2: Source-of-truth classification integrated
 * Part of FP-3A: Extended with region support (Layer 4)
 *
 * This service:
 * 1. Queries the current focus state after a transfer attempt
 * 2. Compares it against the intended target
 * 3. Returns a verification result (success/failure/mismatch)
 * 4. Classifies authority source for each focus query
 * 5. Supports region-level focus (Layer 4) for VS Code and Chrome
 */

import * as driver from "../driver/stub";
import FocusAuthorityService, {
  FocusAuthority,
  FocusAuthorityAnalysis,
} from "./focus-authority-service";
import { ContractValidationResult } from "./focus-transfer-contract";
import { RegionKind, RegionTarget } from "./focus-region-service";

/**
 * Focus layer types as defined in the Focus Project Charter
 */
export enum FocusLayer {
  APPLICATION = 2, // Layer 2: Application focus
  WINDOW = 3, // Layer 3: Window focus within an application
  REGION = 4, // Layer 4: Region focus within a window (FP-3A)
}

/**
 * Source of Truth classification for focus state
 */
export enum FocusSourceOfTruth {
  OPERATING_SYSTEM = "operating_system",
  APPLICATION = "application",
  MAESTRO = "maestro",
}

/**
 * Focus state representing the current focus at a given layer
 * Extended in FP-3A to support region-level focus (Layer 4)
 */
export interface FocusState {
  /** The focused entity name (application name or window title) */
  entity: string;
  /** The layer at which focus is held */
  layer: FocusLayer;
  /** The source of truth for this focus state */
  sourceOfTruth: FocusSourceOfTruth;
  /** Timestamp when this state was captured (ISO 8601) */
  timestamp: string;
  /** Region kind for Layer 4 focus (FP-3A) */
  regionKind?: RegionKind;
  /** Optional region identifier */
  regionId?: string;
}

/**
 * Target for a focus transfer operation
 * Extended in FP-3A to support region-level focus (Layer 4)
 */
export interface FocusTarget {
  /** The target entity name */
  entity: string;
  /** The target layer */
  layer: FocusLayer;
  /** Region kind for Layer 4 focus (FP-3A) */
  regionKind?: RegionKind;
  /** Optional region identifier (e.g., terminal instance ID) */
  regionId?: string;
}

/**
 * Result of a focus verification operation
 */
export interface FocusVerificationResult {
  /** Whether the verification was successful */
  success: boolean;
  /** The actual focus state after transfer */
  actual: FocusState;
  /** The expected focus state from the target */
  expected: FocusState;
  /** Confidence score [0.0, 1.0] */
  confidence: number;
  /** Additional details about the verification */
  details: string;
  /** Authority classification for the verification */
  authorityAnalysis: FocusAuthorityAnalysis;
}

/**
 * History entry for a focus transfer with verification
 */
export interface FocusHistoryEntry {
  /** Unique identifier for this transfer */
  id: string;
  /** The target that was requested */
  target: FocusTarget;
  /** The verification result */
  verification: FocusVerificationResult;
  /** The contract validation result (FP-2.2) */
  contractValidation?: ContractValidationResult;
  /** Timestamp of the transfer attempt (ISO 8601) */
  timestamp: string;
}

export default class FocusVerificationService {
  private authorityService: FocusAuthorityService;

  constructor() {
    this.authorityService = new FocusAuthorityService();
  }
  /**
   * Query the current focus state from the system
   */
  async queryCurrentFocus(): Promise<FocusState> {
    const timestamp = new Date().toISOString();

    // Get the currently active application from the OS
    const activeApp = await driver.getActiveApplication();
    const appName = activeApp ? activeApp.toLowerCase() : "";

    // For Layer 2 (Application focus), we query the OS
    // The OS is the Source of Truth for application focus
    return {
      entity: appName,
      layer: FocusLayer.APPLICATION,
      sourceOfTruth: FocusSourceOfTruth.OPERATING_SYSTEM,
      timestamp,
    };
  }

  /**
   * Verify that a focus transfer was successful
   *
   * @param target - The intended focus target
   * @returns Verification result with success status and confidence score
   */
  async verifyFocusTransfer(target: FocusTarget): Promise<FocusVerificationResult> {
    console.log(`[FocusVerificationService] Verifying focus transfer to: ${target.entity}`);
    
    // Small delay to allow focus to settle (as per existing system.ts pattern)
    await this.delay(100);

    // Query current focus state
    const actual = await this.queryCurrentFocus();
    console.log(`[FocusVerificationService] Current focus: ${actual.entity} (Source: ${actual.sourceOfTruth})`);

    // Build expected state from target
    const expected: FocusState = {
      entity: target.entity.toLowerCase(),
      layer: target.layer,
      sourceOfTruth: FocusSourceOfTruth.OPERATING_SYSTEM,
      timestamp: new Date().toISOString(),
    };

    // Compare actual vs expected
    const isMatch = this.compareFocusStates(actual, expected);
    const confidence = this.computeConfidence(actual, expected);
    console.log(`[FocusVerificationService] Match: ${isMatch}, Confidence: ${confidence}`);

    // Analyze authority sources for the verification
    const authorityAnalysis = this.authorityService.analyzeAuthorities([actual, expected]);
    console.log(`[FocusVerificationService] Authority: ${authorityAnalysis.primaryAuthority}, Conflicts: ${authorityAnalysis.hasConflicts}`);

    // Enhance details with authority information if there are conflicts
    let details = isMatch
      ? `Focus successfully transferred to ${target.entity}`
      : `Focus mismatch: expected ${target.entity}, got ${actual.entity}`;

    if (authorityAnalysis.hasConflicts) {
      details += ` (Authority conflict detected: ${authorityAnalysis.conflictDetails?.join("; ")})`;
    }

    const result: FocusVerificationResult = {
      success: isMatch,
      actual,
      expected,
      confidence,
      details,
      authorityAnalysis,
    };

    return result;
  }

  /**
   * Compare two focus states for equality
   */
  private compareFocusStates(actual: FocusState, expected: FocusState): boolean {
    // Compare at the target layer
    if (actual.layer !== expected.layer) {
      return false;
    }

    // Compare entity names (case-insensitive)
    const actualEntity = actual.entity.toLowerCase();
    const expectedEntity = expected.entity.toLowerCase();

    // Apply alias normalization before comparison
    const normalizedActual = this.normalizeEntityAlias(actualEntity);
    const normalizedExpected = this.normalizeEntityAlias(expectedEntity);

    // Exact match (after normalization)
    if (normalizedActual === normalizedExpected) {
      return true;
    }

    // Partial match (e.g., "vscode" matches "Visual Studio Code")
    return (
      normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual)
    );
  }

  /**
   * Normalize entity aliases for matching
   * "code" -> "vscode"
   * "google-chrome" -> "chrome"
   * etc.
   */
  private normalizeEntityAlias(entity: string): string {
    // VS Code aliases
    if (entity === "code" || entity.includes("vscode")) {
      return "vscode";
    }
    // Chrome aliases
    if (entity.includes("chrome") && !entity.startsWith("chromium")) {
      return "chrome";
    }
    // gnome-terminal aliases
    if (entity.includes("gnome-terminal") || entity.includes("terminal")) {
      return "gnome-terminal";
    }
    return entity;
  }

  /**
   * Compute confidence score for the verification
   *
   * @param actual - The actual focus state
   * @param expected - The expected focus state
   * @returns Confidence score between 0.0 and 1.0
   */
  private computeConfidence(actual: FocusState, expected: FocusState): number {
    // Exact match at the target layer
    if (this.compareFocusStates(actual, expected)) {
      return 1.0;
    }

    // Different application - complete failure
    if (actual.layer === FocusLayer.APPLICATION && expected.layer === FocusLayer.APPLICATION) {
      const actualEntity = actual.entity.toLowerCase();
      const expectedEntity = expected.entity.toLowerCase();

      // Normalize for comparison
      const normalizedActual = this.normalizeEntityAlias(actualEntity);
      const normalizedExpected = this.normalizeEntityAlias(expectedEntity);

      // Check if we're close (e.g., slight name variation) after normalization
      if (normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual)) {
        return 0.5; // Partial match
      }

      return 0.0; // Complete mismatch
    }

    // Default: uncertain
    return 0.0;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
