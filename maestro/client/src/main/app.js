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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var electron_1 = require("electron");
var electron_fetch_1 = __importDefault(require("electron-fetch"));
var active_1 = __importDefault(require("./active"));
var api_1 = __importDefault(require("./api"));
var bus_plugin_server_1 = __importDefault(require("./ipc/bus-plugin-server"));
var chunk_queue_1 = require("./stream/chunk-queue");
var chunk_manager_1 = __importDefault(require("./stream/chunk-manager"));
var command_handler_1 = __importDefault(require("./execute/command-handler"));
var custom_1 = __importDefault(require("./ipc/custom"));
var executor_1 = __importDefault(require("./execute/executor"));
var insert_history_1 = __importDefault(require("./execute/insert-history"));
var language_switcher_1 = __importDefault(require("./windows/language-switcher"));
var local_1 = __importDefault(require("./ipc/local"));
var log_1 = __importDefault(require("./log"));
var main_1 = __importDefault(require("./windows/main"));
var metadata_1 = __importDefault(require("../shared/metadata"));
var microphone_1 = __importDefault(require("./stream/microphone"));
var mini_mode_1 = __importDefault(require("./windows/mini-mode"));
var native_commands_1 = __importDefault(require("./execute/native-commands"));
var nux_1 = __importDefault(require("./nux"));
var plugin_manager_1 = __importDefault(require("./ipc/plugin-manager"));
var bridge_1 = __importDefault(require("./bridge"));
var events_1 = __importDefault(require("./events"));
var revision_box_1 = __importDefault(require("./windows/revision-box"));
var settings_1 = __importDefault(require("./settings"));
var settings_2 = __importDefault(require("./windows/settings"));
var stream_1 = __importDefault(require("./stream/stream"));
var system_1 = __importDefault(require("./execute/system"));
var text_input_1 = __importDefault(require("./windows/text-input"));
var tracking_1 = __importDefault(require("./stt/tracking"));
var bus_client_1 = require("./stt/bus-client");
var comparator_1 = require("./stt/comparator");
var traffic_router_1 = require("./stt/traffic-router");
var hpo_tuner_1 = __importDefault(require("./stt/hpo-tuner"));
var examples = __importStar(require("./examples"));
var App = /** @class */ (function () {
    function App() {
    }
    App.create = function () {
        return __awaiter(this, void 0, void 0, function () {
            var instance, languageSwitcherWindow, settingsWindow, textInputWindow, revisionBoxWindow, miniModeWindow, chunkQueue, insertHistory, metadata, settings, bridge, system, log, custom, _a, mainWindow, _b, _c, _d, pluginManager, microphone, active, nativeCommands, api, tracking, hpoTuner, stream, local, nux, executor, chunkManager, busClient, comparator, trafficRouter, commandHandler, endpoint, localServiceHealthy, e_1, tokenPresent, initialLoggedIn, _f, speechHealthy, codeHealthy, remoteEndpoints, pings, index, fallback, attempts_1, interval_1;
            var _this = this;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        instance = new App();
                        languageSwitcherWindow = undefined;
                        settingsWindow = undefined;
                        textInputWindow = undefined;
                        revisionBoxWindow = undefined;
                        miniModeWindow = undefined;
                        chunkQueue = new chunk_queue_1.ChunkQueue();
                        insertHistory = new insert_history_1["default"]();
                        metadata = new metadata_1["default"]();
                        settings = (instance.settings = new settings_1["default"]());
                        bridge = (instance.bridge = new bridge_1["default"](settings));
                        system = new system_1["default"](settings);
                        log = (instance.log = new log_1["default"](settings));
                        instance.updateDarkModeForAllWindows();
                        _a = instance;
                        return [4 /*yield*/, custom_1["default"].create(settings)];
                    case 1:
                        custom = (_a.custom = _g.sent());
                        _b = instance;
                        return [4 /*yield*/, main_1["default"].create(instance, bridge, metadata, settings, function () { return instance.chunkManager; }, function () { return miniModeWindow; }, function () { return [
                                revisionBoxWindow,
                                miniModeWindow,
                                languageSwitcherWindow,
                                settingsWindow,
                                textInputWindow,
                            ]; })];
                    case 2:
                        mainWindow = (_b.mainWindow = _g.sent());
                        _c = instance;
                        return [4 /*yield*/, mini_mode_1["default"].create(bridge, mainWindow, settings)];
                    case 3:
                        miniModeWindow = _c.miniModeWindow = _g.sent();
                        mainWindow.show();
                        if (settings.getMiniMode()) {
                            miniModeWindow.snapToMain();
                            miniModeWindow.show();
                        }
                        _d = instance;
                        return [4 /*yield*/, revision_box_1["default"].create(bridge, mainWindow, miniModeWindow, settings, system)];
                    case 4:
                        revisionBoxWindow = _d.revisionBoxWindow = _g.sent();
                        electron_1.nativeTheme.on("updated", function () {
                            // this seems to be triggered more often than it changes, so we cache the value here
                            if (settings.getDarkMode() != "system" ||
                                electron_1.nativeTheme.shouldUseDarkColors === instance.previousShouldUseDarkColors) {
                                return;
                            }
                            instance.updateDarkModeForAllWindows();
                            instance.previousShouldUseDarkColors = electron_1.nativeTheme.shouldUseDarkColors;
                        });
                        pluginManager = new plugin_manager_1["default"](settings);
                        microphone = (instance.microphone = new microphone_1["default"](bridge, mainWindow, settings, function () { return settingsWindow; }));
                        active = new active_1["default"](bridge, custom, revisionBoxWindow, insertHistory, mainWindow, metadata, miniModeWindow, pluginManager, settings, system);
                        nativeCommands = new native_commands_1["default"](active, insertHistory, revisionBoxWindow, system);
                        api = new api_1["default"](active, bridge, log, mainWindow, metadata, settings, function () { return settingsWindow; });
                        tracking = new tracking_1["default"](api, settings);
                        hpoTuner = (instance.hpoTuner = new hpo_tuner_1["default"](settings, log, tracking));
                        stream = (instance.stream = new stream_1["default"](active, api, log, settings, tracking));
                        local = (instance.local = new local_1["default"](bridge, log, mainWindow, metadata, settings));
                        nux = new nux_1["default"](active, instance, bridge, mainWindow, miniModeWindow, pluginManager, settings);
                        instance.busPluginServer = new bus_plugin_server_1["default"](settings, active, bridge, custom, mainWindow, miniModeWindow, pluginManager, stream, log);
                        return [4 /*yield*/, custom.start()];
                    case 5:
                        _g.sent();
                        executor = (instance.executor = new executor_1["default"](active, api, bridge, insertHistory, log, mainWindow, miniModeWindow, nativeCommands, nux, pluginManager, revisionBoxWindow, settings, stream, system, function () { return commandHandler; }));
                        chunkManager = (instance.chunkManager = new chunk_manager_1["default"](active, api, instance, bridge, chunkQueue, custom, executor, log, mainWindow, microphone, miniModeWindow, settings, stream, tracking));
                        busClient = (0, bus_client_1.createBusClient)(settings, log, tracking, hpoTuner);
                        chunkManager.setBusClient(busClient);
                        comparator = (0, comparator_1.createSTTComparator)(log, settings, tracking);
                        chunkManager.setComparator(comparator);
                        trafficRouter = (0, traffic_router_1.createTrafficRouter)(settings, log, tracking);
                        chunkManager.setTrafficRouter(trafficRouter);
                        // Start stage check if cutover is enabled
                        if (trafficRouter.isEnabled()) {
                            trafficRouter.startStageCheck(function (stage) {
                                log.logVerbose("[App] Cutover promoted to stage: ".concat(stage));
                            }, function (reason) {
                                log.logError("[App] Cutover rolled back: ".concat(reason));
                            });
                        }
                        // Start health check if Bus is enabled
                        if (busClient.isEnabled()) {
                            busClient.startHealthCheck(function () {
                                return {
                                    status: busClient.isConnected() ? "healthy" : "unhealthy",
                                    latency: 0,
                                    errors: 0
                                };
                            });
                        }
                        commandHandler = new command_handler_1["default"](active, instance, bridge, chunkManager, custom, executor, mainWindow, nativeCommands, nux, revisionBoxWindow, settings, stream, system, function () { return languageSwitcherWindow; });
                        // Initialise HPO service if enabled
                        return [4 /*yield*/, hpoTuner.start()];
                    case 6:
                        // Initialise HPO service if enabled
                        _g.sent();
                        new events_1["default"](active, instance, api, bridge, chunkManager, custom, revisionBoxWindow, local, mainWindow, microphone, miniModeWindow, nux, pluginManager, settings, stream, function () { return languageSwitcherWindow; }, function () { return settingsWindow; }, function () { return textInputWindow; });
                        // users will see an onboarding step to change these default values before using the product
                        if (!settings.getToken()) {
                            settings.setLogAudio(true);
                            settings.setLogSource(true);
                        }
                        instance.sendAllSettings(local, microphone, miniModeWindow, settings, [
                            mainWindow,
                            miniModeWindow,
                        ]);
                        endpoint = settings.getStreamingEndpoint();
                        console.log("[ArqonMaestro] Streaming endpoint:", endpoint === null || endpoint === void 0 ? void 0 : endpoint.id, "-", endpoint === null || endpoint === void 0 ? void 0 : endpoint.address);
                        console.log("[ArqonMaestro] Token present:", !!settings.getToken());
                        localServiceHealthy = function (url) { return __awaiter(_this, void 0, void 0, function () {
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
                        }); };
                        if (!(endpoint && endpoint.id == "local")) return [3 /*break*/, 7];
                        local.start();
                        return [3 /*break*/, 11];
                    case 7:
                        console.log("[ArqonMaestro] Attempting to connect to remote endpoint:", endpoint === null || endpoint === void 0 ? void 0 : endpoint.address);
                        _g.label = 8;
                    case 8:
                        _g.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, api.setBestEndpoint(settings.getStreamingEndpoints())];
                    case 9:
                        _g.sent();
                        console.log("[ArqonMaestro] setBestEndpoint completed successfully");
                        return [3 /*break*/, 11];
                    case 10:
                        e_1 = _g.sent();
                        console.error("[ArqonMaestro] setBestEndpoint failed:", e_1);
                        return [3 /*break*/, 11];
                    case 11:
                        instance.registerPushToTalk();
                        tokenPresent = !!settings.getToken();
                        initialLoggedIn = tokenPresent;
                        if (!(endpoint && endpoint.id == "local")) return [3 /*break*/, 14];
                        return [4 /*yield*/, Promise.all([
                                localServiceHealthy("http://localhost:17202/api/status"),
                                localServiceHealthy("http://localhost:17203/api/status"),
                            ])];
                    case 12:
                        _f = _g.sent(), speechHealthy = _f[0], codeHealthy = _f[1];
                        initialLoggedIn = initialLoggedIn && speechHealthy && codeHealthy;
                        if (!!initialLoggedIn) return [3 /*break*/, 14];
                        console.warn("[ArqonMaestro] Local endpoint selected but local backend is not fully healthy yet.");
                        console.warn("[ArqonMaestro] Local endpoint is configured fail-closed. Remote fallback disabled.");
                        _g.label = 14;
                    case 14:
                        console.log("[ArqonMaestro] Setting loggedIn state:", initialLoggedIn);
                        bridge.setState({ loggedIn: initialLoggedIn, listening: false }, [
                            mainWindow,
                            miniModeWindow,
                        ]);
                        // Renderer startup can race with IPC listener registration; send once more
                        // so loggedIn doesn't stay undefined on the loading page.
                        setTimeout(function () {
                            bridge.setState({ loggedIn: initialLoggedIn, listening: false }, [
                                mainWindow,
                                miniModeWindow,
                            ]);
                        }, 1500);
                        // Local backend startup can lag app initialization. Poll briefly and flip to logged-in
                        // once both local services are healthy so restart is not required.
                        if (endpoint && endpoint.id == "local" && tokenPresent && !initialLoggedIn) {
                            attempts_1 = 0;
                            interval_1 = setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                                var _a, speechHealthy, codeHealthy;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            attempts_1 += 1;
                                            return [4 /*yield*/, Promise.all([
                                                    localServiceHealthy("http://localhost:17202/api/status"),
                                                    localServiceHealthy("http://localhost:17203/api/status"),
                                                ])];
                                        case 1:
                                            _a = _b.sent(), speechHealthy = _a[0], codeHealthy = _a[1];
                                            if (speechHealthy && codeHealthy) {
                                                console.log("[ArqonMaestro] Local backend healthy; enabling loggedIn state.");
                                                bridge.setState({ loggedIn: true, listening: false }, [mainWindow, miniModeWindow]);
                                                clearInterval(interval_1);
                                                return [2 /*return*/];
                                            }
                                            if (attempts_1 >= 30) {
                                                clearInterval(interval_1);
                                            }
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, 1000);
                        }
                        instance.clearAlternativesAndShowExamples();
                        nux.showIfNeeded();
                        languageSwitcherWindow = instance.languageSwitcherWindow = language_switcher_1["default"].create(active, bridge, mainWindow, settings);
                        textInputWindow = instance.textInputWindow = text_input_1["default"].create(bridge, mainWindow, settings, system);
                        settingsWindow = instance.settingsWindow = settings_2["default"].create(instance, bridge, local, mainWindow, microphone, miniModeWindow, settings);
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    App.prototype.clearAlternativesAndShowExamples = function () {
        if (!this.bridge || !this.mainWindow || !this.settings) {
            return;
        }
        var alternatives = examples.random(5).map(function (e) { return ({
            description: e,
            example: true
        }); });
        // don't show suggestions when in NUX, since it's confusing to have the app telling you to say
        // different things at once, or when in mini/minimized mode, where they get in the way
        if (!this.settings.getToken() ||
            !this.settings.getNuxCompleted() ||
            !this.mainWindow.shown() ||
            this.settings.getMiniMode()) {
            alternatives = [];
        }
        this.bridge.setState({
            alternatives: alternatives,
            highlighted: []
        }, [this.mainWindow, this.miniModeWindow]);
    };
    App.prototype.pushToTalkPressed = function () {
        this.chunkManager.toggle();
    };
    App.prototype.quit = function () {
        var _a, _b, _c, _d, _f;
        (_a = this.local) === null || _a === void 0 ? void 0 : _a.stop();
        (_b = this.custom) === null || _b === void 0 ? void 0 : _b.stop();
        (_c = this.microphone) === null || _c === void 0 ? void 0 : _c.stop();
        (_d = this.busPluginServer) === null || _d === void 0 ? void 0 : _d.stop();
        (_f = this.hpoTuner) === null || _f === void 0 ? void 0 : _f.stop();
    };
    App.prototype.registerPushToTalk = function () {
        var _this = this;
        electron_1.globalShortcut.unregisterAll();
        if (this.settings.getPushToTalk()) {
            try {
                electron_1.globalShortcut.register(this.settings.getPushToTalk(), function () {
                    _this.pushToTalkPressed();
                });
            }
            catch (e) { }
        }
        if (this.settings.getTextInputKeybinding()) {
            try {
                electron_1.globalShortcut.register(this.settings.getTextInputKeybinding(), function () { return __awaiter(_this, void 0, void 0, function () {
                    var textInputWindow;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!this.textInputWindow) {
                                    return [2 /*return*/];
                                }
                                return [4 /*yield*/, this.textInputWindow];
                            case 1:
                                textInputWindow = _a.sent();
                                if (textInputWindow.shown()) {
                                    textInputWindow.hide();
                                }
                                else {
                                    this.stream.connect(this.chunkManager, this.custom, this.executor);
                                    textInputWindow.show();
                                }
                                return [2 /*return*/];
                        }
                    });
                }); });
            }
            catch (e) { }
        }
    };
    App.prototype.sendAllSettings = function (local, microphone, miniModeWindow, settings, windows) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = this.bridge).setState;
                        _c = {
                            animations: settings.getAnimations(),
                            chunkSilenceThreshold: settings.getChunkSilenceThreshold(),
                            chunkSpeechThreshold: settings.getChunkSpeechThreshold(),
                            clipboardInsert: settings.getClipboardInsert(),
                            darkMode: settings.getDarkMode(),
                            disableSuggestions: settings.getDisableSuggestions(),
                            editorAutocomplete: settings.getEditorAutocomplete(),
                            endpoint: settings.getStreamingEndpoint(),
                            endpoints: settings.getStreamingEndpoints(),
                            executeSilenceThreshold: settings.getExecuteSilenceThreshold(),
                            logAudio: settings.getLogAudio(),
                            logSource: settings.getLogSource(),
                            microphones: microphone.microphones(),
                            minimizedPosition: settings.getMinimizedPosition(),
                            miniMode: settings.getMiniMode(),
                            miniModeBottomUp: miniModeWindow.shouldPlaceAboveMain(),
                            miniModeFewerAlternativesCount: settings.getMiniModeFewerAlternativesCount(),
                            miniModeHideTimeout: settings.getMiniModeHideTimeout(),
                            miniModeReversed: settings.getMiniModeReversed(),
                            nuxCompleted: settings.getNuxCompleted(),
                            nuxTutorial: settings.getNuxTutorialName(),
                            plugins: settings.getPlugins(),
                            pushToTalk: settings.getPushToTalk(),
                            requiresNewerMac: local.requiresNewerMac()
                        };
                        return [4 /*yield*/, local.requiresWsl()];
                    case 1:
                        _b.apply(_a, [(_c.requiresWsl = _d.sent(),
                                _c.showRevisionBox = settings.getShowRevisionBox(),
                                _c.stylers = settings.getStylers(),
                                _c.textInputKeybinding = settings.getTextInputKeybinding(),
                                _c.useMiniModeFewerAlternatives = settings.getUseMiniModeFewerAlternatives(),
                                _c.useMiniModeHideTimeout = settings.getUseMiniModeHideTimeout(),
                                _c.useVerboseLogging = settings.getUseVerboseLogging(),
                                _c), windows ? windows : [this.mainWindow, this.miniModeWindow, this.settingsWindow]]);
                        return [2 /*return*/];
                }
            });
        });
    };
    App.prototype.show = function () {
        this.mainWindow.show();
    };
    App.prototype.toggleMiniMode = function (enabled) {
        var _a, _b, _c, _d, _f, _g;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_h) {
                (_a = this.settings) === null || _a === void 0 ? void 0 : _a.setMiniMode(enabled);
                (_b = this.mainWindow) === null || _b === void 0 ? void 0 : _b.resizeToCurrentMode(true);
                this.clearAlternativesAndShowExamples();
                (_c = this.bridge) === null || _c === void 0 ? void 0 : _c.setState({
                    miniMode: enabled
                }, [this.mainWindow, this.miniModeWindow, this.settingsWindow]);
                if (enabled) {
                    (_d = this.miniModeWindow) === null || _d === void 0 ? void 0 : _d.show();
                }
                else {
                    (_f = this.miniModeWindow) === null || _f === void 0 ? void 0 : _f.hide();
                }
                (_g = this.miniModeWindow) === null || _g === void 0 ? void 0 : _g.snapToMain();
                return [2 /*return*/];
            });
        });
    };
    App.prototype.updateDarkModeForAllWindows = function () {
        return __awaiter(this, void 0, void 0, function () {
            var darkMode;
            return __generator(this, function (_a) {
                if (this.settings) {
                    darkMode = this.settings.getDarkMode();
                    if (electron_1.nativeTheme.themeSource != darkMode) {
                        electron_1.nativeTheme.themeSource = darkMode;
                    }
                    if (this.bridge) {
                        this.bridge.setState({
                            darkMode: darkMode,
                            darkTheme: darkMode == "dark" || (darkMode == "system" && electron_1.nativeTheme.shouldUseDarkColors)
                        }, [
                            this.mainWindow,
                            this.miniModeWindow,
                            this.languageSwitcherWindow,
                            this.revisionBoxWindow,
                            this.settingsWindow,
                            this.textInputWindow,
                        ]);
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    return App;
}());
exports["default"] = App;
