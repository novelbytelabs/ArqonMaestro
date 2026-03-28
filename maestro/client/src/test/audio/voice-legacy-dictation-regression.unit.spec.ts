import ActuationPolicyService, { PolicyContext } from "../../main/runtime/actuation-policy-service";

describe("Legacy dictation policy regression suite", () => {
  const log = {
    logVerbose: () => undefined,
    logInfo: () => undefined,
    logError: () => undefined,
  } as any;

  const policyService = new ActuationPolicyService(log);

  it("allows dictation text-entry flows for legacy compatibility", () => {
    const context: PolicyContext = {
      commandTypes: ["COMMAND_TYPE_INSERT", "COMMAND_TYPE_PRESS"],
      commandFamilies: ["editing"],
      securityMode: "standard",
      speakerVerified: true,
      interactionMode: "dictation",
    };

    const decision = policyService.decide("legacy_executor", "editing", context);
    expect(decision.decision).not.toBe("block_route");
  });

  it("still blocks operating commands while in dictation mode", () => {
    const context: PolicyContext = {
      commandTypes: ["COMMAND_TYPE_FOCUS"],
      commandFamilies: ["focus"],
      securityMode: "standard",
      speakerVerified: true,
      interactionMode: "dictation",
    };

    const decision = policyService.decide("focus_local", "focus", context);
    expect(decision.decision).toBe("block_route");
    expect(decision.explanation.blockedRoutes[0]?.reason).toBe(
      "non_reflex_route_blocked_in_dictation_mode"
    );
  });
});
