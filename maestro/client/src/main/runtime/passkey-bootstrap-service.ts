export interface PasskeyBootstrapSnapshot {
  requiredOnColdStart: boolean;
  providerReady: boolean;
  bootstrapped: boolean;
  lastBootstrapAt: string;
  lastMethod: "none" | "passkey" | "totp_recovery";
}

export interface PasskeyBootstrapServiceConfig {
  requiredOnColdStart: boolean;
  providerReady: boolean;
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
  private lastMethod: "none" | "passkey" | "totp_recovery" = "none";

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

  completePasskeyBootstrap(): void {
    this.bootstrapped = true;
    this.lastBootstrapAtMs = Date.now();
    this.lastMethod = "passkey";
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
  }

  getSnapshot(): PasskeyBootstrapSnapshot {
    return {
      requiredOnColdStart: this.requiredOnColdStart,
      providerReady: this.providerReady,
      bootstrapped: this.bootstrapped,
      lastBootstrapAt: this.lastBootstrapAtMs > 0 ? new Date(this.lastBootstrapAtMs).toISOString() : "",
      lastMethod: this.lastMethod,
    };
  }
}
