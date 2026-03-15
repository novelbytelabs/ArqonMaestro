/**
 * Focus Ambiguity Policy - Terminal Resolution
 *
 * Implements FP-3A.7: Ambiguity policy for "terminal"
 * Implements FP-3B: Hardened terminal ambiguity with fallback handling
 *
 * The word "terminal" is inherently ambiguous and can refer to:
 * 1. VS Code integrated terminal (region within VS Code)
 * 2. Standalone terminal applications (gnome-terminal, konsole, iTerm2, Windows Terminal)
 * 3. System console/terminal
 *
 * This service provides policies to resolve this ambiguity based on context.
 */

import { FocusTarget, FocusLayer } from "./focus-verification-service";
import { RegionKind, SupportedApplication } from "./focus-region-service";

/**
 * Ambiguity types for focus targets
 */
export type AmbiguityType =
  | "terminal" // "terminal" could be VS Code terminal or standalone app
  | "editor" // Could be VS Code editor or other editors
  | "browser" // Could be Chrome, Firefox, etc.
  | "none"; // No ambiguity

/**
 * Resolution strategy for ambiguous commands
 */
export type ResolutionStrategy =
  | "context_based" // Use current context to determine
  | "prefer_integrated" // Prefer integrated (e.g., VS Code terminal)
  | "prefer_standalone" // Prefer standalone application
  | "prefer_recent" // Prefer recently used
  | "prompt_user" // Ask user to disambiguate
  | "last_used"; // Use the one that was last used

/**
 * Fallback action when primary resolution fails (FP-3B)
 */
export type FallbackAction =
  | "fail_fast" // Fail immediately without trying fallback
  | "try_standalone" // If integrated fails, try standalone
  | "try_integrated" // If standalone fails, try integrated
  | "suggest_alternate"; // Suggest alternate to user

/**
 * Possible resolution for an ambiguous command
 */
export interface AmbiguityResolution {
  /** The resolved target */
  target: FocusTarget;
  /** Human-readable description of the resolution */
  description: string;
  /** Confidence in this resolution [0.0, 1.0] */
  confidence: number;
  /** Reason for this resolution */
  reason: string;
  /** Whether this resolution was verified (FP-3B) */
  verified: boolean;
  /** Verification method if verified */
  verificationMethod?: "heuristic" | "verified";
}

/**
 * Ambiguity analysis result
 */
export interface AmbiguityAnalysis {
  /** Whether the command is ambiguous */
  isAmbiguous: boolean;
  /** The type of ambiguity */
  ambiguityType: AmbiguityType;
  /** Original command that was ambiguous */
  originalCommand: string;
  /** Possible resolutions */
  possibleResolutions: AmbiguityResolution[];
  /** Selected resolution (if resolved) */
  resolved?: AmbiguityResolution;
  /** Strategy used to resolve */
  strategyUsed?: ResolutionStrategy;
  /** Whether integrated terminal was detected (FP-3B) */
  integratedTerminalDetected?: boolean;
  /** Detection method for integrated terminal (FP-3B) */
  integratedTerminalDetectionMethod?: "heuristic" | "verified";
}

/**
 * Context for resolving ambiguity
 */
export interface AmbiguityContext {
  /** Currently focused application */
  currentApplication?: string;
  /** Current region (if in VS Code) */
  currentRegion?: RegionKind;
  /** Recently used targets */
  recentTargets?: Array<{
    entity: string;
    regionKind?: RegionKind;
    timestamp: string;
  }>;
  /** User preference for terminal */
  terminalPreference?: "integrated" | "standalone" | "recent";
  /** Whether integrated terminal is known to exist (FP-3B) */
  integratedTerminalExists?: boolean;
  /** Detection method for integrated terminal (FP-3B) */
  integratedTerminalDetectionMethod?: "heuristic" | "verified";
  /** Running terminal applications */
  runningTerminalApps?: string[];
}

/**
 * Terminal ambiguity resolution options
 */
