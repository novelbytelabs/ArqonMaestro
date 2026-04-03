
import { deriveCounterfactualRepairEvidenceFields } from "../../main/runtime/counterfactual-repair-intelligence";

describe("counterfactual repair intelligence", () => {
  it("derives nearest alternative and high ambiguity for open/go-to style commands", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_github",
      canonicalMergedText: "open github.com",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open github.com",
    });

    expect(result.counterfactualRepairSchemaVersion).toBe("h3_counterfactual_repair_v1");
    expect(result.counterfactualRepairEligible).toBe(true);
    expect(result.counterfactualRepairNearestAlternativeCanonicalMergedText).toBe("go to github.com");
    expect(result.counterfactualRepairAmbiguityBand).toBe("high");
    expect(result.counterfactualRepairRepairEligible).toBe(true);
  });

  it("derives a self-correction repair signal when transcript shows restart speech", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_docs",
      canonicalMergedText: "open docs.python.org",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open do- docs.python.org",
    });

    expect(result.counterfactualRepairRepairSignal).toBe("self_correction_hint");
    expect(result.counterfactualRepairRepairEligible).toBe(true);
    expect(result.counterfactualRepairReasonCodes).toContain("counterfactual_repair_self_correction_hint");
  });

  it("stays not eligible when there is no semantic address/canonical merge", () => {
    const result = deriveCounterfactualRepairEvidenceFields(null);
    expect(result.counterfactualRepairEligible).toBe(false);
    expect(result.counterfactualRepairSource).toBe("none");
    expect(result.counterfactualRepairReasonCodes).toEqual(["counterfactual_not_eligible"]);
  });
});
