/**
 * Security Mode Service
 *
 * Manages security modes (normal, secure, shared_room, restricted, privileged_confirm).
 * Part of FP-2A: Identity and Safety Gating
 *
 * This service:
 * 1. Manages current security mode state
 * 2. Handles mode transitions
 * 3. Provides mode context for authorization
 * 4. Enforces mode-specific behaviors
 */

// Use console.log - can be replaced with proper logger in production
const log = (message: string): void => console.log(message);

/**
 * Security modes
 */
export enum SecurityMode {
  /** Normal operation - default */
  NORMAL = "normal",
  /** Secure mode - stricter verification requirements */
  SECURE = "secure",
  /** Shared room - assumes multiple people may be present */
  SHARED_ROOM = "shared_room",
  /** Restricted - minimal commands only */
  RESTRICTED = "restricted",
  /** Privileged confirm - elevated after verification */
  PRIVILEGED_CONFIRM = "privileged_confirm",
}

/**
 * Mode transition event
 */
export interface ModeTransitionEvent {
  /** Previous mode */
  previousMode: SecurityMode;
  /** New mode */
  newMode: SecurityMode;
  /** Reason for transition */
  reason: string;
  /** Timestamp */
  timestamp: string;
  /** Whether transition was automatic */
  automatic: boolean;
}

/**
 * Security mode configuration
 */
export interface SecurityModeConfig {
  /** Mode-specific settings */
  [SecurityMode.NORMAL]: ModeSettings;
  /** Mode-specific settings */
  [SecurityMode.SECURE]: ModeSettings;
  /** Mode-specific settings */
  [SecurityMode.SHARED_ROOM]: ModeSettings;
  /** Mode-specific settings */
  [SecurityMode.RESTRICTED]: ModeSettings;
  /** Mode-specific settings */
  [SecurityMode.PRIVILEGED_CONFIRM]: ModeSettings;
}

/**
 * Mode-specific settings
 */
export interface ModeSettings {
  /** Require verification for medium-risk commands */
  requireVerificationForMediumRisk: boolean;
  /** Require verification for high-risk commands */
  requireVerificationForHighRisk: boolean;
  /** Require verification for privileged commands */
  requireVerificationForPrivileged: boolean;
  /** Allow Talon/fallback routes */
  allowFallbackRoutes: boolean;
  /** Require confirmation for medium-risk */
  confirmMediumRisk: boolean;
  /** Require confirmation for high-risk */
  confirmHighRisk: boolean;
  /** Block unknown speakers for high-risk */
  blockUnknownHighRisk: boolean;
  /** Require explicit address */
  requireExplicitAddress: boolean;
}

/**
 * Default mode configurations
 */
const DEFAULT_MODE_SETTINGS: SecurityModeConfig = {
  [SecurityMode.NORMAL]: {
    requireVerificationForMediumRisk: false,
    requireVerificationForHighRisk: true,
    requireVerificationForPrivileged: true,
    allowFallbackRoutes: true,
    confirmMediumRisk: false,
    confirmHighRisk: true,
    blockUnknownHighRisk: false,
    requireExplicitAddress: false,
  },
  [SecurityMode.SECURE]: {
    requireVerificationForMediumRisk: true,
    requireVerificationForHighRisk: true,
    requireVerificationForPrivileged: true,
    allowFallbackRoutes: false,
    confirmMediumRisk: true,
    confirmHighRisk: true,
    blockUnknownHighRisk: true,
    requireExplicitAddress: true,
  },
  [SecurityMode.SHARED_ROOM]: {
    requireVerificationForMediumRisk: true,
    requireVerificationForHighRisk: true,
    requireVerificationForPrivileged: true,
    allowFallbackRoutes: false,
    confirmMediumRisk: true,
    confirmHighRisk: true,
    blockUnknownHighRisk: true,
    requireExplicitAddress: true,
  },
  [SecurityMode.RESTRICTED]: {
    requireVerificationForMediumRisk: true,
    requireVerificationForHighRisk: true,
    requireVerificationForPrivileged: true,
    allowFallbackRoutes: false,
    confirmMediumRisk: true,
    confirmHighRisk: true,
    blockUnknownHighRisk: true,
    requireExplicitAddress: true,
  },
  [SecurityMode.PRIVILEGED_CONFIRM]: {
    requireVerificationForMediumRisk: false,
    requireVerificationForHighRisk: false,
    requireVerificationForPrivileged: false,
    allowFallbackRoutes: true,
    confirmMediumRisk: false,
    confirmHighRisk: false,
    blockUnknownHighRisk: false,
    requireExplicitAddress: false,
  },
};

/**
 * Service configuration
 */
