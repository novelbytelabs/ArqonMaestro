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
var electron_1 = require("electron");
var jsonc_1 = require("jsonc");
var fs = __importStar(require("fs-extra"));
var os = __importStar(require("os"));
var path = __importStar(require("path"));
var microphone_1 = __importDefault(require("./stream/microphone"));
var audio_1 = require("./audio");
var Settings = /** @class */ (function () {
    function Settings() {
        this.loaded = false;
        this.systemData = {};
        this.userData = {};
        this.wordsData = {};
        this.wordsLastLoad = 0;
        this.legacyLogFiles = [
            "arqon.log",
            "serenade.log",
            "error.log",
            "verbose.log",
            "core.log",
            "speech-engine.log",
            "code-engine.log",
        ];
        this.setInstalled(true);
    }
    Settings.prototype.createIfNotExists = function (file) {
        fs.mkdirpSync(path.dirname(file));
        if (!fs.existsSync(file)) {
            fs.closeSync(fs.openSync(file, "w"));
        }
    };
    Settings.prototype.preferredPath = function () {
        return path.join(os.homedir(), ".arqon");
    };
    Settings.prototype.legacyPath = function () {
        return path.join(os.homedir(), ".serenade");
    };
    Settings.prototype.dataForFile = function (file) {
        if (file == "user") {
            return this.userData;
        }
        else if (file == "system") {
            return this.systemData;
        }
        else if (file == "words") {
            return this.wordsData;
        }
    };
    Settings.prototype.get = function (file, key, defaultValue) {
        if (!this.loaded) {
            this.load();
            this.loaded = true;
        }
        var data = this.dataForFile(file);
        if (data[key] === undefined) {
            return defaultValue;
        }
        return data[key];
    };
    Settings.prototype.load = function () {
        this.systemData = {};
        this.userData = {};
        this.wordsData = {};
        this.migrateLegacyStateIfNeeded();
        this.migrateLegacyFileIfNeeded(this.systemFile(), this.legacySystemFile());
        this.migrateLegacyFileIfNeeded(this.userFile(), this.legacyUserFile());
        this.migrateLegacyFileIfNeeded(this.wordsFile(), this.legacyWordsFile());
        this.createIfNotExists(this.systemFile());
        this.createIfNotExists(this.userFile());
        this.createIfNotExists(this.wordsFile());
        var systemFileContent = fs.readFileSync(this.systemFile()).toString();
        if (systemFileContent) {
            this.systemData = JSON.parse(systemFileContent);
        }
        var userFileContent = fs.readFileSync(this.userFile()).toString();
        if (userFileContent) {
            this.userData = JSON.parse(userFileContent);
        }
        var migrated = false;
        var legacySystemSettings = this.userData.system;
        if (legacySystemSettings && typeof legacySystemSettings == "object") {
            var legacyEndpoint = legacySystemSettings.streaming_endpoint;
            var currentEndpoint = this.systemData.streaming_endpoint;
            if (typeof legacyEndpoint == "string" &&
                legacyEndpoint.length > 0 &&
                !currentEndpoint) {
                this.systemData.streaming_endpoint = legacyEndpoint;
                migrated = true;
            }
            if (legacySystemSettings.streaming_endpoint !== undefined) {
                delete legacySystemSettings.streaming_endpoint;
                migrated = true;
            }
            if (Object.keys(legacySystemSettings).length == 0) {
                delete this.userData.system;
                migrated = true;
            }
        }
        var wordsFileContent = fs.readFileSync(this.wordsFile()).toString();
        if (wordsFileContent) {
            try {
                this.wordsData = jsonc_1.jsonc.parse(wordsFileContent);
            }
            catch (e) { }
        }
        if (migrated) {
            this.save();
        }
    };
    Settings.prototype.save = function () {
        this.createIfNotExists(this.systemFile());
        this.createIfNotExists(this.userFile());
        fs.writeFileSync(this.systemFile(), JSON.stringify(this.systemData, null, 2));
        fs.writeFileSync(this.userFile(), JSON.stringify(this.userData, null, 2));
    };
    Settings.prototype.set = function (file, key, value) {
        if (!this.loaded) {
            this.load();
            this.loaded = true;
        }
        var data = this.dataForFile(file);
        data[key] = value;
        this.save();
    };
    Settings.prototype.systemFile = function () {
        return path.join(this.preferredPath(), "arqon.json");
    };
    Settings.prototype.userFile = function () {
        return path.join(this.preferredPath(), "settings.json");
    };
    Settings.prototype.wordsFile = function () {
        return path.join(this.preferredPath(), "words.json");
    };
    Settings.prototype.legacySystemFile = function () {
        return path.join(this.legacyPath(), "serenade.json");
    };
    Settings.prototype.legacyUserFile = function () {
        return path.join(this.legacyPath(), "settings.json");
    };
    Settings.prototype.legacyWordsFile = function () {
        return path.join(this.legacyPath(), "words.json");
    };
    Settings.prototype.migrateLegacyFileIfNeeded = function (preferred, legacy) {
        if (!fs.existsSync(legacy)) {
            return;
        }
        var preferredExists = fs.existsSync(preferred);
        var preferredSize = preferredExists ? fs.statSync(preferred).size : 0;
        var legacySize = fs.statSync(legacy).size;
        if (preferredExists && preferredSize > 0) {
            return;
        }
        if (legacySize == 0) {
            return;
        }
        fs.mkdirpSync(path.dirname(preferred));
        fs.copyFileSync(legacy, preferred);
    };
    Settings.prototype.migrateLegacyDirectoryIfNeeded = function (preferred, legacy) {
        if (!fs.existsSync(legacy) || !fs.statSync(legacy).isDirectory()) {
            return;
        }
        var preferredExists = fs.existsSync(preferred);
        if (preferredExists && fs.statSync(preferred).isDirectory() && fs.readdirSync(preferred).length > 0) {
            return;
        }
        fs.mkdirpSync(path.dirname(preferred));
        fs.copySync(legacy, preferred, {
            overwrite: false,
            errorOnExist: false
        });
    };
    Settings.prototype.migrateLegacyStateIfNeeded = function () {
        fs.mkdirpSync(this.preferredPath());
        this.migrateLegacyDirectoryIfNeeded(path.join(this.preferredPath(), "scripts"), path.join(this.legacyPath(), "scripts"));
        for (var _i = 0, _a = this.legacyLogFiles; _i < _a.length; _i++) {
            var name_1 = _a[_i];
            this.migrateLegacyFileIfNeeded(path.join(this.preferredPath(), name_1), path.join(this.legacyPath(), name_1));
        }
    };
    Settings.prototype.revisionBoxTrigger = function (app) {
        var data = this.getShowRevisionBox();
        if (app) {
            for (var _i = 0, _a = Object.keys(data); _i < _a.length; _i++) {
                var k = _a[_i];
                if (app.includes(k)) {
                    if (data[k] === true) {
                        return "auto";
                    }
                    else if (data[k] === false) {
                        return "never";
                    }
                    return data[k];
                }
            }
        }
        return data["default"] || data.all_apps || "never";
    };
    Settings.prototype.getAnimations = function () {
        return this.get("user", "animations", false);
    };
    Settings.prototype.getBounds = function () {
        var result = this.get("system", "bounds", { x: 0, y: 0, width: 0, height: 0 });
        var display = electron_1.screen.getDisplayNearestPoint({ x: result.x, y: result.y });
        if (result.x < display.workArea.x || result.x > display.workArea.x + display.workArea.width) {
            result.x = display.workArea.x;
        }
        if (result.y < display.workArea.y || result.y > display.workArea.y + display.workArea.height) {
            result.y = display.workArea.y;
        }
        return result;
    };
    Settings.prototype.getChunkSilenceThreshold = function () {
        return this.get("user", "chunk_silence_threshold", 0.3);
    };
    Settings.prototype.getChunkSpeechThreshold = function () {
        return this.get("user", "chunk_speech_threshold", 0.3);
    };
    Settings.prototype.getClipboardInsert = function () {
        return this.get("user", "clipboard_insert", true);
    };
    Settings.prototype.getContinueRunningInTray = function () {
        return this.get("user", "continue_running_in_tray", false);
    };
    Settings.prototype.getCustomHints = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadWordsFileIfNeeded()];
                    case 1:
                        _a.sent();
                        result = this.get("words", "hints", []);
                        if (Array.isArray(result) && result.every(function (item) { return typeof item === "string"; })) {
                            return [2 /*return*/, result];
                        }
                        return [2 /*return*/, []];
                }
            });
        });
    };
    Settings.prototype.getCustomWords = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadWordsFileIfNeeded()];
                    case 1:
                        _a.sent();
                        result = this.get("words", "words", {});
                        if (Object.keys(result).every(function (key) { return typeof key === "string" && typeof result[key] === "string"; })) {
                            return [2 /*return*/, result];
                        }
                        return [2 /*return*/, {}];
                }
            });
        });
    };
    Settings.prototype.getDarkMode = function () {
        return this.get("user", "dark_mode", "system");
    };
    Settings.prototype.getDisableAnalytics = function () {
        return this.get("user", "disable_analytics", false);
    };
    Settings.prototype.getDisableSuggestions = function () {
        return this.get("user", "disable_suggestions", false);
    };
    Settings.prototype.getDisableAutoUpdate = function () {
        return this.get("system", "disable_auto_update", false);
    };
    Settings.prototype.getEditorAutocomplete = function () {
        return this.get("user", "autocomplete", false);
    };
    Settings.prototype.getExecuteSilenceThreshold = function () {
        return this.get("user", "execute_silence_threshold", 1);
    };
    Settings.prototype.getLogAudio = function () {
        // support legacy setting
        var legacy = this.get("user", "local_logging_opt_out", undefined);
        if (legacy === true) {
            this.set("user", "log_audio", false);
            return false;
        }
        return this.get("user", "log_audio", false);
    };
    Settings.prototype.getLogSource = function () {
        // support legacy setting
        var legacy = this.get("user", "local_logging_opt_out", undefined);
        if (legacy === true) {
            this.set("user", "log_source", false);
            return false;
        }
        return this.get("user", "log_source", false);
    };
    Settings.prototype.getMicrophone = function () {
        // use the microphone from settings only if the microphone at that index has a matching name.
        // microphones can re-order and different microphones can have the same name,
        // so only set to a non-default microphone if it matches both name and index.
        var data = this.get("system", "microphone", microphone_1["default"].systemDefaultMicrophone);
        if (data.id != microphone_1["default"].systemDefaultMicrophone.id) {
            var active = (0, audio_1.devices)().filter(function (e) { return e.id == data.id; });
            if (active.length != 1 || active[0].name != data.name) {
                this.setMicrophone(microphone_1["default"].systemDefaultMicrophone);
            }
        }
        return this.get("system", "microphone", microphone_1["default"].systemDefaultMicrophone);
    };
    Settings.prototype.getMinimizedPosition = function () {
        return this.get("user", "minimized_position", os.platform() == "win32" ? "bottom-right" : "top-right");
    };
    Settings.prototype.getMiniMode = function () {
        return this.get("user", "mini_mode", true);
    };
    Settings.prototype.getMiniModeFewerAlternativesCount = function () {
        return this.get("user", "mini_mode_fewer_alternatives_count", 5);
    };
    Settings.prototype.getMiniModeHideTimeout = function () {
        return this.get("user", "mini_mode_timeout_value", 5);
    };
    Settings.prototype.getMiniModeReversed = function () {
        return this.get("user", "mini_mode_reversed", true);
    };
    Settings.prototype.getPlugins = function () {
        return this.get("system", "plugins", []);
    };
    Settings.prototype.getPluginInstalled = function (plugin) {
        return this.getPlugins().includes(plugin);
    };
    Settings.prototype.getNuxCompleted = function () {
        return this.get("system", "nux_completed", false);
    };
    Settings.prototype.getNuxStep = function () {
        return this.get("system", "nux_step", 0);
    };
    Settings.prototype.getNuxTutorialName = function () {
        return this.get("system", "nux_tutorial_name", "");
    };
    Settings.prototype.getPasteKeys = function (app) {
        var data = this.get("user", "paste_override", {
            "gnome-terminal": { key: "v", modifiers: ["control", "shift"] }
        });
        if (app) {
            for (var _i = 0, _a = Object.keys(data); _i < _a.length; _i++) {
                var k = _a[_i];
                if (app.includes(k)) {
                    return { key: data[k].key, modifiers: data[k].modifiers };
                }
            }
        }
        return { key: "v", modifiers: os.platform() == "darwin" ? ["command"] : ["control"] };
    };
    Settings.prototype.getPushToTalk = function () {
        return this.get("user", "push_to_talk", "Alt+Space");
    };
    Settings.prototype.getShowRevisionBox = function () {
        return this.get("user", "show_revision_box", { all_apps: false });
    };
    Settings.prototype.getStreamingEndpoint = function () {
        var endpoints = this.getStreamingEndpoints();
        var endpoint = this.get("system", "streaming_endpoint", "us-west-2");
        return endpoints.filter(function (e) { return e.id == endpoint; })[0];
    };
    Settings.prototype.getStreamingEndpoints = function () {
        return this.get("system", "streaming_endpoints", [
            {
                id: "us-west-2",
                name: "US West Coast",
                address: "stream-us-west-2.serenade.ai"
            },
            {
                id: "us-east-1",
                name: "US East Coast",
                address: "stream-us-east-1.serenade.ai"
            },
            {
                id: "eu-west-2",
                name: "Europe",
                address: "stream-eu-west-2.serenade.ai"
            },
            {
                id: "local",
                name: "Local",
                address: "localhost:17200"
            },
        ]);
    };
    Settings.prototype.getStylers = function () {
        return this.get("user", "stylers", {});
    };
    Settings.prototype.getTextInputKeybinding = function () {
        return this.get("user", "text_input_keybinding", "Ctrl+Alt+Space");
    };
    Settings.prototype.getToken = function () {
        return this.get("system", "token", "");
    };
    Settings.prototype.getUseAccessibilityApi = function () {
        return this.get("user", "use_accessibility_api", []);
    };
    Settings.prototype.getUseMiniModeHideTimeout = function () {
        return this.get("user", "mini_mode_timeout", false);
    };
    Settings.prototype.getUseMiniModeFewerAlternatives = function () {
        return this.get("user", "mini_mode_fewer_alternatives", false);
    };
    Settings.prototype.getUseVerboseLogging = function () {
        return this.get("user", "verbose_logging", false);
    };
    Settings.prototype.loadWordsFileIfNeeded = function () {
        return __awaiter(this, void 0, void 0, function () {
            var modified;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fs.stat(this.wordsFile())];
                    case 1:
                        modified = (_a.sent()).mtime.getTime();
                        if (modified > this.wordsLastLoad) {
                            this.load();
                            this.wordsLastLoad = modified;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Settings.prototype.path = function () {
        fs.mkdirpSync(this.preferredPath());
        return path.dirname(this.systemFile());
    };
    Settings.prototype.setAnimations = function (animations) {
        this.set("user", "animations", animations);
    };
    Settings.prototype.setBounds = function (bounds) {
        this.set("system", "bounds", bounds);
    };
    Settings.prototype.setChunkSilenceThreshold = function (threshold) {
        return this.set("user", "chunk_silence_threshold", threshold);
    };
    Settings.prototype.setChunkSpeechThreshold = function (threshold) {
        return this.set("user", "chunk_speech_threshold", threshold);
    };
    Settings.prototype.setClipboardInsert = function (clipboardInsert) {
        return this.set("user", "clipboard_insert", clipboardInsert);
    };
    Settings.prototype.setContinueRunningInTray = function (continueRunningInTray) {
        this.set("user", "continue_running_in_tray", continueRunningInTray);
    };
    Settings.prototype.setDarkMode = function (darkMode) {
        this.set("user", "dark_mode", darkMode);
    };
    Settings.prototype.setDisableSuggestions = function (disableSuggestions) {
        return this.set("user", "disable_suggestions", disableSuggestions);
    };
    Settings.prototype.setEditorAutocomplete = function (autocomplete) {
        this.set("user", "autocomplete", autocomplete);
    };
    Settings.prototype.setExecuteSilenceThreshold = function (threshold) {
        return this.set("user", "execute_silence_threshold", threshold);
    };
    Settings.prototype.setInstalled = function (installed) {
        this.set("system", "installed", installed);
    };
    Settings.prototype.setLogAudio = function (logAudio) {
        this.set("user", "log_audio", logAudio);
    };
    Settings.prototype.setLogSource = function (logSource) {
        this.set("user", "log_source", logSource);
    };
    Settings.prototype.setMicrophone = function (microphone) {
        return this.set("system", "microphone", microphone);
    };
    Settings.prototype.setMinimizedPosition = function (position) {
        this.set("user", "minimized_position", position);
    };
    Settings.prototype.setMiniMode = function (miniMode) {
        this.set("user", "mini_mode", miniMode);
    };
    Settings.prototype.setMiniModeFewerAlternativesCount = function (fewerAlternativesCount) {
        this.set("user", "mini_mode_fewer_alternatives_count", fewerAlternativesCount);
    };
    Settings.prototype.setMiniModeHideTimeout = function (timeout) {
        this.set("user", "mini_mode_timeout_value", timeout);
    };
    Settings.prototype.setMiniModeReversed = function (reversed) {
        return this.set("user", "mini_mode_reversed", reversed);
    };
    Settings.prototype.setNuxCompleted = function (completed) {
        this.set("system", "nux_completed", completed);
    };
    Settings.prototype.setNuxStep = function (step) {
        this.set("system", "nux_step", step);
    };
    Settings.prototype.setNuxTutorialName = function (name) {
        this.set("system", "nux_tutorial_name", name);
    };
    Settings.prototype.setPluginInstalled = function (plugin) {
        var data = this.dataForFile("system");
        if (!data.plugins) {
            data.plugins = [];
        }
        if (!data.plugins.includes(plugin)) {
            data.plugins.push(plugin);
        }
    };
    Settings.prototype.setPushToTalk = function (pushToTalk) {
        this.set("user", "push_to_talk", pushToTalk);
    };
    Settings.prototype.setShowRevisionBox = function (data) {
        this.set("user", "show_revision_box", __assign(__assign({}, this.getShowRevisionBox()), data));
    };
    Settings.prototype.setStreamingEndpoint = function (endpoint) {
        this.set("system", "streaming_endpoint", endpoint);
    };
    Settings.prototype.setStylers = function (stylers) {
        this.set("user", "stylers", stylers);
    };
    Settings.prototype.setTextInputKeybinding = function (textInputKeybinding) {
        this.set("user", "text_input_keybinding", textInputKeybinding);
    };
    Settings.prototype.setToken = function (token) {
        this.set("system", "token", token);
    };
    Settings.prototype.setUseMiniModeFewerAlternatives = function (fewerAlternatives) {
        this.set("user", "mini_mode_fewer_alternatives", fewerAlternatives);
    };
    Settings.prototype.setUseMiniModeHideTimeout = function (timeout) {
        this.set("user", "mini_mode_timeout", timeout);
    };
    Settings.prototype.setUseVerboseLogging = function (verboseLogging) {
        this.set("user", "verbose_logging", verboseLogging);
    };
    // ========================================================================
    // ArqonHPO Configuration
    // ========================================================================
    /**
     * Get whether ArqonHPO homeostatic tuning is enabled
     * Gate 6B default: false (fail-closed)
     */
    Settings.prototype.getArqonHpoHomeostasisEnabled = function () {
        return this.get("system", "arqon_hpo_homeostasis_enabled", false);
    };
    /**
     * Set ArqonHPO homeostatic tuning enabled state
     */
    Settings.prototype.setArqonHpoHomeostasisEnabled = function (enabled) {
        this.set("system", "arqon_hpo_homeostasis_enabled", enabled);
    };
    /**
     * Get whether ArqonHPO is in dry-run mode
     * Gate 6B default: true
     */
    Settings.prototype.getArqonHpoDryRun = function () {
        return this.get("system", "arqon_hpo_dry_run", true);
    };
    /**
     * Set ArqonHPO dry-run mode
     */
    Settings.prototype.setArqonHpoDryRun = function (dryRun) {
        this.set("system", "arqon_hpo_dry_run", dryRun);
    };
    // ========================================================================
    // Arqon Bus Configuration
    // ========================================================================
    /**
     * Get whether Arqon Bus integration is enabled
     * Production default: true (after cutover)
     */
    Settings.prototype.getArqonBusEnabled = function () {
        return this.get("system", "arqon_bus_enabled", false);
    };
    /**
     * Set Arqon Bus enabled state
     */
    Settings.prototype.setArqonBusEnabled = function (enabled) {
        this.set("system", "arqon_bus_enabled", enabled);
    };
    /**
     * Get Arqon Bus WebSocket URL
     */
    Settings.prototype.getArqonBusWsUrl = function () {
        return this.get("system", "arqon_bus_ws_url", "ws://localhost:9100");
    };
    /**
     * Set Arqon Bus WebSocket URL
     */
    Settings.prototype.setArqonBusWsUrl = function (url) {
        this.set("system", "arqon_bus_ws_url", url);
    };
    /**
     * Get Arqon Bus shadow mode setting
     * When enabled, messages are published but responses are not acted upon
     * Production default: false (after cutover)
     */
    Settings.prototype.getArqonBusShadowMode = function () {
        return this.get("system", "arqon_bus_shadow_mode", true);
    };
    /**
     * Set Arqon Bus shadow mode
     */
    Settings.prototype.setArqonBusShadowMode = function (shadowMode) {
        this.set("system", "arqon_bus_shadow_mode", shadowMode);
    };
    /**
     * Get Arqon Bus room name
     */
    Settings.prototype.getArqonBusRoom = function () {
        return this.get("system", "arqon_bus_room", "stt");
    };
    /**
     * Set Arqon Bus room name
     */
    Settings.prototype.setArqonBusRoom = function (room) {
        this.set("system", "arqon_bus_room", room);
    };
    /**
     * Get Arqon Bus channel name
     */
    Settings.prototype.getArqonBusChannel = function () {
        return this.get("system", "arqon_bus_channel", "transcription");
    };
    /**
     * Set Arqon Bus channel name
     */
    Settings.prototype.setArqonBusChannel = function (channel) {
        this.set("system", "arqon_bus_channel", channel);
    };
    // ========================================================================
    // Arqon Bus Comparison Configuration
    // ========================================================================
    /**
     * Get whether comparison mode is enabled
     */
    Settings.prototype.getArqonBusCompareEnabled = function () {
        return this.get("system", "arqon_bus_compare_enabled", false);
    };
    /**
     * Set comparison mode enabled
     */
    Settings.prototype.setArqonBusCompareEnabled = function (enabled) {
        this.set("system", "arqon_bus_compare_enabled", enabled);
    };
    /**
     * Get similarity threshold for comparison (0-1)
     */
    Settings.prototype.getArqonBusCompareThreshold = function () {
        return this.get("system", "arqon_bus_compare_threshold", 0.95);
    };
    /**
     * Set similarity threshold
     */
    Settings.prototype.setArqonBusCompareThreshold = function (threshold) {
        this.set("system", "arqon_bus_compare_threshold", threshold);
    };
    /**
     * Get comparison report interval in seconds
     */
    Settings.prototype.getArqonBusCompareReportInterval = function () {
        return this.get("system", "arqon_bus_compare_report_interval_s", 300);
    };
    /**
     * Set comparison report interval
     */
    Settings.prototype.setArqonBusCompareReportInterval = function (intervalSeconds) {
        this.set("system", "arqon_bus_compare_report_interval_s", intervalSeconds);
    };
    /**
     * Get comparison sample rate (0-1)
     */
    Settings.prototype.getArqonBusCompareSampleRate = function () {
        return this.get("system", "arqon_bus_compare_sample_rate", 1.0);
    };
    /**
     * Set comparison sample rate
     */
    Settings.prototype.setArqonBusCompareSampleRate = function (rate) {
        this.set("system", "arqon_bus_compare_sample_rate", rate);
    };
    // ========================================================================
    // Arqon Bus Cutover Configuration
    // ========================================================================
    /**
     * Get whether cutover is enabled (master switch)
     * Production default: true (after cutover)
     */
    Settings.prototype.getArqonBusCutoverEnabled = function () {
        return this.get("system", "arqon_bus_cutover_enabled", false);
    };
    /**
     * Set cutover enabled state
     */
    Settings.prototype.setArqonBusCutoverEnabled = function (enabled) {
        this.set("system", "arqon_bus_cutover_enabled", enabled);
    };
    /**
     * Get current Bus traffic percentage (0-100)
     * Production default: 100 (after cutover)
     */
    Settings.prototype.getArqonBusTrafficPercentage = function () {
        return this.get("system", "arqon_bus_traffic_percentage", 0);
    };
    /**
     * Set Bus traffic percentage
     */
    Settings.prototype.setArqonBusTrafficPercentage = function (percentage) {
        this.set("system", "arqon_bus_traffic_percentage", Math.max(0, Math.min(100, percentage)));
    };
    /**
     * Get current cutover stage
     * Production default: 100pct (after cutover)
     */
    Settings.prototype.getArqonBusCurrentStage = function () {
        return this.get("system", "arqon_bus_current_stage", "shadow");
    };
    /**
     * Set current cutover stage
     */
    Settings.prototype.setArqonBusCurrentStage = function (stage) {
        this.set("system", "arqon_bus_current_stage", stage);
    };
    /**
     * Get whether instant rollback is enabled
     */
    Settings.prototype.getArqonBusRollbackEnabled = function () {
        return this.get("system", "arqon_bus_rollback_enabled", false);
    };
    /**
     * Set rollback enabled state
     */
    Settings.prototype.setArqonBusRollbackEnabled = function (enabled) {
        this.set("system", "arqon_bus_rollback_enabled", enabled);
    };
    /**
     * Get stage check interval in seconds
     */
    Settings.prototype.getArqonBusStageCheckInterval = function () {
        return this.get("system", "arqon_bus_stage_check_interval_s", 60);
    };
    /**
     * Set stage check interval
     */
    Settings.prototype.setArqonBusStageCheckInterval = function (intervalSeconds) {
        this.set("system", "arqon_bus_stage_check_interval_s", intervalSeconds);
    };
    /**
     * Get explicit approval flag for stage promotion
     */
    Settings.prototype.getArqonBusStageApproval = function () {
        return this.get("system", "arqon_bus_stage_approval", false);
    };
    /**
     * Set explicit approval flag for stage promotion
     */
    Settings.prototype.setArqonBusStageApproval = function (approved) {
        this.set("system", "arqon_bus_stage_approval", approved);
    };
    // ========================================================================
    // Arqon Control Plane Configuration (Gate 5)
    // ========================================================================
    /**
     * Get whether control-plane coordination is enabled.
     */
    Settings.prototype.getArqonControlPlaneEnabled = function () {
        return this.get("system", "arqon_control_plane_enabled", false);
    };
    Settings.prototype.setArqonControlPlaneEnabled = function (enabled) {
        this.set("system", "arqon_control_plane_enabled", enabled);
    };
    /**
     * Get SpacetimeDB URL for control-plane coordination state.
     */
    Settings.prototype.getArqonControlPlaneSpacetimeDbUrl = function () {
        return this.get("system", "arqon_control_plane_spacetimedb_url", "http://localhost:3000");
    };
    Settings.prototype.setArqonControlPlaneSpacetimeDbUrl = function (url) {
        this.set("system", "arqon_control_plane_spacetimedb_url", url);
    };
    /**
     * Fail-closed behavior when control-plane backbone is unavailable.
     */
    Settings.prototype.getArqonControlPlaneFailClosed = function () {
        return this.get("system", "arqon_control_plane_fail_closed", true);
    };
    Settings.prototype.setArqonControlPlaneFailClosed = function (enabled) {
        this.set("system", "arqon_control_plane_fail_closed", enabled);
    };
    /**
     * Maximum in-flight requests per agent in the coordinator.
     */
    Settings.prototype.getArqonControlPlaneAgentInflightLimit = function () {
        return this.get("system", "arqon_control_plane_agent_inflight_limit", 2);
    };
    Settings.prototype.setArqonControlPlaneAgentInflightLimit = function (limit) {
        this.set("system", "arqon_control_plane_agent_inflight_limit", Math.max(1, Math.floor(limit)));
    };
    /**
     * Maximum in-flight requests globally in the coordinator.
     */
    Settings.prototype.getArqonControlPlaneGlobalInflightLimit = function () {
        return this.get("system", "arqon_control_plane_global_inflight_limit", 8);
    };
    Settings.prototype.setArqonControlPlaneGlobalInflightLimit = function (limit) {
        this.set("system", "arqon_control_plane_global_inflight_limit", Math.max(1, Math.floor(limit)));
    };
    // ========================================================================
    // Kokoro TTS Configuration (Gate 6)
    // ========================================================================
    /**
     * Get TTS provider selection
     * Options: "kokoro" | "fallback"
     * Default: "fallback" (safe default - uses existing aplay path)
     */
    Settings.prototype.getArqonTtsProvider = function () {
        return this.get("system", "arqon_tts_provider", "fallback");
    };
    Settings.prototype.setArqonTtsProvider = function (provider) {
        this.set("system", "arqon_tts_provider", provider);
    };
    /**
     * Get Kokoro sidecar base URL (Firecracker-hosted service).
     */
    Settings.prototype.getArqonTtsKokoroUrl = function () {
        return this.get("system", "arqon_tts_kokoro_url", "http://127.0.0.1:7781");
    };
    Settings.prototype.setArqonTtsKokoroUrl = function (url) {
        this.set("system", "arqon_tts_kokoro_url", url);
    };
    /**
     * Get Kokoro voice selection
     */
    Settings.prototype.getArqonTtsKokoroVoice = function () {
        return this.get("system", "arqon_tts_kokoro_voice", "af_heart");
    };
    Settings.prototype.setArqonTtsKokoroVoice = function (voice) {
        this.set("system", "arqon_tts_kokoro_voice", voice);
    };
    /**
     * Get Kokoro synthesis timeout in milliseconds
     */
    Settings.prototype.getArqonTtsKokoroTimeoutMs = function () {
        return this.get("system", "arqon_tts_kokoro_timeout_ms", 5000);
    };
    Settings.prototype.setArqonTtsKokoroTimeoutMs = function (timeout) {
        this.set("system", "arqon_tts_kokoro_timeout_ms", timeout);
    };
    /**
     * Get whether fallback TTS is enabled when Kokoro fails
     * Default: true (fallback to aplay path)
     */
    Settings.prototype.getArqonTtsKokoroFallbackEnabled = function () {
        return this.get("system", "arqon_tts_kokoro_fallback_enabled", true);
    };
    Settings.prototype.setArqonTtsKokoroFallbackEnabled = function (enabled) {
        this.set("system", "arqon_tts_kokoro_fallback_enabled", enabled);
    };
    /**
     * Enable streamed Kokoro synthesis/playback path.
     * Falls back to non-streaming endpoint if stream endpoint is unavailable.
     */
    Settings.prototype.getArqonTtsKokoroStreamingEnabled = function () {
        return this.get("system", "arqon_tts_kokoro_streaming_enabled", true);
    };
    Settings.prototype.setArqonTtsKokoroStreamingEnabled = function (enabled) {
        this.set("system", "arqon_tts_kokoro_streaming_enabled", enabled);
    };
    return Settings;
}());
exports["default"] = Settings;
