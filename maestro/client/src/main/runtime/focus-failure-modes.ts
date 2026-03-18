/**
 * Focus Failure Modes Catalog
 *
 * Documents common failure types for focus transfers with recovery strategies.
 * Part of FP-2.4: Failure mode documentation
 *
 * This catalog defines:
 * - Common failure types that can occur during focus transfers
 * - Recovery strategies for each failure type
 * - Severity classifications
 * - Error code mappings
 */

import { FocusState, FocusTarget, FocusLayer } from "./focus-verification-service";
import { ContractViolation } from "./focus-transfer-contract";
import { SafetyInvariantType } from "./focus-safety-monitor";

/**
 * Failure types for focus transfers
 */
export type FailureType =
  | "TARGET_NOT_FOUND"
  | "TARGET_NOT_RUNNING"
  | "FOCUS_LOST"
  | "VERIFICATION_FAILED"
  | "INVARIANT_VIOLATED"
  | "DRIVER_ERROR"
  | "TIMEOUT"
  | "PERMISSION_DENIED";

/**
 * Severity levels for failures
 */
export type FailureSeverity = "critical" | "high" | "medium" | "low";

/**
 * Recommended action based on failure analysis
 */
export type RecommendedAction = "retry" | "rollback" | "notify" | "abort";

/**
 * Root cause categories for failures
 */
export type RootCauseCategory =
  | "target_state"
  | "system_state"
  | "driver_state"
  | "validation"
  | "invariant"
  | "timeout"
  | "permission"
  | "unknown";

/**
 * Information about a specific failure type
 */
export interface FailureTypeInfo {
  /** The failure type identifier */
  type: FailureType;
  /** Human-readable description */
  description: string;
  /** Default severity for this failure type */
  defaultSeverity: FailureSeverity;
  /** Whether this failure is typically recoverable */
  isRecoverable: boolean;
  /** Recovery strategies for this failure type */
  recoveryStrategies: RecoveryStrategy[];
}

/**
 * A recovery strategy for a failure
 */
export interface RecoveryStrategy {
  /** Description of the recovery action */
  description: string;
  /** The recommended action to take */
  action: RecommendedAction;
  /** Estimated success probability [0.0, 1.0] */
  successProbability: number;
  /** Additional notes about this strategy */
  notes?: string;
  /** Steps to execute this recovery */
  steps?: string[];
}

/**
 * Represents a focus transfer failure
 */
export interface FocusFailure {
  /** The type of failure */
  type: FailureType;
  /** The original error that caused this failure */
  error: Error;
  /** The target that was being transferred to */
  target?: FocusTarget;
  /** The source state before the failure */
  sourceState?: FocusState;
  /** The actual state when failure occurred */
  actualState?: FocusState;
  /** Contract violations that occurred */
  violations?: ContractViolation[];
  /** Invariant violations that occurred */
  invariantViolations?: Array<{
    invariantType: SafetyInvariantType;
    details: string;
    severity: "critical" | "warning" | "info";
  }>;
  /** Timestamp when failure occurred */
  timestamp: string;
  /** Additional context about the failure */
  context?: Record<string, unknown>;
}

/**
 * Root cause analysis result
 */
export interface RootCause {
  /** The category of the root cause */
  category: RootCauseCategory;
  /** Detailed explanation of the root cause */
  explanation: string;
  /** Evidence supporting this root cause */
  evidence: string[];
  /** Related system components */
  relatedComponents: string[];
}

/**
 * A suggestion for recovering from a failure
 */
export interface RecoverySuggestion {
  /** Description of the suggested recovery action */
  description: string;
  /** The recommended action */
  action: RecommendedAction;
  /** Priority of this suggestion (1 = highest) */
  priority: number;
  /** Estimated success probability [0.0, 1.0] */
  successProbability: number;
  /** Steps to execute this recovery */
  steps: string[];
  /** Warnings or cautions */
  warnings?: string[];
}

/**
 * Complete failure analysis result
 */
export interface FailureAnalysis {
  /** The type of failure */
  type: FailureType;
  /** Severity of the failure */
  severity: FailureSeverity;
  /** Root cause analysis */
  rootCause: RootCause;
  /** Suggested recovery actions */
  recoverySuggestions: RecoverySuggestion[];
  /** Whether the failure is recoverable */
  isRecoverable: boolean;
  /** Recommended action based on analysis */
  recommendedAction: RecommendedAction;
  /** Additional metadata about the analysis */
  metadata: {
    /** Timestamp when analysis was performed */
    analyzedAt: string;
    /** Time from failure to analysis completion (ms) */
    analysisDurationMs: number;
    /** Number of recovery strategies considered */
    strategiesConsidered: number;
  };
}

