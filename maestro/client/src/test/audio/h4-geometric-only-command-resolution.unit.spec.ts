import { deriveH4GeometricOnlyCommandResolution } from "../../main/runtime/h4-geometric-only-command-resolution";

describe("H4 geometric-only command resolution", () => {
  it("resolves pause directly from geometric region", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "pause",
      commandClass: "reflex",
      source: "geometric_sidecar",
    });

    expect(result).toEqual(expect.objectContaining({
      h4GeometricOnlyResolutionEligible: true,
      h4GeometricOnlyResolutionCanonicalCommandText: "pause",
      h4GeometricOnlyResolutionCommandClass: "reflex",
    }));
  });

  it("resolves focus chrome directly from geometric region", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "focus chrome",
      commandClass: "closed_structure",
      source: "geometric_sidecar",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(true);
    expect(result.h4GeometricOnlyResolutionCanonicalCommandText).toBe("focus chrome");
  });

  it("rejects parameterized regions", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "go to",
      commandClass: "parameterized",
      source: "geometric_sidecar",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(false);
    expect(result.h4GeometricOnlyResolutionReasonCodes).toContain("command_class_not_geometric_only");
  });
});
