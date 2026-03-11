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
var languages_1 = require("../shared/languages");
var plugins_1 = require("../shared/plugins");
var core_1 = require("../gen/core");
var Active = /** @class */ (function () {
    function Active(bridge, custom, revisionBoxWindow, insertHistory, mainWindow, metadata, miniModeWindow, pluginManager, settings, system) {
        var _this = this;
        this.bridge = bridge;
        this.custom = custom;
        this.revisionBoxWindow = revisionBoxWindow;
        this.insertHistory = insertHistory;
        this.mainWindow = mainWindow;
        this.metadata = metadata;
        this.miniModeWindow = miniModeWindow;
        this.pluginManager = pluginManager;
        this.settings = settings;
        this.system = system;
        this.suggestion = "";
        this.selfApps = new Set(["serenade", "arqon", "arqonmaestro"]);
        this.app = "";
        this.customCommands = [];
        this.customHints = [];
        this.customWords = [];
        this.dictateMode = false;
        this.filename = "";
        this.language = core_1.core.Language.LANGUAGE_DEFAULT;
        this.languageSwitcherLanguage = core_1.core.Language.LANGUAGE_NONE;
        this.sourceAvailable = false;
        this.refocused = false;
        setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.firstPartyBrowserPlugins().includes(this.app) && this.pluginInstalled() && !this.pluginConnected())) return [3 /*break*/, 4];
                        if (!!this.refocused) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.system.focus("arqonmaestro")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.system.focus(this.app)];
                    case 2:
                        _a.sent();
                        this.refocused = true;
                        return [2 /*return*/];
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        this.refocused = false;
                        _a.label = 5;
                    case 5:
                        this.update();
                        return [2 /*return*/];
                }
            });
        }); }, 1000);
    }
    Active.prototype.customCommandMatches = function (command, app, filename, language, url) {
        var applications = command.applications || [];
        var extensions = command.extensions || [];
        var urls = command.urls || [];
        var commandLanguages = command.languages || [];
        return ((applications.some(function (e) { return app.toLowerCase().includes(e.toLowerCase()); }) ||
            applications.length == 0) &&
            (extensions.some(function (e) { return filename.toLowerCase().endsWith(e.toLowerCase()); }) ||
                extensions.length == 0) &&
            (urls.some(function (e) { return url.toLowerCase().includes(e.toLowerCase()); }) || urls.length == 0) &&
            (commandLanguages.some(function (e) {
                return Object.values(languages_1.languages).some(function (language) {
                    return language.name.toLowerCase() == e.toLowerCase() ||
                        language.extensions.some(function (extension) { return extension.toLowerCase() == e.toLowerCase(); });
                });
            }) ||
                commandLanguages.length == 0));
    };
    Active.prototype.firstPartyPlugins = function () {
        return this.firstPartyEditorPlugins()
            .concat(this.firstPartyBrowserPlugins())
            .concat(this.firstPartyTerminalPlugins());
    };
    Active.prototype.firstPartyBrowserPlugins = function () {
        return ["chrome", "edge"];
    };
    Active.prototype.firstPartyEditorPlugins = function () {
        return ["atom", "jetbrains", "vscode"];
    };
    Active.prototype.firstPartyPluginAvailable = function (app) {
        app = app || this.app;
        // temporarily remove iterm because the revision box is sufficient
        return this.firstPartyPlugins()
            .filter(function (e) { return e != "iterm"; })
            .includes(app);
    };
    Active.prototype.firstPartyTerminalPlugins = function () {
        return ["hyper", "iterm"];
    };
    Active.prototype.getEditorState = function (includeClipboard, limited) {
        if (includeClipboard === void 0) { includeClipboard = false; }
        if (limited === void 0) { limited = false; }
        return __awaiter(this, void 0, void 0, function () {
            var reportedState, _a, response, state, latestInsert, customWords, customWordsFromScripts, _i, _b, word, styler, _c, _d, k, language, url, result;
            var _e;
            var _this = this;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        reportedState = {
                            source: "",
                            cursor: 0,
                            canGetState: false,
                            canSetState: false
                        };
                        if (!this.revisionBoxWindow.shown()) return [3 /*break*/, 2];
                        _a = [{}];
                        return [4 /*yield*/, this.revisionBoxWindow.getEditorState()];
                    case 1:
                        reportedState = __assign.apply(void 0, [__assign.apply(void 0, _a.concat([(_f.sent())])), { canGetState: true, canSetState: true }]);
                        return [3 /*break*/, 6];
                    case 2:
                        if (!this.pluginConnected()) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.pluginManager.sendCommandToApp(this.app, {
                                type: core_1.core.CommandType.COMMAND_TYPE_GET_EDITOR_STATE,
                                limited: limited
                            })];
                    case 3:
                        response = _f.sent();
                        if (response && response.data && !response.data.error) {
                            reportedState = __assign({}, response.data);
                        }
                        // remove once we update the chrome extension to v2
                        if (this.isFirstPartyBrowser() && response && response.data) {
                            if (reportedState.filename === "") {
                                reportedState.canGetState = true;
                                reportedState.canSetState = false;
                            }
                        }
                        // older plugins may not explicitly set canGetState or canSetState, but do set available
                        if (reportedState.canGetState === undefined || reportedState.canSetState === undefined) {
                            if (reportedState.available !== undefined) {
                                // if the plugin sets the available flag, use it
                                reportedState.canGetState = reportedState.available;
                                reportedState.canSetState = reportedState.available;
                            }
                            else {
                                // otherwise assume we can get/set the state
                                reportedState.canGetState = reportedState.canGetState || true;
                                reportedState.canSetState = reportedState.canSetState || true;
                            }
                        }
                        return [3 /*break*/, 6];
                    case 4:
                        if (!this.useAccessibilityApi()) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.system.getEditorStateWithAccessibilityApi()];
                    case 5:
                        state = _f.sent();
                        reportedState = {
                            source: state.source,
                            cursor: state.cursor,
                            canGetState: !state.error,
                            canSetState: false
                        };
                        _f.label = 6;
                    case 6:
                        // support legacy plugin versions that don't set this flag
                        if (this.system.isTerminal(this.app)) {
                            reportedState.canSetState = false;
                        }
                        if (!reportedState.canGetState) {
                            latestInsert = this.insertHistory.latest(this.app);
                            reportedState.source = latestInsert;
                            reportedState.cursor = latestInsert.length;
                        }
                        return [4 /*yield*/, this.settings.getCustomWords()];
                    case 7:
                        customWords = _f.sent();
                        customWordsFromScripts = this.customWords.filter(function (e) {
                            return _this.customCommandMatches(e, _this.app, _this.filename, _this.language, url);
                        });
                        for (_i = 0, _b = Object.values(customWordsFromScripts); _i < _b.length; _i++) {
                            word = _b[_i];
                            if (word.before && word.after) {
                                customWords[word.before] = word.after;
                            }
                        }
                        styler = this.settings.getStylers();
                        for (_c = 0, _d = Object.keys(languages_1.languages); _c < _d.length; _c++) {
                            k = _d[_c];
                            language = k;
                            if (!styler[language]) {
                                styler[language] = languages_1.languages[language].styler;
                            }
                        }
                        url = reportedState.url || "";
                        _e = {
                            token: this.settings.getToken(),
                            application: this.revisionBoxWindow.shown() ? "revision-box" : this.app,
                            pluginInstalled: this.pluginInstalled() || this.revisionBoxWindow.shown(),
                            clientIdentifier: this.metadata.identifier(this.app, this.language),
                            nux: !this.settings.getNuxCompleted(),
                            autocomplete: this.settings.getEditorAutocomplete(),
                            canGetState: reportedState.canGetState,
                            canSetState: reportedState.canSetState
                        };
                        return [4 /*yield*/, this.settings.getCustomHints()];
                    case 8:
                        result = (_e.customHints = (_f.sent()).concat(this.customHints
                            .filter(function (e) {
                            return e.hint && _this.customCommandMatches(e, _this.app, _this.filename, _this.language, url);
                        })
                            .map(function (e) { return e.hint; })),
                            _e.styler = this.settings.getStylers(),
                            _e.dictateMode = this.dictateMode,
                            _e.source = Buffer.from(reportedState.source || ""),
                            _e.cursor = reportedState.cursor || 0,
                            _e.selectionRange = reportedState.selectionRange || { start: 0, stop: 0 },
                            _e.filename = reportedState.filename || "",
                            _e.files = reportedState.files || [],
                            _e.tabs = reportedState.tabs || [""],
                            _e.language = this.language,
                            _e.logAudio = this.settings.getLogAudio(),
                            _e.logSource = this.settings.getLogSource(),
                            _e.customWords = customWords,
                            _e.url = url,
                            _e);
                        // if NUX isn't completed, send the filename to make sure NUX works
                        if (!this.settings.getNuxCompleted()) {
                            this.bridge.setState({
                                filename: reportedState.filename || ""
                            }, [this.mainWindow, this.miniModeWindow]);
                        }
                        if (includeClipboard) {
                            result.clipboard = electron_1.clipboard.readText();
                        }
                        result.customCommands = this.customCommands
                            .filter(function (e) { return _this.customCommandMatches(e, _this.app, _this.filename, _this.language, url); })
                            .map(function (e) {
                            var chainable = core_1.core.CustomCommandChainable.CUSTOM_COMMAND_CHAINABLE_NONE;
                            if (e.chainable == "any" || e.chainable === true) {
                                chainable = core_1.core.CustomCommandChainable.CUSTOM_COMMAND_CHAINABLE_ANY;
                            }
                            else if (e.chainable == "firstOnly") {
                                chainable = core_1.core.CustomCommandChainable.CUSTOM_COMMAND_CHAINABLE_FIRST_ONLY;
                            }
                            else if (e.chainable == "lastOnly") {
                                chainable = core_1.core.CustomCommandChainable.CUSTOM_COMMAND_CHAINABLE_LAST_ONLY;
                            }
                            return {
                                id: e.id,
                                templated: e.templated,
                                applications: e.applications || [],
                                languages: e.languages || [],
                                extensions: e.extensions || [],
                                generated: e.generated || "",
                                snippetType: e.snippetType || "",
                                options: e.options || [],
                                urls: e.urls || [],
                                transformExamples: e.transformExamples || [],
                                transformDescription: e.transformDescription || "",
                                chainable: chainable
                            };
                        });
                        return [2 /*return*/, result];
                }
            });
        });
    };
    Active.prototype.isFirstPartyBrowser = function (app) {
        app = app || this.app;
        return this.pluginConnected() && this.firstPartyBrowserPlugins().includes(app);
    };
    Active.prototype.isFirstPartyEditor = function (app) {
        app = app || this.app;
        return this.pluginConnected() && this.firstPartyEditorPlugins().includes(app);
    };
    Active.prototype.pluginConnected = function () {
        return this.pluginManager.fromApp(this.app) != null;
    };
    Active.prototype.pluginInstalled = function () {
        return this.settings.getPluginInstalled(this.app);
    };
    Active.prototype.showSuggestionIfNeeded = function () {
        if (!this.settings.getToken() ||
            !this.settings.getNuxCompleted() ||
            this.settings.getDisableSuggestions()) {
            return;
        }
        if (!this.mainWindow.shown()) {
            if (this.suggestion) {
                this.suggestion = "";
                this.bridge.setState({
                    suggestion: ""
                }, [this.mainWindow, this.miniModeWindow]);
            }
            return;
        }
        var suggestion = "";
        if (this.firstPartyPluginAvailable()) {
            if (this.pluginInstalled() && !this.pluginConnected()) {
                suggestion = "<p>".concat(plugins_1.plugins[this.app].name, " plugin disconnected. Try restarting ").concat(plugins_1.plugins[this.app].name, " or reinstalling the plugin.<div style=\"margin-top: 0.8rem\"><a class=\"primary-button\" href=\"").concat(plugins_1.plugins[this.app].url, "\" target=\"_blank\" style=\"font-size: 0.82rem\">Install</a></div>");
            }
            else if (!this.pluginInstalled()) {
                suggestion = "<p>A plugin is available for ".concat(plugins_1.plugins[this.app].name, ".</p><div style=\"margin-top: 0.8rem\"><a class=\"primary-button\" href=\"").concat(plugins_1.plugins[this.app].url, "\" target=\"_blank\" style=\"font-size: 0.82rem\">Install</a></div>");
            }
        }
        // don't re-send the same suggestion we're already showing
        if (suggestion == this.suggestion) {
            return;
        }
        this.suggestion = suggestion;
        this.bridge.setState({
            suggestion: suggestion
        }, [this.mainWindow, this.miniModeWindow]);
    };
    Active.prototype.update = function (force) {
        if (force === void 0) { force = false; }
        return __awaiter(this, void 0, void 0, function () {
            var app, plugin, editorState, _a, filename, sourceAvailable, language, icon, send;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.system.determineActiveApplication()];
                    case 1:
                        app = _b.sent();
                        // some UI controls in ArqonMaestro will take the focus off the active app, so we want to keep
                        // sending commands to the last app to be active that isn't ArqonMaestro
                        if (this.selfApps.has(app)) {
                            app = this.app;
                        }
                        plugin = this.pluginManager.fromApp(app);
                        if (plugin) {
                            app = plugin.app;
                        }
                        if (!app) {
                            return [2 /*return*/];
                        }
                        if (!this.selfApps.has(app)) return [3 /*break*/, 2];
                        _a = null;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.getEditorState(false, true)];
                    case 3:
                        _a = _b.sent();
                        _b.label = 4;
                    case 4:
                        editorState = _a;
                        filename = "";
                        sourceAvailable = false;
                        if (editorState) {
                            filename = editorState.filename || "";
                            sourceAvailable = editorState.canSetState;
                        }
                        // make sure terminal uses the Bash model
                        if (this.system.isTerminal(app)) {
                            filename = "terminal.sh";
                        }
                        language = this.languageSwitcherLanguage != core_1.core.Language.LANGUAGE_NONE
                            ? this.languageSwitcherLanguage
                            : (0, languages_1.filenameToLanguage)(filename);
                        icon = plugin === null || plugin === void 0 ? void 0 : plugin.icon;
                        send = force ||
                            app != this.app ||
                            icon != this.icon ||
                            filename != this.filename ||
                            language != this.language ||
                            sourceAvailable != this.sourceAvailable;
                        this.app = app;
                        this.icon = icon;
                        this.filename = filename;
                        this.language = language;
                        this.sourceAvailable = sourceAvailable;
                        if (send) {
                            this.showSuggestionIfNeeded();
                            this.bridge.setState({
                                app: this.app,
                                icon: this.icon,
                                dictateMode: this.dictateMode,
                                filename: this.filename,
                                firstPartyPluginAvailable: this.firstPartyPluginAvailable(),
                                language: this.language,
                                languageSwitcherLanguage: this.languageSwitcherLanguage,
                                pluginConnected: this.pluginConnected(),
                                pluginInstalled: this.pluginInstalled(),
                                sourceAvailable: this.sourceAvailable
                            }, [this.mainWindow]);
                            this.custom.send("contextChanged", {
                                application: app,
                                filename: filename,
                                language: languages_1.languages[language] ? languages_1.languages[language].name : ""
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Active.prototype.useAccessibilityApi = function () {
        var _this = this;
        return (!this.pluginConnected() &&
            this.settings.getUseAccessibilityApi().some(function (e) { return _this.app.includes(e); }));
    };
    return Active;
}());
exports["default"] = Active;
