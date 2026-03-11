"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var ws_1 = require("ws");
var uuid_1 = require("uuid");
/**
 * A simple mock Arqon Bus server to validate the BusClient regression tests.
 */
var MockArqonBusServer = /** @class */ (function () {
    function MockArqonBusServer(port) {
        var _this = this;
        this.integritySignals = [];
        this.wss = new ws_1.Server({ port: port });
        console.log("Mock Arqon Bus Server listening on ws://localhost:".concat(port));
        this.wss.on("connection", function (ws) {
            console.log("Client connected");
            ws.on("message", function (message) {
                try {
                    var data = JSON.parse(message);
                    _this.handleMessage(ws, data);
                }
                catch (e) {
                    console.error("Failed to parse message", e);
                }
            });
            ws.on("close", function () {
                console.log("Client disconnected");
            });
        });
    }
    MockArqonBusServer.prototype.handleMessage = function (ws, message) {
        console.log("Received message type: ".concat(message.type, ", payload type: ").concat(message.payload ? message.payload.type : 'undefined'));
        // Auto-respond to audio appends with partials
        if (message.payload && message.payload.type === "stt.audio.append") {
            var sessionId = message.payload.session_id;
            if (sessionId === "test-malformed") {
                // Send malformed garbage JSON
                ws.send("{ bad json : true }");
                ws.send(JSON.stringify({ type: "event", payload: { type: "stt.transcript.partial" } })); // Missing required fields
                return;
            }
            if (sessionId === "test-command") {
                // Send a simulated command to the client
                ws.send(JSON.stringify({
                    version: "1.0",
                    id: "arq_".concat((0, uuid_1.v4)()),
                    type: "command",
                    room: "stt",
                    channel: "transcription",
                    from: "mock-server",
                    timestamp: new Date().toISOString(),
                    payload: {
                        message_id: (0, uuid_1.v4)(),
                        session_id: sessionId,
                        type: "stt.command.pause"
                    }
                }));
            }
            if (sessionId === "test-replay") {
                // Send the same message 3 times with the same message_id to simulate replay
                var msgId = "replayed-msg-12345";
                for (var i = 0; i < 3; i++) {
                    this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript", msgId);
                }
                return;
            }
            if (sessionId === "test-transcript-mismatch") {
                this.sendPartial(ws, sessionId, message.payload.chunk_id, "DIFFERENT transcript");
                return;
            }
            if (sessionId === "test-command-mismatch") {
                // Send a DIFFERENT command than expected or just a transcript that implies a command mismatch
                this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript with pause");
                return;
            }
            if (sessionId === "test-speech-replay") {
                // Send speech requests multiple times for the same payload to simulate startup replay
                var msgId = "speech-replay-msg-999";
                for (var i = 0; i < 3; i++) {
                    this.sendSpeechRequest(ws, sessionId, message.payload.chunk_id, "mock synthesized speech", msgId);
                }
                return;
            }
            if (sessionId === "test-integrity-allow" || sessionId === "test-integrity-block") {
                this.sendActionReview(ws, sessionId, message.payload.chunk_id, "action-123", "Destructive file deletion requested", { path: "/tmp/foo", force: true });
                return;
            }
            if (sessionId === "test-integrity-policy-block") {
                this.sendActionBlocked(ws, sessionId, message.payload.chunk_id, "action-illegal", "policy", "Direct root access is prohibited by corporate security policy.");
                return;
            }
            this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript");
        }
        if (message.payload && (message.payload.type === "stt.action.allow" || message.payload.type === "stt.action.block")) {
            var actionId = message.payload.payload && message.payload.payload.action_id;
            console.log("[MockServer] Received integrity signal: ".concat(message.payload.type, " for action ").concat(actionId));
            this.integritySignals.push({
                type: message.payload.type,
                actionId: actionId
            });
        }
        // Auto-respond to endpoint requests with finals
        if (message.payload && message.payload.type === "stt.endpoint.request") {
            this.sendFinal(ws, message.payload.session_id, message.payload.chunk_id, "mock final transcript");
        }
    };
    MockArqonBusServer.prototype.sendSpeechRequest = function (ws, sessionId, chunkId, transcript, explicitMsgId) {
        var response = {
            version: "1.0",
            id: "arq_".concat((0, uuid_1.v4)()),
            type: "event",
            room: "stt",
            channel: "transcription",
            from: "mock-server",
            timestamp: new Date().toISOString(),
            payload: {
                message_id: explicitMsgId || (0, uuid_1.v4)(),
                session_id: sessionId,
                chunk_id: chunkId,
                tenant_id: "default",
                timestamp: new Date().toISOString(),
                source: "bus",
                version: "1.0",
                type: "stt.speech.request",
                payload: {
                    audio_data: Buffer.from("mock pcm data").toString("base64"),
                    audio_format: "pcm",
                    transcript: transcript,
                    duration_ms: 1000
                }
            }
        };
        ws.send(JSON.stringify(response));
    };
    MockArqonBusServer.prototype.sendPartial = function (ws, sessionId, chunkId, transcript, explicitMsgId) {
        var response = {
            version: "1.0",
            id: "arq_".concat((0, uuid_1.v4)()),
            type: "event",
            room: "stt",
            channel: "transcription",
            from: "mock-server",
            timestamp: new Date().toISOString(),
            payload: {
                message_id: explicitMsgId || (0, uuid_1.v4)(),
                session_id: sessionId,
                chunk_id: chunkId,
                tenant_id: "default",
                timestamp: new Date().toISOString(),
                source: "bus",
                version: "1.0",
                type: "stt.transcript.partial",
                payload: {
                    alternatives: [
                        {
                            transcript: transcript,
                            confidence: 0.99,
                            words: []
                        }
                    ],
                    latency_ms: 15,
                    silence_threshold: 0.3,
                    model_id: "mock",
                    redaction_applied: false
                }
            }
        };
        ws.send(JSON.stringify(response));
    };
    MockArqonBusServer.prototype.sendFinal = function (ws, sessionId, chunkId, transcript) {
        var response = {
            version: "1.0",
            id: "arq_".concat((0, uuid_1.v4)()),
            type: "event",
            room: "stt",
            channel: "transcription",
            from: "mock-server",
            timestamp: new Date().toISOString(),
            payload: {
                message_id: (0, uuid_1.v4)(),
                session_id: sessionId,
                chunk_id: chunkId,
                tenant_id: "default",
                timestamp: new Date().toISOString(),
                source: "bus",
                version: "1.0",
                type: "stt.transcript.final",
                payload: {
                    alternatives: [
                        {
                            transcript: transcript,
                            confidence: 0.99,
                            words: []
                        }
                    ],
                    latency_ms: 25,
                    silence_threshold: 0.3,
                    model_id: "mock",
                    redaction_applied: false
                }
            }
        };
        ws.send(JSON.stringify(response));
    };
    MockArqonBusServer.prototype.sendActionReview = function (ws, sessionId, chunkId, actionId, summary, context) {
        var response = {
            version: "1.0",
            id: "arq_".concat((0, uuid_1.v4)()),
            type: "event",
            room: "stt",
            channel: "transcription",
            from: "mock-server",
            timestamp: new Date().toISOString(),
            payload: {
                message_id: (0, uuid_1.v4)(),
                session_id: sessionId,
                chunk_id: chunkId,
                tenant_id: "default",
                timestamp: new Date().toISOString(),
                source: "bus",
                version: "1.0",
                type: "stt.action.review",
                payload: {
                    action_id: actionId,
                    summary: summary,
                    context: context,
                    timeout_ms: 5000
                }
            }
        };
        ws.send(JSON.stringify(response));
    };
    MockArqonBusServer.prototype.sendActionBlocked = function (ws, sessionId, chunkId, actionId, reason, message) {
        var response = {
            version: "1.0",
            id: "arq_".concat((0, uuid_1.v4)()),
            type: "event",
            room: "stt",
            channel: "transcription",
            from: "mock-server",
            timestamp: new Date().toISOString(),
            payload: {
                message_id: (0, uuid_1.v4)(),
                session_id: sessionId,
                chunk_id: chunkId,
                tenant_id: "default",
                timestamp: new Date().toISOString(),
                source: "bus",
                version: "1.0",
                type: "stt.action.blocked",
                payload: {
                    action_id: actionId,
                    reason: reason,
                    message: message
                }
            }
        };
        ws.send(JSON.stringify(response));
    };
    MockArqonBusServer.prototype.stop = function () {
        this.wss.close();
    };
    MockArqonBusServer.prototype.getIntegritySignals = function () {
        return __spreadArray([], this.integritySignals, true);
    };
    MockArqonBusServer.prototype.clearIntegritySignals = function () {
        this.integritySignals = [];
    };
    return MockArqonBusServer;
}());
// Start server if run directly
if (require.main === module) {
    new MockArqonBusServer(9100);
}
exports["default"] = MockArqonBusServer;
