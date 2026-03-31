export type H23CommandClass = "reflex" | "closed_structure" | "parameterized" | "unknown";

export interface H23GovernorInput {
  chunkId: string;
  transcript: string;
  stepIndex: number;
  timestampMs: number;
  isFinalStep: boolean;
  acousticConfidence?: number;
}

export interface H23TraceStep {
  chunkId: string;
  transcript: string;
  normalizedTranscript: string;
  stepIndex: number;
  timestampMs: number;
  isFinalStep: boolean;
  commandClass: H23CommandClass;
  structuralPrefix: string;
  structurallyStable: boolean;
  slotClosed: boolean;
  slotSignature: string | null;
  slotStable: boolean;
  slotFinalized: boolean;
  numericEndpointRequired: boolean;
  numericPhraseNonExpandableHint: boolean;
  executionEligible: boolean;
  granted: boolean;
  reason:
    | "passed"
    | "out_of_grammar"
    | "awaiting_structural_stability"
    | "awaiting_required_slot_closure"
    | "awaiting_slot_value_stability"
    | "awaiting_endpoint_closure"
    | "low_confidence";
  finalizationReason: "not_required_for_class" | "numeric_endpoint_finalization" | null;
  slots: Record<string, unknown>;
}

interface ChunkState {
  chunkId: string;
  prefixHistory: string[];
  slotHistory: Array<string | null>;
  transcriptHistory: string[];
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

export default class H23CommandGovernor {
  private states = new Map<string, ChunkState>();

  observe(input: H23GovernorInput): H23TraceStep {
    const state = this.getState(input.chunkId);
    const normalizedTranscript = input.transcript.trim().toLowerCase();
    const commandClass = this.classifyCommandText(normalizedTranscript);
    const structuralPrefix = this.structuralPrefix(normalizedTranscript);
    const slots = this.extractSlots(normalizedTranscript);
    const slotClosed = this.slotClosureSatisfied(commandClass, slots);
    const slotSignature = this.slotSignatureFromSlots(slots);

    const structuralRun = this.consecutiveTailMatchCount([...state.prefixHistory, structuralPrefix]);
    const structuralStabilizedOnFinal =
      input.isFinalStep &&
      commandClass === "parameterized" &&
      slotClosed &&
      this.numericPhraseNonExpandableHint(slots);
    const structurallyStable =
      structuralRun >= this.requiredStructuralMatches(commandClass) || structuralStabilizedOnFinal;

    const slotRun = slotSignature
      ? this.consecutiveTailMatchCount([...state.slotHistory, slotSignature])
      : 0;
    const slotStable = (slotRun >= this.requiredSlotMatches(commandClass)) || (input.isFinalStep && slotClosed);

    const numericEndpointRequired = commandClass === "parameterized" && this.isNumericParameterizedCommand(slots);
    const numericPhraseNonExpandableHint = this.numericPhraseNonExpandableHint(slots);

    const slotFinalized =
      commandClass === "reflex" || commandClass === "closed_structure"
        ? true
        : numericEndpointRequired
          ? Boolean(input.isFinalStep && structurallyStable && slotClosed && slotStable)
          : false;

    const executionEligible =
      commandClass === "reflex" || commandClass === "closed_structure"
        ? structurallyStable
        : commandClass === "parameterized"
          ? structurallyStable && slotClosed && slotStable && slotFinalized
          : false;

    const acousticConfidence = input.acousticConfidence ?? 0.99;
    const granted = Boolean(
      executionEligible &&
      commandClass !== "unknown" &&
      acousticConfidence >= 0.9
    );

    const reason = this.reasonFor({
      commandClass,
      structurallyStable,
      slotClosed,
      slotStable,
      slotFinalized,
      numericEndpointRequired,
      acousticConfidence,
      granted,
    });

    const step: H23TraceStep = {
      chunkId: input.chunkId,
      transcript: input.transcript,
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
      reason,
      finalizationReason:
        commandClass === "reflex" || commandClass === "closed_structure"
          ? "not_required_for_class"
          : slotFinalized
            ? "numeric_endpoint_finalization"
            : null,
      slots,
    };

    state.prefixHistory.push(structuralPrefix);
    state.slotHistory.push(slotSignature);
    state.transcriptHistory.push(normalizedTranscript);
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
      prefixHistory: [],
      slotHistory: [],
      transcriptHistory: [],
      steps: [],
    };
    this.states.set(chunkId, created);
    return created;
  }

