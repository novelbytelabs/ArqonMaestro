/**
 * Focus Pre-Validator
 *
 * Validates preconditions before focus transfer attempts.
 * Part of FP-2.1: Pre-transfer validation checks
 *
 * This service:
 * 1. Validates target existence
 * 2. Checks source state validity
 * 3. Verifies transfer is allowed
 * 4. Checks resource availability
 */

import * as driver from "../driver/stub";
import { FocusState, FocusTarget, FocusLayer, FocusSourceOfTruth } from "./focus-verification-service";
import FocusTransferContract, { ValidationResult, ValidationCheck } from "./focus-transfer-contract";

/**
 * Configuration for the pre-validator
 */
export interface PreValidatorConfig {
  /** Whether to skip validation (for testing) */
  skipValidation?: boolean;
  /** Whether to log detailed validation steps */
  verboseLogging?: boolean;
}

/**
 * Extended validation result with additional metadata
 */
export interface PreValidationResult extends ValidationResult {
  /** The target being validated */
  target: FocusTarget;
  /** The source state at time of validation */
  source: FocusState;
  /** Timestamp of the validation */
  timestamp: string;
}

export default class FocusPreValidator {
  private config: PreValidatorConfig;
  private cachedSourceState?: FocusState;

  constructor(config: PreValidatorConfig = {}) {
    this.config = {
      skipValidation: false,
      verboseLogging: false,
      ...config,
    };
  }

  /**
   * Validate all preconditions for a focus transfer
   *
   * @param target - The target for the transfer
   * @returns ValidationResult with all check results
   */
  async validatePreConditions(target: FocusTarget): Promise<PreValidationResult> {
    const timestamp = new Date().toISOString();

    // Get current source state
    const source = await this.getCurrentSourceState();

    // If skipping validation, return a pass-all result
    if (this.config.skipValidation) {
      return {
        valid: true,
        checks: [],
        canProceed: true,
        blockingIssues: [],
        target,
        source,
        timestamp,
      };
    }

    // Run validation using the contract
    const result = FocusTransferContract.validatePreConditions(target, source);

    if (this.config.verboseLogging) {
      this.logValidationResult(result);
    }

    return {
      ...result,
      target,
      source,
      timestamp,
    };
  }

  /**
   * Check if target exists/is accessible
   *
   * @param target - The target to check
   * @returns True if target exists
   */
  async checkTargetExists(target: FocusTarget): Promise<boolean> {
    if (!target || !target.entity) {
      return false;
    }

    const entityName = target.entity.trim();
    if (entityName.length === 0) {
      return false;
    }

    // Check if the target application is running
    // For now, we check against running applications
    try {
      const runningApps = await this.getRunningApplications();
      
      // Case-insensitive check
      const normalizedTarget = entityName.toLowerCase();
      const isRunning = runningApps.some(
        (app) => app.toLowerCase() === normalizedTarget || 
                 app.toLowerCase().includes(normalizedTarget) ||
                 normalizedTarget.includes(app.toLowerCase())
      );

      return isRunning || runningApps.length === 0; // Allow if we can't get apps
    } catch (error) {
      // If we can't check, assume target might exist
      this.log(`Warning: Could not verify target exists: ${error}`);
      return true;
    }
  }

  /**
   * Check if current source state is valid
   *
   * @returns True if source state is valid
   */
  async checkSourceValid(): Promise<boolean> {
    try {
      const source = await this.getCurrentSourceState();
      return FocusTransferContract.PreConditions.sourceIsValid(source);
    } catch (error) {
      this.log(`Warning: Could not verify source validity: ${error}`);
      return false;
    }
  }

  /**
   * Check if transfer is allowed from source to target
   *
   * @param source - The current focus state
   * @param target - The target for the transfer
   * @returns True if transfer is allowed
   */
  async checkTransferAllowed(source: FocusState, target: FocusTarget): Promise<boolean> {
    return FocusTransferContract.PreConditions.transferIsAllowed(source, target);
  }

  /**
   * Check if system resources are available for the transfer
   *
   * @returns True if resources are available
   */
  async checkResourcesAvailable(): Promise<boolean> {
    try {
      // Check if driver is accessible
      const activeApp = await driver.getActiveApplication();
      
      // If we can query the active application, resources are available
      return activeApp !== null && activeApp !== undefined;
    } catch (error) {
      this.log(`Warning: Could not verify resources: ${error}`);
      return false;
    }
  }

