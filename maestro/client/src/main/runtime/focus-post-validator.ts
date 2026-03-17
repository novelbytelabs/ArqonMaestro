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

import {
  FocusState,
  FocusTarget,
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
   * IMPORTANT:
   * - Prefer cached pre-transfer state if available, since that is the true
   *   state from before the transfer attempt.
   * - Prefer an explicitly provided verificationResult from the transfer if
   *   no cached verification result exists.
   *
   * @param transfer - The focus transfer data
   * @returns ContractValidationResult with all check results
   */
  async validatePostConditions(transfer: FocusTransfer): Promise<ContractValidationResult> {
    const timestamp = new Date().toISOString();

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

    const effectiveSourceState = this.cachedPreTransferState ?? transfer.sourceState;
    const effectiveVerificationResult =
      this.lastVerificationResult ?? transfer.verificationResult;
    const effectiveTarget = this.lastTarget ?? transfer.target;

    const postConditions: PostConditionCheck[] = [];
    const violations: ContractViolation[] = [];
    const remediation: string[] = [];

    // Check 1: Focus arrived at target
    const focusArrivedCheck = await this.verifyFocusArrived(
      effectiveTarget,
      transfer.actualState
    );
    postConditions.push(focusArrivedCheck);

    if (!focusArrivedCheck.satisfied) {
      violations.push({
        contractName: "focusArrived",
        expected: `Focus should have arrived at "${effectiveTarget.entity}"`,
        actual: `Focus is on "${transfer.actualState.entity}"`,
        severity: "critical",
        timestamp,
      });
      remediation.push("Verify that the target application is running and accessible");
      remediation.push("Check if window focus was blocked by another application");
    }

    // Check 2: Verification passed
    const verificationCheck = await this.verifyVerificationPassed(
      effectiveVerificationResult
    );
    postConditions.push(verificationCheck);

    if (!verificationCheck.satisfied) {
      const severity: "critical" | "warning" | "info" =
        effectiveVerificationResult.confidence < 0.5 ? "critical" : "warning";

      violations.push({
        contractName: "verificationPassed",
        expected: `Verification should pass with confidence >= ${(
          (this.config.minConfidenceThreshold || 0.8) * 100
        ).toFixed(0)}%`,
        actual: `Verification confidence was ${(
          effectiveVerificationResult.confidence * 100
        ).toFixed(0)}%`,
        severity,
        timestamp,
      });

      if (severity === "critical") {
        remediation.push("Re-attempt the focus transfer");
        remediation.push("Check system focus capabilities");
      }
    }

    // Check 3: No side effects
    const sideEffectsCheck = await this.verifyNoSideEffects(
      effectiveTarget,
      effectiveSourceState,
      transfer.actualState
    );
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

    const confidence = this.calculateConfidence(postConditions);
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
  async verifyFocusArrived(
    target: FocusTarget,
    actualState: FocusState
  ): Promise<PostConditionCheck> {
    try {
      const contractArrived = FocusTransferContract.PostConditions.focusArrived(
        target,
        actualState
      );

      const targetEntity = (target.entity || "").toLowerCase().trim();
      const actualEntity = (actualState.entity || "").toLowerCase().trim();

      const normalizedTarget = this.normalizeEntityAlias(targetEntity);
      const normalizedActual = this.normalizeEntityAlias(actualEntity);

      const normalizedArrived =
        normalizedTarget === normalizedActual ||
        normalizedActual.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedActual);

      const satisfied = contractArrived || normalizedArrived;

      return {
        name: "focusArrived",
        satisfied,
        details: satisfied
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
    if (!entity) {
      return "";
    }

    // VS Code aliases
    if (
      entity === "code" ||
      entity.startsWith("code") ||
      entity.includes("vscode") ||
      entity.includes("visual studio code")
    ) {
      return "vscode";
    }

    // Chrome aliases
    if (
      entity.includes("chrome") &&
      !entity.startsWith("chromium")
    ) {
      return "chrome";
    }

    // Terminal aliases
    if (
      entity.includes("gnome-terminal") ||
      entity.includes("terminal") ||
      entity === "console"
    ) {
      return "gnome-terminal";
    }

    return entity;
  }

  /**
   * Verify that verification passed
   *
   * @param verificationResult - The verification result to use
   * @returns True if verification passed
   */
  async verifyVerificationPassed(
    verificationResult: FocusVerificationResult
  ): Promise<PostConditionCheck> {
    try {
      if (!verificationResult) {
        return {
          name: "verificationPassed",
          satisfied: false,
          details: "No verification result available",
        };
      }

      const threshold = this.config.minConfidenceThreshold || 0.8;

      const passed =
        verificationResult.success &&
        verificationResult.confidence >= threshold;

      return {
        name: "verificationPassed",
        satisfied: passed,
        details: passed
          ? `Verification passed with confidence ${(verificationResult.confidence * 100).toFixed(0)}%`
          : `Verification failed or confidence too low (${(verificationResult.confidence * 100).toFixed(0)}% < ${(threshold * 100).toFixed(0)}%)`,
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
   * IMPORTANT:
   * A layer change is not automatically a side effect. It can be expected
   * if the target itself implies a different layer. So we only flag it if
   * it appears inconsistent with the requested target.
   *
   * @param target - The intended focus target
   * @param originalState - The state before transfer
   * @param currentState - The state after transfer
   * @returns True if no unexpected side effects occurred
   */
  async verifyNoSideEffects(
    target: FocusTarget,
    originalState: FocusState,
    currentState: FocusState
  ): Promise<PostConditionCheck> {
    try {
      const contractNoSideEffects =
        FocusTransferContract.PostConditions.noSideEffects(
          originalState,
          currentState
        );

      const targetWithOptionalLayer = target as FocusTarget & { layer?: number };
      const targetLayer = targetWithOptionalLayer.layer;

      const layerChanged = originalState.layer !== currentState.layer;
      const layerChangeMatchesTarget =
        typeof targetLayer === "number" && currentState.layer === targetLayer;

      const orphanedFocus =
        !currentState.entity || currentState.entity.trim().length === 0;

      let satisfied = contractNoSideEffects && !orphanedFocus;
      let details = "No unexpected side effects detected";

      // If contract says false only because layer changed, but that layer
      // matches the requested target, do not treat it as a failure.
      if (!contractNoSideEffects) {
        if (orphanedFocus) {
          satisfied = false;
          details = "Unexpected side effects detected: focus became orphaned";
        } else if (layerChanged && layerChangeMatchesTarget) {
          satisfied = true;
          details = `Layer changed from ${originalState.layer} to ${currentState.layer}, which matches the requested target`;
        } else if (layerChanged) {
          satisfied = false;
          details = `Unexpected side effects detected: layer changed from ${originalState.layer} to ${currentState.layer}`;
        } else {
          satisfied = false;
          details = `Unexpected side effects detected: focus changed from "${originalState.entity}" to "${currentState.entity}" in an inconsistent way`;
        }
      }

      return {
        name: "noSideEffects",
        satisfied,
        details,
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
        console.log(
          `    - [${violation.severity}] ${violation.contractName}: ${violation.expected}`
        );
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