export const TERMINAL_RESOLUTIONS: Array<{
  name: string;
  entity: string;
  regionKind?: RegionKind;
  layer: FocusLayer;
  description: string;
  type: "integrated" | "standalone";
}> = [
  {
    name: "VS Code Terminal",
    entity: "vscode",
    regionKind: RegionKind.TERMINAL,
    layer: FocusLayer.REGION,
    description: "Integrated terminal in VS Code",
    type: "integrated",
  },
  {
    name: "Windows Terminal",
    entity: "Windows Terminal",
    layer: FocusLayer.APPLICATION,
    description: "Windows Terminal application",
    type: "standalone",
  },
  {
    name: "iTerm2",
    entity: "iTerm2",
    layer: FocusLayer.APPLICATION,
    description: "iTerm2 terminal for macOS",
    type: "standalone",
  },
  {
    name: "GNOME Terminal",
    entity: "gnome-terminal",
    layer: FocusLayer.APPLICATION,
    description: "GNOME Terminal for Linux",
    type: "standalone",
  },
  {
    name: "Konsole",
    entity: "konsole",
    layer: FocusLayer.APPLICATION,
    description: "Konsole terminal for KDE",
    type: "standalone",
  },
  {
    name: "Alacritty",
    entity: "alacritty",
    layer: FocusLayer.APPLICATION,
    description: "Alacritty terminal emulator",
    type: "standalone",
  },
  {
    name: "macOS Terminal",
    entity: "Terminal",
    layer: FocusLayer.APPLICATION,
    description: "Built-in macOS Terminal",
    type: "standalone",
  },
  {
    name: "PowerShell",
    entity: "PowerShell",
    layer: FocusLayer.APPLICATION,
    description: "PowerShell window",
    type: "standalone",
  },
];

/**
 * Default configuration for terminal ambiguity resolution
 */
export interface TerminalAmbiguityConfig {
  /** Default strategy for resolving terminal ambiguity */
  defaultStrategy: ResolutionStrategy;
  /** Confidence threshold below which to prompt user */
  promptThreshold: number;
  /** Whether to consider recent history */
  useRecentHistory: boolean;
  /** Number of recent items to consider */
  recentHistoryLimit: number;
  /** Fallback action when primary fails (FP-3B) */
  fallbackAction: FallbackAction;
  /** Require explicit detection of integrated terminal (FP-3B) */
  requireExplicitIntegratedDetection: boolean;
}

const DEFAULT_CONFIG: TerminalAmbiguityConfig = {
  defaultStrategy: "context_based",
  promptThreshold: 0.6,
  useRecentHistory: true,
  recentHistoryLimit: 5,
  fallbackAction: "try_alternate",
  requireExplicitIntegratedDetection: false,
};

/**
 * Check if terminal app is running (FP-3B)
 */
function isTerminalAppRunning(appName: string): boolean {
  // This would be implemented by querying running applications
  // For now, return false as this requires system integration
  return false;
}

export default class FocusAmbiguityPolicy {
  private config: TerminalAmbiguityConfig;
  private context: AmbiguityContext;

  constructor(config: Partial<TerminalAmbiguityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.context = {};
  }

  /**
   * Analyze a command for ambiguity
   *
   * @param command - The voice command
   * @returns Ambiguity analysis result
   */
  analyzeAmbiguity(command: string): AmbiguityAnalysis {
    const normalized = command.toLowerCase().trim();

    // Check for terminal ambiguity
    if (this.isTerminalCommand(normalized)) {
      return this.analyzeTerminalAmbiguity(command);
    }

    // Check for editor ambiguity
    if (this.isEditorCommand(normalized)) {
      return this.analyzeEditorAmbiguity(command);
    }

    // Check for browser ambiguity
    if (this.isBrowserCommand(normalized)) {
      return this.analyzeBrowserAmbiguity(command);
    }

    // No ambiguity
    return {
      isAmbiguous: false,
      ambiguityType: "none",
      originalCommand: command,
      possibleResolutions: [],
    };
  }

  /**
   * Check if command relates to terminal
   */
  private isTerminalCommand(command: string): boolean {
    const terminalKeywords = [
      "terminal",
      "term",
      "console",
      "shell",
      "prompt",
      "cmd",
      "powershell",
    ];
    return terminalKeywords.some((keyword) => command.includes(keyword));
  }

  /**
   * Check if command relates to editor
   */
  private isEditorCommand(command: string): boolean {
    const editorKeywords = ["editor", "code", "file"];
    return editorKeywords.some((keyword) => command.includes(keyword));
  }