  private classifyCommandText(t: string): H23CommandClass {
    if (["stop", "cancel", "mute"].includes(t)) return "reflex";
    if (["focus terminal", "delete previous token", "focus editor", "delete previous word"].includes(t)) {
      return "closed_structure";
    }
    if (
      t.startsWith("go to line") ||
      t.startsWith("switch tab") ||
      t.startsWith("scroll down")
    ) {
      return "parameterized";
    }
    return "unknown";
  }

  private structuralPrefix(t: string): string {
    if (t.startsWith("go to line")) return "go to line";
    if (t.startsWith("switch tab")) return "switch tab";
    if (t.startsWith("scroll down")) return "scroll down";
    if (t.startsWith("focus terminal")) return "focus terminal";
    if (t.startsWith("delete previous token")) return "delete previous token";
    if (["stop", "cancel", "mute"].includes(t)) return t;
    return t;
  }

  private extractSlots(t: string): Record<string, unknown> {
    if (t.startsWith("go to line")) {
      const raw = t.slice("go to line".length).trim();
      const value = this.wordsToInt(raw);
      return { command_family: "goto_line", line_number_raw: raw, line_number: value, required_slots_present: value !== null };
    }
    if (t.startsWith("switch tab")) {
      const raw = t.slice("switch tab".length).trim();
      const value = this.wordsToInt(raw);
      return { command_family: "switch_tab", tab_number_raw: raw, tab_number: value, required_slots_present: value !== null };
    }
    if (t.startsWith("scroll down")) {
      const raw = t.slice("scroll down".length).trim();
      const matched = raw.match(/(.+?)\s+lines?$/);
      const numberPhrase = matched?.[1] ?? raw;
      const value = this.wordsToInt(numberPhrase);
      return { command_family: "scroll_down", count_raw: raw, count: value, required_slots_present: value !== null };
    }
    return { command_family: null, required_slots_present: true };
  }

  private slotClosureSatisfied(commandClass: H23CommandClass, slots: Record<string, unknown>): boolean {
    if (commandClass === "reflex" || commandClass === "closed_structure") {
      return true;
    }
    return Boolean(slots.required_slots_present);
  }

  private slotSignatureFromSlots(slots: Record<string, unknown>): string | null {
    switch (slots.command_family) {
      case "goto_line":
        return slots.line_number != null ? `goto_line:${String(slots.line_number)}` : null;
      case "switch_tab":
        return slots.tab_number != null ? `switch_tab:${String(slots.tab_number)}` : null;
      case "scroll_down":
        return slots.count != null ? `scroll_down:${String(slots.count)}` : null;
      default:
        return null;
    }
  }

  private isNumericParameterizedCommand(slots: Record<string, unknown>): boolean {
    return ["goto_line", "switch_tab", "scroll_down"].includes(String(slots.command_family ?? ""));
  }

  private numericPhraseNonExpandableHint(slots: Record<string, unknown>): boolean {
    const raw = String(slots.line_number_raw ?? slots.tab_number_raw ?? slots.count_raw ?? "").trim().toLowerCase();
    if (!raw) return false;
    const lastToken = raw.split(/\s+/).pop() ?? "";
    return !EXPANDABLE_NUMBER_TAIL_WORDS.has(lastToken);
  }

  private requiredStructuralMatches(commandClass: H23CommandClass): number {
    switch (commandClass) {
      case "reflex":
        return 1;
      case "closed_structure":
      case "parameterized":
        return 2;
      default:
        return 999;
    }
  }

  private requiredSlotMatches(commandClass: H23CommandClass): number {
    switch (commandClass) {
      case "parameterized":
        return 2;
      default:
        return 1;
    }
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
    if (args.acousticConfidence < 0.9) return "low_confidence";
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
