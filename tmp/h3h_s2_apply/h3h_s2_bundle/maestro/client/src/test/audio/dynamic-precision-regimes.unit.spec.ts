import {
  deriveDynamicPrecisionRegimeEvidenceFields,
} from "../../main/runtime/dynamic-precision-regimes";

describe("dynamic precision regimes", () => {
  it("suggests turbo to tight when ambiguity rises on structured command", () => {
    const result = deriveDynamicPrecisionRegimeEvidenceFields({
      parameterType: null,
      commandClass: "structured",
      ambiguityPilotApplied: true,
      ambiguityEscalationKind: "request_disambiguation",
      ambiguityScoreGap: 0.05,
    });

    expect(result.dynamicPrecisionCurrentRegimeId).toBe("turbo");
    expect(result.dynamicPrecisionEscalationSuggested).toBe(true);
    expect(result.dynamicPrecisionProposedRegimeId).toBe("tight");
    expect(result.dynamicPrecisionStressBand).toBe("medium");
    expect(result.dynamicPrecisionTransitionAllowed).toBe(false);
  });

  it("suggests tight to ultra when repair window opens on open-tail", () => {
    const result = deriveDynamicPrecisionRegimeEvidenceFields({
      parameterType: "open",
      commandClass: "parameterized",
      repairSignalPilotApplied: true,
      repairWindowOpen: true,
      repairEscalationKind: "hold_for_repair",
    });

    expect(result.dynamicPrecisionCurrentRegimeId).toBe("tight");
    expect(result.dynamicPrecisionEscalationSuggested).toBe(true);
    expect(result.dynamicPrecisionProposedRegimeId).toBe("ultra");
    expect(result.dynamicPrecisionStressBand).toBe("high");
  });

  it("stays observational with no escalation in steady numeric path", () => {
    const result = deriveDynamicPrecisionRegimeEvidenceFields({
      parameterType: "numeric",
      commandClass: "parameterized",
    });

    expect(result.dynamicPrecisionCurrentRegimeId).toBe("tight");
    expect(result.dynamicPrecisionEscalationSuggested).toBe(false);
    expect(result.dynamicPrecisionProposedRegimeId).toBeNull();
    expect(result.dynamicPrecisionHysteresisState).toBe("not_evaluated");
  });
});
