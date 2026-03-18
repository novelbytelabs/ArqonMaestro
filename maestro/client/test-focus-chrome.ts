/**
 * Debug Test: Focus Chrome Command
 * 
 * Run this to test intent routing with "focus chrome"
 * 
 * Usage: npx ts-node test-focus-chrome.ts
 */

import IntentRoutingService, {
  RoutingOutcome,
  FocusRoutingAgreement,
} from "./src/main/runtime/intent-routing-service";

const service = new IntentRoutingService();

console.log("=== Testing 'focus chrome' ===\n");

// Test 1: Basic focus chrome
console.log("Test 1: focus chrome (no context)");
const result1 = service.routeCommandHardened({
  command: "focus chrome",
});
console.log("Result:", JSON.stringify(result1, null, 2));

console.log("\n---\n");

// Test 2: With current application context
console.log("Test 2: focus chrome (with VS Code context)");
const result2 = service.routeCommandHardened({
  command: "focus chrome",
  currentApplication: "vscode",
});
console.log("Result:", JSON.stringify(result2, null, 2));

console.log("\n---\n");

// Test 3: in chrome, focus
console.log("Test 3: in chrome, focus");
const result3 = service.routeCommandHardened({
  command: "in chrome, focus",
});
console.log("Result:", JSON.stringify(result3, null, 2));

console.log("\n---\n");

// Test 4: in code, focus terminal
console.log("Test 4: in code, focus terminal");
const result4 = service.routeCommandHardened({
  command: "in code, focus terminal",
});
console.log("Result:", JSON.stringify(result4, null, 2));

console.log("\n=== Summary ===");
console.log("If you see 'success: true' and 'outcome: resolved_explicit', the routing is working!");
console.log("The issue might be earlier - in the speech-to-text or command-type mapping.");
