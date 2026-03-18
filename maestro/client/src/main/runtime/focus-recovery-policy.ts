/**
 * focus-recovery-policy.ts
 * Focus Recovery Policy
 *
 * Part of FP-5A/5B: Recovery Architecture
 *
 * Responsibilities:
 * - Map reasons to allowed policies/actions
 * - Enforce max-attempt rules
 * - Define abort-only cases
 *
 * This is a SEPARATE module per ADM-048 architecture.
 */

import { RecoveryReason } from "./focus-recovery-analyzer";

/**
 * Recovery action types (FP-5A)
 * Bounded set of recovery actions
 */
export enum RecoveryAction {
  /** Refocus the entire application */
  REFOCUS_APP = "refocus_app",
  /** Refocus a specific region within the app */
  REFOCUS_REGION = "refocus_region",
  /** Refocus a specific control */
  REFOCUS_CONTROL = "refocus_control",
  /** Restore to previous verified target */
  RESTORE_PREVIOUS = "restore_previous",
  /** Abort and inform user */
  ABORT = "abort",
}

/**
 * Recovery policy decisions (FP-5A)
 * Policy determines what to do when drift is detected
 */
export enum RecoveryPolicy {
  /** Try the recovery action once */
  RETRY_ONCE = "retry_once",
  /** Restore to previous verified state */
  RESTORE_PREVIOUS = "restore_previous",
  /** Abort and ask user for guidance */
  ABORT = "abort",
  /** Downgrade confidence and stop */
  DOWNGRADE = "downgrade",
}

/**
 * Recovery result status (FP-5B refined)
 * Distinguishes between retry, restore, abort paths
 */
export enum RecoveryResultStatus {
  /** No recovery was needed */
  NO_RECOVERY_NEEDED = "no_recovery_needed",
  /** Recovery succeeded via retry */
  RECOVERED_BY_RETRY = "recovered_by_retry",
  /** Recovery succeeded via restore previous */
  RECOVERED_BY_RESTORE = "recovered_by_restore",
  /** Recovery aborted - untrusted state */
  ABORTED_UNTRUSTED_STATE = "aborted_untrusted_state",
  /** Recovery aborted - target missing */
  ABORTED_MISSING_TARGET = "aborted_missing_target",
  /** Recovery aborted - unsafe recovery */
  ABORTED_UNSAFE_RECOVERY = "aborted_unsafe_recovery",
  /** Recovery aborted - no recovery possible */
  ABORTED = "aborted",
  /** Recovery attempted but final state remained degraded/unverified */
  DOWNGRADED = "downgraded",
}

/**
 * Recovery depth for layered restore (FP-5C)
 * Indicates how much of the prior state was actually restored and verified
 */
export enum RecoveryDepth {
  /** Only the application was restored */
  APP_ONLY = "app_only",
  /** Application and region were restored */
  APP_REGION = "app_region",
  /** Application, region, and control were restored */
  APP_REGION_CONTROL = "app_region_control",
  /** No restore achieved */
  NONE = "none",
}

/**
 * Control recovery level (FP-5C)
 * Indicates what level of control focus was actually achieved
 */
export enum ControlRecoveryLevel {
  /** Control-level focus achieved and verified */
  CONTROL_VERIFIED = "control_verified",
  /** Control focus attempted but only region-level verified */
  DOWNGRADED_TO_REGION = "downgraded_to_region",
  /** Control focus attempted but only app-level verified */
  DOWNGRADED_TO_APP = "downgraded_to_app",
  /** Control recovery not supported for this surface */
  UNSUPPORTED = "unsupported",
  /** No control recovery attempted */
  NONE = "none",
}

/**
 * Recovery policy configuration
 */
export interface RecoveryPolicyConfig {
  /** Maximum retry attempts */
  maxRetries: number;
  /** Whether to allow restore */
  allowRestore: boolean;
  /** Whether to allow downgrade */
  allowDowngrade: boolean;
}

/**
 * Default policy configuration
 */
const DEFAULT_POLICY_CONFIG: RecoveryPolicyConfig = {
  maxRetries: 1,
  allowRestore: true,
  allowDowngrade: true,
};

/**
 * Recovery Policy
 *
 * Determines:
 * - What recovery policy to use for a given reason
 * - What recovery action to take
 * - Whether to abort
 *
 * This is the "planner" in the analyzer/planner/executor model.
 */
export class FocusRecoveryPolicy {
  private config: RecoveryPolicyConfig;

  constructor(config: Partial<RecoveryPolicyConfig> = {}) {
    this.config = { ...DEFAULT_POLICY_CONFIG, ...config };
  }

  /**
   * Determine recovery policy based on drift type (FP-5A)
   *
   * @param reason - The recovery reason
   * @returns Recommended recovery policy
   */
  determineRecoveryPolicy(reason: RecoveryReason): RecoveryPolicy {
    switch (reason) {
      case RecoveryReason.APP_MISMATCH:
      case RecoveryReason.WINDOW_MISMATCH:
      case RecoveryReason.REGION_MISMATCH:
      case RecoveryReason.CONTROL_MISMATCH:
        return RecoveryPolicy.RETRY_ONCE;

      case RecoveryReason.TARGET_GONE:
        return this.config.allowRestore
          ? RecoveryPolicy.RESTORE_PREVIOUS
          : RecoveryPolicy.ABORT;

      case RecoveryReason.UNVERIFIED_STATE:
        return RecoveryPolicy.RETRY_ONCE;

      case RecoveryReason.CARET_MISSING:
      case RecoveryReason.AMBIGUITY_ESCALATED:
      case RecoveryReason.PRECISION_GUARD_BLOCKED:
      case RecoveryReason.SAFETY_GATE_BLOCKED:
      default:
        return RecoveryPolicy.ABORT;
    }
  }

