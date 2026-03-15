/**
 * Focus History Service
 *
 * Maintains a rolling history of focus transitions for navigation.
 * Part of FP-1.3: Expanded History Model
 *
 * This service:
 * - Stores verification results in history entries
 * - Tracks success/failure patterns
 * - Supports querying by time range, application, and layer
 */

import {
  FocusHistoryEntry,
  FocusLayer,
  FocusSourceOfTruth,
  FocusTarget,
  FocusVerificationResult,
  FocusState,
} from "./focus-verification-service";
import { FocusAuthority, FocusAuthorityQuery } from "./focus-authority-service";
import { ContractValidationResult } from "./focus-transfer-contract";
import { InvariantCheckRecord, SafetyInvariantType } from "./focus-safety-monitor";

// Failure analysis imports (FP-2.4)
import { FailureAnalysis, FailureType, FailureSeverity } from "./focus-failure-modes";

/**
 * Configuration for the focus history service
 */
export interface FocusHistoryConfig {
  /** Maximum number of entries to keep in memory */
  maxEntries: number;
}

/**
 * Query parameters for filtering focus history
 */
export interface FocusHistoryQuery {
  /** Filter by application/entity name */
  entity?: string;
  /** Filter by focus layer */
  layer?: FocusLayer;
  /** Filter by success status */
  success?: boolean;
  /** Filter by minimum confidence score */
  minConfidence?: number;
  /** Filter by start time (ISO 8601) */
  startTime?: string;
  /** Filter by end time (ISO 8601) */
  endTime?: string;
  /** Maximum number of entries to return */
  limit?: number;
  /** Filter by authority level */
  authority?: FocusAuthority;
}

/**
 * Statistics about focus transfers
 */
export interface FocusHistoryStats {
  /** Total number of transfer attempts */
  totalAttempts: number;
  /** Number of successful transfers */
  successfulTransfers: number;
  /** Number of failed transfers */
  failedTransfers: number;
  /** Success rate [0.0, 1.0] */
  successRate: number;
  /** Average confidence score [0.0, 1.0] */
  averageConfidence: number;
  /** Most frequently targeted entities */
  topTargets: Array<{ entity: string; count: number }>;
}

/**
 * Statistics about invariant checks
 */
export interface InvariantStats {
  /** Total number of invariant checks */
  totalChecks: number;
  /** Number of satisfied invariants */
  satisfiedCount: number;
  /** Number of violated invariants */
  violatedCount: number;
  /** Violation rate [0.0, 1.0] */
  violationRate: number;
  /** Number of critical violations */
  criticalViolations: number;
  /** Number of warning violations */
  warningViolations: number;
  /** Invariant checks by type */
  byType: Record<SafetyInvariantType, { checked: number; violated: number }>;
}

export default class FocusHistoryService {
  private history: FocusHistoryEntry[] = [];
  private invariantHistory: InvariantCheckRecord[] = [];
  private failureAnalysisHistory: FailureAnalysis[] = [];
  private config: FocusHistoryConfig;

  constructor(config: FocusHistoryConfig = { maxEntries: 100 }) {
    this.config = config;
  }

  /**
   * Add an invariant check record to history (FP-2.3)
   *
   * @param record - The invariant check record to add
   */
  addInvariantCheckRecord(record: InvariantCheckRecord): void {
    // Add to the beginning of the array (most recent first)
    this.invariantHistory.unshift(record);

    // Trim to max entries (use config maxEntries for invariant history too)
    if (this.invariantHistory.length > this.config.maxEntries) {
      this.invariantHistory = this.invariantHistory.slice(0, this.config.maxEntries);
    }
  }

  /**
   * Add multiple invariant check records at once
   *
   * @param records - Array of invariant check records
   */
  addInvariantCheckRecords(records: InvariantCheckRecord[]): void {
    for (const record of records) {
      this.addInvariantCheckRecord(record);
    }
  }

  /**
   * Get invariant check history
   *
   * @param limit - Optional limit on number of records
   * @returns Array of invariant check records
   */
  getInvariantHistory(limit?: number): InvariantCheckRecord[] {
    if (limit && limit > 0) {
      return this.invariantHistory.slice(0, limit);
    }
    return [...this.invariantHistory];
  }

  /**
   * Get recent invariant violations
   *
   * @param since - Optional ISO timestamp to get violations since
   * @returns Array of violation records
   */
  getInvariantViolations(since?: string): InvariantCheckRecord[] {
    let violations = this.invariantHistory.filter((record) => !record.satisfied);

    if (since) {
      violations = violations.filter((record) => record.timestamp >= since);
    }

    return violations;
  }

