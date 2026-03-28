import System from "../main/execute/system";
import * as driver from "../main/driver/stub";

describe("System.focus timeout", () => {
  const originalTimeout = process.env.ARQON_FOCUS_TIMEOUT_MS;

  afterEach(() => {
    process.env.ARQON_FOCUS_TIMEOUT_MS = originalTimeout;
    jest.restoreAllMocks();
  });

  it("returns quickly when driver focus promise hangs", async () => {
    process.env.ARQON_FOCUS_TIMEOUT_MS = "250";
    jest.spyOn(driver, "focusApplication").mockImplementation(
      async () => new Promise<void>(() => {})
    );

    const system = new System({} as any);
    const start = Date.now();
    await system.focus("code");
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);
  });
});