  /**
   * Determine recovery action based on drift type and policy (FP-5A)
   *
   * @param reason - The recovery reason
   * @param policy - The recovery policy
   * @returns Recommended recovery action
   */
  determineRecoveryAction(
    reason: RecoveryReason,
    policy: RecoveryPolicy
  ): RecoveryAction {
    if (policy === RecoveryPolicy.RESTORE_PREVIOUS) {
      return RecoveryAction.RESTORE_PREVIOUS;
    }

    if (policy === RecoveryPolicy.ABORT || policy === RecoveryPolicy.DOWNGRADE) {
      return RecoveryAction.ABORT;
    }

    switch (reason) {
      case RecoveryReason.APP_MISMATCH:
      case RecoveryReason.WINDOW_MISMATCH:
      case RecoveryReason.UNVERIFIED_STATE:
        return RecoveryAction.REFOCUS_APP;

      case RecoveryReason.REGION_MISMATCH:
        return RecoveryAction.REFOCUS_REGION;

      case RecoveryReason.CONTROL_MISMATCH:
        return RecoveryAction.REFOCUS_CONTROL;

      case RecoveryReason.TARGET_GONE:
      case RecoveryReason.CARET_MISSING:
      case RecoveryReason.AMBIGUITY_ESCALATED:
      case RecoveryReason.PRECISION_GUARD_BLOCKED:
      case RecoveryReason.SAFETY_GATE_BLOCKED:
      default:
        return RecoveryAction.ABORT;
    }
  }

  /**
   * Get user-safe abort message for a reason
   *
   * @param reason - The recovery reason
   * @returns User-safe abort message
   */
  getAbortUserMessage(reason: RecoveryReason): string {
    switch (reason) {
      case RecoveryReason.APP_MISMATCH:
        return "Could not recover focus. The expected application is not active. Please click on the correct application.";

      case RecoveryReason.WINDOW_MISMATCH:
        return "Could not recover focus. The expected window is not focused. Please click on the correct window.";

      case RecoveryReason.REGION_MISMATCH:
        return "Could not recover to the expected region. Please navigate to the correct area manually.";

      case RecoveryReason.CONTROL_MISMATCH:
        return "Could not recover to the expected control. Please click in the correct field.";

      case RecoveryReason.CARET_MISSING:
        return "No cursor position was verified. Please click where you want to insert text.";

      case RecoveryReason.TARGET_GONE:
        return "The target you were working with no longer exists. Please reopen it or select a different target.";

      case RecoveryReason.AMBIGUITY_ESCALATED:
        return "Maestro could not safely determine the correct target. Please be more specific.";

      case RecoveryReason.UNVERIFIED_STATE:
        return "Maestro could not verify the current focus state. Please click on the target and try again.";

      case RecoveryReason.PRECISION_GUARD_BLOCKED:
        return "Precision checks failed. Please click in the target area and try again.";

      case RecoveryReason.SAFETY_GATE_BLOCKED:
        return "The operation was blocked for safety. Please review the target and try again.";

      default:
        return "Focus recovery failed. Please navigate to your target manually.";
    }
  }

  /**
   * Get abort message for refined result
   *
   * @param result - The recovery result status
   * @param reason - The recovery reason
   * @returns User-safe message
   */
  getAbortUserMessageForResult(
    result: RecoveryResultStatus,
    reason: RecoveryReason
  ): string | undefined {
    if (
      result === RecoveryResultStatus.NO_RECOVERY_NEEDED ||
      result === RecoveryResultStatus.RECOVERED_BY_RETRY ||
      result === RecoveryResultStatus.RECOVERED_BY_RESTORE
    ) {
      return undefined;
    }

    switch (result) {
      case RecoveryResultStatus.ABORTED_UNTRUSTED_STATE:
        return "Focus state could not be trusted. Please click on the target and try again.";

      case RecoveryResultStatus.ABORTED_MISSING_TARGET:
        return "The target no longer exists or is no longer accessible. Please reopen it manually.";

      case RecoveryResultStatus.DOWNGRADED:
        return "Recovery reached a degraded state but could not fully verify the final focus target.";

      case RecoveryResultStatus.ABORTED_UNSAFE_RECOVERY:
      case RecoveryResultStatus.ABORTED:
      default:
        return this.getAbortUserMessage(reason);
    }
  }

  /**
   * Check if a reason is abort-only
   *
   * @param reason - The recovery reason
   * @returns Whether this reason should always abort
   */
  isAbortOnly(reason: RecoveryReason): boolean {
    return (
      reason === RecoveryReason.CARET_MISSING ||
      reason === RecoveryReason.AMBIGUITY_ESCALATED ||
      reason === RecoveryReason.PRECISION_GUARD_BLOCKED ||
      reason === RecoveryReason.SAFETY_GATE_BLOCKED
    );
  }

  /**
   * Check if recovery is allowed for this policy
   *
   * @returns Whether any recovery attempt is allowed
   */
  isRecoveryAllowed(): boolean {
    return this.config.maxRetries > 0 || this.config.allowRestore;
  }

  /**
   * Get the maximum number of retry attempts
   *
   * @returns Maximum retries
   */
  getMaxRetries(): number {
    return this.config.maxRetries;
  }
}

export default FocusRecoveryPolicy;