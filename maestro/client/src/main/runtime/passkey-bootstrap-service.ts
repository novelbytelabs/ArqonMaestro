export interface PasskeyBootstrapSnapshot {
  requiredOnColdStart: boolean;
  providerReady: boolean;
  bootstrapped: boolean;
  lastBootstrapAt: string;
  lastMethod: "none" | "passkey" | "session_auth" | "totp_recovery";
  providerChallengeActive: boolean;
  providerChallengeId: string;
  lastProviderName: string;
  lastProviderOutcome: "none" | "verified" | "failed";
  lastProviderReasonCode: string;
  lastProviderOutcomeAt: string;
}

export interface PasskeyBootstrapServiceConfig {
  requiredOnColdStart: boolean;
  providerReady: boolean;
}

export interface PasskeyProviderVerificationOutcome {
  provider: string;
  challengeId?: string;
  verified: boolean;
  method?: "passkey" | "totp_recovery";
  reasonCode?: string;
}

const DEFAULT_CONFIG: PasskeyBootstrapServiceConfig = {
  requiredOnColdStart: process.env.ARQON_PASSKEY_BOOTSTRAP_REQUIRED === "1",
  providerReady: process.env.ARQON_PASSKEY_PROVIDER_READY === "1",
};

/**
 * Program B B2 runtime-first passkey bootstrap service.
 *
 * This freezes bootstrap state and interfaces before provider cutover.
 */
export default class PasskeyBootstrapService {
  private requiredOnColdStart: boolean;
  private providerReady: boolean;
  private bootstrapped = false;
  private lastBootstrapAtMs = 0;
  private lastMethod: "none" | "passkey" | "session_auth" | "totp_recovery" = "none";
  private providerChallengeActive = false;
  private providerChallengeId = "";
  private lastProviderName = "";
  private lastProviderOutcome: "none" | "verified" | "failed" = "none";
  private lastProviderReasonCode = "";
  private lastProviderOutcomeAtMs = 0;

  constructor(config: Partial<PasskeyBootstrapServiceConfig> = {}) {
    const merged = { ...DEFAULT_CONFIG, ...config };
    this.requiredOnColdStart = !!merged.requiredOnColdStart;
    this.providerReady = !!merged.providerReady;
  }

  isBootstrapRequired(): boolean {
    return this.requiredOnColdStart;
  }

  isBootstrapped(): boolean {
    return this.bootstrapped;
  }

  isProviderReady(): boolean {
    return this.providerReady;
  }

  setProviderReady(providerReady: boolean): void {
    this.providerReady = !!providerReady;
  }

  completePasskeyBootstrap(): void {
    this.bootstrapped = true;
    this.lastBootstrapAtMs = Date.now();
    this.lastMethod = "passkey";
  }

  completeSessionAuthBootstrap(): void {
    this.bootstrapped = true;
    this.lastBootstrapAtMs = Date.now();
    this.lastMethod = "session_auth";
  }

  applySessionAuthState(isAuthenticatedSession: boolean): void {
    if (!this.requiredOnColdStart) {
      return;
    }
    if (isAuthenticatedSession && !this.bootstrapped) {
      this.completeSessionAuthBootstrap();
    }
  }

  completeRecoveryBootstrap(): void {
    this.bootstrapped = true;
    this.lastBootstrapAtMs = Date.now();
    this.lastMethod = "totp_recovery";
  }

  resetBootstrap(): void {
    this.bootstrapped = false;
    this.lastBootstrapAtMs = 0;
    this.lastMethod = "none";
    this.providerChallengeActive = false;
    this.providerChallengeId = "";
  }

  startProviderChallenge(challengeId?: string): void {
    this.providerChallengeActive = true;
    this.providerChallengeId = String(challengeId || "").trim();
    this.lastProviderReasonCode = "";
  }

  applyProviderOutcome(outcome: PasskeyProviderVerificationOutcome): void {
    this.lastProviderName = String(outcome.provider || "").trim();
    this.lastProviderOutcome = outcome.verified ? "verified" : "failed";
    this.lastProviderReasonCode = String(outcome.reasonCode || "").trim();
    this.lastProviderOutcomeAtMs = Date.now();
    this.providerChallengeActive = false;
    this.providerChallengeId = "";
    this.providerReady = true;

    if (!outcome.verified) {
      return;
    }

    if (outcome.method === "totp_recovery") {
      this.completeRecoveryBootstrap();
      return;
    }

    this.completePasskeyBootstrap();
  }

  getSnapshot(): PasskeyBootstrapSnapshot {
    return {
      requiredOnColdStart: this.requiredOnColdStart,
      providerReady: this.providerReady,
      bootstrapped: this.bootstrapped,
      lastBootstrapAt: this.lastBootstrapAtMs > 0 ? new Date(this.lastBootstrapAtMs).toISOString() : "",
      lastMethod: this.lastMethod,
      providerChallengeActive: this.providerChallengeActive,
      providerChallengeId: this.providerChallengeId,
      lastProviderName: this.lastProviderName,
      lastProviderOutcome: this.lastProviderOutcome,
      lastProviderReasonCode: this.lastProviderReasonCode,
      lastProviderOutcomeAt:
        this.lastProviderOutcomeAtMs > 0 ? new Date(this.lastProviderOutcomeAtMs).toISOString() : "",
    };
  }
}
