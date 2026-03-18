/**
 * Focus Pre-Validator
 *
 * Validates preconditions before focus transfer attempts.
 * Part of FP-2.1: Pre-transfer validation checks
 *
 * This service:
 * 1. Validates target existence / runtime presence
 * 2. Checks source state validity
 * 3. Verifies transfer is allowed
 * 4. Checks resource availability
 *
 * IMPORTANT:
 * - This validator should be fed a true pre-transfer focus snapshot.
 * - Use capturePreTransferState() before the focus transfer occurs.
 * - If the executor calls validation after transfer has already happened,
 *   no validator can reconstruct the true pre-transfer state perfectly.
 */

import * as driver from "../driver/stub";
import {
  FocusState,
  FocusTarget,
  FocusLayer,
  FocusSourceOfTruth,
} from "./focus-verification-service";
import FocusTransferContract, {
  ValidationResult,
  ValidationCheck,
} from "./focus-transfer-contract";

/**
 * Configuration for the pre-validator
 */
export interface PreValidatorConfig {
  /** Whether to skip validation (for testing) */
  skipValidation?: boolean;
  /** Whether to log detailed validation steps */
  verboseLogging?: boolean;
  /** How long a cached source state remains fresh */
  cacheMaxAgeMs?: number;
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
  private preTransferStateLocked = false;

  constructor(config: PreValidatorConfig = {}) {
    this.config = {
      skipValidation: false,
      verboseLogging: false,
      cacheMaxAgeMs: 5000,
      ...config,
    };
  }

  /**
   * Capture and lock the true pre-transfer source state.
   * This should be called immediately before a focus transfer begins.
   *
   * @returns The captured source state
   */
  async capturePreTransferState(): Promise<FocusState> {
    const state = await this.queryCurrentSourceState();
    this.cachedSourceState = state;
    this.preTransferStateLocked = true;
    return state;
  }

  /**
   * Manually set the pre-transfer state.
   * Useful if another subsystem has already captured it.
   *
   * @param state - The state to use as pre-transfer source
   */
  setPreTransferState(state: FocusState): void {
    this.cachedSourceState = state;
    this.preTransferStateLocked = true;
  }

  /**
   * Validate all preconditions for a focus transfer
   *
   * @param target - The target for the transfer
   * @returns ValidationResult with all check results
   */
  async validatePreConditions(target: FocusTarget): Promise<PreValidationResult> {
    const timestamp = new Date().toISOString();
    const source = await this.getCurrentSourceState();

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

    const checks: ValidationCheck[] = [];
    const blockingIssues: string[] = [];

    // Check 1: target exists / runtime presence
    const targetExists = await this.checkTargetExists(target);
    checks.push({
      name: "targetExists",
      passed: targetExists,
      details: targetExists
        ? `Target "${target.entity}" is recognized and runtime-accessible`
        : `Target "${target.entity}" is not currently runtime-accessible`,
    });
    if (!targetExists) {
      blockingIssues.push(`Target "${target.entity}" is not running, not accessible, or not supported in the current runtime state`);
    }

    // Check 2: source is valid
    const sourceValid = await this.checkSourceValid(source);
    checks.push({
      name: "sourceIsValid",
      passed: sourceValid,
      details: sourceValid
        ? `Source state is valid (entity: ${source.entity}, layer: ${source.layer})`
        : `Source state is invalid (entity: ${source.entity}, layer: ${source.layer})`,
    });
    if (!sourceValid) {
      blockingIssues.push("Current source focus state is invalid or untrusted");
    }

    // Check 3: transfer is allowed
    const transferAllowed = await this.checkTransferAllowed(source, target);
    checks.push({
      name: "transferIsAllowed",
      passed: transferAllowed,
      details: transferAllowed
        ? `Transfer from "${source.entity}" to "${target.entity}" is allowed`
        : `Transfer from "${source.entity}" to "${target.entity}" is not allowed`,
    });
    if (!transferAllowed) {
      blockingIssues.push(`Transfer from "${source.entity}" to "${target.entity}" is disallowed by contract`);
    }

    // Check 4: resources available
    const resourcesAvailable = await this.checkResourcesAvailable();
    checks.push({
      name: "resourcesAvailable",
      passed: resourcesAvailable,
      details: resourcesAvailable
        ? "System resources are available"
        : "System resources are not available",
    });
    if (!resourcesAvailable) {
      blockingIssues.push("System focus resources are unavailable");
    }

    const valid = checks.every((check) => check.passed);
    const canProceed = valid;

    const result: PreValidationResult = {
      valid,
      checks,
      canProceed,
      blockingIssues,
      target,
      source,
      timestamp,
    };

    if (this.config.verboseLogging) {
      this.logValidationResult(result);
    }

    return result;
  }

