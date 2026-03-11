"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.createTrafficRouter = void 0;
var uuid_1 = require("uuid");
/**
 * Stage progression configuration
 */
var STAGE_CONFIG = {
    shadow: {
        busPercentage: 0,
        thresholds: { minSessions: 0, maxErrorRate: 0, maxLatencyDeltaMs: 0, minMatchRate: 0 }
    },
    "1pct": {
        busPercentage: 1,
        thresholds: { minSessions: 50, maxErrorRate: 0.02, maxLatencyDeltaMs: 1000, minMatchRate: 0.90 }
    },
    "10pct": {
        busPercentage: 10,
        thresholds: { minSessions: 200, maxErrorRate: 0.01, maxLatencyDeltaMs: 750, minMatchRate: 0.93 }
    },
    "50pct": {
        busPercentage: 50,
        thresholds: { minSessions: 500, maxErrorRate: 0.005, maxLatencyDeltaMs: 500, minMatchRate: 0.95 }
    },
    "100pct": {
        busPercentage: 100,
        thresholds: { minSessions: 1000, maxErrorRate: 0.001, maxLatencyDeltaMs: 500, minMatchRate: 0.98 }
    },
    rollback: {
        busPercentage: 0,
        thresholds: { minSessions: 0, maxErrorRate: 0, maxLatencyDeltaMs: 0, minMatchRate: 0 }
    }
};
/**
 * Stage progression order
 */
