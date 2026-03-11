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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.createBusClient = exports.BusConnectionState = void 0;
var ws_1 = __importDefault(require("ws"));
var uuid_1 = require("uuid");
var voice_output_1 = __importDefault(require("./voice-output"));
var control_plane_coordinator_1 = __importStar(require("./control-plane-coordinator"));
var envelopes_1 = require("./envelopes");
/**
 * Connection state for the Arqon Bus client
 */
var BusConnectionState;
(function (BusConnectionState) {
    BusConnectionState["DISCONNECTED"] = "disconnected";
    BusConnectionState["CONNECTING"] = "connecting";
    BusConnectionState["CONNECTED"] = "connected";
    BusConnectionState["RECONNECTING"] = "reconnecting";
})(BusConnectionState = exports.BusConnectionState || (exports.BusConnectionState = {}));
/**
 * Arqon Bus Client for STT Shadow Publishing
 *
 * This client mirrors STT events to the Arqon Bus while keeping
 * WebSocket as the primary execution path.
 */
var BusClient = /** @class */ (function () {
    function BusClient(settings, log, tracking) {
        this.settings = settings;
        this.log = log;
        this.tracking = tracking;
        this.state = BusConnectionState.DISCONNECTED;
        this.reconnectAttempts = 0;
        this.metrics = {
            messagesPublished: 0,
            messagesReceived: 0,
            publishFailures: 0,
            connectionErrors: 0
        };
        // Callbacks for response handling (for comparison)
        this.transcriptCallbacks = [];
        // Track pending requests for execution mode
        this.pendingRequests = new Map();
        // Execution mode state
        this.executionMode = false;
        this.config = this.buildConfig();
        this.voiceOutput = new voice_output_1["default"](log, tracking, settings);
        this.controlPlane = this.buildControlPlaneCoordinator();
    }
    /**
     * Build configuration from settings
     */
    BusClient.prototype.buildConfig = function () {
        return {
            wsUrl: this.settings.getArqonBusWsUrl(),
            room: this.settings.getArqonBusRoom(),
            channel: this.settings.getArqonBusChannel(),
            clientId: "maestro-".concat((0, uuid_1.v4)().substring(0, 8)),
            shadowMode: this.settings.getArqonBusShadowMode(),
            autoReconnect: true,
            reconnectDelay: 1000,
            maxReconnectAttempts: 10,
            pingInterval: 30000
        };
    };
    BusClient.prototype.settingOrDefault = function (settingName, defaultValue) {
        var candidate = this.settings[settingName];
        if (typeof candidate !== "function") {
            return defaultValue;
        }
        try {
            return candidate.call(this.settings);
        }
        catch (_a) {
            return defaultValue;
        }
    };
    BusClient.prototype.buildControlPlaneCoordinator = function () {
        var enabled = this.settingOrDefault("getArqonControlPlaneEnabled", false);
        var spacetimeUrl = this.settingOrDefault("getArqonControlPlaneSpacetimeDbUrl", "http://localhost:3000");
        var store = enabled ? new control_plane_coordinator_1.SpacetimeDbControlPlaneStore(spacetimeUrl) : new control_plane_coordinator_1.MemoryControlPlaneStore();
        return new control_plane_coordinator_1["default"]({
            enabled: enabled,
            spacetimeDbUrl: spacetimeUrl,
            failClosed: this.settingOrDefault("getArqonControlPlaneFailClosed", true),
            agentInflightLimit: this.settingOrDefault("getArqonControlPlaneAgentInflightLimit", 2),
            globalInflightLimit: this.settingOrDefault("getArqonControlPlaneGlobalInflightLimit", 8),
            leaseMs: 5000,
            maxRetries: 2,
            ownerId: this.config.clientId
        }, store, this.tracking, this.log);
    };
    /**
     * Get current configuration
     */
    BusClient.prototype.getConfig = function () {
        return __assign({}, this.config);
    };
    /**
     * Check if Bus is enabled in settings
     */
    BusClient.prototype.isEnabled = function () {
        return this.settings.getArqonBusEnabled();
    };
    /**
     * Check if currently connected
     */
    BusClient.prototype.isConnected = function () {
        return this.state === BusConnectionState.CONNECTED;
    };
    /**
     * Get current connection state
     */
    BusClient.prototype.getConnectionState = function () {
        return this.state;
    };
    /**
     * Get client metrics
     */
    BusClient.prototype.getMetrics = function () {
        return __assign({}, this.metrics);
    };
    /**
     * Register a callback for transcript responses from Bus
     * This is used for comparison mode to compare WebSocket vs Bus responses
     */
    BusClient.prototype.registerTranscriptCallback = function (callback) {
        this.transcriptCallbacks.push(callback);
    };
    /**
     * Unregister a transcript callback
     */
    BusClient.prototype.unregisterTranscriptCallback = function (callback) {
        var index = this.transcriptCallbacks.indexOf(callback);
        if (index > -1) {
            this.transcriptCallbacks.splice(index, 1);
        }
    };
    /**
     * Enable/disable execution mode
     * In execution mode, responses are returned to caller instead of just being published
     */
    BusClient.prototype.setExecutionMode = function (enabled, handler) {
        this.executionMode = enabled;
        this.executionHandler = handler || undefined;
        // Update config to disable shadow mode when in execution mode
        if (enabled) {
            this.config.shadowMode = false;
            this.log.logVerbose("[BusClient] Execution mode enabled");
        }
        else {
            this.executionHandler = undefined;
            this.log.logVerbose("[BusClient] Execution mode disabled");
        }
    };
    /**
     * Check if execution mode is enabled
     */
    BusClient.prototype.isExecutionMode = function () {
        return this.executionMode;
    };
    /**
     * Cancel pending request
     */
    BusClient.prototype.cancelPendingRequest = function (sessionId, chunkId) {
        var requestId = "".concat(sessionId, "_").concat(chunkId);
        var pending = this.pendingRequests.get(requestId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests["delete"](requestId);
        }
    };
    /**
     * Register a handler for constitutive action review (ACE)
     */
    BusClient.prototype.setActionReviewHandler = function (handler) {
        this.actionReviewHandler = handler;
    };
    /**
     * Remove the action review handler
     */
    BusClient.prototype.clearActionReviewHandler = function () {
        this.actionReviewHandler = undefined;
    };
    /**
     * Register a handler for unilateral blocked-action notifications.
     */
    BusClient.prototype.setActionBlockedHandler = function (handler) {
        this.actionBlockedHandler = handler;
    };
    BusClient.prototype.clearActionBlockedHandler = function () {
        this.actionBlockedHandler = undefined;
    };
    /**
     * Connect to Arqon Bus
     */
    BusClient.prototype.connect = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.isEnabled()) {
                    this.log.logVerbose("[BusClient] Bus is disabled in settings");
                    return [2 /*return*/, false];
                }
                if (this.state === BusConnectionState.CONNECTED || this.state === BusConnectionState.CONNECTING) {
                    return [2 /*return*/, this.state === BusConnectionState.CONNECTED];
                }
                this.state = BusConnectionState.CONNECTING;
                this.log.logVerbose("[BusClient] Connecting to ".concat(this.config.wsUrl));
                return [2 /*return*/, new Promise(function (resolve) {
                        try {
                            _this.socket = new ws_1["default"](_this.config.wsUrl);
                            var connectionTimeout_1 = setTimeout(function () {
                                _this.log.logVerbose("[BusClient] Connection timeout");
                                _this.handleDisconnect();
                                resolve(false);
                            }, 5000);
                            _this.socket.on("open", function () {
                                clearTimeout(connectionTimeout_1);
                                _this.state = BusConnectionState.CONNECTED;
                                _this.reconnectAttempts = 0;
                                _this.log.logVerbose("[BusClient] Connected");
                                // Start ping interval
                                _this.startPing();
                                // Join room and channel
                                _this.joinRoom();
                                resolve(true);
                            });
                            _this.socket.on("message", function (data) {
                                _this.handleMessage(data.toString());
                            });
                            _this.socket.on("close", function () {
                                _this.log.logVerbose("[BusClient] Connection closed");
                                _this.handleDisconnect();
                            });
                            _this.socket.on("error", function (error) {
                                _this.metrics.connectionErrors++;
                                _this.log.logError("[BusClient] Socket error: ".concat(error.message));
                                _this.handleDisconnect();
                                resolve(false);
                            });
                        }
                        catch (error) {
                            _this.metrics.connectionErrors++;
                            _this.log.logError("[BusClient] Failed to connect: ".concat(error.message));
                            _this.state = BusConnectionState.DISCONNECTED;
                            resolve(false);
                        }
                    })];
            });
        });
    };
    /**
     * Disconnect from Arqon Bus
     */
    BusClient.prototype.disconnect = function () {
        this.config.autoReconnect = false;
        this.stopPing();
        this.stopHealthCheck();
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.close();
            this.socket = undefined;
        }
        this.state = BusConnectionState.DISCONNECTED;
        this.log.logVerbose("[BusClient] Disconnected");
    };
    /**
     * Handle disconnection with auto-reconnect
     */
    BusClient.prototype.handleDisconnect = function () {
        var _this = this;
        this.stopPing();
        this.stopHealthCheck();
        this.state = BusConnectionState.DISCONNECTED;
        if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.state = BusConnectionState.RECONNECTING;
            this.reconnectAttempts++;
            var delay = this.config.reconnectDelay * Math.min(this.reconnectAttempts, 5);
            this.log.logVerbose("[BusClient] Reconnecting in ".concat(delay, "ms (attempt ").concat(this.reconnectAttempts, ")"));
            setTimeout(function () {
                _this.connect();
            }, delay);
        }
    };
    /**
     * Join room and channel
     */
    BusClient.prototype.joinRoom = function () {
        // Send join message for the STT room
        var joinMessage = {
            version: "1.0",
            id: "arq_".concat((0, uuid_1.v4)()),
            type: "command",
            room: this.config.room,
            channel: this.config.channel,
            from: this.config.clientId,
            timestamp: new Date().toISOString(),
            payload: {
                message_id: (0, uuid_1.v4)(),
                session_id: "",
                chunk_id: "",
                tenant_id: "default",
                timestamp: new Date().toISOString(),
                source: "maestro",
                version: "1.0",
                type: "stt.session.start",
                payload: {
                    language: "en-US",
                    model_id: "default"
                }
            }
        };
        this.sendRaw(joinMessage);
    };
    /**
     * Start ping interval for keepalive
     */
    BusClient.prototype.startPing = function () {
        var _this = this;
        this.stopPing();
        this.pingInterval = setInterval(function () {
            if (_this.state === BusConnectionState.CONNECTED && _this.socket) {
                _this.socket.ping();
            }
        }, this.config.pingInterval);
    };
    /**
     * Stop ping interval
     */
    BusClient.prototype.stopPing = function () {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
        }
    };
    /**
     * Start periodic health status publishing
     */
    BusClient.prototype.startHealthCheck = function (healthCheckFn) {
        var _this = this;
        this.stopHealthCheck();
        this.healthCheckInterval = setInterval(function () {
            if (_this.state === BusConnectionState.CONNECTED) {
                var health = healthCheckFn();
                _this.publishHealthStatus(health.status, health.latency, health.errors);
            }
        }, 10000);
    };
    /**
     * Stop health check interval
     */
    BusClient.prototype.stopHealthCheck = function () {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = undefined;
        }
    };
    /**
     * Handle incoming message
     */
    BusClient.prototype.handleMessage = function (data) {
        var _this = this;
        var message = (0, envelopes_1.deserializeBusMessage)(data);
        if (!message) {
            return;
        }
        this.metrics.messagesReceived++;
        this.metrics.lastReceiveTime = Date.now();
        // Process transcript responses for comparison
        this.processTranscriptResponse(message);
        // Handle speech requests through control-plane coordinator.
        if (message.payload.type === "stt.speech.request") {
            this.submitControlPlaneRequest(message, "stt.speech.request", function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.handleSpeechRequest(message.payload);
                    return [2 /*return*/];
                });
            }); });
            return;
        }
        // Handle constitutive action reviews through control-plane coordinator.
        if (message.payload.type === "stt.action.review") {
            this.submitControlPlaneRequest(message, "stt.action.review", function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.handleActionReview(message.payload)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
            return;
        }
        // Handle unilateral blocked actions
        if (message.payload.type === "stt.action.blocked") {
            this.handleActionBlocked(message.payload);
        }
        // Handle execution mode
        if (this.executionMode && this.executionHandler) {
            this.processExecutionResponse(message);
        }
        // In shadow mode, we don't act on any responses
        if (this.config.shadowMode) {
            this.log.logVerbose("[BusClient] Shadow mode: ignoring incoming messages");
            return;
        }
        // TODO: Handle responses from Bus if not in shadow mode
        // For now, we just log them
        this.log.logVerbose("[BusClient] Received: ".concat(message.payload.type));
    };
    BusClient.prototype.submitControlPlaneRequest = function (message, requestType, executor) {
        var _this = this;
        var payload = message.payload;
        var messageId = payload && payload.message_id ? String(payload.message_id) : (0, uuid_1.v4)();
        var agentId = message.from || (payload && payload.source) || "unknown-agent";
        var request = {
            requestId: messageId,
            requestType: requestType,
            agentId: String(agentId),
            sessionId: payload && payload.session_id ? String(payload.session_id) : "unknown-session",
            chunkId: payload && payload.chunk_id ? String(payload.chunk_id) : "unknown-chunk",
            fingerprint: "".concat(requestType, ":").concat(messageId),
            payload: payload
        };
        this.controlPlane.submit(request, executor).then(function (accepted) {
            if (!accepted) {
                _this.log.logVerbose("[BusClient] Control-plane rejected request ".concat(request.requestId));
            }
        })["catch"](function (error) {
            _this.log.logError("[BusClient] Control-plane submit failed: ".concat(error));
        });
    };
    /**
     * Handle speech request (TTS) from the Bus
     */
    BusClient.prototype.handleSpeechRequest = function (payload) {
        if (!payload.payload || !payload.payload.audio_data) {
            this.log.logVerbose("[BusClient] Ignoring invalid speech request: ".concat(payload.message_id));
            return;
        }
        var _a = payload.payload, audio_data = _a.audio_data, audio_format = _a.audio_format, transcript = _a.transcript;
        // Voice output handles its own idempotency and replay deduping
        this.voiceOutput.play(payload.message_id, audio_data, audio_format || "wav", transcript || "");
    };
    /**
     * Handle constitutive action review request (ACE/Anchor)
     */
    BusClient.prototype.handleActionReview = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            var reviewPayload, allowed, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        reviewPayload = payload && payload.payload ? payload.payload : undefined;
                        if (!reviewPayload || !reviewPayload.action_id) {
                            this.log.logError("[BusClient] Invalid stt.action.review payload received");
                            return [2 /*return*/];
                        }
                        this.tracking.logMetric("stt.integrity.review_requested", {
                            action_id: reviewPayload.action_id,
                            summary: reviewPayload.summary
                        });
                        if (!this.actionReviewHandler) {
                            this.log.logVerbose("[BusClient] Action blocked (no review handler): ".concat(reviewPayload.action_id));
                            this.publishActionBlock(payload.session_id, payload.chunk_id, reviewPayload.action_id);
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.actionReviewHandler(reviewPayload)];
                    case 2:
                        allowed = _a.sent();
                        if (allowed) {
                            this.publishActionAllow(payload.session_id, payload.chunk_id, reviewPayload.action_id);
                            this.tracking.logMetric("stt.integrity.allow", { action_id: reviewPayload.action_id });
                        }
                        else {
                            this.publishActionBlock(payload.session_id, payload.chunk_id, reviewPayload.action_id);
                            this.tracking.logMetric("stt.integrity.block", { action_id: reviewPayload.action_id });
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        this.log.logError("[BusClient] Review handler failed: ".concat(error_1));
                        this.publishActionBlock(payload.session_id, payload.chunk_id, reviewPayload.action_id);
                        this.tracking.logMetric("stt.integrity.block", { action_id: reviewPayload.action_id, reason: "handler_error" });
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle unilateral blocked action from Bus
     */
    BusClient.prototype.handleActionBlocked = function (payload) {
        var blockedPayload = payload && payload.payload ? payload.payload : undefined;
        if (!blockedPayload || !blockedPayload.action_id) {
            this.log.logError("[BusClient] Invalid stt.action.blocked payload received");
            return;
        }
        this.tracking.logMetric("stt.integrity.blocked_by_policy", {
            action_id: blockedPayload.action_id,
            reason: blockedPayload.reason
        });
        // Always log this explicitly since it's a security/policy decision
        this.log.logVerbose("[BusClient] ACTION BLOCKED by Bus: ".concat(blockedPayload.message));
        if (this.actionBlockedHandler) {
            try {
                this.actionBlockedHandler(blockedPayload);
            }
            catch (error) {
                this.log.logError("[BusClient] Action blocked handler error: ".concat(error));
            }
        }
        // Fire a notification to the user
        try {
            var Notification_1 = require("electron").Notification;
            if (Notification_1.isSupported()) {
                new Notification_1({
                    title: "Action Blocked",
                    body: blockedPayload.message || "An automated action was prevented for safety."
                }).show();
            }
        }
        catch (_a) {
            // Ignore if not running in electron or mock
        }
    };
    /**
     * Process incoming transcript response and notify callbacks
     */
    BusClient.prototype.processTranscriptResponse = function (message) {
        var payload = message.payload;
        var payloadType = payload.type;
        if (payloadType !== "stt.transcript.partial" && payloadType !== "stt.transcript.final") {
            return;
        }
        var transcriptPayload = payload;
        var commonFields = payload;
        if (!transcriptPayload.payload || !transcriptPayload.payload.alternatives) {
            return;
        }
        var alternatives = transcriptPayload.payload.alternatives.map(function (alt, index) { return ({
            transcript: alt.transcript || "",
            rank: alt.rank !== undefined ? alt.rank : index,
            score: alt.score !== undefined ? alt.score : 0,
            is_final: payloadType === "stt.transcript.final"
        }); });
        var latencyMs = transcriptPayload.payload.latency_ms || 0;
        var isFinal = payloadType === "stt.transcript.final";
        this.log.logVerbose("[BusClient] Transcript ".concat(isFinal ? "final" : "partial", ": ").concat(alternatives[0] && alternatives[0].transcript ? alternatives[0].transcript.substring(0, 50) : "", "..."));
        // Notify all registered callbacks
        for (var _i = 0, _a = this.transcriptCallbacks; _i < _a.length; _i++) {
            var callback = _a[_i];
            try {
                callback(commonFields.session_id, commonFields.chunk_id, alternatives, latencyMs, isFinal);
            }
            catch (error) {
                this.log.logError("[BusClient] Callback error: ".concat(error));
            }
        }
    };
    /**
     * Process execution mode response
     */
    BusClient.prototype.processExecutionResponse = function (message) {
        var payload = message.payload;
        var payloadType = payload.type;
        if (payloadType !== "stt.transcript.partial" && payloadType !== "stt.transcript.final") {
            return;
        }
        var transcriptPayload = payload;
        var commonFields = payload;
        if (!transcriptPayload.payload || !transcriptPayload.payload.alternatives) {
            return;
        }
        var alternatives = transcriptPayload.payload.alternatives.map(function (alt, index) { return ({
            transcript: alt.transcript || "",
            rank: alt.rank !== undefined ? alt.rank : index,
            score: alt.score !== undefined ? alt.score : 0,
            is_final: payloadType === "stt.transcript.final"
        }); });
        var latencyMs = transcriptPayload.payload.latency_ms || 0;
        var isFinal = payloadType === "stt.transcript.final";
        // Check for pending request
        var requestId = "".concat(commonFields.session_id, "_").concat(commonFields.chunk_id);
        var pending = this.pendingRequests.get(requestId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests["delete"](requestId);
            pending.resolve({
                alternatives: alternatives,
                latencyMs: latencyMs,
                isFinal: isFinal
            });
        }
        // Also notify execution handler if set
        if (this.executionHandler) {
            try {
                this.executionHandler(commonFields.session_id, commonFields.chunk_id, alternatives, latencyMs, isFinal);
            }
            catch (error) {
                this.log.logError("[BusClient] Execution handler error: ".concat(error));
            }
        }
    };
    /**
     * Send a raw Bus message
     */
    BusClient.prototype.sendRaw = function (message) {
        if (this.state !== BusConnectionState.CONNECTED || !this.socket) {
            return false;
        }
        try {
            this.socket.send((0, envelopes_1.serializeBusMessage)(message));
            this.metrics.messagesPublished++;
            this.metrics.lastPublishTime = Date.now();
            return true;
        }
        catch (error) {
            this.metrics.publishFailures++;
            this.log.logError("[BusClient] Failed to publish: ".concat(error.message));
            return false;
        }
    };
    /**
     * Publish an STT envelope to the Bus
     */
    BusClient.prototype.publish = function (envelope) {
        if (this.state !== BusConnectionState.CONNECTED) {
            return false;
        }
        var message = (0, envelopes_1.toBusMessage)(envelope, this.config.room, this.config.channel, this.config.clientId);
        return this.sendRaw(message);
    };
    // ============================================================================
    // STT Event Publishing Methods
    // ============================================================================
    /**
     * Publish session start event
     */
    BusClient.prototype.publishSessionStart = function (sessionId, chunkId, language, modelId, editorContext) {
        var envelope = (0, envelopes_1.createSessionStartEnvelope)(sessionId, chunkId, language, modelId, editorContext);
        return this.publish(envelope);
    };
    /**
     * Publish audio append event
     */
    BusClient.prototype.publishAudioAppend = function (sessionId, chunkId, audioData, sequenceNumber, timestampMs, tenantId) {
        var envelope = (0, envelopes_1.createAudioAppendEnvelope)(sessionId, chunkId, audioData, sequenceNumber, timestampMs, tenantId);
        return this.publish(envelope);
    };
    /**
     * Publish constitutive action allow response
     */
    BusClient.prototype.publishActionAllow = function (sessionId, chunkId, actionId, tenantId) {
        var envelope = (0, envelopes_1.createActionAllowEnvelope)(sessionId, chunkId, actionId, tenantId);
        return this.publish(envelope);
    };
    /**
     * Publish constitutive action block response
     */
    BusClient.prototype.publishActionBlock = function (sessionId, chunkId, actionId, tenantId) {
        var envelope = (0, envelopes_1.createActionBlockEnvelope)(sessionId, chunkId, actionId, tenantId);
        return this.publish(envelope);
    };
    /**
     * Publish endpoint request event
     */
    BusClient.prototype.publishEndpointRequest = function (sessionId, chunkId, finalize, endpointType) {
        if (endpointType === void 0) { endpointType = "partial"; }
        var envelope = (0, envelopes_1.createEndpointRequestEnvelope)(sessionId, chunkId, finalize, endpointType);
        return this.publish(envelope);
    };
    /**
     * Publish partial transcript event
     */
    BusClient.prototype.publishTranscriptPartial = function (sessionId, chunkId, alternatives, latencyMs, silenceThreshold, modelId, redactionApplied) {
        if (redactionApplied === void 0) { redactionApplied = false; }
        var envelope = (0, envelopes_1.createTranscriptPartialEnvelope)(sessionId, chunkId, alternatives, latencyMs, silenceThreshold, modelId, redactionApplied);
        return this.publish(envelope);
    };
    /**
     * Publish final transcript event
     */
    BusClient.prototype.publishTranscriptFinal = function (sessionId, chunkId, alternatives, latencyMs, silenceThreshold, modelId, redactionApplied) {
        if (redactionApplied === void 0) { redactionApplied = false; }
        var envelope = (0, envelopes_1.createTranscriptFinalEnvelope)(sessionId, chunkId, alternatives, latencyMs, silenceThreshold, modelId, redactionApplied);
        return this.publish(envelope);
    };
    /**
     * Publish session stop event
     */
    BusClient.prototype.publishSessionStop = function (sessionId, chunkId, reason, durationMs) {
        var envelope = (0, envelopes_1.createSessionStopEnvelope)(sessionId, chunkId, reason, durationMs);
        return this.publish(envelope);
    };
    /**
     * Publish health status event
     */
    BusClient.prototype.publishHealthStatus = function (status, latencyMs, errorCount) {
        if (errorCount === void 0) { errorCount = 0; }
        var sessionId = this.tracking.getCurrentSessionId() || "system";
        var envelope = (0, envelopes_1.createHealthStatusEnvelope)(sessionId, status, latencyMs, errorCount);
        return this.publish(envelope);
    };
    /**
     * Publish an address query envelope for address-first routing.
     * This is the proactive path that enables O(0) routing.
     */
    BusClient.prototype.publishAddressQuery = function (sessionId, chunkId, transcript, addrId, cfhSignature, confidence, isFinal, options) {
        var envelope = (0, envelopes_1.createAddressQueryEnvelope)(sessionId, chunkId, transcript, addrId, cfhSignature, confidence, isFinal, options);
        return this.publish(envelope);
    };
    /**
     * Publish a presence pulse (short heartbeat) with the current predictive address.
     * Uses the stt.address.query envelope type for consistent routing.
     */
    BusClient.prototype.publishPresencePulse = function (sessionId, chunkId, addrId, cfhSignature, timestamp) {
        var envelope = (0, envelopes_1.createAddressQueryEnvelope)(sessionId, chunkId, "presence_pulse", // marker transcript
        addrId, cfhSignature, 1.0, // full confidence in the hash itself
        false // never final
        );
        return this.publish(envelope);
    };
    return BusClient;
}());
exports["default"] = BusClient;
/**
 * Factory function to create BusClient instance
 */
function createBusClient(settings, log, tracking) {
    return new BusClient(settings, log, tracking);
}
exports.createBusClient = createBusClient;
