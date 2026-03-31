import H23CommandGovernor from "../../main/runtime/h23-command-governor";

describe("H23CommandGovernor parameterized gating", () => {
  const governor = new H23CommandGovernor();

  beforeEach(() => {
    // Note: If governor had a global reset all, we'd use it. 
    // Otherwise we reset by chunkId per test or create new governor.
  });

  it("grants final-only non-expandable numeric goto-line transcript", () => {
    const step = governor.observe({
      chunkId: "chunk-final-only",
      transcript: "go to line fifty two",
      stepIndex: 1,
      timestampMs: 120,
      isFinalStep: true,
      acousticConfidence: 0.99,
    });

    expect(step.commandClass).toBe("parameterized");
    expect(step.numericEndpointRequired).toBe(true);
    expect(step.granted).toBe(true);
    expect(step.reason).toBe("passed");
  });

  it("blocks parameterized command during partials and grants at final endpoint", () => {
    const chunkId = "chunk-multi-step";
    
    // Step 1: "go" (out of grammar)
    const s1 = governor.observe({ chunkId, transcript: "go", stepIndex: 1, isFinalStep: false, timestampMs: 40 });
    expect(s1.granted).toBe(false);
    expect(s1.reason).toBe("out_of_grammar");

    // Step 2: "go to line" (parameterized but no value yet)
    const s2 = governor.observe({ chunkId, transcript: "go to line", stepIndex: 2, isFinalStep: false, timestampMs: 80 });
    expect(s2.commandClass).toBe("parameterized");
    expect(s2.granted).toBe(false);

    // Step 3: "go to line fifty" (unstable value)
    const s3 = governor.observe({ chunkId, transcript: "go to line fifty", stepIndex: 3, isFinalStep: false, timestampMs: 120 });
    expect(s3.granted).toBe(false);
    expect(s3.reason).toBe("awaiting_slot_value_stability");

    // Step 4: "go to line fifty two" (final)
    const s4 = governor.observe({ chunkId, transcript: "go to line fifty two", stepIndex: 4, isFinalStep: true, timestampMs: 160 });
    expect(s4.granted).toBe(true);
    expect(s4.reason).toBe("passed");
  });

  it("grants reflex commands (like stop) immediately even in partials", () => {
    const chunkId = "chunk-reflex";
    const s1 = governor.observe({ chunkId, transcript: "stop", stepIndex: 1, isFinalStep: false, timestampMs: 40 });
    expect(s1.commandClass).toBe("reflex");
    expect(s1.granted).toBe(true);
    expect(s1.reason).toBe("passed");
  });
});

