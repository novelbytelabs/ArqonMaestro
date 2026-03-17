/**
 * focus-recovery-service.ts
 * Focus Recovery Service
 *
 * Provides recovery capabilities for common focus failures.
 * Part of FP-5A: Recovery Foundations
 *
 * ARCHITECTURE (ADM-048): Recovery is an orchestrator, NOT a driver.
 * It delegates to existing subsystems rather than calling xdotool directly.
 *
 * This service provides:
 * - Drift detection (via FocusRecoveryAnalyzer)
 * - Recovery policy determination (via FocusRecoveryPolicy)
 * - Bounded recovery actions via delegates
 * - Recovery telemetry with actual re-verification
 *
 * GOTCHAs addressed:
 * - GOTCHA-032: Recovery Service Direct Xdotool Bypass - now delegates to subsystems
 * - GOTCHA-033: Fake Recovery Re-Verification - now actually re-verifies
 * - GOTCHA-034: Recovery Service Isolation Violation - delegates to history service
 *
 * =============================================================================
 * DELEGATION MODEL (ADM-048)
 * =============================================================================
 *
 * Recovery delegates actions to existing services:
 * - REFOCUS_APP -> system.focus() / driver.focusApplication()
 * - REFOCUS_REGION -> focus-region-handler
 * - REFOCUS_CONTROL -> focus-precision-service
 * - RESTORE_PREVIOUS -> focus-history-service
 * - Re-verification -> focus-verification-service
 *
 * Delegates must be configured via setter methods before recovery can execute.
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
 * RECOVERY REASONS (ADM-049):
 * - APP_MISMATCH, WINDOW_MISMATCH, REGION_MISMATCH, CONTROL_MISMATCH -> RETRY_ONCE
 * - CARET_MISSING, AMBIGUITY_ESCALATED -> ABORT
 * - TARGET_GONE -> RESTORE_PREVIOUS
 * - PRECISION_GUARD_BLOCKED, SAFETY_GATE_BLOCKED -> ABORT (abort-only)
 *
 * =============================================================================
 * RECOVERY FLOW DIAGRAM (ADM-048)
 * =============================================================================
 *
 *  START: performRecovery(input)
 *         │
 *         ▼
 *  ┌──────────────────┐
 *  │ detectDrift()     │ ── No drift ──→ NO_RECOVERY_NEEDED ✓
 *  └────────┬─────────┘
 *           │ drift
 *           ▼
 *  ┌──────────────────┐
 *  │checkStateIntegrity│ → TRUSTED | UNVERIFIED | UNTRUSTED | ORPHANED
 *  └────────┬─────────┘
 *           │
 *           ▼
 *  ┌──────────────────────────────────┐
 *  │isRecoverySupported()?            │
 *  └───────────────┬──────────────────┘
 *                  │
 *        ┌────────┴────────┐
 *        ▼                 ▼
 *    UNSUPPORTED         SUPPORTED
 *    ─────────         ───────────
 *    ABORT             │
 *  (unsupported)       ▼
 *               ┌───────────────┐
 *               │determinePolicy│ → RETRY | RESTORE | ABORT
 *               └───────┬───────┘
 *                       │
 *       ┌───────────────┼───────────────┐
 *       ▼               ▼               ▼
 *   RETRY_ONCE     RESTORE_PREVIOUS     ABORT
 *       │               │               │
 *       ▼               ▼               ▼
 *  ┌─────────┐   checkEligibility()   ABORTED
 *  │determine│   ┌────────┬─────────┐
 *  │ Action  │   │eligible│not-eligi│
 *  └────┬────┘   └───┬────┴────┬───┘
 *       │             │          │
 *       ▼             ▼          ▼
 *  ┌─────────────────────────┐
 *  │  DELEGATE EXECUTION     │
 *  │  (ADM-048)             │
 *  │  → appFocusDelegate    │
 *  │  → regionFocusDelegate │
 *  │  → restoreDelegate     │
 *  └────────────┬────────────┘
 *               │
 *        ┌──────┴──────┐
 *        ▼             ▼
 *   success        failure
 *   ──────        ───────
 *        │             │
 *        ▼             ▼
 *  ┌────────────────────┐
 *  │reverifyFocusState()│ ← GOTCHA-033: No fake verification!
 *  └────────┬───────────┘
 *           │
 *    ┌──────┴──────┐
 *    ▼             ▼
 * verified    not verified
 * ───────    ───────────
 *    │             │
 *    ▼             ▼
 * RECOVERED    DOWNGRADED
 * (conf≥0.85) (conf=0.4)
 * ─────────   ───────────
 * Action succeeded
 * but verification
 * failed
 *
 * =============================================================================
 * RESULT STATUSES (FP-5B)
 * =============================================================================
 * - NO_RECOVERY_NEEDED      : No drift detected
 * - RECOVERED_BY_RETRY      : Retry succeeded + verified (confidence ≥ 0.85)
 * - RECOVERED_BY_RESTORE    : Restore succeeded + verified (confidence 0.7-0.85)
 * - DOWNGRADED              : Action succeeded but verification failed
 * - ABORTED_UNSAFE_RECOVERY : Aborted - unsafe or unsupported surface
 * - ABORTED_UNTRUSTED_STATE : Aborted - state integrity untrusted
 * - ABORTED_MISSING_TARGET  : Aborted - target missing or restore ineligible
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
 * - Recovery does NOT call xdotool directly (violates ADM-048)
 */

