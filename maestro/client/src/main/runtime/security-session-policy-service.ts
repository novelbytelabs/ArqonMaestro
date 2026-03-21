export type SecurityPolicyMode = "pilot" | "assist" | "observe" | "locked";

export type SecurityTrustState = "verified" | "unknown" | "contaminated" | "provider_degraded";

export type SecurityInteractionPhase = "heard" | "activated" | "executed";
export type SecurityLifecyclePhase =
  | SecurityInteractionPhase
  | "pause_to_listening"
  | "trust_state_change"
  | "context_jump";

export interface SecuritySessionSnapshot {
  mode: SecurityPolicyMode;
  previousVerifiedMode: SecurityPolicyMode;
  requiresReauthNext: boolean;
  requiresReauthAfterInteractionId: number;
  graceValid: boolean;
  graceExpiresAt: string;
  lockUntil: string;
  lockedUntilVerified: boolean;
  lastReasonCode: string;
  lastTrustState: SecurityTrustState;
  lastLifecyclePhase: SecurityLifecyclePhase;
  lastInteractionId: number;
}

export interface SecuritySessionAuthContext {
  interactionId: number;
  trustState: SecurityTrustState;
  mode: SecurityPolicyMode;
  requiresReauth: boolean;
  graceValid: boolean;
  graceExpiresAt: string;
  reasonCode: string;
}

interface ActivationEvent {
  interactionId: number;
  trustState: SecurityTrustState;
}

interface VerificationEvent {
  trustState: SecurityTrustState;
}

export interface SecuritySessionPersistenceState {
  mode: SecurityPolicyMode;
  previousVerifiedMode: SecurityPolicyMode;
  requiresReauthAfterInteractionId: number;
  graceExpiresAt: string;
  lockUntil: string;
  lockedUntilVerified: boolean;
  lastReasonCode: string;
  lastTrustState: SecurityTrustState;
  lastLifecyclePhase: SecurityLifecyclePhase;
  lastInteractionId: number;
}

const MEDIUM_RISK_GRACE_MS = 9000;
const UNKNOWN_RATE_WINDOW_SHORT_MS = 10_000;
const UNKNOWN_RATE_WINDOW_LONG_MS = 60_000;
const UNKNOWN_RATE_SHORT_THRESHOLD = 3;
const UNKNOWN_RATE_LONG_THRESHOLD = 5;
const UNKNOWN_RATE_LOCK_MS = 30_000;

export default class SecuritySessionPolicyService {
  private mode: SecurityPolicyMode = "pilot";
  private previousVerifiedMode: SecurityPolicyMode = "pilot";
  private requiresReauthAfterInteractionId = 0;
  private graceExpiresAtMs = 0;
  private lastReasonCode = "ingress_heard_no_transition";
  private lastTrustState: SecurityTrustState = "unknown";
  private lastLifecyclePhase: SecurityLifecyclePhase = "heard";
  private lastInteractionId = 0;
  private unknownActivationMs: number[] = [];
  private lockUntilMs = 0;
  private lockedUntilVerified = false;

  getSnapshot(nowMs = Date.now()): SecuritySessionSnapshot {
    return {
      mode: this.getEffectiveMode(nowMs),
      previousVerifiedMode: this.previousVerifiedMode,
      requiresReauthNext: this.requiresReauthAfterInteractionId > 0,
      requiresReauthAfterInteractionId: this.requiresReauthAfterInteractionId,
      graceValid: this.isGraceValid(nowMs),
      graceExpiresAt: this.graceExpiresAtMs > 0 ? new Date(this.graceExpiresAtMs).toISOString() : "",
      lockUntil: this.lockUntilMs > 0 ? new Date(this.lockUntilMs).toISOString() : "",
      lockedUntilVerified: this.lockedUntilVerified,
      lastReasonCode: this.lastReasonCode,
      lastTrustState: this.lastTrustState,
      lastLifecyclePhase: this.lastLifecyclePhase,
      lastInteractionId: this.lastInteractionId,
    };
  }

  exportState(nowMs = Date.now()): SecuritySessionPersistenceState {
    const snapshot = this.getSnapshot(nowMs);
    return {
      mode: snapshot.mode,
      previousVerifiedMode: snapshot.previousVerifiedMode,
      requiresReauthAfterInteractionId: snapshot.requiresReauthAfterInteractionId,
      graceExpiresAt: snapshot.graceExpiresAt,
      lockUntil: snapshot.lockUntil,
      lockedUntilVerified: snapshot.lockedUntilVerified,
      lastReasonCode: snapshot.lastReasonCode,
      lastTrustState: snapshot.lastTrustState,
      lastLifecyclePhase: snapshot.lastLifecyclePhase,
      lastInteractionId: snapshot.lastInteractionId,
    };
  }

