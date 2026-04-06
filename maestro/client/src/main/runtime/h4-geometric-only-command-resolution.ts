export interface H4GeometricOnlyCommandResolution {
  h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1";
  h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2";
  h4GeometricOnlyResolutionEligible: boolean;
  h4GeometricOnlyResolutionCanonicalCommandText: string | null;
  h4GeometricOnlyResolutionCommandClass: "reflex" | "closed_structure" | null;
  h4GeometricOnlyResolutionRegionId: string | null;
  h4GeometricOnlyResolutionSource: "geometric_sidecar" | "parakeet_sidecar_geometric";
  h4GeometricOnlyResolutionAtlasSchema: string | null;
  h4GeometricOnlyResolutionAtlasValidatedV1: boolean | null;
  h4GeometricOnlyResolutionReasonCodes: string[];
}

const PARAMETERIZED_REGIONS = new Set(["go to line", "go to", "open"]);
const VALIDATED_V1_GEOMETRIC_ONLY_COMMANDS = new Map<string, string>([
  ["pause", "pause"],
  ["new tab", "new tab"],
  ["focus chrome", "focus chrome"],
]);

export function deriveH4GeometricOnlyCommandResolution(input: {
  regionId: string | null;
  commandClass: "reflex" | "closed_structure" | "parameterized" | "unknown" | null;
  source?: "geometric_sidecar" | "parakeet_sidecar_geometric";
  atlasSchema?: string | null;
}): H4GeometricOnlyCommandResolution {
  const source = input.source ?? "geometric_sidecar";
  const regionId = (input.regionId ?? "").trim().toLowerCase();
  const commandClass = input.commandClass;
  const atlasSchema = input.atlasSchema ?? null;
  const atlasValidatedV1 =
    atlasSchema == null ? null : atlasSchema === "h3_command_atlas_v1";

  if (!regionId) {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: null,
      h4GeometricOnlyResolutionRegionId: null,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionAtlasSchema: atlasSchema,
      h4GeometricOnlyResolutionAtlasValidatedV1: atlasValidatedV1,
      h4GeometricOnlyResolutionReasonCodes: ["missing_region_id"],
    };
  }

  if (commandClass !== "reflex" && commandClass !== "closed_structure") {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: null,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionAtlasSchema: atlasSchema,
      h4GeometricOnlyResolutionAtlasValidatedV1: atlasValidatedV1,
      h4GeometricOnlyResolutionReasonCodes: ["command_class_not_geometric_only"],
    };
  }

  if (PARAMETERIZED_REGIONS.has(regionId)) {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: commandClass,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionAtlasSchema: atlasSchema,
      h4GeometricOnlyResolutionAtlasValidatedV1: atlasValidatedV1,
      h4GeometricOnlyResolutionReasonCodes: ["parameterized_region_requires_tail_resolution"],
    };
  }

  if (atlasSchema !== null && atlasSchema !== "h3_command_atlas_v1") {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: commandClass,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionAtlasSchema: atlasSchema,
      h4GeometricOnlyResolutionAtlasValidatedV1: atlasValidatedV1,
      h4GeometricOnlyResolutionReasonCodes: ["atlas_schema_not_validated_v1"],
    };
  }

  const canonicalCommandText = VALIDATED_V1_GEOMETRIC_ONLY_COMMANDS.get(regionId);
  if (!canonicalCommandText) {
    return {
      h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
      h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
      h4GeometricOnlyResolutionEligible: false,
      h4GeometricOnlyResolutionCanonicalCommandText: null,
      h4GeometricOnlyResolutionCommandClass: commandClass,
      h4GeometricOnlyResolutionRegionId: regionId,
      h4GeometricOnlyResolutionSource: source,
      h4GeometricOnlyResolutionAtlasSchema: atlasSchema,
      h4GeometricOnlyResolutionAtlasValidatedV1: atlasValidatedV1,
      h4GeometricOnlyResolutionReasonCodes: ["unsupported_geometric_only_region"],
    };
  }

  return {
    h4GeometricOnlyResolutionSchemaVersion: "h4_geometric_only_command_resolution_v1",
    h4GeometricOnlyResolutionPolicyVersion: "h4_geometric_only_legality_map_v2",
    h4GeometricOnlyResolutionEligible: true,
    h4GeometricOnlyResolutionCanonicalCommandText: canonicalCommandText,
    h4GeometricOnlyResolutionCommandClass: commandClass,
    h4GeometricOnlyResolutionRegionId: regionId,
    h4GeometricOnlyResolutionSource: source,
    h4GeometricOnlyResolutionAtlasSchema: atlasSchema,
    h4GeometricOnlyResolutionAtlasValidatedV1: atlasValidatedV1,
    h4GeometricOnlyResolutionReasonCodes: ["validated_v1_geometric_only_region_allowlisted"],
  };
}
