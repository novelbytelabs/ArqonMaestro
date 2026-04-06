import {
  deriveEmptyWorkflowSkeletonInferenceState,
  deriveWorkflowSkeletonInference,
} from "../../main/runtime/workflow-skeleton-inference";

describe("workflow skeleton inference", () => {
  it("keeps all steps fixed for an exact repeated family", () => {
    const fields = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "go_to_line"],
      discoveryPatternKey: "open_file::go_to_line",
      discoveryThresholdMet: true,
      previousState: deriveEmptyWorkflowSkeletonInferenceState(),
    });

    expect(fields).toEqual(
      expect.objectContaining({
        workflowSkeletonInferenceSchemaVersion: "3j_workflow_skeleton_inference_v1",
        workflowSkeletonInferencePolicyVersion: "3j_bounded_skeleton_inference_v1",
        workflowSkeletonInferenceEligible: true,
        workflowSkeletonInferenceFamilyKey: "open_file=>go_to_line",
        workflowSkeletonInferencePatternKey: "open_file::go_to_line",
        workflowSkeletonInferenceCanonicalStepSemanticAddressIds: ["open_file", "go_to_line"],
        workflowSkeletonInferenceFixedStepIndices: [0, 1],
        workflowSkeletonInferenceVariableStepIndices: [],
        workflowSkeletonInferenceOptionalStepIndices: [],
        workflowSkeletonInferenceInferredSlotCount: 0,
        workflowSkeletonInferenceAbstractionEligible: true,
        workflowSkeletonInferenceFamilyVariantCount: 1,
        workflowSkeletonInferenceFamilySplitRequired: false,
        workflowSkeletonInferenceGovernedStateUpdated: true,
      })
    );
    expect(fields.workflowSkeletonInferenceGeneralizationConfidence).toBeGreaterThanOrEqual(0.8);
  });

  it("infers a bounded variable middle step across a family", () => {
    const first = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "run_tests", "show_panel"],
      discoveryPatternKey: "open_file::run_tests::show_panel",
      discoveryThresholdMet: true,
      previousState: deriveEmptyWorkflowSkeletonInferenceState(),
    });
    const second = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "run_benchmarks", "show_panel"],
      discoveryPatternKey: "open_file::run_benchmarks::show_panel",
      discoveryThresholdMet: true,
      previousState: first.nextState,
    });

    expect(second).toEqual(
      expect.objectContaining({
        workflowSkeletonInferenceFamilyKey: "open_file=>show_panel",
        workflowSkeletonInferenceFixedStepIndices: [0, 2],
        workflowSkeletonInferenceVariableStepIndices: [1],
        workflowSkeletonInferenceOptionalStepIndices: [],
        workflowSkeletonInferenceInferredSlotCount: 1,
        workflowSkeletonInferenceAbstractionEligible: true,
        workflowSkeletonInferenceFamilyVariantCount: 2,
        workflowSkeletonInferenceFamilySplitRequired: false,
      })
    );
  });

  it("infers a bounded optional step when the longer sequence cleanly removes one step", () => {
    const first = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "focus_editor", "go_to_line"],
      discoveryPatternKey: "open_file::focus_editor::go_to_line",
      discoveryThresholdMet: true,
      previousState: deriveEmptyWorkflowSkeletonInferenceState(),
    });
    const second = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "go_to_line"],
      discoveryPatternKey: "open_file::go_to_line",
      discoveryThresholdMet: true,
      previousState: first.nextState,
    });

    expect(second).toEqual(
      expect.objectContaining({
        workflowSkeletonInferenceFamilyKey: "open_file=>go_to_line",
        workflowSkeletonInferenceCanonicalStepSemanticAddressIds: ["open_file", "focus_editor", "go_to_line"],
        workflowSkeletonInferenceFixedStepIndices: [0, 2],
        workflowSkeletonInferenceVariableStepIndices: [],
        workflowSkeletonInferenceOptionalStepIndices: [1],
        workflowSkeletonInferenceInferredSlotCount: 0,
        workflowSkeletonInferenceAbstractionEligible: true,
        workflowSkeletonInferenceFamilyVariantCount: 2,
        workflowSkeletonInferenceFamilySplitRequired: false,
      })
    );
  });

  it("requires family split when multiple unstable positions vary", () => {
    const first = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "focus_editor", "go_to_line", "run_tests"],
      discoveryPatternKey: "open_file::focus_editor::go_to_line::run_tests",
      discoveryThresholdMet: true,
      previousState: deriveEmptyWorkflowSkeletonInferenceState(),
    });
    const second = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: ["open_file", "show_outline", "open_symbol", "run_tests"],
      discoveryPatternKey: "open_file::show_outline::open_symbol::run_tests",
      discoveryThresholdMet: true,
      previousState: first.nextState,
    });

    expect(second).toEqual(
      expect.objectContaining({
        workflowSkeletonInferenceFamilyKey: "open_file=>run_tests",
        workflowSkeletonInferenceAbstractionEligible: false,
        workflowSkeletonInferenceFamilyVariantCount: 2,
        workflowSkeletonInferenceFamilySplitRequired: true,
      })
    );
    expect(second.workflowSkeletonInferenceGeneralizationConfidence).toBeLessThan(0.6);
  });
});
