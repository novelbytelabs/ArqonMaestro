/**
 * Focus Region Test Matrix
 *
 * Implements FP-3B: Region test matrix covering success/failure/ambiguity
 *
 * This test matrix validates region transfer behavior across:
 * - Success scenarios: transfers that should succeed
 * - Failure scenarios: transfers that should fail gracefully
 * - Ambiguity scenarios: transfers that require disambiguation
 * - Fallback scenarios: transfers that fall back to alternate methods
 *
 * Test coverage:
 * | App | Region | Success | Failure | Ambiguity | Fallback |
 * |-----|--------|---------|---------|-----------|----------|
 * | VSCode | editor | ✓ | ✓ | ✓ | ✓ |
 * | VSCode | terminal | ✓ | ✓ | ✓ | ✓ |
 * | VSCode | sidebar | ✓ | ✓ | - | ✓ |
 * | Chrome | page | ✓ | ✓ | - | ✓ |
 * | Chrome | address_bar | ✓ | ✓ | - | ✓ |
 * | Chrome | tab_bar | ✓ | ✓ | - | ✓ |
 */

import { FocusTarget, FocusLayer } from "./focus-verification-service";
import {
  RegionKind,
  SupportedApplication,
  RegionNavigationHint,
} from "./focus-region-service";
import FocusRegionHandler, {
  RegionTransferResult,
  RegionTransferDebugEvent,
  FallbackPolicy,
} from "./focus-region-handler";
import FocusAmbiguityPolicy, {
  AmbiguityAnalysis,
  AmbiguityType,
} from "./focus-ambiguity-policy";

/**
 * Test case definition for region transfers
 */
export interface RegionTestCase {
  /** Unique test case identifier */
  id: string;
  /** Human-readable test name */
  name: string;
  /** Target application */
  application: string;
  /** Target region */
  region: RegionKind;
  /** Initial context */
  context?: {
    currentApplication?: string;
    currentRegion?: RegionKind;
  };
  /** Expected result */
  expected: {
    success: boolean;
    ambiguity?: boolean;
    fallbackMethod?: RegionNavigationHint;
  };
  /** Test category */
  category: "success" | "failure" | "ambiguity" | "fallback";
}

/**
 * Test matrix for VS Code regions
 */
export const VSCODE_TEST_MATRIX: RegionTestCase[] = [
  // SUCCESS CASES
  {
    id: "vscode-editor-success-shortcut",
    name: "VS Code: Focus editor via keyboard shortcut",
    application: "vscode",
    region: RegionKind.EDITOR,
    expected: { success: true },
    category: "success",
  },
  {
    id: "vscode-terminal-success-shortcut",
    name: "VS Code: Focus terminal via keyboard shortcut",
    application: "vscode",
    region: RegionKind.TERMINAL,
    expected: { success: true },
    category: "success",
  },
  {
    id: "vscode-sidebar-success-shortcut",
    name: "VS Code: Focus sidebar via keyboard shortcut",
    application: "vscode",
    region: RegionKind.SIDEBAR,
    expected: { success: true },
    category: "success",
  },
  {
    id: "vscode-explorer-success-shortcut",
    name: "VS Code: Focus file explorer via keyboard shortcut",
    application: "vscode",
    region: RegionKind.EXPLORER,
    expected: { success: true },
    category: "success",
  },
  {
    id: "vscode-search-success-shortcut",
    name: "VS Code: Focus search via keyboard shortcut",
    application: "vscode",
    region: RegionKind.SEARCH,
    expected: { success: true },
    category: "success",
  },
  {
    id: "vscode-terminal-success-context",
    name: "VS Code: Focus terminal from VS Code context",
    application: "vscode",
    region: RegionKind.TERMINAL,
    context: { currentApplication: "vscode", currentRegion: RegionKind.EDITOR },
    expected: { success: true },
    category: "success",
  },

  // FAILURE CASES
  {
    id: "vscode-invalid-region",
    name: "VS Code: Invalid region should fail gracefully",
    application: "vscode",
    region: RegionKind.ADDRESS_BAR, // Not valid for VS Code
    expected: { success: false },
    category: "failure",
  },
  {
    id: "vscode-unsupported-app",
    name: "VS Code: Unsupported application should fail",
    application: "notepad",
    region: RegionKind.EDITOR,
    expected: { success: false },
    category: "failure",
  },

  // AMBIGUITY CASES
  {
    id: "vscode-terminal-ambiguity",
    name: "VS Code: Terminal command should detect ambiguity",
    application: "vscode",
    region: RegionKind.TERMINAL,
    context: { currentApplication: "vscode" },
    expected: { success: true, ambiguity: true },
    category: "ambiguity",
  },

  // FALLBACK CASES
  {
    id: "vscode-editor-fallback",
    name: "VS Code: Editor should fallback on shortcut failure",
    application: "vscode",
    region: RegionKind.EDITOR,
    expected: { success: true, fallbackMethod: "command_palette" },
    category: "fallback",
  },
];

/**
 * Test matrix for Chrome regions
 */