  restoreState(state?: Partial<SecuritySessionPersistenceState> | null): void {
    if (!state) {
      return;
    }
    const validMode = this.asMode(state.mode);
    const validPrevious = this.asMode(state.previousVerifiedMode);
    const validTrust = this.asTrustState(state.lastTrustState);
    if (validMode) {
      this.mode = validMode;
    }
    if (validPrevious) {
      this.previousVerifiedMode = validPrevious;
    }
    if (typeof state.requiresReauthAfterInteractionId === "number") {
      this.requiresReauthAfterInteractionId = Math.max(
        0,
        Math.floor(state.requiresReauthAfterInteractionId)
      );
    }
    this.graceExpiresAtMs = this.parseIsoMs(state.graceExpiresAt);
    this.lockUntilMs = this.parseIsoMs(state.lockUntil);
    if (typeof state.lockedUntilVerified === "boolean") {
      this.lockedUntilVerified = state.lockedUntilVerified;
    }
    if (typeof state.lastReasonCode === "string" && state.lastReasonCode.trim()) {
      this.lastReasonCode = state.lastReasonCode.trim();
    }
    if (validTrust) {
      this.lastTrustState = validTrust;
    }
    if (this.asLifecyclePhase(state.lastLifecyclePhase)) {
      this.lastLifecyclePhase = state.lastLifecyclePhase;
    }
    if (typeof state.lastInteractionId === "number") {
      this.lastInteractionId = Math.max(0, Math.floor(state.lastInteractionId));
    }
  }

  setMode(mode: SecurityPolicyMode): void {
    const effective = this.getEffectiveMode();
    if (effective === mode) {
      this.lastReasonCode = "mode_transition_noop_already_in_mode";
      return;
    }
    if (mode === "locked") {
      this.mode = "locked";
      this.lockedUntilVerified = false;
      this.lockUntilMs = 0;
      this.lastReasonCode = "mode_transition_manual_locked";
      return;
    }
    this.mode = mode;
    this.lockUntilMs = 0;
    this.lockedUntilVerified = false;
    if (mode === "pilot" || mode === "assist") {
      this.previousVerifiedMode = mode;
    }
  }

  getAuthContext(interactionId: number, nowMs = Date.now()): SecuritySessionAuthContext {
    return {
      interactionId,
      trustState: this.lastTrustState,
      mode: this.getEffectiveMode(nowMs),
      requiresReauth: interactionId > this.requiresReauthAfterInteractionId,
      graceValid: this.isGraceValid(nowMs),
      graceExpiresAt: this.graceExpiresAtMs > 0 ? new Date(this.graceExpiresAtMs).toISOString() : "",
      reasonCode: this.lastReasonCode,
    };
  }

  onHeard(): void {
    this.lastReasonCode = "ingress_heard_no_transition";
    this.lastLifecyclePhase = "heard";
  }

  onActivated(event: ActivationEvent): void {
    const nowMs = Date.now();
    this.lastTrustState = event.trustState;
    this.lastLifecyclePhase = "activated";
    this.lastInteractionId = event.interactionId;

    this.invalidateGrace("grace_invalidated_activation");
    this.requiresReauthAfterInteractionId = Math.max(
      this.requiresReauthAfterInteractionId,
      event.interactionId
    );

    if (event.trustState === "unknown") {
      this.recordUnknownActivation(nowMs);
      if (this.getEffectiveMode(nowMs) === "pilot") {
        this.previousVerifiedMode = "pilot";
        this.mode = "assist";
        this.lastReasonCode = "mode_transition_pilot_to_assist_unknown_activation";
      }
      this.applyUnknownRateGuard(nowMs);
      if (this.lastReasonCode === "grace_invalidated_activation") {
        this.lastReasonCode = "activation_detected_unknown";
      }
      return;
    }

    if (event.trustState === "contaminated") {
      this.lastReasonCode = "activation_detected_contaminated";
      return;
    }

    if (event.trustState === "provider_degraded") {
      this.lastReasonCode = "activation_detected_provider_degraded";
      return;
    }

    this.lastReasonCode = "activation_detected_verified";
  }

  onExecuted(): void {
    this.lastReasonCode = "execute_succeeded";
    this.lastLifecyclePhase = "executed";
  }

  onPauseToListeningBoundary(): void {
    this.invalidateGrace("grace_invalidated_pause_to_listen");
    this.requiresReauthAfterInteractionId = Number.MAX_SAFE_INTEGER;
    this.lastLifecyclePhase = "pause_to_listening";
  }

  onContextJump(): void {
    this.invalidateGrace("grace_invalidated_context_jump");
    this.lastLifecyclePhase = "context_jump";
  }