  /**
   * Check if command relates to browser
   */
  private isBrowserCommand(command: string): boolean {
    const browserKeywords = ["browser", "chrome", "firefox", "web"];
    return browserKeywords.some((keyword) => command.includes(keyword));
  }

  /**
   * Analyze terminal ambiguity with FP-3B enhancements
   */
  private analyzeTerminalAmbiguity(command: string): AmbiguityAnalysis {
    const resolutions: AmbiguityResolution[] = [];

    // Check for integrated terminal (FP-3B)
    const { integratedTerminalExists, detectionMethod } = this.detectIntegratedTerminal();

    // Generate possible resolutions based on context
    for (const terminal of TERMINAL_RESOLUTIONS) {
      const resolution = this.createResolution(terminal, command);
      resolutions.push(resolution);
    }

    // If only one resolution is valid, it's not ambiguous
    const validResolutions = resolutions.filter((r) => r.confidence > 0);

    if (validResolutions.length <= 1) {
      return {
        isAmbiguous: false,
        ambiguityType: "terminal",
        originalCommand: command,
        possibleResolutions: validResolutions,
        resolved: validResolutions[0],
        strategyUsed: "context_based",
        integratedTerminalDetected: integratedTerminalExists,
        integratedTerminalDetectionMethod: detectionMethod,
      };
    }

    // Ambiguous - multiple possibilities
    return {
      isAmbiguous: true,
      ambiguityType: "terminal",
      originalCommand: command,
      possibleResolutions: validResolutions,
      integratedTerminalDetected: integratedTerminalExists,
      integratedTerminalDetectionMethod: detectionMethod,
    };
  }

  /**
   * Detect if integrated terminal exists (FP-3B)
   * This clarifies whether detection is heuristic or verified
   */
  private detectIntegratedTerminal(): {
    integratedTerminalExists: boolean;
    detectionMethod: "heuristic" | "verified";
  } {
    // Check explicit setting first (verified)
    if (this.context.integratedTerminalExists !== undefined) {
      return {
        integratedTerminalExists: this.context.integratedTerminalExists,
        detectionMethod: this.context.integratedTerminalDetectionMethod || "verified",
      };
    }

    // Check if in VS Code context (heuristic)
    if (this.context.currentApplication === "vscode") {
      // User is in VS Code - heuristic assumption that integrated terminal exists
      return {
        integratedTerminalExists: true,
        detectionMethod: "heuristic",
      };
    }

    // Check running terminal applications (heuristic)
    if (this.context.runningTerminalApps && this.context.runningTerminalApps.length > 0) {
      // Found running terminals - could be standalone
      return {
        integratedTerminalExists: false,
        detectionMethod: "heuristic",
      };
    }

    // No information available - conservative assumption
    return {
      integratedTerminalExists: false,
      detectionMethod: "heuristic",
    };
  }

  /**
   * Analyze editor ambiguity
   */
  private analyzeEditorAmbiguity(command: string): AmbiguityAnalysis {
    const resolutions: AmbiguityResolution[] = [];

    // VS Code editor
    resolutions.push({
      target: {
        entity: "vscode",
        layer: FocusLayer.REGION,
        regionKind: RegionKind.EDITOR,
      },
      description: "VS Code editor",
      confidence: 0.9,
      reason: "VS Code is the primary editor",
      verified: true,
      verificationMethod: "verified",
    });

    // Other editors would go here

    return {
      isAmbiguous: resolutions.length > 1,
      ambiguityType: "editor",
      originalCommand: command,
      possibleResolutions: resolutions,
    };
  }

  /**
   * Analyze browser ambiguity
   */
  private analyzeBrowserAmbiguity(command: string): AmbiguityAnalysis {
    const resolutions: AmbiguityResolution[] = [];

    resolutions.push({
      target: {
        entity: "chrome",
        layer: FocusLayer.APPLICATION,
      },
      description: "Google Chrome",
      confidence: 0.8,
      reason: "Chrome is the default browser",
      verified: false,
      verificationMethod: "heuristic",
    });

    return {
      isAmbiguous: resolutions.length > 1,
      ambiguityType: "browser",
      originalCommand: command,
      possibleResolutions: resolutions,
    };
  }

