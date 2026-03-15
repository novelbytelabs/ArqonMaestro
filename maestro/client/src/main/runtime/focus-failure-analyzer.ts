/**
 * Focus Failure Analyzer
 *
 * Analyzes failures during focus transfers and provides recovery suggestions.
 * Part of FP-2.4: Failure mode documentation
 *
 * This analyzer:
 * - Classifies errors into failure types
 * - Determines root causes
 * - Suggests recovery strategies
 * - Provides severity assessments
 */

import {
  FailureType,
  FailureSeverity,
  FailureAnalysis,
  FailureTypeInfo,
  FocusFailure,
  RootCause,
  RootCauseCategory,
  RecoverySuggestion,
  RecommendedAction,
  getFailureTypeInfo,
  classifyError,
  FailureModeCatalog,
} from "./focus-failure-modes";
import { FocusState, FocusTarget } from "./focus-verification-service";
import { ContractViolation } from "./focus-transfer-contract";
import { SafetyInvariantType } from "./focus-safety-monitor";

/**
 * Configuration for the failure analyzer
 */
export interface FailureAnalyzerConfig {
  /** Whether to log detailed analysis */
  verboseLogging?: boolean;
  /** Maximum number of recovery suggestions to generate */
  maxSuggestions?: number;
  /** Confidence threshold for high severity (0.0-1.0) */
  highSeverityThreshold?: number;
  /** Confidence threshold for medium severity (0.0-1.0) */
  mediumSeverityThreshold?: number;
}

/**
 * Context about a focus transfer attempt
 */
export interface TransferContext {
  /** The target for the transfer */
  target?: FocusTarget;
  /** The source state before transfer */
  sourceState?: FocusState;
  /** The intended action type */
  actionType?: string;
  /** Additional context data */
  additionalData?: Record<string, unknown>;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: FailureAnalyzerConfig = {
  verboseLogging: false,
  maxSuggestions: 3,
  highSeverityThreshold: 0.7,
  mediumSeverityThreshold: 0.4,
};

export default class FocusFailureAnalyzer {
  private config: FailureAnalyzerConfig;
  private analysisHistory: FailureAnalysis[] = [];

