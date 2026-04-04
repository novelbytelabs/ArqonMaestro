import {
  deriveDynamicPrecisionRegimeObservation,
  DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION,
  DYNAMIC_PRECISION_POLICY_VERSION,
  DYNAMIC_PRECISION_SCHEMA_VERSION,
} from "../../main/runtime/dynamic-precision-regimes";

describe("Dynamic precision regime observation", () => {
  it("keeps numeric families at tight when escalation pressure is absent", () => {
    const fields = deriveDynamicPrecisionRegimeObservation({
      regionId: "line_nav",
      commandClass: "parameterized",
      parameterType: "numeric",
      ambiguityBand: "low",
      repairWindowOpen: false,
      stressBand: "nominal",
      guardrailSuggested: false,
      source: "h3_runtime_evidence",
    });

    expect(fields).toEqual(
      expect.objectContaining({
        dynamicPrecisionSchemaVersion: DYNAMIC_PRECISION_SCHEMA_VERSION,
        dynamicPrecisionPolicyVersion: DYNAMIC_PRECISION_POLICY_VERSION,
        dynamicPrecisionEscalationPilotVersion: DYNAMIC_PRECISION_ESCALATION_PILOT_VERSION,
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "numeric",
        dynamicPrecisionBaselineRegime: "tight",
        dynamicPrecisionSuggestedRegime: "tight",
        dynamicPrecisionCurrentRegime: "tight",
        dynamicPrecisionProposedRegime: "tight",
        dynamicPrecisionEscalationEligible: false,
        dynamicPrecisionEscalationSuggested: false,
        dynamicPrecisionFamilyPolicyId: "3h_family_policy_numeric_v1",
        dynamicPrecisionHysteresisState: "steady",
        dynamicPrecisionTransitionAllowed: false,
      })
    );
  });

  it("escalates bounded families from turbo to tight when ambiguity and repair pressure rise", () => {
    const fields = deriveDynamicPrecisionRegimeObservation({
      regionId: "command_palette",
      commandClass: "structured",
      parameterType: null,
      ambiguityBand: "high",
      repairWindowOpen: true,
      stressBand: "elevated",
      guardrailSuggested: true,
      guardrailKind: "hold_for_tail",
      source: "h3_runtime_evidence",
    });

    expect(fields).toEqual(
      expect.objectContaining({
        dynamicPrecisionEligible: true,
        dynamicPrecisionObservedFamily: "bounded",
        dynamicPrecisionBaselineRegime: "turbo",
        dynamicPrecisionSuggestedRegime: "tight",
        dynamicPrecisionCurrentRegime: "turbo",
        dynamicPrecisionProposedRegime: "tight",
        dynamicPrecisionEscalationEligible: true,
        dynamicPrecisionEscalationSuggested: true,
        dynamicPrecisionObservedAmbiguityBand: "high",
        dynamicPrecisionObservedRepairWindowOpen: true,
        dynamicPrecisionObservedStressBand: "elevated",
        dynamicPrecisionObservedGuardrailSuggested: true,
        dynamicPrecisionObservedGuardrailKind: "hold_for_tail",
        dynamicPrecisionFamilyPolicyId: "3h_family_policy_structured_v1",
        dynamicPrecisionHysteresisState: "escalation_armed",
        dynamicPrecisionTransitionAllowed: false,
      })
    );
  });

  it("keeps open families at ultra without claiming an additional transition", () => {
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
        dynamicPrecisionCurrentRegime: "ultra",
        dynamicPrecisionProposedRegime: "ultra",
        dynamicPrecisionEscalationEligible: true,
        dynamicPrecisionEscalationSuggested: false,
        dynamicPrecisionFamilyPolicyId: "3h_family_policy_open_tail_v1",
        dynamicPrecisionHysteresisState: "steady",
        dynamicPrecisionTransitionAllowed: false,
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
        dynamicPrecisionCurrentRegime: null,
        dynamicPrecisionProposedRegime: null,
        dynamicPrecisionEscalationSuggested: false,
        dynamicPrecisionTransitionAllowed: false,
      })
    );
  });
});
