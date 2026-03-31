/**
 * Focus Safety Monitor
 *
 * Continuously monitors critical safety properties for focus transfers.
 * Part of FP-2.3: Safety invariant enforcement
 *
 * This monitor:
 * 1. Runs continuous invariant checks
 * 2. Validates focus state consistency
 * 3. Detects and reports invariant violations
 * 4. Provides historical tracking of invariant checks
 */

import * as driver from "../driver/stub";
import {
  FocusState,
  FocusLayer,
  FocusSourceOfTruth,
} from "./focus-verification-service";
import FocusTransferContract from "./focus-transfer-contract";

/**
 * Safety invariant types that can be checked
 */
export type SafetyInvariantType = "focusNeverLost" | "noOrphanedFocus" | "driverConsistency";

/**
 * A safety invariant definition with check function
 */
export interface SafetyInvariant {
  /** Unique name of the invariant */
  name: SafetyInvariantType;
  /** Human-readable description */
  description: string;
  /** Check function that returns true if invariant is satisfied */
  check: (state: FocusState, driverState?: FocusState) => boolean;
  /** Severity level of violation */
  severity: "critical" | "warning" | "info";
}

/**
 * Result of an invariant check
 */
export interface InvariantResult {
  /** The invariant that was checked */
  invariant: SafetyInvariant;
  /** Whether the invariant is satisfied */
  satisfied: boolean;
  /** When the check was performed */
  checkedAt: Date;
  /** Additional details about the check result */
  details: string;
  /** Severity level of the result */
  severity: "critical" | "warning" | "info";
}

/**
 * Configuration for the safety monitor
 */
export interface SafetyMonitorConfig {
  /** Interval between invariant checks in ms (default: 5000) */
  checkIntervalMs?: number;
  /** Whether to log detailed check results */
  verboseLogging?: boolean;
  /** Whether to block operations on critical invariant failure */
  blockOnCriticalFailure?: boolean;
  /** Maximum number of historical results to keep */
  maxHistoryEntries?: number;
}

/**
 * Record of an invariant check for historical tracking
 */
export interface InvariantCheckRecord {
  /** Unique ID for this check */
  id: string;
  /** The invariant that was checked */
  invariantType: SafetyInvariantType;
  /** Whether the invariant was satisfied */
  satisfied: boolean;
  /** When the check was performed */
  timestamp: string;
  /** Additional details */
  details: string;
  /** Severity level */
  severity: "critical" | "warning" | "info";
  /** The focus state at time of check */
  focusState: FocusState;
  /** Optional driver state at time of check */
  driverState?: FocusState;
}

export default class FocusSafetyMonitor {
  private config: SafetyMonitorConfig;
  private isMonitoring: boolean = false;
  private monitorInterval?: ReturnType<typeof setInterval>;
  private activeInvariants: SafetyInvariant[];
  private checkHistory: InvariantCheckRecord[];
  private lastCheckResults: Map<SafetyInvariantType, InvariantResult>;
  private cachedSystemState?: FocusState;
  private cachedDriverState?: FocusState;

  constructor(config: SafetyMonitorConfig = {}) {
    this.config = {
      checkIntervalMs: 5000,
      verboseLogging: false,
      blockOnCriticalFailure: false,
      maxHistoryEntries: 100,
      ...config,
    };

    // Initialize active invariants
    this.activeInvariants = this.initializeInvariants();
    this.checkHistory = [];
    this.lastCheckResults = new Map();
  }

  /**
   * Initialize the safety invariants
   */
  private initializeInvariants(): SafetyInvariant[] {
    return [
      {
        name: "focusNeverLost",
        description: "Focus is never in an undefined state - there is always a focused entity",
        severity: "critical",
        check: (state: FocusState) => {
          return FocusTransferContract.SafetyInvariants.focusNeverLost(state);
        },
      },
      {
        name: "noOrphanedFocus",
        description: "No focus is left on closed/unavailable applications",
        severity: "critical",
        check: (state: FocusState) => {
          return FocusTransferContract.SafetyInvariants.noOrphanedFocus(state);
        },
      },
      {
        name: "driverConsistency",
        description: "Driver state matches OS state",
        severity: "warning",
        check: (state: FocusState, driverState?: FocusState) => {
          if (!driverState) {
            return true; // Can't check without driver state
          }
          return FocusTransferContract.SafetyInvariants.driverConsistency(state, driverState);
        },
      },
    ];
  }

