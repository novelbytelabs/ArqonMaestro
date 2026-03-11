"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.__esModule = true;
exports.createTtsProvider = exports.KokoroTtsProvider = exports.FallbackTtsProvider = void 0;
var child_process_1 = require("child_process");
var http = __importStar(require("http"));
var https = __importStar(require("https"));
/**
 * Base class for TTS providers with common functionality
 */
var BaseTtsProvider = /** @class */ (function () {
    function BaseTtsProvider(log, tracking, settings) {
        this.playedMessages = new Set();
        this.MAX_TRACKED_MESSAGES = 100;
        this.log = log;
        this.tracking = tracking;
        this.settings = settings;
    }
    /**
     * Check and track message for replay deduplication
     * Returns false if message was already played (replay)
     */
    BaseTtsProvider.prototype.checkAndTrackReplay = function (messageId) {
        if (this.playedMessages.has(messageId)) {
            this.log.logVerbose("[".concat(this.getType(), "] Ignoring replayed message: ").concat(messageId));
            return false;
        }
        // Track for idempotency
        this.playedMessages.add(messageId);
        if (this.playedMessages.size > this.MAX_TRACKED_MESSAGES) {
            var first = this.playedMessages.values().next().value;
            if (first) {
                this.playedMessages["delete"](first);
            }
        }
        return true;
    };
    return BaseTtsProvider;
}());
/**
 * Fallback TTS provider using aplay (existing implementation)
 */
var FallbackTtsProvider = /** @class */ (function (_super) {
    __extends(FallbackTtsProvider, _super);
    function FallbackTtsProvider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FallbackTtsProvider.prototype.getType = function () {
        return "fallback";
    };
    FallbackTtsProvider.prototype.play = function (messageId, audioDataB64, format, transcript) {
        return __awaiter(this, void 0, void 0, function () {
            var startMs, buffer_1, args_1, latencyMs;
            var _this = this;
            return __generator(this, function (_a) {
                // Check for replay
                if (!this.checkAndTrackReplay(messageId)) {
                    this.tracking.logMetric("stt.tts.replay_ignored", {
                        message_id: messageId,
                        provider: "fallback"
                    });
                    return [2 /*return*/, {
                            success: false,
                            provider: "fallback",
                            latencyMs: 0,
                            error: "replay ignored"
                        }];
                }
                startMs = Date.now();
                try {
                    buffer_1 = Buffer.from(audioDataB64, "base64");
                    this.log.logVerbose("[FallbackTts] Playing speech request ".concat(messageId, " (").concat(buffer_1.length, " bytes): \"").concat(transcript.substring(0, 30), "...\""));
                    args_1 = ["-q"];
                    if (format === "raw" || format === "pcm") {
                        args_1.push("-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw");
                    }
                    return [2 /*return*/, new Promise(function (resolve) {
                            var resolved = false;
                            var resolveOnce = function (result) {
                                if (!resolved) {
                                    resolved = true;
                                    resolve(result);
                                }
                            };
                            var proc = (0, child_process_1.spawn)("aplay", args_1, { stdio: ["pipe", "ignore", "ignore"] });
                            proc.once("spawn", function () {
                                _this.tracking.logMetric("stt.tts.provider_selected", {
                                    message_id: messageId,
                                    provider: "fallback"
                                });
                                _this.tracking.logMetric("stt.tts.playback_started", {
                                    message_id: messageId,
                                    bytes: buffer_1.length,
                                    provider: "fallback"
                                });
                            });
                            proc.once("error", function (err) {
                                _this.playedMessages["delete"](messageId);
                                var latencyMs = Date.now() - startMs;
                                _this.log.logError("[FallbackTts] Playback error for ".concat(messageId, ": ").concat(err.message));
                                _this.tracking.logMetric("stt.tts.playback_failed", {
                                    message_id: messageId,
                                    provider: "fallback",
                                    reason: err.message
                                });
                                resolveOnce({
                                    success: false,
                                    provider: "fallback",
                                    latencyMs: latencyMs,
                                    error: err.message
                                });
                            });
                            proc.once("close", function (code) {
                                var latencyMs = Date.now() - startMs;
                                _this.log.logVerbose("[FallbackTts] Playback finished for ".concat(messageId, " in ").concat(latencyMs, "ms (exit code ").concat(code, ")"));
                                if (code !== 0) {
                                    _this.playedMessages["delete"](messageId);
                                    _this.tracking.logMetric("stt.tts.playback_failed", {
                                        message_id: messageId,
                                        provider: "fallback",
                                        reason: "exit_".concat(code)
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "fallback",
                                        latencyMs: latencyMs,
                                        error: "exit code ".concat(code)
                                    });
                                }
                                else {
                                    _this.tracking.logMetric("stt.tts.playback_completed", {
                                        message_id: messageId,
                                        provider: "fallback",
                                        duration_ms: latencyMs
                                    });
                                    _this.tracking.logMetric("stt.tts.latency_ms", {
                                        message_id: messageId,
                                        provider: "fallback",
                                        latency_ms: latencyMs
                                    });
                                    resolveOnce({
                                        success: true,
                                        provider: "fallback",
                                        latencyMs: latencyMs
                                    });
                                }
                            });
                            if (!proc.stdin) {
                                _this.playedMessages["delete"](messageId);
                                var latencyMs = Date.now() - startMs;
                                _this.log.logError("[FallbackTts] Playback error for ".concat(messageId, ": missing stdin pipe"));
                                _this.tracking.logMetric("stt.tts.playback_failed", {
                                    message_id: messageId,
                                    provider: "fallback",
                                    reason: "stdin_unavailable"
                                });
                                resolveOnce({
                                    success: false,
                                    provider: "fallback",
                                    latencyMs: latencyMs,
                                    error: "stdin_unavailable"
                                });
                                return;
                            }
                            proc.stdin.once("error", function (err) {
                                _this.playedMessages["delete"](messageId);
                                var latencyMs = Date.now() - startMs;
                                _this.log.logError("[FallbackTts] stdin error for ".concat(messageId, ": ").concat(err.message));
                                _this.tracking.logMetric("stt.tts.playback_failed", {
                                    message_id: messageId,
                                    provider: "fallback",
                                    reason: err.message
                                });
                                resolveOnce({
                                    success: false,
                                    provider: "fallback",
                                    latencyMs: latencyMs,
                                    error: err.message
                                });
                            });
                            proc.stdin.end(buffer_1);
                        })];
                }
                catch (e) {
                    this.playedMessages["delete"](messageId);
                    latencyMs = Date.now() - startMs;
                    this.log.logError("[FallbackTts] Failed to start playback: ".concat(e.message));
                    this.tracking.logMetric("stt.tts.playback_failed", {
                        message_id: messageId,
                        provider: "fallback",
                        reason: e.message
                    });
                    return [2 /*return*/, {
                            success: false,
                            provider: "fallback",
                            latencyMs: latencyMs,
                            error: e.message
                        }];
                }
                return [2 /*return*/];
            });
        });
    };
    return FallbackTtsProvider;
}(BaseTtsProvider));
exports.FallbackTtsProvider = FallbackTtsProvider;
/**
 * Kokoro TTS provider using sidecar HTTP contract.
 * Expected endpoint: POST <arqon_tts_kokoro_url>/synthesize
 */
