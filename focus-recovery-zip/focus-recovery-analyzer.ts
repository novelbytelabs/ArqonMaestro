/**
 * focus-recovery-analyzer.ts
 * Focus Recovery Analyzer
 *
 * Part of FP-5A/5B: Recovery Architecture
 *
 * Responsibilities:
 * - Compare expected vs actual focus state
 * - Classify failure reason
 * - Compute recoverability
 * - Check state integrity
 *
 * This is a SEPARATE module per ADM-048 architecture.
 */

import { FocusState } from "./focus-verification-service";
import { RegionKind } from "./focus-region-service";
import { PrecisionSurface } from "./focus-precision-service";

/**
 * Recovery reason taxonomy (FP-5A)
 * Compact enum for common focus failure reasons
 */
export enum RecoveryReason {
  /** Expected application does not match active application */
  APP_MISMATCH = "APP_MISMATCH",
  /** Expected window does not match active window */
  WINDOW_MISMATCH = "WINDOW_MISMATCH",
  /** Expected region does not match active region */
  REGION_MISMATCH = "REGION_MISMATCH",
  /** Expected control does not match active control */
  CONTROL_MISMATCH = "CONTROL_MISMATCH",
  /** Insertion attempted but no caret present */
  CARET_MISSING = "CARET_MISSING",
  /** Previous target no longer exists (closed tab, closed window, etc.) */
  TARGET_GONE = "TARGET_GONE",
  /** Ambiguity resolution invalidated prior assumption */
  AMBIGUITY_ESCALATED = "AMBIGUITY_ESCALATED",
  /** Focus state cannot be verified */
  UNVERIFIED_STATE = "UNVERIFIED_STATE",
  /** Precision guard blocked the operation */
  PRECISION_GUARD_BLOCKED = "PRECISION_GUARD_BLOCKED",
  /** Safety gate blocked the operation */
  SAFETY_GATE_BLOCKED = "SAFETY_GATE_BLOCKED",
}

/**
 * Drift detection input
 * Information needed to detect focus drift
 */
export interface DriftDetectionInput {
  /** Expected application */
  expectedApp?: string;
  /** Expected window ID */
  expectedWindowId?: string;
  /** Expected region */
  expectedRegion?: RegionKind;
  /** Expected control/surface */
  expectedControl?: PrecisionSurface;
  /** Current actual focus state */
  currentFocusState: FocusState | null;
  /** Current precision surface (if any) */
  currentPrecisionSurface?: PrecisionSurface;
  /** Whether an insertion command was attempted */
  insertionAttempted?: boolean;
  /** Explicit caret presence when known */
  caretPresent?: boolean | null;
  /** Whether ambiguity escalated during routing/recovery */
  ambiguityEscalated?: boolean;
  /** Whether precision guard blocked execution */
  precisionGuardBlocked?: boolean;
  /** Whether safety gate blocked execution */
  safetyGateBlocked?: boolean;
  /** Whether the expected target is known to no longer exist */
  targetStillExists?: boolean | null;
  /** Optional externally supplied state confidence */
  currentStateConfidence?: number;
}

/**
 * Drift detection result
 */
export interface DriftDetectionResult {
  /** Whether drift/failure was detected */
  driftDetected: boolean;
  /** The reason for drift (if detected) */
  reason: RecoveryReason | null;
  /** Confidence in drift detection [0.0, 1.0] */
  confidence: number;
  /** Details about the drift */
  details: string;
  /** Expected vs actual comparison */
  expectedState?: {
    app?: string;
    windowId?: string;
    region?: RegionKind;
    control?: string;
  };
  /** Actual state observed */
  actualState?: {
    app?: string;
    windowId?: string;
    region?: RegionKind;
    control?: string;
  };
  /** Timestamp of detection */
  timestamp: string;
}

/**
 * State integrity status (FP-5B)
 * Indicates whether the state used for recovery is trustworthy
 */
export enum StateIntegrityStatus {
  /** State is trusted and recent */
  TRUSTED = "trusted",
  /** State is somewhat stale but may be usable */
  STALE = "stale",
  /** State is too old to trust */
  EXPIRED = "expired",
  /** State is completely untrusted */
  UNTRUSTED = "untrusted",
}

/**
 * Restoration eligibility (FP-5B)
 * Whether previous verified state can be restored
 */