  /**
   * Get statistics about invariant checks
   *
   * @returns Invariant statistics
   */
  getInvariantStats(): InvariantStats {
    const totalChecks = this.invariantHistory.length;

    if (totalChecks === 0) {
      return {
        totalChecks: 0,
        satisfiedCount: 0,
        violatedCount: 0,
        violationRate: 0,
        criticalViolations: 0,
        warningViolations: 0,
        byType: {
          focusNeverLost: { checked: 0, violated: 0 },
          noOrphanedFocus: { checked: 0, violated: 0 },
          driverConsistency: { checked: 0, violated: 0 },
        },
      };
    }

    const satisfiedCount = this.invariantHistory.filter((r) => r.satisfied).length;
    const violatedCount = totalChecks - satisfiedCount;
    const violationRate = violatedCount / totalChecks;
    const criticalViolations = this.invariantHistory.filter(
      (r) => !r.satisfied && r.severity === "critical"
    ).length;
    const warningViolations = this.invariantHistory.filter(
      (r) => !r.satisfied && r.severity === "warning"
    ).length;

    // Count by type
    const byType: Record<SafetyInvariantType, { checked: number; violated: number }> = {
      focusNeverLost: { checked: 0, violated: 0 },
      noOrphanedFocus: { checked: 0, violated: 0 },
      driverConsistency: { checked: 0, violated: 0 },
    };

    for (const record of this.invariantHistory) {
      if (byType[record.invariantType]) {
        byType[record.invariantType].checked++;
        if (!record.satisfied) {
          byType[record.invariantType].violated++;
        }
      }
    }

    return {
      totalChecks,
      satisfiedCount,
      violatedCount,
      violationRate,
      criticalViolations,
      warningViolations,
      byType,
    };
  }

  /**
   * Clear invariant history
   */
  clearInvariantHistory(): void {
    this.invariantHistory = [];
  }

  /**
   * Get the number of invariant check records
   */
  getInvariantHistorySize(): number {
    return this.invariantHistory.length;
  }

  /**
   * Check if invariant history is empty
   */
  isInvariantHistoryEmpty(): boolean {
    return this.invariantHistory.length === 0;
  }

  // ============================================
  // Failure Analysis Methods (FP-2.4)
  // ============================================

  /**
   * Add a failure analysis result to history (FP-2.4)
   *
   * @param analysis - The failure analysis to store
   */
  addFailureAnalysis(analysis: FailureAnalysis): void {
    // Add to the beginning of the array (most recent first)
    this.failureAnalysisHistory.unshift(analysis);

    // Trim to max entries
    if (this.failureAnalysisHistory.length > this.config.maxEntries) {
      this.failureAnalysisHistory = this.failureAnalysisHistory.slice(0, this.config.maxEntries);
    }
  }

  /**
   * Get failure analysis history
   *
   * @param limit - Optional limit on number of records
   * @returns Array of failure analyses
   */
  getFailureAnalysisHistory(limit?: number): FailureAnalysis[] {
    if (limit && limit > 0) {
      return this.failureAnalysisHistory.slice(0, limit);
    }
    return [...this.failureAnalysisHistory];
  }