  /**
   * Start continuous monitoring of safety invariants
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.log("Monitoring is already running");
      return;
    }

    this.isMonitoring = true;
    this.log("Starting safety invariant monitoring");

    // Run initial check
    this.runAllChecks();

    // Set up periodic checking
    this.monitorInterval = setInterval(() => {
      this.runAllChecks();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      this.log("Monitoring is not running");
      return;
    }

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }

    this.isMonitoring = false;
    this.log("Stopped safety invariant monitoring");
  }

  /**
   * Check a specific invariant
   *
   * @param invariant - The invariant to check
   * @returns The result of the invariant check
   */
  async checkInvariant(invariant: SafetyInvariant): Promise<InvariantResult> {
    // Get current system and driver states
    const systemState = await this.getSystemFocusState();
    const driverState = await this.getDriverFocusState();

    // Run the invariant check
    const satisfied = invariant.check(systemState, driverState);

    const result: InvariantResult = {
      invariant,
      satisfied,
      checkedAt: new Date(),
      details: satisfied
        ? `Invariant "${invariant.name}" is satisfied`
        : `Invariant "${invariant.name}" is violated`,
      severity: satisfied ? "info" : invariant.severity,
    };

    // Enhance details based on specific invariant
    if (!satisfied) {
      result.details = this.generateViolationDetails(invariant, systemState, driverState);
    }

    // Store the result
    this.lastCheckResults.set(invariant.name, result);

    // Add to history
    this.addToHistory(invariant.name, satisfied, systemState, driverState, result.details);

    // Log the result
    if (!satisfied || this.config.verboseLogging) {
      this.log(
        `Invariant check: ${invariant.name} - ${satisfied ? "SATISFIED" : "VIOLATED"} (${result.severity})`
      );
      if (!satisfied) {
        this.log(`  Details: ${result.details}`);
      }
    }

    return result;
  }

  /**
   * Get all active invariants
   *
   * @returns Array of active safety invariants
   */
  getActiveInvariants(): SafetyInvariant[] {
    return [...this.activeInvariants];
  }

  /**
   * Run all invariant checks
   */
  async runAllChecks(): Promise<InvariantResult[]> {
    const results: InvariantResult[] = [];

    for (const invariant of this.activeInvariants) {
      const result = await this.checkInvariant(invariant);
      results.push(result);
    }

    return results;
  }

  /**
   * Get the last check result for a specific invariant
   *
   * @param invariantType - The type of invariant
   * @returns The last check result or undefined
   */
  getLastCheckResult(invariantType: SafetyInvariantType): InvariantResult | undefined {
    return this.lastCheckResults.get(invariantType);
  }

