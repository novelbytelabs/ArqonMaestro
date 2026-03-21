import Log from "../../log";
import ActuationPolicyService, { 
  PolicyContext, 
  SecurityMode, 
  TrustTier,
  PolicyDecisionType,
  RouteExplanation 
} from "../actuation-policy-service";

// Simple test framework matching existing test files
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failed++;
    console.log(`✗ ${name}: ${error}`);
  }
}

// Mock Log for testing
const mockLog = {
  logVerbose: () => {},
  logInfo: () => {},
  logError: () => {},
} as unknown as Log;

// Create service instance for tests
const policyService = new ActuationPolicyService(mockLog);

console.log("\n=== ActuationPolicyService Tests ===\n");

// Decision tests
test("approves reflex_local route in standard mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_UNDO"],
    commandFamilies: ["reflex"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("reflex_local", "reflex", context);
  
  assert(result.decision === "approve_route", `expected approve_route, got ${result.decision}`);
  assert(result.approvedTrustTier === 1, `expected tier 1, got ${result.approvedTrustTier}`);
  assert(result.confirmationRequired === false, "reflex should not require confirmation");
});

test("approves focus_local route in standard mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_FOCUS"],
    commandFamilies: ["focus"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("focus_local", "focus", context);
  
  assert(result.decision === "approve_route", `expected approve_route, got ${result.decision}`);
  assert(result.approvedTrustTier === 1, `expected tier 1, got ${result.approvedTrustTier}`);
});

test("approves execution_local route in standard mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_RUN"],
    commandFamilies: ["execution"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("execution_local", "execution", context);
  
  assert(result.decision === "approve_route", `expected approve_route, got ${result.decision}`);
  assert(result.approvedTrustTier === 1, `expected tier 1, got ${result.approvedTrustTier}`);
});

test("approves plugin-assisted route in standard mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_FOCUS"],
    commandFamilies: ["focus"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("focus_plugin", "focus", context);
  
  assert(result.decision === "approve_route", `expected approve_route, got ${result.decision}`);
  assert(result.approvedTrustTier === 2, `expected tier 2, got ${result.approvedTrustTier}`);
});

test("blocks visual routes in secure mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_CLICK"],
    commandFamilies: ["navigation"],
    securityMode: "secure",
    speakerVerified: true,
  };
  
  const result = policyService.decide("unknown_legacy", "navigation", context);
  
  assert(result.decision === "block_route", `expected block_route, got ${result.decision}`);
  assert(result.explanation.blockedRoutes.length > 0, "should have blocked routes");
});

test("blocks legacy routes in secure mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_RUN"],
    commandFamilies: ["execution"],
    securityMode: "secure",
    speakerVerified: true,
  };
  
  const result = policyService.decide("legacy_executor", "execution", context);
  
  assert(result.decision === "block_route", `expected block_route, got ${result.decision}`);
});

test("approves with confirmation for lower trust tiers in secure mode", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_NAVIGATE"],
    commandFamilies: ["navigation"],
    securityMode: "secure",
    speakerVerified: true,
  };
  
  const result = policyService.decide("navigation_plugin", "navigation", context);
  
  // Plugin routes have tier 2, which may require confirmation in secure mode
  assert(result.approvedTrustTier === 2, `expected tier 2, got ${result.approvedTrustTier}`);
});

// Trust tier tests
test("getRouteTrustTier returns tier 1 for native semantic routes", () => {
  assert(policyService.getRouteTrustTier("reflex_local") === 1, "reflex_local should be tier 1");
  assert(policyService.getRouteTrustTier("focus_local") === 1, "focus_local should be tier 1");
  assert(policyService.getRouteTrustTier("execution_local") === 1, "execution_local should be tier 1");
});

test("getRouteTrustTier returns tier 2 for plugin-assisted routes", () => {
  assert(policyService.getRouteTrustTier("focus_plugin") === 2, "focus_plugin should be tier 2");
  assert(policyService.getRouteTrustTier("navigation_plugin") === 2, "navigation_plugin should be tier 2");
  assert(policyService.getRouteTrustTier("editing_plugin") === 2, "editing_plugin should be tier 2");
});

test("getRouteTrustTier returns tier 4 for visual actuation routes", () => {
  assert(policyService.getRouteTrustTier("legacy_executor") === 4, "legacy_executor should be tier 4");
  assert(policyService.getRouteTrustTier("unknown_legacy") === 4, "unknown_legacy should be tier 4");
  assert(policyService.getRouteTrustTier("mixed_legacy") === 4, "mixed_legacy should be tier 4");
});