import { FocusState } from "./focus-verification-service";
import { RegionKind } from "./focus-region-service";
import { PrecisionSurface } from "./focus-precision-service";

import {
  FocusRecoveryAnalyzer,
  FocusRecoveryAnalyzerOptions,
  RecoveryReason,
  DriftDetectionInput,
  StateIntegrityStatus,
} from "./focus-recovery-analyzer";
import {
  FocusRecoveryPolicy,
  RecoveryAction,
  RecoveryPolicy,
  RecoveryPolicyConfig,
  RecoveryResultStatus,
  RecoveryDepth,
  ControlRecoveryLevel,
} from "./focus-recovery-policy";

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
  /** Recovery depth achieved (for layered restore) */
  recoveryDepth?: RecoveryDepth;
}

/**
 * Recovery depth for layered restore
 * Indicates how much of the prior state was actually restored and verified
 * (imported from focus-recovery-policy.ts)
 */
export { RecoveryDepth } from "./focus-recovery-policy";

/**
 * Control recovery level
 * Indicates what level of control focus was actually achieved
 * (imported from focus-recovery-policy.ts)
 */
export { ControlRecoveryLevel } from "./focus-recovery-policy";

/**
 * Result of a layered restore operation
 */
export interface RestoreResult {
  /** Whether app was restored */
  appRestored: boolean;
  /** Whether region was restored */
  regionRestored: boolean;
  /** Whether control was restored */
  controlRestored: boolean;
  /** Final verification status */
  finalVerified: boolean;
  /** The deepest level actually restored and verified */
  restoreDepth: RecoveryDepth;
  /** Whether this is a degraded result (not full restore) */
  degraded: boolean;
  /** Details about each stage */
  details: {
    app?: string;
    region?: string;
    control?: string;
    verificationFailedAt?: string;
  };
}

/**
 * Result of a control recovery operation
 */
export interface ControlRecoveryResult {
  /** Whether control focus was supported */
  supported: boolean;
  /** Whether control-level focus was attempted */
  attemptedControlFocus: boolean;
  /** Whether control was verified at control level */
  controlVerified: boolean;
  /** The recovery level actually achieved */
  recoveryLevel: ControlRecoveryLevel;
  /** Whether result was downgraded from intended level */
  downgraded: boolean;
  /** Details about what happened */
  details: string;
}

/**
 * Recovery telemetry (FP-5A, FP-5B hardened)
 * Records complete recovery attempt for debugging
 *
 * IMPORTANT: This now tracks intended vs verified vs degraded to prevent overclaiming.
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
  /** Result status (FP-5B refined) */
  result: RecoveryResultStatus;
  /** Final confidence after recovery */
  finalConfidence: number;
  /** All recovery attempts */
  attempts: RecoveryAttempt[];
  /** User-safe message if recovery failed or degraded */
  userSafeMessage?: string;
  /** Timestamp of start */
  startTimestamp: string;
  /** Timestamp of completion */
  endTimestamp: string;
  /** State integrity status (FP-5B) */
  integrityStatus?: StateIntegrityStatus;
  /** Whether prior state was re-verified after action */
  finalStateReverified?: boolean;
  /** Whether restoration was validated before use (FP-5B) */
  restorationValidated?: boolean;

  // New: Intended vs verified tracking
  /** Intended recovery target (what we tried to recover) */
  intendedTarget?: {
    app?: string;
    region?: string;
    control?: string;
  };
  /** Verified recovery level (what was actually verified) */
  verifiedLevel?: "app" | "region" | "control" | "none";
  /** Whether the result is degraded (verified level < intended level) */
  degraded?: boolean;
  /** For restore: the depth actually achieved */
  restoreDepth?: RecoveryDepth;
  /** For control recovery: the level actually achieved */
  controlRecoveryLevel?: ControlRecoveryLevel;
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

/**
 * Focus Recovery Service
 *
 * A pure orchestrator that:
 * 1. Uses FocusRecoveryAnalyzer for drift detection
 * 2. Uses FocusRecoveryPolicy for policy determination
 * 3. Delegates actual execution to injected subsystems
 * 4. Performs actual re-verification after recovery
 */