  /**
   * Get failures by type
   *
   * @param type - The failure type to filter by
   * @param limit - Optional limit on results
   * @returns Array of matching failure analyses
   */
  getFailuresByType(type: FailureType, limit?: number): FailureAnalysis[] {
    const filtered = this.failureAnalysisHistory.filter((f) => f.type === type);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Get failures by severity
   *
   * @param severity - The severity level to filter by
   * @param limit - Optional limit on results
   * @returns Array of matching failure analyses
   */
  getFailuresBySeverity(severity: FailureSeverity, limit?: number): FailureAnalysis[] {
    const filtered = this.failureAnalysisHistory.filter((f) => f.severity === severity);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Get recent critical failures
   *
   * @param limit - Optional limit on results
   * @returns Array of critical failure analyses
   */
  getCriticalFailures(limit?: number): FailureAnalysis[] {
    return this.getFailuresBySeverity("critical", limit);
  }

  /**
   * Get statistics about failure analyses
   *
   * @returns Statistics about failures
   */
  getFailureAnalysisStats(): {
    totalAnalyzed: number;
    recoverableCount: number;
    nonRecoverableCount: number;
    recoveryRate: number;
    byType: Record<FailureType, number>;
    bySeverity: Record<FailureSeverity, number>;
    recommendedActions: Record<string, number>;
  } {
    const total = this.failureAnalysisHistory.length;

    if (total === 0) {
      return {
        totalAnalyzed: 0,
        recoverableCount: 0,
        nonRecoverableCount: 0,
        recoveryRate: 0,
        byType: {} as Record<FailureType, number>,
        bySeverity: {} as Record<FailureSeverity, number>,
        recommendedActions: {},
      };
    }

    const recoverableCount = this.failureAnalysisHistory.filter((f) => f.isRecoverable).length;
    const nonRecoverableCount = total - recoverableCount;
    const recoveryRate = recoverableCount / total;

    // Count by type
    const byType: Record<FailureType, number> = {} as Record<FailureType, number>;
    const bySeverity: Record<FailureSeverity, number> = {} as Record<FailureSeverity, number>;
    const recommendedActions: Record<string, number> = {};

    for (const analysis of this.failureAnalysisHistory) {
      byType[analysis.type] = (byType[analysis.type] || 0) + 1;
      bySeverity[analysis.severity] = (bySeverity[analysis.severity] || 0) + 1;
      recommendedActions[analysis.recommendedAction] = (recommendedActions[analysis.recommendedAction] || 0) + 1;
    }

    return {
      totalAnalyzed: total,
      recoverableCount,
      nonRecoverableCount,
      recoveryRate,
      byType,
      bySeverity,
      recommendedActions,
    };
  }

  /**
   * Clear failure analysis history
   */
  clearFailureAnalysisHistory(): void {
    this.failureAnalysisHistory = [];
  }

  /**
   * Get the number of failure analysis records
   */
  getFailureAnalysisHistorySize(): number {
    return this.failureAnalysisHistory.length;
  }

  /**
   * Check if failure analysis history is empty
   */
  isFailureAnalysisHistoryEmpty(): boolean {
    return this.failureAnalysisHistory.length === 0;
  }

  /**
   * Generate a unique ID for a history entry
   */
  private generateId(): string {
    return `focus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add a focus transfer record to history with verification result
   *
   * @param target - The target that was requested
   * @param verification - The verification result
   */
  addEntry(target: FocusTarget, verification: FocusVerificationResult): void {
    const entry: FocusHistoryEntry = {
      id: this.generateId(),
      target,
      verification,
      timestamp: new Date().toISOString(),
    };

    // Add to the beginning of the array (most recent first)
    this.history.unshift(entry);

    // Trim to max entries
    if (this.history.length > this.config.maxEntries) {
      this.history = this.history.slice(0, this.config.maxEntries);
    }
  }

  /**
   * Add a focus transfer record to history with verification result and contract validation (FP-2.2)
   *
   * @param target - The target that was requested
   * @param verification - The verification result
   * @param contractValidation - The contract validation result
   */
  addEntryWithContractResult(
    target: FocusTarget,
    verification: FocusVerificationResult,
    contractValidation: ContractValidationResult
  ): void {
    const entry: FocusHistoryEntry = {
      id: this.generateId(),
      target,
      verification,
      contractValidation,
      timestamp: new Date().toISOString(),
    };

    // Add to the beginning of the array (most recent first)
    this.history.unshift(entry);

    // Trim to max entries
    if (this.history.length > this.config.maxEntries) {
      this.history = this.history.slice(0, this.config.maxEntries);
    }
  }

  /**
   * Query the focus history with filters
   *
   * @param query - Query parameters for filtering
   * @returns Matching history entries
   */
  query(query: FocusHistoryQuery = {}): FocusHistoryEntry[] {
    let results = [...this.history];

    // Filter by entity
    if (query.entity) {
      const entityLower = query.entity.toLowerCase();
      results = results.filter(
        (entry) =>
          entry.target.entity.toLowerCase().includes(entityLower) ||
          entry.verification.actual.entity.toLowerCase().includes(entityLower)
      );
    }

    // Filter by layer
    if (query.layer !== undefined) {
      results = results.filter((entry) => entry.target.layer === query.layer);
    }

    // Filter by success status
    if (query.success !== undefined) {
      results = results.filter((entry) => entry.verification.success === query.success);
    }

    // Filter by minimum confidence
    if (query.minConfidence !== undefined) {
      results = results.filter(
        (entry) => entry.verification.confidence >= query.minConfidence!
      );
    }

    // Filter by start time
    if (query.startTime) {
      results = results.filter((entry) => entry.timestamp >= query.startTime!);
    }

    // Filter by end time
    if (query.endTime) {
      results = results.filter((entry) => entry.timestamp <= query.endTime!);
    }

    // Filter by authority
    if (query.authority !== undefined) {
      results = results.filter(
        (entry) => entry.verification.authorityAnalysis.primaryAuthority === query.authority
      );
    }

    // Apply limit
    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get the most recent focus transfer
   */
  getMostRecent(): FocusHistoryEntry | undefined {
    return this.history[0];
  }

  /**
   * Get the previous focus (before the most recent)
   */
  getPrevious(): FocusHistoryEntry | undefined {
    return this.history[1];
  }

  /**
   * Get the last N focus transfers
   */
  getLastN(count: number): FocusHistoryEntry[] {
    return this.history.slice(0, count);
  }

  /**
   * Get statistics about focus transfers
   */
  getStats(): FocusHistoryStats {
    const totalAttempts = this.history.length;

    if (totalAttempts === 0) {
      return {
        totalAttempts: 0,
        successfulTransfers: 0,
        failedTransfers: 0,
        successRate: 0,
        averageConfidence: 0,
        topTargets: [],
      };
    }

    const successfulTransfers = this.history.filter((entry) => entry.verification.success).length;
    const failedTransfers = totalAttempts - successfulTransfers;
    const successRate = successfulTransfers / totalAttempts;

    // Calculate average confidence
    const totalConfidence = this.history.reduce(
      (sum, entry) => sum + entry.verification.confidence,
      0
    );
    const averageConfidence = totalConfidence / totalAttempts;

    // Calculate top targets
    const targetCounts = new Map<string, number>();
    for (const entry of this.history) {
      const entity = entry.target.entity.toLowerCase();
      targetCounts.set(entity, (targetCounts.get(entity) || 0) + 1);
    }

    const topTargets = Array.from(targetCounts.entries())
      .map(([entity, count]) => ({ entity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAttempts,
      successfulTransfers,
      failedTransfers,
      successRate,
      averageConfidence,
      topTargets,
    };
  }

  /**
   * Get all history entries
   */
  getAll(): FocusHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get the number of entries in history
   */
  size(): number {
    return this.history.length;
  }

  /**
   * Check if history is empty
   */
  isEmpty(): boolean {
    return this.history.length === 0;
  }

  /**
   * Get recent entries by layer
   */
  getRecentByLayer(layer: FocusLayer, count: number = 10): FocusHistoryEntry[] {
    return this.history.filter((entry) => entry.target.layer === layer).slice(0, count);
  }

  /**
   * Get successful transfers only
   */
  getSuccessfulTransfers(limit?: number): FocusHistoryEntry[] {
    const successful = this.history.filter((entry) => entry.verification.success);
    return limit ? successful.slice(0, limit) : successful;
  }

  /**
   * Get failed transfers only
   */
  getFailedTransfers(limit?: number): FocusHistoryEntry[] {
    const failed = this.history.filter((entry) => !entry.verification.success);
    return limit ? failed.slice(0, limit) : failed;
  }

  /**
   * Get high confidence transfers (>= 0.8)
   */
  getHighConfidenceTransfers(limit?: number): FocusHistoryEntry[] {
    const highConfidence = this.history.filter(
      (entry) => entry.verification.confidence >= 0.8
    );
    return limit ? highConfidence.slice(0, limit) : highConfidence;
  }

  /**
   * Get low confidence transfers (< 0.8)
   */
  getLowConfidenceTransfers(limit?: number): FocusHistoryEntry[] {
    const lowConfidence = this.history.filter(
      (entry) => entry.verification.confidence < 0.8
    );
    return limit ? lowConfidence.slice(0, limit) : lowConfidence;
  }

  /**
   * Get transfers by primary authority source
   *
   * @param authority - The authority level to filter by
   * @param limit - Optional limit on results
   * @returns History entries matching the authority
   */
  getByAuthority(authority: FocusAuthority, limit?: number): FocusHistoryEntry[] {
    const byAuthority = this.history.filter(
      (entry) => entry.verification.authorityAnalysis.primaryAuthority === authority
    );
    return limit ? byAuthority.slice(0, limit) : byAuthority;
  }

  /**
   * Get entries with authority conflicts
   *
   * @param limit - Optional limit on results
   * @returns History entries with conflicting authority sources
   */
  getConflictingAuthorities(limit?: number): FocusHistoryEntry[] {
    const conflicts = this.history.filter(
      (entry) => entry.verification.authorityAnalysis.hasConflicts
    );
    return limit ? conflicts.slice(0, limit) : conflicts;
  }

  /**
   * Get entries with OS_NATIVE authority (highest confidence)
   *
   * @param limit - Optional limit on results
   * @returns History entries with OS native authority
   */
  getOSNativeTransfers(limit?: number): FocusHistoryEntry[] {
    return this.getByAuthority(FocusAuthority.OS_NATIVE, limit);
  }

  /**
   * Get entries with VERIFICATION authority (assessed state)
   *
   * @param limit - Optional limit on results
   * @returns History entries with verification authority
   */
  getVerificationAuthorityTransfers(limit?: number): FocusHistoryEntry[] {
    return this.getByAuthority(FocusAuthority.VERIFICATION, limit);
  }
}
