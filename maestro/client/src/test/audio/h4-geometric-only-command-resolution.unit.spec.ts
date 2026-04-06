import { deriveH4GeometricOnlyCommandResolution } from "../../main/runtime/h4-geometric-only-command-resolution";

describe("H4 geometric-only command resolution", () => {
  it("resolves pause directly from validated v1 geometric region", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "pause",
      commandClass: "reflex",
      source: "geometric_sidecar",
      atlasSchema: "h3_command_atlas_v1",
    });

    expect(result).toEqual(expect.objectContaining({
      h4GeometricOnlyResolutionEligible: true,
      h4GeometricOnlyResolutionCanonicalCommandText: "pause",
      h4GeometricOnlyResolutionCommandClass: "reflex",
      h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
      h4GeometricOnlyResolutionAtlasValidatedV1: true,
    }));
  });

  it("resolves focus chrome directly from validated v1 geometric region", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "focus chrome",
      commandClass: "closed_structure",
      source: "geometric_sidecar",
      atlasSchema: "h3_command_atlas_v1",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(true);
    expect(result.h4GeometricOnlyResolutionCanonicalCommandText).toBe("focus chrome");
    expect(result.h4GeometricOnlyResolutionReasonCodes).toContain(
      "validated_v1_geometric_only_region_allowlisted"
    );
  });

  it("rejects unsupported geometric-only regions even when class is closed_structure", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "focus terminal",
      commandClass: "closed_structure",
      source: "geometric_sidecar",
      atlasSchema: "h3_command_atlas_v1",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(false);
    expect(result.h4GeometricOnlyResolutionReasonCodes).toContain(
      "unsupported_geometric_only_region"
    );
  });

  it("rejects non-validated atlas schemas when provided", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "pause",
      commandClass: "reflex",
      source: "geometric_sidecar",
      atlasSchema: "bootstrap_demo_atlas_v0",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(false);
    expect(result.h4GeometricOnlyResolutionReasonCodes).toContain(
      "atlas_schema_not_validated_v1"
    );
  });

  it("rejects parameterized regions", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "go to",
      commandClass: "parameterized",
      source: "geometric_sidecar",
      atlasSchema: "h3_command_atlas_v1",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(false);
    expect(result.h4GeometricOnlyResolutionReasonCodes).toContain(
      "command_class_not_geometric_only"
    );
  });
});
