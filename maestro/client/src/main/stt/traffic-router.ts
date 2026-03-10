import { v4 as uuid } from "uuid";
import Log from "../log";
import Settings from "../settings";
import STTTracking from "./tracking";

/**
 * Cutover stage types
 */
export type CutoverStage = "shadow" | "1pct" | "10pct" | "50pct" | "100pct" | "rollback";

/**
 * Routing path types
 */
export type RoutingPath = "websocket" | "bus";

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Master enable for cutover */
  enabled: boolean;
  /** Current percentage of traffic to route to Bus (0-100) */
  busPercentage: number;
  /** Current rollout stage */
  currentStage: CutoverStage;
  /** Enable instant rollback */
  rollbackEnabled: boolean;
  /** Stage thresholds configuration */
  stageThresholds: StageThresholds;
  /** Check interval in seconds */
  checkIntervalSeconds: number;
}

/**
 * Stage thresholds for auto-promotion/rollback
 */
export interface StageThresholds {
  /** Minimum sessions required in stage */
  minSessions: number;
  /** Maximum error rate threshold */
  maxErrorRate: number;
  /** Maximum latency delta (ms) */
  maxLatencyDeltaMs: number;
  /** Minimum match rate threshold */
  minMatchRate: number;
}

/**
 * Routing decision with correlation
 */
export interface RoutingDecision {
  /** Session ID */
  sessionId: string;
  /** Chosen path */
  path: RoutingPath;
  /** Human-readable reason */
  reason: string;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Stage metrics for monitoring
 */
export interface StageMetrics {
  /** Total sessions processed */
  totalSessions: number;
  /** Successful sessions */
  successfulSessions: number;
  /** Failed sessions */
  failedSessions: number;
  /** Error count */
  errorCount: number;
  /** Average latency (ms) */
  avgLatencyMs: number;
  /** Average WebSocket latency for comparison (ms) */
  avgWebsocketLatencyMs: number;
  /** Match count (when both paths return similar results) */
  matchCount: number;
  /** Last check time */
  lastCheckTime: number;
}

/**
 * Router metrics for monitoring
 */
export interface RouterMetrics {
  /** Total sessions routed to WebSocket */
  websocketSessions: number;
  /** Total sessions routed to Bus */
  busSessions: number;
  /** Total rollbacks triggered */
  rollbackCount: number;
  /** Current error rate */
  errorRate: number;
  /** Circuit breaker state */
  circuitBreakerOpen: boolean;
  /** Last routing decision */
  lastDecision?: RoutingDecision;
}

/**
 * Stage progression configuration
 */
const STAGE_CONFIG: Record<CutoverStage, { busPercentage: number; thresholds: StageThresholds }> = {
  shadow: {
    busPercentage: 0,
    thresholds: { minSessions: 0, maxErrorRate: 0, maxLatencyDeltaMs: 0, minMatchRate: 0 },
  },
  "1pct": {
    busPercentage: 1,
    thresholds: { minSessions: 50, maxErrorRate: 0.02, maxLatencyDeltaMs: 1000, minMatchRate: 0.90 },
  },
  "10pct": {
    busPercentage: 10,
    thresholds: { minSessions: 200, maxErrorRate: 0.01, maxLatencyDeltaMs: 750, minMatchRate: 0.93 },
  },
  "50pct": {
    busPercentage: 50,
    thresholds: { minSessions: 500, maxErrorRate: 0.005, maxLatencyDeltaMs: 500, minMatchRate: 0.95 },
  },
  "100pct": {
    busPercentage: 100,
    thresholds: { minSessions: 1000, maxErrorRate: 0.001, maxLatencyDeltaMs: 500, minMatchRate: 0.98 },
  },
  rollback: {
    busPercentage: 0,
    thresholds: { minSessions: 0, maxErrorRate: 0, maxLatencyDeltaMs: 0, minMatchRate: 0 },
  },
};

/**
 * Stage progression order
 */
const STAGE_ORDER: CutoverStage[] = ["shadow", "1pct", "10pct", "50pct", "100pct"];

/**
 * Traffic Router for gradual cutover from WebSocket to Bus
 * 
 * This router implements:
 * - Consistent hashing for deterministic routing
 * - Progressive rollout stages (1% → 10% → 50% → 100%)
 * - Automatic rollback on critical regression
 * - Circuit breaker for high error rates
 * - Correlation ID tracking for debugging
 */
export default class TrafficRouter {
  private config: RouterConfig;
  private metrics: RouterMetrics;
  private stageMetrics: Map<CutoverStage, StageMetrics>;
  private checkInterval?: NodeJS.Timeout;
  private circuitBreakerErrors: number = 0;
  private circuitBreakerWindow: number = 0;
  private consecutiveFailures: number = 0;
  private readonly CONSECUTIVE_FAILURE_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_ERROR_RATE = 0.10;
  private readonly CIRCUIT_BREAKER_WINDOW_MS = 60000;
  private readonly LATENCY_CRITICAL_THRESHOLD_MS = 2000;
  private readonly MATCH_RATE_CRITICAL_THRESHOLD = 0.80;

