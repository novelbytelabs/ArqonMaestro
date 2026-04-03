import { deriveCounterfactualRepairEvidenceFields } from "../../main/runtime/counterfactual-repair-intelligence";

describe("counterfactual repair intelligence", () => {
  it("derives candidate population metadata for nearest alternatives", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_github",
      canonicalMergedText: "open github.com",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open github.com",
      eventName: "voice_semantic_address_lookup_completed",
    });

    expect(result.counterfactualRepairEligible).toBe(true);
    expect(result.counterfactualRepairSelectionFunctionVersion).toBe("3g_selection_function_v1");
    expect(result.counterfactualRepairCandidatePopulationSize).toBe(2);
    expect(result.counterfactualRepairTopCandidateSemanticAddressIds).toEqual([
      "open_github",
      "open_github_counterfactual_go_to",
    ]);
    expect(result.counterfactualRepairSelectionWinnerSemanticAddressId).toBe("open_github");
    expect(result.counterfactualRepairTopCandidateNormalizedScores?.[0]).toBeGreaterThan(
      result.counterfactualRepairTopCandidateNormalizedScores?.[1] ?? 0
    );
  });

  it("derives DEAD detection for self-correction restart speech", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_docs",
      canonicalMergedText: "open docs.python.org",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open do- docs.python.org",
      eventName: "voice_semantic_address_lookup_completed",
    });

    expect(result.counterfactualRepairRepairSignal).toBe("self_correction_hint");
    expect(result.counterfactualRepairDeadDetected).toBe(true);
    expect(result.counterfactualRepairDeadReason).toBe("trajectory_restart_detected");
    expect(result.counterfactualRepairStressEvent).toBe("metabolic_repair_observed");
    expect(result.counterfactualRepairOuroborosEvent).toBe("ouroboros_repair_observed");
  });

  it("captures counterexample placeholder metadata on rejection path without semantic result", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: null,
      canonicalMergedText: null,
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open settings",
      eventName: "open_tail_rejected",
      reason: "recognition_failed_shadow_capture",
      finalGranted: false,
    });

    expect(result.counterfactualRepairEligible).toBe(true);
    expect(result.counterfactualRepairCounterexampleCaptured).toBe(true);
    expect(result.counterfactualRepairCounterexampleKind).toBe("recognition_rejection");
    expect(result.counterfactualRepairAntibodyEligible).toBe(true);
    expect(result.counterfactualRepairAntibodyHint).toBe("antibody_placeholder_recognition_rejection");
    expect(result.counterfactualRepairStressBand).toBe("critical");
    expect(result.counterfactualRepairSource).toBe("failure_observer");
  });

  it("derives ambiguity pilot escalation for close nearest alternatives", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_settings",
      canonicalMergedText: "open settings",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open settings",
      eventName: "voice_semantic_address_lookup_completed",
    });

    expect(result.counterfactualRepairAmbiguityPilotVersion).toBe("3g_nearest_alternative_ambiguity_v1");
    expect(result.counterfactualRepairAmbiguityPilotApplied).toBe(true);
    expect(result.counterfactualRepairAmbiguityPrimaryScore).toBeGreaterThan(
      result.counterfactualRepairAmbiguityAlternativeScore ?? 0
    );
    expect(result.counterfactualRepairAmbiguityScoreGap).toBeLessThanOrEqual(0.12);
    expect(result.counterfactualRepairAmbiguityEscalationSuggested).toBe(true);
    expect(result.counterfactualRepairAmbiguityEscalationKind).toBe("request_disambiguation");
    expect(result.counterfactualRepairAmbiguityReasonCodes).toContain("counterfactual_ambiguity_close_gap");
  });


  it("does not auto-mint counterexample metadata for DEAD restart observations", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_docs",
      canonicalMergedText: "open docs.python.org",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open do- docs.python.org",
      eventName: "voice_semantic_address_lookup_completed",
    });

    expect(result.counterfactualRepairDeadDetected).toBe(true);
    expect(result.counterfactualRepairCounterexampleCaptured).toBe(false);
    expect(result.counterfactualRepairAntibodyEligible).toBe(false);
    expect(result.counterfactualRepairStressEvent).toBe("metabolic_repair_observed");
  });

  it("derives repair-signal pilot metadata for self-correction restarts", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "open_docs",
      canonicalMergedText: "open docs.python.org",
      regionId: "open",
      commandClass: "parameterized",
      parameterType: "open",
      transcriptText: "open do- docs.python.org",
      eventName: "voice_semantic_address_lookup_completed",
    });

    expect(result.counterfactualRepairSignalPilotVersion).toBe("3g_repair_signal_pilot_v1");
    expect(result.counterfactualRepairSignalPilotApplied).toBe(true);
    expect(result.counterfactualRepairSignalTrajectoryState).toBe("restart");
    expect(result.counterfactualRepairSignalAbortedTrajectoryDetected).toBe(true);
    expect(result.counterfactualRepairSignalSelfCorrectionDetected).toBe(true);
    expect(result.counterfactualRepairSignalDirectionReversalDetected).toBe(false);
    expect(result.counterfactualRepairSignalRepairWindowOpen).toBe(true);
    expect(result.counterfactualRepairSignalEscalationSuggested).toBe(true);
    expect(result.counterfactualRepairSignalEscalationKind).toBe("hold_for_repair");
    expect(result.counterfactualRepairSignalReasonCodes).toContain("counterfactual_repair_signal_restart");
  });

  it("derives repair-signal pilot metadata for spoken reversals", () => {
    const result = deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: "go_to_line_52",
      canonicalMergedText: "go to line 52",
      regionId: "go_to",
      commandClass: "parameterized",
      parameterType: "numeric",
      transcriptText: "go to li- no go to line 52",
      eventName: "voice_semantic_address_lookup_completed",
    });

    expect(result.counterfactualRepairRepairSignal).toBe("spoken_reversal_hint");
    expect(result.counterfactualRepairSignalPilotApplied).toBe(true);
    expect(result.counterfactualRepairSignalTrajectoryState).toBe("reversal");
    expect(result.counterfactualRepairSignalDirectionReversalDetected).toBe(true);
    expect(result.counterfactualRepairSignalSelfCorrectionDetected).toBe(false);
    expect(result.counterfactualRepairSignalEscalationKind).toBe("hold_for_repair");
  });

});
