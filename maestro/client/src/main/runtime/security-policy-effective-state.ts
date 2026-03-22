import { SecuritySessionSnapshot } from "./security-session-policy-service";
import { PasskeyBootstrapSnapshot } from "./passkey-bootstrap-service";

export type SecurityPolicyEffectiveMode = "pilot" | "assist" | "observe" | "locked";
export type SecurityPolicyLockReason =
  | "passkey_required"
  | "unknown_rate_guard"
  | "manual_locked"
  | "none";

export interface SecurityPolicyEffectiveState {
  mode: SecurityPolicyEffectiveMode;
  lockReason: SecurityPolicyLockReason;
  passkeyBootstrapBlocked: boolean;
}

function parseIsoMs(value?: string): number {
  if (!value) {
    return 0;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function computeSecurityPolicyEffectiveState(
  session: SecuritySessionSnapshot,
  passkey: PasskeyBootstrapSnapshot,
  nowMs = Date.now()
): SecurityPolicyEffectiveState {
  const passkeyBootstrapBlocked = !!passkey.requiredOnColdStart && !passkey.bootstrapped;
  if (passkeyBootstrapBlocked) {
    return {
      mode: "locked",
      lockReason: "passkey_required",
      passkeyBootstrapBlocked,
    };
  }

  if (session.mode === "locked") {
    const lockUntilMs = parseIsoMs(session.lockUntil);
    const manuallyLocked = session.lastReasonCode === "mode_transition_manual_locked";
    const unknownRateGuardActive = !manuallyLocked && (session.lockedUntilVerified || lockUntilMs > nowMs);
    return {
      mode: "locked",
      lockReason: unknownRateGuardActive ? "unknown_rate_guard" : "manual_locked",
      passkeyBootstrapBlocked: false,
    };
  }

  return {
    mode: session.mode,
    lockReason: "none",
    passkeyBootstrapBlocked: false,
  };
}
