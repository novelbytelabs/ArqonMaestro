"use strict";
exports.__esModule = true;
exports.createSTTComparator = void 0;
/**
 * STT Comparator for comparing WebSocket and Bus paths
 *
 * This module validates that the Bus path produces equivalent results
 * to the WebSocket path before cutover.
 */
var STTComparator = /** @class */ (function () {
    function STTComparator(log, settings, tracking) {
        this.log = log;
        this.settings = settings;
        this.tracking = tracking;
        this.enabled = false;
        this.websocketResponses = new Map();
        this.busResponses = new Map();
        this.comparisonCallbacks = [];
        this.seenMessageIds = new Set();
        this.comparisonBuffer = new Map();
        // Metrics for reporting
        this.totalComparisons = 0;
        this.transcriptMatches = 0;
        this.transcriptMismatches = 0;
        this.commandsCompared = 0;
        this.commandMatches = 0;
        this.commandMismatches = 0;
        this.totalLatencyWebsocket = 0;
        this.totalLatencyBus = 0;
        this.duplicatesDetected = 0;
        this.outOfOrderDetected = 0;
        // Categorical Mismatch Tracking
        this.mismatchCounts = new Map();
        this.maxExamplesPerCategory = 3;
        this.mismatchExamples = [];
        this.similarityThreshold = 0.95;
        this.maxLatencyDeltaMs = 1000;
        this.reportIntervalSeconds = 300;
        this.sampleRate = 1.0;
        // Command extraction patterns
        this.COMMAND_KEYWORDS = ["pause", "resume", "stop", "cancel", "undo", "redo", "save", "delete"];
        this.commandRegex = new RegExp("\\b(".concat(this.COMMAND_KEYWORDS.join("|"), ")\\b"), "gi");
        this.loadConfiguration();
    }
    /**
     * Load comparison configuration from settings
     */
    STTComparator.prototype.loadConfiguration = function () {
        this.enabled = this.settings.getArqonBusCompareEnabled();
        this.similarityThreshold = this.settings.getArqonBusCompareThreshold();
        this.reportIntervalSeconds = this.settings.getArqonBusCompareReportInterval();
        this.sampleRate = this.settings.getArqonBusCompareSampleRate();
        if (this.enabled) {
            this.startReportInterval();
        }
    };
    /**
     * Enable or disable comparison
     */
    STTComparator.prototype.setEnabled = function (enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.startReportInterval();
        }
        else {
            this.stopReportInterval();
        }
    };
    /**
     * Check if comparison is enabled
     */
    STTComparator.prototype.isEnabled = function () {
        return this.enabled;
    };
    /**
     * Register a callback for comparison results
     */
    STTComparator.prototype.onComparisonResult = function (callback) {
        this.comparisonCallbacks.push(callback);
    };
    /**
     * Store a WebSocket response for comparison
     */
    STTComparator.prototype.storeWebSocketResponse = function (sessionId, chunkId, alternatives, latencyMs, isFinal) {
        if (!this.enabled)
            return;
        // Apply sample rate
        if (Math.random() > this.sampleRate)
            return;
        var transcript = (alternatives[0] && alternatives[0].transcript) || "";
        var messageId = "".concat(sessionId, "_").concat(chunkId, "_ws_").concat(isFinal ? "final" : "partial");
        // Check for duplicates
        if (this.seenMessageIds.has(messageId)) {
            this.duplicatesDetected++;
            this.recordMismatchCategory("duplicate", {
                category: "duplicate",
                ws: "websocket_path",
                bus: "duplicate_detected",
                chunk_id: chunkId
            });
            this.log.logVerbose("[Comparator] Duplicate WebSocket message: ".concat(messageId));
            return;
        }
        this.seenMessageIds.add(messageId);
        var response = {
            session_id: sessionId,
            chunk_id: chunkId,
            transcript: transcript,
            alternatives: alternatives,
            latency_ms: latencyMs,
            is_final: isFinal,
            received_at: Date.now(),
            message_id: messageId,
            path: "websocket"
        };
        var key = this.getBufferKey(sessionId, chunkId);
        if (!this.websocketResponses.has(key)) {
            this.websocketResponses.set(key, []);
        }
        this.websocketResponses.get(key).push(response);
        // Update comparison buffer
        this.updateComparisonBuffer(sessionId, chunkId, response);
        this.totalLatencyWebsocket += latencyMs;
        this.totalComparisons++;
    };
    /**
     * Store a Bus response for comparison
     */
    STTComparator.prototype.storeBusResponse = function (sessionId, chunkId, alternatives, latencyMs, isFinal) {
        if (!this.enabled)
            return;
        // Apply sample rate
        if (Math.random() > this.sampleRate)
            return;
        var transcript = (alternatives[0] && alternatives[0].transcript) || "";
        var messageId = "".concat(sessionId, "_").concat(chunkId, "_bus_").concat(isFinal ? "final" : "partial");
        // Check for duplicates
        if (this.seenMessageIds.has(messageId)) {
            this.duplicatesDetected++;
            this.recordMismatchCategory("duplicate", {
                category: "duplicate",
                ws: "N/A",
                bus: "duplicate_detected",
                chunk_id: chunkId
            });
            this.log.logVerbose("[Comparator] Duplicate Bus message: ".concat(messageId));
            return;
        }
        this.seenMessageIds.add(messageId);
        var response = {
            session_id: sessionId,
            chunk_id: chunkId,
            transcript: transcript,
            alternatives: alternatives,
            latency_ms: latencyMs,
            is_final: isFinal,
            received_at: Date.now(),
            message_id: messageId,
            path: "bus"
        };
        var key = this.getBufferKey(sessionId, chunkId);
        if (!this.busResponses.has(key)) {
            this.busResponses.set(key, []);
        }
        this.busResponses.get(key).push(response);
        // Update comparison buffer
        this.updateComparisonBuffer(sessionId, chunkId, response);
        this.totalLatencyBus += latencyMs;
    };
    /**
     * Update comparison buffer and trigger comparison if both paths available
     */
    STTComparator.prototype.updateComparisonBuffer = function (sessionId, chunkId, response) {
        var key = this.getBufferKey(sessionId, chunkId);
        var buffer = this.comparisonBuffer.get(key) || {};
        if (response.path === "websocket") {
            buffer.websocket = response;
        }
        else {
            buffer.bus = response;
        }
        this.comparisonBuffer.set(key, buffer);
        // Trigger comparison if both paths have responses
        if (buffer.websocket && buffer.bus) {
            this.performComparison(buffer.websocket, buffer.bus);
            // Clear from buffer after comparison
            this.comparisonBuffer["delete"](key);
        }
    };
    /**
     * Perform comparison between WebSocket and Bus responses
     */
    STTComparator.prototype.performComparison = function (ws, bus) {
        var similarityScore = this.calculateSimilarity(ws.transcript, bus.transcript);
        var match = similarityScore >= this.similarityThreshold;
        var comparison = {
            session_id: ws.session_id,
            chunk_id: ws.chunk_id,
            websocket_transcript: ws.transcript,
            bus_transcript: bus.transcript,
            match: match,
            similarity_score: similarityScore,
            latency_websocket_ms: ws.latency_ms,
            latency_bus_ms: bus.latency_ms,
            timestamp: new Date().toISOString(),
            transcript_type: ws.is_final ? "final" : "partial"
        };
        // Extract and compare commands
        var wsCommands = this.extractCommands(ws.transcript);
        var busCommands = this.extractCommands(bus.transcript);
        var commandsMatch = this.compareCommands(wsCommands, busCommands);
        if (wsCommands.length > 0 || busCommands.length > 0) {
            this.commandsCompared++;
            if (commandsMatch) {
                this.commandMatches++;
            }
            else {
                this.commandMismatches++;
                this.logCommandMismatch(ws.session_id, ws.chunk_id, wsCommands, busCommands);
            }
        }
        if (match) {
            this.transcriptMatches++;
        }
        else {
            this.transcriptMismatches++;
            this.logMismatch(comparison);
        }
        // Notify callbacks
        this.comparisonCallbacks.forEach(function (cb) { return cb(comparison); });
        // Log metrics
        this.tracking.logMetric("stt.comparison.transcript", {
            session_id: ws.session_id,
            chunk_id: ws.chunk_id,
            match: match,
            similarity_score: similarityScore,
            latency_websocket_ms: ws.latency_ms,
            latency_bus_ms: bus.latency_ms,
            transcript_type: comparison.transcript_type
        });
    };
    /**
     * Calculate similarity score between two transcripts using Levenshtein distance
     */
    STTComparator.prototype.calculateSimilarity = function (a, b) {
        if (a === b)
            return 1.0;
        if (!a || !b)
            return 0.0;
        var distance = this.levenshteinDistance(a, b);
        var maxLength = Math.max(a.length, b.length);
        return 1.0 - (distance / maxLength);
    };
    /**
     * Calculate Levenshtein distance between two strings
     */
    STTComparator.prototype.levenshteinDistance = function (a, b) {
        var matrix = [];
        for (var i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (var j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (var i = 1; i <= b.length; i++) {
            for (var j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };
    /**
     * Extract commands from transcript text
     */
    STTComparator.prototype.extractCommands = function (transcript) {
        var commands = [];
        var match;
        this.commandRegex.lastIndex = 0;
        while ((match = this.commandRegex.exec(transcript)) !== null) {
            commands.push({
                type: match[0].toLowerCase(),
                index: match.index
            });
        }
        return commands;
    };
    /**
     * Compare two sets of commands for equality
     */
    STTComparator.prototype.compareCommands = function (ws, bus) {
        if (ws.length !== bus.length)
            return false;
        for (var i = 0; i < ws.length; i++) {
            if (ws[i].type !== bus[i].type)
                return false;
        }
        return true;
    };
    /**
     * Log command mismatch details
     */
    STTComparator.prototype.logCommandMismatch = function (sessionId, chunkId, ws, bus) {
        this.log.logVerbose("[Comparator] Command mismatch:");
        this.log.logVerbose("  Session: ".concat(sessionId, ", Chunk: ").concat(chunkId));
        this.log.logVerbose("  WebSocket Commands: ".concat(ws.map(function (c) { return c.type; }).join(", ") || "none"));
        this.log.logVerbose("  Bus Commands: ".concat(bus.map(function (c) { return c.type; }).join(", ") || "none"));
        this.recordMismatchCategory("command_mismatch", {
            category: "command_mismatch",
            ws: ws.map(function (c) { return c.type; }).join(", ") || "none",
            bus: bus.map(function (c) { return c.type; }).join(", ") || "none",
            chunk_id: chunkId
        });
    };
    /**
     * Record a mismatch for the report
     */
    STTComparator.prototype.recordMismatchCategory = function (category, example) {
        var currentCount = this.mismatchCounts.get(category) || 0;
        this.mismatchCounts.set(category, currentCount + 1);
        // Only store unique examples up to limit
        if (this.mismatchExamples.filter(function (e) { return e.category === category; }).length < this.maxExamplesPerCategory) {
            this.mismatchExamples.push(example);
        }
    };
    /**
     * Log mismatch details
     */
    STTComparator.prototype.logMismatch = function (comparison) {
        this.log.logVerbose("[Comparator] Transcript mismatch:");
        this.log.logVerbose("  Session: ".concat(comparison.session_id));
        this.log.logVerbose("  Chunk: ".concat(comparison.chunk_id));
        this.log.logVerbose("  Type: ".concat(comparison.transcript_type));
        this.log.logVerbose("  WebSocket: \"".concat(comparison.websocket_transcript, "\""));
        this.log.logVerbose("  Bus: \"".concat(comparison.bus_transcript, "\""));
        this.log.logVerbose("  Similarity: ".concat((comparison.similarity_score * 100).toFixed(1), "%"));
        this.log.logVerbose("  Latency WS: ".concat(comparison.latency_websocket_ms, "ms, Bus: ").concat(comparison.latency_bus_ms, "ms"));
        this.recordMismatchCategory("transcript_mismatch", {
            category: "transcript_mismatch",
            ws: comparison.websocket_transcript,
            bus: comparison.bus_transcript,
            similarity: comparison.similarity_score,
            chunk_id: comparison.chunk_id
        });
        // Log to telemetry
        this.tracking.onMismatchDetected(comparison.chunk_id, comparison.websocket_transcript, comparison.bus_transcript);
    };
    /**
     * Get buffer key for session/chunk
     */
    STTComparator.prototype.getBufferKey = function (sessionId, chunkId) {
        return "".concat(sessionId, ":").concat(chunkId);
    };
    /**
     * Generate comparison report
     */
    STTComparator.prototype.generateReport = function () {
        var avgLatencyWebsocket = this.totalComparisons > 0
            ? this.totalLatencyWebsocket / this.totalComparisons
            : 0;
        var avgLatencyBus = this.totalComparisons > 0
            ? this.totalLatencyBus / this.totalComparisons
            : 0;
        var transcriptMatchRate = this.totalComparisons > 0
            ? this.transcriptMatches / this.totalComparisons
            : 0;
        var commandMatchRate = this.commandsCompared > 0
            ? this.commandMatches / this.commandsCompared
            : null;
        var mismatchCategories = {};
        this.mismatchCounts.forEach(function (count, category) {
            mismatchCategories[category] = count;
        });
        var report = {
            total_comparisons: this.totalComparisons,
            transcript_matches: this.transcriptMatches,
            transcript_mismatches: this.transcriptMismatches,
            commands_compared: this.commandsCompared,
            command_matches: this.commandMatches,
            command_mismatches: this.commandMismatches,
            avg_latency_websocket_ms: avgLatencyWebsocket,
            avg_latency_bus_ms: avgLatencyBus,
            duplicates_detected: this.duplicatesDetected,
            out_of_order_detected: this.outOfOrderDetected,
            transcript_match_rate: transcriptMatchRate,
            command_match_rate: commandMatchRate,
            latency_delta_avg_ms: avgLatencyBus - avgLatencyWebsocket,
            generated_at: new Date().toISOString(),
            mismatch_categories: mismatchCategories,
            mismatch_examples: this.mismatchExamples
        };
        return report;
    };
    /**
     * Log the current report
     */
    STTComparator.prototype.logReport = function () {
        var report = this.generateReport();
        this.log.logVerbose("[Comparator] === Comparison Report ===");
        this.log.logVerbose("  Total Comparisons: ".concat(report.total_comparisons));
        this.log.logVerbose("  Transcript Matches: ".concat(report.transcript_matches, " (").concat((report.transcript_match_rate * 100).toFixed(1), "%)"));
        this.log.logVerbose("  Transcript Mismatches: ".concat(report.transcript_mismatches));
        this.log.logVerbose("  Commands Compared: ".concat(report.commands_compared));
        if (report.command_match_rate !== null) {
            this.log.logVerbose("  Command Match Rate: ".concat((report.command_match_rate * 100).toFixed(1), "%"));
        }
        else {
            this.log.logVerbose("  Command Match Rate: N/A (Not Yet Compared)");
        }
        this.log.logVerbose("  Avg Latency WS: ".concat(report.avg_latency_websocket_ms.toFixed(0), "ms"));
        this.log.logVerbose("  Avg Latency Bus: ".concat(report.avg_latency_bus_ms.toFixed(0), "ms"));
        this.log.logVerbose("  Latency Delta: ".concat(report.latency_delta_avg_ms.toFixed(0), "ms"));
        this.log.logVerbose("  Duplicates: ".concat(report.duplicates_detected));
        this.log.logVerbose("  Out of Order: ".concat(report.out_of_order_detected));
        this.log.logVerbose("============================");
        // Log metrics for telemetry
        this.tracking.logMetric("stt.comparison.report", {
            total_comparisons: report.total_comparisons,
            transcript_match_rate: report.transcript_match_rate,
            command_match_rate: report.command_match_rate === null ? -1 : report.command_match_rate,
            avg_latency_websocket_ms: report.avg_latency_websocket_ms,
            avg_latency_bus_ms: report.avg_latency_bus_ms,
            latency_delta_avg_ms: report.latency_delta_avg_ms,
            duplicates_detected: report.duplicates_detected,
            out_of_order_detected: report.out_of_order_detected
        });
    };
    /**
     * Start periodic report generation
     */
    STTComparator.prototype.startReportInterval = function () {
        var _this = this;
        this.stopReportInterval();
        this.reportInterval = setInterval(function () {
            if (_this.totalComparisons > 0) {
                _this.logReport();
            }
        }, this.reportIntervalSeconds * 1000);
    };
    /**
     * Stop periodic report generation
     */
    STTComparator.prototype.stopReportInterval = function () {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = undefined;
        }
    };
    /**
     * Get current metrics
     */
    STTComparator.prototype.getMetrics = function () {
        return {
            totalComparisons: this.totalComparisons,
            transcriptMatches: this.transcriptMatches,
            transcriptMismatches: this.transcriptMismatches,
            duplicatesDetected: this.duplicatesDetected,
            enabled: this.enabled
        };
    };
    /**
     * Reset metrics (for testing)
     */
    STTComparator.prototype.reset = function () {
        this.websocketResponses.clear();
        this.busResponses.clear();
        this.comparisonBuffer.clear();
        this.seenMessageIds.clear();
        this.totalComparisons = 0;
        this.transcriptMatches = 0;
        this.transcriptMismatches = 0;
        this.totalLatencyWebsocket = 0;
        this.totalLatencyBus = 0;
        this.duplicatesDetected = 0;
        this.outOfOrderDetected = 0;
        this.mismatchCounts.clear();
        this.mismatchExamples = [];
    };
    /**
     * Check if pass/fail thresholds are met
     */
    STTComparator.prototype.checkPassFail = function () {
        var report = this.generateReport();
        var reasons = [];
        // Pass gates
        if (report.transcript_match_rate < 0.90) {
            reasons.push("Transcript match rate below 90%: ".concat((report.transcript_match_rate * 100).toFixed(1), "%"));
        }
        if (report.latency_delta_avg_ms > 1000) {
            reasons.push("Bus latency delta too high: ".concat(report.latency_delta_avg_ms.toFixed(0), "ms > 1000ms"));
        }
        var duplicateRate = report.total_comparisons > 0
            ? report.duplicates_detected / report.total_comparisons
            : 0;
        if (duplicateRate > 0.05) {
            reasons.push("Duplicate rate too high: ".concat((duplicateRate * 100).toFixed(1), "%"));
        }
        var outOfOrderRate = report.total_comparisons > 0
            ? report.out_of_order_detected / report.total_comparisons
            : 0;
        if (outOfOrderRate > 0.02) {
            reasons.push("Out-of-order rate too high: ".concat((outOfOrderRate * 100).toFixed(1), "%"));
        }
        return {
            passed: reasons.length === 0,
            reasons: reasons
        };
    };
    /**
     * Cleanup on destroy
     */
    STTComparator.prototype.destroy = function () {
        this.stopReportInterval();
        this.reset();
    };
    return STTComparator;
}());
exports["default"] = STTComparator;
/**
 * Factory function to create STTComparator instance
 */
function createSTTComparator(log, settings, tracking) {
    return new STTComparator(log, settings, tracking);
}
exports.createSTTComparator = createSTTComparator;