  constructor(
    private settings: Settings,
    private log: Log,
    private tracking: STTTracking
  ) {
    this.config = this.buildConfig();
    this.metrics = {
      websocketSessions: 0,
      busSessions: 0,
      rollbackCount: 0,
      errorRate: 0,
      circuitBreakerOpen: false,
    };
    this.stageMetrics = new Map();
    
    // Initialize metrics for each stage
    for (const stage of STAGE_ORDER) {
      this.stageMetrics.set(stage, this.initStageMetrics());
    }
  }

  /**
   * Build configuration from settings
   */
  private buildConfig(): RouterConfig {
    return {
      enabled: this.settings.getArqonBusCutoverEnabled(),
      busPercentage: this.settings.getArqonBusTrafficPercentage(),
      currentStage: this.settings.getArqonBusCurrentStage() as CutoverStage,
      rollbackEnabled: this.settings.getArqonBusRollbackEnabled(),
      stageThresholds: {
        minSessions: 50,
        maxErrorRate: 0.02,
        maxLatencyDeltaMs: 1000,
        minMatchRate: 0.90,
      },
      checkIntervalSeconds: this.settings.getArqonBusStageCheckInterval(),
    };
  }

  /**
   * Initialize stage metrics
   */
  private initStageMetrics(): StageMetrics {
    return {
      totalSessions: 0,
      successfulSessions: 0,
      failedSessions: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      avgWebsocketLatencyMs: 0,
      matchCount: 0,
      lastCheckTime: Date.now(),
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config, stageThresholds: { ...this.config.stageThresholds } };
  }

  /**
   * Get current router metrics
   */
  getMetrics(): RouterMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current stage
   */
  getCurrentStage(): CutoverStage {
    return this.config.currentStage;
  }

  /**
   * Get stage metrics
   */
  getStageMetrics(stage: CutoverStage): StageMetrics | undefined {
    return this.stageMetrics.get(stage);
  }

  /**
   * Check if routing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && !this.metrics.circuitBreakerOpen;
  }

  /**
   * Check if Bus path is available and healthy
   */
  isBusHealthy(): boolean {
    // Check if Bus is enabled and connected
    if (!this.settings.getArqonBusEnabled()) {
      return false;
    }
    
    // Check circuit breaker
    if (this.metrics.circuitBreakerOpen) {
      return false;
    }

    return true;
  }

  /**
   * Make routing decision for a session
   * Uses consistent hashing on sessionId for deterministic routing
   */
  route(sessionId: string): RoutingDecision {
    const correlationId = uuid();
    const timestamp = Date.now();

    // Always route to WebSocket if not enabled
    if (!this.isEnabled()) {
      const decision: RoutingDecision = {
        sessionId,
        path: "websocket",
        reason: "Cutover disabled",
        correlationId,
        timestamp,
      };
      this.metrics.websocketSessions++;
      this.logRoutingDecision(decision);
      return decision;
    }

    // Use consistent hashing to determine path
    const hash = this.hashSessionId(sessionId);
    const bucket = hash % 100;

    let path: RoutingPath;
    let reason: string;

    if (bucket < this.config.busPercentage) {
      path = "bus";
      reason = `Hash ${bucket} < ${this.config.busPercentage}% (stage: ${this.config.currentStage})`;
    } else {
      path = "websocket";
      reason = `Hash ${bucket} >= ${this.config.busPercentage}% (stage: ${this.config.currentStage})`;
    }

    // Track metrics
    if (path === "bus") {
      this.metrics.busSessions++;
    } else {
      this.metrics.websocketSessions++;
    }

    const decision: RoutingDecision = {
      sessionId,
      path,
      reason,
      correlationId,
      timestamp,
    };

    this.metrics.lastDecision = decision;
    this.logRoutingDecision(decision);

    return decision;
  }

