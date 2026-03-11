"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var http = __importStar(require("http"));
var https = __importStar(require("https"));
var bus_client_1 = __importDefault(require("./src/main/stt/bus-client"));
var tracking_1 = __importDefault(require("./src/main/stt/tracking"));
var mock_server_1 = __importDefault(require("./src/main/stt/mock-server"));
function percentile(values, p) {
    if (values.length === 0)
        return 0;
    var sorted = __spreadArray([], values, true).sort(function (a, b) { return a - b; });
    var idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx];
}
function computeStats(values) {
    if (values.length === 0) {
        return { n: 0, mean_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, min_ms: 0, max_ms: 0 };
    }
    var sum = values.reduce(function (acc, v) { return acc + v; }, 0);
    return {
        n: values.length,
        mean_ms: sum / values.length,
        p50_ms: percentile(values, 50),
        p95_ms: percentile(values, 95),
        p99_ms: percentile(values, 99),
        min_ms: Math.min.apply(Math, values),
        max_ms: Math.max.apply(Math, values)
    };
}
function postJson(urlString, body, timeoutMs) {
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
        req.setTimeout(timeoutMs, function () { return req.destroy(new Error("timeout")); });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}
function postNdjsonStream(urlString, body, timeoutMs) {
    var parsedUrl = new URL(urlString);
    var client = parsedUrl.protocol === "https:" ? https : http;
    var payload = JSON.stringify(body);
    var headers = {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        Accept: "application/x-ndjson"
    };
    return new Promise(function (resolve, reject) {
        var startedAt = Date.now();
        var firstChunkAt = null;
        var pending = "";
        var responseBody = "";
        var req = client.request({
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: "POST",
            headers: headers
        }, function (res) {
            var statusCode = res.statusCode || 0;
            res.setEncoding("utf8");
            res.on("data", function (chunk) {
                responseBody += chunk;
                if (statusCode < 200 || statusCode >= 300) {
                    return;
                }
                pending += chunk;
                var newline = pending.indexOf("\n");
                while (newline >= 0) {
                    var line = pending.slice(0, newline).trim();
                    pending = pending.slice(newline + 1);
                    if (line.length > 0) {
                        try {
                            var parsed = JSON.parse(line);
                            var audioChunk = parsed.audio_chunk_b64 || parsed.audio_data_b64;
                            if (audioChunk && firstChunkAt === null) {
                                firstChunkAt = Date.now();
                            }
                        }
                        catch (e) {
                            reject(new Error("invalid_stream_json: ".concat(e.message)));
                            return;
                        }
                    }
                    newline = pending.indexOf("\n");
                }
            });
            res.on("end", function () {
                if (statusCode < 200 || statusCode >= 300) {
                    reject(new Error("HTTP_".concat(statusCode, ": ").concat(responseBody.slice(0, 200))));
                    return;
                }
                var endedAt = Date.now();
                resolve({
                    ttfa_ms: firstChunkAt === null ? endedAt - startedAt : firstChunkAt - startedAt,
                    total_ms: endedAt - startedAt
                });
            });
        });
        req.setTimeout(timeoutMs, function () { return req.destroy(new Error("timeout")); });
        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}
function benchmarkTts(baseUrl, runs, timeoutMs) {
    return __awaiter(this, void 0, void 0, function () {
        var synthLatencies, streamTtfa, streamTotals, streamErrors, ackShortTtfa, normalTtfa, longTtfa, i, textType, text, start, stream, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    synthLatencies = [];
                    streamTtfa = [];
                    streamTotals = [];
                    streamErrors = 0;
                    ackShortTtfa = [];
                    normalTtfa = [];
                    longTtfa = [];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < runs)) return [3 /*break*/, 7];
                    textType = i % 3;
                    text = "";
                    if (textType === 0) {
                        text = "Upload complete now.";
                    }
                    else if (textType === 1) {
                        text = "This is a normal length response that spans about ten words.";
                    }
                    else {
                        text = "This is a much longer response that goes on and on for many words to test the streaming capacity of the chunk manager and Kokoro synthesizer when we need it.";
                    }
                    start = Date.now();
                    return [4 /*yield*/, postJson("".concat(baseUrl.replace(/\/+$/, ""), "/synthesize"), { request_id: "tts-nonstream-".concat(i), text: text, voice: "af_heart", format: "raw" }, timeoutMs)];
                case 2:
                    _a.sent();
                    synthLatencies.push(Date.now() - start);
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, postNdjsonStream("".concat(baseUrl.replace(/\/+$/, ""), "/synthesize_stream"), { request_id: "tts-stream-".concat(i), text: text, voice: "af_heart", format: "raw", stream: true }, timeoutMs)];
                case 4:
                    stream = _a.sent();
                    streamTtfa.push(stream.ttfa_ms);
                    streamTotals.push(stream.total_ms);
                    if (textType === 0) {
                        ackShortTtfa.push(stream.ttfa_ms);
                    }
                    else if (textType === 1) {
                        normalTtfa.push(stream.ttfa_ms);
                    }
                    else {
                        longTtfa.push(stream.ttfa_ms);
                    }
                    return [3 /*break*/, 6];
                case 5:
                    e_1 = _a.sent();
                    streamErrors++;
                    return [3 /*break*/, 6];
                case 6:
                    i++;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/, {
                        non_stream_total_ms: computeStats(synthLatencies),
                        stream_ttfa_ms: computeStats(streamTtfa),
                        stream_total_ms: computeStats(streamTotals),
                        stream_ack_short_ttfa_ms: computeStats(ackShortTtfa),
                        stream_normal_ttfa_ms: computeStats(normalTtfa),
                        stream_long_ttfa_ms: computeStats(longTtfa),
                        stream_errors: streamErrors
                    }];
            }
        });
    });
}
function benchmarkSttBus(runs, port) {
    return __awaiter(this, void 0, void 0, function () {
        var latencies, mockApi, mockLog, mockSettings, tracking, client, connected, _loop_1, i;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    latencies = [];
                    mockApi = {
                        logEvent: function () { },
                        logLocalAudio: function () { },
                        logLocalResponse: function () { },
                        ping: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, 1];
                        }); }); },
                        setBestEndpoint: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/];
                        }); }); }
                    };
                    mockLog = {
                        logInfo: function () { },
                        logVerbose: function () { },
                        logError: console.error,
                        logWarning: console.warn
                    };
                    mockSettings = {
                        getArqonBusWsUrl: function () { return "ws://localhost:".concat(port); },
                        getArqonBusRoom: function () { return "stt"; },
                        getArqonBusChannel: function () { return "transcription"; },
                        getArqonBusShadowMode: function () { return false; },
                        getArqonBusEnabled: function () { return true; },
                        getArqonBusStageApproval: function () { return true; },
                        getArqonBusCompareEnabled: function () { return false; },
                        getArqonBusCompareThreshold: function () { return 0.95; },
                        getArqonBusCompareReportInterval: function () { return 300; },
                        getArqonBusCompareSampleRate: function () { return 1.0; },
                        getArqonTtsProvider: function () { return "fallback"; },
                        getArqonTtsKokoroUrl: function () { return "http://127.0.0.1:7781"; },
                        getArqonTtsKokoroVoice: function () { return "af_heart"; },
                        getArqonTtsKokoroTimeoutMs: function () { return 10000; },
                        getArqonTtsKokoroFallbackEnabled: function () { return true; },
                        getArqonTtsKokoroStreamingEnabled: function () { return true; },
                        getDisableAnalytics: function () { return true; }
                    };
                    tracking = new tracking_1["default"](mockApi, mockSettings);
                    client = new bus_client_1["default"](mockSettings, mockLog, tracking);
                    return [4 /*yield*/, client.connect()];
                case 1:
                    connected = _a.sent();
                    if (!connected) {
                        throw new Error("Failed to connect BusClient for STT benchmark");
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 7, 8]);
                    _loop_1 = function (i) {
                        var sessionId, chunkId, start;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    sessionId = "bench-stt-".concat(i);
                                    chunkId = "chunk-".concat(i);
                                    start = Date.now();
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            var timeout = setTimeout(function () {
                                                reject(new Error("timeout waiting final transcript for ".concat(chunkId)));
                                            }, 5000);
                                            client.setExecutionMode(true, function (_sid, cid, _alts, _latencyMs, isFinal) {
                                                if (cid === chunkId && isFinal) {
                                                    clearTimeout(timeout);
                                                    latencies.push(Date.now() - start);
                                                    resolve();
                                                }
                                            });
                                            client.publishSessionStart(sessionId, chunkId, "en-US", "mock-model");
                                            client.publishAudioAppend(sessionId, chunkId, Buffer.from("benchmark-audio"), 1, Date.now());
                                            client.publishEndpointRequest(sessionId, chunkId, true, "final");
                                        })];
                                case 1:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 3;
                case 3:
                    if (!(i < runs)) return [3 /*break*/, 6];
                    return [5 /*yield**/, _loop_1(i)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7:
                    client.disconnect();
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/, computeStats(latencies)];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var ttsUrl, ttsRuns, sttRuns, timeoutMs, sttPort, startedAt, mockServer, tts, sttBus, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ttsUrl = process.env.ARQON_BENCH_TTS_URL || "http://127.0.0.1:7781";
                    ttsRuns = Number(process.env.ARQON_BENCH_TTS_RUNS || "20");
                    sttRuns = Number(process.env.ARQON_BENCH_STT_RUNS || "50");
                    timeoutMs = Number(process.env.ARQON_BENCH_TIMEOUT_MS || "15000");
                    sttPort = Number(process.env.ARQON_BENCH_STT_PORT || "9110");
                    startedAt = new Date().toISOString();
                    mockServer = new mock_server_1["default"](sttPort);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 4, 5]);
                    return [4 /*yield*/, benchmarkTts(ttsUrl, ttsRuns, timeoutMs)];
                case 2:
                    tts = _a.sent();
                    return [4 /*yield*/, benchmarkSttBus(sttRuns, sttPort)];
                case 3:
                    sttBus = _a.sent();
                    result = {
                        started_at: startedAt,
                        completed_at: new Date().toISOString(),
                        config: {
                            tts_url: ttsUrl,
                            tts_runs: ttsRuns,
                            stt_runs: sttRuns,
                            timeout_ms: timeoutMs,
                            stt_bus_port: sttPort
                        },
                        tts: tts,
                        stt: {
                            bus_audio_to_final_ms: sttBus,
                            websocket_audio_to_final_ms: null,
                            note: "WebSocket head-to-head not included in this harness without a live comparable WS backend endpoint."
                        }
                    };
                    console.log(JSON.stringify(result, null, 2));
                    return [3 /*break*/, 5];
                case 4:
                    mockServer.stop();
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    });
}
main()["catch"](function (e) {
    console.error(e);
    process.exit(1);
});
