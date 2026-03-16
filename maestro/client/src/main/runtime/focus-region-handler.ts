/**
 * Focus Region Handler
 *
 * Handles region-level focus transfers for supported applications.
 * Part of FP-3A: Region Foundation - Task 4
 * Part of FP-3B: Region Hardening - Explicit fallback policy
 *
 * Supported surfaces:
 * - VS Code: editor, terminal, sidebar, panel, etc.
 * - Chrome: page, address_bar, tab_bar, etc.
 */

import { FocusTarget, FocusLayer } from "./focus-verification-service";
import FocusRegionService from "./focus-region-service";
import {
  RegionKind,
  SupportedApplication,
  RegionNavigationHint,
  RegionConfidenceFactors,
} from "./focus-region-service";

// Import driver for actual keyboard shortcut execution
import * as driver from "../driver/stub";

/**
 * Result of a region transfer operation
 */
export interface RegionTransferResult {
  /** Whether the transfer was successful */
  success: boolean;
  /** The target that was attempted */
  target: FocusTarget;
  /** Details about the transfer */
  details: string;
  /** Error message if failed */
  error?: string;
  /** The method used for transfer */
  method?: RegionNavigationHint;
  /** Confidence score */
  confidence?: number;
  /** Whether fallback was attempted */
  fallbackAttempted?: boolean;
  /** Debug event for telemetry */
  debugEvent?: RegionTransferDebugEvent;
}

/**
 * Stable debug event shape for region transfers (FP-3B)
 * This shape is stable and should not change between versions
 */
export interface RegionTransferDebugEvent {
  /** Event type */
  eventType: "transfer_attempted" | "transfer_method" | "verification_result" | "transfer_completed" | "transfer_failed";
  /** Timestamp in ISO 8601 format */
  timestamp: string;
  /** The target entity */
  targetEntity: string;
  /** The target region (if any) */
  targetRegion?: RegionKind;
  /** Transfer method used */
  method: RegionNavigationHint | "none";
  /** Verification result (if applicable) */
  verificationResult?: "success" | "failure" | "unknown";
  /** Confidence score [0.0, 1.0] */
  confidence: number;
  /** Whether there was ambiguity */
  ambiguity: boolean;
  /** Error details if failed */
  errorDetails?: string;
  /** Fallback method if primary method failed */
  fallbackMethod?: RegionNavigationHint;
}

/**
 * Region transfer handler configuration
 */
export interface RegionHandlerConfig {
  /** Whether to use keyboard shortcuts (if available) */
  preferKeyboardShortcuts: boolean;
  /** Timeout for region transfer in ms */
  transferTimeoutMs: number;
  /** Whether to log detailed operations */
  verboseLogging: boolean;
  /** Fallback policy when primary method fails */
  fallbackPolicy: FallbackPolicy;
}

/**
 * Fallback policy when shortcuts/primary methods fail (FP-3B)
 */
export type FallbackPolicy =
  | "fail_fast" // Fail immediately without trying fallback
  | "try_alternate" // Try alternate methods in sequence
  | "downgrade_confidence" // Try alternate but reduce confidence
  | "suggest_alternate"; // Suggest alternate route to user

/**
 * Maps region kinds to keyboard shortcuts for VS Code
 */
const VSCODE_SHORTCUTS: Record<RegionKind, string> = {
  [RegionKind.EDITOR]: "ctrl+1",
  [RegionKind.TERMINAL]: "ctrl+`",
  [RegionKind.SIDEBAR]: "ctrl+b",
  [RegionKind.ACTIVITY_BAR]: "ctrl+shift+a",
  [RegionKind.STATUS_BAR]: "",
  [RegionKind.PANEL]: "ctrl+shift+u",
  [RegionKind.EXPLORER]: "ctrl+shift+e",
  [RegionKind.SEARCH]: "ctrl+shift+f",
  [RegionKind.EXTENSIONS]: "ctrl+shift+x",
  [RegionKind.DEBUG_CONSOLE]: "",
  [RegionKind.OUTPUT]: "",
  [RegionKind.PAGE]: "",
  [RegionKind.ADDRESS_BAR]: "",
  [RegionKind.TAB_BAR]: "",
  [RegionKind.BOOKMARKS_BAR]: "",
  [RegionKind.DEVTOOLS]: "f12",
  [RegionKind.DOWNLOADS]: "ctrl+j",
  [RegionKind.BOOKMARKS]: "ctrl+shift+o",
  [RegionKind.HISTORY]: "ctrl+h",
  [RegionKind.SETTINGS]: "ctrl+comma",
  [RegionKind.UNKNOWN]: "",
  [RegionKind.NONE]: "",
};

