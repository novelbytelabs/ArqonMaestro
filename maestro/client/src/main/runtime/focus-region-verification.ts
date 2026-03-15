/**
 * Focus Region Verification Service
 *
 * Verifies region-level focus transfers for FP-3A.5.
 * Provides post-transfer verification for Layer 4 (Region) focus.
 */

import { FocusTarget, FocusState, FocusLayer } from "./focus-verification-service";
import {
  FocusRegionService,
  RegionKind,
  RegionVerificationResult,
  SupportedApplication,
} from "./focus-region-service";

/**
 * Region verification configuration
 */
export interface RegionVerificationConfig {
  /** Timeout for verification in ms */
  verificationTimeoutMs: number;
  /** Number of verification attempts */
  maxAttempts: number;
  /** Delay between attempts in ms */
  attemptDelayMs: number;
  /** Whether to log detailed verification */
  verboseLogging: boolean;
}

/**
 * Result of region verification
 */
export interface RegionVerifyResult {
  /** Whether verification was successful */
  success: boolean;
  /** The expected region */
  expected: RegionKind;
  /** The detected region */
  detected: RegionKind | null;
  /** Confidence in detection [0.0, 1.0] */
  confidence: number;
  /** Details about verification */
  details: string;
  /** Whether retry is recommended */
  retryRecommended: boolean;
}

/**
 * Maps common voice commands to region kinds
 */
const VOICE_COMMAND_TO_REGION: Record<string, RegionKind[]> = {
  "go to editor": [RegionKind.EDITOR],
  "focus editor": [RegionKind.EDITOR],
  "open terminal": [RegionKind.TERMINAL],
  "focus terminal": [RegionKind.TERMINAL],
  "show terminal": [RegionKind.TERMINAL],
  "open sidebar": [RegionKind.SIDEBAR],
  "show sidebar": [RegionKind.SIDEBAR],
  "show explorer": [RegionKind.EXPLORER],
  "open explorer": [RegionKind.EXPLORER],
  "show search": [RegionKind.SEARCH],
  "open search": [RegionKind.SEARCH],
  "show extensions": [RegionKind.EXTENSIONS],
  "open extensions": [RegionKind.EXTENSIONS],
  "focus address bar": [RegionKind.ADDRESS_BAR],
  "open address bar": [RegionKind.ADDRESS_BAR],
  "show downloads": [RegionKind.DOWNLOADS],
  "open downloads": [RegionKind.DOWNLOADS],
  "show bookmarks": [RegionKind.BOOKMARKS],
  "show history": [RegionKind.HISTORY],
  "open settings": [RegionKind.SETTINGS],
  "show devtools": [RegionKind.DEVTOOLS],
  "open devtools": [RegionKind.DEVTOOLS],
  // "terminal" is ambiguous - handled separately in ambiguity policy
};

export default class FocusRegionVerificationService {
  private regionService: FocusRegionService;
  private config: RegionVerificationConfig;

  constructor(config: Partial<RegionVerificationConfig> = {}) {
    this.regionService = new FocusRegionService();
    this.config = {
      verificationTimeoutMs: 1000,
      maxAttempts: 2,
      attemptDelayMs: 200,
      verboseLogging: false,
      ...config,
    };
  }

  /**
   * Verify a region transfer
   *
   * @param target - The target that was transferred to
   * @param actualState - The actual focus state after transfer
   * @returns Region verification result
   */
  async verifyRegionTransfer(target: FocusTarget, actualState: FocusState): Promise<RegionVerifyResult> {
    const expectedRegion = target.regionKind;
    const application = target.entity;

    if (!expectedRegion) {
      return {
        success: false,
        expected: RegionKind.UNKNOWN,
        detected: actualState.regionKind || null,
        confidence: 0.0,
        details: "No region specified in target",
        retryRecommended: false,
      };
    }

    // Check if application supports regions
    if (!this.regionService.supportsRegions(application)) {
      return {
        success: false,
        expected: expectedRegion,
        detected: null,
        confidence: 0.0,
        details: `Application ${application} does not support region verification`,
        retryRecommended: false,
      };
    }

    // Detect the current region
    const detectionResult = await this.detectCurrentRegion(application);

    // Compare expected vs detected
    const isMatch = detectionResult.detected === expectedRegion;
    const confidence = this.calculateVerificationConfidence(expectedRegion, detectionResult);

    const result: RegionVerifyResult = {
      success: isMatch && detectionResult.confidence >= 0.5,
      expected: expectedRegion,
      detected: detectionResult.detected,
      confidence,
      details: isMatch
        ? `Region verified: ${expectedRegion}`
        : `Region mismatch: expected ${expectedRegion}, detected ${detectionResult.detected || 'unknown'}`,
      retryRecommended: !isMatch && detectionResult.confidence < 0.5,
    };

    this.log(result.details);
    return result;
  }

