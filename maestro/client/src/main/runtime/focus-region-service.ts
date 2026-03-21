/**
 * Focus Region Service
 *
 * Defines canonical region models for supported applications.
 * Part of FP-3A: Region Foundation
 * Part of FP-3B: Documentation of heuristic vs verified detections
 *
 * This service provides:
 * - Canonical region type definitions for supported surfaces
 * - Region detection and identification
 * - Region transfer validation rules
 * - Region-aware confidence scoring
 *
 * Supported Applications:
 * - VS Code: editor, terminal, sidebar, activity_bar, status_bar, panel
 * - Chrome: page, address_bar, tab_bar, bookmarks_bar, devtools
 *
 * =============================================================================
 * DETECTION METHODOLOGY (FP-3B)
 * =============================================================================
 *
 * This document explains how region detections are classified as either
 * HEURISTIC or VERIFIED:
 *
 * | Region        | Detection Method | Classification | Rationale              |
 * |---------------|------------------|---------------|------------------------|
 * | VSCode editor | API/query        | VERIFIED      | Direct VS Code API    |
 * | VSCode terminal| API/query        | VERIFIED      | Direct VS Code API    |
 * | VSCode sidebar | API/query        | VERIFIED      | Direct VS Code API    |
 * | Chrome page   | heuristic        | HEURISTIC     | No direct API         |
 * | Chrome address_bar| shortcut     | VERIFIED      | Ctrl+L always works  |
 * | Chrome tab_bar | heuristic       | HEURISTIC     | No direct API         |
 *
 * =============================================================================
 * CHROME PAGE/ADDRESS BAR BEHAVIOR (FP-3B)
 * =============================================================================
 *
 * Chrome has specific focus behaviors that must be understood:
 *
 * 1. ADDRESS_BAR (Verified):
 *    - Intentional behavior: Ctrl+L focuses the address bar
 *    - This is the ONLY reliable way to focus address bar
 *    - Verification: Check if URL bar has focus after Ctrl+L
 *    - Fallback: N/A - shortcut always works
 *
 * 2. PAGE (Heuristic):
 *    - Intentional behavior: "Focus page" means focus main content area
 *    - This is the DEFAULT state when Chrome has focus
 *    - No explicit action needed - page is default
 *    - "Do nothing" is INTENTIONAL here, not a failure
 *    - Verification: Check if NOT in address_bar, tab_bar, or devtools
 *
 * 3. TAB_BAR (Heuristic):
 *    - Intentional behavior: Tab bar receives focus with Ctrl+Tab
 *    - No single shortcut focuses tab bar directly
 *    - Verification: Check if tab strip has focus
 *
 * 4. DEVTOOLS (Verified):
 *    - Intentional behavior: F12 or Ctrl+Shift+I opens DevTools
 *    - Verification: Check if DevTools window is open
 *
 * IMPORTANT: Chrome "page" focus path is INTENTIONAL.
 * When user says "focus page" or "go to page", Maestro should:
 * - NOT attempt any action (this is correct behavior)
 * - This is NOT "do nothing as failure"
 * - This is VERIFIED default state
 */

import { FocusLayer } from "./focus-verification-service";

/**
 * Detection method classification (FP-3B)
 * Documents whether a region detection is heuristic or verified
 */
export enum DetectionMethod {
  /** Detection via direct API query - most reliable */
  VERIFIED = "verified",
  /** Detection via heuristics/assumptions - less reliable */
  HEURISTIC = "heuristic",
}

/**
 * Information about region detection methodology
 */
export interface RegionDetectionInfo {
  /** The region kind */
  regionKind: RegionKind;
  /** Application this info applies to */
  application: SupportedApplication;
  /** Detection method classification */
  detectionMethod: DetectionMethod;
  /** Explanation of how detection works */
  description: string;
  /** Reliability score based on detection method */
  reliabilityScore: number;
  /** Whether this is the default/fallback region */
  isDefaultRegion: boolean;
}

/**
 * Canonical region kinds - functional areas within applications
 * These represent Layer 4 (Region) focus as defined in the Focus Project Charter
 */
