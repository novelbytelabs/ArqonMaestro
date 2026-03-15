import Log from "../log";
import { RuntimeOutcome, RuntimeOutcomeType } from "./runtime-outcome";

type ParseOutcome =
  | "partial_response"
  | "final_response"
  | "no_chunk"
  | "no_alternatives_or_execute"
  | "waiting_for_silence";

type FeedbackKind = "alternatives_shown" | "execute_only" | "highlighted_alternative";
type DispatchRoute =
  | "app_control_local"
  | "composite_local"
  | "editing_local"
  | "editing_plugin"
  | "execution_local"
  | "focus_local"
  | "focus_plugin"
  | "mixed_plugin_assisted"
  | "mixed_legacy"
  | "navigation_plugin"
  | "unknown_legacy"
  | "system_plugin"
  | "legacy_executor"
  | "presentation_only"
  | "reflex_local";
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
  dispatchReason?: string;
  dispatchRoute?: DispatchRoute;
  dispatchPlannedAt?: number;
  normalizedCommandCount?: number;
  route?: string;
  parseOutcome?: ParseOutcome;
  parseOutcomeAt?: number;
  traceStartedAt: number;
  executorHandoffAt?: number;
  firstFeedbackKind?: FeedbackKind;
  firstFeedbackAt?: number;
  outcome?: RuntimeOutcome;
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
      traceStartedAt: Date.now(),
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
    state.parseOutcomeAt = Date.now();
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
    reason?: string,
    sessionId?: string
  ) {
    const state = this.trackChunk(chunkId, sessionId);
    state.dispatchRoute = route;
    state.dispatchFamily = family;
    state.dispatchReason = reason;
    state.dispatchPlannedAt = Date.now();
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

  recordOutcome(outcome: RuntimeOutcome, sessionId?: string) {
    // CRITICAL: Never use empty string as chunk ID - it causes multiple unrelated
    // outcomes to collapse into one trace state. Generate a unique ID if missing.
    let chunkId = outcome.chunkId;
    if (!chunkId || chunkId.trim() === "") {
      // Generate a unique fallback ID that won't collide with real chunk IDs
      chunkId = `outcome_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    const state = this.trackChunk(chunkId, sessionId);
    state.outcome = outcome;
    this.emit("outcome", state);
  }

  private emit(event: string, state: TraceState) {
    const elapsedSinceTraceStartMs = Date.now() - state.traceStartedAt;
    const parseToDispatchMs =
      state.parseOutcomeAt != null && state.dispatchPlannedAt != null
        ? state.dispatchPlannedAt - state.parseOutcomeAt
        : undefined;
    const dispatchToHandoffMs =
      state.dispatchPlannedAt != null && state.executorHandoffAt != null
        ? state.executorHandoffAt - state.dispatchPlannedAt
        : undefined;
    const parseToFirstFeedbackMs =
      state.parseOutcomeAt != null && state.firstFeedbackAt != null
        ? state.firstFeedbackAt - state.parseOutcomeAt
        : undefined;

    this.log.logVerbose(
      `[ExecutionTrace] ${JSON.stringify({
        event,
        sessionId: state.sessionId,
        chunkId: state.chunkId,
        elapsedSinceTraceStartMs,
        dispatchFamily: state.dispatchFamily,
        dispatchReason: state.dispatchReason,
        dispatchRoute: state.dispatchRoute,
        dispatchPlannedAt: state.dispatchPlannedAt,
        normalizedCommandCount: state.normalizedCommandCount,
        route: state.route,
        parseOutcome: state.parseOutcome,
        parseOutcomeAt: state.parseOutcomeAt,
        executorHandoffAt: state.executorHandoffAt,
        firstFeedbackKind: state.firstFeedbackKind,
        firstFeedbackAt: state.firstFeedbackAt,
        parseToDispatchMs,
        dispatchToHandoffMs,
        parseToFirstFeedbackMs,
      })}`
    );
  }
}
