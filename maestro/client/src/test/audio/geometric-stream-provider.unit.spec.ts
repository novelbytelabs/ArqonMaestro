import GeometricStreamProvider from "../../main/stt/geometric-stream-provider";

describe("GeometricStreamProvider", () => {
  it("is ready when enabled and sidecar url is present", () => {
    const provider = new GeometricStreamProvider({
      enabled: true,
      sidecarUrl: "http://127.0.0.1:5003/detect_stream",
    });

    expect(provider.isReady()).toBe(true);
  });

  it("is unavailable when disabled", () => {
    const provider = new GeometricStreamProvider({ enabled: false });
    expect(provider.isReady()).toBe(false);
    expect(provider.getLoadError()).toBe("provider_disabled");
  });
});
