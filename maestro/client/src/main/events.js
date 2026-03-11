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
exports.__esModule = true;
var electron_1 = require("electron");
var electron_updater_1 = require("electron-updater");
var uuid_1 = require("uuid");
var path = __importStar(require("path"));
var RendererProcessEventHandlers = /** @class */ (function () {
    function RendererProcessEventHandlers(active, app, api, bridge, chunkManager, custom, revisionBoxWindow, local, mainWindow, microphone, miniModeWindow, nux, pluginManager, settings, stream, languageSwitcherWindow, settingsWindow, textInputWindow) {
        var _this = this;
        this.active = active;
        this.app = app;
        this.api = api;
        this.bridge = bridge;
        this.chunkManager = chunkManager;
        this.custom = custom;
        this.revisionBoxWindow = revisionBoxWindow;
        this.local = local;
        this.mainWindow = mainWindow;
        this.microphone = microphone;
        this.miniModeWindow = miniModeWindow;
        this.nux = nux;
        this.pluginManager = pluginManager;
        this.settings = settings;
        this.stream = stream;
        this.languageSwitcherWindow = languageSwitcherWindow;
        this.settingsWindow = settingsWindow;
        this.textInputWindow = textInputWindow;
        electron_1.ipcMain.on("accessibilityPermission", function () {
            _this.bridge.setState({
                accessibilityPermission: electron_1.systemPreferences.isTrustedAccessibilityClient
                    ? electron_1.systemPreferences.isTrustedAccessibilityClient(true)
                    : true
            }, [_this.mainWindow, _this.miniModeWindow]);
        });
        electron_1.ipcMain.on("closeLanguages", function (_event, _data) { return __awaiter(_this, void 0, void 0, function () {
            var languageSwitcherWindow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        languageSwitcherWindow = this.languageSwitcherWindow();
                        if (!languageSwitcherWindow) return [3 /*break*/, 2];
                        return [4 /*yield*/, languageSwitcherWindow];
                    case 1:
                        (_a.sent()).hide();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        electron_1.ipcMain.on("forward", function (_event, data) {
            _this.pluginManager.sendResponseToApp(_this.active.app, data);
        });
        electron_1.ipcMain.on("generateToken", function (_event, data) {
            _this.settings.setToken((0, uuid_1.v4)());
        });
        electron_1.ipcMain.on("hideTextInput", function () { return __awaiter(_this, void 0, void 0, function () {
            var textInputWindow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        textInputWindow = this.textInputWindow();
                        if (!textInputWindow) return [3 /*break*/, 2];
                        return [4 /*yield*/, textInputWindow];
                    case 1:
                        (_a.sent()).hide();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        electron_1.ipcMain.on("loadTutorial", function (_event, data) {
            _this.nux.load(data.name);
            _this.resetNux();
            if (data.resize) {
                _this.mainWindow.resizeToCurrentMode(true);
            }
            _this.bridge.setState({ loggedIn: true }, [_this.mainWindow, _this.miniModeWindow]);
        });
        electron_1.ipcMain.on("microphonePermission", function () {
            if (electron_1.systemPreferences.askForMediaAccess !== undefined) {
                electron_1.systemPreferences.askForMediaAccess("microphone").then(function (data) {
                    _this.bridge.setState({
                        microphonePermission: data
                    }, [_this.mainWindow]);
                });
            }
        });
        electron_1.ipcMain.on("nuxBack", function () {
            _this.nux.back();
        });
        electron_1.ipcMain.on("nuxNext", function () {
            _this.nux.next();
        });
        electron_1.ipcMain.on("openCustomCommands", function () {
            electron_1.shell.openPath(path.join(_this.settings.path(), "scripts", "custom.js"));
        });
        electron_1.ipcMain.on("openLogDirectory", function () {
            electron_1.shell.openPath(_this.settings.path());
        });
        electron_1.ipcMain.on("openURL", function (_event, data) {
            electron_1.shell.openExternal(data);
        });
        electron_1.ipcMain.on("reloadCustomCommands", function () {
            _this.custom.reload();
        });
        electron_1.ipcMain.on("restart", function () {
            electron_updater_1.autoUpdater.quitAndInstall();
        });
        electron_1.ipcMain.on("revisionBoxState", function (_event, data) {
            _this.revisionBoxWindow.onGetEditorState(data);
        });
        electron_1.ipcMain.on("sendTextRequest", function (_event, data) {
            _this.stream.sendTextRequest(data.text, data.includeAlternatives);
        });
        electron_1.ipcMain.on("setLanguage", function (_event, language) {
            _this.active.languageSwitcherLanguage = language;
            _this.active.update(true);
        });
        electron_1.ipcMain.on("setMiniModeWindowHeight", function (_event, data) {
            if (_this.settings.getMiniMode()) {
                _this.miniModeWindow.setHeight(data.height || 0);
            }
        });
        electron_1.ipcMain.on("setNuxCompleted", function (_event, completed) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.settings.getNuxCompleted() == completed) {
                    return [2 /*return*/];
                }
                if (completed) {
                    this.nux.complete();
                }
                else {
                    this.resetNux();
                }
                return [2 /*return*/];
            });
        }); });
        electron_1.ipcMain.on("setSettings", function (_event, data) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (data.animations !== undefined) {
                    this.settings.setAnimations(data.animations);
                    this.bridge.setState({
                        animations: data.animations
                    }, [this.settingsWindow()]);
                }
                if (data.chunkSilenceThreshold !== undefined) {
                    this.settings.setChunkSilenceThreshold(data.chunkSilenceThreshold);
                    this.bridge.setState({
                        chunkSilenceThreshold: data.chunkSilenceThreshold
                    }, [this.settingsWindow()]);
                }
                if (data.chunkSpeechThreshold !== undefined) {
                    this.settings.setChunkSpeechThreshold(data.chunkSpeechThreshold);
                    this.bridge.setState({
                        chunkSpeechThreshold: data.chunkSpeechThreshold
                    }, [this.settingsWindow()]);
                }
                if (data.clipboardInsert !== undefined) {
                    this.settings.setClipboardInsert(data.clipboardInsert);
                    this.bridge.setState({
                        clipboardInsert: data.clipboardInsert
                    }, [this.settingsWindow()]);
                }
                if (data.continueRunningInTray !== undefined) {
                    this.settings.setContinueRunningInTray(data.continueRunningInTray);
                    this.bridge.setState({
                        continueRunningInTray: data.continueRunningInTray
                    }, [this.mainWindow, this.settingsWindow()]);
                }
                if (data.darkMode !== undefined) {
                    this.settings.setDarkMode(data.darkMode);
                    this.app.updateDarkModeForAllWindows();
                }
                if (data.disableSuggestions !== undefined) {
                    this.settings.setDisableSuggestions(data.disableSuggestions);
                    this.bridge.setState({
                        disableSuggestions: data.disableSuggestions
                    }, [this.settingsWindow()]);
                }
                if (data.editorAutocomplete !== undefined) {
                    this.settings.setEditorAutocomplete(data.editorAutocomplete);
                    this.bridge.setState({
                        editorAutocomplete: data.editorAutocomplete
                    }, [this.settingsWindow()]);
                }
                if (data.endpoint !== undefined) {
                    this.chunkManager.toggle(false);
                    this.settings.setStreamingEndpoint(data.endpoint);
                    this.bridge.setState({
                        endpoint: this.settings.getStreamingEndpoint()
                    }, [this.mainWindow, this.settingsWindow()]);
                    this.api.ping(this.settings.getStreamingEndpoint());
                }
                if (data.executeSilenceThreshold !== undefined) {
                    this.settings.setExecuteSilenceThreshold(data.executeSilenceThreshold);
                    this.bridge.setState({
                        executeSilenceThreshold: data.executeSilenceThreshold
                    }, [this.settingsWindow()]);
                }
                if (data.logAudio !== undefined) {
                    this.settings.setLogAudio(data.logAudio);
                    this.bridge.setState({
                        logAudio: data.logAudio
                    }, [this.mainWindow, this.settingsWindow()]);
                }
                if (data.logSource !== undefined) {
                    this.settings.setLogSource(data.logSource);
                    this.bridge.setState({
                        logSource: data.logSource
                    }, [this.mainWindow, this.settingsWindow()]);
                }
                if (data.microphone !== undefined && data.microphone.id != this.settings.getMicrophone().id) {
                    this.microphone.changeMicrophone({
                        id: data.microphone.id,
                        name: data.microphone.name
                    });
                    this.bridge.setState({
                        microphones: this.microphone.microphones()
                    }, [this.settingsWindow()]);
                }
                if (data.minimizedPosition !== undefined) {
                    this.settings.setMinimizedPosition(data.minimizedPosition);
                    this.bridge.setState({
                        minimizedPosition: data.minimizedPosition
                    }, [this.mainWindow, this.miniModeWindow, this.settingsWindow()]);
                }
                if (data.miniMode !== undefined) {
                    this.app.clearAlternativesAndShowExamples();
                    this.settings.setMiniMode(data.miniMode);
                    this.bridge.setState({
                        miniMode: data.miniMode
                    }, [this.mainWindow, this.miniModeWindow, this.settingsWindow()]);
                    setImmediate(function () {
                        _this.app.toggleMiniMode(data.miniMode);
                    });
                }
                if (data.useMiniModeFewerAlternatives !== undefined) {
                    this.settings.setUseMiniModeFewerAlternatives(data.useMiniModeFewerAlternatives);
                    this.bridge.setState({
                        useMiniModeFewerAlternatives: data.useMiniModeFewerAlternatives
                    }, [this.miniModeWindow, this.settingsWindow()]);
                }
                if (data.miniModeFewerAlternativesCount !== undefined) {
                    this.settings.setMiniModeFewerAlternativesCount(data.miniModeFewerAlternativesCount);
                    this.bridge.setState({
                        miniModeFewerAlternativesCount: data.miniModeFewerAlternativesCount
                    }, [this.miniModeWindow, this.settingsWindow()]);
                }
                if (data.useMiniModeHideTimeout !== undefined) {
                    this.settings.setUseMiniModeHideTimeout(data.useMiniModeHideTimeout);
                    this.bridge.setState({
                        useMiniModeHideTimeout: data.useMiniModeHideTimeout
                    }, [this.miniModeWindow, this.settingsWindow()]);
                }
                if (data.miniModeHideTimeout !== undefined) {
                    this.settings.setMiniModeHideTimeout(data.miniModeHideTimeout);
                    this.bridge.setState({
                        miniModeHideTimeout: data.miniModeHideTimeout
                    }, [this.miniModeWindow, this.settingsWindow()]);
                }
                if (data.miniModeReversed !== undefined) {
                    this.settings.setMiniModeReversed(data.miniModeReversed);
                    this.bridge.setState({
                        miniModeReversed: data.miniModeReversed
                    }, [this.miniModeWindow, this.settingsWindow()]);
                }
                if (data.pushToTalk !== undefined) {
                    this.settings.setPushToTalk(data.pushToTalk);
                    this.bridge.setState({
                        pushToTalk: data.pushToTalk
                    }, [this.settingsWindow()]);
                }
                if (data.showRevisionBox !== undefined) {
                    this.settings.setShowRevisionBox(data.showRevisionBox);
                    this.bridge.setState({
                        showRevisionBox: data.showRevisionBox
                    }, [this.settingsWindow()]);
                }
                if (data.stylers !== undefined) {
                    this.settings.setStylers(data.stylers);
                    this.bridge.setState({
                        stylers: data.stylers
                    }, [this.settingsWindow()]);
                }
                if (data.textInputKeybinding !== undefined) {
                    this.settings.setTextInputKeybinding(data.textInputKeybinding);
                    this.bridge.setState({
                        textInputKeybinding: data.textInputKeybinding
                    }, [this.settingsWindow()]);
                }
                if (data.useVerboseLogging !== undefined) {
                    this.settings.setUseVerboseLogging(data.useVerboseLogging);
                    this.bridge.setState({
                        useVerboseLogging: data.useVerboseLogging
                    }, [this.settingsWindow()]);
                }
                return [2 /*return*/];
            });
        }); });
        electron_1.ipcMain.on("setSettingsPage", function (_event, settingsPage) {
            _this.bridge.setState({
                settingsPage: settingsPage
            }, [_this.settingsWindow()]);
        });
        electron_1.ipcMain.on("setWindowState", function (_event, data) { return __awaiter(_this, void 0, void 0, function () {
            var settingsWindow, languageSwitcherWindow, window;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        settingsWindow = this.settingsWindow();
                        languageSwitcherWindow = this.languageSwitcherWindow();
                        window = this.mainWindow;
                        if (!data.url.includes("minimode")) return [3 /*break*/, 1];
                        window = this.miniModeWindow;
                        return [3 /*break*/, 6];
                    case 1:
                        if (!(data.url.includes("settings") && settingsWindow)) return [3 /*break*/, 3];
                        return [4 /*yield*/, settingsWindow];
                    case 2:
                        window = _e.sent();
                        return [3 /*break*/, 6];
                    case 3:
                        if (!data.url.includes("revision")) return [3 /*break*/, 4];
                        window = this.revisionBoxWindow;
                        return [3 /*break*/, 6];
                    case 4:
                        if (!(data.url.includes("languages") && languageSwitcherWindow)) return [3 /*break*/, 6];
                        return [4 /*yield*/, languageSwitcherWindow];
                    case 5:
                        window = _e.sent();
                        _e.label = 6;
                    case 6:
                        if (data.state == "minimize") {
                            (_a = window.window) === null || _a === void 0 ? void 0 : _a.minimize();
                        }
                        else if (data.state == "maximize") {
                            (_b = window.window) === null || _b === void 0 ? void 0 : _b.maximize();
                        }
                        else if (data.state == "unmaximize") {
                            (_c = window.window) === null || _c === void 0 ? void 0 : _c.unmaximize();
                        }
                        else if (data.state == "close") {
                            (_d = window.window) === null || _d === void 0 ? void 0 : _d.close();
                        }
                        if (window == this.mainWindow) {
                            this.miniModeWindow.snapToMain();
                            this.active.showSuggestionIfNeeded();
                        }
                        return [2 /*return*/];
                }
            });
        }); });
        electron_1.ipcMain.on("showLanguageSwitcher", function () { return __awaiter(_this, void 0, void 0, function () {
            var languageSwitcherWindow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        languageSwitcherWindow = this.languageSwitcherWindow();
                        if (!languageSwitcherWindow) return [3 /*break*/, 2];
                        return [4 /*yield*/, languageSwitcherWindow];
                    case 1:
                        (_a.sent()).show();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        electron_1.ipcMain.on("showNuxHint", function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.bridge.setState({
                    nuxHintShown: true
                }, [this.mainWindow, this.miniModeWindow]);
                return [2 /*return*/];
            });
        }); });
        electron_1.ipcMain.on("showSettingsWindow", function () { return __awaiter(_this, void 0, void 0, function () {
            var settingsWindow;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        settingsWindow = this.settingsWindow();
                        if (!settingsWindow) return [3 /*break*/, 2];
                        return [4 /*yield*/, settingsWindow];
                    case 1:
                        (_a.sent()).show();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); });
        electron_1.ipcMain.on("startLocal", function () {
            _this.local.start();
        });
        electron_1.ipcMain.on("stopLocal", function () {
            _this.local.stop();
            _this.bridge.setState({
                localRunning: false
            }, [_this.mainWindow]);
        });
        electron_1.ipcMain.on("toggleChunkManager", function (_event, listening) {
            _this.chunkManager.toggle(listening);
        });
        electron_1.ipcMain.on("toggleDictateMode", function (_event, _data) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.active.dictateMode = !this.active.dictateMode;
                this.active.update(true);
                return [2 /*return*/];
            });
        }); });
    }
    RendererProcessEventHandlers.prototype.resetNux = function () {
        this.settings.setNuxStep(0);
        this.settings.setNuxCompleted(false);
        this.app.clearAlternativesAndShowExamples();
        this.bridge.setState({
            nuxCompleted: false
        }, [this.mainWindow, this.miniModeWindow]);
    };
    return RendererProcessEventHandlers;
}());
exports["default"] = RendererProcessEventHandlers;