/**
 * Failure Mode Catalog
 *
 * Contains definitions and recovery strategies for all known failure types
 */
export const FailureModeCatalog: Record<FailureType, FailureTypeInfo> = {
  TARGET_NOT_FOUND: {
    type: "TARGET_NOT_FOUND",
    description:
      "The target application or window does not exist or cannot be found in the system.",
    defaultSeverity: "high",
    isRecoverable: true,
    recoveryStrategies: [
      {
        description: "Verify the target application name is correct",
        action: "retry",
        successProbability: 0.3,
        notes: "Check for typos or alternate names",
      },
      {
        description: "Launch the target application before focusing",
        action: "retry",
        successProbability: 0.7,
        steps: [
          "Launch the target application",
          "Wait for application to fully initialize",
          "Retry the focus transfer",
        ],
      },
    ],
  },

  TARGET_NOT_RUNNING: {
    type: "TARGET_NOT_RUNNING",
    description:
      "The target application exists but is not currently running.",
    defaultSeverity: "high",
    isRecoverable: true,
    recoveryStrategies: [
      {
        description: "Start the target application and retry focus",
        action: "retry",
        successProbability: 0.8,
        steps: [
          "Start the target application",
          "Wait for application window to appear",
          "Retry the focus transfer",
        ],
      },
      {
        description: "Activate an existing instance of the application",
        action: "retry",
        successProbability: 0.9,
        notes: "If the app is running but minimized or hidden",
      },
    ],
  },

  FOCUS_LOST: {
    type: "FOCUS_LOST",
    description:
      "Focus was lost during the transfer attempt, leaving no active focus.",
    defaultSeverity: "critical",
    isRecoverable: true,
    recoveryStrategies: [
      {
        description: "Restore focus to the last known application",
        action: "rollback",
        successProbability: 0.7,
        steps: [
          "Query the last known focus state",
          "Attempt to restore focus to that application",
          "Verify focus was restored",
        ],
      },
      {
        description: "Restore focus to a safe default application",
        action: "rollback",
        successProbability: 0.5,
        steps: [
          "Identify a safe default (e.g., desktop, launcher)",
          "Restore focus to the default",
          "Log the incident for review",
        ],
      },
    ],
  },

  VERIFICATION_FAILED: {
    type: "VERIFICATION_FAILED",
    description:
      "Post-transfer verification failed to confirm focus arrived at the target.",
    defaultSeverity: "medium",
    isRecoverable: true,
    recoveryStrategies: [
      {
        description: "Retry the focus transfer with a small delay",
        action: "retry",
        successProbability: 0.6,
        steps: [
          "Wait 200ms for focus to settle",
          "Retry the focus transfer",
          "Re-verify the result",
        ],
      },
      {
        description: "Force focus using alternative method",
        action: "retry",
        successProbability: 0.4,
        notes: "Use OS-level focus APIs if available",
      },
    ],
  },

  INVARIANT_VIOLATED: {
    type: "INVARIANT_VIOLATED",
    description:
      "A safety invariant was violated during the focus transfer.",
    defaultSeverity: "critical",
    isRecoverable: false,
    recoveryStrategies: [
      {
        description: "Abort the operation and restore safe state",
        action: "abort",
        successProbability: 0.9,
        steps: [
          "Halt the focus transfer",
          "Restore focus to the original application",
          "Log the invariant violation",
          "Notify the safety monitoring system",
        ],
      },
      {
        description: "Attempt rollback to pre-transfer state",
        action: "rollback",
        successProbability: 0.6,
        steps: [
          "Restore source state from pre-transfer snapshot",
          "Verify safety invariants are satisfied",
          "Report the violation",
        ],
      },
    ],
  },

  DRIVER_ERROR: {
    type: "DRIVER_ERROR",
    description:
      "An error occurred at the driver level while attempting focus transfer.",
    defaultSeverity: "high",
    isRecoverable: true,
    recoveryStrategies: [
      {
        description: "Retry the focus transfer",
        action: "retry",
        successProbability: 0.5,
        notes: "Transient driver errors may resolve on retry",
      },
      {
        description: "Reinitialize the driver and retry",
        action: "retry",
        successProbability: 0.7,
        steps: [
          "Reinitialize the focus driver",
          "Wait for driver to stabilize",
          "Retry the focus transfer",
        ],
      },
    ],
  },

  TIMEOUT: {
    type: "TIMEOUT",
    description:
      "The focus transfer operation timed out before completing.",
    defaultSeverity: "medium",
    isRecoverable: true,
    recoveryStrategies: [
      {
        description: "Retry with extended timeout",
        action: "retry",
        successProbability: 0.6,
        steps: [
          "Wait for any pending operations to complete",
          "Retry the focus transfer with longer timeout",
        ],
      },
      {
        description: "Check for system resource constraints",
        action: "notify",
        successProbability: 0.3,
        notes: "May indicate system overload or resource contention",
      },
    ],
  },

  PERMISSION_DENIED: {
    type: "PERMISSION_DENIED",
    description:
      "Insufficient permissions to focus the target application.",
    defaultSeverity: "high",
    isRecoverable: false,
    recoveryStrategies: [
      {
        description: "Notify user of permission issue",
        action: "notify",
        successProbability: 1.0,
        steps: [
          "Log the permission denial",
          "Notify the user of required permissions",
          "Suggest running with elevated privileges if appropriate",
        ],
      },
    ],
  },
};

