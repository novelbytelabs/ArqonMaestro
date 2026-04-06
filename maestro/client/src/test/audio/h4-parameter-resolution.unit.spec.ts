import { deriveH4ParameterizedCommandResolution } from "../../main/runtime/h4-parameter-resolution";

describe("H4 parameter-only tail resolution", () => {
  test("uses the rail-derived prefix for open commands and only the resolved parameter from the tail", () => {
    const result = deriveH4ParameterizedCommandResolution({
      prefixRegionId: "go to",
      parameterType: "open",
      openNormalized: "wikipedia.org",
    });

    expect(result.h4ParameterizedResolutionEligible).toBe(true);
    expect(result.h4ParameterizedResolutionCanonicalPrefix).toBe("go to");
    expect(result.h4ParameterizedResolutionPrefixSource).toBe("rail_delta_region");
    expect(result.h4ParameterizedResolutionParameterSource).toBe("parakeet_tail_only");
    expect(result.h4ParameterizedResolutionCanonicalCommandText).toBe("go to wikipedia.org");
    expect(result.h4ParameterizedResolutionParameterOnly).toBe(true);
  });

  test("uses the rail-derived prefix for numeric commands and only the resolved numeric parameter", () => {
    const result = deriveH4ParameterizedCommandResolution({
      prefixRegionId: "go to line",
      parameterType: "numeric",
      numericNormalized: "42",
    });

    expect(result.h4ParameterizedResolutionEligible).toBe(true);
    expect(result.h4ParameterizedResolutionCanonicalCommandText).toBe("go to line 42");
    expect(result.h4ParameterizedResolutionResolvedParameter).toBe("42");
  });

  test("stays ineligible when the prefix region is unsupported", () => {
    const result = deriveH4ParameterizedCommandResolution({
      prefixRegionId: "pause",
      parameterType: "open",
      openNormalized: "example.com",
    });

    expect(result.h4ParameterizedResolutionEligible).toBe(false);
    expect(result.h4ParameterizedResolutionCanonicalCommandText).toBeNull();
    expect(result.h4ParameterizedResolutionReasonCodes).toContain(
      "unsupported_prefix_region_for_parameter_only_resolution"
    );
  });
});