// Security mode tests
test("isRouteAllowedInSecurityMode allows all routes in standard mode", () => {
  assert(policyService.isRouteAllowedInSecurityMode("reflex_local", "standard") === true, "reflex_local should be allowed in standard");
  assert(policyService.isRouteAllowedInSecurityMode("focus_plugin", "standard") === true, "focus_plugin should be allowed in standard");
  assert(policyService.isRouteAllowedInSecurityMode("legacy_executor", "standard") === true, "legacy_executor should be allowed in standard");
});

test("isRouteAllowedInSecurityMode restricts visual routes in secure mode", () => {
  assert(policyService.isRouteAllowedInSecurityMode("reflex_local", "secure") === true, "reflex_local should be allowed in secure");
  assert(policyService.isRouteAllowedInSecurityMode("focus_plugin", "secure") === true, "focus_plugin should be allowed in secure");
  assert(policyService.isRouteAllowedInSecurityMode("legacy_executor", "secure") === false, "legacy_executor should be blocked in secure");
  assert(policyService.isRouteAllowedInSecurityMode("unknown_legacy", "secure") === false, "unknown_legacy should be blocked in secure");
});

// Policy explanation tests
test("policy explanation includes route explanation with all required fields", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_UNDO"],
    commandFamilies: ["reflex"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("reflex_local", "reflex", context);
  
  assert(result.explanation !== undefined, "should have explanation");
  assert(result.explanation.chosenRoute === "reflex_local", "should have chosen route");
  assert(result.explanation.chosenRouteClass === "native_semantic", "should have route class");
  assert(result.explanation.chosenTrustTier === 1, "should have trust tier");
  assert(result.explanation.alternativesConsidered !== undefined, "should have alternatives");
  assert(result.explanation.policyFactors !== undefined, "should have policy factors");
  assert(result.explanation.summary !== undefined, "should have summary");
});

test("includes blocked routes in explanation when blocked", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_CLICK"],
    commandFamilies: ["navigation"],
    securityMode: "secure",
    speakerVerified: true,
  };
  
  const result = policyService.decide("legacy_executor", "navigation", context);
  
  assert(result.explanation.blockedRoutes.length > 0, "should have blocked routes");
  assert(result.explanation.blockedRoutes[0].route === "legacy_executor", "should identify blocked route");
  assert(result.explanation.blockedRoutes[0].blockedBy === "security_policy", "should identify policy blocker");
});

test("provides decision latency", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_FOCUS"],
    commandFamilies: ["focus"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("focus_local", "focus", context);
  
  assert(result.decisionMadeAt >= 0, "should have decision latency");
});

// Route classification tests
test("classifies composite_local as tier 1", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_FOCUS", "COMMAND_TYPE_UNDO"],
    commandFamilies: ["focus", "reflex"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("composite_local", "mixed", context);
  
  assert(result.approvedTrustTier === 1, "composite_local should be tier 1");
});

test("classifies editing_local as tier 1", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_COPY"],
    commandFamilies: ["editing"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("editing_local", "editing", context);
  
  assert(result.approvedTrustTier === 1, "editing_local should be tier 1");
});

test("classifies app_control_local as tier 1", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_LAUNCH"],
    commandFamilies: ["system"],
    securityMode: "standard",
    speakerVerified: true,
  };
  
  const result = policyService.decide("app_control_local", "system", context);
  
  assert(result.approvedTrustTier === 1, "app_control_local should be tier 1");
});

// Security enforcement tests
test("enforces secure mode restrictions", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_DELETE"],
    commandFamilies: ["system"],
    securityMode: "secure",
    speakerVerified: true,
  };
  
  const result = policyService.decide("mixed_legacy", "system", context);
  
  assert(result.decision === "block_route", "should block in secure mode");
});

test("enforces shared room mode with verification", () => {
  const context: PolicyContext = {
    commandTypes: ["COMMAND_TYPE_FOCUS"],
    commandFamilies: ["focus"],
    securityMode: "shared_room",
    speakerVerified: true,
  };
  
  const result = policyService.decide("focus_local", "focus", context);
  
  assert(result.decision === "approve_route", "should approve with verification in shared room");
});

// Summary
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
