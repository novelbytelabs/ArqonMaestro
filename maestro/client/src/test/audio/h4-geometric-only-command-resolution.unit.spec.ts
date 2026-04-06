import { deriveH4GeometricOnlyCommandResolution } from "../../main/runtime/h4-geometric-only-command-resolution";

describe("deriveH4GeometricOnlyCommandResolution", () => {
  test("resolves pause reflex without parakeet", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "pause",
      commandClass: "reflex",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(true);
    expect(result.h4GeometricOnlyResolutionCanonicalCommandText).toBe("pause");
  });

  test("resolves new tab closed structure without parakeet", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "new tab",
      commandClass: "closed_structure",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(true);
    expect(result.h4GeometricOnlyResolutionCanonicalCommandText).toBe("new tab");
  });

  test("rejects parameterized region", () => {
    const result = deriveH4GeometricOnlyCommandResolution({
      regionId: "go to",
      commandClass: "parameterized",
    });

    expect(result.h4GeometricOnlyResolutionEligible).toBe(false);
    expect(result.h4GeometricOnlyResolutionCanonicalCommandText).toBeNull();
  });
});

export {};
