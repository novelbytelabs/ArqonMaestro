/**
 * Focus Recovery Service
 *
 * Provides recovery capabilities for common focus failures.
 * Part of FP-5A: Recovery Foundations
 *
 * This service provides:
 * - Drift detection for common failure cases
 * - Recovery reason taxonomy
 * - Bounded recovery actions
 * - Recovery policy enforcement
 * - Recovery telemetry
 *
 * =============================================================================
 * APPROVED RECOVERY TARGETS (FP-5A)
 * =============================================================================
 *
 * Recovery is limited to already-supported surfaces:
 * | Surface           | Application  | Recovery Actions Available           |
 * |-------------------|-------------|--------------------------------------|
 * | VS Code Editor    | VS Code     | refocus_app, refocus_region           |
 * | VS Code Terminal  | VS Code     | refocus_app, refocus_region           |
 * | Chrome Address Bar| Chrome      | refocus_app, refocus_control          |
 * | Chrome Page       | Chrome      | refocus_app                           |
 *
 * =============================================================================
 * RECOVERY POLICY (FP-5A)
 * =============================================================================
 *
 * Recovery attempts are bounded to prevent infinite loops:
 * - Maximum 1 retry attempt per failure
 * - Fall back to previous verified state if retry fails
 * - Abort with user-safe message if no recovery possible
 * - Never autonomously loop without bounds
 *
 * =============================================================================
 * BOUNDARIES (DO NOT DO)
 * =============================================================================
 *
 * - No full semantic referent resolution
 * - No "this / that / it" routing
 * - No general modal intelligence
 * - No universal recovery across all apps
 * - No autonomous multi-step recovery loops
 */

import { FocusState, FocusLayer } from "./focus-verification-service";
import { RegionKind, SupportedApplication } from "./focus-region-service";
import { PrecisionSurface, ControlType, DetectionAuthority } from "./focus-precision-service";

/**
 * Recovery reason taxonomy (FP-5A)
 * Compact enum for common focus failure reasons
 */
export enum RecoveryReason {
  /** Expected app is active but wrong region focused */
  APP_MISMATCH = "APP_MISMATCH",
  /** Expected window is active but focus is in different window */
  WINDOW_MISMATCH = "WINDOW_MISMATCH",
  /** Expected region is focused but different region is active */
  REGION_MISMATCH = "REGION_MISMATCH",
  /** Expected control is focused but different control is active */
  CONTROL_MISMATCH = "CONTROL_MISMATCH",
  /** Insertion attempted but no caret present */
  CARET_MISSING = "CARET_MISSING",
  /** Previous target no longer exists (closed tab, etc.) */
  TARGET_GONE = "TARGET_GONE",
  /** Ambiguity resolution invalidated prior assumption */
  AMBIGUITY_ESCALATED = "AMBIGUITY_ESCALATED",
  /** Focus state cannot be verified */
  UNVERIFIED_STATE = "UNVERIFIED_STATE",
}

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
 * Recovery result status
 */
export enum RecoveryResultStatus {
  /** Recovery succeeded */
  SUCCESS = "success",
  /** Recovery failed, restored to previous state */
  FALLBACK = "fallback",
  /** Recovery aborted */
  ABORTED = "aborted",
  /** Recovery downgraded confidence */
  DOWNGRADED = "downgraded",
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
  currentFocusState: FocusState;
  /** Current precision surface (if any) */
  currentPrecisionSurface?: PrecisionSurface;
  /** Whether an insertion command was attempted */
  insertionAttempted?: boolean;
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
    region?: RegionKind;
    control?: string;
  };
  /** Actual state observed */
  actualState?: {
    app?: string;
    region?: RegionKind;
    control?: string;
  };
  /** Timestamp of detection */
  timestamp: string;
}

/**
 * Recovery attempt record
 */
export interface RecoveryAttempt {
  /** The recovery action attempted */
  action: RecoveryAction;
  /** The policy that was applied */
  policy: RecoveryPolicy;
  /** Whether the attempt succeeded */
  success: boolean;
  /** Details about what happened */
  details: string;
  /** Timestamp of attempt */
  timestamp: string;
}

/**
 * Recovery telemetry (FP-5A)
 * Records complete recovery attempt for debugging
 */
