export interface H4GeometricOnlyCommandResolution {
  h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_resolution_v1";
  h4GeometricOnlyResolutionEligible: boolean;
  h4GeometricOnlyResolutionRegionId: string | null;
  h4GeometricOnlyResolutionCommandClass: "reflex" | "closed_structure" | "parameterized" | "unknown" | null;
  h4GeometricOnlyResolutionCanonicalCommandText: string | null;
  h4GeometricOnlyResolutionReasonCodes: string[];
}

export function deriveH4GeometricOnlyCommandResolution(input: {
  regionId: string | null;
  commandClass: "reflex" | "closed_structure" | "parameterized" | "unknown" | null;
}): H4GeometricOnlyCommandResolution {
  const regionId = input.regionId ?? null;
  const commandClass = input.commandClass ?? null;

  if (commandClass === "reflex" && regionId === "pause") {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_resolution_v1",
      h4GeometricOnlyResolutionEligible: true,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionCommandClass: commandClass,
      h4GeometricOnlyResolutionCanonicalCommandText: "pause",
      h4GeometricOnlyResolutionReasonCodes: [
        "rail_delta_geometric_only_reflex",
        "canonical_reflex_command_resolved_without_parakeet",
      ],
    };
  }

  if (commandClass === "closed_structure" && regionId === "new tab") {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_resolution_v1",
      h4GeometricOnlyResolutionEligible: true,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionCommandClass: commandClass,
      h4GeometricOnlyResolutionCanonicalCommandText: "new tab",
      h4GeometricOnlyResolutionReasonCodes: [
        "rail_delta_geometric_only_closed_structure",
        "canonical_closed_structure_command_resolved_without_parakeet",
      ],
    };
  }

  return {
    h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_resolution_v1",
    h4GeometricOnlyResolutionEligible: false,
    h4GeometricOnlyResolutionRegionId: regionId,
    h4GeometricOnlyResolutionCommandClass: commandClass,
    h4GeometricOnlyResolutionCanonicalCommandText: null,
    h4GeometricOnlyResolutionReasonCodes: [
      "geometric_only_resolution_not_supported_for_region",
    ],
  };
}