  /**
   * Get all last check results
   *
   * @returns Map of invariant types to their last results
   */
  getAllLastResults(): Map<SafetyInvariantType, InvariantResult> {
    return new Map(this.lastCheckResults);
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get the check history
   *
   * @param limit - Optional limit on number of records to return
   * @returns Array of check records
   */
  getHistory(limit?: number): InvariantCheckRecord[] {
    if (limit && limit > 0) {
      return this.checkHistory.slice(0, limit);
    }
    return [...this.checkHistory];
  }

  /**
   * Get recent violations
   *
   * @param since - Optional ISO timestamp to get violations since
   * @returns Array of violation records
   */
  getRecentViolations(since?: string): InvariantCheckRecord[] {
    let violations = this.checkHistory.filter((record) => !record.satisfied);

    if (since) {
      violations = violations.filter((record) => record.timestamp >= since);
    }

    return violations;
  }

  /**
   * Get critical violations count
   */
  getCriticalViolationsCount(): number {
    return this.checkHistory.filter(
      (record) => !record.satisfied && record.severity === "critical"
    ).length;
  }

  /**
   * Check if there are any active critical violations
   */
  hasCriticalViolations(): boolean {
    const criticalInvariants = this.activeInvariants.filter((i) => i.severity === "critical");
    for (const invariant of criticalInvariants) {
      const lastResult = this.lastCheckResults.get(invariant.name);
      if (lastResult && !lastResult.satisfied) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add a custom invariant to the monitor
   *
   * @param invariant - The invariant to add
   */
  addInvariant(invariant: SafetyInvariant): void {
    // Check if invariant with same name already exists
    const existingIndex = this.activeInvariants.findIndex((i) => i.name === invariant.name);
    if (existingIndex >= 0) {
      this.log(`Replacing existing invariant: ${invariant.name}`);
      this.activeInvariants[existingIndex] = invariant;
    } else {
      this.activeInvariants.push(invariant);
      this.log(`Added new invariant: ${invariant.name}`);
    }
  }

  /**
   * Remove an invariant from the monitor
   *
   * @param invariantType - The type of invariant to remove
   */
  removeInvariant(invariantType: SafetyInvariantType): void {
    const initialLength = this.activeInvariants.length;
    this.activeInvariants = this.activeInvariants.filter((i) => i.name !== invariantType);

    if (this.activeInvariants.length < initialLength) {
      this.log(`Removed invariant: ${invariantType}`);
    } else {
      this.log(`Invariant not found: ${invariantType}`);
    }
  }

  /**
   * Clear the check history
   */
  clearHistory(): void {
    this.checkHistory = [];
    this.log("Cleared check history");
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SafetyMonitorConfig>): void {
    this.config = { ...this.config, ...config };
    this.log("Updated configuration");
  }

  /**
   * Get current system focus state
   */
  private async getSystemFocusState(): Promise<FocusState> {
    // Use cached state if available and recent (within 2 seconds)
    if (this.cachedSystemState) {
      const cacheTime = new Date(this.cachedSystemState.timestamp).getTime();
      const now = Date.now();
      if (now - cacheTime < 2000) {
        return this.cachedSystemState;
      }
    }

    const timestamp = new Date().toISOString();

    try {
      const activeApp = await driver.getActiveApplication();
      const appName = activeApp ? activeApp.toLowerCase() : "unknown";

      this.cachedSystemState = {
        entity: appName,
        layer: FocusLayer.APPLICATION,
        sourceOfTruth: FocusSourceOfTruth.OPERATING_SYSTEM,
        timestamp,
      };

      return this.cachedSystemState;
    } catch (error) {
      this.cachedSystemState = {
        entity: "unknown",
        layer: FocusLayer.APPLICATION,
        sourceOfTruth: FocusSourceOfTruth.MAESTRO,
        timestamp,
      };
      return this.cachedSystemState;
    }
  }

  /**
   * Get current driver tracking state
   */
  private async getDriverFocusState(): Promise<FocusState | undefined> {
    // Use cached state if available and recent (within 2 seconds)
    if (this.cachedDriverState) {
      const cacheTime = new Date(this.cachedDriverState.timestamp).getTime();
      const now = Date.now();
      if (now - cacheTime < 2000) {
        return this.cachedDriverState;
      }
    }

    const timestamp = new Date().toISOString();

    try {
      const activeApp = await driver.getActiveApplication();
      if (!activeApp) {
        return undefined;
      }

      this.cachedDriverState = {
        entity: activeApp.toLowerCase(),
        layer: FocusLayer.APPLICATION,
        sourceOfTruth: FocusSourceOfTruth.MAESTRO,
        timestamp,
      };

      return this.cachedDriverState;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Generate detailed violation information
   */
  private generateViolationDetails(
    invariant: SafetyInvariant,
    systemState: FocusState,
    driverState?: FocusState
  ): string {
    switch (invariant.name) {
      case "focusNeverLost":
        if (!systemState.entity || systemState.entity === "unknown") {
          return `Focus is lost - no valid focused entity (current: "${systemState.entity}")`;
        }
        if (systemState.entity.trim().length === 0) {
          return `Focus is lost - empty entity name`;
        }
        return `Focus state is invalid: ${JSON.stringify(systemState)}`;

      case "noOrphanedFocus":
        if (systemState.layer === undefined || systemState.layer === null) {
          return `Focus is orphaned - no valid layer (layer: ${systemState.layer})`;
        }
        if (systemState.layer !== FocusLayer.APPLICATION && systemState.layer !== FocusLayer.WINDOW) {
          return `Focus is orphaned - invalid layer value: ${systemState.layer}`;
        }
        return `Focus layer is invalid: ${systemState.layer}`;

      case "driverConsistency":
        if (!driverState) {
          return "Cannot verify driver consistency - no driver state available";
        }
        const systemEntity = systemState.entity.toLowerCase();
        const driverEntity = driverState.entity.toLowerCase();
        return `Driver state mismatch - system: "${systemEntity}", driver: "${driverEntity}"`;

      default:
        return `Unknown invariant violation: ${invariant.name}`;
    }
  }

  /**
   * Add a check result to history
   */
  private addToHistory(
    invariantType: SafetyInvariantType,
    satisfied: boolean,
    focusState: FocusState,
    driverState: FocusState | undefined,
    details: string
  ): void {
    const record: InvariantCheckRecord = {
      id: this.generateId(),
      invariantType,
      satisfied,
      timestamp: new Date().toISOString(),
      details,
      severity: satisfied ? "info" : this.getInvariantSeverity(invariantType),
      focusState: { ...focusState },
      driverState: driverState ? { ...driverState } : undefined,
    };

    this.checkHistory.unshift(record);

    // Trim to max entries
    if (this.checkHistory.length > (this.config.maxHistoryEntries || 100)) {
      this.checkHistory = this.checkHistory.slice(0, this.config.maxHistoryEntries || 100);
    }
  }

  /**
   * Get the severity for an invariant type
   */
  private getInvariantSeverity(invariantType: SafetyInvariantType): "critical" | "warning" | "info" {
    const invariant = this.activeInvariants.find((i) => i.name === invariantType);
    return invariant?.severity || "warning";
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `invariant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Internal logging helper
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[FocusSafetyMonitor] ${message}`);
    }
  }
}