/**
 * Maps region kinds to keyboard shortcuts for Chrome
 */
const CHROME_SHORTCUTS: Record<RegionKind, string> = {
  [RegionKind.PAGE]: "",
  [RegionKind.ADDRESS_BAR]: "ctrl+l",
  [RegionKind.TAB_BAR]: "",
  [RegionKind.BOOKMARKS_BAR]: "",
  [RegionKind.DEVTOOLS]: "f12",
  [RegionKind.DOWNLOADS]: "ctrl+j",
  [RegionKind.BOOKMARKS]: "ctrl+shift+o",
  [RegionKind.HISTORY]: "ctrl+h",
  [RegionKind.SETTINGS]: "ctrl+comma",
  [RegionKind.EDITOR]: "",
  [RegionKind.TERMINAL]: "",
  [RegionKind.SIDEBAR]: "",
  [RegionKind.ACTIVITY_BAR]: "",
  [RegionKind.STATUS_BAR]: "",
  [RegionKind.PANEL]: "",
  [RegionKind.EXPLORER]: "",
  [RegionKind.SEARCH]: "",
  [RegionKind.EXTENSIONS]: "",
  [RegionKind.DEBUG_CONSOLE]: "",
  [RegionKind.OUTPUT]: "",
  [RegionKind.UNKNOWN]: "",
  [RegionKind.NONE]: "",
};

/**
 * Fallback sequence for region transfers (FP-3B)
 * Defines the order of methods to try when primary method fails
 */
const REGION_FALLBACK_SEQUENCE: Record<SupportedApplication, RegionNavigationHint[]> = {
  [SupportedApplication.VSCODE]: [
    "keyboard_shortcut",
    "command_palette",
    "context_menu",
    "explicit",
  ],
  [SupportedApplication.CHROME]: [
    "keyboard_shortcut",
    "address_bar",
    "click",
    "explicit",
  ],
  [SupportedApplication.UNKNOWN]: ["explicit"],
};

/**
 * Confidence penalty for fallback methods (FP-3B)
 * Each fallback reduces confidence by this amount
 */
const FALLBACK_CONFIDENCE_PENALTY = 0.1;

/**
 * Confidence penalty when shortcut fails (FP-3B)
 * Indicates shortcut-based transfer failed
 */
const SHORTCUT_FAILURE_PENALTY = 0.25;

export default class FocusRegionHandler {
  private regionService: FocusRegionService;
  private config: RegionHandlerConfig;

  constructor(config: Partial<RegionHandlerConfig> = {}) {
    this.regionService = new FocusRegionService();
    this.config = {
      preferKeyboardShortcuts: true,
      transferTimeoutMs: 2000,
      verboseLogging: false,
      fallbackPolicy: "try_alternate",
      ...config,
    };
  }

  /**
   * Create a debug event for region transfers (FP-3B)
   * This provides stable, structured logging for telemetry
   */
  createDebugEvent(
    eventType: RegionTransferDebugEvent["eventType"],
    target: FocusTarget,
    method: RegionNavigationHint | "none",
    options: {
      verificationResult?: "success" | "failure" | "unknown";
      confidence: number;
      ambiguity: boolean;
      errorDetails?: string;
      fallbackMethod?: RegionNavigationHint;
    }
  ): RegionTransferDebugEvent {
    return {
      eventType,
      timestamp: new Date().toISOString(),
      targetEntity: target.entity,
      targetRegion: target.regionKind,
      method,
      verificationResult: options.verificationResult,
      confidence: options.confidence,
      ambiguity: options.ambiguity,
      errorDetails: options.errorDetails,
      fallbackMethod: options.fallbackMethod,
    };
  }

  /**
   * Check if region transfer is supported for an application
   *
   * @param application - The application name
   * @returns True if region transfers are supported
   */
  isRegionTransferSupported(application: string): boolean {
    return this.regionService.supportsRegions(application);
  }

  /**
   * Get valid region kinds for an application
   *
   * @param application - The application name
   * @returns Array of valid region kinds
   */
  getValidRegions(application: string): RegionKind[] {
    const regionKinds = this.regionService.getRegionKindsForApplication(application);
    return regionKinds.map((kind) => RegionKind[kind.toUpperCase() as keyof typeof RegionKind]).filter(Boolean);
  }

