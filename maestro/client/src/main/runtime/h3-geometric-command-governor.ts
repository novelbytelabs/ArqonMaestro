import { H23CommandClass, H23TraceStep } from "./h23-command-governor";

export interface H3GeometricGovernorInput {
  chunkId: string;
  stepIndex: number;
  timestampMs: number;
  isFinalStep: boolean;
  regionId: string | null;
  regionScore: number;
  driftScore: number;
  velocityConverged: boolean;
  frameCount: number;
  transcriptTail?: string;
  acousticConfidence?: number;
}

interface GeometricCommandSpec {
  canonical: string;
  commandClass: H23CommandClass;
  structuralPrefix: string;
  minFrames: number;
  captureThreshold: number;
  paramType?: "numeric" | "open";
}

interface ChunkState {
  chunkId: string;
  lastStructuralPrefix: string | null;
  prefixHistory: string[];
  slotHistory: Array<string | null>;
  steps: H23TraceStep[];
}

const DIGIT_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const EXPANDABLE_NUMBER_TAIL_WORDS = new Set([
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
  "hundred",
  "thousand",
]);

const COMMAND_ATLAS: Record<string, GeometricCommandSpec> = {
  pause: {
    canonical: "pause",
    commandClass: "reflex",
    structuralPrefix: "pause",
    minFrames: 2,
    captureThreshold: 0.82,
  },
  stop: {
    canonical: "stop",
    commandClass: "reflex",
    structuralPrefix: "stop",
    minFrames: 2,
    captureThreshold: 0.82,
  },
  cancel: {
    canonical: "cancel",
    commandClass: "reflex",
    structuralPrefix: "cancel",
    minFrames: 2,
    captureThreshold: 0.82,
  },
  "focus chrome": {
    canonical: "focus chrome",
    commandClass: "closed_structure",
    structuralPrefix: "focus chrome",
    minFrames: 4,
    captureThreshold: 0.80,
  },
  "new tab": {
    canonical: "new tab",
    commandClass: "closed_structure",
    structuralPrefix: "new tab",
    minFrames: 3,
    captureThreshold: 0.80,
  },
  "delete previous word": {
    canonical: "delete previous word",
    commandClass: "closed_structure",
    structuralPrefix: "delete previous word",
    minFrames: 5,
    captureThreshold: 0.80,
  },
  "go to line": {
    canonical: "go to line",
    commandClass: "parameterized",
    structuralPrefix: "go to line",
    minFrames: 3,
    captureThreshold: 0.78,
    paramType: "numeric",
  },
  "go to": {
    canonical: "go to",
    commandClass: "parameterized",
    structuralPrefix: "go to",
    minFrames: 2,
    captureThreshold: 0.76,
    paramType: "open",
  },
};

export default class H3GeometricCommandGovernor {
  private states = new Map<string, ChunkState>();
  private driftAbortThreshold = 0.35;

  observe(input: H3GeometricGovernorInput): H23TraceStep {
    const state = this.getState(input.chunkId);
    const spec = input.regionId ? COMMAND_ATLAS[input.regionId] ?? null : null;
    const commandClass: H23CommandClass = spec?.commandClass ?? "unknown";
    const structuralPrefix = spec?.structuralPrefix ?? (input.regionId ?? "unknown");

    const transcript = this.composeTranscript(spec, input.transcriptTail);
    const normalizedTranscript = transcript.trim().toLowerCase();
    const slots = this.extractSlots(spec, input.transcriptTail ?? "");
    const slotClosed = this.slotClosureSatisfied(spec, slots);
    const slotSignature = this.slotSignatureFromSlots(slots);

    const regionCaptured = Boolean(
      spec && input.regionScore >= spec.captureThreshold && input.frameCount >= spec.minFrames
    );
    const structurallyStable =
      commandClass === "reflex"
        ? regionCaptured
        : Boolean(regionCaptured && input.velocityConverged && input.driftScore <= this.driftAbortThreshold);

    const slotRun = slotSignature
      ? this.consecutiveTailMatchCount([...state.slotHistory, slotSignature])
      : 0;
    const slotStable =
      commandClass === "parameterized"
        ? (slotRun >= 2 || Boolean(input.isFinalStep && slotClosed))
        : true;

    const numericEndpointRequired = spec?.paramType === "numeric";
    const numericPhraseNonExpandableHint = this.numericPhraseNonExpandableHint(slots);
    const slotFinalized =
      commandClass === "parameterized"
        ? Boolean(input.isFinalStep && structurallyStable && slotClosed && slotStable)
        : commandClass !== "unknown";

    const executionEligible =
      commandClass === "reflex" || commandClass === "closed_structure"
        ? structurallyStable
        : commandClass === "parameterized"
          ? structurallyStable && slotClosed && slotStable && slotFinalized
          : false;

    const acousticConfidence = input.acousticConfidence ?? Math.max(0.0, Math.min(1.0, input.regionScore));
    const granted = Boolean(executionEligible && commandClass !== "unknown" && acousticConfidence >= 0.75);

    const step: H23TraceStep = {
      chunkId: input.chunkId,
      transcript,
      normalizedTranscript,
      stepIndex: input.stepIndex,
      timestampMs: input.timestampMs,
      isFinalStep: input.isFinalStep,
      commandClass,
      structuralPrefix,
      structurallyStable,
      slotClosed,
      slotSignature,
      slotStable,
      slotFinalized,
      numericEndpointRequired,
      numericPhraseNonExpandableHint,
      executionEligible,
      granted,
      reason: this.reasonFor({
        commandClass,
        structurallyStable,
        slotClosed,
        slotStable,
        slotFinalized,
        numericEndpointRequired,
        acousticConfidence,
        granted,
      }),
      finalizationReason:
        commandClass === "reflex" || commandClass === "closed_structure"
          ? "not_required_for_class"
          : slotFinalized
            ? "numeric_endpoint_finalization"
            : null,
      slots,
    };

    state.lastStructuralPrefix = structuralPrefix;
    state.prefixHistory.push(structuralPrefix);
    state.slotHistory.push(slotSignature);
    state.steps.push(step);
    return step;
  }