  /**
   * Create a resolution from terminal definition with FP-3B enhancements
   */
  private createResolution(
    terminal: {
      name: string;
      entity: string;
      regionKind?: RegionKind;
      layer: FocusLayer;
      description: string;
      type: "integrated" | "standalone";
    },
    command: string
  ): AmbiguityResolution {
    let confidence = 0.5;
    let reason = "Default resolution";
    let verified = false;

    // Context-based adjustments with verification (FP-3B)
    if (this.context.currentApplication) {
      if (terminal.regionKind && this.context.currentApplication === "vscode") {
        // User is in VS Code, prefer integrated terminal
        // But verify with detection method
        const { integratedTerminalExists, detectionMethod } = this.detectIntegratedTerminal();
        
        if (this.config.requireExplicitIntegratedDetection) {
          // Only high confidence if explicitly verified
          if (detectionMethod === "verified" && integratedTerminalExists) {
            confidence = 0.95;
            reason = "Integrated terminal explicitly verified";
            verified = true;
          } else {
            confidence = 0.6;
            reason = "Integrated terminal assumed (heuristic)";
          }
        } else {
          // Use heuristic - assume integrated exists when in VS Code
          confidence = 0.95;
          reason = "Current application is VS Code";
        }
      } else if (this.context.currentApplication.toLowerCase() === terminal.entity.toLowerCase()) {
        confidence = 0.9;
        reason = "Matches current application";
        verified = true;
      }
    }

    // Check if terminal is running (FP-3B)
    if (terminal.type === "standalone" && this.context.runningTerminalApps) {
      const isRunning = this.context.runningTerminalApps.some(
        (app) => app.toLowerCase() === terminal.entity.toLowerCase()
      );
      if (isRunning) {
        confidence = Math.min(0.95, confidence + 0.15);
        reason = "Terminal application is running";
      }
    }

    // Recent history adjustments
    if (this.config.useRecentHistory && this.context.recentTargets) {
      const recentMatch = this.context.recentTargets.find(
        (r) => r.entity.toLowerCase() === terminal.entity.toLowerCase()
      );
      if (recentMatch) {
        confidence = Math.min(0.95, confidence + 0.2);
        reason = "Recently used";
      }
    }

    // User preference adjustments
    if (this.context.terminalPreference === "integrated" && terminal.type === "integrated") {
      confidence = 0.95;
      reason = "User prefers integrated terminal";
    } else if (this.context.terminalPreference === "standalone" && terminal.type === "standalone") {
      confidence = 0.95;
      reason = "User prefers standalone terminal";
    }

    return {
      target: {
        entity: terminal.entity,
        layer: terminal.layer,
        regionKind: terminal.regionKind,
      },
      description: terminal.description,
      confidence,
      reason,
      verified,
      verificationMethod: verified ? "verified" : "heuristic",
    };
  }

  /**
   * Resolve ambiguity using the configured strategy with fallback (FP-3B)
   *
   * @param analysis - The ambiguity analysis
   * @returns Resolved target or undefined if cannot resolve
   */
  resolveAmbiguity(analysis: AmbiguityAnalysis): AmbiguityResolution | undefined {
    if (!analysis.isAmbiguous || analysis.possibleResolutions.length === 0) {
      return analysis.resolved;
    }

    const resolutions = analysis.possibleResolutions;

    switch (this.config.defaultStrategy) {
      case "context_based":
        return this.resolveByContext(resolutions);

      case "prefer_integrated":
        const integrated = resolutions.find((r) => r.target.regionKind === RegionKind.TERMINAL);
        if (integrated) return integrated;
        return resolutions[0];

      case "prefer_standalone":
        const standalone = resolutions.find((r) => !r.target.regionKind);
        if (standalone) return standalone;
        return resolutions[0];

      case "prefer_recent":
        return this.resolveByRecent(resolutions);

      case "last_used":
        return this.resolveByLastUsed(resolutions);

      case "prompt_user":
        // Cannot auto-resolve - return highest confidence
        const highestConfidence = resolutions.reduce((max, r) =>
          r.confidence > max.confidence ? r : max
        );
        return highestConfidence.confidence < this.config.promptThreshold
          ? undefined
          : highestConfidence;

      default:
        return resolutions[0];
    }
  }

