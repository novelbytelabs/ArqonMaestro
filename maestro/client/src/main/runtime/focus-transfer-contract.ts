/**
 * Focus Transfer Contract
 *
 * Defines the contract for focus transfers including preconditions,
 * postconditions, and safety invariants.
 * Part of FP-2.1: Pre-transfer validation checks
 *
 * This contract ensures:
 * - PreConditions: What must be true before transfer
 * - PostConditions: What must be true after transfer
 * - SafetyInvariants: What must always be true
 */

import { FocusState, FocusTarget, FocusLayer } from "./focus-verification-service";

/**
 * Result of a single validation check
 */
export interface ValidationCheck {
  /** Name of the check */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Additional details about the check result */
  details: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Whether all checks passed */
  valid: boolean;
  /** Individual check results */
  checks: ValidationCheck[];
  /** Whether the operation can proceed */
  canProceed: boolean;
  /** List of blocking issues if canProceed is false */
  blockingIssues: string[];
}

/**
 * Represents a contract violation with details
 */
export interface ContractViolation {
  /** Name of the violated contract/post-condition */
  contractName: string;
  /** Description of what was expected */
  expected: string;
  /** Description of what actually occurred */
  actual: string;
  /** Severity of the violation */
  severity: "critical" | "warning" | "info";
  /** Timestamp when violation was detected */
  timestamp: string;
}

/**
 * Post-condition check result
 */
export interface PostConditionCheck {
  /** Name of the post-condition */
  name: string;
  /** Whether the condition was satisfied */
  satisfied: boolean;
  /** Additional details about the check */
  details: string;
}

/**
 * Contract validation result for post-transfer verification (FP-2.2)
 * Includes detailed failure diagnostics and remediation steps
 */
export interface ContractValidationResult {
  /** Whether all post-conditions passed */
  passed: boolean;
  /** Individual post-condition check results */
  postConditions: PostConditionCheck[];
  /** List of contract violations if any */
  violations: ContractViolation[];
  /** Suggested remediation steps */
  remediation: string[];
  /** Overall confidence in the transfer outcome [0.0, 1.0] */
  confidence: number;
  /** Timestamp of the validation */
  timestamp: string;
}

/**
 * Contract result type with pass/fail status for executor integration
 */
export interface ContractResult {
  /** Whether the contract validation passed */
  passed: boolean;
  /** Summary of the validation */
  summary: string;
  /** Detailed validation result */
  validationResult: ContractValidationResult;
  /** Whether the transfer was successful overall */
  transferSuccessful: boolean;
}

/**
 * Focus Transfer Contract
 *
 * Defines the conditions that must be met for a safe focus transfer
 */
export class FocusTransferContract {
  /**
   * PreConditions: What must be true before transfer
   *
   * These conditions are checked BEFORE any focus transfer attempt
   */
  static PreConditions = {
    /**
     * Check if the target exists/is accessible
     * @param target - The target to check
     * @returns True if target is valid and exists
     */
    targetExists(target: FocusTarget): boolean {
      if (!target || !target.entity) {
        return false;
      }
      // Entity must have a valid name
      const entityName = target.entity.trim();
      return entityName.length > 0;
    },

    /**
     * Check if the source state is valid
     * @param source - The current focus state
     * @returns True if source state is valid
     */
    sourceIsValid(source: FocusState): boolean {
      if (!source) {
        return false;
      }
      // Source must have a valid entity
      if (!source.entity || source.entity.trim().length === 0) {
        return false;
      }
      // Source must have a valid layer
      if (source.layer === undefined || source.layer === null) {
        return false;
      }
      // Source must have a valid source of truth
      if (!source.sourceOfTruth) {
        return false;
      }
      return true;
    },

    /**
     * Check if transfer is allowed from source to target
     * @param source - The current focus state
     * @param target - The target for the transfer
     * @returns True if transfer is allowed
     */
    transferIsAllowed(source: FocusState, target: FocusTarget): boolean {
      // Cannot transfer to the same entity
      if (source.entity.toLowerCase() === target.entity.toLowerCase()) {
        return false;
      }

      // Layer must be valid (currently only Layers 2-3 are supported)
      if (target.layer < FocusLayer.APPLICATION || target.layer > FocusLayer.WINDOW) {
        return false;
      }

      // For window focus (Layer 3), source must be at application level (Layer 2)
      if (target.layer === FocusLayer.WINDOW && source.layer !== FocusLayer.APPLICATION) {
        return false;
      }

      return true;
    },

    /**
     * Check if resources are available for the transfer
     * @returns True if resources are available
     */
    resourcesAvailable(): boolean {
      // Check if we have access to the necessary system resources
      // This is a simplified check - in production, would check:
      // - System memory
      // - Driver connectivity
      // - Permission to focus windows
      return true;
    },
  };