  /**
   * Get the current focus state from the system
   *
   * @returns The current focus state
   */
  async getCurrentSourceState(): Promise<FocusState> {
    // Use cached state if available and recent (within 2 seconds)
    if (this.cachedSourceState) {
      const cacheTime = new Date(this.cachedSourceState.timestamp).getTime();
      const now = Date.now();
      if (now - cacheTime < 2000) {
        return this.cachedSourceState;
      }
    }

    const timestamp = new Date().toISOString();

    try {
      // Query the active application from the OS
      const activeApp = await driver.getActiveApplication();
      const appName = activeApp ? activeApp.toLowerCase() : "unknown";

      const state: FocusState = {
        entity: appName,
        layer: FocusLayer.APPLICATION,
        sourceOfTruth: FocusSourceOfTruth.OPERATING_SYSTEM,
        timestamp,
      };

      // Cache the state
      this.cachedSourceState = state;

      return state;
    } catch (error) {
      // Return a minimal state if we can't query
      const errorState: FocusState = {
        entity: "unknown",
        layer: FocusLayer.APPLICATION,
        sourceOfTruth: FocusSourceOfTruth.MAESTRO,
        timestamp,
      };

      this.log(`Warning: Could not get current focus state: ${error}`);
      return errorState;
    }
  }

  /**
   * Get list of running applications
   *
   * @returns Array of running application names
   */
  async getRunningApplications(): Promise<string[]> {
    try {
      // Use driver to get running applications
      const apps = await driver.getRunningApplications();
      return apps || [];
    } catch (error) {
      this.log(`Warning: Could not get running applications: ${error}`);
      return [];
    }
  }

  /**
   * Validate a single specific check
   *
   * @param checkName - Name of the check to perform
   * @param target - The target for the transfer
   * @returns Result of the individual check
   */
  async validateSingleCheck(checkName: string, target: FocusTarget): Promise<ValidationCheck> {
    const source = await this.getCurrentSourceState();

    switch (checkName) {
      case "targetExists":
        const exists = await this.checkTargetExists(target);
        return {
          name: "targetExists",
          passed: exists,
          details: exists
            ? `Target "${target.entity}" exists`
            : `Target "${target.entity}" does not exist or is not running`,
        };

      case "sourceIsValid":
        const sourceValid = await this.checkSourceValid();
        return {
          name: "sourceIsValid",
          passed: sourceValid,
          details: sourceValid
            ? `Source state is valid (entity: ${source.entity})`
            : `Source state is invalid`,
        };

      case "transferIsAllowed":
        const allowed = await this.checkTransferAllowed(source, target);
        return {
          name: "transferIsAllowed",
          passed: allowed,
          details: allowed
            ? `Transfer from "${source.entity}" to "${target.entity}" is allowed`
            : `Transfer is not allowed`,
        };

      case "resourcesAvailable":
        const resources = await this.checkResourcesAvailable();
        return {
          name: "resourcesAvailable",
          passed: resources,
          details: resources
            ? "System resources are available"
            : "System resources are not available",
        };

      default:
        return {
          name: checkName,
          passed: false,
          details: `Unknown check: ${checkName}`,
        };
    }
  }

  /**
   * Run quick validation (async checks only)
   *
   * @param target - The target for the transfer
   * @returns Quick validation result
   */
  async quickValidate(target: FocusTarget): Promise<{ canProceed: boolean; reason?: string }> {
    try {
      // Quick check: target exists
      const exists = await this.checkTargetExists(target);
      if (!exists) {
        return { canProceed: false, reason: `Target "${target.entity}" not found` };
      }

      // Quick check: resources available
      const resources = await this.checkResourcesAvailable();
      if (!resources) {
        return { canProceed: false, reason: "System resources not available" };
      }

      return { canProceed: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { canProceed: false, reason: `Validation error: ${message}` };
    }
  }

  /**
   * Invalidate the cached source state
   * Call this after a focus transfer to force a fresh state read
   */
  invalidateCache(): void {
    this.cachedSourceState = undefined;
  }

  /**
   * Get cached source state (if available)
   */
  getCachedSourceState(): FocusState | undefined {
    return this.cachedSourceState;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PreValidatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Internal logging helper
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[FocusPreValidator] ${message}`);
    }
  }

  /**
   * Log validation result
   */
  private logValidationResult(result: ValidationResult): void {
    console.log(`[FocusPreValidator] Validation Result:`);
    console.log(`  Valid: ${result.valid}`);
    console.log(`  Can Proceed: ${result.canProceed}`);
    if (result.checks.length > 0) {
      console.log(`  Checks:`);
      for (const check of result.checks) {
        console.log(`    - ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
        console.log(`      ${check.details}`);
      }
    }
    if (result.blockingIssues.length > 0) {
      console.log(`  Blocking Issues:`);
      for (const issue of result.blockingIssues) {
        console.log(`    - ${issue}`);
      }
    }
  }
}