export interface RecoveryTelemetry {
  /** Whether drift was detected */
  driftDetected: boolean;
  /** Reason for drift */
  reason: RecoveryReason | null;
  /** Recovery action taken */
  action: RecoveryAction | null;
  /** Policy applied */
  policy: RecoveryPolicy | null;
  /** Result status */
  result: RecoveryResultStatus;
  /** Final confidence after recovery */
  finalConfidence: number;
  /** All recovery attempts */
  attempts: RecoveryAttempt[];
  /** User-safe message if recovery failed */
  userSafeMessage?: string;
  /** Timestamp of start */
  startTimestamp: string;
  /** Timestamp of completion */
  endTimestamp: string;
}

/**
 * Previous verified focus state
 * Stored for restore functionality
 */
export interface VerifiedFocusState {
  /** Application name */
  application: string;
  /** Window ID if available */
  windowId?: string;
  /** Region kind */
  region?: RegionKind;
  /** Precision surface */
  precisionSurface?: PrecisionSurface;
  /** When this state was verified */
  timestamp: string;
  /** Confidence when verified */
  confidence: number;
}

/**
 * Recovery action request
 */
export interface RecoveryActionRequest {
  /** Target application */
  targetApp: string;
  /** Target region (optional) */
  targetRegion?: RegionKind;
  /** Target control (optional) */
  targetControl?: PrecisionSurface;
  /** Previous verified state to restore */
  previousState?: VerifiedFocusState;
}

/**
 * User-safe abort message
 * Ensures blocked/aborted recovery paths are explicit
 */
export interface AbortMessage {
  /** Whether this is an abort */
  isAbort: boolean;
  /** User-safe message for display */
  userSafeMessage: string;
  /** Technical details for logging */
  technicalDetails: string;
  /** Recovery reason that led to abort */
  reason: RecoveryReason;
  /** Timestamp */
  timestamp: string;
}

export default class FocusRecoveryService {
  // Storage for previous verified focus state
  private previousVerifiedState: VerifiedFocusState | null = null;
  // Recovery history for debugging
  private recoveryHistory: RecoveryTelemetry[] = [];
  // Maximum history size
  private maxHistorySize = 100;