  /**
   * Simple hash function for consistent hashing
   * Uses djb2 hash algorithm
   */
  private hashSessionId(sessionId: string): number {
    let hash = 5381;
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash * 33) ^ sessionId.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  /**
   * Log routing decision with correlation ID
   */
  private logRoutingDecision(decision: RoutingDecision): void {
    this.log.logVerbose(
      `[TrafficRouter] Routing: session=${decision.sessionId.substring(0, 8)} path=${decision.path} ` +
      `reason="${decision.reason}" correlation=${decision.correlationId}`
    );

    // Log metric for tracking
    this.tracking.logMetric("stt.cutover.routing", {
      session_id: decision.sessionId,
      path: decision.path,
      reason: decision.reason,
      correlation_id: decision.correlationId,
      stage: this.config.currentStage,
      timestamp: decision.timestamp,
    });
  }

  /**
   * Record session result for metrics
   */
  recordSessionResult(
    sessionId: string,
    path: RoutingPath,
    success: boolean,
    latencyMs: number,
    websocketLatencyMs?: number,
    matched?: boolean
  ): void {
    if (path !== "bus") {
      return;
    }

    const stageMetrics = this.stageMetrics.get(this.config.currentStage);
    if (!stageMetrics) {
      return;
    }

    stageMetrics.totalSessions++;

    if (success) {
      stageMetrics.successfulSessions++;
    } else {
      stageMetrics.failedSessions++;
      stageMetrics.errorCount++;
      this.consecutiveFailures++;
    }

    // Update average latency
    const n = stageMetrics.totalSessions;
    stageMetrics.avgLatencyMs = 
      (stageMetrics.avgLatencyMs * (n - 1) + latencyMs) / n;

    if (websocketLatencyMs !== undefined) {
      stageMetrics.avgWebsocketLatencyMs = 
        (stageMetrics.avgWebsocketLatencyMs * (n - 1) + websocketLatencyMs) / n;
    }

    if (matched) {
      stageMetrics.matchCount++;
    }

    // Update error rate
    this.updateErrorRate();

    // Check circuit breaker
    this.checkCircuitBreaker();

    // Log metric
    this.tracking.logMetric("stt.cutover.session.result", {
      session_id: sessionId,
      path,
      success,
      latency_ms: latencyMs,
      websocket_latency_ms: websocketLatencyMs,
      matched,
      stage: this.config.currentStage,
      error_rate: this.metrics.errorRate,
    });
  }

  /**
   * Update error rate metric
   */
  private updateErrorRate(): void {
    const stageMetrics = this.stageMetrics.get(this.config.currentStage);
    if (!stageMetrics || stageMetrics.totalSessions === 0) {
      this.metrics.errorRate = 0;
      return;
    }

    this.metrics.errorRate = stageMetrics.failedSessions / stageMetrics.totalSessions;
  }

  /**
   * Check circuit breaker
   */
  private checkCircuitBreaker(): void {
    const now = Date.now();

    // Reset window if expired
    if (now - this.circuitBreakerWindow > this.CIRCUIT_BREAKER_WINDOW_MS) {
      this.circuitBreakerErrors = 0;
      this.circuitBreakerWindow = now;
    }

    // Increment error count
    this.circuitBreakerErrors++;

    // Check if circuit breaker should open
    if (this.metrics.errorRate > this.CIRCUIT_BREAKER_ERROR_RATE) {
      if (!this.metrics.circuitBreakerOpen) {
        this.metrics.circuitBreakerOpen = true;
        this.log.logError(
          `[TrafficRouter] Circuit breaker opened: error rate ${(this.metrics.errorRate * 100).toFixed(2)}%`
        );
        this.tracking.logMetric("stt.cutover.circuit_breaker", {
          action: "open",
          error_rate: this.metrics.errorRate,
          threshold: this.CIRCUIT_BREAKER_ERROR_RATE,
        });
      }
    }

    // Auto-reset circuit breaker after window
    if (this.metrics.circuitBreakerOpen && this.metrics.errorRate < this.CIRCUIT_BREAKER_ERROR_RATE / 2) {
      this.metrics.circuitBreakerOpen = false;
      this.log.logVerbose("[TrafficRouter] Circuit breaker closed: error rate recovered");
      this.tracking.logMetric("stt.cutover.circuit_breaker", {
        action: "close",
        error_rate: this.metrics.errorRate,
      });
    }
  }

  /**
   * Start periodic stage check
   */
  startStageCheck(onPromote?: (stage: CutoverStage) => void, onRollback?: (reason: string) => void): void {
    this.stopStageCheck();

    this.checkInterval = setInterval(() => {
      this.checkStageThresholds(onPromote, onRollback);
    }, this.config.checkIntervalSeconds * 1000);

    this.log.logVerbose(`[TrafficRouter] Stage check started: interval=${this.config.checkIntervalSeconds}s`);
  }