export default class FocusRecoveryService {
  private analyzer: FocusRecoveryAnalyzer;
  private policy: FocusRecoveryPolicy;

  private previousVerifiedState: VerifiedFocusState | null = null;
  private recoveryHistory: RecoveryTelemetry[] = [];
  private maxHistorySize = 100;

  // Delegates for existing subsystems (ADM-048)
  private appFocusDelegate: ((app: string) => Promise<boolean>) | null = null;
  private regionFocusDelegate: ((app: string, region: string) => Promise<boolean>) | null = null;
  private controlFocusDelegate: ((app: string, control: string) => Promise<boolean>) | null = null;
  private restoreDelegate: ((state: VerifiedFocusState) => Promise<boolean>) | null = null;
  private verifyDelegate:
    | (() => Promise<{ verified: boolean; state: FocusState | null }>)
    | null = null;

  // New: Layered restore delegate (returns rich result)
  private layeredRestoreDelegate:
    | ((state: VerifiedFocusState) => Promise<RestoreResult>)
    | null = null;

  // New: Capability-gated control recovery delegate
  private capabilityControlRecoveryDelegate:
    | ((app: string, control: string) => Promise<ControlRecoveryResult>)
    | null = null;

  constructor(
    analyzerOptions: FocusRecoveryAnalyzerOptions = {},
    policyOptions: Partial<RecoveryPolicyConfig> = {}
  ) {
    this.analyzer = new FocusRecoveryAnalyzer(analyzerOptions);
    this.policy = new FocusRecoveryPolicy(policyOptions);
  }

  /**
   * Set the delegate for app focus operations
   * Should delegate to system.focus() / driver.focusApplication()
   */
  setAppFocusDelegate(delegate: (app: string) => Promise<boolean>): void {
    this.appFocusDelegate = delegate;
  }

  /**
   * Set the delegate for region focus operations
   * Should delegate to focus-region-handler
   */
  setRegionFocusDelegate(delegate: (app: string, region: string) => Promise<boolean>): void {
    this.regionFocusDelegate = delegate;
  }

  /**
   * Set the delegate for control focus operations
   * Should delegate to focus-precision-service
   */
  setControlFocusDelegate(delegate: (app: string, control: string) => Promise<boolean>): void {
    this.controlFocusDelegate = delegate;
  }

  /**
   * Set the delegate for restore operations
   * Should delegate to focus-history-service
   */
  setRestoreDelegate(delegate: (state: VerifiedFocusState) => Promise<boolean>): void {
    this.restoreDelegate = delegate;
  }

  /**
   * Set the delegate for verification
   * Should delegate to focus-verification-service
   */
  setVerifyDelegate(delegate: () => Promise<{ verified: boolean; state: FocusState | null }>): void {
    this.verifyDelegate = delegate;
  }

  /**
   * Set the delegate for layered restore operations
   * Returns rich RestoreResult with depth information
   */
  setLayeredRestoreDelegate(delegate: (state: VerifiedFocusState) => Promise<RestoreResult>): void {
    this.layeredRestoreDelegate = delegate;
  }

  /**
   * Set the delegate for capability-gated control recovery
   * Returns rich ControlRecoveryResult with level information
   */
  setCapabilityControlRecoveryDelegate(
    delegate: (app: string, control: string) => Promise<ControlRecoveryResult>
  ): void {
    this.capabilityControlRecoveryDelegate = delegate;
  }

  /**
   * Detect focus drift (delegates to analyzer)
   */
  detectDrift(input: DriftDetectionInput) {
    return this.analyzer.detectDrift(input);
  }

  /**
   * Determine recovery policy (delegates to policy)
   */
  determineRecoveryPolicy(reason: RecoveryReason): RecoveryPolicy {
    return this.policy.determineRecoveryPolicy(reason);
  }

  /**
   * Determine recovery action (delegates to policy)
   */
  determineRecoveryAction(reason: RecoveryReason, policy: RecoveryPolicy): RecoveryAction {
    return this.policy.determineRecoveryAction(reason, policy);
  }

  /**
   * Get abort user message (delegates to policy)
   */
  getAbortUserMessage(reason: RecoveryReason): string {
    return this.policy.getAbortUserMessage(reason);
  }

  /**
   * Check state integrity (delegates to analyzer)
   */
  checkStateIntegrity(state: FocusState | null, confidence?: number): StateIntegrityStatus {
    return this.analyzer.checkStateIntegrity(state, confidence);
  }

  /**
   * Check restoration eligibility (delegates to analyzer)
   */
  checkRestorationEligibility(priorState: VerifiedFocusState | null) {
    return this.analyzer.checkRestorationEligibility(
      priorState
        ? {
            timestamp: priorState.timestamp,
            confidence: priorState.confidence,
          }
        : null
    );
  }