  /**
   * Detect focus drift (FP-5A)
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

    // If no current focus state, we have drift
    if (!input.currentFocusState) {
      return {
        driftDetected: true,
        reason: RecoveryReason.UNVERIFIED_STATE,
        confidence: 1.0,
        details: "No focus state available - focus is completely unknown",
        timestamp,
      };
    }

    // Check: APP_MISMATCH - expected app is active but wrong region
    if (input.expectedApp && input.expectedRegion) {
      const currentApp = input.currentFocusState.entity?.toLowerCase() || "";
      const expectedApp = input.expectedApp.toLowerCase();

      if (currentApp.includes(expectedApp) || expectedApp.includes(currentApp)) {
        // App matches, check region
        const currentRegion = input.currentFocusState.regionKind;
        if (currentRegion && currentRegion !== input.expectedRegion) {
          return {
            driftDetected: true,
            reason: RecoveryReason.REGION_MISMATCH,
            confidence: 0.85,
            details: `Expected region ${input.expectedRegion} but ${currentRegion} is focused`,
            expectedState: {
              app: input.expectedApp,
              region: input.expectedRegion,
            },
            actualState: {
              app: input.currentFocusState.entity,
              region: currentRegion,
            },
            timestamp,
          };
        }
      } else if (currentApp && !currentApp.includes(expectedApp) && !expectedApp.includes(currentApp)) {
        // App doesn't match
        return {
          driftDetected: true,
          reason: RecoveryReason.APP_MISMATCH,
          confidence: 0.95,
          details: `Expected app ${input.expectedApp} but ${input.currentFocusState.entity} is active`,
          expectedState: {
            app: input.expectedApp,
            region: input.expectedRegion,
          },
          actualState: {
            app: input.currentFocusState.entity,
          },
          timestamp,
        };
      }
    }

    // Check: CONTROL_MISMATCH - expected control different from actual
    if (input.expectedControl && input.currentPrecisionSurface) {
      const expected = input.expectedControl;
      const actual = input.currentPrecisionSurface;

      if (expected.controlType !== actual.controlType) {
        return {
          driftDetected: true,
          reason: RecoveryReason.CONTROL_MISMATCH,
          confidence: 0.8,
          details: `Expected control ${expected.controlType} but ${actual.controlType} is focused`,
          expectedState: {
            app: expected.application,
            control: expected.controlType,
          },
          actualState: {
            app: actual.application,
            control: actual.controlType,
          },
          timestamp,
        };
      }
    }

    // Check: CARET_MISSING - insertion attempted but no caret
    if (input.insertionAttempted && input.currentPrecisionSurface) {
      // This would require checking caret state from precision service
      // For now, we assume if we have a precision surface, caret check happened
      // This is a placeholder - real implementation would query caret state
      const hasCaret = true; // Would come from precision service

      if (!hasCaret) {
        return {
          driftDetected: true,
          reason: RecoveryReason.CARET_MISSING,
          confidence: 0.9,
          details: "Insertion attempted but no caret present in current control",
          expectedState: {
            control: input.expectedControl?.controlType,
          },
          actualState: {
            control: input.currentPrecisionSurface?.controlType,
          },
          timestamp,
        };
      }
    }

    // Check: TARGET_GONE - previous target no longer exists
    if (input.expectedControl && !input.currentPrecisionSurface) {
      return {
        driftDetected: true,
        reason: RecoveryReason.TARGET_GONE,
        confidence: 0.9,
        details: "Previous target control no longer exists or is not focusable",
        expectedState: {
          control: input.expectedControl.controlType,
        },
        actualState: {},
        timestamp,
      };
    }

    // No drift detected
    return {
      driftDetected: false,
      reason: null,
      confidence: 1.0,
      details: "No drift detected - focus state matches expectations",
      timestamp,
    };
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
        // Try to refocus the app
        return RecoveryPolicy.RETRY_ONCE;

      case RecoveryReason.WINDOW_MISMATCH:
        // Try to refocus the window
        return RecoveryPolicy.RETRY_ONCE;

      case RecoveryReason.REGION_MISMATCH:
        // Try to refocus the region
        return RecoveryPolicy.RETRY_ONCE;

      case RecoveryReason.CONTROL_MISMATCH:
        // Try to refocus the control
        return RecoveryPolicy.RETRY_ONCE;

      case RecoveryReason.CARET_MISSING:
        // Cannot recover - need user intervention
        return RecoveryPolicy.ABORT;

      case RecoveryReason.TARGET_GONE:
        // Try to restore previous state
        return RecoveryPolicy.RESTORE_PREVIOUS;

      case RecoveryReason.AMBIGUITY_ESCALATED:
        // Abort and ask user
        return RecoveryPolicy.ABORT;

      case RecoveryReason.UNVERIFIED_STATE:
        // Try to establish state, else abort
        return RecoveryPolicy.RETRY_ONCE;

      default:
        // Default to abort for unknown reasons
        return RecoveryPolicy.ABORT;
    }
  }

  /**
   * Determine recovery action based on drift type and policy (FP-5A)
   *
   * @param reason - The recovery reason
   * @param policy - The recovery policy
   * @param request - The recovery action request
   * @returns Recommended recovery action
   */
  determineRecoveryAction(
    reason: RecoveryReason,
    policy: RecoveryPolicy,
    request: RecoveryActionRequest
  ): RecoveryAction {
    // If restoring previous, that's the action
    if (policy === RecoveryPolicy.RESTORE_PREVIOUS) {
      return RecoveryAction.RESTORE_PREVIOUS;
    }

    // If aborting, that's the action
    if (policy === RecoveryPolicy.ABORT) {
      return RecoveryAction.ABORT;
    }

    // For retry policies, determine which level to retry at
    switch (reason) {
      case RecoveryReason.APP_MISMATCH:
      case RecoveryReason.WINDOW_MISMATCH:
        return RecoveryAction.REFOCUS_APP;

      case RecoveryReason.REGION_MISMATCH:
        return RecoveryAction.REFOCUS_REGION;

      case RecoveryReason.CONTROL_MISMATCH:
      case RecoveryReason.TARGET_GONE:
        return RecoveryAction.REFOCUS_CONTROL;

      case RecoveryReason.CARET_MISSING:
        return RecoveryAction.ABORT;

      case RecoveryReason.AMBIGUITY_ESCALATED:
        return RecoveryAction.ABORT;

      case RecoveryReason.UNVERIFIED_STATE:
        return RecoveryAction.REFOCUS_APP;

      default:
        return RecoveryAction.ABORT;
    }
  }

