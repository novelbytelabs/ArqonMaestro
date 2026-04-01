export interface GeometricRoutingDecision {
  enabled: boolean;
  route: "legacy_text" | "geometric_only" | "geometric_prefix_asr_tail";
  reason: string;
}

export default class GeometricRoutingService {
  private enabled = process.env.H3_GEOMETRIC_ENABLED === "true";

  decide(input: { regionId: string | null; commandClass: "reflex" | "closed_structure" | "parameterized" | "unknown" }): GeometricRoutingDecision {
    if (!this.enabled) {
      return {
        enabled: false,
        route: "legacy_text",
        reason: "H3_GEOMETRIC_ENABLED is not true",
      };
    }

    if (input.commandClass === "reflex" || input.commandClass === "closed_structure") {
      return {
        enabled: true,
        route: "geometric_only",
        reason: `geometric classification sufficient for ${input.commandClass}`,
      };
    }

    if (input.commandClass === "parameterized") {
      return {
        enabled: true,
        route: "geometric_prefix_asr_tail",
        reason: "parameterized prefix captured geometrically; ASR tail required",
      };
    }

    return {
      enabled: true,
      route: "legacy_text",
      reason: "no geometric region captured yet",
    };
  }
}