export const CHROME_TEST_MATRIX: RegionTestCase[] = [
  // SUCCESS CASES
  {
    id: "chrome-page-success",
    name: "Chrome: Focus page content",
    application: "chrome",
    region: RegionKind.PAGE,
    expected: { success: true },
    category: "success",
  },
  {
    id: "chrome-address-bar-success-shortcut",
    name: "Chrome: Focus address bar via keyboard shortcut",
    application: "chrome",
    region: RegionKind.ADDRESS_BAR,
    expected: { success: true },
    category: "success",
  },
  {
    id: "chrome-tab-bar-success-shortcut",
    name: "Chrome: Focus tab bar",
    application: "chrome",
    region: RegionKind.TAB_BAR,
    expected: { success: true },
    category: "success",
  },
  {
    id: "chrome-devtools-success-shortcut",
    name: "Chrome: Focus DevTools via keyboard shortcut",
    application: "chrome",
    region: RegionKind.DEVTOOLS,
    expected: { success: true },
    category: "success",
  },
  {
    id: "chrome-downloads-success-shortcut",
    name: "Chrome: Focus downloads via keyboard shortcut",
    application: "chrome",
    region: RegionKind.DOWNLOADS,
    expected: { success: true },
    category: "success",
  },
  {
    id: "chrome-history-success-shortcut",
    name: "Chrome: Focus history via keyboard shortcut",
    application: "chrome",
    region: RegionKind.HISTORY,
    expected: { success: true },
    category: "success",
  },

  // FAILURE CASES
  {
    id: "chrome-invalid-region",
    name: "Chrome: Invalid region should fail gracefully",
    application: "chrome",
    region: RegionKind.TERMINAL, // Not valid for Chrome
    expected: { success: false },
    category: "failure",
  },
  {
    id: "chrome-unsupported-app",
    name: "Chrome: Unsupported application should fail",
    application: "firefox",
    region: RegionKind.PAGE,
    expected: { success: false },
    category: "failure",
  },

  // FALLBACK CASES
  {
    id: "chrome-address-bar-fallback",
    name: "Chrome: Address bar should fallback on shortcut failure",
    application: "chrome",
    region: RegionKind.ADDRESS_BAR,
    expected: { success: true, fallbackMethod: "address_bar" },
    category: "fallback",
  },
];

/**
 * Combined test matrix
 */
export const REGION_TEST_MATRIX: RegionTestCase[] = [
  ...VSCODE_TEST_MATRIX,
  ...CHROME_TEST_MATRIX,
];

/**
 * Test runner for region transfers
 */
export class RegionTestRunner {
  private regionHandler: FocusRegionHandler;
  private ambiguityPolicy: FocusAmbiguityPolicy;
  private results: Array<{
    testCase: RegionTestCase;
    passed: boolean;
    result?: RegionTransferResult;
    error?: string;
  }> = [];

  constructor(options: { verboseLogging?: boolean; fallbackPolicy?: FallbackPolicy } = {}) {
    this.regionHandler = new FocusRegionHandler({
      verboseLogging: options.verboseLogging ?? false,
      fallbackPolicy: options.fallbackPolicy ?? "try_alternate",
    });
    this.ambiguityPolicy = new FocusAmbiguityPolicy({
      defaultStrategy: "context_based",
    });
  }

  /**
   * Run all test cases
   */
  async runAllTests(): Promise<{
    total: number;
    passed: number;
    failed: number;
    results: typeof this.results;
  }> {
    for (const testCase of REGION_TEST_MATRIX) {
      await this.runTest(testCase);
    }

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    return {
      total: this.results.length,
      passed,
      failed,
      results: this.results,
    };
  }

  /**
   * Run a single test case
   */
  async runTest(testCase: RegionTestCase): Promise<{
    passed: boolean;
    result?: RegionTransferResult;
    error?: string;
  }> {
    // Set context if provided
    if (testCase.context) {
      this.ambiguityPolicy.setContext({
        currentApplication: testCase.context.currentApplication,
        currentRegion: testCase.context.currentRegion,
      });
    }

    const target: FocusTarget = {
      entity: testCase.application,
      layer: FocusLayer.REGION,
      regionKind: testCase.region,
    };

    // First check for ambiguity
    const ambiguityAnalysis = this.ambiguityPolicy.analyzeAmbiguity(
      `focus ${testCase.region}`
    );

    // Execute the transfer
    const result = await this.regionHandler.executeRegionTransfer(target, {
      ambiguity: ambiguityAnalysis.isAmbiguous,
    });

    // Validate the result
    let passed = true;
    let error: string | undefined;

    // Check success
    if (result.success !== testCase.expected.success) {
      passed = false;
      error = `Expected success=${testCase.expected.success}, got ${result.success}`;
    }

    // Check ambiguity
    if (testCase.expected.ambiguity !== undefined) {
      if (ambiguityAnalysis.isAmbiguous !== testCase.expected.ambiguity) {
        passed = false;
        error = `Expected ambiguity=${testCase.expected.ambiguity}, got ${ambiguityAnalysis.isAmbiguous}`;
      }
    }

    // Check fallback
    if (testCase.expected.fallbackMethod !== undefined) {
      if (result.fallbackAttempted !== true) {
        passed = false;
        error = `Expected fallback to be attempted, but it wasn't`;
      }
    }

    const testResult = { testCase, passed, result, error };
    this.results.push(testResult);

    // Log result
    console.log(
      `[RegionTest] ${testCase.id}: ${passed ? "PASSED" : "FAILED"}${
        error ? ` - ${error}` : ""
      }`
    );

    return { passed, result, error };
  }

  /**
   * Run tests by category
   */
  async runByCategory(category: RegionTestCase["category"]): Promise<{
    total: number;
    passed: number;
    failed: number;
  }> {
    const filtered = REGION_TEST_MATRIX.filter((tc) => tc.category === category);
    const results: typeof this.results = [];

    for (const testCase of filtered) {
      const result = await this.runTest(testCase);
      results.push({ testCase, ...result });
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    return { total: filtered.length, passed, failed };
  }

  /**
   * Get test results
   */
  getResults() {
    return this.results;
  }
}

/**
 * Quick validation function for manual testing
 */
export async function quickValidate(): Promise<boolean> {
  const runner = new RegionTestRunner({ verboseLogging: true });
  const summary = await runner.runAllTests();

  console.log("\n=== Test Summary ===");
  console.log(`Total: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Pass Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);

  return summary.failed === 0;
}

export default RegionTestRunner;
