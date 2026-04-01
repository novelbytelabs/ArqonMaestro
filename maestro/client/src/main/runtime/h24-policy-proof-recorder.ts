import fs from "fs";
import path from "path";
import { H23DecisionSummary, h23Recorder } from "./h23-live-trace-recorder";
import { H23TraceStep } from "./h23-command-governor";
import { emitH3RuntimeEvidence } from "./h3-runtime-evidence";

export type H24ExecutionClass =
  | "reflex"
  | "closed_structure"
  | "parameterized_numeric"
  | "parameterized_open"
  | "unknown";

export type H24ExecutionGate =
  | "reflex_early"
  | "structural_stability"
  | "endpoint_closure"
  | "unknown";

export type H24PolicyControlState =
  | "policy_present_granted"
  | "policy_present_blocked"
  | "observe_only_missing_decision";

export interface H24ProofStageEvent {
  stage:
    | "lookup"
    | "block"
    | "dispatch_start"
    | "dispatch_complete";
  observedAtMs: number | null;
  decisionPresent: boolean;
  commandCount?: number;
  shouldBlock?: boolean;
  reason?: string | null;
}

export interface H24PolicyProofArtifact {
  chunkId: string;
  transcript: string;
  commandClass: H24ExecutionClass;
  recommendedGate: H24ExecutionGate;
  policyControlState: H24PolicyControlState;
  policyDecisionPresent: boolean;
  policyGranted: boolean | null;
  policyReason: string | null;
  numericEndpointRequired: boolean;
  firstStructuralStableAtMs: number | null;
  firstGrantedAtMs: number | null;
  endpointAtMs: number | null;
  observedExecutionAtMs: number | null;
  matchedRecommendedGate: boolean | null;
  policyControlledExecution: boolean;
  decisionContinuity: {
    decisionPresentAtExecution: boolean;
    finalStepSeenByPolicy: boolean;
    finalizationReason: string | null;
  };
  events: H24ProofStageEvent[];
  h23Decision: H23DecisionSummary | null;
  h23Trace: H23TraceStep[];
}

interface H24RecordInput {
  chunkId: string;
  transcript: string;
  stage: H24ProofStageEvent["stage"];
  h23Decision: H23DecisionSummary | null;
  commandCount?: number;
  shouldBlock?: boolean;
}

const REFLEX_TRANSCRIPTS = new Set(["stop", "cancel", "mute", "pause"]);
const CLOSED_STRUCTURE_TRANSCRIPTS = new Set([
  "focus terminal",
  "focus chrome",
  "focus code",
  "focus editor",
  "delete previous token",
  "delete previous word",
  "new tab",
]);

export default class H24PolicyProofRecorder {
  private static instance: H24PolicyProofRecorder | null = null;
  private outputDir: string;
  private records = new Map<string, H24PolicyProofArtifact>();

  public static getInstance(outputDir?: string): H24PolicyProofRecorder {
    if (!H24PolicyProofRecorder.instance) {
      H24PolicyProofRecorder.instance = new H24PolicyProofRecorder(outputDir);
    }
    return H24PolicyProofRecorder.instance;
  }