var KokoroTtsProvider = /** @class */ (function (_super) {
    __extends(KokoroTtsProvider, _super);
    function KokoroTtsProvider() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    KokoroTtsProvider.prototype.getType = function () {
        return "kokoro";
    };
    KokoroTtsProvider.prototype.postJson = function (urlString, body, timeoutMs) {
        var parsedUrl = new URL(urlString);
        var client = parsedUrl.protocol === "https:" ? https : http;
        var payload = JSON.stringify(body);
        var headers = {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
        };
        return new Promise(function (resolve, reject) {
            var req = client.request({
                protocol: parsedUrl.protocol,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method: "POST",
                headers: headers
            }, function (res) {
                var responseBody = "";
                res.setEncoding("utf8");
                res.on("data", function (chunk) {
                    responseBody += chunk;
                });
                res.on("end", function () {
                    var statusCode = res.statusCode || 0;
                    if (statusCode < 200 || statusCode >= 300) {
                        reject(new Error("HTTP_".concat(statusCode, ": ").concat(responseBody.slice(0, 200))));
                        return;
                    }
                    try {
                        resolve(responseBody ? JSON.parse(responseBody) : {});
                    }
                    catch (e) {
                        reject(new Error("invalid_json: ".concat(e.message)));
                    }
                });
            });
            req.setTimeout(timeoutMs, function () {
                req.destroy(new Error("timeout"));
            });
            req.on("error", function (err) { return reject(err); });
            req.write(payload);
            req.end();
        });
    };
    KokoroTtsProvider.prototype.postNdjsonStream = function (urlString, body, timeoutMs, onChunk) {
        var parsedUrl = new URL(urlString);
        var client = parsedUrl.protocol === "https:" ? https : http;
        var payload = JSON.stringify(body);
        var headers = {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            Accept: "application/x-ndjson"
        };
        return new Promise(function (resolve, reject) {
            var req = client.request({
                protocol: parsedUrl.protocol,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                method: "POST",
                headers: headers
            }, function (res) {
                var responseBody = "";
                var pending = "";
                var statusCode = res.statusCode || 0;
                res.setEncoding("utf8");
                res.on("data", function (chunk) {
                    responseBody += chunk;
                    if (statusCode < 200 || statusCode >= 300) {
                        return;
                    }
                    pending += chunk;
                    var newlineIndex = pending.indexOf("\n");
                    while (newlineIndex >= 0) {
                        var line = pending.slice(0, newlineIndex).trim();
                        pending = pending.slice(newlineIndex + 1);
                        if (line.length > 0) {
                            try {
                                var parsed = JSON.parse(line);
                                try {
                                    onChunk(parsed);
                                }
                                catch (e) {
                                    reject(new Error("stream_chunk_error: ".concat(e.message)));
                                    return;
                                }
                            }
                            catch (e) {
                                reject(new Error("invalid_stream_json: ".concat(e.message)));
                                return;
                            }
                        }
                        newlineIndex = pending.indexOf("\n");
                    }
                });
                res.on("end", function () {
                    if (statusCode < 200 || statusCode >= 300) {
                        reject(new Error("HTTP_".concat(statusCode, ": ").concat(responseBody.slice(0, 200))));
                        return;
                    }
                    if (pending.trim().length > 0) {
                        try {
                            var parsed = JSON.parse(pending.trim());
                            try {
                                onChunk(parsed);
                            }
                            catch (e) {
                                reject(new Error("stream_chunk_error: ".concat(e.message)));
                                return;
                            }
                        }
                        catch (e) {
                            reject(new Error("invalid_stream_json: ".concat(e.message)));
                            return;
                        }
                    }
                    resolve();
                });
            });
            req.setTimeout(timeoutMs, function () {
                req.destroy(new Error("timeout"));
            });
            req.on("error", function (err) { return reject(err); });
            req.write(payload);
            req.end();
        });
    };
    KokoroTtsProvider.prototype.playStreaming = function (messageId, audioDataB64, transcript, baseUrl, voice, timeoutMs, startMs) {
        return __awaiter(this, void 0, void 0, function () {
            var args, streamUrl;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        args = ["-q", "-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw"];
                        streamUrl = "".concat(baseUrl.replace(/\/+$/, ""), "/synthesize_stream");
                        return [4 /*yield*/, new Promise(function (resolve) {
                                var resolved = false;
                                var streamComplete = false;
                                var closeCode = null;
                                var sawAudioChunk = false;
                                var resolveOnce = function (result) {
                                    if (!resolved) {
                                        resolved = true;
                                        resolve(result);
                                    }
                                };
                                var proc = (0, child_process_1.spawn)("aplay", args, { stdio: ["pipe", "ignore", "ignore"] });
                                var maybeResolveOnClose = function () {
                                    if (closeCode === null || !streamComplete) {
                                        return;
                                    }
                                    var latencyMs = Date.now() - startMs;
                                    if (closeCode !== 0 || !sawAudioChunk) {
                                        _this.playedMessages["delete"](messageId);
                                        var reason = closeCode !== 0 ? "exit_".concat(closeCode) : "stream_empty";
                                        _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                            message_id: messageId,
                                            reason: reason
                                        });
                                        resolveOnce({
                                            success: false,
                                            provider: "kokoro",
                                            latencyMs: latencyMs,
                                            error: reason
                                        });
                                        return;
                                    }
                                    _this.tracking.logMetric("stt.tts.kokoro.success", {
                                        message_id: messageId,
                                        latency_ms: latencyMs
                                    });
                                    _this.tracking.logMetric("stt.tts.latency_ms", {
                                        message_id: messageId,
                                        provider: "kokoro",
                                        latency_ms: latencyMs
                                    });
                                    resolveOnce({
                                        success: true,
                                        provider: "kokoro",
                                        latencyMs: latencyMs
                                    });
                                };
                                proc.once("error", function (err) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: err.message
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: err.message
                                    });
                                });
                                proc.once("close", function (code) {
                                    closeCode = code === null ? -1 : code;
                                    maybeResolveOnClose();
                                });
                                if (!proc.stdin) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: "stdin_unavailable"
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: "stdin_unavailable"
                                    });
                                    return;
                                }
                                proc.stdin.once("error", function (err) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: err.message
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: err.message
                                    });
                                });
                                _this.tracking.logMetric("stt.tts.kokoro.stream_started", {
                                    message_id: messageId,
                                    url: streamUrl
                                });
                                _this.postNdjsonStream(streamUrl, {
                                    request_id: messageId,
                                    text: transcript,
                                    voice: voice,
                                    format: "raw",
                                    stream: true,
                                    input_audio_b64: audioDataB64
                                }, timeoutMs, function (chunk) {
                                    if (chunk.error) {
                                        throw new Error(chunk.error);
                                    }
                                    var audioB64 = chunk.audio_chunk_b64 || chunk.audio_data_b64;
                                    if (audioB64 && proc.stdin && !proc.stdin.destroyed) {
                                        sawAudioChunk = true;
                                        var buffer = Buffer.from(audioB64, "base64");
                                        proc.stdin.write(buffer);
                                        _this.tracking.logMetric("stt.tts.kokoro.stream_chunk", {
                                            message_id: messageId,
                                            bytes: buffer.length
                                        });
                                    }
                                    if (chunk.done === true && proc.stdin && !proc.stdin.destroyed) {
                                        proc.stdin.end();
                                    }
                                })
                                    .then(function () {
                                    streamComplete = true;
                                    _this.tracking.logMetric("stt.tts.kokoro.stream_completed", {
                                        message_id: messageId
                                    });
                                    if (proc.stdin && !proc.stdin.destroyed) {
                                        proc.stdin.end();
                                    }
                                    maybeResolveOnClose();
                                })["catch"](function (err) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: err.message
                                    });
                                    if (!proc.killed) {
                                        proc.kill();
                                    }
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: err.message
                                    });
                                });
                            })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    KokoroTtsProvider.prototype.play = function (messageId, audioDataB64, format, transcript) {
        return __awaiter(this, void 0, void 0, function () {
            var startMs, baseUrl, voice, timeoutMs, streamingEnabled, latencyMs, error, streamingResult, response, synthesizedAudioB64_1, outputFormat, latencyMs, error, args_2, e_1, latencyMs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Check for replay
                        if (!this.checkAndTrackReplay(messageId)) {
                            this.tracking.logMetric("stt.tts.replay_ignored", {
                                message_id: messageId,
                                provider: "kokoro"
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    provider: "kokoro",
                                    latencyMs: 0,
                                    error: "replay ignored"
                                }];
                        }
                        startMs = Date.now();
                        baseUrl = this.settings.getArqonTtsKokoroUrl();
                        voice = this.settings.getArqonTtsKokoroVoice();
                        timeoutMs = this.settings.getArqonTtsKokoroTimeoutMs();
                        streamingEnabled = this.settings.getArqonTtsKokoroStreamingEnabled();
                        if (!baseUrl) {
                            latencyMs = Date.now() - startMs;
                            error = "Kokoro sidecar URL not configured";
                            this.log.logError("[KokoroTts] ".concat(error));
                            this.tracking.logMetric("stt.tts.kokoro.failure", {
                                message_id: messageId,
                                reason: error
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    provider: "kokoro",
                                    latencyMs: latencyMs,
                                    error: error
                                }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        this.log.logVerbose("[KokoroTts] Synthesizing speech request ".concat(messageId, " using ").concat(baseUrl));
                        this.tracking.logMetric("stt.tts.provider_selected", {
                            message_id: messageId,
                            provider: "kokoro"
                        });
                        this.tracking.logMetric("stt.tts.kokoro.started", {
                            message_id: messageId,
                            voice: voice,
                            url: baseUrl
                        });
                        if (!streamingEnabled) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.playStreaming(messageId, audioDataB64, transcript, baseUrl, voice, timeoutMs, startMs)];
                    case 2:
                        streamingResult = _a.sent();
                        if (streamingResult.success) {
                            return [2 /*return*/, streamingResult];
                        }
                        if (streamingResult.error && streamingResult.error.indexOf("HTTP_404") < 0) {
                            return [2 /*return*/, streamingResult];
                        }
                        this.tracking.logMetric("stt.tts.kokoro.stream_fallback", {
                            message_id: messageId,
                            reason: streamingResult.error || "stream_unavailable"
                        });
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.postJson("".concat(baseUrl.replace(/\/+$/, ""), "/synthesize"), {
                            request_id: messageId,
                            text: transcript,
                            voice: voice,
                            format: format,
                            input_audio_b64: audioDataB64
                        }, timeoutMs)];
                    case 4:
                        response = (_a.sent());
                        synthesizedAudioB64_1 = response.audio_data_b64 || response.audio_b64 || response.audio;
                        outputFormat = response.format || format;
                        if (!synthesizedAudioB64_1 || typeof synthesizedAudioB64_1 !== "string") {
                            latencyMs = Date.now() - startMs;
                            error = "missing_audio_data_b64";
                            this.playedMessages["delete"](messageId);
                            this.log.logError("[KokoroTts] Invalid synth response for ".concat(messageId, ": ").concat(error));
                            this.tracking.logMetric("stt.tts.kokoro.failure", {
                                message_id: messageId,
                                reason: error
                            });
                            return [2 /*return*/, {
                                    success: false,
                                    provider: "kokoro",
                                    latencyMs: latencyMs,
                                    error: error
                                }];
                        }
                        args_2 = ["-q"];
                        if (outputFormat === "raw" || outputFormat === "pcm") {
                            args_2.push("-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw");
                        }
                        return [4 /*yield*/, new Promise(function (resolve) {
                                var resolved = false;
                                var resolveOnce = function (result) {
                                    if (!resolved) {
                                        resolved = true;
                                        resolve(result);
                                    }
                                };
                                var proc = (0, child_process_1.spawn)("aplay", args_2, { stdio: ["pipe", "ignore", "ignore"] });
                                var buffer = Buffer.from(synthesizedAudioB64_1, "base64");
                                proc.once("error", function (err) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    _this.log.logError("[KokoroTts] Playback error for ".concat(messageId, ": ").concat(err.message));
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: err.message
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: err.message
                                    });
                                });
                                proc.once("close", function (code) {
                                    var latencyMs = Date.now() - startMs;
                                    if (code !== 0) {
                                        _this.playedMessages["delete"](messageId);
                                        var error = "exit code ".concat(code);
                                        _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                            message_id: messageId,
                                            reason: "exit_".concat(code)
                                        });
                                        resolveOnce({
                                            success: false,
                                            provider: "kokoro",
                                            latencyMs: latencyMs,
                                            error: error
                                        });
                                        return;
                                    }
                                    _this.tracking.logMetric("stt.tts.kokoro.success", {
                                        message_id: messageId,
                                        latency_ms: latencyMs
                                    });
                                    _this.tracking.logMetric("stt.tts.latency_ms", {
                                        message_id: messageId,
                                        provider: "kokoro",
                                        latency_ms: latencyMs
                                    });
                                    resolveOnce({
                                        success: true,
                                        provider: "kokoro",
                                        latencyMs: latencyMs
                                    });
                                });
                                if (!proc.stdin) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    var error = "stdin_unavailable";
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: error
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: error
                                    });
                                    return;
                                }
                                proc.stdin.once("error", function (err) {
                                    _this.playedMessages["delete"](messageId);
                                    var latencyMs = Date.now() - startMs;
                                    _this.tracking.logMetric("stt.tts.kokoro.failure", {
                                        message_id: messageId,
                                        reason: err.message
                                    });
                                    resolveOnce({
                                        success: false,
                                        provider: "kokoro",
                                        latencyMs: latencyMs,
                                        error: err.message
                                    });
                                });
                                proc.stdin.end(buffer);
                            })];
                    case 5: return [2 /*return*/, _a.sent()];
                    case 6:
                        e_1 = _a.sent();
                        this.playedMessages["delete"](messageId);
                        latencyMs = Date.now() - startMs;
                        this.log.logError("[KokoroTts] Failed to start playback: ".concat(e_1.message));
                        this.tracking.logMetric("stt.tts.kokoro.failure", {
                            message_id: messageId,
                            reason: e_1.message
                        });
                        return [2 /*return*/, {
                                success: false,
                                provider: "kokoro",
                                latencyMs: latencyMs,
                                error: e_1.message
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    return KokoroTtsProvider;
}(BaseTtsProvider));
exports.KokoroTtsProvider = KokoroTtsProvider;
/**
 * Factory function to create TTS provider based on settings
 */
function createTtsProvider(log, tracking, settings) {
    var provider = settings.getArqonTtsProvider();
    if (provider === "kokoro") {
        return new KokoroTtsProvider(log, tracking, settings);
    }
    // Default to fallback
    return new FallbackTtsProvider(log, tracking, settings);
}
exports.createTtsProvider = createTtsProvider;