  /**
   * PostConditions: What must be true after transfer
   *
   * These conditions are checked AFTER a focus transfer attempt
   */
  static PostConditions = {
    /**
     * Check if focus arrived at the target
     * @param target - The intended target
     * @param actualState - The actual focus state after transfer
     * @returns True if focus arrived at target
     */
    focusArrived(target: FocusTarget, actualState: FocusState): boolean {
      const targetEntity = target.entity.toLowerCase();
      const actualEntity = actualState.entity.toLowerCase();

      // Exact match
      if (targetEntity === actualEntity) {
        return true;
      }

      // Partial match (e.g., "vscode" matches "Visual Studio Code")
      return targetEntity.includes(actualEntity) || actualEntity.includes(targetEntity);
    },

    /**
     * Check if verification passed
     * @param verificationResult - The verification result
     * @returns True if verification passed
     */
    verificationPassed(verificationResult: { success: boolean; confidence: number }): boolean {
      // Verification passes if it succeeded with sufficient confidence
      return verificationResult.success && verificationResult.confidence >= 0.8;
    },

    /**
     * Check if there are no side effects
     * @param originalState - The state before transfer
     * @param currentState - The state after transfer
     * @returns True if no unexpected side effects occurred
     */
    noSideEffects(originalState: FocusState, currentState: FocusState): boolean {
      // The only expected change is the focused entity
      // Other attributes should remain consistent
      if (originalState.layer !== currentState.layer) {
        return false;
      }
      if (originalState.sourceOfTruth !== currentState.sourceOfTruth) {
        // Source of truth can change, but let's log this as informational
        console.log("[FocusTransferContract] Source of truth changed:", 
          originalState.sourceOfTruth, "->", currentState.sourceOfTruth);
      }
      return true;
    },
  };

  /**
   * SafetyInvariants: What must always be true
   *
   * These invariants are checked before and after every transfer
   */
  static SafetyInvariants = {
    /**
     * Focus is never lost - there is always a focused entity
     * @param state - The current focus state
     * @returns True if focus is not lost
     */
    focusNeverLost(state: FocusState): boolean {
      // Focus is never lost if we have a valid entity
      return state !== null && 
             state !== undefined && 
             state.entity !== null && 
             state.entity !== undefined &&
             state.entity.trim().length > 0;
    },

    /**
     * No orphaned focus - focus is always associated with a valid layer
     * @param state - The current focus state
     * @returns True if focus is not orphaned
     */
    noOrphanedFocus(state: FocusState): boolean {
      // Focus is not orphaned if it has a valid layer
      return state !== null && 
             state !== undefined && 
             state.layer !== undefined && 
             state.layer !== null &&
             (state.layer === FocusLayer.APPLICATION || state.layer === FocusLayer.WINDOW);
    },

    /**
     * Driver consistency - driver state matches system state
     * @param systemState - The system focus state
     * @param driverState - The driver tracking state
     * @returns True if driver is consistent
     */
    driverConsistency(systemState: FocusState, driverState: FocusState): boolean {
      if (!driverState) {
        // If no driver state, assume it's initializing
        return true;
      }

      // Check if entities match (case-insensitive)
      const systemEntity = systemState.entity.toLowerCase();
      const driverEntity = driverState.entity.toLowerCase();

      return systemEntity === driverEntity || 
             systemEntity.includes(driverEntity) || 
             driverEntity.includes(systemEntity);
    },
  };

  /**
   * Validate all preconditions for a focus transfer
   * @param target - The target for the transfer
   * @param source - The current focus state
   * @returns ValidationResult with all check results
   */
  static validatePreConditions(
    target: FocusTarget,
    source: FocusState
  ): ValidationResult {
    const checks: ValidationCheck[] = [];

    // Check 1: Target exists
    const targetExists = this.PreConditions.targetExists(target);
    checks.push({
      name: "targetExists",
      passed: targetExists,
      details: targetExists
        ? `Target "${target.entity}" is valid`
        : `Target is invalid or empty`,
    });

    // Check 2: Source is valid
    const sourceValid = this.PreConditions.sourceIsValid(source);
    checks.push({
      name: "sourceIsValid",
      passed: sourceValid,
      details: sourceValid
        ? `Source state is valid (entity: ${source.entity}, layer: ${source.layer})`
        : `Source state is invalid or missing required fields`,
    });

    // Check 3: Transfer is allowed
    const transferAllowed = sourceValid && this.PreConditions.transferIsAllowed(source, target);
    checks.push({
      name: "transferIsAllowed",
      passed: transferAllowed,
      details: transferAllowed
        ? `Transfer from "${source.entity}" to "${target.entity}" is allowed`
        : `Transfer is not allowed (may be same entity or invalid layer)`,
    });

    // Check 4: Resources available
    const resourcesAvailable = this.PreConditions.resourcesAvailable();
    checks.push({
      name: "resourcesAvailable",
      passed: resourcesAvailable,
      details: resourcesAvailable
        ? "System resources are available"
        : "System resources are not available",
    });

    // Determine if can proceed
    const blockingIssues = checks
      .filter((c) => !c.passed)
      .map((c) => c.details);

    const canProceed = checks.every((c) => c.passed);

    return {
      valid: canProceed,
      checks,
      canProceed,
      blockingIssues,
    };
  }