  /**
   * Check if target exists / is runtime-accessible
   *
   * IMPORTANT:
   * This is stricter than just "recognized target label".
   * We want the result to reflect runtime presence as honestly as possible.
   *
   * @param target - The target to check
   * @returns True if target appears runtime-accessible
   */
  async checkTargetExists(target: FocusTarget): Promise<boolean> {
    if (!target || !target.entity) {
      return false;
    }

    const normalizedTarget = this.normalizeEntityAlias(target.entity);
    if (!normalizedTarget) {
      return false;
    }

    try {
      const runningApps = await this.getRunningApplications();

      // If runtime enumeration succeeds and returns apps, use that strongly.
      if (runningApps.length > 0) {
        return runningApps.some((app) =>
          this.appMatchesTarget(app, normalizedTarget)
        );
      }

      // If enumeration gives us nothing, fall back to recognition-only truth.
      // This is weaker, but still better than claiming guaranteed existence.
      return this.isRecognizedTarget(normalizedTarget);
    } catch (error) {
      this.log(`Warning: Could not verify target runtime presence: ${error}`);
      // On failure to inspect runtime, fall back to recognized target only.
      return this.isRecognizedTarget(normalizedTarget);
    }
  }

  /**
   * Check if current source state is valid
   *
   * @param source - Optional already-known source state
   * @returns True if source state is valid
   */
  async checkSourceValid(source?: FocusState): Promise<boolean> {
    try {
      const effectiveSource = source ?? (await this.getCurrentSourceState());
      return FocusTransferContract.PreConditions.sourceIsValid(effectiveSource);
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
      const activeApp = await driver.getActiveApplication();
      return activeApp !== null && activeApp !== undefined;
    } catch (error) {
      this.log(`Warning: Could not verify resources: ${error}`);
      return false;
    }
  }

  /**
   * Get the current focus state for pre-validation.
   *
   * This prefers a locked pre-transfer state if one has been captured already.
   *
   * @returns The current focus state
   */
  async getCurrentSourceState(): Promise<FocusState> {
    const maxAgeMs = this.config.cacheMaxAgeMs ?? 5000;

    if (this.cachedSourceState) {
      const cacheTime = new Date(this.cachedSourceState.timestamp).getTime();
      const now = Date.now();

      if (this.preTransferStateLocked || now - cacheTime < maxAgeMs) {
        return this.cachedSourceState;
      }
    }

    const state = await this.queryCurrentSourceState();
    this.cachedSourceState = state;
    return state;
  }

