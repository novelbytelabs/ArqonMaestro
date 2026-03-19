import Log from "../log";
import STTComparator from "../stt/comparator";
import STTTracking from "../stt/tracking";
import TrafficRouter, { RoutingDecision, RoutingPath } from "../stt/traffic-router";
import ExecutionTrace from "./execution-trace";

interface STTRoutingServiceDeps {
  getCurrentChunkId: () => string | undefined;
  log: Log;
  tracking: STTTracking;
}

// Owns transport/cutover routing behavior so session/chunk orchestration
// does not also carry Bus/comparator/router lifecycle and metrics.
export default class STTRoutingService {
  private busClient: any = null;
  private comparator?: STTComparator;
  private currentRoutingDecision?: RoutingDecision;
  private executionTrace?: ExecutionTrace;
  private trafficRouter?: TrafficRouter;
  private websocketResponseLatency?: number;

  constructor(private deps: STTRoutingServiceDeps) {}

  setBusClient(busClient: any) {
    this.busClient = busClient;
    if (busClient && busClient.isEnabled()) {
      busClient.connect();
    }
    this.registerComparatorCallback();
  }

  setComparator(comparator: STTComparator) {
    this.comparator = comparator;
    this.registerComparatorCallback();
  }

  setExecutionTrace(executionTrace: ExecutionTrace) {
    this.executionTrace = executionTrace;
  }

  setTrafficRouter(router: TrafficRouter) {
    this.trafficRouter = router;
    this.deps.log.logVerbose("[STTRoutingService] Traffic router configured");
  }

  getCurrentRoutingDecision(): RoutingDecision | undefined {
    return this.currentRoutingDecision;
  }

  setWebsocketResponseLatency(latencyMs: number): void {
    this.websocketResponseLatency = latencyMs;
  }

  routeSession(sessionId: string): RoutingPath {
    if (!this.trafficRouter || !this.trafficRouter.isEnabled()) {
      return "websocket";
    }

    if (!this.trafficRouter.isBusHealthy()) {
      return "websocket";
    }

    const decision = this.trafficRouter.route(sessionId);
    this.currentRoutingDecision = decision;
    this.deps.log.logVerbose(
      `[STTRoutingService] Session ${sessionId.substring(0, 8)} routed to: ${decision.path}`
    );

    const chunkId = this.deps.getCurrentChunkId();
    if (chunkId) {
      this.executionTrace?.recordRouteChoice(chunkId, decision.path, sessionId);
    }

    if (decision.path === "bus" && this.busClient) {
      this.busClient.setExecutionMode(true, this.handleBusResponse.bind(this));
    } else if (this.busClient) {
      this.busClient.setExecutionMode(false);
    }

    return decision.path;
  }

  private registerComparatorCallback() {
    if (!this.comparator || !this.busClient || !this.busClient.isEnabled()) {
      return;
    }

    this.busClient.registerTranscriptCallback(
      (
        sessionId: string,
        chunkId: string,
        alternatives: any[],
        latencyMs: number,
        isFinal: boolean
      ) => {
        if (this.comparator?.isEnabled()) {
          this.comparator.storeBusResponse(sessionId, chunkId, alternatives, latencyMs, isFinal);
        }
      }
    );
  }

  private handleBusResponse(
    sessionId: string,
    _chunkId: string,
    _alternatives: any[],
    latencyMs: number,
    _isFinal: boolean
  ) {
    if (this.trafficRouter && this.currentRoutingDecision?.path === "bus") {
      this.trafficRouter.recordSessionResult(
        sessionId,
        "bus",
        true,
        latencyMs,
        this.websocketResponseLatency,
        undefined
      );
    }
  }
}