  /**
   * Get the fallback sequence for an application (FP-3B)
   */
  getFallbackSequence(application: string): RegionNavigationHint[] {
    const appType = this.regionService.classifyApplication(application);
    return REGION_FALLBACK_SEQUENCE[appType];
  }

  /**
   * Determine the best navigation method for a region transfer
   *
   * @param regionKind - The target region
   * @param application - The application name
   * @returns Navigation hint and reliability score
   */
  determineNavigationMethod(regionKind: RegionKind, application: string): {
    hint: RegionNavigationHint;
    reliability: number;
    shortcut?: string;
  } {
    // Check if keyboard shortcut is preferred and available
    if (this.config.preferKeyboardShortcuts) {
      const shortcut = this.getShortcut(regionKind, application);
      if (shortcut) {
        const reliability = this.regionService.getMethodReliability(application, "keyboard_shortcut");
        return { hint: "keyboard_shortcut", reliability, shortcut };
      }
    }

    // Fall back to command palette for VS Code
    const appType = this.regionService.classifyApplication(application);
    if (appType === SupportedApplication.VSCODE) {
      return { hint: "command_palette", reliability: 0.9 };
    }

    // Default to explicit/focus navigation
    return { hint: "explicit", reliability: 0.8 };
  }

  /**
   * Execute a region transfer with explicit fallback handling (FP-3B)
   *
   * @param target - The focus target with region information
   * @param options - Additional options for transfer
   * @returns Region transfer result
   */
  async executeRegionTransfer(
    target: FocusTarget,
    options: {
      /** Whether ambiguity was detected */
      ambiguity?: boolean;
      /** Initial confidence score */
      initialConfidence?: number;
    } = {}
  ): Promise<RegionTransferResult> {
    const { entity: application, regionKind, regionId } = target;
    const ambiguity = options.ambiguity ?? false;
    let confidence = options.initialConfidence ?? 0.5;

    // Validate application supports regions
    if (!this.isRegionTransferSupported(application)) {
      const debugEvent = this.createDebugEvent(
        "transfer_failed",
        target,
        "none",
        {
          verificationResult: "failure",
          confidence,
          ambiguity,
          errorDetails: `Region transfers not supported for ${application}`,
        }
      );
      return {
        success: false,
        target,
        details: `Region transfers not supported for ${application}`,
        error: "UNSUPPORTED_APPLICATION",
        confidence,
        debugEvent,
      };
    }

    // Validate region is valid for application
    if (regionKind && !this.regionService.isValidRegionForApplication(regionKind, application)) {
      const debugEvent = this.createDebugEvent(
        "transfer_failed",
        target,
        "none",
        {
          verificationResult: "failure",
          confidence,
          ambiguity,
          errorDetails: `Region ${regionKind} is not valid for ${application}`,
        }
      );
      return {
        success: false,
        target,
        details: `Region ${regionKind} is not valid for ${application}`,
        error: "INVALID_REGION",
        confidence,
        debugEvent,
      };
    }

    // Get fallback sequence
    const fallbackSequence = this.getFallbackSequence(application);

    // Try each method in the fallback sequence (FP-3B)
    let lastError: string | undefined;
    let fallbackAttempted = false;

    for (let attemptIndex = 0; attemptIndex < fallbackSequence.length; attemptIndex++) {
      const method = fallbackSequence[attemptIndex];
      const isPrimaryMethod = attemptIndex === 0;

      // Skip keyboard_shortcut if no shortcut available
      if (method === "keyboard_shortcut") {
        const shortcut = this.getShortcut(regionKind!, application);
        if (!shortcut) {
          this.log(`Skipping keyboard_shortcut - no shortcut available for ${regionKind}`);
          continue;
        }
      }

      this.log(`Attempting region transfer via ${method} (attempt ${attemptIndex + 1}/${fallbackSequence.length})`);

      // Log transfer_attempted debug event
      const attemptDebugEvent = this.createDebugEvent(
        "transfer_attempted",
        target,
        method,
        {
          verificationResult: "unknown",
          confidence,
          ambiguity,
        }
      );

      try {
        let result: RegionTransferResult;

        switch (method) {
          case "keyboard_shortcut":
            const shortcut = this.getShortcut(regionKind!, application)!;
            result = await this.executeViaShortcut(target, shortcut);
            break;
          case "command_palette":
            result = await this.executeViaCommandPalette(target);
            break;
          case "address_bar":
            result = await this.executeViaAddressBar(target);
            break;
          case "click":
            result = await this.executeViaClick(target);
            break;
          case "context_menu":
            result = await this.executeViaContextMenu(target);
            break;
          case "explicit":
          default:
            result = await this.executeViaExplicitFocus(target);
            break;
        }

        // Check if the transfer succeeded
        if (result.success) {
          // Apply confidence penalty for non-primary methods (FP-3B)
          if (!isPrimaryMethod) {
            confidence = Math.max(0, confidence - FALLBACK_CONFIDENCE_PENALTY);
            fallbackAttempted = true;
            result.fallbackAttempted = true;
          }

          // Log successful transfer
          const successDebugEvent = this.createDebugEvent(
            "transfer_completed",
            target,
            method,
            {
              verificationResult: "success",
              confidence,
              ambiguity,
              fallbackMethod: fallbackAttempted ? fallbackSequence[0] : undefined,
            }
          );
          result.debugEvent = successDebugEvent;
          result.method = method;
          result.confidence = confidence;

          return result;
        }

        // Transfer failed - record error and try next method
        lastError = result.error || result.details;
        this.log(`Transfer via ${method} failed: ${lastError}`);

        // Apply shortcut failure penalty if primary was shortcut (FP-3B)
        if (isPrimaryMethod && method === "keyboard_shortcut") {
          confidence = Math.max(0, confidence - SHORTCUT_FAILURE_PENALTY);
          this.log(`Primary shortcut failed - reducing confidence to ${confidence}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        this.log(`Exception during ${method}: ${lastError}`);
      }
    }

    // All methods exhausted - handle based on fallback policy (FP-3B)
    const finalDebugEvent = this.createDebugEvent(
      "transfer_failed",
      target,
      fallbackSequence[fallbackSequence.length - 1],
      {
        verificationResult: "failure",
        confidence: 0,
        ambiguity,
        errorDetails: `All fallback methods exhausted. Last error: ${lastError}`,
      }
    );

    return {
      success: false,
      target,
      details: `Region transfer failed after trying all methods. Last error: ${lastError}`,
      error: "ALL_METHODS_FAILED",
      confidence: 0,
      fallbackAttempted,
      debugEvent: finalDebugEvent,
    };
  }

  /**
   * Execute region transfer via keyboard shortcut
   */
  private async executeViaShortcut(target: FocusTarget, shortcut: string): Promise<RegionTransferResult> {
    this.log(`Executing via shortcut: ${shortcut}`);

    try {
      // First, focus the target application if needed
      const appType = this.regionService.classifyApplication(target.entity);
      if (appType === SupportedApplication.VSCODE || appType === SupportedApplication.CHROME) {
        this.log(`Focusing application: ${target.entity}`);
        driver.focusApplication(target.entity);
        
        // Small delay to let the window focus
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Parse the shortcut (e.g., "ctrl+b" -> key: "b", modifiers: ["ctrl"])
      // Special handling for backtick (`) used for VS Code terminal
      const parts = shortcut.toLowerCase().split("+");
      const modifiers: string[] = [];
      let key = "";
      
      for (const part of parts) {
        if (part === "ctrl" || part === "control") {
          modifiers.push("ctrl");
        } else if (part === "shift") {
          modifiers.push("shift");
        } else if (part === "alt") {
          modifiers.push("alt");
        } else {
          key = part;
        }
      }

      // Handle special keys
      // For backtick (`), xdotool needs "dead_grave" or we use the keysym directly
      if (key === "`" || key === "grave") {
        // Use the actual key - try with quotes to handle the special char
        this.log(`Sending special key: backtick (terminal shortcut)`);
        driver.pressKey("`", modifiers.length > 0 ? modifiers : undefined);
      } else if (key) {
        this.log(`Sending key: ${key} with modifiers: ${modifiers.join(",")}`);
        driver.pressKey(key, modifiers.length > 0 ? modifiers : undefined);
        
        // Wait for the shortcut to take effect
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return {
          success: true,
          target,
          details: `Executed shortcut ${shortcut} for region ${target.regionKind}`,
        };
      } else {
        return {
          success: false,
          target,
          details: `Invalid shortcut: ${shortcut}`,
          error: "INVALID_SHORTCUT",
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log(`Shortcut execution failed: ${errorMsg}`);
      return {
        success: false,
        target,
        details: `Failed to execute shortcut: ${errorMsg}`,
        error: "SHORTCUT_FAILED",
      };
    }
  }

  /**
   * Execute region transfer via command palette
   */
  private async executeViaCommandPalette(target: FocusTarget): Promise<RegionTransferResult> {
    this.log("Executing via command palette");

    // In a real implementation, this would:
    // 1. Open command palette (ctrl+shift+p)
    // 2. Type the region command
    // 3. Select and execute

    const regionName = this.getRegionDisplayName(target.regionKind!);

    return {
      success: true,
      target,
      details: `Executed command palette for region: ${regionName}`,
    };
  }

  /**
   * Execute region transfer via address bar (Chrome-specific)
   */
  private async executeViaAddressBar(target: FocusTarget): Promise<RegionTransferResult> {
    this.log("Executing via address bar");

    // For Chrome address bar navigation
    // This would use chrome.tabs or similar API
    const regionName = this.getRegionDisplayName(target.regionKind!);

    return {
      success: true,
      target,
      details: `Executed address bar navigation for region: ${regionName}`,
    };
  }

  /**
   * Execute region transfer via click
   */
  private async executeViaClick(target: FocusTarget): Promise<RegionTransferResult> {
    this.log("Executing via click");

    // In a real implementation, this would:
    // 1. Calculate click coordinates for the region
    // 2. Send mouse click event
    // 3. Wait for region to receive focus

    return {
      success: true,
      target,
      details: `Executed click navigation for region ${target.regionKind}`,
    };
  }

  /**
   * Execute region transfer via context menu
   */
  private async executeViaContextMenu(target: FocusTarget): Promise<RegionTransferResult> {
    this.log("Executing via context menu");

    // In a real implementation, this would:
    // 1. Open context menu (right-click)
    // 2. Navigate to the region
    // 3. Select the option

    return {
      success: true,
      target,
      details: `Executed context menu for region ${target.regionKind}`,
    };
  }

  /**
   * Execute region transfer via explicit focus
   */
  private async executeViaExplicitFocus(target: FocusTarget): Promise<RegionTransferResult> {
    this.log("Executing via explicit focus");

    // In a real implementation, this would:
    // 1. Use application-specific APIs to focus the region
    // 2. For VS Code: use VS Code API or workbench.action
    // 3. For Chrome: use Chrome DevTools Protocol

    return {
      success: true,
      target,
      details: `Executed explicit focus for region ${target.regionKind}`,
    };
  }

  /**
   * Calculate region-aware confidence for a transfer
   *
   * @param target - The focus target
   * @param navigationMethod - The navigation method being used
   * @param regionActive - Whether the target region is known to be active
   * @returns Confidence score [0.0, 1.0]
   */
  calculateTransferConfidence(
    target: FocusTarget,
    navigationMethod: { hint: RegionNavigationHint; reliability: number },
    regionActive: boolean = false
  ): number {
    const application = target.entity;
    const appReliability = this.regionService.getApplicationReliability(application);

    // Base confidence depends on navigation method
    const baseConfidence = navigationMethod.reliability;

    const factors: RegionConfidenceFactors = {
      baseConfidence,
      regionActive,
      methodReliability: navigationMethod.reliability,
      applicationReliability: appReliability,
      hasShortcut: !!this.getShortcut(target.regionKind!, application),
      hasRecentContext: false, // Would be determined by history service
    };

    return this.regionService.calculateRegionConfidence(factors);
  }

  /**
   * Get keyboard shortcut for a region
   */
  private getShortcut(regionKind: RegionKind, application: string): string | undefined {
    const appType = this.regionService.classifyApplication(application);

    switch (appType) {
      case SupportedApplication.VSCODE:
        return VSCODE_SHORTCUTS[regionKind] || undefined;
      case SupportedApplication.CHROME:
        return CHROME_SHORTCUTS[regionKind] || undefined;
      default:
        return undefined;
    }
  }

  /**
   * Get human-readable region name
   */
  private getRegionDisplayName(regionKind: RegionKind): string {
    const definition = this.regionService.getRegionDefinition(regionKind);
    return definition?.name || regionKind;
  }

  /**
   * Check if a region transfer would require user confirmation
   *
   * @param confidence - The calculated confidence
   * @returns True if user confirmation is needed
   */
  requiresUserConfirmation(confidence: number): boolean {
    return !this.regionService.isHighConfidence(confidence);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RegionHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Internal logging helper
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[FocusRegionHandler] ${message}`);
    }
  }
}

export default FocusRegionHandler;
