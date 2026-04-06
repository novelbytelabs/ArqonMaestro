import {
  deriveDynamicPrecisionRegimeObservation,
  DYNAMIC_PRECISION_POLICY_VERSION,
  DYNAMIC_PRECISION_SCHEMA_VERSION,
} from "../../main/runtime/dynamic-precision-regimes";

describe("Dynamic precision regime observation", () => {
  it("suggests tight as the baseline regime for numeric families", () => {
    const fields = deriveDynamicPrecisionRegimeObservation({
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      ambiguityBand: "low",
      repairWindowOpen: false,
      stressBand: "nominal",
      source: "h3_runtime_evidence",
    });

    expect(fields).toEqual(
      expect.objectContaining({
        dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
        dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "numeric",
        dynamicPrecisionBaselineRegime: "tight",
        dynamicPrecisionSuggestedRegime: "tight",
        dynamicPrecisionEscalationEligible: false,
      })
    );
  });

  it("suggests ultra and marks escalation eligible for open families under high ambiguity", () => {
    const fields = deriveDynamicPrecisionRegimeObservation({
      regionId: "browser_open",
      commandClass: "parameterized",
      parameterType: "open",
      ambiguityBand: "high",
      repairWindowOpen: true,
      stressBand: "critical",
      source: "h3_runtime_evidence",
    });

    expect(fields).toEqual(
      expect.objectContaining({
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "open",
        dynamicPrecisionBaselineRegime: "ultra",
        dynamicPrecisionSuggestedRegime: "ultra",
        dynamicPrecisionEscalationEligible: true,
        dynamicPrecisionObservedAmbiguityBand: "high",
        dynamicPrecisionObservedRepairWindowOpen: true,
        dynamicPrecisionObservedStressBand: "critical",
      })
    );
  });

  it("stays ineligible when no family can be derived", () => {
    const fields = deriveDynamicPrecisionRegimeObservation({
      regionId: null,
      commandClass: null,
      parameterType: null,
      ambiguityBand: null,
      repairWindowOpen: null,
      stressBand: null,
      source: "h3_runtime_evidence",
    });

    expect(fields).toEqual(
      expect.objectContaining({
        dynamicPrecisionEligible: false,
        dynamicPrecisionObservedFamily: null,
        dynamicPrecisionBaselineRegime: null,
        dynamicPrecisionSuggestedRegime: null,
        dynamicPrecisionEscalationEligible: false,
      })
    );
  });
});