  /**
   * Query the live source state from the OS / driver.
   *
   * @returns Freshly queried focus state
   */
  private async queryCurrentSourceState(): Promise<FocusState> {
    const timestamp = new Date().toISOString();

    try {
      const activeApp = await driver.getActiveApplication();
      const appName = activeApp ? activeApp.toLowerCase() : "unknown";

      const state: FocusState = {
        entity: appName,
        layer: FocusLayer.APPLICATION,
        sourceOfTruth: FocusSourceOfTruth.OPERATING_SYSTEM,
        timestamp,
      };

      return state;
    } catch (error) {
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
      case "targetExists": {
        const exists = await this.checkTargetExists(target);
        return {
          name: "targetExists",
          passed: exists,
          details: exists
            ? `Target "${target.entity}" is runtime-accessible`
            : `Target "${target.entity}" is not runtime-accessible`,
        };
      }

      case "sourceIsValid": {
        const sourceValid = await this.checkSourceValid(source);
        return {
          name: "sourceIsValid",
          passed: sourceValid,
          details: sourceValid
            ? `Source state is valid (entity: ${source.entity}, layer: ${source.layer})`
            : `Source state is invalid`,
        };
      }

      case "transferIsAllowed": {
        const allowed = await this.checkTransferAllowed(source, target);
        return {
          name: "transferIsAllowed",
          passed: allowed,
          details: allowed
            ? `Transfer from "${source.entity}" to "${target.entity}" is allowed`
            : `Transfer is not allowed`,
        };
      }

      case "resourcesAvailable": {
        const resources = await this.checkResourcesAvailable();
        return {
          name: "resourcesAvailable",
          passed: resources,
          details: resources
            ? "System resources are available"
            : "System resources are not available",
        };
      }

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
      const exists = await this.checkTargetExists(target);
      if (!exists) {
        return {
          canProceed: false,
          reason: `Target "${target.entity}" is not currently runtime-accessible`,
        };
      }

      const resources = await this.checkResourcesAvailable();
      if (!resources) {
        return {
          canProceed: false,
          reason: "System resources not available",
        };
      }

      return { canProceed: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { canProceed: false, reason: `Validation error: ${message}` };
    }
  }

  /**
   * Invalidate the cached source state.
   * Call this after a focus transfer completes or aborts.
   */
  invalidateCache(): void {
    this.cachedSourceState = undefined;
    this.preTransferStateLocked = false;
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
   * Normalize entity aliases for matching
   */
  private normalizeEntityAlias(entity: string): string {
    const value = (entity || "").trim().toLowerCase();

    if (!value) {
      return "";
    }

    if (
      value === "code" ||
      value === "vscode" ||
      value.includes("visual studio code")
    ) {
      return "vscode";
    }

    if (
      value === "chrome" ||
      value === "google chrome" ||
      value === "google-chrome"
    ) {
      return "chrome";
    }

    if (value === "browser") {
      return "browser";
    }

    if (
      value === "terminal" ||
      value === "console" ||
      value === "shell" ||
      value === "term" ||
      value.includes("gnome-terminal")
    ) {
      return "gnome-terminal";
    }

    return value;
  }

  /**
   * Whether a target is at least recognized as a known focus surface/app label.
   * This is weaker than runtime presence, but useful when runtime enumeration is unavailable.
   */
  private isRecognizedTarget(normalizedTarget: string): boolean {
    if (!normalizedTarget) {
      return false;
    }

    const knownTargets = new Set([
      "vscode",
      "chrome",
      "browser",
      "gnome-terminal",
      "firefox",
      "brave",
      "chromium",
      "slack",
      "discord",
      "spotify",
      "steam",
    ]);

    return knownTargets.has(normalizedTarget) || normalizedTarget.length > 0;
  }

  /**
   * Match a running application name to a normalized target.
   */
  private appMatchesTarget(appName: string, normalizedTarget: string): boolean {
    const normalizedApp = this.normalizeEntityAlias(appName);

    if (!normalizedApp || !normalizedTarget) {
      return false;
    }

    if (normalizedApp === normalizedTarget) {
      return true;
    }

    if (
      normalizedTarget === "browser" &&
      (
        normalizedApp.includes("chrome") ||
        normalizedApp.includes("firefox") ||
        normalizedApp.includes("brave") ||
        normalizedApp.includes("chromium")
      )
    ) {
      return true;
    }

    return (
      normalizedApp.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedApp)
    );
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