export interface SecurityModeServiceConfig {
  /** Mode settings */
  modeSettings: SecurityModeConfig;
  /** Default mode on startup */
  defaultMode: SecurityMode;
  /** Auto-detect shared room (requires integration) */
  autoDetectSharedRoom: boolean;
  /** Timeout for privileged confirm mode (ms) */
  privilegedConfirmTimeoutMs: number;
  /** Maximum mode history events */
  maxHistoryEvents: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SecurityModeServiceConfig = {
  modeSettings: DEFAULT_MODE_SETTINGS,
  defaultMode: SecurityMode.NORMAL,
  autoDetectSharedRoom: false,
  privilegedConfirmTimeoutMs: 60000, // 1 minute
  maxHistoryEvents: 50,
};

/**
 * Security Mode Service
 *
 * Manages security modes for the voice operating system.
 */
export default class SecurityModeService {
  private config: SecurityModeServiceConfig;
  private currentMode: SecurityMode;
  private modeHistory: ModeTransitionEvent[];
  private privilegedConfirmTimeout?: NodeJS.Timeout;

  constructor(config: Partial<SecurityModeServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentMode = this.config.defaultMode;
    this.modeHistory = [];
    
    log(`Initialized in ${this.currentMode} mode`);
  }

  /**
   * Get current security mode
   */
  getCurrentMode(): SecurityMode {
    return this.currentMode;
  }

  /**
   * Get mode settings for current mode
   */
  getCurrentSettings(): ModeSettings {
    return this.config.modeSettings[this.currentMode];
  }

  /**
   * Get mode settings for a specific mode
   */
  getModeSettings(mode: SecurityMode): ModeSettings {
    return this.config.modeSettings[mode];
  }

  /**
   * Check if in normal mode
   */
  isNormal(): boolean {
    return this.currentMode === SecurityMode.NORMAL;
  }

  /**
   * Check if in secure mode
   */
  isSecure(): boolean {
    return this.currentMode === SecurityMode.SECURE;
  }

  /**
   * Check if in shared room mode
   */
  isSharedRoom(): boolean {
    return this.currentMode === SecurityMode.SHARED_ROOM;
  }

  /**
   * Check if in restricted mode
   */
  isRestricted(): boolean {
    return this.currentMode === SecurityMode.RESTRICTED;
  }

  /**
   * Check if in privileged confirm mode
   */
  isPrivilegedConfirm(): boolean {
    return this.currentMode === SecurityMode.PRIVILEGED_CONFIRM;
  }

  /**
   * Switch to a new security mode
   */
  async setMode(mode: SecurityMode, reason: string = "manual", automatic: boolean = false): Promise<void> {
    if (mode === this.currentMode) {
      log(`Already in ${mode} mode`);
      return;
    }

    const previousMode = this.currentMode;
    this.currentMode = mode;

    // Add to history
    this.addTransitionEvent({
      previousMode,
      newMode: mode,
      reason,
      timestamp: new Date().toISOString(),
      automatic,
    });

    // Handle privileged confirm timeout
    if (mode === SecurityMode.PRIVILEGED_CONFIRM) {
      this.startPrivilegedConfirmTimeout();
    } else if (previousMode === SecurityMode.PRIVILEGED_CONFIRM) {
      this.clearPrivilegedConfirmTimeout();
    }

    log(`Mode changed: ${previousMode} -> ${mode} (${reason})`);
  }

  /**
   * Enter secure mode
   */
  async enterSecureMode(reason: string = "manual"): Promise<void> {
    await this.setMode(SecurityMode.SECURE, reason);
  }

  /**
   * Exit secure mode
   */
  async exitSecureMode(reason: string = "manual"): Promise<void> {
    await this.setMode(SecurityMode.NORMAL, reason);
  }

  /**
   * Enter shared room mode
   */
  async enterSharedRoomMode(reason: string = "manual"): Promise<void> {
    await this.setMode(SecurityMode.SHARED_ROOM, reason);
  }

  /**
   * Exit shared room mode
   */
  async exitSharedRoomMode(reason: string = "manual"): Promise<void> {
    await this.setMode(SecurityMode.NORMAL, reason);
  }

  /**
   * Enter restricted mode
   */
  async enterRestrictedMode(reason: string = "manual"): Promise<void> {
    await this.setMode(SecurityMode.RESTRICTED, reason);
  }

  /**
   * Exit restricted mode
   */
  async exitRestrictedMode(reason: string = "manual"): Promise<void> {
    await this.setMode(SecurityMode.NORMAL, reason);
  }

  /**
   * Enter privileged confirm mode (temporary elevation after verification)
   */
  async enterPrivilegedConfirmMode(reason: string = "verified"): Promise<void> {
    await this.setMode(SecurityMode.PRIVILEGED_CONFIRM, reason);
  }

  /**
   * Exit privileged confirm mode
   */
  async exitPrivilegedConfirmMode(reason: string = "timeout"): Promise<void> {
    await this.setMode(SecurityMode.NORMAL, reason);
  }