  /**
   * Resolve using context with fallback support (FP-3B)
   */
  private resolveByContext(resolutions: AmbiguityResolution[]): AmbiguityResolution | undefined {
    // Check if we're in VS Code context
    if (this.context.currentApplication === "vscode") {
      const vscodeTerminal = resolutions.find(
        (r) => r.target.entity === "vscode" && r.target.regionKind === RegionKind.TERMINAL
      );
      if (vscodeTerminal) {
        // Apply fallback if confidence is low
        if (vscodeTerminal.confidence < this.config.promptThreshold) {
          return this.applyFallback(vscodeTerminal, resolutions);
        }
        return vscodeTerminal;
      }
    }

    // Otherwise, return highest confidence with fallback
    const highestConfidence = resolutions.reduce((max, r) =>
      r.confidence > max.confidence ? r : max
    );

    if (highestConfidence.confidence < this.config.promptThreshold) {
      return this.applyFallback(highestConfidence, resolutions);
    }

    return highestConfidence;
  }

  /**
   * Apply fallback when primary resolution has low confidence (FP-3B)
   */
  private applyFallback(
    primary: AmbiguityResolution,
    allResolutions: AmbiguityResolution[]
  ): AmbiguityResolution | undefined {
    switch (this.config.fallbackAction) {
      case "fail_fast":
        // Don't return primary with low confidence
        return undefined;

      case "try_standalone":
        // If primary is integrated, try standalone
        if (primary.target.regionKind === RegionKind.TERMINAL) {
          const standalone = allResolutions.find((r) => !r.target.regionKind);
          if (standalone) {
            return {
              ...standalone,
              reason: `${standalone.reason} (fallback from integrated)`,
            };
          }
        }
        return primary;

      case "try_integrated":
        // If primary is standalone, try integrated
        if (!primary.target.regionKind) {
          const integrated = allResolutions.find(
            (r) => r.target.regionKind === RegionKind.TERMINAL
          );
          if (integrated) {
            return {
              ...integrated,
              reason: `${integrated.reason} (fallback from standalone)`,
            };
          }
        }
        return primary;

      case "suggest_alternate":
        // Return primary but with suggestion
        return primary;

      default:
        return primary;
    }
  }

  /**
   * Resolve using recent history
   */
  private resolveByRecent(resolutions: AmbiguityResolution[]): AmbiguityResolution | undefined {
    if (!this.context.recentTargets || this.context.recentTargets.length === 0) {
      return resolutions[0];
    }

    for (const recent of this.context.recentTargets.slice(0, this.config.recentHistoryLimit)) {
      const match = resolutions.find(
        (r) => r.target.entity.toLowerCase() === recent.entity.toLowerCase()
      );
      if (match) return match;
    }

    return resolutions[0];
  }

  /**
   * Resolve using last used
   */
  private resolveByLastUsed(resolutions: AmbiguityResolution[]): AmbiguityResolution | undefined {
    return this.resolveByRecent(resolutions);
  }

  /**
   * Set the current context for ambiguity resolution (enhanced for FP-3B)
   */
  setContext(context: AmbiguityContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get current context
   */
  getContext(): AmbiguityContext {
    return { ...this.context };
  }

  /**
   * Update configuration (enhanced for FP-3B)
   */
  updateConfig(config: Partial<TerminalAmbiguityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a command should prompt for disambiguation
   *
   * @param analysis - The ambiguity analysis
   * @returns True if user should be prompted
   */
  shouldPromptUser(analysis: AmbiguityAnalysis): boolean {
    if (!analysis.isAmbiguous) return false;

    const resolved = this.resolveAmbiguity(analysis);
    return !resolved || resolved.confidence < this.config.promptThreshold;
  }

  /**
   * Get ambiguity type for logging (FP-3B)
   */
  getAmbiguityTypeDescription(analysis: AmbiguityAnalysis): string {
    if (!analysis.isAmbiguous) {
      return "No ambiguity";
    }

    const parts = [
      `Type: ${analysis.ambiguityType}`,
      `Detected: ${analysis.possibleResolutions.length} possible resolutions`,
    ];

    if (analysis.integratedTerminalDetected !== undefined) {
      parts.push(
        `Integrated terminal: ${analysis.integratedTerminalDetected ? "found" : "not found"} (${analysis.integratedTerminalDetectionMethod})`
      );
    }

    if (analysis.strategyUsed) {
      parts.push(`Strategy: ${analysis.strategyUsed}`);
    }

    return parts.join(", ");
  }
}

export default FocusAmbiguityPolicy;