  /**
   * Execute recovery action
   *
   * Delegates to existing subsystems rather than directly calling xdotool.
   *
   * @param action - The recovery action to execute
   * @param request - The recovery request details
   * @returns Recovery attempt result
   */
  async executeRecoveryAction(
    action: RecoveryAction,
    request: RecoveryActionRequest,
    policy: RecoveryPolicy
  ): Promise<RecoveryAttempt> {
    const timestamp = new Date().toISOString();

    switch (action) {
      case RecoveryAction.REFOCUS_APP: {
        if (!this.appFocusDelegate) {
          return {
            action,
            policy,
            success: false,
            details:
              "REFOCUS_APP failed: no appFocusDelegate configured; recovery requires subsystem delegation",
            timestamp,
          };
        }

        try {
          const success = await this.appFocusDelegate(request.targetApp);
          return {
            action,
            policy,
            success,
            details: success
              ? `Delegated REFOCUS_APP to app focus subsystem for ${request.targetApp}`
              : `App focus delegate returned failure for ${request.targetApp}`,
            timestamp,
          };
        } catch (error) {
          return {
            action,
            policy,
            success: false,
            details: `REFOCUS_APP delegate error: ${String(error)}`,
            timestamp,
          };
        }
      }

      case RecoveryAction.REFOCUS_REGION: {
        if (!this.regionFocusDelegate || !request.targetRegion) {
          return {
            action,
            policy,
            success: false,
            details:
              "REFOCUS_REGION failed: missing regionFocusDelegate or targetRegion",
            timestamp,
          };
        }

        try {
          const success = await this.regionFocusDelegate(
            request.targetApp,
            request.targetRegion
          );
          return {
            action,
            policy,
            success,
            details: success
              ? `Delegated REFOCUS_REGION to region subsystem for ${request.targetRegion} in ${request.targetApp}`
              : `Region focus delegate returned failure for ${request.targetRegion} in ${request.targetApp}`,
            timestamp,
          };
        } catch (error) {
          return {
            action,
            policy,
            success: false,
            details: `REFOCUS_REGION delegate error: ${String(error)}`,
            timestamp,
          };
        }
      }

      case RecoveryAction.REFOCUS_CONTROL: {
        if (!this.controlFocusDelegate || !request.targetControl?.controlType) {
          return {
            action,
            policy,
            success: false,
            details:
              "REFOCUS_CONTROL failed: missing controlFocusDelegate or targetControl",
            timestamp,
          };
        }

        try {
          const success = await this.controlFocusDelegate(
            request.targetApp,
            request.targetControl.controlType
          );
          return {
            action,
            policy,
            success,
            details: success
              ? `Delegated REFOCUS_CONTROL to precision subsystem for ${request.targetControl.controlType} in ${request.targetApp}`
              : `Control focus delegate returned failure for ${request.targetControl.controlType} in ${request.targetApp}`,
            timestamp,
          };
        } catch (error) {
          return {
            action,
            policy,
            success: false,
            details: `REFOCUS_CONTROL delegate error: ${String(error)}`,
            timestamp,
          };
        }
      }

      case RecoveryAction.RESTORE_PREVIOUS: {
        if (!request.previousState) {
          return {
            action,
            policy,
            success: false,
            details: "RESTORE_PREVIOUS failed: no previous verified state available",
            timestamp,
          };
        }

        if (!this.restoreDelegate) {
          return {
            action,
            policy,
            success: false,
            details:
              "RESTORE_PREVIOUS failed: no restoreDelegate configured; history restore is unavailable",
            timestamp,
          };
        }

        try {
          const success = await this.restoreDelegate(request.previousState);
          return {
            action,
            policy,
            success,
            details: success
              ? `Delegated RESTORE_PREVIOUS to history service for ${request.previousState.application}`
              : `Restore delegate returned failure for ${request.previousState.application}`,
            timestamp,
          };
        } catch (error) {
          return {
            action,
            policy,
            success: false,
            details: `RESTORE_PREVIOUS delegate error: ${String(error)}`,
            timestamp,
          };
        }
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
   * Re-verify the focus state after recovery.
   * GOTCHA-033: fake re-verification is not allowed.
   */
  async reverifyFocusState(): Promise<{
    verified: boolean;
    state: FocusState | null;
    confidence: number;
  }> {
    if (!this.verifyDelegate) {
      return {
        verified: false,
        state: null,
        confidence: 0,
      };
    }

    try {
      const result = await this.verifyDelegate();
      const confidence = this.analyzer.checkStateIntegrity(result.state) === StateIntegrityStatus.TRUSTED
        ? 0.9
        : 0.6;

      return {
        verified: result.verified,
        state: result.state,
        confidence,
      };
    } catch {
      return {
        verified: false,
        state: null,
        confidence: 0,
      };
    }
  }

  /**
   * Execute layered restore (app → region → control with verification)
   *
   * This implements the honest restore model:
   * - Restore app first, verify
   * - Then restore region if available, verify
   * - Then restore control if available, verify
   * - Report the actual depth achieved
   *
   * @param previousState - The prior verified state to restore
   * @returns RestoreResult with depth information
   */
  async executeLayeredRestore(previousState: VerifiedFocusState): Promise<RestoreResult> {
    // If layered restore delegate is available, use it
    if (this.layeredRestoreDelegate) {
      try {
        return await this.layeredRestoreDelegate(previousState);
      } catch (error) {
        // Fall through to internal implementation
      }
    }

    // Internal layered restore implementation
    const result: RestoreResult = {
      appRestored: false,
      regionRestored: false,
      controlRestored: false,
      finalVerified: false,
      restoreDepth: RecoveryDepth.NONE,
      degraded: false,
      details: {},
    };

    // Step 1: Restore app
    if (this.appFocusDelegate) {
      try {
        const appSuccess = await this.appFocusDelegate(previousState.application);
        result.appRestored = appSuccess;
        result.details.app = appSuccess ? `App ${previousState.application} restored` : `Failed to restore app`;

        if (!appSuccess) {
          result.degraded = true;
          result.details.verificationFailedAt = "app";
          return result;
        }
      } catch (error) {
        result.details.app = `Error restoring app: ${String(error)}`;
        result.degraded = true;
        return result;
      }
    }

    // Verify app-level focus
    const appVerification = await this.reverifyFocusState();
    if (!appVerification.verified) {
      result.degraded = true;
      result.details.verificationFailedAt = "app_verification";
      return result;
    }

    // Step 2: Restore region (if prior state had region)
    if (previousState.region && this.regionFocusDelegate) {
      try {
        const regionSuccess = await this.regionFocusDelegate(
          previousState.application,
          previousState.region
        );
        result.regionRestored = regionSuccess;
        result.details.region = regionSuccess
          ? `Region ${previousState.region} restored`
          : `Failed to restore region`;

        if (!regionSuccess) {
          result.restoreDepth = RecoveryDepth.APP_ONLY;
          result.degraded = true;
          result.details.verificationFailedAt = "region";
          // Don't return yet - we still have app-level success
        }
      } catch (error) {
        result.details.region = `Error restoring region: ${String(error)}`;
        result.restoreDepth = RecoveryDepth.APP_ONLY;
        result.degraded = true;
      }
    } else {
      result.restoreDepth = RecoveryDepth.APP_ONLY;
    }

    // Verify region-level focus (if we attempted region restore)
    if (previousState.region && result.regionRestored) {
      const regionVerification = await this.reverifyFocusState();
      if (!regionVerification.verified) {
        result.restoreDepth = RecoveryDepth.APP_ONLY;
        result.degraded = true;
        result.details.verificationFailedAt = "region_verification";
      } else {
        result.restoreDepth = RecoveryDepth.APP_REGION;
      }
    }

    // Step 3: Restore control (if prior state had control)
    if (previousState.precisionSurface && this.controlFocusDelegate) {
      try {
        const controlSuccess = await this.controlFocusDelegate(
          previousState.application,
          previousState.precisionSurface.controlType
        );
        result.controlRestored = controlSuccess;
        result.details.control = controlSuccess
          ? `Control ${previousState.precisionSurface.controlType} restored`
          : `Failed to restore control`;

        if (!controlSuccess) {
          result.restoreDepth = result.restoreDepth === RecoveryDepth.APP_REGION
            ? RecoveryDepth.APP_REGION
            : RecoveryDepth.APP_ONLY;
          result.degraded = true;
          result.details.verificationFailedAt = "control";
        }
      } catch (error) {
        result.details.control = `Error restoring control: ${String(error)}`;
        result.restoreDepth = result.restoreDepth === RecoveryDepth.APP_REGION
          ? RecoveryDepth.APP_REGION
          : RecoveryDepth.APP_ONLY;
        result.degraded = true;
      }
    }

    // Verify control-level focus (if we attempted control restore)
    if (previousState.precisionSurface && result.controlRestored) {
      const controlVerification = await this.reverifyFocusState();
      if (!controlVerification.verified) {
        result.restoreDepth = result.restoreDepth === RecoveryDepth.APP_REGION
          ? RecoveryDepth.APP_REGION
          : RecoveryDepth.APP_ONLY;
        result.degraded = true;
        result.details.verificationFailedAt = "control_verification";
      } else {
        result.restoreDepth = RecoveryDepth.APP_REGION_CONTROL;
      }
    }

    // Final verification
    const finalVerification = await this.reverifyFocusState();
    result.finalVerified = finalVerification.verified;

    return result;
  }

  /**
   * Execute capability-gated control recovery
   *
   * This implements honest control recovery:
   * - Check if surface supports control-level recovery
   * - Attempt control focus if supported
   * - Verify at control level
   * - Downgrade explicitly if verification fails
   *
   * @param app - Target application
   * @param control - Target control
   * @returns ControlRecoveryResult with level information
   */
  async executeCapabilityGatedControlRecovery(
    app: string,
    control: string
  ): Promise<ControlRecoveryResult> {
    // If capability-gated delegate is available, use it
    if (this.capabilityControlRecoveryDelegate) {
      try {
        return await this.capabilityControlRecoveryDelegate(app, control);
      } catch (error) {
        // Fall through to internal implementation
      }
    }

    // Internal capability-gated control recovery implementation
    const capabilities = this.getRecoveryCapabilities(app);

    // Check if control recovery is supported
    if (!capabilities.controlRecovery) {
      return {
        supported: false,
        attemptedControlFocus: false,
        controlVerified: false,
        recoveryLevel: ControlRecoveryLevel.UNSUPPORTED,
        downgraded: true,
        details: `Control recovery not supported for ${app}. Surface does not support verified control focus.`,
      };
    }

    // Attempt control focus
    if (!this.controlFocusDelegate) {
      return {
        supported: true,
        attemptedControlFocus: false,
        controlVerified: false,
        recoveryLevel: ControlRecoveryLevel.NONE,
        downgraded: true,
        details: `Control focus delegate not configured for ${app}.`,
      };
    }

    try {
      const controlSuccess = await this.controlFocusDelegate(app, control);

      if (!controlSuccess) {
        // Control focus attempt failed - try region as fallback
        if (capabilities.regionRecovery && this.regionFocusDelegate) {
          const regionResult = await this.regionFocusDelegate(app, capabilities.supportedRegions[0]);
          if (regionResult) {
            return {
              supported: true,
              attemptedControlFocus: true,
              controlVerified: false,
              recoveryLevel: ControlRecoveryLevel.DOWNGRADED_TO_REGION,
              downgraded: true,
              details: `Control focus failed, downgraded to region focus for ${app}.`,
            };
          }
        }

        // Even app-level fallback might work
        if (this.appFocusDelegate) {
          const appResult = await this.appFocusDelegate(app);
          if (appResult) {
            return {
              supported: true,
              attemptedControlFocus: true,
              controlVerified: false,
              recoveryLevel: ControlRecoveryLevel.DOWNGRADED_TO_APP,
              downgraded: true,
              details: `Control focus failed, downgraded to app focus for ${app}.`,
            };
          }
        }

        return {
          supported: true,
          attemptedControlFocus: true,
          controlVerified: false,
          recoveryLevel: ControlRecoveryLevel.NONE,
          downgraded: true,
          details: `Control focus failed and no fallback available for ${app}.`,
        };
      }

      // Control focus succeeded - verify at control level
      const verification = await this.reverifyFocusState();

      if (verification.verified) {
        return {
          supported: true,
          attemptedControlFocus: true,
          controlVerified: true,
          recoveryLevel: ControlRecoveryLevel.CONTROL_VERIFIED,
          downgraded: false,
          details: `Control ${control} successfully recovered and verified in ${app}.`,
        };
      } else {
        // Verification failed - determine downgrade level
        if (capabilities.regionRecovery && this.regionFocusDelegate) {
          return {
            supported: true,
            attemptedControlFocus: true,
            controlVerified: false,
            recoveryLevel: ControlRecoveryLevel.DOWNGRADED_TO_REGION,
            downgraded: true,
            details: `Control focus claimed success but verification failed, downgraded to region.`,
          };
        }

        return {
          supported: true,
          attemptedControlFocus: true,
          controlVerified: false,
          recoveryLevel: ControlRecoveryLevel.DOWNGRADED_TO_APP,
          downgraded: true,
          details: `Control focus claimed success but verification failed, downgraded to app.`,
        };
      }
    } catch (error) {
      return {
        supported: true,
        attemptedControlFocus: true,
        controlVerified: false,
        recoveryLevel: ControlRecoveryLevel.NONE,
        downgraded: true,
        details: `Control recovery error: ${String(error)}`,
      };
    }
  }

  /**
   * Check if control recovery is supported for an application
   *
   * @param application - The application name
   * @returns Whether control-level recovery is supported
   */
  isControlRecoverySupported(application: string): boolean {
    const capabilities = this.getRecoveryCapabilities(application);
    return capabilities.controlRecovery;
  }

  /**
   * Perform recovery (FP-5A / FP-5B)
   *
   * Main entry point for recovery. Performs:
   * 1. Drift detection (via analyzer)
   * 2. Policy determination (via policy)
   * 3. Restoration validation when needed
   * 4. Action execution (via delegates)
   * 5. Re-verification (mandatory)
   * 6. Telemetry recording
   *
   * @param input - Drift detection input
   * @returns Complete recovery telemetry
   */
  async performRecovery(input: DriftDetectionInput): Promise<RecoveryTelemetry> {
    const startTimestamp = new Date().toISOString();
    const driftResult = this.analyzer.detectDrift(input);

    if (!driftResult.driftDetected) {
      const telemetry: RecoveryTelemetry = {
        driftDetected: false,
        reason: null,
        action: null,
        policy: null,
        result: RecoveryResultStatus.NO_RECOVERY_NEEDED,
        finalConfidence: 1.0,
        attempts: [],
        startTimestamp,
        endTimestamp: new Date().toISOString(),
        integrityStatus: this.analyzer.checkStateIntegrity(
          input.currentFocusState,
          input.currentStateConfidence
        ),
        finalStateReverified: true,
        restorationValidated: false,
        // No recovery needed - no degradation
        intendedTarget: undefined,
        verifiedLevel: "app",
        degraded: false,
      };

      this.addToHistory(telemetry);
      return telemetry;
    }

    const reason = driftResult.reason!;
    const policy = this.policy.determineRecoveryPolicy(reason);
    let integrityStatus = this.analyzer.checkStateIntegrity(
      input.currentFocusState,
      input.currentStateConfidence
    );
    let restorationValidated = false;

    const request: RecoveryActionRequest = {
      targetApp:
        input.expectedApp ||
        input.currentFocusState?.entity ||
        "unknown",
      targetRegion: input.expectedRegion,
      targetControl: input.expectedControl,
      previousState: this.previousVerifiedState || undefined,
    };

    // If surface is unsupported, abort early.
    if (!this.isRecoverySupported(request.targetApp, request.targetRegion)) {
      const telemetry = this.createAbortTelemetry(
        reason,
        RecoveryResultStatus.ABORTED_UNSAFE_RECOVERY,
        startTimestamp,
        `Recovery is not supported for application=${request.targetApp} region=${String(
          request.targetRegion || "none"
        )}`,
        integrityStatus
      );
      this.addToHistory(telemetry);
      return telemetry;
    }

    // Abort-only reasons should not attempt active recovery.
    if (this.policy.isAbortOnly(reason) || policy === RecoveryPolicy.ABORT) {
      const result =
        reason === RecoveryReason.UNVERIFIED_STATE
          ? RecoveryResultStatus.ABORTED_UNTRUSTED_STATE
          : reason === RecoveryReason.TARGET_GONE
          ? RecoveryResultStatus.ABORTED_MISSING_TARGET
          : RecoveryResultStatus.ABORTED_UNSAFE_RECOVERY;

      const telemetry = this.createAbortTelemetry(
        reason,
        result,
        startTimestamp,
        this.policy.getAbortUserMessage(reason),
        integrityStatus
      );
      this.addToHistory(telemetry);
      return telemetry;
    }

    // Restore must be explicitly validated first.
    if (policy === RecoveryPolicy.RESTORE_PREVIOUS) {
      const eligibility = this.checkRestorationEligibility(this.previousVerifiedState);
      restorationValidated = eligibility.eligible;
      integrityStatus = eligibility.integrityStatus;

      if (!eligibility.eligible) {
        const telemetry = this.createAbortTelemetry(
          reason,
          RecoveryResultStatus.ABORTED_MISSING_TARGET,
          startTimestamp,
          eligibility.reason || "Restoration not eligible",
          integrityStatus
        );
        this.addToHistory(telemetry);
        return telemetry;
      }
    }

    const action = this.policy.determineRecoveryAction(reason, policy);
    const attempt = await this.executeRecoveryAction(action, request, policy);

    const reverification = attempt.success
      ? await this.reverifyFocusState()
      : { verified: false, state: null, confidence: 0 };

    let result: RecoveryResultStatus;
    let finalConfidence = reverification.confidence;
    let userSafeMessage: string | undefined;

    if (attempt.success && reverification.verified) {
      if (policy === RecoveryPolicy.RESTORE_PREVIOUS) {
        result = RecoveryResultStatus.RECOVERED_BY_RESTORE;
        // Restored state is intentionally lower-confidence if stale.
        finalConfidence =
          integrityStatus === StateIntegrityStatus.TRUSTED ? 0.85 : 0.7;
      } else {
        result = RecoveryResultStatus.RECOVERED_BY_RETRY;
        finalConfidence = Math.max(reverification.confidence, 0.85);
      }
    } else if (attempt.success && !reverification.verified) {
      // Action claimed success, but final state could not be verified.
      result = this.policy.isRecoveryAllowed()
        ? RecoveryResultStatus.DOWNGRADED
        : RecoveryResultStatus.ABORTED_UNSAFE_RECOVERY;
      finalConfidence = 0.4;
      userSafeMessage = this.policy.getAbortUserMessageForResult(result, reason);
    } else {
      if (reason === RecoveryReason.UNVERIFIED_STATE) {
        result = RecoveryResultStatus.ABORTED_UNTRUSTED_STATE;
      } else if (reason === RecoveryReason.TARGET_GONE) {
        result = RecoveryResultStatus.ABORTED_MISSING_TARGET;
      } else {
        result = RecoveryResultStatus.ABORTED_UNSAFE_RECOVERY;
      }
      finalConfidence = 0.2;
      userSafeMessage = this.policy.getAbortUserMessageForResult(result, reason);
    }

    const telemetry: RecoveryTelemetry = {
      driftDetected: true,
      reason,
      action,
      policy,
      result,
      finalConfidence,
      attempts: [attempt],
      userSafeMessage,
      startTimestamp,
      endTimestamp: new Date().toISOString(),
      integrityStatus,
      restorationValidated,
      finalStateReverified: reverification.verified,
      // New: Track intended vs verified vs degraded
      intendedTarget: {
        app: request.targetApp,
        region: request.targetRegion ? String(request.targetRegion) : undefined,
        control: request.targetControl?.controlType,
      },
      verifiedLevel: reverification.verified
        ? (request.targetControl?.controlType
            ? "control"
            : request.targetRegion
            ? "region"
            : "app")
        : "none",
      degraded: !reverification.verified && attempt.success,
      restoreDepth: policy === RecoveryPolicy.RESTORE_PREVIOUS ? attempt.recoveryDepth : undefined,
      controlRecoveryLevel:
        action === RecoveryAction.REFOCUS_CONTROL
          ? (reverification.verified ? ControlRecoveryLevel.CONTROL_VERIFIED : ControlRecoveryLevel.NONE)
          : undefined,
    };

    this.addToHistory(telemetry);
    return telemetry;
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
      userSafeMessage: this.policy.getAbortUserMessage(reason),
      technicalDetails: `Recovery aborted due to: ${reason}`,
      reason,
      timestamp,
    };
  }

  /**
   * Create abort telemetry (FP-5B)
   */
  private createAbortTelemetry(
    reason: RecoveryReason,
    result: RecoveryResultStatus,
    startTimestamp: string,
    details: string,
    integrityStatus: StateIntegrityStatus
  ): RecoveryTelemetry {
    return {
      driftDetected: true,
      reason,
      action: RecoveryAction.ABORT,
      policy: RecoveryPolicy.ABORT,
      result,
      finalConfidence: 0.2,
      attempts: [
        {
          action: RecoveryAction.ABORT,
          policy: RecoveryPolicy.ABORT,
          success: false,
          details,
          timestamp: new Date().toISOString(),
        },
      ],
      userSafeMessage: this.policy.getAbortUserMessageForResult(result, reason),
      startTimestamp,
      endTimestamp: new Date().toISOString(),
      integrityStatus,
      restorationValidated: false,
      finalStateReverified: false,
      // Abort cases - no verification achieved
      intendedTarget: undefined,
      verifiedLevel: "none",
      degraded: true,
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

    // VS Code / Code aliases
    if (normalizedApp.includes("vscode") || normalizedApp.includes("code")) {
      if (region) {
        return region === RegionKind.EDITOR || region === RegionKind.TERMINAL;
      }
      return true;
    }

    // Chrome
    if (normalizedApp.includes("chrome") || normalizedApp.includes("browser")) {
      if (region) {
        return region === RegionKind.ADDRESS_BAR || region === RegionKind.PAGE;
      }
      return true;
    }

    // gnome-terminal (system terminal) - supports terminal region
    if (normalizedApp.includes("gnome-terminal") || normalizedApp.includes("terminal")) {
      if (region) {
        return region === RegionKind.TERMINAL;
      }
      return true;
    }

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

    if (normalizedApp.includes("vscode") || normalizedApp.includes("code")) {
      supportedRegions = [RegionKind.EDITOR, RegionKind.TERMINAL];
    } else if (normalizedApp.includes("chrome") || normalizedApp.includes("browser")) {
      supportedRegions = [RegionKind.ADDRESS_BAR, RegionKind.PAGE];
    } else if (normalizedApp.includes("gnome-terminal") || normalizedApp.includes("terminal")) {
      supportedRegions = [RegionKind.TERMINAL];
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