  /**
   * Detect the current active region in an application
   *
   * @param application - The application name
   * @returns Detection result with region and confidence
   */
  async detectCurrentRegion(application: string): Promise<{
    detected: RegionKind | null;
    confidence: number;
  }> {
    const appType = this.regionService.classifyApplication(application);

    // Use application-specific detection
    switch (appType) {
      case SupportedApplication.VSCODE:
        return this.detectVSCodeRegion();
      case SupportedApplication.CHROME:
        return this.detectChromeRegion();
      default:
        return { detected: null, confidence: 0.0 };
    }
  }

  /**
   * Detect current region in VS Code
   * In a real implementation, this would query VS Code's active editor,
   * terminal, or other UI state
   */
  private async detectVSCodeRegion(): Promise<{ detected: RegionKind | null; confidence: number }> {
    // This would be implemented with VS Code extension API or
    // by querying window state

    // For now, return unknown - real implementation would query:
    // - Terminal: terminal.instanceId
    // - Editor: textEditor?.viewColumn
    // - Sidebar: activityBarVisibility
    // - Panel: panel.visibility

    return { detected: null, confidence: 0.0 };
  }

  /**
   * Detect current region in Chrome
   * In a real implementation, this would use Chrome DevTools Protocol
   */
  private async detectChromeRegion(): Promise<{ detected: RegionKind | null; confidence: number }> {
    // This would be implemented with CDP (Chrome DevTools Protocol)
    // Query focuses, DOM state, etc.

    return { detected: null, confidence: 0.0 };
  }

  /**
   * Calculate verification confidence based on detection
   */
  private calculateVerificationConfidence(
    expected: RegionKind,
    detection: { detected: RegionKind | null; confidence: number }
  ): number {
    if (!detection.detected) {
      return 0.0;
    }

    if (detection.detected === expected) {
      return detection.confidence;
    }

    // Partial match: might be in related region
    const relatedRegions = this.regionService.getNavigableRegions(detection.detected, "");
    if (relatedRegions.includes(expected)) {
      return detection.confidence * 0.5;
    }

    return 0.0;
  }

  /**
   * Parse voice command to determine target region
   *
   * @param command - The voice command
   * @param application - The target application
   * @returns Array of possible region kinds (may be multiple if ambiguous)
   */
  parseRegionFromCommand(command: string, application: string): RegionKind[] {
    const normalized = command.toLowerCase().trim();

    // Direct mapping
    if (VOICE_COMMAND_TO_REGION[normalized]) {
      return VOICE_COMMAND_TO_REGION[normalized];
    }

    // Check for partial matches
    const possibleRegions: RegionKind[] = [];
    for (const [cmd, regions] of Object.entries(VOICE_COMMAND_TO_REGION)) {
      if (normalized.includes(cmd) || cmd.includes(normalized)) {
        possibleRegions.push(...regions);
      }
    }

    // Filter by application support
    const validRegions = possibleRegions.filter((region) =>
      this.regionService.isValidRegionForApplication(region, application)
    );

    return [...new Set(validRegions)]; // Deduplicate
  }

  /**
   * Check if a command requires region disambiguation
   *
   * @param command - The voice command
   * @param application - The target application
   * @returns True if disambiguation is needed
   */
  requiresDisambiguation(command: string, application: string): boolean {
    const regions = this.parseRegionFromCommand(command, application);
    return regions.length > 1;
  }

  /**
   * Get disambiguation options for a command
   *
   * @param command - The voice command
   * @param application - The target application
   * @returns Array of possible regions with details
   */
  getDisambiguationOptions(command: string, application: string): Array<{
    region: RegionKind;
    name: string;
    description: string;
  }> {
    const regions = this.parseRegionFromCommand(command, application);

    return regions.map((region) => {
      const definition = this.regionService.getRegionDefinition(region, application);
      return {
        region,
        name: definition?.name || region,
        description: definition?.description || "",
      };
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RegionVerificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Internal logging helper
   */
  private log(message: string): void {
    if (this.config.verboseLogging) {
      console.log(`[FocusRegionVerification] ${message}`);
    }
  }
}

export default FocusRegionVerificationService;