export interface RestorationEligibility {
  /** Whether restoration is eligible */
  eligible: boolean;
  /** Reason if not eligible */
  reason?: string;
  /** Integrity status of prior state */
  integrityStatus: StateIntegrityStatus;
  /** Age of prior state in seconds */
  ageSeconds?: number;
}

/**
 * Analyzer configuration
 */
export interface FocusRecoveryAnalyzerOptions {
  staleThresholdSeconds?: number;
  expiredThresholdSeconds?: number;
  minConfidenceThreshold?: number;
  defaultStateConfidence?: number;
}

/**
 * Recovery Analyzer
 *
 * Analyzes focus state to determine:
 * - Whether drift has occurred
 * - What kind of failure occurred
 * - Whether recovery is possible
 * - What the integrity of any prior state is
 */
export class FocusRecoveryAnalyzer {
  // State integrity thresholds (FP-5B)
  private readonly staleThresholdSeconds: number;
  private readonly expiredThresholdSeconds: number;
  private readonly minConfidenceThreshold: number;
  private readonly defaultStateConfidence: number;

  constructor(options: FocusRecoveryAnalyzerOptions = {}) {
    this.staleThresholdSeconds = options.staleThresholdSeconds ?? 300; // 5 minutes
    this.expiredThresholdSeconds = options.expiredThresholdSeconds ?? 600; // 10 minutes
    this.minConfidenceThreshold = options.minConfidenceThreshold ?? 0.5;
    this.defaultStateConfidence = options.defaultStateConfidence ?? 0.75;
  }