  constructor(config: FailureAnalyzerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze a failure and produce a complete failure analysis
   *
   * @param failure - The failure to analyze
   * @returns Complete failure analysis with root cause and recovery suggestions
   */
  analyzeFailure(failure: FocusFailure): FailureAnalysis {
    const startTime = Date.now();

    // Classify the failure type if not already set
    const failureType = failure.type || classifyError(failure.error);

    // Get failure type info from catalog
    const typeInfo = getFailureTypeInfo(failureType);

    // Determine severity
    const severity = this.determineSeverity(failure, typeInfo);

    // Analyze root cause
    const rootCause = this.getRootCause(failure);

    // Generate recovery suggestions
    const recoverySuggestions = this.suggestRecovery(failure, typeInfo);

    // Determine if recoverable
    const isRecoverable = typeInfo?.isRecoverable ?? false;

    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction(
      severity,
      isRecoverable,
      recoverySuggestions
    );

    const analysis: FailureAnalysis = {
      type: failureType,
      severity,
      rootCause,
      recoverySuggestions,
      isRecoverable,
      recommendedAction,
      metadata: {
        analyzedAt: new Date().toISOString(),
        analysisDurationMs: Date.now() - startTime,
        strategiesConsidered: typeInfo?.recoveryStrategies.length ?? 0,
      },
    };

    // Store in history
    this.analysisHistory.unshift(analysis);

    // Trim history if needed
    if (this.analysisHistory.length > 100) {
      this.analysisHistory = this.analysisHistory.slice(0, 100);
    }

    this.log(`Analyzed failure: ${failureType} - Severity: ${severity}`);

    return analysis;
  }

  /**
   * Determine the root cause of a failure
   *
   * @param failure - The failure to analyze
   * @returns Root cause analysis
   */
  getRootCause(failure: FocusFailure): RootCause {
    // Check for contract violations
    if (failure.violations && failure.violations.length > 0) {
      return this.analyzeFromViolations(failure.violations);
    }

    // Check for invariant violations
    if (failure.invariantViolations && failure.invariantViolations.length > 0) {
      return this.analyzeFromInvariantViolations(failure.invariantViolations);
    }

    // Check for state mismatch
    if (failure.sourceState && failure.actualState) {
      const stateAnalysis = this.analyzeFromStateMismatch(
        failure.sourceState,
        failure.actualState,
        failure.target
      );
      if (stateAnalysis) {
        return stateAnalysis;
      }
    }

    // Analyze from error message
    return this.analyzeFromError(failure.error);
  }

  /**
   * Suggest recovery strategies for a failure
   *
   * @param failure - The failure to recover from
   * @param typeInfo - Information about the failure type
   * @returns Array of recovery suggestions sorted by priority
   */
  suggestRecovery(
    failure: FocusFailure,
    typeInfo?: FailureTypeInfo
  ): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    // Use catalog recovery strategies
    if (typeInfo?.recoveryStrategies) {
      for (const strategy of typeInfo.recoveryStrategies) {
        suggestions.push({
          description: strategy.description,
          action: strategy.action,
          priority: suggestions.length + 1,
          successProbability: strategy.successProbability,
          steps: strategy.steps || [strategy.description],
        });
      }
    }

    // Add contextual suggestions based on failure details
    if (failure.violations) {
      for (const violation of failure.violations) {
        if (violation.severity === "critical") {
          suggestions.push({
            description: `Critical contract violation: ${violation.contractName}`,
            action: "abort",
            priority: 1,
            successProbability: 1.0,
            steps: [
              "Halt current operation",
              "Restore previous state if possible",
              "Report violation to safety system",
            ],
            warnings: ["Safety invariant violated - immediate action required"],
          });
        }
      }
    }

    if (failure.invariantViolations) {
      for (const inv of failure.invariantViolations) {
        if (inv.severity === "critical") {
          suggestions.push({
            description: `Critical invariant violation: ${inv.invariantType}`,
            action: "abort",
            priority: 1,
            successProbability: 1.0,
            steps: [
              "Stop the focus transfer",
              "Restore pre-transfer state",
              "Notify safety monitor",
            ],
            warnings: ["Safety critical: do not proceed with transfer"],
          });
        }
      }
    }

    // Sort by priority and limit
    suggestions.sort((a, b) => a.priority - b.priority);

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Classify an error into a failure type
   *
   * @param error - The error to classify
   * @returns The classified failure type
   */
  classifyFailure(error: Error): FailureType {
    return classifyError(error);
  }

  /**
   * Analyze a contract violation to determine root cause
   */
  private analyzeFromViolations(violations: ContractViolation[]): RootCause {
    const evidence: string[] = [];
    const relatedComponents: string[] = ["focus-contract", "focus-verification"];

    for (const violation of violations) {
      evidence.push(`${violation.contractName}: expected ${violation.expected}, got ${violation.actual}`);
    }

    // Determine category based on violation type
    const contractNames = violations.map((v) => v.contractName);
    
    if (contractNames.includes("focusArrived")) {
      return {
        category: "validation",
        explanation: "Focus did not arrive at the target application",
        evidence,
        relatedComponents,
      };
    }

    if (contractNames.includes("verificationPassed")) {
      return {
        category: "validation",
        explanation: "Post-transfer verification failed to confirm focus state",
        evidence,
        relatedComponents: [...relatedComponents, "focus-verification"],
      };
    }

    if (contractNames.includes("noSideEffects")) {
      return {
        category: "system_state",
        explanation: "Unexpected side effects detected during focus transfer",
        evidence,
        relatedComponents: [...relatedComponents, "system-state-tracker"],
      };
    }

    return {
      category: "validation",
      explanation: "Contract validation failed during focus transfer",
      evidence,
      relatedComponents,
    };
  }

  /**
   * Analyze invariant violations to determine root cause
   */
  private analyzeFromInvariantViolations(
    invariantViolations: Array<{
      invariantType: SafetyInvariantType;
      details: string;
      severity: "critical" | "warning" | "info";
    }>
  ): RootCause {
    const evidence: string[] = [];
    const relatedComponents: string[] = ["safety-monitor", "focus-contract"];

    for (const inv of invariantViolations) {
      evidence.push(`${inv.invariantType}: ${inv.details}`);
      relatedComponents.push(`invariant-${inv.invariantType}`);
    }

    // Determine specific invariant that failed
    const failedTypes = invariantViolations.map((v) => v.invariantType);

    if (failedTypes.includes("focusNeverLost")) {
      return {
        category: "invariant",
        explanation: "Safety invariant violated: focus was lost during transfer",
        evidence,
        relatedComponents,
      };
    }

    if (failedTypes.includes("noOrphanedFocus")) {
      return {
        category: "invariant",
        explanation: "Safety invariant violated: focus was left on unavailable application",
        evidence,
        relatedComponents,
      };
    }

    if (failedTypes.includes("driverConsistency")) {
      return {
        category: "driver_state",
        explanation: "Driver state inconsistency detected",
        evidence,
        relatedComponents: [...relatedComponents, "focus-driver"],
      };
    }

    return {
      category: "invariant",
      explanation: "Safety invariant(s) violated during focus transfer",
      evidence,
      relatedComponents,
    };
  }

  /**
   * Analyze state mismatch to determine root cause
   */
  private analyzeFromStateMismatch(
    sourceState: FocusState,
    actualState: FocusState,
    target?: FocusTarget
  ): RootCause | null {
    // If states are the same, no mismatch occurred
    if (sourceState.entity.toLowerCase() === actualState.entity.toLowerCase()) {
      return null;
    }

    // Check if focus moved somewhere unexpected
    if (target) {
      const targetEntity = target.entity.toLowerCase();
      const actualEntity = actualState.entity.toLowerCase();

      if (targetEntity !== actualEntity && !actualEntity.includes(targetEntity) && !targetEntity.includes(actualEntity)) {
        return {
          category: "target_state",
          explanation: `Focus transferred to unexpected application: expected ${target.entity}, got ${actualState.entity}`,
          evidence: [
            `Expected: ${target.entity}`,
            `Actual: ${actualState.entity}`,
            `Source: ${sourceState.entity}`,
          ],
          relatedComponents: ["focus-verification", "focus-driver"],
        };
      }
    }

    return {
      category: "system_state",
      explanation: `Focus state changed unexpectedly from ${sourceState.entity} to ${actualState.entity}`,
      evidence: [
        `Source entity: ${sourceState.entity}`,
        `Actual entity: ${actualState.entity}`,
      ],
      relatedComponents: ["focus-verification", "system-state-tracker"],
    };
  }

  /**
   * Analyze error message to determine root cause
   */
  private analyzeFromError(error: Error): RootCause {
    const message = error.message.toLowerCase();
    const evidence = [error.message];

    // Check for specific error patterns
    if (message.includes("not found") || message.includes("does not exist")) {
      return {
        category: "target_state",
        explanation: "Target application or window was not found in the system",
        evidence,
        relatedComponents: ["focus-driver", "system-state-tracker"],
      };
    }

    if (message.includes("not running") || message.includes("closed")) {
      return {
        category: "target_state",
        explanation: "Target application is not currently running",
        evidence,
        relatedComponents: ["focus-driver", "application-manager"],
      };
    }

    if (message.includes("timeout")) {
      return {
        category: "timeout",
        explanation: "Focus transfer operation timed out",
        evidence,
        relatedComponents: ["focus-driver", "timeout-handler"],
      };
    }

    if (message.includes("permission") || message.includes("denied") || message.includes("access")) {
      return {
        category: "permission",
        explanation: "Insufficient permissions to perform focus operation",
        evidence,
        relatedComponents: ["focus-driver", "permission-checker"],
      };
    }

    // Default to driver error
    return {
      category: "driver_state",
      explanation: "Driver-level error occurred during focus transfer",
      evidence,
      relatedComponents: ["focus-driver"],
    };
  }

  /**
   * Determine severity based on failure details
   */
  private determineSeverity(
    failure: FocusFailure,
    typeInfo?: FailureTypeInfo
  ): FailureSeverity {
    // Use type info default severity as baseline
    let severity: FailureSeverity = typeInfo?.defaultSeverity ?? "medium";

    // Escalate severity based on violations
    if (failure.violations) {
      const hasCritical = failure.violations.some((v) => v.severity === "critical");
      if (hasCritical) {
        severity = "critical";
      } else if (severity !== "critical") {
        const hasWarning = failure.violations.some((v) => v.severity === "warning");
        if (hasWarning && severity === "low") {
          severity = "medium";
        }
      }
    }

    // Escalate based on invariant violations
    if (failure.invariantViolations) {
      const hasCritical = failure.invariantViolations.some((v) => v.severity === "critical");
      if (hasCritical) {
        severity = "critical";
      }
    }

    return severity;
  }

  /**
   * Determine recommended action based on analysis
   */
  private determineRecommendedAction(
    severity: FailureSeverity,
    isRecoverable: boolean,
    suggestions: RecoverySuggestion[]
  ): RecommendedAction {
    // Critical failures should abort
    if (severity === "critical") {
      return "abort";
    }

    // Check for abort suggestion
    const abortSuggestion = suggestions.find((s) => s.action === "abort");
    if (abortSuggestion) {
      return "abort";
    }

    // Check for rollback suggestion on high severity
    if (severity === "high") {
      const rollbackSuggestion = suggestions.find((s) => s.action === "rollback");
      if (rollbackSuggestion) {
        return "rollback";
      }
    }

    // If not recoverable, notify
    if (!isRecoverable) {
      return "notify";
    }

    // Default to retry for recoverable failures
    return "retry";
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(limit?: number): FailureAnalysis[] {
    if (limit && limit > 0) {
      return this.analysisHistory.slice(0, limit);
    }
    return [...this.analysisHistory];
  }

  /**
   * Get statistics about analyzed failures
   */
  getAnalysisStats(): {
    totalAnalyzed: number;
    byType: Record<FailureType, number>;
    bySeverity: Record<FailureSeverity, number>;
    averageAnalysisTime: number;
  } {
    const stats = {
      totalAnalyzed: this.analysisHistory.length,
      byType: {} as Record<FailureType, number>,
      bySeverity: {} as Record<FailureSeverity, number>,
      averageAnalysisTime: 0,
    };

    for (const analysis of this.analysisHistory) {
      stats.byType[analysis.type] = (stats.byType[analysis.type] || 0) + 1;
      stats.bySeverity[analysis.severity] = (stats.bySeverity[analysis.severity] || 0) + 1;
    }

    if (this.analysisHistory.length > 0) {
      const totalTime = this.analysisHistory.reduce(
        (sum, a) => sum + a.metadata.analysisDurationMs,
        0
      );
      stats.averageAnalysisTime = totalTime / this.analysisHistory.length;
    }

    return stats;
  }

  /**
   * Clear analysis history
   */
  clearHistory(): void {
    this.analysisHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FailureAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Internal logging helper
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[FocusFailureAnalyzer] ${message}`);
    }
  }
}