/**
 * Get failure type information from the catalog
 *
 * @param type - The failure type to look up
 * @returns The failure type info, or undefined if not found
 */
export function getFailureTypeInfo(type: FailureType): FailureTypeInfo | undefined {
  return FailureModeCatalog[type];
}

/**
 * Get all failure types that are recoverable
 *
 * @returns Array of recoverable failure types
 */
export function getRecoverableFailureTypes(): FailureType[] {
  return Object.values(FailureModeCatalog)
    .filter((info) => info.isRecoverable)
    .map((info) => info.type);
}

/**
 * Get all failure types at or above a given severity
 *
 * @param minSeverity - The minimum severity level
 * @returns Array of failure types at or above the severity
 */
export function getFailureTypesBySeverity(minSeverity: FailureSeverity): FailureType[] {
  const severityOrder: FailureSeverity[] = ["low", "medium", "high", "critical"];
  const minIndex = severityOrder.indexOf(minSeverity);

  return Object.values(FailureModeCatalog)
    .filter((info) => severityOrder.indexOf(info.defaultSeverity) >= minIndex)
    .map((info) => info.type);
}

/**
 * Map error messages to failure types
 *
 * @param error - The error to classify
 * @returns The most likely failure type
 */
export function classifyError(error: Error): FailureType {
  const message = error.message.toLowerCase();

  // Target not found patterns
  if (
    message.includes("target") &&
    (message.includes("not found") || message.includes("does not exist") || message.includes("cannot find"))
  ) {
    return "TARGET_NOT_FOUND";
  }

  // Target not running patterns
  if (
    message.includes("target") &&
    (message.includes("not running") || message.includes("not started") || message.includes("closed"))
  ) {
    return "TARGET_NOT_RUNNING";
  }

  // Focus lost patterns
  if (
    message.includes("focus") &&
    (message.includes("lost") || message.includes("no focus") || message.includes("undefined"))
  ) {
    return "FOCUS_LOST";
  }

  // Verification failed patterns
  if (
    message.includes("verification") &&
    (message.includes("fail") || message.includes("mismatch") || message.includes("confidence"))
  ) {
    return "VERIFICATION_FAILED";
  }

  // Invariant violated patterns
  if (
    message.includes("invariant") ||
    (message.includes("safety") && message.includes("violation"))
  ) {
    return "INVARIANT_VIOLATED";
  }

  // Driver error patterns
  if (
    message.includes("driver") ||
    message.includes("platform") ||
    message.includes("native")
  ) {
    return "DRIVER_ERROR";
  }

  // Timeout patterns
  if (message.includes("timeout") || message.includes("timed out")) {
    return "TIMEOUT";
  }

  // Permission denied patterns
  if (
    message.includes("permission") ||
    message.includes("denied") ||
    message.includes("access") ||
    message.includes("unauthorized")
  ) {
    return "PERMISSION_DENIED";
  }

  // Default to driver error for unknown errors
  return "DRIVER_ERROR";
}

export default FailureModeCatalog;
