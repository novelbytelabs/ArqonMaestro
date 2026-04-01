import fs from "fs";
import path from "path";
import H23CommandGovernor, { H23GovernorInput, H23TraceStep } from "./h23-command-governor";

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
  commandClass: string;
  granted: boolean;
  reason: string | null;
  numericEndpointRequired: boolean;
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
      commandClass: step.commandClass,
      granted: step.granted,
      reason: step.reason,
      numericEndpointRequired: step.numericEndpointRequired,
    };
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
