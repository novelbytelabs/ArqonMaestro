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
var child_process_1 = require("child_process");
var http = __importStar(require("http"));
var HPO_PORT = 7782;
var MAX_FAILURE_PENALTY = 100000;
var MIN_SAMPLE_COUNT = 5;
var LOOP_INTERVAL_MS = 10000;
var HPOTuner = /** @class */ (function () {
    function HPOTuner(settings, log, tracking) {
        this.serviceProcess = null;
        this.isReady = false;
        // State sliding windows
        this.ackShortLatencies = [];
        this.recentFailures = 0;
        this.maxLatenciesWindow = 20;
        this.lastLoopTime = 0;
        // Actuation safety state
        this.lastActuationTime = 0;
        this.COOLDOWN_MS = 15000;
        this.lastBaselineConfig = null;
        this.settings = settings;
        this.log = log;
        this.tracking = tracking;
    }
    HPOTuner.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var serviceHealthy, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.settings.getArqonHpoHomeostasisEnabled()) {
                            this.log.logVerbose("[HPOTuner] Homeostasis is disabled. Not starting service.");
                            return [2 /*return*/];
                        }
                        this.log.logVerbose("[HPOTuner] Starting Python HPO service on port ".concat(HPO_PORT, "..."));
                        // Run via the specified conda env
                        this.serviceProcess = (0, child_process_1.spawn)("/home/irbsurfer/miniconda3/envs/helios-gpu-118/bin/python", ["src/main/stt/hpo-service.py", HPO_PORT.toString()], { cwd: process.cwd() } // Depends on where ran from; standard Maestro client
                        );
                        if (this.serviceProcess.stdout) {
                            this.serviceProcess.stdout.on("data", function (data) {
                                _this.log.logVerbose("[HPO Service] ".concat(data.toString().trim()));
                            });
                        }
                        if (this.serviceProcess.stderr) {
                            this.serviceProcess.stderr.on("data", function (data) {
                                _this.log.logError("[HPO Service Err] ".concat(data.toString().trim()));
                            });
                        }
                        this.serviceProcess.on("close", function (code) {
                            _this.log.logError("[HPOTuner] Service exited with code ".concat(code));
                            _this.isReady = false;
                        });
                        return [4 /*yield*/, this.waitForReady()];
                    case 1:
                        serviceHealthy = _b.sent();
                        if (!serviceHealthy) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.initializeSolver()];
                    case 2:
                        _b.sent();
                        _a = this;
                        return [4 /*yield*/, this.waitForSolverReady()];
                    case 3:
                        _a.isReady = _b.sent();
                        if (!this.isReady) {
                            this.log.logError("[HPOTuner] Solver failed readiness after initialization.");
                            return [2 /*return*/];
                        }
                        // Record baseline
                        this.lastBaselineConfig = this.getCurrentConfig();
                        return [2 /*return*/];
                }
            });
        });
    };
    HPOTuner.prototype.stop = function () {
        if (this.serviceProcess && !this.serviceProcess.killed) {
            this.log.logVerbose("[HPOTuner] Stopping python service...");
            this.serviceProcess.kill();
        }
        this.isReady = false;
    };
    HPOTuner.prototype.waitForReady = function (timeoutMs) {
        var _this = this;
        if (timeoutMs === void 0) { timeoutMs = 10000; }
        return new Promise(function (resolve) {
            var start = Date.now();
            var interval = setInterval(function () {
                if (Date.now() - start > timeoutMs) {
                    clearInterval(interval);
                    _this.log.logError("[HPOTuner] Timeout waiting for Python service healthz.");
                    resolve(false);
                    return;
                }
                var req = http.get("http://127.0.0.1:".concat(HPO_PORT, "/healthz"), function (res) {
                    if (res.statusCode === 200) {
                        clearInterval(interval);
                        resolve(true);
                    }
                });
                req.on("error", function () { }); // Ignore connection refused while starting up
            }, 500);
        });
    };
    HPOTuner.prototype.waitForSolverReady = function (timeoutMs) {
        if (timeoutMs === void 0) { timeoutMs = 5000; }
        return new Promise(function (resolve) {
            var start = Date.now();
            var interval = setInterval(function () {
                if (Date.now() - start > timeoutMs) {
                    clearInterval(interval);
                    resolve(false);
                    return;
                }
                var req = http.get("http://127.0.0.1:".concat(HPO_PORT, "/readyz"), function (res) {
                    if (res.statusCode === 200) {
                        clearInterval(interval);
                        resolve(true);
                    }
                });
                req.on("error", function () { });
            }, 250);
        });
    };
    HPOTuner.prototype.postJson = function (endpoint, body) {
        return __awaiter(this, void 0, void 0, function () {
            var payload, options;
            return __generator(this, function (_a) {
                payload = JSON.stringify(body);
                options = {
                    hostname: "127.0.0.1",
                    port: HPO_PORT,
                    path: endpoint,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(payload)
                    }
                };
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var req = http.request(options, function (res) {
                            var responseBody = "";
                            res.setEncoding("utf8");
                            res.on("data", function (chunk) {
                                responseBody += chunk;
                            });
                            res.on("end", function () {
                                if ((res.statusCode || 500) >= 400) {
                                    reject(new Error("HTTP ".concat(res.statusCode, ": ").concat(responseBody)));
                                    return;
                                }
                                try {
                                    resolve(responseBody ? JSON.parse(responseBody) : {});
                                }
                                catch (e) {
                                    reject(new Error("Invalid JSON response: ".concat(e.message)));
                                }
                            });
                        });
                        req.on("error", reject);
                        req.write(payload);
                        req.end();
                    })];
            });
        });
    };
    HPOTuner.prototype.initializeSolver = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = {
                            seed: 42,
                            budget: 1000,
                            bounds: {
                                arqon_tts_kokoro_timeout_ms: { min: 150, max: 5000 },
                                chunk_silence_threshold: { min: 0.05, max: 0.95 },
                                chunk_speech_threshold: { min: 0.05, max: 0.95 },
                                execute_silence_threshold: { min: 0.2, max: 2.5 },
                                arqon_bus_compare_threshold: { min: 0.5, max: 1.0 }
                            }
                        };
                        return [4 /*yield*/, this.postJson("/init", config)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HPOTuner.prototype.getCurrentConfig = function () {
        return {
            arqon_tts_kokoro_timeout_ms: this.settings.getArqonTtsKokoroTimeoutMs(),
            chunk_silence_threshold: this.settings.getChunkSilenceThreshold(),
            chunk_speech_threshold: this.settings.getChunkSpeechThreshold(),
            execute_silence_threshold: this.settings.getExecuteSilenceThreshold(),
            arqon_bus_compare_threshold: this.settings.getArqonBusCompareThreshold()
        };
    };
    // Actuation Loop functions
    /**
     * Objective Function Computation
     */
    HPOTuner.prototype.computeLoss = function () {
        if (this.ackShortLatencies.length < MIN_SAMPLE_COUNT) {
            return null;
        }
        // Sort and calculate p95
        var latencies = __spreadArray([], this.ackShortLatencies, true).sort(function (a, b) { return a - b; });
        var p95Idx = Math.floor(latencies.length * 0.95);
        var p95Ttfa = latencies[p95Idx];
        // loss = 0.50*p95_ack_tts_ttfa + failure_penalty
        var loss = p95Ttfa * 0.5;
        // Penalty for recent failures (e.g. Kokoro crash or timeout resulting in fail-closed/fallback)
        if (this.recentFailures > 0) {
            loss += Math.min(MAX_FAILURE_PENALTY, this.recentFailures * 10000);
        }
        return loss;
    };
    HPOTuner.prototype.recordTelemetry = function (scenario, ttfaMs, success) {
        if (!this.settings.getArqonHpoHomeostasisEnabled())
            return;
        if (!success) {
            this.recentFailures++;
        }
        else if (scenario === "ack_short") {
            this.ackShortLatencies.push(ttfaMs);
            if (this.ackShortLatencies.length > this.maxLatenciesWindow) {
                this.ackShortLatencies.shift();
            }
        }
    };
    HPOTuner.prototype.clamp = function (value, min, max) {
        return Math.min(max, Math.max(min, value));
    };
    HPOTuner.prototype.sanitizeCandidate = function (candidate) {
        var chunkSilence = this.clamp(candidate.chunk_silence_threshold, 0.05, 0.95);
        var chunkSpeech = this.clamp(candidate.chunk_speech_threshold, 0.05, 0.95);
        var executeSilence = this.clamp(candidate.execute_silence_threshold, 0.2, 2.5);
        return {
            arqon_tts_kokoro_timeout_ms: Math.round(this.clamp(candidate.arqon_tts_kokoro_timeout_ms, 150, 5000)),
            chunk_silence_threshold: chunkSilence,
            chunk_speech_threshold: chunkSpeech,
            execute_silence_threshold: Math.max(executeSilence, chunkSilence + 0.1),
            arqon_bus_compare_threshold: this.clamp(candidate.arqon_bus_compare_threshold, 0.5, 1.0)
        };
    };
    HPOTuner.prototype.isSafeToActuate = function (candidate) {
        var current = this.getCurrentConfig();
        var now = Date.now();
        // 1. Cooldown
        if (now - this.lastActuationTime < this.COOLDOWN_MS) {
            return { safe: false, reason: "cooldown_active" };
        }
        // 2. Ensure thresholds do not invert
        if (candidate.execute_silence_threshold <= candidate.chunk_silence_threshold) {
            return { safe: false, reason: "execute_silence <= chunk_silence" };
        }
        // 3. Max delta guardrails per cycle.
        if (Math.abs(candidate.chunk_silence_threshold - current.chunk_silence_threshold) > 0.1) {
            return { safe: false, reason: "chunk_silence_delta_too_large" };
        }
        if (Math.abs(candidate.chunk_speech_threshold - current.chunk_speech_threshold) > 0.1) {
            return { safe: false, reason: "chunk_speech_delta_too_large" };
        }
        if (Math.abs(candidate.execute_silence_threshold - current.execute_silence_threshold) > 0.5) {
            return { safe: false, reason: "execute_silence_delta_too_large" };
        }
        if (Math.abs(candidate.arqon_bus_compare_threshold - current.arqon_bus_compare_threshold) > 0.05) {
            return { safe: false, reason: "compare_threshold_delta_too_large" };
        }
        if (Math.abs(candidate.arqon_tts_kokoro_timeout_ms - current.arqon_tts_kokoro_timeout_ms) > 500) {
            return { safe: false, reason: "kokoro_timeout_delta_too_large" };
        }
        return { safe: true };
    };
    HPOTuner.prototype.applyRollback = function () {
        if (this.lastBaselineConfig) {
            this.log.logVerbose("[HPOTuner] Rollback triggered, restoring last baseline configuration");
            this.applyCandidate(this.lastBaselineConfig, true);
        }
    };
    HPOTuner.prototype.applyCandidate = function (candidate, force) {
        if (force === void 0) { force = false; }
        var sanitized = this.sanitizeCandidate(candidate);
        if (!force) {
            var safety = this.isSafeToActuate(sanitized);
            if (!safety.safe) {
                this.log.logVerbose("[HPOTuner] Actuation blocked by guardrails: ".concat(safety.reason));
                this.tracking.logMetric("stt.hpo.actuate_blocked", { reason: safety.reason });
                return;
            }
        }
        var dryRun = this.settings.getArqonHpoDryRun();
        this.tracking.logMetric("stt.hpo.actuate", { dryRun: dryRun, candidate: sanitized });
        if (!dryRun) {
            this.settings.setArqonTtsKokoroTimeoutMs(sanitized.arqon_tts_kokoro_timeout_ms);
            this.settings.setChunkSilenceThreshold(sanitized.chunk_silence_threshold);
            this.settings.setChunkSpeechThreshold(sanitized.chunk_speech_threshold);
            this.settings.setExecuteSilenceThreshold(sanitized.execute_silence_threshold);
            this.settings.setArqonBusCompareThreshold(sanitized.arqon_bus_compare_threshold);
            this.lastActuationTime = Date.now();
        }
        else {
            this.log.logVerbose("[HPOTuner] Dry-run actuate - skipping runtime state mutation.");
        }
    };
    HPOTuner.prototype.runLoopCycle = function () {
        return __awaiter(this, void 0, void 0, function () {
            var now, loss, currentParams, seedPayload, seedRes, askRes, current, candidate, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isReady || !this.settings.getArqonHpoHomeostasisEnabled())
                            return [2 /*return*/];
                        now = Date.now();
                        if (now - this.lastLoopTime < LOOP_INTERVAL_MS) {
                            return [2 /*return*/];
                        }
                        this.lastLoopTime = now;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        loss = this.computeLoss();
                        if (!(loss !== null)) return [3 /*break*/, 3];
                        currentParams = this.getCurrentConfig();
                        seedPayload = {
                            params: currentParams,
                            value: loss,
                            cost: 1.0
                        };
                        return [4 /*yield*/, this.postJson("/seed", seedPayload)];
                    case 2:
                        seedRes = _a.sent();
                        this.log.logVerbose("[HPOTuner] Seeded loss=".concat(loss, ". history_len=").concat(seedRes.history_len));
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.postJson("/ask_one", {})];
                    case 4:
                        askRes = _a.sent();
                        if (askRes.candidate) {
                            current = this.getCurrentConfig();
                            candidate = __assign(__assign({}, current), askRes.candidate);
                            if (typeof candidate.chunk_silence_threshold === "number" &&
                                typeof candidate.chunk_speech_threshold === "number" &&
                                typeof candidate.execute_silence_threshold === "number" &&
                                typeof candidate.arqon_bus_compare_threshold === "number" &&
                                typeof candidate.arqon_tts_kokoro_timeout_ms === "number") {
                                this.log.logVerbose("[HPOTuner] Proposed candidate: ".concat(JSON.stringify(candidate)));
                                this.applyCandidate(candidate);
                            }
                        }
                        // Reset window metrics after evaluation epoch
                        this.recentFailures = 0;
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        this.log.logError("[HPOTuner] Loop cycle iteration failed: ".concat(e_1.message));
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return HPOTuner;
}());
exports["default"] = HPOTuner;
