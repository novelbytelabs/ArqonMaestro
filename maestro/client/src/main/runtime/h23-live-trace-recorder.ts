import fs from "fs";
import path from "path";
import H23CommandGovernor, { H23GovernorInput, H23TraceStep } from "./h23-command-governor";
import { emitH3RuntimeEvidence } from "./h3-runtime-evidence";

export interface H23RecorderConfig {
  outputDir?: string;
  now?: () => number;
}

export interface H23FinalizeResult {
  chunkId: string;
  wroteFile: string;
  stepCount: number;
  finalGranted: boolean;
  finalReason: string | null;
}

export interface H23DecisionSummary {
  chunkId: string;
  decisionPresent: true;
  commandClass: string;
  granted: boolean;
  reason: string | null;
  numericEndpointRequired: boolean;
  stepIndex: number;
  timestampMs: number;
  isFinalStep: boolean;
  structurallyStable: boolean;
  slotClosed: boolean;
  slotStable: boolean;
  slotFinalized: boolean;
  executionEligible: boolean;
  finalizationReason: string | null;
  transcript: string;
  normalizedTranscript: string;
}

export default class H23LiveTraceRecorder {
  private static instance: H23LiveTraceRecorder | null = null;
  private governor: H23CommandGovernor;
  private outputDir: string;
  private now: () => number;
  private sessionStarts = new Map<string, number>();

  public static getInstance(config: H23RecorderConfig = {}): H23LiveTraceRecorder {
    if (!H23LiveTraceRecorder.instance) {
      H23LiveTraceRecorder.instance = new H23LiveTraceRecorder(config);
    }
    return H23LiveTraceRecorder.instance;
  }

  constructor(config: H23RecorderConfig = {}) {
    this.governor = new H23CommandGovernor();
    this.outputDir = config.outputDir ?? path.resolve(process.cwd(), "artifacts/reports/h23_live_traces");
    this.now = config.now ?? (() => Date.now());
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  startChunk(chunkId: string): void {
    this.sessionStarts.set(chunkId, this.now());
    this.governor.reset(chunkId);
  }

  recordPartial(chunkId: string, transcript: string, stepIndex: number, acousticConfidence?: number): H23TraceStep {
    const base = this.sessionStarts.get(chunkId) ?? this.now();
    return this.governor.observe({
      chunkId,
      transcript,
      stepIndex,
      timestampMs: this.now() - base,
      isFinalStep: false,
      acousticConfidence,
    });
  }

  recordFinal(chunkId: string, transcript: string, stepIndex: number, acousticConfidence?: number): H23TraceStep {
    const base = this.sessionStarts.get(chunkId) ?? this.now();
    return this.governor.observe({
      chunkId,
      transcript,
      stepIndex,
      timestampMs: this.now() - base,
      isFinalStep: true,
      acousticConfidence,
    });
  }

  getLatestDecision(chunkId: string): H23DecisionSummary | null {
    const trace = this.governor.getTrace(chunkId);
    if (trace.length === 0) return null;
    const step = trace[trace.length - 1];
    return {
      chunkId,
      decisionPresent: true,
      commandClass: step.commandClass,
      granted: step.granted,
      reason: step.reason,
      numericEndpointRequired: step.numericEndpointRequired,
      stepIndex: step.stepIndex,
      timestampMs: step.timestampMs,
      isFinalStep: step.isFinalStep,
      structurallyStable: step.structurallyStable,
      slotClosed: step.slotClosed,
      slotStable: step.slotStable,
      slotFinalized: step.slotFinalized,
      executionEligible: step.executionEligible,
      finalizationReason: step.finalizationReason,
      transcript: step.transcript,
      normalizedTranscript: step.normalizedTranscript,
    };
  }

  getTraceSnapshot(chunkId: string): H23TraceStep[] {
    return this.governor.getTrace(chunkId);
  }

  getRelativeNowMs(chunkId: string): number | null {
    const base = this.sessionStarts.get(chunkId);
    return base == null ? null : this.now() - base;
  }

  finalizeChunk(chunkId: string): H23FinalizeResult {
    const trace = this.governor.getTrace(chunkId);
    const finalStep = trace.length > 0 ? trace[trace.length - 1] : null;
    const payload = {
      chunkId,
      capturedAt: new Date().toISOString(),
      stepCount: trace.length,
      finalGranted: finalStep?.granted ?? false,
      finalReason: finalStep?.reason ?? null,
      steps: trace,
    };
    const outfile = path.join(this.outputDir, `${chunkId}.json`);
    fs.writeFileSync(outfile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    emitH3RuntimeEvidence({
      event: "h23_trace_written",
      chunkId,
      source: null,
      regionId: null,
      commandClass: finalStep?.commandClass ?? null,
      hadTranscriptText: null,
      transcriptText: finalStep?.transcript ?? null,
      routeBefore: null,
      routeAfter: null,
      tailText: null,
      mergedText: finalStep?.transcript ?? null,
      stepCount: trace.length,
      finalGranted: finalStep?.granted ?? false,
      reason: finalStep?.reason ?? null,
    });
    this.governor.reset(chunkId);
    this.sessionStarts.delete(chunkId);
    return {
      chunkId,
      wroteFile: outfile,
      stepCount: trace.length,
      finalGranted: finalStep?.granted ?? false,
      finalReason: finalStep?.reason ?? null,
    };
  }
}

export const h23Recorder = H23LiveTraceRecorder.getInstance();
