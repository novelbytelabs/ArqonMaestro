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
exports.createSTTTracking = exports.classifyTranscript = void 0;
var uuid_1 = require("uuid");
/**
 * Helper to classify a transcript into a scenario class
 */
function classifyTranscript(transcript) {
    if (!transcript)
        return "normal";
    var words = transcript.trim().split(/\s+/).length;
    if (words >= 2 && words <= 5)
        return "ack_short";
    if (words > 5 && words <= 15)
        return "normal";
    if (words > 15)
        return "long";
    return "normal";
}
exports.classifyTranscript = classifyTranscript;
/**
 * STT Tracking module for centralized correlation ID generation and metrics.
 * This module provides observability for the STT pipeline and supports
 * both the current WebSocket path and the future Bus path.
 */
var STTTracking = /** @class */ (function () {
    function STTTracking(api, settings) {
        this.currentSession = null;
        this.previousSession = null;
        this.lastActivityTime = 0;
        this.STUCK_LISTENING_THRESHOLD = 30000; // 30 seconds
        this.api = api;
        this.settings = settings;
    }
    /**
     * Generate a new session ID for a listening session.
     */
    STTTracking.prototype.generateSessionId = function () {
        return (0, uuid_1.v4)();
    };
    /**
     * Generate a new message ID for an individual message/envelope.
     */
    STTTracking.prototype.generateMessageId = function () {
        return (0, uuid_1.v4)();
    };
    /**
     * Create a new correlation object with all required IDs.
     */
    STTTracking.prototype.createCorrelation = function (chunkId) {
        return {
            session_id: this.currentSession && this.currentSession.session_id || "",
            message_id: this.generateMessageId(),
            chunk_id: chunkId,
            correlation_trace: []
        };
    };
    /**
     * Add a timestamped phase to the correlation trace.
     */
    STTTracking.prototype.addTracePoint = function (correlation, phase) {
        correlation.correlation_trace.push([phase, Date.now()]);
    };
    /**
     * Start a new listening session.
     */
    STTTracking.prototype.startSession = function () {
        var sessionId = this.generateSessionId();
        this.currentSession = {
            session_id: sessionId,
            start_time: Date.now(),
            reconnect_count: 0,
            pause_resume_race_count: 0,
            chunks: new Map(),
            expected_chunk_sequence: 0
        };
        this.lastActivityTime = Date.now();
        // Start stuck listening detection
        this.startStuckListeningCheck();
        // Log session start
        this.logSessionEvent("session_start", {
            session_id: sessionId,
            timestamp: Date.now()
        });
        return sessionId;
    };
    /**
     * End the current listening session.
     */
    STTTracking.prototype.endSession = function () {
        if (!this.currentSession) {
            return;
        }
        this.currentSession.end_time = Date.now();
        // Stop stuck listening check
        this.stopStuckListeningCheck();
        // Log session end
        this.logSessionEvent("session_end", {
            session_id: this.currentSession.session_id,
            duration: this.currentSession.end_time - this.currentSession.start_time,
            total_chunks: this.currentSession.chunks.size,
            reconnect_count: this.currentSession.reconnect_count,
            pause_resume_race_count: this.currentSession.pause_resume_race_count
        });
        // Archive session for comparison (used for Bus migration)
        this.previousSession = this.currentSession;
        this.currentSession = null;
    };
    /**
     * Record a chunk being received from the microphone.
     */
    STTTracking.prototype.onChunkStart = function (chunkId) {
        if (!this.currentSession) {
            this.startSession();
        }
        var correlation = this.createCorrelation(chunkId);
        this.addTracePoint(correlation, "chunk_start");
        var metrics = {
            correlation: correlation,
            latency: {},
            received_at: Date.now()
        };
        this.currentSession.chunks.set(chunkId, metrics);
        this.currentSession.last_chunk_id = chunkId;
        this.currentSession.expected_chunk_sequence++;
        this.lastActivityTime = Date.now();
        return metrics;
    };
    /**
     * Record audio being sent to the server.
     */
    STTTracking.prototype.onAudioSent = function (chunkId) {
        var metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
        if (metrics) {
            metrics.sent_at = Date.now();
            this.addTracePoint(metrics.correlation, "audio_sent");
            this.lastActivityTime = Date.now();
        }
    };
    /**
     * Record a partial response from the server.
     */
    STTTracking.prototype.onPartialResponse = function (chunkId) {
        var metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
        if (metrics && metrics.received_at) {
            metrics.latency.audio_to_partial = Date.now() - metrics.received_at;
            metrics.partial_response_at = Date.now();
            this.addTracePoint(metrics.correlation, "partial_response");
            this.lastActivityTime = Date.now();
        }
    };
    /**
     * Record a final response from the server.
     */
    STTTracking.prototype.onFinalResponse = function (chunkId) {
        var metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
        if (metrics && metrics.received_at) {
            metrics.latency.audio_to_final = Date.now() - metrics.received_at;
            metrics.final_response_at = Date.now();
            this.addTracePoint(metrics.correlation, "final_response");
            this.lastActivityTime = Date.now();
        }
    };
    /**
     * Record execution of a command.
     */
    STTTracking.prototype.onExecuted = function (chunkId) {
        var metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
        if (metrics) {
            metrics.executed_at = Date.now();
            this.addTracePoint(metrics.correlation, "executed");
            this.lastActivityTime = Date.now();
        }
    };
    /**
     * Record endpoint detection timing.
     */
    STTTracking.prototype.onEndpointDetected = function (chunkId, detectionTime) {
        var metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
        if (metrics && metrics.received_at) {
            metrics.latency.endpoint_detection = detectionTime;
            this.addTracePoint(metrics.correlation, "endpoint_detected");
        }
    };
    /**
     * Record a reconnect event.
     */
    STTTracking.prototype.onReconnect = function () {
        if (!this.currentSession) {
            return;
        }
        var now = Date.now();
        var reconnectLatency = this.currentSession.last_reconnect_time
            ? now - this.currentSession.last_reconnect_time
            : undefined;
        this.currentSession.reconnect_count++;
        this.currentSession.last_reconnect_time = now;
        this.logMetric("stt.reconnect.count", {
            session_id: this.currentSession.session_id,
            count: this.currentSession.reconnect_count,
            latency: reconnectLatency
        });
    };
    /**
     * Detect and record a pause/resume race condition.
     */
    STTTracking.prototype.onPauseResumeRace = function () {
        if (!this.currentSession) {
            return;
        }
        this.currentSession.pause_resume_race_count++;
        this.logMetric("stt.state.pause_resume_race", {
            session_id: this.currentSession.session_id,
            count: this.currentSession.pause_resume_race_count
        });
    };
    /**
     * Detect a dropped chunk (sequence gap).
     */
    STTTracking.prototype.onChunkDrop = function (expectedSequence, actualSequence) {
        if (!this.currentSession) {
            return;
        }
        this.logMetric("stt.drop.detected", {
            session_id: this.currentSession.session_id,
            expected_sequence: expectedSequence,
            actual_sequence: actualSequence,
            dropped_count: expectedSequence - actualSequence
        });
    };
    /**
     * Detect a duplicate transcript.
     */
    STTTracking.prototype.onDuplicateDetected = function (chunkId) {
        this.logMetric("stt.duplicate.detected", {
            session_id: this.currentSession && this.currentSession.session_id,
            chunk_id: chunkId
        });
    };
    /**
     * Detect a transcript mismatch between paths (for Bus migration).
     */
    STTTracking.prototype.onMismatchDetected = function (chunkId, websocketTranscript, busTranscript) {
        this.logMetric("stt.state.mismatch", {
            session_id: this.currentSession && this.currentSession.session_id,
            chunk_id: chunkId,
            websocket_transcript: websocketTranscript,
            bus_transcript: busTranscript
        });
    };
    /**
     * Get current session ID.
     */
    STTTracking.prototype.getCurrentSessionId = function () {
        return this.currentSession && this.currentSession.session_id || null;
    };
    /**
     * Get metrics for a specific chunk.
     */
    STTTracking.prototype.getChunkMetrics = function (chunkId) {
        return this.currentSession ? this.currentSession.chunks.get(chunkId) : undefined;
    };
    /**
     * Get session-level metrics.
     */
    STTTracking.prototype.getSessionMetrics = function () {
        if (!this.currentSession) {
            return null;
        }
        return {
            session_id: this.currentSession.session_id,
            duration: Date.now() - this.currentSession.start_time,
            total_chunks: this.currentSession.chunks.size,
            reconnect_count: this.currentSession.reconnect_count,
            pause_resume_race_count: this.currentSession.pause_resume_race_count
        };
    };
    /**
     * Start stuck listening detection.
     */
    STTTracking.prototype.startStuckListeningCheck = function () {
        var _this = this;
        this.stopStuckListeningCheck();
        this.stuckListeningCheckInterval = setInterval(function () {
            if (!_this.currentSession) {
                return;
            }
            var timeSinceLastActivity = Date.now() - _this.lastActivityTime;
            if (timeSinceLastActivity > _this.STUCK_LISTENING_THRESHOLD) {
                // Record stuck listening metric
                if (!_this.currentSession.stuck_listening_start) {
                    _this.currentSession.stuck_listening_start = _this.lastActivityTime;
                }
                _this.logMetric("stt.state.stuck_listening", {
                    session_id: _this.currentSession.session_id,
                    stuck_duration: timeSinceLastActivity,
                    threshold: _this.STUCK_LISTENING_THRESHOLD
                });
            }
        }, 5000);
    };
    /**
     * Stop stuck listening detection.
     */
    STTTracking.prototype.stopStuckListeningCheck = function () {
        if (this.stuckListeningCheckInterval) {
            clearInterval(this.stuckListeningCheckInterval);
            this.stuckListeningCheckInterval = undefined;
        }
    };
    /**
     * Log a session-level event.
     */
    STTTracking.prototype.logSessionEvent = function (event, data) {
        if (this.settings.getDisableAnalytics()) {
            return;
        }
        this.api.logEvent("stt.session.".concat(event), {
            dt: Date.now(),
            data: __assign({}, data)
        });
    };
    /**
     * Log a metric with correlation data.
     */
    STTTracking.prototype.logMetric = function (metricName, data) {
        if (this.settings.getDisableAnalytics()) {
            return;
        }
        this.api.logEvent(metricName, {
            dt: Date.now(),
            data: __assign(__assign({}, data), { session_id: this.currentSession && this.currentSession.session_id })
        });
    };
    /**
     * Log latency metrics for a chunk (called on final response).
     */
    STTTracking.prototype.logLatencyMetrics = function (chunkId) {
        var metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
        if (!metrics) {
            return;
        }
        if (metrics.latency.audio_to_partial !== undefined) {
            this.api.logEvent("stt.latency.audio_to_partial", {
                dt: Date.now(),
                data: {
                    chunk_id: chunkId,
                    session_id: metrics.correlation.session_id,
                    latency_ms: metrics.latency.audio_to_partial,
                    correlation_trace: metrics.correlation.correlation_trace
                }
            });
        }
        if (metrics.latency.audio_to_final !== undefined) {
            this.api.logEvent("stt.latency.audio_to_final", {
                dt: Date.now(),
                data: {
                    chunk_id: chunkId,
                    session_id: metrics.correlation.session_id,
                    latency_ms: metrics.latency.audio_to_final,
                    correlation_trace: metrics.correlation.correlation_trace
                }
            });
        }
        if (metrics.latency.endpoint_detection !== undefined) {
            this.api.logEvent("stt.latency.endpoint_detection", {
                dt: Date.now(),
                data: {
                    chunk_id: chunkId,
                    session_id: metrics.correlation.session_id,
                    latency_ms: metrics.latency.endpoint_detection
                }
            });
        }
    };
    return STTTracking;
}());
exports["default"] = STTTracking;
/**
 * Factory function to create STTTracking instance.
 */
function createSTTTracking(api, settings) {
    return new STTTracking(api, settings);
}
exports.createSTTTracking = createSTTTracking;