  /**
   * Execute recovery action (FP-5A)
   *
   * Note: This is a placeholder. Real implementation would call
   * the appropriate focus services to actually perform recovery.
   *
   * @param action - The recovery action to execute
   * @param request - The recovery request details
   * @returns Recovery attempt result
   */
  async executeRecoveryAction(
    action: RecoveryAction,
    request: RecoveryActionRequest
  ): Promise<RecoveryAttempt> {
    const timestamp = new Date().toISOString();

    switch (action) {
      case RecoveryAction.REFOCUS_APP:
        // In real implementation: call focus service to refocus app
        // For now, return success (simulated)
        return {
          action,
          policy: RecoveryPolicy.RETRY_ONCE,
          success: true,
          details: `Refocus app ${request.targetApp} - action simulated (real impl would call focus service)`,
          timestamp,
        };

      case RecoveryAction.REFOCUS_REGION:
        // In real implementation: call region service to refocus region
        return {
          action,
          policy: RecoveryPolicy.RETRY_ONCE,
          success: true,
          details: `Refocus region ${request.targetRegion} in ${request.targetApp} - action simulated`,
          timestamp,
        };

      case RecoveryAction.REFOCUS_CONTROL:
        // In real implementation: call precision service to refocus control
        return {
          action,
          policy: RecoveryPolicy.RETRY_ONCE,
          success: true,
          details: `Refocus control in ${request.targetApp} - action simulated`,
          timestamp,
        };

      case RecoveryAction.RESTORE_PREVIOUS:
        // Restore to previous verified state
        if (request.previousState) {
          return {
            action,
            policy: RecoveryPolicy.RESTORE_PREVIOUS,
            success: true,
            details: `Restored to previous verified state: ${request.previousState.application}`,
            timestamp,
          };
        } else {
          return {
            action,
            policy: RecoveryPolicy.RESTORE_PREVIOUS,
            success: false,
            details: "No previous state available to restore",
            timestamp,
          };
        }

      case RecoveryAction.ABORT:
      default:
        return {
          action: RecoveryAction.ABORT,
          policy: RecoveryPolicy.ABORT,
          success: false,
          details: "Recovery aborted - user intervention required",
          timestamp,
        };
    }
  }

  /**
   * Perform recovery (FP-5A)
   *
   * Main entry point for recovery. Performs:
   * 1. Drift detection
   * 2. Policy determination
   * 3. Action execution
   * 4. Telemetry recording
   *
   * @param input - Drift detection input
   * @returns Complete recovery telemetry
   */
  async performRecovery(input: DriftDetectionInput): Promise<RecoveryTelemetry> {
    const startTimestamp = new Date().toISOString();

    // Step 1: Detect drift
    const driftResult = this.detectDrift(input);

    // If no drift, return success early
    if (!driftResult.driftDetected) {
      return {
        driftDetected: false,
        reason: null,
        action: null,
        policy: null,
        result: RecoveryResultStatus.SUCCESS,
        finalConfidence: 1.0,
        attempts: [],
        startTimestamp,
        endTimestamp: new Date().toISOString(),
      };
    }

    // Step 2: Determine policy
    const policy = this.determineRecoveryPolicy(driftResult.reason!);

    // Step 3: Determine action
    const request: RecoveryActionRequest = {
      targetApp: input.expectedApp || input.currentFocusState.entity || "unknown",
      targetRegion: input.expectedRegion,
      targetControl: input.expectedControl,
      previousState: this.previousVerifiedState || undefined,
    };

    const action = this.determineRecoveryAction(driftResult.reason!, policy, request);

    // Step 4: Execute recovery
    const attempt = await this.executeRecoveryAction(action, request);

    // Step 5: Determine result
    let result: RecoveryResultStatus;
    let finalConfidence: number;

    if (attempt.success) {
      result = RecoveryResultStatus.SUCCESS;
      finalConfidence = 0.9; // Recovery succeeded, confidence restored
    } else if (policy === RecoveryPolicy.RESTORE_PREVIOUS) {
      result = RecoveryResultStatus.FALLBACK;
      finalConfidence = 0.7; // Fell back to previous state
    } else if (policy === RecoveryPolicy.ABORT) {
      result = RecoveryResultStatus.ABORTED;
      finalConfidence = 0.3; // Confidence lost
    } else {
      result = RecoveryResultStatus.DOWNGRADED;
      finalConfidence = 0.5; // Confidence downgraded
    }

    // Step 6: Record telemetry
    const telemetry: RecoveryTelemetry = {
      driftDetected: true,
      reason: driftResult.reason,
      action,
      policy,
      result,
      finalConfidence,
      attempts: [attempt],
      userSafeMessage: result === RecoveryResultStatus.ABORTED
        ? this.getAbortUserMessage(driftResult.reason!)
        : undefined,
      startTimestamp,
      endTimestamp: new Date().toISOString(),
    };

    // Add to history
    this.addToHistory(telemetry);

    return telemetry;
  }