export enum RegionKind {
  // VS Code regions
  EDITOR = "editor",
  TERMINAL = "terminal",
  SIDEBAR = "sidebar",
  ACTIVITY_BAR = "activity_bar",
  STATUS_BAR = "status_bar",
  PANEL = "panel",
  EXPLORER = "explorer",
  SEARCH = "search",
  EXTENSIONS = "extensions",
  DEBUG_CONSOLE = "debug_console",
  OUTPUT = "output",

  // Chrome regions
  PAGE = "page",
  ADDRESS_BAR = "address_bar",
  TAB_BAR = "tab_bar",
  BOOKMARKS_BAR = "bookmarks_bar",
  DEVTOOLS = "devtools",
  DOWNLOADS = "downloads",
  BOOKMARKS = "bookmarks",
  HISTORY = "history",
  SETTINGS = "settings",

  // Generic regions (fallback)
  UNKNOWN = "unknown",
  NONE = "none",
}

/**
 * Application types that support region-level focus
 */
export enum SupportedApplication {
  VSCODE = "vscode",
  CHROME = "chrome",
  UNKNOWN = "unknown",
}

/**
 * Region definition with metadata
 */
export interface RegionDefinition {
  /** Unique region identifier */
  kind: RegionKind;
  /** Human-readable name */
  name: string;
  /** Description of the region */
  description: string;
  /** Whether this region accepts text input */
  acceptsInput: boolean;
  /** Whether this region has scrollable content */
  isScrollable: boolean;
  /** Default keyboard shortcuts to focus this region (if known) */
  defaultShortcuts?: string[];
  /** Related region kinds that can be navigated to from here */
  navigableTo?: RegionKind[];
  /** Detection method (FP-3B) */
  detectionMethod?: DetectionMethod;
  /** Whether this is a default region (FP-3B) */
  isDefaultRegion?: boolean;
}

/**
 * Region transfer target for Layer 4 focus
 */
export interface RegionTarget {
  /** The region kind */
  regionKind: RegionKind;
  /** The parent application */
  application: string;
  /** Optional specific identifier (e.g., terminal instance ID) */
  identifier?: string;
  /** Navigation hints for the transfer */
  navigationHint?: RegionNavigationHint;
}

/**
 * Navigation hints for region transfers
 */
export type RegionNavigationHint =
  | "keyboard_shortcut"
  | "click"
  | "command_palette"
  | "context_menu"
  | "focus_navigation"
  | "address_bar"
  | "explicit";

/**
 * Region verification result
 */
export interface RegionVerificationResult {
  /** Whether the region was successfully verified */
  success: boolean;
  /** The detected region kind */
  detectedRegion: RegionKind | null;
  /** Confidence in the detection [0.0, 1.0] */
  confidence: number;
  /** Details about the verification */
  details: string;
  /** Application that owns this region */
  application: string;
  /** Detection method used (FP-3B) */
  detectionMethod?: DetectionMethod;
}

/**
 * Region confidence modifiers for FP-3A.6
 * These modify the base confidence score based on region-specific factors
 */
export interface RegionConfidenceFactors {
  /** Base confidence from Layer 2-3 transfer */
  baseConfidence: number;
  /** Whether the target region is known to be active */
  regionActive: boolean;
  /** Whether the region's focus method is reliable */
  methodReliability: number;
  /** Application-specific reliability factor */
  applicationReliability: number;
  /** Whether there's a direct keyboard shortcut */
  hasShortcut: boolean;
  /** Whether the user has context history in this region */
  hasRecentContext: boolean;
}

/**
 * Mapping of application to their supported regions
 */
