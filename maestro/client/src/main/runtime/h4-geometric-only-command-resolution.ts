export interface H4GeometricOnlyCommandResolution {
  h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1";
  h4GeometricOnlyResolutionEligible: boolean;
  h4GeometricOnlyResolutionCanonicalCommandText: string | null;
  h4GeometricOnlyResolutionCommandClass: "reflex" | "closed_structure" | null;
  h4GeometricOnlyResolutionRegionId: string | null;
  h4GeometricOnlyResolutionSource: "geometric_sidecar" | "parakeet_sidecar_geometric";
  h4GeometricOnlyResolutionReasonCodes: string[];
}

const PARAMETERIZED_REGIONS = new Set(["go to line", "go to", "open"]);

export function deriveH4GeometricOnlyCommandResolution(input: {
  regionId: string | null;
  commandClass: "reflex" | "closed_structure" | "parameterized" | "unknown" | null;
  source?: "geometric_sidecar" | "parakeet_sidecar_geometric";
}): H4GeometricOnlyCommandResolution {
  const source = input.source ?? "geometric_sidecar";
  const regionId = (input.regionId ?? "").trim().toLowerCase();
  const commandClass = input.commandClass;

  if (!regionId) {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: null,
      h4GeometricOnlyResolutionRegionId: null,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionReasonCodes: ["missing_region_id"],
    };
  }

  if (commandClass !== "reflex" && commandClass !== "closed_structure") {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: null,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionReasonCodes: ["command_class_not_geometric_only"],
    };
  }

  if (PARAMETERIZED_REGIONS.has(regionId)) {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: commandClass,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionReasonCodes: ["parameterized_region_requires_tail_resolution"],
    };
  }

  return {
    h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
    h4GeometricOnlyResolutionEligible: true,
    h4GeometricOnlyResolutionCanonicalCommandText: regionId,
    h4GeometricOnlyResolutionCommandClass: commandClass,
    h4GeometricOnlyResolutionRegionId: regionId,
    h4GeometricOnlyResolutionSource: source,
    h4GeometricOnlyResolutionReasonCodes: ["canonical_command_text_from_geometric_region"],
  };
}
