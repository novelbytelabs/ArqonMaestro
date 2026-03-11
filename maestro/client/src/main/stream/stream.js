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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var ws_1 = __importDefault(require("ws"));
var electron_fetch_1 = __importDefault(require("electron-fetch"));
var uuid_1 = require("uuid");
var core_1 = require("../../gen/core");
var Stream = /** @class */ (function () {
    function Stream(active, api, log, settings, tracking) {
        var _this = this;
        this.active = active;
        this.api = api;
        this.log = log;
        this.settings = settings;
        this.isConnected = false;
        this.lastActivity = 0;
        this.loggingBuffer = [];
        this.reconnectCount = 0;
        this.lastDisconnectTime = 0;
        this.tracking = tracking;
        // disconnect after an hour with no commands
        setInterval(function () {
            if (_this.connected() && Date.now() > _this.lastActivity + 3600000) {
                _this.disconnect();
                return;
            }
        }, 300000);
        setInterval(function () {
            if (!_this.connected()) {
                return;
            }
            _this.log.logVerbose("Sending keepalive");
            _this.send(_this.coreSocket, {
                keepAliveRequest: {}
            });
            _this.keepAliveTimeout = global.setTimeout(function () {
                _this.disconnect();
            }, 3000);
        }, 30000);
    }
    Stream.prototype.send = function (socket, data) {
        if (!this.connected() || !socket || socket.readyState != ws_1["default"].OPEN) {
            return;
        }
        socket.send(core_1.core.EvaluateRequest.encode(core_1.core.EvaluateRequest.create(data)).finish());
    };
    Stream.prototype.localServiceHealthy = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var response, _e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (0, electron_fetch_1["default"])(url, { method: "GET", timeout: 1500 })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.ok];
                    case 2:
                        _e_1 = _a.sent();
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Stream.prototype.validateBackend = function () {
        return __awaiter(this, void 0, void 0, function () {
            var checks, missing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.settings.getStreamingEndpoint().id != "local") {
                            return [2 /*return*/, undefined];
                        }
                        return [4 /*yield*/, Promise.all([
                                this.localServiceHealthy("http://localhost:17202/api/status"),
                                this.localServiceHealthy("http://localhost:17203/api/status"),
                            ])];
                    case 1:
                        checks = _a.sent();
                        missing = [];
                        if (!checks[0]) {
                            missing.push("speech-engine (:17202)");
                        }
                        if (!checks[1]) {
                            missing.push("code-engine (:17203)");
                        }
                        if (missing.length == 0) {
                            return [2 /*return*/, undefined];
                        }
                        return [2 /*return*/, ("Local backend incomplete: missing " +
                                missing.join(" and ") +
                                ". Build the full local stack with `./gradlew client:installServer -x downloadModels` after installing the native dependencies from `maestro/docs/building.md`, or use a cloud endpoint.")];
                }
            });
        });
    };
    Stream.prototype.connect = function (chunkManager, custom, executor) {
        return __awaiter(this, void 0, void 0, function () {
            var wasDisconnected, reconnectLatency, backendIssue;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.lastActivity = Date.now();
                        wasDisconnected = this.lastDisconnectTime > 0;
                        if (wasDisconnected && this.reconnectCount > 0) {
                            reconnectLatency = Date.now() - this.lastDisconnectTime;
                            this.tracking.onReconnect();
                            this.log.logVerbose("Reconnect event: count=".concat(this.reconnectCount, ", latency=").concat(reconnectLatency, "ms"));
                        }
                        if (this.connected()) {
                            return [2 /*return*/, Promise.resolve(true)];
                        }
                        return [4 /*yield*/, this.validateBackend()];
                    case 1:
                        backendIssue = _a.sent();
                        if (backendIssue) {
                            this.lastConnectionError = backendIssue;
                            return [2 /*return*/, Promise.resolve(false)];
                        }
                        return [2 /*return*/, new Promise(function (resolve) {
                                var settled = false;
                                var finish = function (connected, error) {
                                    var _a, _b;
                                    if (settled) {
                                        return;
                                    }
                                    settled = true;
                                    if (!connected) {
                                        _this.lastConnectionError = error || "Unable to connect to stream.";
                                        _this.isConnected = false;
                                        (_a = _this.coreSocket) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
                                        (_b = _this.coreSocket) === null || _b === void 0 ? void 0 : _b.terminate();
                                        _this.coreSocket = undefined;
                                        _this.lastDisconnectTime = Date.now();
                                        _this.reconnectCount++;
                                    }
                                    else {
                                        _this.lastConnectionError = undefined;
                                        _this.reconnectCount = 0;
                                    }
                                    resolve(connected);
                                };
                                var connectionTimeout = global.setTimeout(function () {
                                    finish(false, "Timed out connecting to the speech backend.");
                                }, 5000);
                                _this.coreSocket = new ws_1["default"]("".concat((process.env.ENDPOINT && process.env.ENDPOINT.startsWith("https")) ||
                                    (!process.env.ENDPOINT && _this.settings.getStreamingEndpoint().id != "local")
                                    ? "wss"
                                    : "ws", "://").concat(process.env.ENDPOINT
                                    ? process.env.ENDPOINT.replace("https://", "").replace("http://", "")
                                    : _this.settings.getStreamingEndpoint().address, "/stream/"));
                                _this.coreSocket.on("open", function () {
                                    _this.log.logVerbose("Stream connected");
                                    _this.isConnected = true;
                                    clearTimeout(connectionTimeout);
                                    finish(true);
                                });
                                _this.coreSocket.on("message", function (data) {
                                    var response = core_1.core.EvaluateResponse.toObject(core_1.core.EvaluateResponse.decode(data), {
                                        defaults: true
                                    });
                                    if (response.commandsResponse) {
                                        _this.lastActivity = Date.now();
                                        if (response.commandsResponse.textResponse) {
                                            _this.onTextCommandsResponse(custom, executor, response.commandsResponse);
                                        }
                                        else {
                                            _this.onCommandsResponse(chunkManager, response.commandsResponse);
                                        }
                                    }
                                    else if (response.keepAliveResponse) {
                                        if (_this.keepAliveTimeout) {
                                            clearTimeout(_this.keepAliveTimeout);
                                        }
                                    }
                                });
                                _this.coreSocket.on("close", function () {
                                    clearTimeout(connectionTimeout);
                                    if (!settled) {
                                        finish(false, "The speech stream closed before initialization completed.");
                                        return;
                                    }
                                    // an idle timeout might trigger close but not error, so reset the state to be safe
                                    // this callback is also triggered by toggling chunk manager
                                    _this.disconnect();
                                });
                                _this.coreSocket.on("error", function (e) {
                                    _this.log.logError(e);
                                    clearTimeout(connectionTimeout);
                                    if (!settled) {
                                        finish(false, "Unable to connect to the speech stream.");
                                    }
                                    else {
                                        chunkManager.toggle(false);
                                    }
                                });
                            })];
                }
            });
        });
    };
    Stream.prototype.connected = function () {
        return this.isConnected;
    };
    Stream.prototype.connectionError = function () {
        return this.lastConnectionError || "";
    };
    Stream.prototype.disconnect = function () {
        var _a;
        if (!this.connected()) {
            return;
        }
        this.log.logVerbose("Stream disconnected");
        this.isConnected = false;
        this.lastDisconnectTime = Date.now();
        this.reconnectCount++;
        (_a = this.coreSocket) === null || _a === void 0 ? void 0 : _a.close();
        this.loggingBuffer = [];
        this.coreSocket = undefined;
    };
    Stream.prototype.onCommandsResponse = function (chunkManager, response) {
        chunkManager.onCommandsResponse(response);
    };
    Stream.prototype.onTextCommandsResponse = function (custom, executor, response) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, executor.postProcessResponse(response)];
                    case 1:
                        response = _b.sent();
                        return [4 /*yield*/, executor.execute(response)];
                    case 2:
                        _b.sent();
                        custom.send("callback", {
                            transcript: (_a = response.execute) === null || _a === void 0 ? void 0 : _a.transcript
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    Stream.prototype.sendAppendToPreviousRequest = function () {
        this.send(this.coreSocket, {
            appendToPreviousRequest: {}
        });
    };
    Stream.prototype.sendAudioRequest = function (audio, chunkId) {
        console.log("[Stream] Audio request ".concat(chunkId, " bytes=").concat(audio.length));
        // Track audio being sent to server
        this.tracking.onAudioSent(chunkId);
        if (this.settings.getStreamingEndpoint() &&
            this.settings.getStreamingEndpoint().id == "local" &&
            this.settings.getLogAudio()) {
            this.loggingBuffer.push(Buffer.from(audio));
        }
        this.send(this.coreSocket, {
            audioRequest: {
                audio: Buffer.from(audio),
                chunkId: chunkId
            }
        });
    };
    Stream.prototype.sendCallbackRequest = function (callbackRequest) {
        this.log.logVerbose("Sending callback request: ".concat(callbackRequest.type));
        this.send(this.coreSocket, {
            callbackRequest: callbackRequest
        });
    };
    Stream.prototype.sendDisableRequest = function () {
        this.send(this.coreSocket, {
            disableRequest: {}
        });
    };
    Stream.prototype.sendEditorStateRequest = function (clipboard, editorState) {
        if (clipboard === void 0) { clipboard = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log.logVerbose("Sending editor state");
                        if (!!editorState) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.active.getEditorState(clipboard)];
                    case 1:
                        editorState = _a.sent();
                        _a.label = 2;
                    case 2:
                        this.send(this.coreSocket, {
                            editorStateRequest: {
                                editorState: editorState
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    Stream.prototype.sendEndpointRequest = function (chunkId, finalize) {
        return __awaiter(this, void 0, void 0, function () {
            var endpointId;
            return __generator(this, function (_a) {
                if (this.settings.getStreamingEndpoint() &&
                    this.settings.getStreamingEndpoint().id == "local" &&
                    this.settings.getLogAudio() &&
                    this.loggingBuffer.length > 0 &&
                    finalize) {
                    this.api.logLocalAudio(Buffer.concat(this.loggingBuffer), chunkId);
                    this.loggingBuffer = [];
                }
                endpointId = (0, uuid_1.v4)();
                this.log.logVerbose("Sending ".concat(finalize ? "final" : "partial", " endpoint request for ").concat(chunkId));
                console.log("[Stream] Endpoint request ".concat(chunkId, " finalize=").concat(finalize));
                this.send(this.coreSocket, {
                    endpointRequest: {
                        chunkId: chunkId,
                        finalize: finalize,
                        endpointId: endpointId
                    }
                });
                return [2 /*return*/];
            });
        });
    };
    Stream.prototype.sendInitializeRequest = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            var _c, _d;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        this.log.logVerbose("Sending initialize request");
                        console.log("[Stream] Initialize request");
                        _a = this.send;
                        _b = [this.coreSocket];
                        _c = {};
                        _d = {};
                        return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        _a.apply(this, _b.concat([(_c.initializeRequest = (_d.editorState = _f.sent(),
                                _d),
                                _c)]));
                        return [2 /*return*/];
                }
            });
        });
    };
    Stream.prototype.sendTextRequest = function (text, includeAlternatives) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log.logVerbose("Sending text request: ".concat(text, ", ").concat(includeAlternatives));
                        return [4 /*yield*/, this.sendInitializeRequest()];
                    case 1:
                        _a.sent();
                        this.send(this.coreSocket, {
                            textRequest: {
                                text: text,
                                includeAlternatives: includeAlternatives
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    return Stream;
}());
exports["default"] = Stream;
