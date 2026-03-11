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
var tracking_1 = __importDefault(require("./src/main/stt/tracking"));
var hpo_tuner_1 = __importDefault(require("./src/main/stt/hpo-tuner"));
var currentTime = 1000000;
Date.now = function () { return currentTime; };
var OPTIMAL = {
    chunk_silence_threshold: 0.5,
    chunk_speech_threshold: 0.2,
    execute_silence_threshold: 1.0,
    arqon_tts_kokoro_timeout_ms: 2000,
    arqon_bus_compare_threshold: 0.8
};
function calculateSimulatedTtfa(runtime) {
    var penalty = 0;
    penalty += Math.abs(runtime.chunk_silence_threshold - OPTIMAL.chunk_silence_threshold) * 2000;
    penalty += Math.abs(runtime.chunk_speech_threshold - OPTIMAL.chunk_speech_threshold) * 2000;
    penalty += Math.abs(runtime.execute_silence_threshold - OPTIMAL.execute_silence_threshold) * 1000;
    penalty += Math.abs(runtime.arqon_bus_compare_threshold - OPTIMAL.arqon_bus_compare_threshold) * 1000;
    penalty += Math.abs(runtime.arqon_tts_kokoro_timeout_ms - OPTIMAL.arqon_tts_kokoro_timeout_ms) * 0.5;
    // Initial params give ~3500+ penalty -> ~3600ms TTFA
    var noise = (Math.random() - 0.5) * 50;
    return Math.max(10, 150 + penalty + noise);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var runtime, mockSettings, mockLog, mockApi, tracking, tuner, NUM_EPOCHS, epoch, i, ttfa, p95_ttfa;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("=== GATE 6B: HPO CONVERGENCE SIMULATION ===\n");
                    runtime = {
                        chunk_silence_threshold: 0.3,
                        chunk_speech_threshold: 0.3,
                        execute_silence_threshold: 1.0,
                        arqon_bus_compare_threshold: 0.9,
                        arqon_tts_kokoro_timeout_ms: 2200,
                        arqon_hpo_homeostasis_enabled: true,
                        arqon_hpo_dry_run: false
                    };
                    mockSettings = {
                        getArqonHpoHomeostasisEnabled: function () { return runtime.arqon_hpo_homeostasis_enabled; },
                        getArqonHpoDryRun: function () { return runtime.arqon_hpo_dry_run; },
                        getChunkSilenceThreshold: function () { return runtime.chunk_silence_threshold; },
                        setChunkSilenceThreshold: function (v) { runtime.chunk_silence_threshold = v; },
                        getChunkSpeechThreshold: function () { return runtime.chunk_speech_threshold; },
                        setChunkSpeechThreshold: function (v) { runtime.chunk_speech_threshold = v; },
                        getExecuteSilenceThreshold: function () { return runtime.execute_silence_threshold; },
                        setExecuteSilenceThreshold: function (v) { runtime.execute_silence_threshold = v; },
                        getArqonBusCompareThreshold: function () { return runtime.arqon_bus_compare_threshold; },
                        setArqonBusCompareThreshold: function (v) { runtime.arqon_bus_compare_threshold = v; },
                        getArqonTtsKokoroTimeoutMs: function () { return runtime.arqon_tts_kokoro_timeout_ms; },
                        setArqonTtsKokoroTimeoutMs: function (v) { runtime.arqon_tts_kokoro_timeout_ms = v; },
                        getDisableAnalytics: function () { return true; }
                    };
                    mockLog = {
                        logInfo: function () { },
                        logVerbose: function () { },
                        logError: console.error,
                        logWarning: console.warn
                    };
                    mockApi = {
                        logEvent: function () { },
                        logLocalAudio: function () { },
                        logLocalResponse: function () { }
                    };
                    tracking = new tracking_1["default"](mockApi, mockSettings);
                    tuner = new hpo_tuner_1["default"](mockSettings, mockLog, tracking);
                    return [4 /*yield*/, tuner.start()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 7, 8]);
                    NUM_EPOCHS = 30;
                    console.log("Initial TTFA: ~".concat(Math.round(calculateSimulatedTtfa(runtime)), "ms"));
                    epoch = 1;
                    _a.label = 3;
                case 3:
                    if (!(epoch <= NUM_EPOCHS)) return [3 /*break*/, 6];
                    // Simulate 5 data points
                    for (i = 0; i < 5; i++) {
                        ttfa = calculateSimulatedTtfa(runtime);
                        tuner.recordTelemetry("ack_short", ttfa, true);
                    }
                    // Fast forward time to pass cooldown (15s) and loop interval (10s)
                    currentTime += 20000;
                    return [4 /*yield*/, tuner.runLoopCycle()];
                case 4:
                    _a.sent();
                    p95_ttfa = Math.round(calculateSimulatedTtfa(runtime));
                    console.log("Epoch ".concat(epoch, ": TTFA = ").concat(p95_ttfa, "ms | Parameters = ").concat(JSON.stringify(runtime)));
                    _a.label = 5;
                case 5:
                    epoch++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7:
                    tuner.stop();
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
main()["catch"](function (e) {
    console.error(e);
    process.exit(1);
});