  /**
   * Stop periodic stage check
   */
  stopStageCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Check stage thresholds and auto-promote/rollback
   */
  checkStageThresholds(onPromote?: (stage: CutoverStage) => void, onRollback?: (reason: string) => void): void {
    const stageConfig = STAGE_CONFIG[this.config.currentStage];
    const stageMetrics = this.stageMetrics.get(this.config.currentStage);

    if (!stageConfig || !stageMetrics) {
      return;
    }

    const thresholds = stageConfig.thresholds;
    const latencyDelta = stageMetrics.avgLatencyMs - stageMetrics.avgWebsocketLatencyMs;
    const matchRate = stageMetrics.totalSessions > 0 
      ? stageMetrics.matchCount / stageMetrics.totalSessions 
      : 0;

    this.log.logVerbose(
      `[TrafficRouter] Stage check: ${this.config.currentStage} ` +
      `sessions=${stageMetrics.totalSessions}/${thresholds.minSessions} ` +
      `errors=${(this.metrics.errorRate * 100).toFixed(2)}%/${(thresholds.maxErrorRate * 100).toFixed(2)}% ` +
      `latencyDelta=${latencyDelta.toFixed(0)}ms/${thresholds.maxLatencyDeltaMs}ms ` +
      `matchRate=${(matchRate * 100).toFixed(1)}%/${(thresholds.minMatchRate * 100).toFixed(1)}%`
    );

    // Check rollback triggers first
    if (this.shouldRollback(stageMetrics, latencyDelta, matchRate)) {
      this.triggerRollback("Automatic rollback: thresholds failed", onRollback);
      return;
    }

    // Check if we should promote to next stage
    const nextStage = this.getNextStage();
    if (nextStage && this.shouldPromote(stageMetrics, latencyDelta, matchRate)) {
      this.promoteToStage(nextStage, onPromote);
    }

    // Reset consecutive failures on success
    if (stageMetrics.failedSessions === 0 || stageMetrics.errorCount === 0) {
      this.consecutiveFailures = 0;
    }
  }

  /**
   * Determine if should rollback
   */
  private shouldRollback(stageMetrics: StageMetrics, latencyDelta: number, matchRate: number): boolean {
    // Critical latency regression
    if (latencyDelta > this.LATENCY_CRITICAL_THRESHOLD_MS) {
      this.log.logError(`[TrafficRouter] Rollback trigger: latency delta ${latencyDelta}ms > ${this.LATENCY_CRITICAL_THRESHOLD_MS}ms`);
      return true;
    }

    // Critical match rate drop
    if (matchRate < this.MATCH_RATE_CRITICAL_THRESHOLD) {
      this.log.logError(`[TrafficRouter] Rollback trigger: match rate ${(matchRate * 100).toFixed(1)}% < ${(this.MATCH_RATE_CRITICAL_THRESHOLD * 100).toFixed(1)}%`);
      return true;
    }

    // Consecutive failures
    if (this.consecutiveFailures >= this.CONSECUTIVE_FAILURE_THRESHOLD) {
      this.log.logError(`[TrafficRouter] Rollback trigger: ${this.consecutiveFailures} consecutive failures`);
      return true;
    }

    return false;
  }

  /**
   * Determine if should promote to next stage
   */
  private shouldPromote(stageMetrics: StageMetrics, latencyDelta: number, matchRate: number): boolean {
    const stageConfig = STAGE_CONFIG[this.config.currentStage];
    if (!stageConfig) {
      return false;
    }

    // Require explicit approval to pass staging gates
    if (!this.settings.getArqonBusStageApproval()) {
      return false;
    }

    const thresholds = stageConfig.thresholds;

    // Check all thresholds
    if (stageMetrics.totalSessions < thresholds.minSessions) {
      return false;
    }

    if (this.metrics.errorRate > thresholds.maxErrorRate) {
      return false;
    }

    if (latencyDelta > thresholds.maxLatencyDeltaMs) {
      return false;
    }

    if (matchRate < thresholds.minMatchRate) {
      return false;
    }

    return true;
  }

  /**
   * Get next stage in progression
   */
  private getNextStage(): CutoverStage | null {
    const currentIndex = STAGE_ORDER.indexOf(this.config.currentStage);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
      return null;
    }
    return STAGE_ORDER[currentIndex + 1];
  }

