import Phase3ABenchmarkService from "../../main/runtime/phase3a-benchmark-service";

describe("Phase3ABenchmarkService", () => {
  it("captures lane-relative latency and degraded fallback signals", () => {
    const service = new Phase3ABenchmarkService();

    service.recordLaneSample({
      lane: "command_fast",
      provider: "whisper.cpp",
      success: true,
      latencyMs: 90,
    });
    service.recordLaneSample({
      lane: "command_fast",
      provider: "whisper.cpp",
      success: false,
      latencyMs: 0,
      fallbackUsed: true,
      degraded: true,
      reason: "timeout",
    });
    service.recordLaneSample({
      lane: "dictation_accurate",
      provider: "faster-whisper/base/cpu",
      success: true,
      latencyMs: 210,
    });
    service.recordLaneSample({
      lane: "secure_speaker_aware",
      provider: "pyannote.audio",
      success: true,
      latencyMs: 180,
      contaminated: true,
      degraded: true,
    });

    const snapshot = service.getSnapshot();

    expect(snapshot.lanes.command_fast.samples).toBe(2);
    expect(snapshot.lanes.command_fast.successRate).toBe(50);
    expect(snapshot.lanes.command_fast.fallbackRate).toBe(50);
    expect(snapshot.lanes.command_fast.degradedRate).toBe(50);
    expect(snapshot.lanes.command_fast.failureReasons.timeout).toBe(1);
    expect(snapshot.lanes.dictation_accurate.samples).toBe(1);
    expect(snapshot.lanes.secure_speaker_aware.contaminationRate).toBe(100);
  });

  it("captures stage latency and route reliability frequencies", () => {
    const service = new Phase3ABenchmarkService();

    service.recordHotPathStage("dispatch_plan_ms", 9);
    service.recordHotPathStage("dispatch_plan_ms", 15);
    service.recordHotPathStage("policy_decision_ms", 11);
    service.recordHotPathStage("executor_handoff_ms", 42);
    service.recordHotPathStage("dispatch_total_ms", 56);

    service.recordRouteDecision({
      route: "focus_local",
      policyDecision: "approve_route",
      confirmationRequired: false,
      chooserRequired: false,
    });
    service.recordRouteDecision({
      route: "talon_fallback",
      policyDecision: "downgrade_route",
      confirmationRequired: true,
      chooserRequired: false,
      degraded: true,
    });
    service.recordRouteDecision({
      route: "legacy_executor",
      policyDecision: "block_route",
      confirmationRequired: false,
      chooserRequired: true,
      boundaryBlocked: true,
      degraded: true,
    });

    const snapshot = service.getSnapshot();

    expect(snapshot.hotPathStages.dispatch_plan_ms.samples).toBe(2);
    expect(snapshot.hotPathStages.dispatch_plan_ms.p95LatencyMs).toBe(15);
    expect(snapshot.routeReliability.routeSelectionFrequency.focus_local).toBe(1);
    expect(snapshot.routeReliability.routeSelectionFrequency.talon_fallback).toBe(1);
    expect(snapshot.routeReliability.policyDecisionFrequency.downgrade_route).toBe(1);
    expect(snapshot.routeReliability.fallbackFrequency).toBeCloseTo(33.33, 2);
    expect(snapshot.routeReliability.blockOrRefusalFrequency).toBeCloseTo(33.33, 2);
    expect(snapshot.routeReliability.boundaryBlockFrequency).toBeCloseTo(33.33, 2);
    expect(snapshot.routeReliability.confirmationFrequency).toBeCloseTo(33.33, 2);
    expect(snapshot.routeReliability.chooserFrequency).toBeCloseTo(33.33, 2);
    expect(snapshot.routeReliability.degradedFrequency).toBeCloseTo(66.67, 2);
  });
});
