"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var uuid_1 = require("uuid");
var alternatives_1 = require("../../shared/alternatives");
var cfh_1 = require("../stt/cfh");
/**
 * When speaking, chunks go through the following states:
 * - onChunkStart: speech is detected, and the leading buffer is sent
 * - onAudio: speech is continuing
 * - onChunkEnd: chunk has ended, so send a finalized endpoint request
 *
 * We need to make sure to handle all of the following cases:
 * - speaking -> endpoint -> response -> silence
 * - speaking -> endpoint -> silence -> response
 * - speaking -> endpoint -> speaking -> response -> endpoint -> response -> silence
 * - speaking -> endpoint -> speaking -> response -> endpoint -> silence -> response
 * - start executing -> speaking -> stop executing -> silence
 * - start executing -> speaking -> silence -> stop executing
 * - revert -> speaking -> response -> silence
 * - revert -> speaking -> silence -> response
 */
var ChunkManager = /** @class */ (function () {
    function ChunkManager(active, api, app, bridge, chunkQueue, custom, executor, log, mainWindow, microphone, miniModeWindow, settings, stream, tracking) {
        this.active = active;
        this.api = api;
        this.app = app;
        this.bridge = bridge;
        this.chunkQueue = chunkQueue;
        this.custom = custom;
        this.executor = executor;
        this.log = log;
        this.mainWindow = mainWindow;
        this.microphone = microphone;
        this.miniModeWindow = miniModeWindow;
        this.settings = settings;
        this.stream = stream;
        this.tracking = tracking;
        this.audioSizeForDelayedInitialize = 6;
        this.buffer = [];
        this.buffering = false;
        this.deadlineToMakeNewInitializeRequest = 0;
        this.maxAudioFramesPerChunk = 90;
        this.speaking = false;
        this.toggleGeneration = 0;
        this.timeToWaitBeforeClassifyingAsNoise = 200;
        this.timeToWaitBeforeStartingNewCommand = 5000;
        this.lastToggleTime = 0;
        this.busClient = null;
        this.sessionStartTime = 0;
        this.audioSequenceNumber = 0;
        this.presencePulseInterval = 500; // ms
        // Phase 3: Throttle/Debounce for SAS Precheck
        this.transcriptDebounceMs = 100;
        this.throttleMaxRequestsPerSecond = 10;
        this.throttleRequestTimestamps = [];
        this.listening = false;
        // Lazy load bus client to avoid circular dependencies
    }
    /**
     * Set the Bus client for shadow publishing
     */
    ChunkManager.prototype.setBusClient = function (busClient) {
        this.busClient = busClient;
        if (busClient && busClient.isEnabled()) {
            busClient.connect();
        }
    };
    /**
     * Set the comparator for WebSocket vs Bus comparison
     */
    ChunkManager.prototype.setComparator = function (comparator) {
        var _this = this;
        this.comparator = comparator;
        if (this.comparator && this.busClient && this.busClient.isEnabled()) {
            // Register callback to receive Bus responses for comparison
            this.busClient.registerTranscriptCallback(function (sessionId, chunkId, alternatives, latencyMs, isFinal) {
                var _a;
                if ((_a = _this.comparator) === null || _a === void 0 ? void 0 : _a.isEnabled()) {
                    _this.comparator.storeBusResponse(sessionId, chunkId, alternatives, latencyMs, isFinal);
                }
            });
        }
    };
    /**
     * Set the traffic router for cutover routing
     */
    ChunkManager.prototype.setTrafficRouter = function (router) {
        this.trafficRouter = router;
        this.log.logVerbose("[ChunkManager] Traffic router configured");
    };
    /**
     * Get current routing decision
     */
    ChunkManager.prototype.getCurrentRoutingDecision = function () {
        return this.currentRoutingDecision;
    };
    /**
     * Route session to either WebSocket or Bus based on traffic router
     */
    ChunkManager.prototype.routeSession = function (sessionId) {
        if (!this.trafficRouter || !this.trafficRouter.isEnabled()) {
            return "websocket";
        }
        // Check if Bus is healthy
        if (!this.trafficRouter.isBusHealthy()) {
            return "websocket";
        }
        // Get routing decision
        var decision = this.trafficRouter.route(sessionId);
        this.currentRoutingDecision = decision;
        this.log.logVerbose("[ChunkManager] Session ".concat(sessionId.substring(0, 8), " routed to: ").concat(decision.path));
        // Enable execution mode on Bus client if routed to bus
        if (decision.path === "bus" && this.busClient) {
            this.busClient.setExecutionMode(true, this.handleBusResponse.bind(this));
        }
        else if (this.busClient) {
            this.busClient.setExecutionMode(false);
        }
        return decision.path;
    };
    /**
     * Handle response from Bus (execution mode)
     */
    ChunkManager.prototype.handleBusResponse = function (sessionId, chunkId, alternatives, latencyMs, isFinal) {
        var _a;
        this.busResponseLatency = latencyMs;
        // Record metrics for the Bus path
        if (this.trafficRouter && ((_a = this.currentRoutingDecision) === null || _a === void 0 ? void 0 : _a.path) === "bus") {
            this.trafficRouter.recordSessionResult(sessionId, "bus", true, // success - we received a response
            latencyMs, this.websocketResponseLatency, undefined // matched - comparison handled separately
            );
        }
    };
    /**
     * Check if should route to Bus for current session
     */
    ChunkManager.prototype.shouldUseBusPath = function () {
        var _a, _b;
        return ((_a = this.currentRoutingDecision) === null || _a === void 0 ? void 0 : _a.path) === "bus" && ((_b = this.busClient) === null || _b === void 0 ? void 0 : _b.isConnected());
    };
    // ============================================================================
    // Phase 3: Predictive Resolution (CFH-based addr_id computation)
    // ============================================================================
    /**
     * Compute predictive addr_id from transcript text using CFH.
     * This enables O(0) routing via pre-computed semantic address.
     *
     * @param transcript - The transcript text to compute addr_id for
     * @returns Promise<{ addrId: string, cfhSignature: string } | null>
     */
    ChunkManager.prototype.computeAddrIdFromTranscript = function (transcript) {
        if (!transcript || transcript.trim().length === 0) {
            return null;
        }
        try {
            var startTime = performance.now();
            // Generate CFH signature (128 bytes = 1024 bits)
            var sigBytes = (0, cfh_1.generateSignatureBytes)(transcript, 128);
            var sigU64 = (0, cfh_1.sigBytesToU64x16)(sigBytes);
            // Convert signature to hex for transmission
            var cfhSignature = Array.from(sigBytes)
                .map(function (b) { return b.toString(16).padStart(2, '0'); })
                .join('');
            // Compute bucket-based addr_id from signature
            // Using first 8 bytes of signature as hex string for addr_id
            var addrId = 'addr_' + cfhSignature.substring(0, 16);
            var elapsed = performance.now() - startTime;
            if (elapsed > 10) {
                this.log.logVerbose("[ChunkManager] CFH signature generation took ".concat(elapsed.toFixed(2), "ms (exceeds 10ms threshold)"));
            }
            return { addrId: addrId, cfhSignature: cfhSignature };
        }
        catch (error) {
            this.log.logVerbose("[ChunkManager] Error computing addr_id: ".concat(error));
            return null;
        }
    };
    /**
     * Update predictive addr_id on transcript events (partial/final).
     * This should be called whenever a new transcript is received.
     */
    ChunkManager.prototype.updatePredictiveAddrId = function (transcript, isFinal) {
        var result = this.computeAddrIdFromTranscript(transcript);
        if (result) {
            this.currentPredictiveAddrId = result.addrId;
            this.currentPredictiveCFHSignature = result.cfhSignature;
            this.log.logVerbose("[ChunkManager] Predictive addr_id updated: ".concat(this.currentPredictiveAddrId, " (final: ").concat(isFinal, ")"));
        }
    };
    // ============================================================================
    // Phase 3: Presence Pulse (Heartbeat mechanism)
    // ============================================================================
    /**
     * Start the presence pulse heartbeat mechanism.
     * Fires heartbeats with currentPredictiveAddrId at configured interval.
     */
    ChunkManager.prototype.startPresencePulse = function () {
        var _this = this;
        if (this.presencePulseTimer) {
            return; // Already running
        }
        this.log.logVerbose("[ChunkManager] Starting presence pulse with ".concat(this.presencePulseInterval, "ms interval"));
        this.presencePulseTimer = setInterval(function () {
            _this.publishPresencePulse();
        }, this.presencePulseInterval);
    };
    /**
     * Stop the presence pulse heartbeat.
     */
    ChunkManager.prototype.stopPresencePulse = function () {
        if (this.presencePulseTimer) {
            clearInterval(this.presencePulseTimer);
            this.presencePulseTimer = undefined;
            this.log.logVerbose("[ChunkManager] Stopped presence pulse");
        }
    };
    /**
     * Publish a presence pulse (heartbeat) with currentPredictiveAddrId.
     * Non-blocking execution should complete in < 10ms.
     */
    ChunkManager.prototype.publishPresencePulse = function () {
        var _a;
        if (!this.currentPredictiveAddrId) {
            return;
        }
        var startTime = performance.now();
        try {
            // Publish presence pulse to bus
            if (this.busClient && this.busClient.isEnabled() && this.tracking.getCurrentSessionId()) {
                var sessionId = this.tracking.getCurrentSessionId();
                var chunkId = ((_a = this.chunkQueue.getIndex(0)) === null || _a === void 0 ? void 0 : _a.id) || (0, uuid_1.v4)();
                // Publish as a special presence pulse message
                this.busClient.publishPresencePulse(sessionId, chunkId, this.currentPredictiveAddrId, this.currentPredictiveCFHSignature || '', Date.now());
            }
            var elapsed = performance.now() - startTime;
            if (elapsed > 10) {
                this.log.logVerbose("[ChunkManager] Presence pulse took ".concat(elapsed.toFixed(2), "ms (exceeds 10ms threshold)"));
            }
        }
        catch (error) {
            this.log.logVerbose("[ChunkManager] Error publishing presence pulse: ".concat(error));
        }
    };
    // ============================================================================
    // Phase 3: Throttle/Debounce for SAS Precheck
    // ============================================================================
    /**
     * Check if we can send a new request based on throttle limits.
     * Returns true if under the limit (10 req/s), false if throttled.
     */
    ChunkManager.prototype.canSendSASPrecheck = function () {
        var now = Date.now();
        var oneSecondAgo = now - 1000;
        // Remove timestamps older than 1 second
        this.throttleRequestTimestamps = this.throttleRequestTimestamps.filter(function (ts) { return ts > oneSecondAgo; });
        // Check if under limit
        return this.throttleRequestTimestamps.length < this.throttleMaxRequestsPerSecond;
    };
    /**
     * Record a SAS precheck request for throttle tracking.
     */
    ChunkManager.prototype.recordSASPrecheckRequest = function () {
        this.throttleRequestTimestamps.push(Date.now());
    };
    /**
     * Debounced SAS precheck - prevents flooding with rapid transcript changes.
     * Uses 100ms debounce delay.
     */
    ChunkManager.prototype.scheduleSASPrecheck = function (transcript, isFinal, chunkId) {
        var _this = this;
        // Store pending transcript
        this.pendingTranscript = { text: transcript, isFinal: isFinal, chunkId: chunkId };
        // Clear existing debounce timer
        if (this.transcriptDebounceTimer) {
            clearTimeout(this.transcriptDebounceTimer);
        }
        // Set new debounce timer
        this.transcriptDebounceTimer = setTimeout(function () {
            _this.executeSASPrecheck();
        }, this.transcriptDebounceMs);
    };
    /**
     * Execute the SAS precheck if not throttled.
     * Implements fallback behavior when throttled.
     */
    ChunkManager.prototype.executeSASPrecheck = function () {
        if (!this.pendingTranscript) {
            return;
        }
        var _a = this.pendingTranscript, text = _a.text, isFinal = _a.isFinal, chunkId = _a.chunkId;
        this.pendingTranscript = undefined;
        // Check throttle limit
        if (!this.canSendSASPrecheck()) {
            this.log.logVerbose("[ChunkManager] SAS precheck throttled, using fallback for: ".concat(text.substring(0, 30), "..."));
            // Fallback: use cached result if recent (< 5 seconds old)
            if (this.lastSASPrecheckResult &&
                Date.now() - this.lastSASPrecheckResult.timestamp < 5000) {
                this.log.logVerbose("[ChunkManager] Using cached SAS precheck result");
                return;
            }
            // If no cached result, proceed anyway (fallback to compute locally)
        }
        // Record the request for throttle tracking
        this.recordSASPrecheckRequest();
        // Perform the actual SAS precheck
        // This would typically send to a precheck service
        var result = this.computeAddrIdFromTranscript(text);
        if (result) {
            this.lastSASPrecheckResult = {
                addrId: result.addrId,
                timestamp: Date.now(),
                valid: true
            };
            // Phase 3: Emit the Address Query (Zero-Copy routing path)
            if (this.busClient && this.busClient.isEnabled() && this.tracking.getCurrentSessionId()) {
                this.busClient.publishAddressQuery(this.tracking.getCurrentSessionId(), chunkId, text, result.addrId, result.cfhSignature, 1.0, // Precheck confidence
                isFinal);
            }
        }
    };
    /**
     * Clean up throttle/debounce resources.
     */
    ChunkManager.prototype.cleanupThrottleDebounce = function () {
        if (this.transcriptDebounceTimer) {
            clearTimeout(this.transcriptDebounceTimer);
            this.transcriptDebounceTimer = undefined;
        }
        this.pendingTranscript = undefined;
    };
    /**
     * Publish an STT envelope to the Bus if enabled
     */
    ChunkManager.prototype.publishToBus = function (envelopeType) {
        var _a;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.busClient || !this.busClient.isEnabled() || !this.tracking.getCurrentSessionId()) {
            return;
        }
        try {
            var sessionId = this.tracking.getCurrentSessionId();
            var chunk = this.chunkQueue.getIndex(0);
            var chunkId = (chunk === null || chunk === void 0 ? void 0 : chunk.id) || (0, uuid_1.v4)();
            switch (envelopeType) {
                case "session_start":
                    this.busClient.publishSessionStart(sessionId, chunkId, "en-US", // TODO: Get actual language
                    ((_a = this.settings.getStreamingEndpoint()) === null || _a === void 0 ? void 0 : _a.id) || "default");
                    break;
                case "audio_append":
                    this.busClient.publishAudioAppend(sessionId, chunkId, args[0], // audioData
                    args[1], // sequenceNumber
                    args[2], // timestampMs
                    this.currentPredictiveAddrId // Vertical Pass
                    );
                    break;
                case "endpoint_request":
                    this.busClient.publishEndpointRequest(sessionId, chunkId, args[0], // finalize
                    args[1] // endpointType
                    );
                    break;
                case "transcript_partial":
                    this.busClient.publishTranscriptPartial(sessionId, chunkId, args[0], // alternatives
                    args[1], // latencyMs
                    args[2], // silenceThreshold
                    args[3], // modelId
                    args[4], // redactionApplied
                    args[5], // addr_id (optional)
                    args[6] // cfh_signature (optional)
                    );
                    break;
                case "transcript_final":
                    this.busClient.publishTranscriptFinal(sessionId, chunkId, args[0], // alternatives
                    args[1], // latencyMs
                    args[2], // silenceThreshold
                    args[3], // modelId
                    args[4], // redactionApplied
                    args[5], // addr_id (optional)
                    args[6] // cfh_signature (optional)
                    );
                    break;
                case "session_stop":
                    this.busClient.publishSessionStop(sessionId, args[0], // chunkId
                    args[1], // reason
                    args[2] // durationMs
                    );
                    break;
            }
        }
        catch (error) {
            this.log.logVerbose("[ChunkManager] Bus publish error: ".concat(error));
        }
    };
    ChunkManager.prototype.enqueue = function (request, flush) {
        if (flush === void 0) { flush = true; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.buffer.push(request);
                if (flush) {
                    this.flush();
                }
                return [2 /*return*/];
            });
        });
    };
    ChunkManager.prototype.flush = function () {
        return __awaiter(this, void 0, void 0, function () {
            var request;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.buffering) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        if (!(this.buffer.length > 0)) return [3 /*break*/, 3];
                        request = this.buffer.shift();
                        if (request.requestType != "audio") {
                            this.log.logVerbose("Flushing ".concat(request.requestType));
                        }
                        return [4 /*yield*/, this.send(request)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ChunkManager.prototype.getLogEntry = function (alternative) {
        return {
            alternative_id: alternative.alternativeId,
            description: alternative.description,
            transcript: alternative.transcript,
            commands: (alternative.commands || []).map(function (c) {
                var o = {
                    type: (0, alternatives_1.commandTypeToString)(c.type)
                };
                if (c.index > 0) {
                    o.index = c.index;
                }
                return o;
            })
        };
    };
    ChunkManager.prototype.getResponse = function (chunk) {
        if (chunk.reverted && chunk.revertedResponse) {
            return chunk.revertedResponse;
        }
        if (!chunk.reverted && chunk.response) {
            return chunk.response;
        }
        return undefined;
    };
    ChunkManager.prototype.logResponse = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _a, _b;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        data = {
                            token: this.settings.getToken(),
                            endpoint_id: response.endpointId,
                            session_id: this.tracking.getCurrentSessionId()
                        };
                        if (this.settings.getLogAudio() || this.settings.getLogSource()) {
                            data.endpoint = this.settings.getStreamingEndpoint().id;
                            data.chunk_ids = response.chunkIds;
                            if (response.execute) {
                                data.execute = this.getLogEntry(response.execute);
                            }
                            if (response.alternatives && response.alternatives.length > 0) {
                                data.alternatives = response.alternatives.map(function (e) {
                                    return _this.getLogEntry(e);
                                });
                            }
                        }
                        this.api.logEvent("client.stream.".concat(response.final ? "final" : "partial", "_response"), {
                            dt: Date.now(),
                            data: data
                        }, {
                            session_id: this.tracking.getCurrentSessionId() || undefined,
                            chunk_id: response.chunkId || undefined
                        });
                        if (!(response.final &&
                            this.settings.getStreamingEndpoint() &&
                            this.settings.getStreamingEndpoint().id == "local" &&
                            this.settings.getLogSource())) return [3 /*break*/, 2];
                        _b = (_a = this.api).logLocalResponse;
                        return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        _b.apply(_a, [_c.sent(), response]);
                        _c.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    ChunkManager.prototype.reachedSilenceThreshold = function (chunk) {
        var response = this.getResponse(chunk);
        return (!!response &&
            chunk.silence >= this.settings.getExecuteSilenceThreshold() * response.silenceThreshold);
    };
    ChunkManager.prototype.send = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(request.requestType == "initialize")) return [3 /*break*/, 3];
                        this.startBuffering();
                        return [4 /*yield*/, this.stream.sendInitializeRequest()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.stopBufferingAndFlush()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 3:
                        if (!(request.requestType == "audio")) return [3 /*break*/, 4];
                        this.stream.sendAudioRequest(request.audio, request.chunkId);
                        return [3 /*break*/, 8];
                    case 4:
                        if (!(request.requestType == "editor")) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.stream.sendEditorStateRequest()];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 6:
                        if (!(request.requestType == "endpoint")) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.stream.sendEndpointRequest(request.chunkId, request.finalize)];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    ChunkManager.prototype.shouldAppendToPrevious = function (response) {
        if (!this.active.pluginConnected() ||
            this.chunkQueue.size() < 2 ||
            this.active.dictateMode ||
            !response ||
            !response.alternatives ||
            response.alternatives.length == 0) {
            return false;
        }
        var current = this.chunkQueue.getIndex(0);
        var previous = null;
        for (var i = 1; i < Math.min(this.chunkQueue.size(), 10); i++) {
            var chunk = this.chunkQueue.getIndex(i);
            if (chunk.executed || chunk.reverted) {
                previous = chunk;
                break;
            }
        }
        if (!previous) {
            return false;
        }
        var result = this.active.isFirstPartyEditor() &&
            !current.reverted &&
            Date.now() - Math.max(previous.reverted, previous.executed) <
                this.timeToWaitBeforeStartingNewCommand &&
            !(0, alternatives_1.isMetaResponse)(response) &&
            response.alternatives.every(function (e) { return !(0, alternatives_1.isValidAlternative)(e); }) &&
            this.startsWithTextPrefix(this.getResponse(previous)) &&
            !this.startsWithTextPrefix(response);
        return !!result;
    };
    ChunkManager.prototype.startsWithTextPrefix = function (response) {
        return !!(response &&
            response.alternatives &&
            response.alternatives.length > 0 &&
            !!response.alternatives[0].transcript.match(/^(add|change|dictate|insert|newline|type)/));
    };
    ChunkManager.prototype.attemptToEvaluateChunk = function (chunk) {
        return __awaiter(this, void 0, void 0, function () {
            var current;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.chunkQueue.size() == 0) {
                            this.log.logVerbose("Attempt to evaluate chunk, but empty chunk queue");
                            return [2 /*return*/];
                        }
                        current = this.chunkQueue.getIndex(0);
                        this.log.logVerbose("Attempt to evaluate chunk\n  chunk.id: ".concat(chunk.id, "\n  chunk.executed: ").concat(chunk.executed, "\n  chunk.reverted: ").concat(chunk.reverted, "\n  chunk.response: ").concat(!!chunk.response, "\n  chunk.silence: ").concat(chunk.silence, " (").concat(this.reachedSilenceThreshold(chunk), ")\n  current.id: ").concat(current.id, "\n  current.audioSize: ").concat(current.audioSize));
                        if (!chunk.reverted && chunk.executed) {
                            this.log.logVerbose("Not executing chunk ".concat(chunk.id, ": already executed"));
                            return [2 /*return*/];
                        }
                        if (chunk.id != current.id) {
                            this.log.logVerbose("Not executing chunk ".concat(chunk.id, ": new chunk started"));
                            return [2 /*return*/];
                        }
                        if (!chunk.reverted && !chunk.response) {
                            this.log.logVerbose("Not executing chunk ".concat(chunk.id, ": no final response yet"));
                            return [2 /*return*/];
                        }
                        if (chunk.reverted && !chunk.revertedResponse) {
                            this.log.logVerbose("Not executing chunk ".concat(chunk.id, ": no reverted response yet"));
                            return [2 /*return*/];
                        }
                        if (!this.reachedSilenceThreshold(chunk)) {
                            this.log.logVerbose("Not executing chunk ".concat(chunk.id, ": waiting for silence"));
                            return [2 /*return*/];
                        }
                        // nothing to execute means noise, so send an initialize request
                        if (!chunk.reverted &&
                            chunk.response &&
                            (!chunk.response.alternatives || chunk.response.alternatives.length == 0) &&
                            !chunk.response.execute) {
                            this.log.logVerbose("Not executing chunk ".concat(chunk.id, ": no alternatives or execute"));
                            this.deadlineToMakeNewInitializeRequest =
                                chunk.audioSize < this.audioSizeForDelayedInitialize
                                    ? Date.now() + this.timeToWaitBeforeClassifyingAsNoise
                                    : 0;
                            return [2 /*return*/];
                        }
                        if (chunk.response && chunk.response.final && this.shouldAppendToPrevious(chunk.response)) {
                            this.log.logVerbose("Appending to previous ".concat(chunk.id));
                            chunk.reverted = Date.now();
                            chunk.executed = 0;
                            chunk.silence = 0;
                            this.stream.sendAppendToPreviousRequest();
                            this.enqueue({ requestType: "endpoint", chunkId: chunk.id, finalize: true });
                            return [2 /*return*/];
                        }
                        this.log.logVerbose("Setting partial to false");
                        this.bridge.setState({
                            partial: false
                        }, [this.mainWindow, this.miniModeWindow]);
                        this.log.logVerbose("Executing chunk ".concat(chunk.id));
                        this.deadlineToMakeNewInitializeRequest = 0;
                        chunk.executed = Date.now();
                        // Track execution
                        this.tracking.onExecuted(chunk.id);
                        this.startBuffering();
                        return [4 /*yield*/, this.executor.execute(this.getResponse(chunk))];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.stopBufferingAndFlush()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ChunkManager.prototype.onCommandsResponse = function (response) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var chunk, chunkMetrics, chunkLatencyMs, busAlternatives, sessionId, silenceThreshold, modelId, transcriptText, partial;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        chunk = this.chunkQueue.getChunk(response.chunkId);
                        if (!chunk) {
                            this.log.logVerbose("No chunk found for ".concat(response.chunkId));
                            return [2 /*return*/];
                        }
                        this.log.logVerbose("Received ".concat(response.final ? "final" : "partial", " response for ").concat(chunk.id, ": [").concat((response.alternatives || [])
                            .map(function (e) { return e.transcript; })
                            .join(", "), "]"));
                        chunkMetrics = this.tracking.getChunkMetrics(chunk.id);
                        chunkLatencyMs = (chunkMetrics === null || chunkMetrics === void 0 ? void 0 : chunkMetrics.received_at) ? Date.now() - chunkMetrics.received_at : 0;
                        // Track response latency
                        if (response.final) {
                            this.tracking.onFinalResponse(chunk.id);
                            this.tracking.logLatencyMetrics(chunk.id);
                            // Track WebSocket latency for comparison with Bus
                            this.websocketResponseLatency = chunkLatencyMs;
                        }
                        else {
                            this.tracking.onPartialResponse(chunk.id);
                        }
                        busAlternatives = (response.alternatives || []).map(function (alt, index) { return ({
                            transcript: alt.transcript || "",
                            rank: index,
                            score: alt.confidence || alt.score || 0,
                            is_final: !!response.final
                        }); });
                        // Store WebSocket response for comparison with Bus
                        if ((_a = this.comparator) === null || _a === void 0 ? void 0 : _a.isEnabled()) {
                            sessionId = this.tracking.getCurrentSessionId();
                            if (sessionId) {
                                this.comparator.storeWebSocketResponse(sessionId, chunk.id, busAlternatives, chunkLatencyMs, !!response.final);
                            }
                        }
                        silenceThreshold = response.silenceThreshold || 0.3;
                        modelId = ((_b = this.settings.getStreamingEndpoint()) === null || _b === void 0 ? void 0 : _b.id) || "default";
                        transcriptText = (response.alternatives || [])
                            .map(function (alt) { return alt.transcript; })
                            .filter(Boolean)
                            .join(" ");
                        // Update predictive addr_id on transcript events
                        if (transcriptText) {
                            this.updatePredictiveAddrId(transcriptText, !!response.final);
                            // Schedule SAS precheck with debounce (throttle/debounce)
                            this.scheduleSASPrecheck(transcriptText, !!response.final, chunk.id);
                        }
                        if (response.final) {
                            this.publishToBus("transcript_final", busAlternatives, chunkLatencyMs, silenceThreshold, modelId, false, this.currentPredictiveAddrId, this.currentPredictiveCFHSignature);
                        }
                        else {
                            this.publishToBus("transcript_partial", busAlternatives, chunkLatencyMs, silenceThreshold, modelId, false, this.currentPredictiveAddrId, this.currentPredictiveCFHSignature);
                        }
                        if (!response.final) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.executor.postProcessResponse(response)];
                    case 1:
                        response = _c.sent();
                        if (chunk.reverted) {
                            chunk.revertedResponse = response;
                        }
                        else {
                            chunk.response = response;
                        }
                        _c.label = 2;
                    case 2:
                        if (!this.shouldAppendToPrevious(response)) {
                            partial = !chunk.executed && (!response.final || !this.reachedSilenceThreshold(chunk));
                            if (!(0, alternatives_1.isMetaResponse)(response) && response.alternatives && response.alternatives.length > 0) {
                                this.log.logVerbose("Setting partial = ".concat(partial));
                                this.bridge.setState({
                                    partial: partial
                                }, [this.mainWindow, this.miniModeWindow]);
                                if (partial) {
                                    response = this.executor.truncateAlternativesIfNeeded(response);
                                    this.executor.showAlternativesIfPresent(response);
                                }
                            }
                        }
                        return [4 /*yield*/, this.logResponse(response)];
                    case 3:
                        _c.sent();
                        if (!response.final) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.attemptToEvaluateChunk(chunk)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    ChunkManager.prototype.onAudio = function (audio, silence) {
        var _a;
        var current = this.chunkQueue.getIndex(0);
        if (!current) {
            return;
        }
        current.silence = silence;
        if (this.speaking) {
            current.audioSize++;
            this.enqueue({ requestType: "audio", audio: Buffer.from(audio.buffer), chunkId: current.id });
            // Publish audio to Bus (shadow publish)
            this.publishToBus("audio_append", Buffer.from(audio.buffer), this.audioSequenceNumber++, Date.now(), this.currentPredictiveAddrId // Initial pass for sequence tracking
            );
            if (!current.forceFinalized && current.audioSize >= this.maxAudioFramesPerChunk) {
                current.forceFinalized = true;
                this.speaking = false;
                console.log("[Chunk] Force finalize ".concat(current.id, " audioFrames=").concat(current.audioSize));
                this.enqueue({ requestType: "editor" }, false);
                this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: true });
                return;
            }
            // we want to send non-final endpoint requests (aka partials) every so often when it seems like a long
            // command is being spoken, but we're not near the end of it (at which point an endpoint request
            // will be sent anyway), in order to trade off a responsive UI with not overloading the server
            if (current.audioSize > 0 &&
                current.audioSize % (current.audioSize < 66 ? 15 : 66) == 0 &&
                current.silence < 4) {
                this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: false });
            }
        }
        var silenceThreshold;
        if (!current.reverted && current.response) {
            silenceThreshold = current.response.silenceThreshold;
        }
        else if (current.reverted && current.revertedResponse) {
            silenceThreshold = current.revertedResponse.silenceThreshold;
        }
        else {
            return;
        }
        if (current.silence == Math.ceil(this.settings.getExecuteSilenceThreshold() * silenceThreshold)) {
            this.log.logVerbose("Silence hit for ".concat(current.id));
            // Track endpoint detection timing
            var endpointTime = Date.now() - (((_a = this.tracking.getChunkMetrics(current.id)) === null || _a === void 0 ? void 0 : _a.received_at) || Date.now());
            this.tracking.onEndpointDetected(current.id, endpointTime);
            this.attemptToEvaluateChunk(current);
        }
    };
    ChunkManager.prototype.onChunkEnd = function () {
        return __awaiter(this, void 0, void 0, function () {
            var current;
            return __generator(this, function (_a) {
                this.speaking = false;
                console.log("[Chunk] Chunk end");
                this.bridge.setState({
                    speaking: false
                }, [this.mainWindow]);
                current = this.chunkQueue.getIndex(0);
                if (!current) {
                    return [2 /*return*/];
                }
                this.log.logVerbose("Chunk end for ".concat(current.id));
                // Publish endpoint request to Bus (shadow publish)
                this.publishToBus("endpoint_request", true, "force_final");
                this.enqueue({ requestType: "editor" }, false);
                this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: true });
                return [2 /*return*/];
            });
        });
    };
    ChunkManager.prototype.onChunkStart = function (audio) {
        return __awaiter(this, void 0, void 0, function () {
            var id, chunkMetrics;
            return __generator(this, function (_a) {
                id = (0, uuid_1.v4)();
                this.chunkQueue.add(id);
                this.log.logVerbose("Chunk start for ".concat(id));
                console.log("[Chunk] Chunk start ".concat(id, " samples=").concat(audio.length));
                chunkMetrics = this.tracking.onChunkStart(id);
                this.log.logVerbose("Chunk tracked: session=".concat(chunkMetrics.correlation.session_id, ", chunk=").concat(id));
                // Reset audio sequence number for new chunk
                this.audioSequenceNumber = 0;
                // Publish session start to Bus (shadow publish)
                if (this.tracking.getCurrentSessionId()) {
                    this.publishToBus("session_start");
                }
                if (!this.speaking) {
                    this.bridge.setState({
                        speaking: true
                    }, [this.mainWindow]);
                }
                // if one chunk comes down as noise, and another chunk is started within the threshold, then don't blow away
                // the server-side state, and keep going on the current command
                if (this.deadlineToMakeNewInitializeRequest < Date.now()) {
                    this.deadlineToMakeNewInitializeRequest = Number.MAX_SAFE_INTEGER;
                    this.enqueue({ requestType: "initialize" }, false);
                }
                else {
                    this.enqueue({ requestType: "editor" }, false);
                }
                this.speaking = true;
                this.enqueue({ requestType: "audio", audio: Buffer.from(audio.buffer), chunkId: id });
                return [2 /*return*/];
            });
        });
    };
    ChunkManager.prototype.startBuffering = function () {
        this.log.logVerbose("Buffering started");
        this.buffering = true;
    };
    ChunkManager.prototype.stopBufferingAndFlush = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log.logVerbose("Buffering stopped");
                        this.buffering = false;
                        return [4 /*yield*/, this.flush()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ChunkManager.prototype.toggle = function (listening) {
        return __awaiter(this, void 0, void 0, function () {
            var generation, requestedListening, now, sessionId, current, durationMs;
            var _this = this;
            return __generator(this, function (_a) {
                if (listening === undefined) {
                    listening = !this.listening;
                }
                generation = ++this.toggleGeneration;
                requestedListening = listening;
                // Track session state changes for race condition detection
                if (listening !== this.listening) {
                    now = Date.now();
                    if (this.lastToggleTime && (now - this.lastToggleTime) < 100) {
                        this.tracking.onPauseResumeRace();
                    }
                    this.lastToggleTime = now;
                }
                this.listening = listening;
                // Start or end tracking session
                if (listening) {
                    this.sessionStartTime = Date.now();
                    this.tracking.startSession();
                    sessionId = this.tracking.getCurrentSessionId();
                    if (sessionId) {
                        this.routeSession(sessionId);
                    }
                    // Phase 3: Start presence pulse heartbeat
                    this.startPresencePulse();
                }
                else {
                    current = this.chunkQueue.getIndex(0);
                    durationMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
                    if (this.tracking.getCurrentSessionId()) {
                        this.publishToBus("session_stop", (current === null || current === void 0 ? void 0 : current.id) || "", "user_toggle", durationMs);
                    }
                    this.tracking.endSession();
                    // Phase 3: Stop presence pulse and cleanup throttle/debounce
                    this.stopPresencePulse();
                    this.cleanupThrottleDebounce();
                    // Reset predictive addr_id
                    this.currentPredictiveAddrId = undefined;
                    this.currentPredictiveCFHSignature = undefined;
                }
                this.bridge.setState({
                    backendIssue: "",
                    listening: listening,
                    partial: false,
                    speakingVolume: 0,
                    suggestion: "",
                    statusText: listening ? "Listening" : "Paused"
                }, [this.mainWindow, this.miniModeWindow]);
                this.log.logVerbose("Toggling listening to ".concat(listening));
                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    var connected;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (generation != this.toggleGeneration) {
                                    return [2 /*return*/];
                                }
                                this.mainWindow.updateTray();
                                if (!requestedListening) return [3 /*break*/, 2];
                                this.startBuffering();
                                // Ensure resume always starts from a clean callback/queue state.
                                this.microphone.unregister("chunk-manager");
                                this.chunkQueue.clear();
                                this.buffer = [];
                                this.speaking = false;
                                this.microphone.register("chunk-manager", function (data) {
                                    if (data.event == "chunk_start") {
                                        _this.onChunkStart(data.audio);
                                    }
                                    else if (data.event == "audio") {
                                        _this.onAudio(data.audio, data.consecutiveSilence);
                                    }
                                    else if (data.event == "chunk_end") {
                                        _this.onChunkEnd();
                                    }
                                });
                                return [4 /*yield*/, this.stream.connect(this, this.custom, this.executor)];
                            case 1:
                                connected = _a.sent();
                                if (generation != this.toggleGeneration) {
                                    this.microphone.unregister("chunk-manager");
                                    if (connected) {
                                        this.stream.sendDisableRequest();
                                        this.stream.disconnect();
                                    }
                                    return [2 /*return*/];
                                }
                                if (!connected) {
                                    this.microphone.unregister("chunk-manager");
                                    this.chunkQueue.clear();
                                    this.buffer = [];
                                    this.buffering = false;
                                    this.speaking = false;
                                    this.listening = false;
                                    this.bridge.setState({
                                        backendIssue: this.stream.connectionError(),
                                        listening: false,
                                        speaking: false,
                                        statusText: "Paused"
                                    }, [this.mainWindow, this.miniModeWindow]);
                                    this.mainWindow.updateTray();
                                    return [2 /*return*/];
                                }
                                console.log("[Stream] Connected for listening session");
                                this.stopBufferingAndFlush();
                                return [3 /*break*/, 3];
                            case 2:
                                this.microphone.unregister("chunk-manager");
                                this.stream.sendDisableRequest();
                                this.stream.disconnect();
                                this.app.clearAlternativesAndShowExamples();
                                this.chunkQueue.clear();
                                this.deadlineToMakeNewInitializeRequest = 0;
                                this.buffer = [];
                                this.buffering = false;
                                this.speaking = false;
                                this.bridge.setState({
                                    speaking: false
                                }, [this.mainWindow]);
                                _a.label = 3;
                            case 3: return [2 /*return*/];
                        }
                    });
                }); }, 1);
                return [2 /*return*/];
            });
        });
    };
    return ChunkManager;
}());
exports["default"] = ChunkManager;
