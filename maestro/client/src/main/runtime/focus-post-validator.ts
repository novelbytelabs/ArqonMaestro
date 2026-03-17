/**
 * Focus Post-Validator
 *
 * Validates postconditions after focus transfer attempts.
 * Part of FP-2.2: Post-transfer contract verification
 *
 * This service:
 * 1. Validates that focus arrived at the target
 * 2. Verifies that verification passed
 * 3. Checks for no unexpected side effects
 * 4. Provides detailed failure diagnostics
 */

import * as driver from "../driver/stub";
import {
  FocusState,
  FocusTarget,
  FocusLayer,
  FocusSourceOfTruth,
  FocusVerificationResult,
} from "./focus-verification-service";
import FocusTransferContract, {
  ContractValidationResult,
  ContractViolation,
  PostConditionCheck,
} from "./focus-transfer-contract";

/**
 * Focus Transfer data structure
 */
export interface FocusTransfer {
  /** The target for the transfer */
  target: FocusTarget;
  /** The source state before transfer */
  sourceState: FocusState;
  /** The actual state after transfer */
  actualState: FocusState;
  /** The verification result from focus verification service */
  verificationResult: FocusVerificationResult;
  /** Timestamp of the transfer attempt */
  timestamp: string;
}

/**
 * Configuration for the post-validator
 */
export interface PostValidatorConfig {
  /** Whether to skip validation (for testing) */
  skipValidation?: boolean;
  /** Whether to log detailed validation steps */
  verboseLogging?: boolean;
  /** Minimum confidence threshold for verification (0.0-1.0) */
  minConfidenceThreshold?: number;
}

export default class FocusPostValidator {
  private config: PostValidatorConfig;
  private cachedPreTransferState?: FocusState;
  private lastVerificationResult?: FocusVerificationResult;
  private lastTarget?: FocusTarget;

  constructor(config: PostValidatorConfig = {}) {
    this.config = {
      skipValidation: false,
      verboseLogging: false,
      minConfidenceThreshold: 0.8,
      ...config,
    };
  }

  /**
   * Store the pre-transfer state for later comparison
   * Should be called before the focus transfer occurs
   *
   * @param state - The focus state before transfer
   */
  setPreTransferState(state: FocusState): void {
    this.cachedPreTransferState = state;
  }

  /**
   * Store the verification result from the verification service
   * Should be called after verification completes
   *
   * @param result - The verification result
   * @param target - The target that was verified
   */
  setVerificationResult(result: FocusVerificationResult, target: FocusTarget): void {
    this.lastVerificationResult = result;
    this.lastTarget = target;
  }

  /**
   * Validate all post-conditions for a focus transfer
   *
   * @param transfer - The focus transfer data
   * @returns ContractValidationResult with all check results
   */
  async validatePostConditions(transfer: FocusTransfer): Promise<ContractValidationResult> {
    const timestamp = new Date().toISOString();

    // If skipping validation, return a pass-all result
    if (this.config.skipValidation) {
      return {
        passed: true,
        postConditions: [],
        violations: [],
        remediation: [],
        confidence: 1.0,
        timestamp,
      };
    }

    const postConditions: PostConditionCheck[] = [];
    const violations: ContractViolation[] = [];
    const remediation: string[] = [];

    // Check 1: Focus arrived at target
    const focusArrivedCheck = await this.verifyFocusArrived(transfer.target, transfer.actualState);
    postConditions.push(focusArrivedCheck);

    if (!focusArrivedCheck.satisfied) {
      violations.push({
        contractName: "focusArrived",
        expected: `Focus should have arrived at "${transfer.target.entity}"`,
        actual: `Focus is on "${transfer.actualState.entity}"`,
        severity: "critical",
        timestamp,
      });
      remediation.push("Verify that the target application is running and accessible");
      remediation.push("Check if window focus was blocked by another application");
    }

    // Check 2: Verification passed
    const verificationCheck = await this.verifyVerificationPassed();
    postConditions.push(verificationCheck);

    if (!verificationCheck.satisfied && this.lastVerificationResult) {
      const severity: "critical" | "warning" | "info" =
        this.lastVerificationResult.confidence < 0.5 ? "critical" : "warning";
      violations.push({
        contractName: "verificationPassed",
        expected: `Verification should pass with confidence >= ${(this.config.minConfidenceThreshold || 0.8) * 100}%`,
        actual: `Verification confidence was ${(this.lastVerificationResult.confidence * 100).toFixed(0)}%`,
        severity,
        timestamp,
      });
      if (severity === "critical") {
        remediation.push("Re-attempt the focus transfer");
        remediation.push("Check system focus capabilities");
      }
    }

    // Check 3: No side effects
    const sideEffectsCheck = await this.verifyNoSideEffects(transfer.sourceState, transfer.actualState);
    postConditions.push(sideEffectsCheck);

    if (!sideEffectsCheck.satisfied) {
      violations.push({
        contractName: "noSideEffects",
        expected: "No unexpected side effects should occur",
        actual: sideEffectsCheck.details,
        severity: "warning",
        timestamp,
      });
      remediation.push("Review focus state consistency");
    }

    // Calculate overall confidence
    const confidence = this.calculateConfidence(postConditions);

    // Determine if all post-conditions passed
    const passed = postConditions.every((pc) => pc.satisfied);

    const result: ContractValidationResult = {
      passed,
      postConditions,
      violations,
      remediation,
      confidence,
      timestamp,
    };

    if (this.config.verboseLogging) {
      this.logValidationResult(result);
    }

    return result;
  }