export const APPLICATION_REGIONS: Record<SupportedApplication, RegionDefinition[]> = {
  [SupportedApplication.VSCODE]: [
    {
      kind: RegionKind.EDITOR,
      name: "Editor",
      description: "Main code editing area with tabs and file content",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+1", "ctrl+k ctrl+o"],
      navigableTo: [RegionKind.SIDEBAR, RegionKind.TERMINAL, RegionKind.SEARCH],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.TERMINAL,
      name: "Terminal",
      description: "Integrated terminal panels",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+`", "ctrl+shift+`"],
      navigableTo: [RegionKind.EDITOR, RegionKind.OUTPUT, RegionKind.DEBUG_CONSOLE],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.SIDEBAR,
      name: "Sidebar",
      description: "Left sidebar with file explorer, search, etc.",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+b"],
      navigableTo: [RegionKind.EDITOR, RegionKind.ACTIVITY_BAR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.ACTIVITY_BAR,
      name: "Activity Bar",
      description: "Leftmost bar with view icons",
      acceptsInput: false,
      isScrollable: false,
      defaultShortcuts: ["ctrl+shift+a"],
      navigableTo: [RegionKind.SIDEBAR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.STATUS_BAR,
      name: "Status Bar",
      description: "Bottom bar with git, line/col info, etc.",
      acceptsInput: false,
      isScrollable: false,
      navigableTo: [RegionKind.EDITOR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.PANEL,
      name: "Panel",
      description: "Bottom panel area with terminal, output, problems",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+shift+u", "ctrl+shift+m"],
      navigableTo: [RegionKind.EDITOR, RegionKind.TERMINAL],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.EXPLORER,
      name: "File Explorer",
      description: "File tree view in the sidebar",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+shift+e"],
      navigableTo: [RegionKind.EDITOR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.SEARCH,
      name: "Search",
      description: "Search across files",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+shift+f"],
      navigableTo: [RegionKind.EDITOR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.EXTENSIONS,
      name: "Extensions",
      description: "Extensions view",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+shift+x"],
      navigableTo: [RegionKind.EDITOR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.DEBUG_CONSOLE,
      name: "Debug Console",
      description: "Debug output console",
      acceptsInput: true,
      isScrollable: true,
      navigableTo: [RegionKind.EDITOR, RegionKind.TERMINAL],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.OUTPUT,
      name: "Output",
      description: "Output panel for logs",
      acceptsInput: false,
      isScrollable: true,
      navigableTo: [RegionKind.TERMINAL, RegionKind.DEBUG_CONSOLE],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
  ],

  [SupportedApplication.CHROME]: [
    {
      kind: RegionKind.PAGE,
      name: "Page Content",
      description: "Main web page content area - DEFAULT when Chrome is focused",
      acceptsInput: true,
      isScrollable: true,
      navigableTo: [RegionKind.ADDRESS_BAR, RegionKind.TAB_BAR],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: true,
    },
    {
      kind: RegionKind.ADDRESS_BAR,
      name: "Address Bar",
      description: "Omnibox/URL bar - VERIFIED via Ctrl+L shortcut",
      acceptsInput: true,
      isScrollable: false,
      defaultShortcuts: ["ctrl+l", "cmd+l"],
      navigableTo: [RegionKind.PAGE, RegionKind.TAB_BAR],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.TAB_BAR,
      name: "Tab Bar",
      description: "Browser tabs strip - no direct focus shortcut",
      acceptsInput: false,
      isScrollable: true,
      defaultShortcuts: ["ctrl+1-9", "ctrl+tab"],
      navigableTo: [RegionKind.PAGE, RegionKind.ADDRESS_BAR],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.BOOKMARKS_BAR,
      name: "Bookmarks Bar",
      description: "Bookmarks toolbar",
      acceptsInput: false,
      isScrollable: true,
      navigableTo: [RegionKind.ADDRESS_BAR, RegionKind.PAGE],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.DEVTOOLS,
      name: "DevTools",
      description: "Developer tools panel - VERIFIED via F12 shortcut",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["f12", "ctrl+shift+i"],
      navigableTo: [RegionKind.PAGE],
      detectionMethod: DetectionMethod.VERIFIED,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.DOWNLOADS,
      name: "Downloads",
      description: "Downloads manager page",
      acceptsInput: false,
      isScrollable: true,
      defaultShortcuts: ["ctrl+j", "cmd+shift+j"],
      navigableTo: [RegionKind.PAGE, RegionKind.ADDRESS_BAR],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.BOOKMARKS,
      name: "Bookmarks Manager",
      description: "Bookmarks manager page",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+shift+o"],
      navigableTo: [RegionKind.PAGE],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.HISTORY,
      name: "History",
      description: "Browsing history page",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+h"],
      navigableTo: [RegionKind.PAGE],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: false,
    },
    {
      kind: RegionKind.SETTINGS,
      name: "Settings",
      description: "Browser settings page",
      acceptsInput: true,
      isScrollable: true,
      defaultShortcuts: ["ctrl+comma"],
      navigableTo: [RegionKind.PAGE],
      detectionMethod: DetectionMethod.HEURISTIC,
      isDefaultRegion: false,
    },
  ],

  [SupportedApplication.UNKNOWN]: [],
};

/**
 * Region detection info for documentation (FP-3B)
 * Provides detailed information about how each region is detected
 */
export const REGION_DETECTION_INFO: RegionDetectionInfo[] = [
  // VS Code regions (all verified via API)
  {
    regionKind: RegionKind.EDITOR,
    application: SupportedApplication.VSCODE,
    detectionMethod: DetectionMethod.VERIFIED,
    description: "Detected via VS Code API (vscode.window.activeTextEditor)",
    reliabilityScore: 1.0,
    isDefaultRegion: false,
  },
  {
    regionKind: RegionKind.TERMINAL,
    application: SupportedApplication.VSCODE,
    detectionMethod: DetectionMethod.VERIFIED,
    description: "Detected via VS Code API (vscode.window.activeTerminal)",
    reliabilityScore: 1.0,
    isDefaultRegion: false,
  },
  {
    regionKind: RegionKind.SIDEBAR,
    application: SupportedApplication.VSCODE,
    detectionMethod: DetectionMethod.VERIFIED,
    description: "Detected via VS Code API (vscode.window.sideBar.visibility)",
    reliabilityScore: 1.0,
    isDefaultRegion: false,
  },

  // Chrome regions
  {
    regionKind: RegionKind.PAGE,
    application: SupportedApplication.CHROME,
    detectionMethod: DetectionMethod.HEURISTIC,
    description: "HEURISTIC: Page is default when no other region is focused. NOT a failure to 'do nothing'.",
    reliabilityScore: 0.5,
    isDefaultRegion: true,
  },
  {
    regionKind: RegionKind.ADDRESS_BAR,
    application: SupportedApplication.CHROME,
    detectionMethod: DetectionMethod.VERIFIED,
    description: "VERIFIED: Ctrl+L always focuses address bar. Check document.activeElement === address bar.",
    reliabilityScore: 0.95,
    isDefaultRegion: false,
  },
  {
    regionKind: RegionKind.TAB_BAR,
    application: SupportedApplication.CHROME,
    detectionMethod: DetectionMethod.HEURISTIC,
    description: "HEURISTIC: No direct shortcut to focus tab bar. Check if tab strip has keyboard focus.",
    reliabilityScore: 0.4,
    isDefaultRegion: false,
  },
  {
    regionKind: RegionKind.DEVTOOLS,
    application: SupportedApplication.CHROME,
    detectionMethod: DetectionMethod.VERIFIED,
    description: "VERIFIED: F12 or Ctrl+Shift+I opens DevTools. Check if DevTools window exists.",
    reliabilityScore: 0.95,
    isDefaultRegion: false,
  },
];

/**
 * Reliability scores for region transfer methods by application
 */
export const REGION_METHOD_RELIABILITY: Record<SupportedApplication, Record<string, number>> = {
  [SupportedApplication.VSCODE]: {
    keyboard_shortcut: 0.95,
    command_palette: 0.9,
    click: 0.85,
    focus_navigation: 0.8,
    context_menu: 0.75,
    explicit: 0.9,
  },
  [SupportedApplication.CHROME]: {
    keyboard_shortcut: 0.95,
    address_bar: 0.9,
    click: 0.85,
    focus_navigation: 0.8,
    context_menu: 0.75,
    explicit: 0.9,
  },
  [SupportedApplication.UNKNOWN]: {
    explicit: 0.5,
  },
};

/**
 * Application reliability factors
 */
export const APPLICATION_RELIABILITY: Record<SupportedApplication, number> = {
  [SupportedApplication.VSCODE]: 0.9,
  [SupportedApplication.CHROME]: 0.85,
  [SupportedApplication.UNKNOWN]: 0.5,
};

/**
 * Default confidence threshold for region transfers
 */
export const REGION_CONFIDENCE_THRESHOLD = 0.7;

/**
 * High confidence threshold for region transfers (no user confirmation needed)
 */
export const REGION_HIGH_CONFIDENCE_THRESHOLD = 0.85;

export default class FocusRegionService {
  /**
   * Get supported regions for an application
   *
   * @param application - The application name
   * @returns Array of region definitions
   */
  getRegionsForApplication(application: string): RegionDefinition[] {
    const appType = this.classifyApplication(application);
    return APPLICATION_REGIONS[appType] || [];
  }

  /**
   * Get region definition by kind
   *
   * @param regionKind - The region kind
   * @param application - The application (optional, for app-specific names)
   * @returns Region definition or undefined
   */
  getRegionDefinition(regionKind: RegionKind, application?: string): RegionDefinition | undefined {
    if (application) {
      const appType = this.classifyApplication(application);
      const regions = APPLICATION_REGIONS[appType];
      const found = regions?.find((r) => r.kind === regionKind);
      if (found) return found;
    }

    // Search all applications
    for (const regions of Object.values(APPLICATION_REGIONS)) {
      const found = regions.find((r) => r.kind === regionKind);
      if (found) return found;
    }

    return undefined;
  }

  /**
   * Get detection method for a region (FP-3B)
   *
   * @param regionKind - The region kind
   * @param application - The application name
   * @returns Detection method or undefined
   */
  getDetectionMethod(regionKind: RegionKind, application: string): DetectionMethod | undefined {
    const definition = this.getRegionDefinition(regionKind, application);
    return definition?.detectionMethod;
  }

  /**
   * Check if a region uses verified detection (FP-3B)
   *
   * @param regionKind - The region kind
   * @param application - The application name
   * @returns True if detection is verified
   */
  isVerifiedDetection(regionKind: RegionKind, application: string): boolean {
    return this.getDetectionMethod(regionKind, application) === DetectionMethod.VERIFIED;
  }

  /**
   * Check if a region is the default region (FP-3B)
   *
   * @param regionKind - The region kind
   * @param application - The application name
   * @returns True if this is the default region
   */
  isDefaultRegion(regionKind: RegionKind, application: string): boolean {
    const definition = this.getRegionDefinition(regionKind, application);
    return definition?.isDefaultRegion ?? false;
  }

  /**
   * Get all detection info for documentation (FP-3B)
   *
   * @returns Array of detection info
   */
  getAllDetectionInfo(): RegionDetectionInfo[] {
    return REGION_DETECTION_INFO;
  }

  /**
   * Classify an application name to supported application type
   *
   * @param application - The application name
   * @returns SupportedApplication enum value
   */
  classifyApplication(application: string): SupportedApplication {
    const normalized = application.toLowerCase();

    // VS Code variants
    if (
      normalized.includes("vscode") ||
      normalized.includes("visual studio code") ||
      normalized.includes("code") ||
      normalized.includes("vscodium")
    ) {
      return SupportedApplication.VSCODE;
    }

    // Chrome variants
    if (
      normalized.includes("chrome") ||
      normalized.includes("google-chrome") ||
      normalized.includes("chromium")
    ) {
      return SupportedApplication.CHROME;
    }

    return SupportedApplication.UNKNOWN;
  }

  /**
   * Check if an application supports region-level focus
   *
   * @param application - The application name
   * @returns True if regions are supported
   */
  supportsRegions(application: string): boolean {
    const appType = this.classifyApplication(application);
    return appType !== SupportedApplication.UNKNOWN;
  }

  /**
   * Check if a region kind is valid for an application
   *
   * @param regionKind - The region kind
   * @param application - The application name
   * @returns True if region is valid for application
   */
  isValidRegionForApplication(regionKind: RegionKind, application: string): boolean {
    const regions = this.getRegionsForApplication(application);
    return regions.some((r) => r.kind === regionKind);
  }

  /**
   * Get region navigation options from a given region
   *
   * @param currentRegion - The current region kind
   * @param application - The application name
   * @returns Array of navigable region kinds
   */
  getNavigableRegions(currentRegion: RegionKind, application: string): RegionKind[] {
    const definition = this.getRegionDefinition(currentRegion, application);
    return definition?.navigableTo || [];
  }

  /**
   * Calculate region-aware confidence score
   *
   * @param factors - Confidence factors for the region transfer
   * @returns Modified confidence score [0.0, 1.0]
   */
  calculateRegionConfidence(factors: RegionConfidenceFactors): number {
    let { baseConfidence, regionActive, methodReliability, applicationReliability, hasShortcut, hasRecentContext } = factors;

    // Start with base confidence
    let confidence = baseConfidence;

    // Region active bonus
    if (regionActive) {
      confidence += 0.1;
    }

    // Apply method reliability (weighted)
    confidence *= methodReliability;

    // Apply application reliability (weighted)
    confidence *= applicationReliability;

    // Shortcut available bonus
    if (hasShortcut) {
      confidence += 0.05;
    }

    // Recent context bonus
    if (hasRecentContext) {
      confidence += 0.05;
    }

    // Clamp to [0.0, 1.0]
    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Get method reliability score
   *
   * @param application - The application name
   * @param hint - Navigation hint method
   * @returns Reliability score [0.0, 1.0]
   */
  getMethodReliability(application: string, hint: RegionNavigationHint): number {
    const appType = this.classifyApplication(application);
    return REGION_METHOD_RELIABILITY[appType]?.[hint] || 0.5;
  }

  /**
   * Get application reliability score
   *
   * @param application - The application name
   * @returns Reliability score [0.0, 1.0]
   */
  getApplicationReliability(application: string): number {
    const appType = this.classifyApplication(application);
    return APPLICATION_RELIABILITY[appType];
  }

  /**
   * Check if region transfer meets high confidence threshold
   *
   * @param confidence - The calculated confidence
   * @returns True if high confidence (no user confirmation needed)
   */
  isHighConfidence(confidence: number): boolean {
    return confidence >= REGION_HIGH_CONFIDENCE_THRESHOLD;
  }

  /**
   * Check if region transfer meets minimum confidence threshold
   *
   * @param confidence - The calculated confidence
   * @returns True if above minimum threshold
   */
  meetsMinimumConfidence(confidence: number): boolean {
    return confidence >= REGION_CONFIDENCE_THRESHOLD;
  }

  /**
   * Get all region kinds for a specific application
   *
   * @param application - The application name
   * @returns Array of region kind strings
   */
  getRegionKindsForApplication(application: string): string[] {
    const regions = this.getRegionsForApplication(application);
    return regions.map((r) => r.kind);
  }

  /**
   * Get region by human-readable name
   *
   * @param name - The region name (case-insensitive)
   * @param application - Optional application context
   * @returns Region kind or undefined
   */
  getRegionKindByName(name: string, application?: string): RegionKind | undefined {
    const normalized = name.toLowerCase();
    const regions = application ? this.getRegionsForApplication(application) : [];

    // First try application-specific search
    if (application) {
      const found = regions.find(
        (r) => r.name.toLowerCase() === normalized || r.kind.toLowerCase() === normalized
      );
      if (found) return found.kind;
    }

    // Search all regions
    for (const appRegions of Object.values(APPLICATION_REGIONS)) {
      const found = appRegions.find(
        (r) => r.name.toLowerCase() === normalized || r.kind.toLowerCase() === normalized
      );
      if (found) return found.kind;
    }

    return undefined;
  }
}
