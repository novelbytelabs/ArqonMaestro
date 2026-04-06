import { deriveH4AuthoritySpineObservation } from "../../main/runtime/h4-command-lane-authority-spine";

describe("H4 command-lane authority spine", () => {
  it("marks h3j as the primary command-lane authority when a lawful final decision is present", () => {
    const fields = deriveH4AuthoritySpineObservation({
      liveMicActive: true,
      commandLane: true,
      dictateMode: false,
      streamConnected: true,
      defaultPath: "h3j_authority",
      authoritative: true,
      semanticResultPresent: true,
      sourceEventName: "lookup-completed",
    });
    expect(fields).toEqual(expect.objectContaining({
      h4AuthoritySpineSchemaVersion: "h4_authority_spine_v1",
      h4AuthoritySpinePolicyVersion: "h4_command_lane_authority_spine_cutover_v1",
      h4AuthoritySpineCutoverActive: true,
      h4AuthoritySpineDecisionStage: "final_decision",
      h4AuthoritySpineLawfulFinalDecision: true,
    }));
  });

  it("records explicit fallback when the authority path fails to produce a lawful final decision", () => {
    const fields = deriveH4AuthoritySpineObservation({
      liveMicActive: true,
      commandLane: true,
      dictateMode: false,
      streamConnected: true,
      defaultPath: "h3j_authority",
      authoritative: true,
      fallbackInvoked: true,
      fallbackReason: "authoritative_path_failed_to_produce_lawful_final_decision",
      sourceEventName: "h4_authority_fallback_invoked",
    });
    expect(fields).toEqual(expect.objectContaining({
      h4AuthoritySpineDecisionStage: "fallback",
      h4AuthoritySpineFallbackInvoked: true,
      h4AuthoritySpineLawfulFinalDecision: true,
    }));
  });
});