  /**
   * Verify that focus arrived at the target
   *
   * @param target - The intended target
   * @param actualState - The actual focus state after transfer
   * @returns True if focus arrived at target
   */
  async verifyFocusArrived(target: FocusTarget, actualState: FocusState): Promise<PostConditionCheck> {
    try {
      // Use the contract's post-condition check
      const arrived = FocusTransferContract.PostConditions.focusArrived(target, actualState);

      const targetEntity = target.entity.toLowerCase();
      const actualEntity = actualState.entity.toLowerCase();

      // Apply normalization for comparison (same as verification service)
      const normalizedTarget = this.normalizeEntityAlias(targetEntity);
      const normalizedActual = this.normalizeEntityAlias(actualEntity);
      
      // Re-check with normalization
      const normalizedArrived = normalizedTarget === normalizedActual || 
        normalizedActual.includes(normalizedTarget) || 
        normalizedTarget.includes(normalizedActual);

      return {
        name: "focusArrived",
        satisfied: normalizedArrived,
        details: normalizedArrived
          ? `Focus successfully transferred to "${actualState.entity}"`
          : `Focus did not arrive at target "${targetEntity}" (actual: "${actualEntity}")`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: "focusArrived",
        satisfied: false,
        details: `Error verifying focus arrival: ${errorMessage}`,
      };
    }
  }

  /**
   * Normalize entity aliases for matching
   */
  private normalizeEntityAlias(entity: string): string {
    // VS Code aliases (window class may have extra like "code, code")
    if (entity === "code" || entity.startsWith("code") || entity.includes("vscode")) {
      return "vscode";
    }
    // Chrome aliases
    if (entity.includes("chrome") && !entity.startsWith("chromium")) {
      return "chrome";
    }
    // System terminal
    if (entity.includes("gnome-terminal") || entity === "console") {
      return "gnome-terminal";
    }
    return entity;
  }

  /**
   * Verify that verification passed
   *
   * @returns True if verification passed
   */
  async verifyVerificationPassed(): Promise<PostConditionCheck> {
    try {
      if (!this.lastVerificationResult) {
        return {
          name: "verificationPassed",
          satisfied: false,
          details: "No verification result available",
        };
      }

      const passed = FocusTransferContract.PostConditions.verificationPassed({
        success: this.lastVerificationResult.success,
        confidence: this.lastVerificationResult.confidence,
      });

      const threshold = this.config.minConfidenceThreshold || 0.8;

      return {
        name: "verificationPassed",
        satisfied: passed,
        details: passed
          ? `Verification passed with confidence ${(this.lastVerificationResult.confidence * 100).toFixed(0)}%`
          : `Verification failed or confidence too low (${(this.lastVerificationResult.confidence * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: "verificationPassed",
        satisfied: false,
        details: `Error verifying verification result: ${errorMessage}`,
      };
    }
  }

  /**
   * Verify that no unexpected side effects occurred
   *
   * @param originalState - The state before transfer
   * @param currentState - The state after transfer
   * @returns True if no unexpected side effects occurred
   */
  async verifyNoSideEffects(
    originalState: FocusState,
    currentState: FocusState
  ): Promise<PostConditionCheck> {
    try {
      const noSideEffects = FocusTransferContract.PostConditions.noSideEffects(originalState, currentState);

      // Additional checks for side effects
      let additionalDetails = "";
      if (originalState.layer !== currentState.layer) {
        additionalDetails = `Layer changed from ${originalState.layer} to ${currentState.layer}`;
      }

      return {
        name: "noSideEffects",
        satisfied: noSideEffects,
        details: noSideEffects
          ? "No unexpected side effects detected"
          : `Unexpected side effects detected: ${additionalDetails}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        name: "noSideEffects",
        satisfied: false,
        details: `Error verifying no side effects: ${errorMessage}`,
      };
    }
  }

  /**
   * Get the cached pre-transfer state
   */
  getPreTransferState(): FocusState | undefined {
    return this.cachedPreTransferState;
  }

  /**
   * Clear cached state (call after validation complete)
   */
  clearCache(): void {
    this.cachedPreTransferState = undefined;
    this.lastVerificationResult = undefined;
    this.lastTarget = undefined;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PostValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate overall confidence from post-condition checks
   */
  private calculateConfidence(checks: PostConditionCheck[]): number {
    if (checks.length === 0) {
      return 1.0;
    }

    const passedCount = checks.filter((c) => c.satisfied).length;
    return passedCount / checks.length;
  }

  /**
   * Internal logging helper
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[FocusPostValidator] ${message}`);
    }
  }

  /**
   * Log validation result
   */
  private logValidationResult(result: ContractValidationResult): void {
    console.log(`[FocusPostValidator] Post-Validation Result:`);
    console.log(`  Passed: ${result.passed}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    if (result.postConditions.length > 0) {
      console.log(`  Post-Conditions:`);
      for (const check of result.postConditions) {
        console.log(`    - ${check.name}: ${check.satisfied ? "PASS" : "FAIL"}`);
        console.log(`      ${check.details}`);
      }
    }
    if (result.violations.length > 0) {
      console.log(`  Violations:`);
      for (const violation of result.violations) {
        console.log(`    - [${violation.severity}] ${violation.contractName}: ${violation.expected}`);
        console.log(`      Actual: ${violation.actual}`);
      }
    }
    if (result.remediation.length > 0) {
      console.log(`  Remediation:`);
      for (const step of result.remediation) {
        console.log(`    - ${step}`);
      }
    }
  }
}