  /**
   * Detect focus drift
   *
   * Detects common cases where focus has drifted from expected state:
   * - Expected app active, wrong region
   * - Expected region active, wrong control
   * - Insertion attempted, caret missing
   * - Previous target no longer exists
   * - Ambiguity invalidated prior assumption
   *
   * @param input - Drift detection input
   * @returns Drift detection result
   */
  detectDrift(input: DriftDetectionInput): DriftDetectionResult {
    const timestamp = new Date().toISOString();

    // Hard-stop blockers should surface first.
    if (input.precisionGuardBlocked) {
      return {
        driftDetected: true,
        reason: RecoveryReason.PRECISION_GUARD_BLOCKED,
        confidence: 1.0,
        details: "Precision guard blocked the operation before a safe target was verified",
        timestamp,
      };
    }

    if (input.safetyGateBlocked) {
      return {
        driftDetected: true,
        reason: RecoveryReason.SAFETY_GATE_BLOCKED,
        confidence: 1.0,
        details: "Safety gate blocked the operation before execution",
        timestamp,
      };
    }

    if (input.ambiguityEscalated) {
      return {
        driftDetected: true,
        reason: RecoveryReason.AMBIGUITY_ESCALATED,
        confidence: 0.95,
        details: "Ambiguity increased during routing or recovery; prior assumption is no longer safe",
        timestamp,
      };
    }

    // If no current focus state, we have drift/unverified state.
    if (!input.currentFocusState) {
      return {
        driftDetected: true,
        reason: RecoveryReason.UNVERIFIED_STATE,
        confidence: 1.0,
        details: "No focus state available - focus is completely unknown",
        timestamp,
      };
    }

    const currentApp = this.normalizeAppName(input.currentFocusState.entity);
    const expectedApp = this.normalizeAppName(input.expectedApp);
    const currentRegion = input.currentFocusState.regionKind;
    const currentWindowId = this.extractWindowId(input.currentFocusState);
    const currentControl = input.currentPrecisionSurface?.controlType;
    const expectedControl = input.expectedControl?.controlType;

    // If caller explicitly knows target is gone, trust that signal.
    if (input.targetStillExists === false) {
      return {
        driftDetected: true,
        reason: RecoveryReason.TARGET_GONE,
        confidence: 0.95,
        details: "Expected target is known to no longer exist",
        expectedState: {
          app: input.expectedApp,
          windowId: input.expectedWindowId,
          region: input.expectedRegion,
          control: expectedControl,
        },
        actualState: {
          app: input.currentFocusState.entity,
          windowId: currentWindowId,
          region: currentRegion,
          control: currentControl,
        },
        timestamp,
      };
    }

    // App mismatch should be detectable even without expectedRegion.
    if (expectedApp && currentApp && !this.appsMatch(expectedApp, currentApp)) {
      return {
        driftDetected: true,
        reason: RecoveryReason.APP_MISMATCH,
        confidence: 0.95,
        details: `Expected app ${input.expectedApp} but ${input.currentFocusState.entity} is active`,
        expectedState: {
          app: input.expectedApp,
          windowId: input.expectedWindowId,
          region: input.expectedRegion,
          control: expectedControl,
        },
        actualState: {
          app: input.currentFocusState.entity,
          windowId: currentWindowId,
          region: currentRegion,
          control: currentControl,
        },
        timestamp,
      };
    }

    // Window mismatch when both sides are known.
    if (
      input.expectedWindowId &&
      currentWindowId &&
      input.expectedWindowId !== currentWindowId
    ) {
      return {
        driftDetected: true,
        reason: RecoveryReason.WINDOW_MISMATCH,
        confidence: 0.9,
        details: `Expected window ${input.expectedWindowId} but ${currentWindowId} is active`,
        expectedState: {
          app: input.expectedApp,
          windowId: input.expectedWindowId,
          region: input.expectedRegion,
          control: expectedControl,
        },
        actualState: {
          app: input.currentFocusState.entity,
          windowId: currentWindowId,
          region: currentRegion,
          control: currentControl,
        },
        timestamp,
      };
    }

    // Region mismatch when app is compatible and both regions are known.
    if (
      input.expectedRegion &&
      currentRegion &&
      input.expectedRegion !== currentRegion
    ) {
      return {
        driftDetected: true,
        reason: RecoveryReason.REGION_MISMATCH,
        confidence: 0.85,
        details: `Expected region ${input.expectedRegion} but ${currentRegion} is focused`,
        expectedState: {
          app: input.expectedApp,
          windowId: input.expectedWindowId,
          region: input.expectedRegion,
          control: expectedControl,
        },
        actualState: {
          app: input.currentFocusState.entity,
          windowId: currentWindowId,
          region: currentRegion,
          control: currentControl,
        },
        timestamp,
      };
    }

    // Control mismatch only when both expected and actual controls are known.
    if (expectedControl && currentControl && expectedControl !== currentControl) {
      return {
        driftDetected: true,
        reason: RecoveryReason.CONTROL_MISMATCH,
        confidence: 0.8,
        details: `Expected control ${expectedControl} but ${currentControl} is focused`,
        expectedState: {
          app: input.expectedControl?.application,
          control: expectedControl,
        },
        actualState: {
          app: input.currentPrecisionSurface?.application,
          control: currentControl,
        },
        timestamp,
      };
    }

    // Insertion attempted but caret explicitly absent.
    if (input.insertionAttempted && input.caretPresent === false) {
      return {
        driftDetected: true,
        reason: RecoveryReason.CARET_MISSING,
        confidence: 0.95,
        details: "Insertion attempted but no caret is present in the current control",
        expectedState: {
          app: input.expectedApp,
          region: input.expectedRegion,
          control: expectedControl,
        },
        actualState: {
          app: input.currentFocusState.entity,
          region: currentRegion,
          control: currentControl,
        },
        timestamp,
      };
    }

    // If caller expected a specific control but no current precision surface is available,
    // treat this as unverified rather than immediately claiming target is gone.
    if (input.expectedControl && !input.currentPrecisionSurface) {
      return {
        driftDetected: true,
        reason: RecoveryReason.UNVERIFIED_STATE,
        confidence: 0.75,
        details: "Expected control-level state but no current precision surface is available",
        expectedState: {
          app: input.expectedControl.application,
          control: expectedControl,
        },
        actualState: {
          app: input.currentFocusState.entity,
          region: currentRegion,
        },
        timestamp,
      };
    }

    // No drift detected.
    return {
      driftDetected: false,
      reason: null,
      confidence: 1.0,
      details: "No drift detected - focus state matches expectations",
      expectedState: {
        app: input.expectedApp,
        windowId: input.expectedWindowId,
        region: input.expectedRegion,
        control: expectedControl,
      },
      actualState: {
        app: input.currentFocusState.entity,
        windowId: currentWindowId,
        region: currentRegion,
        control: currentControl,
      },
      timestamp,
    };
  }

