import Log from "../log";

type ParseOutcome =
  | "partial_response"
  | "final_response"
  | "no_chunk"
  | "no_alternatives_or_execute"
  | "waiting_for_silence";

type FeedbackKind = "alternatives_shown" | "execute_only" | "highlighted_alternative";
type DispatchRoute = "legacy_executor" | "presentation_only";
type DispatchFamily =
  | "editing"
  | "execution"
  | "focus"
  | "mixed"
  | "navigation"
  | "none"
  | "reflex"
  | "system"
  | "unknown";

interface TraceState {
  sessionId?: string;
  chunkId: string;
  dispatchFamily?: DispatchFamily;
  dispatchRoute?: DispatchRoute;
  normalizedCommandCount?: number;
  route?: string;
  parseOutcome?: ParseOutcome;
  executorHandoffAt?: number;
  firstFeedbackKind?: FeedbackKind;
  firstFeedbackAt?: number;
}

// Minimal structured trace for the hot path. This is intentionally small and
// phase-focused so we can prove the runtime spine without introducing a full
// telemetry system.
export default class ExecutionTrace {
  private traces = new Map<string, TraceState>();

  constructor(private log: Log) {}

  trackChunk(chunkId: string, sessionId?: string) {
    const existing = this.traces.get(chunkId);
    if (existing) {
      return existing;
    }

    const state: TraceState = {
      sessionId,
      chunkId,
    };
    this.traces.set(chunkId, state);
    this.emit("trace_started", state);
    return state;
  }

  recordRouteChoice(chunkId: string, route: string, sessionId?: string) {
    const state = this.trackChunk(chunkId, sessionId);
    state.route = route;
    this.emit("route_choice", state);
  }

  recordParseOutcome(chunkId: string, outcome: ParseOutcome, sessionId?: string) {
    const state = this.trackChunk(chunkId, sessionId);
    state.parseOutcome = outcome;
    this.emit("parse_outcome", state);
  }

  recordExecutorHandoff(chunkId: string, sessionId?: string) {
    const state = this.trackChunk(chunkId, sessionId);
    state.executorHandoffAt = Date.now();
    this.emit("executor_handoff", state);
  }

  recordNormalizedCommands(chunkId: string, count: number, sessionId?: string) {
    const state = this.trackChunk(chunkId, sessionId);
    state.normalizedCommandCount = count;
    this.emit("normalized_commands", state);
  }

  recordDispatchPlan(
    chunkId: string,
    route: DispatchRoute,
    family: DispatchFamily,
    sessionId?: string
  ) {
    const state = this.trackChunk(chunkId, sessionId);
    state.dispatchRoute = route;
    state.dispatchFamily = family;
    this.emit("dispatch_plan", state);
  }

  recordFirstFeedback(chunkId: string, kind: FeedbackKind, sessionId?: string) {
    const state = this.trackChunk(chunkId, sessionId);
    if (state.firstFeedbackAt) {
      return;
    }

    state.firstFeedbackKind = kind;
    state.firstFeedbackAt = Date.now();
    this.emit("first_feedback", state);
  }

  private emit(event: string, state: TraceState) {
    this.log.logVerbose(
      `[ExecutionTrace] ${JSON.stringify({
        event,
        sessionId: state.sessionId,
        chunkId: state.chunkId,
        dispatchFamily: state.dispatchFamily,
        dispatchRoute: state.dispatchRoute,
        normalizedCommandCount: state.normalizedCommandCount,
        route: state.route,
        parseOutcome: state.parseOutcome,
        executorHandoffAt: state.executorHandoffAt,
        firstFeedbackKind: state.firstFeedbackKind,
        firstFeedbackAt: state.firstFeedbackAt,
      })}`
    );
  }
}