  getTrace(chunkId: string): H23TraceStep[] {
    return [...(this.states.get(chunkId)?.steps ?? [])];
  }

  reset(chunkId: string): void {
    this.states.delete(chunkId);
  }

  private getState(chunkId: string): ChunkState {
    const existing = this.states.get(chunkId);
    if (existing) {
      return existing;
    }
    const created: ChunkState = {
      chunkId,
      lastStructuralPrefix: null,
      prefixHistory: [],
      slotHistory: [],
      steps: [],
    };
    this.states.set(chunkId, created);
    return created;
  }

  private composeTranscript(spec: GeometricCommandSpec | null, tail?: string): string {
    if (!spec) return "<geometric:unknown>";
    if (spec.commandClass !== "parameterized") {
      return `<geometric:${spec.canonical}>`;
    }
    const cleanTail = (tail ?? "").trim();
    return cleanTail ? `${spec.canonical} ${cleanTail}` : spec.canonical;
  }

  private extractSlots(spec: GeometricCommandSpec | null, tail: string): Record<string, unknown> {
    if (!spec || spec.commandClass !== "parameterized") {
      return { command_family: null, required_slots_present: true };
    }

    const trimmed = tail.trim().toLowerCase();
    if (spec.structuralPrefix === "go to line") {
      const value = this.wordsToInt(trimmed);
      return {
        command_family: "goto_line",
        line_number_raw: trimmed,
        line_number: value,
        required_slots_present: value !== null,
      };
    }

    if (spec.structuralPrefix === "go to") {
      const normalized = trimmed.replace(/ dot /g, ".");
      return {
        command_family: "goto_open",
        target_raw: trimmed,
        target: normalized || null,
        required_slots_present: Boolean(normalized),
      };
    }

    return { command_family: null, required_slots_present: false };
  }

  private slotClosureSatisfied(spec: GeometricCommandSpec | null, slots: Record<string, unknown>): boolean {
    if (!spec || spec.commandClass === "reflex" || spec.commandClass === "closed_structure") {
      return spec != null;
    }
    return Boolean(slots.required_slots_present);
  }

  private slotSignatureFromSlots(slots: Record<string, unknown>): string | null {
    switch (slots.command_family) {
      case "goto_line":
        return slots.line_number != null ? `goto_line:${String(slots.line_number)}` : null;
      case "goto_open":
        return slots.target ? `goto_open:${String(slots.target)}` : null;
      default:
        return null;
    }
  }

  private numericPhraseNonExpandableHint(slots: Record<string, unknown>): boolean {
    const raw = String(slots.line_number_raw ?? "").trim().toLowerCase();
    if (!raw) return false;
    const lastToken = raw.split(/\s+/).pop() ?? "";
    return !EXPANDABLE_NUMBER_TAIL_WORDS.has(lastToken);
  }

  private reasonFor(args: {
    commandClass: H23CommandClass;
    structurallyStable: boolean;
    slotClosed: boolean;
    slotStable: boolean;
    slotFinalized: boolean;
    numericEndpointRequired: boolean;
    acousticConfidence: number;
    granted: boolean;
  }): H23TraceStep["reason"] {
    if (args.commandClass === "unknown") return "out_of_grammar";
    if (!args.structurallyStable) return "awaiting_structural_stability";
    if (args.commandClass === "parameterized" && !args.slotClosed) return "awaiting_required_slot_closure";
    if (args.commandClass === "parameterized" && !args.slotStable) return "awaiting_slot_value_stability";
    if (args.numericEndpointRequired && !args.slotFinalized) return "awaiting_endpoint_closure";
    if (args.acousticConfidence < 0.75) return "low_confidence";
    return args.granted ? "passed" : "out_of_grammar";
  }

  private consecutiveTailMatchCount(values: Array<string | null>): number {
    if (values.length === 0) return 0;
    const last = values[values.length - 1];
    let count = 0;
    for (let i = values.length - 1; i >= 0; i -= 1) {
      if (values[i] === last) count += 1;
      else break;
    }
    return count;
  }

  private wordsToInt(text: string): number | null {
    const tokens = text.split(/[\s-]+/).filter(Boolean);
    if (tokens.length === 0) return null;
    let total = 0;
    for (const tok of tokens) {
      const value = DIGIT_WORDS[tok];
      if (value == null) return null;
      total += value;
    }
    return total > 0 ? total : null;
  }
}