  /**
   * Check state integrity
   *
   * Determines whether the current state is trustworthy for recovery
   *
   * @param state - The focus state to check
   * @param explicitConfidence - Optional externally supplied confidence
   * @returns State integrity status
   */
  checkStateIntegrity(
    state: FocusState | null,
    explicitConfidence?: number
  ): StateIntegrityStatus {
    if (!state) {
      return StateIntegrityStatus.UNTRUSTED;
    }

    const stateConfidence = this.extractConfidence(state, explicitConfidence);

    if (stateConfidence < this.minConfidenceThreshold) {
      return StateIntegrityStatus.UNTRUSTED;
    }

    const timestamp = this.extractTimestamp(state);
    if (!timestamp) {
      return StateIntegrityStatus.UNTRUSTED;
    }

    const stateTime = new Date(timestamp).getTime();
    if (Number.isNaN(stateTime)) {
      return StateIntegrityStatus.UNTRUSTED;
    }

    const now = Date.now();
    const ageSeconds = (now - stateTime) / 1000;

    if (ageSeconds > this.expiredThresholdSeconds) {
      return StateIntegrityStatus.EXPIRED;
    }

    if (ageSeconds > this.staleThresholdSeconds) {
      return StateIntegrityStatus.STALE;
    }

    return StateIntegrityStatus.TRUSTED;
  }

  /**
   * Check restoration eligibility
   *
   * Validates whether prior verified state can be restored
   *
   * @param priorState - The prior verified state to restore
   * @returns Restoration eligibility
   */
  checkRestorationEligibility(
    priorState: { timestamp: string; confidence: number } | null
  ): RestorationEligibility {
    if (!priorState) {
      return {
        eligible: false,
        reason: "No prior state available",
        integrityStatus: StateIntegrityStatus.UNTRUSTED,
      };
    }

    const stateTime = new Date(priorState.timestamp).getTime();
    if (Number.isNaN(stateTime)) {
      return {
        eligible: false,
        reason: "Prior state timestamp is invalid",
        integrityStatus: StateIntegrityStatus.UNTRUSTED,
      };
    }

    const now = Date.now();
    const ageSeconds = (now - stateTime) / 1000;

    if (ageSeconds > this.expiredThresholdSeconds) {
      return {
        eligible: false,
        reason: `Prior state too old (${Math.round(ageSeconds)}s > ${this.expiredThresholdSeconds}s)`,
        integrityStatus: StateIntegrityStatus.EXPIRED,
        ageSeconds,
      };
    }

    if (priorState.confidence < this.minConfidenceThreshold) {
      return {
        eligible: false,
        reason: `Prior state confidence too low (${priorState.confidence} < ${this.minConfidenceThreshold})`,
        integrityStatus: StateIntegrityStatus.UNTRUSTED,
        ageSeconds,
      };
    }

    const integrityStatus =
      ageSeconds > this.staleThresholdSeconds
        ? StateIntegrityStatus.STALE
        : StateIntegrityStatus.TRUSTED;

    return {
      eligible: true,
      integrityStatus,
      ageSeconds,
    };
  }

  private normalizeAppName(value?: string): string {
    return (value || "").trim().toLowerCase();
  }

  private appsMatch(expected: string, actual: string): boolean {
    if (!expected || !actual) {
      return false;
    }

    if (expected === actual) {
      return true;
    }

    const aliases: Record<string, string[]> = {
      vscode: ["code", "vscode", "visual studio code"],
      code: ["code", "vscode", "visual studio code"],
      chrome: ["chrome", "google chrome", "google-chrome", "chromium", "brave", "browser"],
      browser: ["chrome", "google chrome", "google-chrome", "chromium", "brave", "browser", "firefox"],
      terminal: ["terminal", "gnome-terminal", "gnome-terminal-server", "shell", "console", "term"],
      firefox: ["firefox", "browser"],
    };

    const expectedAliases = aliases[expected] || [expected];
    const actualAliases = aliases[actual] || [actual];

    return (
      expectedAliases.some((alias) => actual.includes(alias)) ||
      actualAliases.some((alias) => expected.includes(alias))
    );
  }

  private extractWindowId(state: FocusState): string | undefined {
    const anyState = state as FocusState & { windowId?: string };
    return anyState.windowId;
  }

  private extractTimestamp(state: FocusState): string | undefined {
    return state.timestamp;
  }

  private extractConfidence(
    state: FocusState,
    explicitConfidence?: number
  ): number {
    if (typeof explicitConfidence === "number") {
      return explicitConfidence;
    }

    const anyState = state as FocusState & { confidence?: number };
    if (typeof anyState.confidence === "number") {
      return anyState.confidence;
    }

    return this.defaultStateConfidence;
  }
}

export default FocusRecoveryAnalyzer;