  onVerificationEvent(event: VerificationEvent): void {
    this.lastTrustState = event.trustState;
    if (event.trustState !== "verified") {
      return;
    }

    this.lockedUntilVerified = false;
    this.lockUntilMs = 0;

    if (this.mode === "assist" && this.previousVerifiedMode === "pilot") {
      this.mode = "pilot";
      this.lastReasonCode = "mode_transition_restore_verified_event";
    } else {
      this.lastReasonCode = "auth_success_verified_primary";
    }

    // Verified evidence refreshes medium-risk assist grace.
    if (this.getEffectiveMode() === "assist") {
      this.graceExpiresAtMs = Date.now() + MEDIUM_RISK_GRACE_MS;
      this.lastReasonCode = "grace_created_medium_assist";
    }

    this.requiresReauthAfterInteractionId = 0;
    this.unknownActivationMs = [];
  }

  onTrustStateChange(previous: SecurityTrustState, current: SecurityTrustState): void {
    if (previous === current) {
      return;
    }
    this.lastTrustState = current;
    this.invalidateGrace("grace_invalidated_speaker_change");
    this.lastLifecyclePhase = "trust_state_change";
  }

  onContaminationDetected(): void {
    this.lastTrustState = "contaminated";
    this.invalidateGrace("grace_invalidated_contamination");
  }

  onProviderDegraded(): void {
    this.lastTrustState = "provider_degraded";
    this.invalidateGrace("grace_invalidated_provider_degraded");
  }

  clearBoundaryReauthRequirement(): void {
    if (this.requiresReauthAfterInteractionId === Number.MAX_SAFE_INTEGER) {
      this.requiresReauthAfterInteractionId = 0;
    }
  }

  private isGraceValid(nowMs: number): boolean {
    if (this.graceExpiresAtMs <= 0) {
      return false;
    }
    if (nowMs <= this.graceExpiresAtMs) {
      return true;
    }
    this.graceExpiresAtMs = 0;
    this.lastReasonCode = "grace_expired_timeout";
    return false;
  }

  private invalidateGrace(reasonCode: string): void {
    this.graceExpiresAtMs = 0;
    this.lastReasonCode = reasonCode;
  }

  private recordUnknownActivation(nowMs: number): void {
    this.unknownActivationMs.push(nowMs);
    const maxWindow = Math.max(UNKNOWN_RATE_WINDOW_SHORT_MS, UNKNOWN_RATE_WINDOW_LONG_MS);
    this.unknownActivationMs = this.unknownActivationMs.filter((eventMs) => nowMs - eventMs <= maxWindow);
  }

  private applyUnknownRateGuard(nowMs: number): void {
    const shortCount = this.unknownActivationMs.filter(
      (eventMs) => nowMs - eventMs <= UNKNOWN_RATE_WINDOW_SHORT_MS
    ).length;
    const longCount = this.unknownActivationMs.filter(
      (eventMs) => nowMs - eventMs <= UNKNOWN_RATE_WINDOW_LONG_MS
    ).length;

    if (longCount >= UNKNOWN_RATE_LONG_THRESHOLD) {
      this.previousVerifiedMode = this.mode === "locked" ? this.previousVerifiedMode : this.mode;
      this.mode = "locked";
      this.lockedUntilVerified = true;
      this.lockUntilMs = 0;
      this.lastReasonCode = "mode_transition_assist_to_locked_unknown_rate_limit";
      return;
    }

    if (shortCount >= UNKNOWN_RATE_SHORT_THRESHOLD) {
      this.previousVerifiedMode = this.mode === "locked" ? this.previousVerifiedMode : this.mode;
      this.mode = "locked";
      this.lockedUntilVerified = false;
      this.lockUntilMs = nowMs + UNKNOWN_RATE_LOCK_MS;
      this.lastReasonCode = "mode_transition_assist_to_locked_unknown_rate_limit";
    }
  }

  private getEffectiveMode(nowMs = Date.now()): SecurityPolicyMode {
    if (this.mode !== "locked") {
      return this.mode;
    }

    if (this.lockedUntilVerified) {
      return "locked";
    }

    if (this.lockUntilMs > nowMs) {
      return "locked";
    }

    this.lockUntilMs = 0;
    this.mode = "assist";
    return this.mode;
  }

  private asMode(mode: unknown): SecurityPolicyMode | undefined {
    if (mode === "pilot" || mode === "assist" || mode === "observe" || mode === "locked") {
      return mode;
    }
    return undefined;
  }

  private asTrustState(trustState: unknown): SecurityTrustState | undefined {
    if (
      trustState === "verified" ||
      trustState === "unknown" ||
      trustState === "contaminated" ||
      trustState === "provider_degraded"
    ) {
      return trustState;
    }
    return undefined;
  }

  private asLifecyclePhase(phase: unknown): phase is SecurityLifecyclePhase {
    return (
      phase === "heard" ||
      phase === "activated" ||
      phase === "executed" ||
      phase === "pause_to_listening" ||
      phase === "trust_state_change" ||
      phase === "context_jump"
    );
  }

  private parseIsoMs(value: unknown): number {
    if (typeof value !== "string" || !value.trim()) {
      return 0;
    }
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }
}
