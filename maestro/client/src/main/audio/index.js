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
exports.getDevices = exports.devices = exports.SpeechRecorder = void 0;
var child_process_1 = require("child_process");
var SAMPLE_RATE = 16000;
var CHANNELS = 1;
var BYTES_PER_SAMPLE = 2;
var FRAME_SAMPLES = 480;
var FRAME_BYTES = FRAME_SAMPLES * BYTES_PER_SAMPLE;
var SpeechRecorder = /** @class */ (function () {
    function SpeechRecorder(options) {
        if (options === void 0) { options = {}; }
        var _a;
        this.options = options;
        this.debugFrameCounter = 0;
        this.pcmBuffer = Buffer.alloc(0);
        this.leadingFrames = [];
        this.running = false;
        this.speaking = false;
        this.consecutiveSpeech = 0;
        this.consecutiveSilence = 0;
        this.consecutiveFramesForSpeaking = 1;
        this.silenceFramesToEnd = 10;
        this.leadingBufferFrames = 10;
        this.currentChunkFrames = 0;
        this.maxChunkFrames = 100;
        this.baseSilenceThreshold = 0.008;
        this.baseSpeechThreshold = 0.015;
        this.noiseFloor = 0.002;
        this.baseSilenceThreshold = this.mapVadThreshold(options.sileroVadSilenceThreshold, 0.008);
        this.baseSpeechThreshold = this.mapVadThreshold((_a = options.sileroVadSpeakingThreshold) !== null && _a !== void 0 ? _a : options.sileroVadSpeechThreshold, 0.015);
        if (this.baseSilenceThreshold >= this.baseSpeechThreshold) {
            this.baseSilenceThreshold = Math.max(0.001, this.baseSpeechThreshold * 0.7);
        }
    }
    SpeechRecorder.prototype.mapVadThreshold = function (value, fallback) {
        if (value === undefined || Number.isNaN(value)) {
            return fallback;
        }
        // Existing UI defaults are tuned for the native module and are much larger than RMS.
        // Convert those values to a stable RMS range for PCM processing.
        if (value > 0.1) {
            return Math.max(0.004, Math.min(0.2, value * 0.04));
        }
        return Math.max(0.001, Math.min(0.2, value));
    };
    SpeechRecorder.prototype.effectiveSilenceThreshold = function () {
        return Math.max(this.baseSilenceThreshold, this.noiseFloor * 1.8);
    };
    SpeechRecorder.prototype.effectiveSpeechThreshold = function () {
        return Math.max(this.baseSpeechThreshold, this.effectiveSilenceThreshold() * 1.5, this.noiseFloor * 3);
    };
    SpeechRecorder.prototype.hasCommand = function (command) {
        return (0, child_process_1.spawnSync)("which", [command], { stdio: "ignore" }).status === 0;
    };
    SpeechRecorder.prototype.pulseSources = function () {
        try {
            var result = (0, child_process_1.spawnSync)("pactl", ["list", "short", "sources"], {
                encoding: "utf8"
            });
            if (result.status !== 0 || !result.stdout) {
                return [];
            }
            return result.stdout
                .split("\n")
                .map(function (line) { return line.trim(); })
                .filter(function (line) { return line.length > 0 && !line.includes(".monitor"); })
                .map(function (line) { return line.split(/\s+/)[1]; })
                .filter(function (name) { return !!name; });
        }
        catch (_e) {
            return [];
        }
    };
    SpeechRecorder.prototype.selectedPulseSource = function () {
        var sources = this.pulseSources();
        if (this.options.device !== undefined && this.options.device >= 0) {
            var source = sources[this.options.device];
            if (source) {
                return source;
            }
            console.warn("[Audio] Requested microphone index ".concat(this.options.device, " is unavailable; falling back to default source"));
        }
        try {
            var result = (0, child_process_1.spawnSync)("pactl", ["get-default-source"], {
                encoding: "utf8"
            });
            var source = (result.stdout || "").trim();
            if (source && !source.includes(".monitor")) {
                return source;
            }
        }
        catch (_e) { }
        return sources[0];
    };
    SpeechRecorder.prototype.spawnRecorder = function () {
        if (this.hasCommand("parec")) {
            var args = [
                "--format=s16le",
                "--rate=".concat(SAMPLE_RATE),
                "--channels=".concat(CHANNELS),
                "--raw",
            ];
            var source = this.selectedPulseSource();
            if (source) {
                args.push("--device", source);
                console.log("[Audio] Using PulseAudio source: ".concat(source));
            }
            else {
                console.log("[Audio] Using default PulseAudio source");
            }
            return (0, child_process_1.spawn)("parec", args, { stdio: ["pipe", "pipe", "pipe"] });
        }
        return (0, child_process_1.spawn)("arecord", ["-q", "-f", "S16_LE", "-r", "".concat(SAMPLE_RATE), "-c", "".concat(CHANNELS), "-t", "raw"], { stdio: ["pipe", "pipe", "pipe"] });
    };
    SpeechRecorder.prototype.pcmToInt16 = function (buffer) {
        var samples = buffer.length / BYTES_PER_SAMPLE;
        var result = new Int16Array(samples);
        for (var i = 0; i < samples; i++) {
            result[i] = buffer.readInt16LE(i * BYTES_PER_SAMPLE);
        }
        return result;
    };
    SpeechRecorder.prototype.rms = function (audio) {
        var sum = 0;
        for (var i = 0; i < audio.length; i++) {
            var sample = audio[i] / 32768;
            sum += sample * sample;
        }
        return Math.sqrt(sum / audio.length);
    };
    SpeechRecorder.prototype.concatFrames = function (frames) {
        if (frames.length == 0) {
            return new Int16Array(0);
        }
        return this.pcmToInt16(Buffer.concat(frames));
    };
    SpeechRecorder.prototype.processPcmData = function (data) {
        var _a, _b, _c, _d, _f, _g, _h, _j;
        this.pcmBuffer = Buffer.concat([this.pcmBuffer, data]);
        while (this.pcmBuffer.length >= FRAME_BYTES) {
            var frame = this.pcmBuffer.subarray(0, FRAME_BYTES);
            this.pcmBuffer = this.pcmBuffer.subarray(FRAME_BYTES);
            this.leadingFrames.push(Buffer.from(frame));
            if (this.leadingFrames.length > this.leadingBufferFrames) {
                this.leadingFrames.shift();
            }
            var audio = this.pcmToInt16(frame);
            var volume = this.rms(audio);
            var wasSpeaking = this.speaking;
            var silenceThreshold = this.effectiveSilenceThreshold();
            var speechThreshold = this.effectiveSpeechThreshold();
            if (!this.speaking) {
                this.noiseFloor = this.noiseFloor * 0.95 + volume * 0.05;
            }
            if (volume >= speechThreshold) {
                this.consecutiveSpeech += 1;
                this.consecutiveSilence = 0;
                if (this.consecutiveSpeech >= this.consecutiveFramesForSpeaking) {
                    this.speaking = true;
                }
            }
            else if (volume <= silenceThreshold) {
                this.consecutiveSpeech = 0;
                this.consecutiveSilence += 1;
                if (this.consecutiveSilence >= this.silenceFramesToEnd) {
                    this.speaking = false;
                }
            }
            else {
                this.consecutiveSpeech = 0;
                this.consecutiveSilence = 0;
            }
            if (!wasSpeaking && this.speaking) {
                this.currentChunkFrames = 0;
                console.log("[Audio] Chunk start volume=".concat(volume.toFixed(4), " speechThreshold=").concat(speechThreshold.toFixed(4), " noiseFloor=").concat(this.noiseFloor.toFixed(4)));
                (_b = (_a = this.options).onChunkStart) === null || _b === void 0 ? void 0 : _b.call(_a, { audio: this.concatFrames(this.leadingFrames) });
            }
            else if (wasSpeaking && !this.speaking) {
                this.currentChunkFrames = 0;
                console.log("[Audio] Chunk end silenceFrames=".concat(this.consecutiveSilence, " silenceThreshold=").concat(silenceThreshold.toFixed(4), " noiseFloor=").concat(this.noiseFloor.toFixed(4)));
                (_d = (_c = this.options).onChunkEnd) === null || _d === void 0 ? void 0 : _d.call(_c);
            }
            if (this.speaking) {
                this.currentChunkFrames += 1;
                if (this.currentChunkFrames >= this.maxChunkFrames) {
                    this.currentChunkFrames = 0;
                    this.speaking = false;
                    this.consecutiveSpeech = 0;
                    this.consecutiveSilence = 0;
                    console.log("[Audio] Chunk force-end maxChunkFrames=".concat(this.maxChunkFrames, " volume=").concat(volume.toFixed(4)));
                    (_g = (_f = this.options).onChunkEnd) === null || _g === void 0 ? void 0 : _g.call(_f);
                }
            }
            this.debugFrameCounter += 1;
            if ((this.speaking || volume > silenceThreshold * 0.5) &&
                this.debugFrameCounter % 25 == 0) {
                console.log("[Audio] Frame volume=".concat(volume.toFixed(4), " speaking=").concat(this.speaking, " silence=").concat(this.consecutiveSilence, " noiseFloor=").concat(this.noiseFloor.toFixed(4), " thresholds=").concat(silenceThreshold.toFixed(4), "/").concat(speechThreshold.toFixed(4)));
            }
            (_j = (_h = this.options).onAudio) === null || _j === void 0 ? void 0 : _j.call(_h, {
                audio: audio,
                consecutiveSilence: this.consecutiveSilence,
                speaking: this.speaking,
                volume: volume
            });
        }
    };
    SpeechRecorder.prototype.start = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                if (this.running) {
                    return [2 /*return*/];
                }
                this.running = true;
                this.speaking = false;
                this.consecutiveSpeech = 0;
                this.consecutiveSilence = 0;
                this.currentChunkFrames = 0;
                this.debugFrameCounter = 0;
                this.pcmBuffer = Buffer.alloc(0);
                this.leadingFrames = [];
                this.noiseFloor = 0.002;
                console.log("[Audio] Starting recorder device=".concat((_a = this.options.device) !== null && _a !== void 0 ? _a : -1, " silenceThreshold=").concat(this.baseSilenceThreshold.toFixed(4), " speechThreshold=").concat(this.baseSpeechThreshold.toFixed(4)));
                this.process = this.spawnRecorder();
                this.process.stdout.on("data", function (chunk) {
                    if (_this.running) {
                        _this.processPcmData(chunk);
                    }
                });
                this.process.stderr.on("data", function (data) {
                    var message = data.toString().trim();
                    if (message) {
                        console.warn("[Audio] ".concat(message));
                    }
                });
                this.process.on("error", function (error) {
                    console.error("[Audio] Recorder error:", error);
                });
                this.process.on("close", function () {
                    var _a, _b;
                    if (_this.running) {
                        _this.running = false;
                        (_b = (_a = _this.options).onChunkEnd) === null || _b === void 0 ? void 0 : _b.call(_a);
                    }
                });
                return [2 /*return*/];
            });
        });
    };
    SpeechRecorder.prototype.stop = function () {
        var _a, _b;
        if (!this.running) {
            return;
        }
        this.running = false;
        this.pcmBuffer = Buffer.alloc(0);
        this.leadingFrames = [];
        if (this.speaking) {
            (_b = (_a = this.options).onChunkEnd) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        this.speaking = false;
        this.consecutiveSpeech = 0;
        this.consecutiveSilence = 0;
        this.currentChunkFrames = 0;
        if (this.process) {
            this.process.kill("SIGTERM");
            this.process = undefined;
        }
    };
    return SpeechRecorder;
}());
exports.SpeechRecorder = SpeechRecorder;
function devices() {
    try {
        var result = (0, child_process_1.spawnSync)("pactl", ["list", "short", "sources"], {
            encoding: "utf8"
        });
        if (result.status === 0 && result.stdout) {
            var parsed = result.stdout
                .split("\n")
                .map(function (line) { return line.trim(); })
                .filter(function (line) { return line.length > 0 && !line.includes(".monitor"); })
                .map(function (line, index) {
                var parts = line.split(/\s+/);
                return {
                    id: index,
                    name: parts[1] || "Microphone ".concat(index + 1),
                    maxInputChannels: 1
                };
            });
            if (parsed.length > 0) {
                return parsed;
            }
        }
    }
    catch (_e) { }
    return [];
}
exports.devices = devices;
function getDevices() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, devices()];
        });
    });
}
exports.getDevices = getDevices;
exports["default"] = SpeechRecorder;