var STAGE_ORDER = ["shadow", "1pct", "10pct", "50pct", "100pct"];
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
var TrafficRouter = /** @class */ (function () {
    function TrafficRouter(settings, log, tracking) {
        this.settings = settings;
        this.log = log;
        this.tracking = tracking;
        this.circuitBreakerErrors = 0;
        this.circuitBreakerWindow = 0;
        this.consecutiveFailures = 0;
        this.CONSECUTIVE_FAILURE_THRESHOLD = 3;
        this.CIRCUIT_BREAKER_ERROR_RATE = 0.10;
        this.CIRCUIT_BREAKER_WINDOW_MS = 60000;
        this.LATENCY_CRITICAL_THRESHOLD_MS = 2000;
        this.MATCH_RATE_CRITICAL_THRESHOLD = 0.80;
        this.config = this.buildConfig();
        this.metrics = {
            websocketSessions: 0,
            busSessions: 0,
            rollbackCount: 0,
            errorRate: 0,
            circuitBreakerOpen: false
        };
        this.stageMetrics = new Map();
        // Initialize metrics for each stage
        for (var _i = 0, STAGE_ORDER_1 = STAGE_ORDER; _i < STAGE_ORDER_1.length; _i++) {
            var stage = STAGE_ORDER_1[_i];
            this.stageMetrics.set(stage, this.initStageMetrics());
        }
    }
    /**
     * Build configuration from settings
     */
    TrafficRouter.prototype.buildConfig = function () {
        return {
            enabled: this.settings.getArqonBusCutoverEnabled(),
            busPercentage: this.settings.getArqonBusTrafficPercentage(),
            currentStage: this.settings.getArqonBusCurrentStage(),
            rollbackEnabled: this.settings.getArqonBusRollbackEnabled(),
            stageThresholds: {
                minSessions: 50,
                maxErrorRate: 0.02,
                maxLatencyDeltaMs: 1000,
                minMatchRate: 0.90
            },
            checkIntervalSeconds: this.settings.getArqonBusStageCheckInterval()
        };
    };
    /**
     * Initialize stage metrics
     */
    TrafficRouter.prototype.initStageMetrics = function () {
        return {
            totalSessions: 0,
            successfulSessions: 0,
            failedSessions: 0,
            errorCount: 0,
            avgLatencyMs: 0,
            avgWebsocketLatencyMs: 0,
            matchCount: 0,
            lastCheckTime: Date.now()
        };
    };
    /**
     * Get current configuration
     */
    TrafficRouter.prototype.getConfig = function () {
        return __assign(__assign({}, this.config), { stageThresholds: __assign({}, this.config.stageThresholds) });
    };
    /**
     * Get current router metrics
     */
    TrafficRouter.prototype.getMetrics = function () {
        return __assign({}, this.metrics);
    };
    /**
     * Get current stage
     */
    TrafficRouter.prototype.getCurrentStage = function () {
        return this.config.currentStage;
    };
    /**
     * Get stage metrics
     */
    TrafficRouter.prototype.getStageMetrics = function (stage) {
        return this.stageMetrics.get(stage);
    };
    /**
     * Check if routing is enabled
     */
    TrafficRouter.prototype.isEnabled = function () {
        return this.config.enabled && !this.metrics.circuitBreakerOpen;
    };
    /**
     * Check if Bus path is available and healthy
     */
    TrafficRouter.prototype.isBusHealthy = function () {
        // Check if Bus is enabled and connected
        if (!this.settings.getArqonBusEnabled()) {
            return false;
        }
        // Check circuit breaker
        if (this.metrics.circuitBreakerOpen) {
            return false;
        }
        return true;
    };
    /**
     * Make routing decision for a session
     * Uses consistent hashing on sessionId for deterministic routing
     */
    TrafficRouter.prototype.route = function (sessionId) {
        var correlationId = (0, uuid_1.v4)();
        var timestamp = Date.now();
        // Always route to WebSocket if not enabled
        if (!this.isEnabled()) {
            var decision_1 = {
                sessionId: sessionId,
                path: "websocket",
                reason: "Cutover disabled",
                correlationId: correlationId,
                timestamp: timestamp
            };
            this.metrics.websocketSessions++;
            this.logRoutingDecision(decision_1);
            return decision_1;
        }
        // Use consistent hashing to determine path
        var hash = this.hashSessionId(sessionId);
        var bucket = hash % 100;
        var path;
        var reason;
        if (bucket < this.config.busPercentage) {
            path = "bus";
            reason = "Hash ".concat(bucket, " < ").concat(this.config.busPercentage, "% (stage: ").concat(this.config.currentStage, ")");
        }
        else {
            path = "websocket";
            reason = "Hash ".concat(bucket, " >= ").concat(this.config.busPercentage, "% (stage: ").concat(this.config.currentStage, ")");
        }
        // Track metrics
        if (path === "bus") {
            this.metrics.busSessions++;
        }
        else {
            this.metrics.websocketSessions++;
        }
        var decision = {
            sessionId: sessionId,
            path: path,
            reason: reason,
            correlationId: correlationId,
            timestamp: timestamp
        };
        this.metrics.lastDecision = decision;
        this.logRoutingDecision(decision);
        return decision;
    };
    /**
     * Simple hash function for consistent hashing
     * Uses djb2 hash algorithm
     */
    TrafficRouter.prototype.hashSessionId = function (sessionId) {
        var hash = 5381;
        for (var i = 0; i < sessionId.length; i++) {
            hash = (hash * 33) ^ sessionId.charCodeAt(i);
        }
        return Math.abs(hash);
    };
    /**
     * Log routing decision with correlation ID
     */
    TrafficRouter.prototype.logRoutingDecision = function (decision) {
        this.log.logVerbose("[TrafficRouter] Routing: session=".concat(decision.sessionId.substring(0, 8), " path=").concat(decision.path, " ") +
            "reason=\"".concat(decision.reason, "\" correlation=").concat(decision.correlationId));
        // Log metric for tracking
        this.tracking.logMetric("stt.cutover.routing", {
            session_id: decision.sessionId,
            path: decision.path,
            reason: decision.reason,
            correlation_id: decision.correlationId,
            stage: this.config.currentStage,
            timestamp: decision.timestamp
        });
    };
    /**
     * Record session result for metrics
     */
    TrafficRouter.prototype.recordSessionResult = function (sessionId, path, success, latencyMs, websocketLatencyMs, matched) {
        if (path !== "bus") {
            return;
        }
        var stageMetrics = this.stageMetrics.get(this.config.currentStage);
        if (!stageMetrics) {
            return;
        }
        stageMetrics.totalSessions++;
        if (success) {
            stageMetrics.successfulSessions++;
        }
        else {
            stageMetrics.failedSessions++;
            stageMetrics.errorCount++;
            this.consecutiveFailures++;
        }
        // Update average latency
        var n = stageMetrics.totalSessions;
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
            path: path,
            success: success,
            latency_ms: latencyMs,
            websocket_latency_ms: websocketLatencyMs,
            matched: matched,
            stage: this.config.currentStage,
            error_rate: this.metrics.errorRate
        });
    };
    /**
     * Update error rate metric
     */
    TrafficRouter.prototype.updateErrorRate = function () {
        var stageMetrics = this.stageMetrics.get(this.config.currentStage);
        if (!stageMetrics || stageMetrics.totalSessions === 0) {
            this.metrics.errorRate = 0;
            return;
        }
        this.metrics.errorRate = stageMetrics.failedSessions / stageMetrics.totalSessions;
    };
    /**
     * Check circuit breaker
     */
    TrafficRouter.prototype.checkCircuitBreaker = function () {
        var now = Date.now();
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
                this.log.logError("[TrafficRouter] Circuit breaker opened: error rate ".concat((this.metrics.errorRate * 100).toFixed(2), "%"));
                this.tracking.logMetric("stt.cutover.circuit_breaker", {
                    action: "open",
                    error_rate: this.metrics.errorRate,
                    threshold: this.CIRCUIT_BREAKER_ERROR_RATE
                });
            }
        }
        // Auto-reset circuit breaker after window
        if (this.metrics.circuitBreakerOpen && this.metrics.errorRate < this.CIRCUIT_BREAKER_ERROR_RATE / 2) {
            this.metrics.circuitBreakerOpen = false;
            this.log.logVerbose("[TrafficRouter] Circuit breaker closed: error rate recovered");
            this.tracking.logMetric("stt.cutover.circuit_breaker", {
                action: "close",
                error_rate: this.metrics.errorRate
            });
        }
    };
    /**
     * Start periodic stage check
     */
    TrafficRouter.prototype.startStageCheck = function (onPromote, onRollback) {
        var _this = this;
        this.stopStageCheck();
        this.checkInterval = setInterval(function () {
            _this.checkStageThresholds(onPromote, onRollback);
        }, this.config.checkIntervalSeconds * 1000);
        this.log.logVerbose("[TrafficRouter] Stage check started: interval=".concat(this.config.checkIntervalSeconds, "s"));
    };
    /**
     * Stop periodic stage check
     */
    TrafficRouter.prototype.stopStageCheck = function () {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
    };
    /**
     * Check stage thresholds and auto-promote/rollback
     */
    TrafficRouter.prototype.checkStageThresholds = function (onPromote, onRollback) {
        var stageConfig = STAGE_CONFIG[this.config.currentStage];
        var stageMetrics = this.stageMetrics.get(this.config.currentStage);
        if (!stageConfig || !stageMetrics) {
            return;
        }
        var thresholds = stageConfig.thresholds;
        var latencyDelta = stageMetrics.avgLatencyMs - stageMetrics.avgWebsocketLatencyMs;
        var matchRate = stageMetrics.totalSessions > 0
            ? stageMetrics.matchCount / stageMetrics.totalSessions
            : 0;
        this.log.logVerbose("[TrafficRouter] Stage check: ".concat(this.config.currentStage, " ") +
            "sessions=".concat(stageMetrics.totalSessions, "/").concat(thresholds.minSessions, " ") +
            "errors=".concat((this.metrics.errorRate * 100).toFixed(2), "%/").concat((thresholds.maxErrorRate * 100).toFixed(2), "% ") +
            "latencyDelta=".concat(latencyDelta.toFixed(0), "ms/").concat(thresholds.maxLatencyDeltaMs, "ms ") +
            "matchRate=".concat((matchRate * 100).toFixed(1), "%/").concat((thresholds.minMatchRate * 100).toFixed(1), "%"));
        // Check rollback triggers first
        if (this.shouldRollback(stageMetrics, latencyDelta, matchRate)) {
            this.triggerRollback("Automatic rollback: thresholds failed", onRollback);
            return;
        }
        // Check if we should promote to next stage
        var nextStage = this.getNextStage();
        if (nextStage && this.shouldPromote(stageMetrics, latencyDelta, matchRate)) {
            this.promoteToStage(nextStage, onPromote);
        }
        // Reset consecutive failures on success
        if (stageMetrics.failedSessions === 0 || stageMetrics.errorCount === 0) {
            this.consecutiveFailures = 0;
        }
    };
    /**
     * Determine if should rollback
     */
    TrafficRouter.prototype.shouldRollback = function (stageMetrics, latencyDelta, matchRate) {
        // Critical latency regression
        if (latencyDelta > this.LATENCY_CRITICAL_THRESHOLD_MS) {
            this.log.logError("[TrafficRouter] Rollback trigger: latency delta ".concat(latencyDelta, "ms > ").concat(this.LATENCY_CRITICAL_THRESHOLD_MS, "ms"));
            return true;
        }
        // Critical match rate drop
        if (matchRate < this.MATCH_RATE_CRITICAL_THRESHOLD) {
            this.log.logError("[TrafficRouter] Rollback trigger: match rate ".concat((matchRate * 100).toFixed(1), "% < ").concat((this.MATCH_RATE_CRITICAL_THRESHOLD * 100).toFixed(1), "%"));
            return true;
        }
        // Consecutive failures
        if (this.consecutiveFailures >= this.CONSECUTIVE_FAILURE_THRESHOLD) {
            this.log.logError("[TrafficRouter] Rollback trigger: ".concat(this.consecutiveFailures, " consecutive failures"));
            return true;
        }
        return false;
    };
    /**
     * Determine if should promote to next stage
     */
    TrafficRouter.prototype.shouldPromote = function (stageMetrics, latencyDelta, matchRate) {
        var stageConfig = STAGE_CONFIG[this.config.currentStage];
        if (!stageConfig) {
            return false;
        }
        // Require explicit approval to pass staging gates
        if (!this.settings.getArqonBusStageApproval()) {
            return false;
        }
        var thresholds = stageConfig.thresholds;
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
    };
    /**
     * Get next stage in progression
     */
    TrafficRouter.prototype.getNextStage = function () {
        var currentIndex = STAGE_ORDER.indexOf(this.config.currentStage);
        if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
            return null;
        }
        return STAGE_ORDER[currentIndex + 1];
    };
    /**
     * Promote to a specific stage
     */
    TrafficRouter.prototype.promoteToStage = function (stage, onPromote) {
        var previousStage = this.config.currentStage;
        var stageConfig = STAGE_CONFIG[stage];
        this.config.currentStage = stage;
        this.config.busPercentage = stageConfig.busPercentage;
        // Save to settings
        this.settings.setArqonBusCurrentStage(stage);
        this.settings.setArqonBusTrafficPercentage(stageConfig.busPercentage);
        // Reset stage metrics for new stage
        this.stageMetrics.set(stage, this.initStageMetrics());
        this.log.logVerbose("[TrafficRouter] Stage promoted: ".concat(previousStage, " -> ").concat(stage, " ") +
            "(busPercentage: ".concat(stageConfig.busPercentage, "%)"));
        this.tracking.logMetric("stt.cutover.stage.promotion", {
            previous_stage: previousStage,
            new_stage: stage,
            bus_percentage: stageConfig.busPercentage,
            timestamp: Date.now()
        });
        if (onPromote) {
            onPromote(stage);
        }
    };
    /**
     * Trigger immediate rollback
     */
    TrafficRouter.prototype.triggerRollback = function (reason, onRollback) {
        var previousStage = this.config.currentStage;
        this.config.currentStage = "rollback";
        this.config.busPercentage = 0;
        this.metrics.rollbackCount++;
        this.consecutiveFailures = 0;
        // Save to settings
        this.settings.setArqonBusCurrentStage("rollback");
        this.settings.setArqonBusTrafficPercentage(0);
        // Force WebSocket path
        this.config.enabled = false;
        this.log.logError("[TrafficRouter] ROLLBACK triggered: ".concat(reason, " ") +
            "(previous stage: ".concat(previousStage, ")"));
        this.tracking.logMetric("stt.cutover.rollback", {
            reason: reason,
            previous_stage: previousStage,
            rollback_count: this.metrics.rollbackCount,
            timestamp: Date.now()
        });
        if (onRollback) {
            onRollback(reason);
        }
    };
    /**
     * Manual rollback - can be triggered via settings
     */
    TrafficRouter.prototype.manualRollback = function (reason) {
        if (reason === void 0) { reason = "Manual rollback requested"; }
        this.triggerRollback(reason);
    };
    /**
     * Enable/disable cutover
     */
    TrafficRouter.prototype.setEnabled = function (enabled) {
        this.config.enabled = enabled;
        this.settings.setArqonBusCutoverEnabled(enabled);
        this.log.logVerbose("[TrafficRouter] Cutover ".concat(enabled ? "enabled" : "disabled"));
    };
    /**
     * Set traffic percentage manually
     */
    TrafficRouter.prototype.setBusPercentage = function (percentage) {
        this.config.busPercentage = Math.max(0, Math.min(100, percentage));
        this.settings.setArqonBusTrafficPercentage(this.config.busPercentage);
        this.log.logVerbose("[TrafficRouter] Bus traffic percentage set to ".concat(this.config.busPercentage, "%"));
    };
    /**
     * Set current stage
     */
    TrafficRouter.prototype.setStage = function (stage) {
        var stageConfig = STAGE_CONFIG[stage];
        if (!stageConfig) {
            this.log.logError("[TrafficRouter] Invalid stage: ".concat(stage));
            return;
        }
        this.promoteToStage(stage);
    };
    /**
     * Reload configuration from settings
     */
    TrafficRouter.prototype.reloadConfig = function () {
        this.config = this.buildConfig();
        this.log.logVerbose("[TrafficRouter] Configuration reloaded");
    };
    /**
     * Get stage configuration
     */
    TrafficRouter.prototype.getStageConfig = function (stage) {
        return STAGE_CONFIG[stage];
    };
    /**
     * Get all stage configurations
     */
    TrafficRouter.prototype.getAllStageConfigs = function () {
        return STAGE_CONFIG;
    };
    /**
     * Check if rollback is enabled
     */
    TrafficRouter.prototype.isRollbackEnabled = function () {
        return this.config.rollbackEnabled;
    };
    /**
     * Enable/disable rollback
     */
    TrafficRouter.prototype.setRollbackEnabled = function (enabled) {
        this.config.rollbackEnabled = enabled;
        this.settings.setArqonBusRollbackEnabled(enabled);
        this.log.logVerbose("[TrafficRouter] Rollback ".concat(enabled ? "enabled" : "disabled"));
    };
    /**
     * Get detailed metrics for reporting
     */
    TrafficRouter.prototype.getDetailedMetrics = function () {
        var stages = {};
        for (var _i = 0, _a = this.stageMetrics.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], stage = _b[0], metrics = _b[1];
            stages[stage] = __assign({}, metrics);
        }
        return {
            config: this.getConfig(),
            metrics: this.getMetrics(),
            stages: stages,
            stageConfigs: STAGE_CONFIG
        };
    };
    return TrafficRouter;
}());
exports["default"] = TrafficRouter;
/**
 * Factory function to create TrafficRouter instance
 */
function createTrafficRouter(settings, log, tracking) {
    return new TrafficRouter(settings, log, tracking);
}
exports.createTrafficRouter = createTrafficRouter;