  constructor(outputDir?: string) {
    this.outputDir = outputDir ?? path.resolve(process.cwd(), "artifacts/reports/h24_policy_proofs");
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  record(input: H24RecordInput): H24PolicyProofArtifact {
    const existing = this.records.get(input.chunkId);
    const trace = h23Recorder.getTraceSnapshot(input.chunkId);
    const observedExecutionAtMs = h23Recorder.getRelativeNowMs(input.chunkId);
    const artifact = existing ?? this.createArtifact(input.chunkId, input.transcript, input.h23Decision, trace, observedExecutionAtMs);

    artifact.transcript = input.transcript || artifact.transcript;
    artifact.h23Decision = input.h23Decision;
    artifact.h23Trace = trace;
    artifact.policyDecisionPresent = Boolean(input.h23Decision);
    artifact.policyGranted = input.h23Decision?.granted ?? null;
    artifact.policyReason = input.h23Decision?.reason ?? null;
    artifact.numericEndpointRequired = input.h23Decision?.numericEndpointRequired ?? artifact.numericEndpointRequired;
    artifact.policyControlState = this.policyControlState(input.h23Decision);
    artifact.observedExecutionAtMs = observedExecutionAtMs;
    artifact.decisionContinuity = {
      decisionPresentAtExecution: Boolean(input.h23Decision),
      finalStepSeenByPolicy: Boolean(input.h23Decision?.isFinalStep),
      finalizationReason: input.h23Decision?.finalizationReason ?? null,
    };
    artifact.events.push({
      stage: input.stage,
      observedAtMs: observedExecutionAtMs,
      decisionPresent: Boolean(input.h23Decision),
      commandCount: input.commandCount,
      shouldBlock: input.shouldBlock,
      reason: input.h23Decision?.reason ?? null,
    });
    artifact.policyControlledExecution = Boolean(input.h23Decision?.granted);
    artifact.matchedRecommendedGate = this.matchedRecommendedGate(artifact);

    this.records.set(input.chunkId, artifact);
    this.write(input.chunkId, artifact);
    return artifact;
  }

  finalize(chunkId: string): H24PolicyProofArtifact | null {
    const artifact = this.records.get(chunkId);
    if (!artifact) return null;
    this.write(chunkId, artifact);
    this.records.delete(chunkId);
    return artifact;
  }

  private createArtifact(
    chunkId: string,
    transcript: string,
    decision: H23DecisionSummary | null,
    trace: H23TraceStep[],
    observedExecutionAtMs: number | null,
  ): H24PolicyProofArtifact {
    const commandClass = this.classify(transcript, decision, trace);
    const recommendedGate = this.recommendedGate(commandClass);
    const firstStructuralStable = trace.find((step) => step.structurallyStable)?.timestampMs ?? null;
    const firstGranted = trace.find((step) => step.granted)?.timestampMs ?? null;
    const endpoint = trace.length > 0 ? trace[trace.length - 1].timestampMs : null;

    return {
      chunkId,
      transcript,
      commandClass,
      recommendedGate,
      policyControlState: this.policyControlState(decision),
      policyDecisionPresent: Boolean(decision),
      policyGranted: decision?.granted ?? null,
      policyReason: decision?.reason ?? null,
      numericEndpointRequired: decision?.numericEndpointRequired ?? false,
      firstStructuralStableAtMs: firstStructuralStable,
      firstGrantedAtMs: firstGranted,
      endpointAtMs: endpoint,
      observedExecutionAtMs,
      matchedRecommendedGate: null,
      policyControlledExecution: Boolean(decision?.granted),
      decisionContinuity: {
        decisionPresentAtExecution: Boolean(decision),
        finalStepSeenByPolicy: Boolean(decision?.isFinalStep),
        finalizationReason: decision?.finalizationReason ?? null,
      },
      events: [],
      h23Decision: decision,
      h23Trace: trace,
    };
  }

  private classify(
    transcript: string,
    decision: H23DecisionSummary | null,
    trace: H23TraceStep[],
  ): H24ExecutionClass {
    const normalized = transcript.trim().toLowerCase();
    if (decision?.numericEndpointRequired) {
      return "parameterized_numeric";
    }
    if (REFLEX_TRANSCRIPTS.has(normalized)) {
      return "reflex";
    }
    if (CLOSED_STRUCTURE_TRANSCRIPTS.has(normalized)) {
      return "closed_structure";
    }
    if (normalized.startsWith("go to ") || normalized.startsWith("open ")) {
      return "parameterized_open";
    }
    const lastStepClass = trace.length > 0 ? trace[trace.length - 1].commandClass : "unknown";
    if (lastStepClass === "reflex" || lastStepClass === "closed_structure") {
      return lastStepClass;
    }
    return "unknown";
  }

  private recommendedGate(commandClass: H24ExecutionClass): H24ExecutionGate {
    switch (commandClass) {
      case "reflex":
        return "reflex_early";
      case "closed_structure":
        return "structural_stability";
      case "parameterized_numeric":
      case "parameterized_open":
        return "endpoint_closure";
      default:
        return "unknown";
    }
  }

  private policyControlState(decision: H23DecisionSummary | null): H24PolicyControlState {
    if (!decision) return "observe_only_missing_decision";
    return decision.granted ? "policy_present_granted" : "policy_present_blocked";
  }

  private matchedRecommendedGate(artifact: H24PolicyProofArtifact): boolean | null {
    const observed = artifact.observedExecutionAtMs;
    if (observed == null) return null;
    switch (artifact.recommendedGate) {
      case "reflex_early":
      case "structural_stability":
        return artifact.firstStructuralStableAtMs != null && observed >= artifact.firstStructuralStableAtMs;
      case "endpoint_closure":
        return artifact.endpointAtMs != null && observed >= artifact.endpointAtMs;
      default:
        return null;
    }
  }

  private write(chunkId: string, artifact: H24PolicyProofArtifact): void {
    const outfile = path.join(this.outputDir, `${chunkId}.json`);
    fs.writeFileSync(outfile, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    emitH3RuntimeEvidence({
      event: "h24_proof_written",
      chunkId,
      source: null,
      regionId: null,
      commandClass: artifact.commandClass,
      hadTranscriptText: null,
      transcriptText: artifact.transcript,
      routeBefore: null,
      routeAfter: null,
      tailText: null,
      mergedText: artifact.transcript,
      stepCount: artifact.h23Trace.length,
      finalGranted: artifact.policyGranted,
      reason: artifact.policyReason,
    });
  }
}

export const h24ProofRecorder = H24PolicyProofRecorder.getInstance();