  /**
   * Toggle secure mode
   */
  async toggleSecureMode(): Promise<void> {
    if (this.isSecure()) {
      await this.exitSecureMode("toggle");
    } else {
      await this.enterSecureMode("toggle");
    }
  }

  /**
   * Toggle shared room mode
   */
  async toggleSharedRoomMode(): Promise<void> {
    if (this.isSharedRoom()) {
      await this.exitSharedRoomMode("toggle");
    } else {
      await this.enterSharedRoomMode("toggle");
    }
  }

  /**
   * Check if fallback routes are allowed in current mode
   */
  allowFallbackRoutes(): boolean {
    return this.getCurrentSettings().allowFallbackRoutes;
  }

  /**
   * Check if verification is required for a risk level
   */
  requiresVerification(riskLevel: "low" | "medium" | "high" | "privileged"): boolean {
    const settings = this.getCurrentSettings();
    
    switch (riskLevel) {
      case "low":
        return false;
      case "medium":
        return settings.requireVerificationForMediumRisk;
      case "high":
        return settings.requireVerificationForHighRisk;
      case "privileged":
        return settings.requireVerificationForPrivileged;
      default:
        return false;
    }
  }

  /**
   * Check if confirmation is required for a risk level
   */
  requiresConfirmation(riskLevel: "low" | "medium" | "high" | "privileged"): boolean {
    const settings = this.getCurrentSettings();
    
    switch (riskLevel) {
      case "low":
        return false;
      case "medium":
        return settings.confirmMediumRisk;
      case "high":
        return settings.confirmHighRisk;
      case "privileged":
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if explicit address is required
   */
  requiresExplicitAddress(): boolean {
    return this.getCurrentSettings().requireExplicitAddress;
  }

  /**
   * Check if unknown speakers are blocked for high-risk
   */
  blockUnknownHighRisk(): boolean {
    return this.getCurrentSettings().blockUnknownHighRisk;
  }

  /**
   * Get mode history
   */
  getHistory(limit?: number): ModeTransitionEvent[] {
    if (limit && limit > 0) {
      return this.modeHistory.slice(0, limit);
    }
    return [...this.modeHistory];
  }

  /**
   * Get the most recent mode transition
   */
  getLastTransition(): ModeTransitionEvent | undefined {
    return this.modeHistory[0];
  }

  /**
   * Add transition event to history
   */
  private addTransitionEvent(event: ModeTransitionEvent): void {
    this.modeHistory.unshift(event);
    
    // Trim to max events
    if (this.modeHistory.length > this.config.maxHistoryEvents) {
      this.modeHistory = this.modeHistory.slice(0, this.config.maxHistoryEvents);
    }
  }

  /**
   * Start privileged confirm timeout
   */
  private startPrivilegedConfirmTimeout(): void {
    this.clearPrivilegedConfirmTimeout();
    
    this.privilegedConfirmTimeout = setTimeout(async () => {
      log(`Privileged confirm timeout reached, returning to normal`);
      await this.exitPrivilegedConfirmMode("timeout");
    }, this.config.privilegedConfirmTimeoutMs);
  }

  /**
   * Clear privileged confirm timeout
   */
  private clearPrivilegedConfirmTimeout(): void {
    if (this.privilegedConfirmTimeout) {
      clearTimeout(this.privilegedConfirmTimeout);
      this.privilegedConfirmTimeout = undefined;
    }
  }

  /**
   * Update mode settings
   */
  updateModeSettings(mode: SecurityMode, settings: Partial<ModeSettings>): void {
    this.config.modeSettings[mode] = {
      ...this.config.modeSettings[mode],
      ...settings,
    };
    log(`Updated settings for ${mode} mode`);
  }

  /**
   * Get mode description
   */
  getModeDescription(mode: SecurityMode): string {
    switch (mode) {
      case SecurityMode.NORMAL:
        return "Normal operation - default security posture";
      case SecurityMode.SECURE:
        return "Secure mode - stricter verification and confirmation required";
      case SecurityMode.SHARED_ROOM:
        return "Shared room - assumes multiple people may be present";
      case SecurityMode.RESTRICTED:
        return "Restricted - minimal command set only";
      case SecurityMode.PRIVILEGED_CONFIRM:
        return "Privileged confirm - temporarily elevated after verification";
      default:
        return "Unknown mode";
    }
  }

  /**
   * Get current mode description
   */
  getCurrentModeDescription(): string {
    return this.getModeDescription(this.currentMode);
  }

  /**
   * Reset to default mode
   */
  async reset(): Promise<void> {
    await this.setMode(this.config.defaultMode, "reset");
  }

  /**
   * Destroy the service
   */
  destroy(): void {
    this.clearPrivilegedConfirmTimeout();
    log(`Service destroyed`);
  }
}
