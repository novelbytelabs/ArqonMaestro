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
var tracking_1 = require("./tracking");
var tts_providers_1 = require("./tts-providers");
/**
 * Handles voice output requests (TTS) received from the Bus.
 * Uses provider abstraction for TTS (Kokoro or Fallback).
 * Ensures non-blocking playback, replay handling, and idempotency.
 *
 * Gate 6: Kokoro TTS integration with explicit failure/fallback semantics:
 * - Kokoro fails + fallback enabled => fallback path executes
 * - Kokoro fails + fallback disabled => fail closed with explicit signal
 */
var VoiceOutput = /** @class */ (function () {
    function VoiceOutput(log, tracking, settings, tuner) {
        this.log = log;
        this.tracking = tracking;
        this.settings = settings;
        this.tuner = tuner;
        this.provider = (0, tts_providers_1.createTtsProvider)(log, tracking, settings);
    }
    /**
     * Refresh the TTS provider (called when settings change)
     */
    VoiceOutput.prototype.refreshProvider = function () {
        this.provider = (0, tts_providers_1.createTtsProvider)(this.log, this.tracking, this.settings);
        this.log.logVerbose("[VoiceOutput] Provider refreshed to: ".concat(this.provider.getType()));
    };
    /**
     * Get current provider type
     */
    VoiceOutput.prototype.getProviderType = function () {
        return this.provider.getType();
    };
    /**
     * Play the given speech request using the configured TTS provider.
     * Handles:
     * - Replay deduplication
     * - Provider selection based on settings
     * - Fallback semantics (Kokoro → Fallback)
     * - Telemetry emission
     */
    VoiceOutput.prototype.play = function (messageId, audioDataB64, format, transcript) {
        return __awaiter(this, void 0, void 0, function () {
            var startMs, initialProvider, result, ttfaMs, scenario, fallbackEnabled, fallbackProvider, fallbackResult;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startMs = Date.now();
                        initialProvider = this.provider.getType();
                        this.log.logVerbose("[VoiceOutput] Playing speech request ".concat(messageId, " with provider: ").concat(initialProvider));
                        return [4 /*yield*/, this.provider.play(messageId, audioDataB64, format, transcript)];
                    case 1:
                        result = _a.sent();
                        ttfaMs = Date.now() - startMs;
                        scenario = (0, tracking_1.classifyTranscript)(transcript);
                        if (!(!result.success && initialProvider === "kokoro")) return [3 /*break*/, 4];
                        fallbackEnabled = this.settings.getArqonTtsKokoroFallbackEnabled();
                        if (!fallbackEnabled) return [3 /*break*/, 3];
                        this.log.logVerbose("[VoiceOutput] Kokoro failed, falling back to aplay");
                        // Emit fallback telemetry
                        this.tracking.logMetric("stt.tts.fallback.used", {
                            message_id: messageId,
                            kokoro_error: result.error,
                            fallback_provider: "fallback"
                        });
                        fallbackProvider = new tts_providers_1.FallbackTtsProvider(this.log, this.tracking, this.settings);
                        return [4 /*yield*/, fallbackProvider.play(messageId, audioDataB64, format, transcript)];
                    case 2:
                        fallbackResult = _a.sent();
                        return [2 /*return*/, fallbackResult.success];
                    case 3:
                        // Fallback disabled - fail closed
                        this.log.logError("[VoiceOutput] Kokoro failed and fallback disabled, failing closed for ".concat(messageId));
                        this.tracking.logMetric("stt.tts.fail_closed", {
                            message_id: messageId,
                            provider: "kokoro",
                            reason: result.error,
                            fallback_enabled: false
                        });
                        return [2 /*return*/, false];
                    case 4:
                        if (this.tuner) {
                            this.tuner.recordTelemetry(scenario, ttfaMs, result.success);
                            // Let iteration cycle run asynchronously after tracking completion
                            this.tuner.runLoopCycle()["catch"](function (e) { return _this.log.logError("[VoiceOutput] Error running tuner loop: ".concat(e)); });
                        }
                        return [2 /*return*/, result.success];
                }
            });
        });
    };
    return VoiceOutput;
}());
exports["default"] = VoiceOutput;