  /**
   * Validate all postconditions after a focus transfer
   * @param target - The intended target
   * @param actualState - The actual focus state after transfer
   * @param verificationResult - The verification result
   * @param originalState - The state before transfer (for side effect check)
   * @returns ValidationResult with all check results
   */
  static validatePostConditions(
    target: FocusTarget,
    actualState: FocusState,
    verificationResult: { success: boolean; confidence: number },
    originalState: FocusState
  ): ValidationResult {
    const checks: ValidationCheck[] = [];

    // Check 1: Focus arrived at target
    const focusArrived = this.PostConditions.focusArrived(target, actualState);
    checks.push({
      name: "focusArrived",
      passed: focusArrived,
      details: focusArrived
        ? `Focus successfully transferred to "${actualState.entity}"`
        : `Focus did not arrive at target "${target.entity}" (actual: "${actualState.entity}")`,
    });

    // Check 2: Verification passed
    const verificationPassed = this.PostConditions.verificationPassed(verificationResult);
    checks.push({
      name: "verificationPassed",
      passed: verificationPassed,
      details: verificationPassed
        ? `Verification passed with confidence ${(verificationResult.confidence * 100).toFixed(0)}%`
        : `Verification failed or confidence too low (${(verificationResult.confidence * 100).toFixed(0)}%)`,
    });

    // Check 3: No side effects
    const noSideEffects = this.PostConditions.noSideEffects(originalState, actualState);
    checks.push({
      name: "noSideEffects",
      passed: noSideEffects,
      details: noSideEffects
        ? "No unexpected side effects detected"
        : "Unexpected side effects detected in focus state",
    });

    // Determine if can proceed (for postconditions, this means transfer was successful)
    const blockingIssues = checks
      .filter((c) => !c.passed)
      .map((c) => c.details);

    const canProceed = checks.every((c) => c.passed);

    return {
      valid: canProceed,
      checks,
      canProceed,
      blockingIssues,
    };
  }

  /**
   * Validate safety invariants
   * @param currentState - The current focus state
   * @param driverState - Optional driver state for consistency check
   * @returns ValidationResult with all invariant check results
   */
  static validateSafetyInvariants(
    currentState: FocusState,
    driverState?: FocusState
  ): ValidationResult {
    const checks: ValidationCheck[] = [];

    // Check 1: Focus never lost
    const focusNeverLost = this.SafetyInvariants.focusNeverLost(currentState);
    checks.push({
      name: "focusNeverLost",
      passed: focusNeverLost,
      details: focusNeverLost
        ? `Focus is present on "${currentState.entity}"`
        : "Focus has been lost - no valid focused entity",
    });

    // Check 2: No orphaned focus
    const noOrphanedFocus = this.SafetyInvariants.noOrphanedFocus(currentState);
    checks.push({
      name: "noOrphanedFocus",
      passed: noOrphanedFocus,
      details: noOrphanedFocus
        ? `Focus is properly associated with layer ${currentState.layer}`
        : "Focus is orphaned - no valid layer association",
    });

    // Check 3: Driver consistency
    const driverConsistent = driverState
      ? this.SafetyInvariants.driverConsistency(currentState, driverState)
      : true;
    checks.push({
      name: "driverConsistency",
      passed: driverConsistent,
      details: driverConsistent
        ? "Driver state is consistent with system state"
        : "Driver state mismatch with system state",
    });

    // Determine if can proceed
    const blockingIssues = checks
      .filter((c) => !c.passed)
      .map((c) => c.details);

    const canProceed = checks.every((c) => c.passed);

    return {
      valid: canProceed,
      checks,
      canProceed,
      blockingIssues,
    };
  }
}

export default FocusTransferContract;
