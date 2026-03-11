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
var audio_1 = require("../audio");
var Microphone = /** @class */ (function () {
    function Microphone(bridge, mainWindow, settings, settingsWindow) {
        this.bridge = bridge;
        this.mainWindow = mainWindow;
        this.settings = settings;
        this.settingsWindow = settingsWindow;
        this.callbacks = {};
        this.currentChunkAudio = new Int16Array(0);
        this.currentConsecutiveSilence = 0;
        this.currentSpeaking = false;
        this.currentVolume = 0;
        this.recorder = null;
        this.lastUiUpdate = 0;
        this.volumeWhileSpeakingBuffer = [];
        this.volumeWhileSpeakingBufferSize = 10;
        // determined empirically by testing across a few different microphones and
        // used only as a visual indicator of volume, not used to determine speech
        this.volumeNormalization = 5000;
        this.running = false;
    }
    Microphone.prototype.calculateNormalizedVolume = function (volume) {
        if (volume <= 1) {
            // Float RMS from PCM capture path.
            return Math.max(0, Math.min(1, volume / 0.05));
        }
        return Math.max(0, Math.min(1, volume / this.volumeNormalization));
    };
    Microphone.prototype.start = function () {
        var _this = this;
        if (this.running) {
            return;
        }
        console.log("[Audio] Microphone start requested callbacks=".concat(Object.keys(this.callbacks).join(",") || "none"));
        this.running = true;
        this.lastUiUpdate = 0;
        this.volumeWhileSpeakingBuffer = [];
        this.recorder = new audio_1.SpeechRecorder({
            device: this.settings.getMicrophone().id,
            sileroVadSilenceThreshold: this.settings.getChunkSilenceThreshold(),
            sileroVadSpeechThreshold: this.settings.getChunkSpeechThreshold(),
            sileroVadSpeakingThreshold: this.settings.getChunkSpeechThreshold(),
            onChunkStart: function (_a) {
                var audio = _a.audio;
                _this.currentChunkAudio = audio;
                _this.currentSpeaking = true;
                _this.currentConsecutiveSilence = 0;
                _this.volumeWhileSpeakingBuffer = [];
                for (var _i = 0, _b = Object.values(_this.callbacks); _i < _b.length; _i++) {
                    var callback = _b[_i];
                    callback({ event: "chunk_start", audio: audio });
                }
            },
            onAudio: function (_a) {
                var audio = _a.audio, consecutiveSilence = _a.consecutiveSilence, speaking = _a.speaking, volume = _a.volume;
                return __awaiter(_this, void 0, void 0, function () {
                    var windows, _b, _c, _d, _i, _e, callback;
                    return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0:
                                this.currentChunkAudio = audio;
                                this.currentConsecutiveSilence = consecutiveSilence;
                                this.currentSpeaking = speaking;
                                this.currentVolume = volume;
                                // use only the start of each speech chunk for the low volume warning, or else we'll
                                // always show it, since we're still speaking during the trailing buffer
                                if (speaking &&
                                    this.volumeWhileSpeakingBuffer.length < this.volumeWhileSpeakingBufferSize) {
                                    this.volumeWhileSpeakingBuffer.push(volume);
                                }
                                if (!(Date.now() - this.lastUiUpdate >= 100)) return [3 /*break*/, 5];
                                this.lastUiUpdate = Date.now();
                                windows = [this.mainWindow];
                                _b = this.settingsWindow();
                                if (!_b) return [3 /*break*/, 2];
                                return [4 /*yield*/, this.settingsWindow()];
                            case 1:
                                _b = (_f.sent()).shown();
                                _f.label = 2;
                            case 2:
                                if (!_b) return [3 /*break*/, 4];
                                _d = (_c = windows).push;
                                return [4 /*yield*/, this.settingsWindow()];
                            case 3:
                                _d.apply(_c, [_f.sent()]);
                                _f.label = 4;
                            case 4:
                                this.bridge.setState({
                                    speakingVolume: this.volumeWhileSpeakingBuffer.length == this.volumeWhileSpeakingBufferSize
                                        ? this.volumeWhileSpeakingBuffer.reduce(function (a, b) { return a + b; }) /
                                            this.volumeWhileSpeakingBuffer.length
                                        : 0,
                                    volume: this.calculateNormalizedVolume(volume)
                                }, windows);
                                _f.label = 5;
                            case 5:
                                for (_i = 0, _e = Object.values(this.callbacks); _i < _e.length; _i++) {
                                    callback = _e[_i];
                                    callback({ event: "audio", audio: audio, volume: volume, speaking: speaking, consecutiveSilence: consecutiveSilence });
                                }
                                return [2 /*return*/];
                        }
                    });
                });
            },
            onChunkEnd: function () {
                _this.currentSpeaking = false;
                _this.currentConsecutiveSilence = 0;
                for (var _i = 0, _a = Object.values(_this.callbacks); _i < _a.length; _i++) {
                    var callback = _a[_i];
                    callback({ event: "chunk_end" });
                }
            }
        });
        this.recorder.start();
    };
    Microphone.prototype.changeMicrophone = function (microphone) {
        var _this = this;
        this.stop();
        this.settings.setMicrophone(microphone);
        if (Object.keys(this.callbacks).length > 0) {
            setTimeout(function () {
                _this.start();
            }, 1000);
        }
    };
    Microphone.prototype.microphones = function () {
        var _this = this;
        var inputs = (0, audio_1.devices)().filter(function (e) { return e.maxInputChannels > 0; });
        return [Microphone.systemDefaultMicrophone].concat(inputs).map(function (e) { return ({
            id: e.id,
            name: e.name,
            selected: e.id == _this.settings.getMicrophone().id
        }); });
    };
    Microphone.prototype.register = function (name, callback) {
        console.log("[Audio] Register callback: ".concat(name));
        var shouldStart = Object.keys(this.callbacks).length == 0;
        this.callbacks[name] = callback;
        if (shouldStart) {
            this.start();
        }
        else if (!this.running) {
            this.start();
        }
        else if (this.currentSpeaking) {
            callback({ event: "chunk_start", audio: this.currentChunkAudio });
            callback({
                event: "audio",
                audio: this.currentChunkAudio,
                volume: this.currentVolume,
                speaking: this.currentSpeaking,
                consecutiveSilence: this.currentConsecutiveSilence
            });
        }
    };
    Microphone.prototype.stop = function () {
        if (!this.running) {
            return;
        }
        console.log("[Audio] Microphone stop requested");
        this.recorder.stop();
        this.running = false;
        this.currentSpeaking = false;
        this.currentConsecutiveSilence = 0;
        this.currentChunkAudio = new Int16Array(0);
    };
    Microphone.prototype.unregister = function (name) {
        console.log("[Audio] Unregister callback: ".concat(name));
        delete this.callbacks[name];
        if (Object.keys(this.callbacks).length == 0) {
            this.stop();
        }
    };
    Microphone.systemDefaultMicrophone = { id: -1, name: "System Default" };
    return Microphone;
}());
exports["default"] = Microphone;