  /**
   * Promote to a specific stage
   */
  promoteToStage(stage: CutoverStage, onPromote?: (stage: CutoverStage) => void): void {
    const previousStage = this.config.currentStage;
    const stageConfig = STAGE_CONFIG[stage];

    this.config.currentStage = stage;
    this.config.busPercentage = stageConfig.busPercentage;
    
    // Save to settings
    this.settings.setArqonBusCurrentStage(stage);
    this.settings.setArqonBusTrafficPercentage(stageConfig.busPercentage);

    // Reset stage metrics for new stage
    this.stageMetrics.set(stage, this.initStageMetrics());

    this.log.logVerbose(
      `[TrafficRouter] Stage promoted: ${previousStage} -> ${stage} ` +
      `(busPercentage: ${stageConfig.busPercentage}%)`
    );

    this.tracking.logMetric("stt.cutover.stage.promotion", {
      previous_stage: previousStage,
      new_stage: stage,
      bus_percentage: stageConfig.busPercentage,
      timestamp: Date.now(),
    });

    if (onPromote) {
      onPromote(stage);
    }
  }

  /**
   * Trigger immediate rollback
   */
  triggerRollback(reason: string, onRollback?: (reason: string) => void): void {
    const previousStage = this.config.currentStage;

    this.config.currentStage = "rollback";
    this.config.busPercentage = 0;
    this.metrics.rollbackCount++;
    this.consecutiveFailures = 0;

    // Save to settings
    this.settings.setArqonBusCurrentStage("rollback");
    this.settings.setArqonBusTrafficPercentage(0);

    // Force WebSocket path
    this.config.enabled = false;

    this.log.logError(
      `[TrafficRouter] ROLLBACK triggered: ${reason} ` +
      `(previous stage: ${previousStage})`
    );

    this.tracking.logMetric("stt.cutover.rollback", {
      reason,
      previous_stage: previousStage,
      rollback_count: this.metrics.rollbackCount,
      timestamp: Date.now(),
    });

    if (onRollback) {
      onRollback(reason);
    }
  }

  /**
   * Manual rollback - can be triggered via settings
   */
  manualRollback(reason: string = "Manual rollback requested"): void {
    this.triggerRollback(reason);
  }

  /**
   * Enable/disable cutover
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.settings.setArqonBusCutoverEnabled(enabled);
    this.log.logVerbose(`[TrafficRouter] Cutover ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Set traffic percentage manually
   */
  setBusPercentage(percentage: number): void {
    this.config.busPercentage = Math.max(0, Math.min(100, percentage));
    this.settings.setArqonBusTrafficPercentage(this.config.busPercentage);
    this.log.logVerbose(`[TrafficRouter] Bus traffic percentage set to ${this.config.busPercentage}%`);
  }

  /**
   * Set current stage
   */
  setStage(stage: CutoverStage): void {
    const stageConfig = STAGE_CONFIG[stage];
    if (!stageConfig) {
      this.log.logError(`[TrafficRouter] Invalid stage: ${stage}`);
      return;
    }

    this.promoteToStage(stage);
  }

  /**
   * Reload configuration from settings
   */
  reloadConfig(): void {
    this.config = this.buildConfig();
    this.log.logVerbose("[TrafficRouter] Configuration reloaded");
  }

  /**
   * Get stage configuration
   */
  getStageConfig(stage: CutoverStage): { busPercentage: number; thresholds: StageThresholds } | undefined {
    return STAGE_CONFIG[stage];
  }

  /**
   * Get all stage configurations
   */
  getAllStageConfigs(): typeof STAGE_CONFIG {
    return STAGE_CONFIG;
  }

  /**
   * Check if rollback is enabled
   */
  isRollbackEnabled(): boolean {
    return this.config.rollbackEnabled;
  }

  /**
   * Enable/disable rollback
   */
  setRollbackEnabled(enabled: boolean): void {
    this.config.rollbackEnabled = enabled;
    this.settings.setArqonBusRollbackEnabled(enabled);
    this.log.logVerbose(`[TrafficRouter] Rollback ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get detailed metrics for reporting
   */
  getDetailedMetrics(): {
    config: RouterConfig;
    metrics: RouterMetrics;
    stages: Record<CutoverStage, StageMetrics>;
    stageConfigs: typeof STAGE_CONFIG;
  } {
    const stages: Record<CutoverStage, StageMetrics> = {} as any;
    
    for (const [stage, metrics] of this.stageMetrics.entries()) {
      stages[stage] = { ...metrics };
    }

    return {
      config: this.getConfig(),
      metrics: this.getMetrics(),
      stages,
      stageConfigs: STAGE_CONFIG,
    };
  }
}

/**
 * Factory function to create TrafficRouter instance
 */
export function createTrafficRouter(
  settings: Settings,
  log: Log,
  tracking: STTTracking
): TrafficRouter {
  return new TrafficRouter(settings, log, tracking);
}