  /**
   * Get user-safe abort message (FP-5A)
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
        return "Could not recover to the expected control. Please click in the correct text field.";

      case RecoveryReason.CARET_MISSING:
        return "No cursor position detected. Please click where you want to insert text.";

      case RecoveryReason.TARGET_GONE:
        return "The target you were working with no longer exists (e.g., closed tab). Please reopen it.";

      case RecoveryReason.AMBIGUITY_ESCALATED:
        return "Could not determine the correct target. Please be more specific about where to focus.";

      case RecoveryReason.UNVERIFIED_STATE:
        return "Could not verify focus state. Please click on the target and try again.";

      default:
        return "Focus recovery failed. Please try manually navigating to your target.";
    }
  }

  /**
   * Create abort message (FP-5A)
   *
   * @param reason - The recovery reason
   * @returns Abort message object
   */
  createAbortMessage(reason: RecoveryReason): AbortMessage {
    const timestamp = new Date().toISOString();
    return {
      isAbort: true,
      userSafeMessage: this.getAbortUserMessage(reason),
      technicalDetails: `Recovery aborted due to: ${reason}`,
      reason,
      timestamp,
    };
  }

  /**
   * Store verified focus state for potential restoration (FP-5A)
   *
   * @param state - The verified focus state to store
   */
  storeVerifiedState(state: VerifiedFocusState): void {
    this.previousVerifiedState = {
      ...state,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get previous verified state
   *
   * @returns Previous verified state or null
   */
  getPreviousVerifiedState(): VerifiedFocusState | null {
    return this.previousVerifiedState;
  }

  /**
   * Add recovery telemetry to history
   *
   * @param telemetry - The telemetry to add
   */
  private addToHistory(telemetry: RecoveryTelemetry): void {
    this.recoveryHistory.push(telemetry);
    // Trim history if needed
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get recovery history
   *
   * @returns Array of recovery telemetry
   */
  getRecoveryHistory(): RecoveryTelemetry[] {
    return [...this.recoveryHistory];
  }

  /**
   * Clear recovery history
   */
  clearHistory(): void {
    this.recoveryHistory = [];
  }

  /**
   * Check if recovery is supported for an application (FP-5A)
   *
   * Recovery is only supported for approved surfaces:
   * - VS Code: editor, terminal
   * - Chrome: address_bar, page
   *
   * @param application - The application name
   * @param region - Optional region kind
   * @returns Whether recovery is supported
   */
  isRecoverySupported(application: string, region?: RegionKind): boolean {
    const normalizedApp = application.toLowerCase();

    // VS Code
    if (normalizedApp.includes("vscode") || normalizedApp.includes("code")) {
      // Supported regions: editor, terminal
      if (region) {
        return region === RegionKind.EDITOR || region === RegionKind.TERMINAL;
      }
      return true; // App-level recovery supported
    }

    // Chrome
    if (normalizedApp.includes("chrome")) {
      // Supported regions: address_bar, page
      if (region) {
        return region === RegionKind.ADDRESS_BAR || region === RegionKind.PAGE;
      }
      return true; // App-level recovery supported
    }

    // Not supported
    return false;
  }

  /**
   * Get recovery capabilities for an application (FP-5A)
   *
   * @param application - The application name
   * @returns Object describing available recovery actions
   */
  getRecoveryCapabilities(application: string): {
    supported: boolean;
    appRecovery: boolean;
    regionRecovery: boolean;
    controlRecovery: boolean;
    supportedRegions: RegionKind[];
  } {
    const normalizedApp = application.toLowerCase();
    const supported = this.isRecoverySupported(application);

    if (!supported) {
      return {
        supported: false,
        appRecovery: false,
        regionRecovery: false,
        controlRecovery: false,
        supportedRegions: [],
      };
    }

    let supportedRegions: RegionKind[] = [];

    if (normalizedApp.includes("vscode")) {
      supportedRegions = [RegionKind.EDITOR, RegionKind.TERMINAL];
    } else if (normalizedApp.includes("chrome")) {
      supportedRegions = [RegionKind.ADDRESS_BAR, RegionKind.PAGE];
    }

    return {
      supported: true,
      appRecovery: true,
      regionRecovery: supportedRegions.length > 0,
      controlRecovery: supportedRegions.length > 0,
      supportedRegions,
    };
  }
}
