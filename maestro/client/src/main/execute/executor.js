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
var os = __importStar(require("os"));
var core_1 = require("../../gen/core");
var alternatives_1 = require("../../shared/alternatives");
var Executor = /** @class */ (function () {
    function Executor(active, api, bridge, insertHistory, log, mainWindow, miniModeWindow, nativeCommands, nux, pluginManager, revisionBoxWindow, settings, stream, system, commandHandler) {
        this.active = active;
        this.api = api;
        this.bridge = bridge;
        this.insertHistory = insertHistory;
        this.log = log;
        this.mainWindow = mainWindow;
        this.miniModeWindow = miniModeWindow;
        this.nativeCommands = nativeCommands;
        this.nux = nux;
        this.pluginManager = pluginManager;
        this.revisionBoxWindow = revisionBoxWindow;
        this.settings = settings;
        this.stream = stream;
        this.system = system;
        this.commandHandler = commandHandler;
        this.chainFinishedPromise = Promise.resolve();
        this.lastEndpointId = "";
        this.resolveChainFinished = function () { };
        this.newChainFinishedPromise();
    }
    Executor.prototype.addToHistory = function (response) {
        if (!response.execute ||
            (response.execute.commands || []).some(function (command) {
                return command.type == core_1.core.CommandType.COMMAND_TYPE_USE ||
                    command.type == core_1.core.CommandType.COMMAND_TYPE_CANCEL;
            })) {
            return;
        }
        this.stream.sendCallbackRequest({
            type: core_1.core.CallbackType.CALLBACK_TYPE_ADD_TO_HISTORY,
            text: response.execute.transcript
        });
    };
    Executor.prototype.checkClickable = function (command, clickables) {
        return __awaiter(this, void 0, void 0, function () {
            var clickableResult;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.active.isFirstPartyBrowser() && this.active.pluginConnected())) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.pluginManager.sendCommandToApp(this.active.app, {
                                type: core_1.core.CommandType.COMMAND_TYPE_CLICKABLE,
                                path: command.path
                            })];
                    case 1:
                        clickableResult = _a.sent();
                        return [2 /*return*/, clickableResult && clickableResult.data.clickable];
                    case 2:
                        if (this.active.app == "system dialog") {
                            return [2 /*return*/, clickables.indexOf(command.path) > -1];
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, false];
                }
            });
        });
    };
    Executor.prototype.handleResponseFromPlugin = function (forwarded) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // ChunkManager calls this with await this.executor.execute(this.response); so we want to be sure that
                        // all the commands in a chain are executed before this returns. In the branch above, if there are
                        // remaining commands, send a text request to run the next one and await this.chainFinishedPromise.
                        // By the time we reach this branch, we will have executed all the remaining commands, so we want to resolve
                        // this.chainFinishedPromise by calling its resolve function, this.resolveChainFinished, and make a new one.
                        this.resolveChainFinished();
                        this.newChainFinishedPromise();
                        if (!(forwarded && forwarded.message)) return [3 /*break*/, 7];
                        if (!(forwarded.message == "callback")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.stream.sendEditorStateRequest()];
                    case 1:
                        _a.sent();
                        this.stream.sendCallbackRequest({
                            type: forwarded.data.type
                        });
                        return [3 /*break*/, 7];
                    case 2:
                        if (!(forwarded.message == "sendText")) return [3 /*break*/, 3];
                        this.stream.sendTextRequest(forwarded.data.text, true);
                        return [3 /*break*/, 7];
                    case 3:
                        if (!(forwarded.message == "open")) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.stream.sendEditorStateRequest()];
                    case 4:
                        _a.sent();
                        this.stream.sendCallbackRequest({
                            type: core_1.core.CallbackType.CALLBACK_TYPE_OPEN_FILE
                        });
                        return [3 /*break*/, 7];
                    case 5:
                        if (!(forwarded.message == "paste")) return [3 /*break*/, 7];
                        // remove once deprecated from the chrome extension
                        return [4 /*yield*/, this.system.pressKey("v", [os.platform() === "darwin" ? "command" : "control"])];
                    case 6:
                        // remove once deprecated from the chrome extension
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    Executor.prototype.hasExecute = function (response) {
        return !!(response.execute &&
            response.execute.commands &&
            response.execute.commands.length > 0);
    };
    Executor.prototype.invalidateBadApplicationCommands = function (response, getApps, shouldCheck) {
        return __awaiter(this, void 0, void 0, function () {
            var apps, seen, i, alternative, matches, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(response.alternatives &&
                            response.alternatives.length > 0 &&
                            response.alternatives.some(function (alternative) {
                                return (alternative.commands || []).some(function (command) { return shouldCheck(command); });
                            }))) return [3 /*break*/, 8];
                        return [4 /*yield*/, getApps()];
                    case 1:
                        apps = _b.sent();
                        seen = {};
                        i = 0;
                        _b.label = 2;
                    case 2:
                        if (!(i < response.alternatives.length)) return [3 /*break*/, 5];
                        alternative = response.alternatives[i];
                        if (!alternative.commands ||
                            alternative.commands.every(function (command) { return !shouldCheck(command); })) {
                            return [3 /*break*/, 4];
                        }
                        return [4 /*yield*/, this.system.applicationMatches(alternative.commands[0].text, apps)];
                    case 3:
                        matches = _b.sent();
                        if (matches.length == 0 || seen[matches[0]]) {
                            alternative.commands[0].type = core_1.core.CommandType.COMMAND_TYPE_INVALID;
                        }
                        else {
                            seen[matches[0]] = true;
                        }
                        _b.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5:
                        _a = response.execute &&
                            response.execute.commands &&
                            this.hasExecute(response);
                        if (!_a) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.system.applicationMatches(response.execute.commands[0].text, apps).length];
                    case 6:
                        _a = (_b.sent()) == 0;
                        _b.label = 7;
                    case 7:
                        if (_a) {
                            response.execute = null;
                        }
                        _b.label = 8;
                    case 8: return [2 /*return*/, response];
                }
            });
        });
    };
    Executor.prototype.invalidateBadClickCommands = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var clickables, i, command;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(response.alternatives &&
                            response.alternatives.length > 0 &&
                            response.alternatives
                                .filter(function (e) { return (0, alternatives_1.isValidAlternative)(e); })
                                .find(function (e) { return e.transcript.startsWith("click "); }))) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.system.clickable()];
                    case 1:
                        clickables = _a.sent();
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < response.alternatives.length)) return [3 /*break*/, 5];
                        if (!response.alternatives[i].transcript.startsWith("click ")) {
                            return [3 /*break*/, 4];
                        }
                        command = response.alternatives[i].commands[0];
                        return [4 /*yield*/, this.checkClickable(command, clickables)];
                    case 3:
                        if (!(_a.sent())) {
                            command.type = core_1.core.CommandType.COMMAND_TYPE_INVALID;
                        }
                        _a.label = 4;
                    case 4:
                        i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/, response];
                    case 6: return [2 /*return*/, response];
                }
            });
        });
    };
    Executor.prototype.invalidateBadUseCommands = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var isInvalid, i, _a;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        isInvalid = function (alternative) { return __awaiter(_this, void 0, void 0, function () {
                            var use, invalidPending, invalidChrome, clickableResult;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!alternative) {
                                            return [2 /*return*/, true];
                                        }
                                        use = (alternative.commands || []).filter(function (e) { return e.type == core_1.core.CommandType.COMMAND_TYPE_USE; });
                                        invalidPending = use.length > 0 &&
                                            (!this.pending || (this.pending && use[0].index > this.pending.alternatives.length));
                                        if (!(this.active.isFirstPartyBrowser() && this.active.pluginConnected())) return [3 /*break*/, 3];
                                        invalidChrome = false;
                                        if (!(use.length > 0)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this.pluginManager.sendCommandToApp(this.active.app, {
                                                type: core_1.core.CommandType.COMMAND_TYPE_CLICKABLE,
                                                path: use[0].index.toString()
                                            })];
                                    case 1:
                                        clickableResult = _a.sent();
                                        if (!clickableResult || !clickableResult.data.clickable) {
                                            invalidChrome = true;
                                        }
                                        else {
                                            // the extension tells us there's a valid command, so don't run any pending command on the client too
                                            this.clearPending();
                                        }
                                        _a.label = 2;
                                    case 2: return [2 /*return*/, invalidChrome && invalidPending];
                                    case 3: return [2 /*return*/, invalidPending];
                                }
                            });
                        }); };
                        if (!response.alternatives) return [3 /*break*/, 4];
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < response.alternatives.length)) return [3 /*break*/, 4];
                        return [4 /*yield*/, isInvalid(response.alternatives[i])];
                    case 2:
                        if ((_b.sent()) && response.alternatives[i].commands) {
                            response.alternatives[i].commands.map(function (e) {
                                e.type = core_1.core.CommandType.COMMAND_TYPE_INVALID;
                            });
                        }
                        _b.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        _a = response.execute;
                        if (!_a) return [3 /*break*/, 6];
                        return [4 /*yield*/, isInvalid(response.execute)];
                    case 5:
                        _a = (_b.sent());
                        _b.label = 6;
                    case 6:
                        if (_a) {
                            response.execute = null;
                        }
                        return [2 /*return*/, response];
                }
            });
        });
    };
    Executor.prototype.invalidateMaxKeystrokeCommands = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var state, _i, _a, alternative, count, _b, _c, command, commandType;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _d.sent();
                        for (_i = 0, _a = response.alternatives; _i < _a.length; _i++) {
                            alternative = _a[_i];
                            count = 0;
                            for (_b = 0, _c = alternative.commands; _b < _c.length; _b++) {
                                command = _c[_b];
                                commandType = command.type;
                                if (commandType == core_1.core.CommandType.COMMAND_TYPE_DIFF && !state.canSetState) {
                                    count += this.nativeCommands.diffKeystrokesCount(state, command);
                                }
                                else if (commandType == core_1.core.CommandType.COMMAND_TYPE_INSERT) {
                                    count += this.nativeCommands.insertKeystrokesCount(state, command.text);
                                }
                                else if (commandType == core_1.core.CommandType.COMMAND_TYPE_UNDO &&
                                    this.nativeCommands.needsUndoStack(state) &&
                                    this.nativeCommands.canUndo(state)) {
                                    count += this.nativeCommands.undoKeystrokesCount(state);
                                }
                                else if (commandType == core_1.core.CommandType.COMMAND_TYPE_REDO &&
                                    this.nativeCommands.needsUndoStack(state) &&
                                    this.nativeCommands.canRedo()) {
                                    count += this.nativeCommands.redoKeystrokesCount(state);
                                }
                            }
                            if (count >= this.nativeCommands.maxKeystrokes) {
                                alternative.description = "Too many keystrokes: " + alternative.description;
                                alternative.commands.map(function (e) {
                                    e.type = core_1.core.CommandType.COMMAND_TYPE_INVALID;
                                });
                            }
                        }
                        return [2 /*return*/, response];
                }
            });
        });
    };
    Executor.prototype.newChainFinishedPromise = function () {
        var _this = this;
        this.chainFinishedPromise = new Promise(function (resolve) {
            _this.resolveChainFinished = resolve;
        });
    };
    Executor.prototype.removeCommandsForUseOrCancel = function (response) {
        if ((0, alternatives_1.isMetaResponse)(response) && response.alternatives && response.alternatives.length > 0) {
            response.execute = response.alternatives[0];
            response.alternatives = [];
        }
        return response;
    };
    Executor.prototype.savePendingResponseIfNeeded = function (response) {
        // ignore execute-only responses
        if ((!response.alternatives || response.alternatives.length == 0) &&
            this.hasExecute(response)) {
            return;
        }
        var filteredResponse = new core_1.core.CommandsResponse({
            endpointId: response.endpointId,
            alternatives: response.alternatives.filter(function (e) {
                return (0, alternatives_1.isValidAlternative)(e);
            })
        });
        this.pending = filteredResponse;
    };
    Executor.prototype.setExecuteToFirstAlternativeIfNeeded = function (response) {
        var valid = (response.alternatives || []).filter(function (e) {
            return (0, alternatives_1.isValidAlternative)(e);
        });
        if (this.hasExecute(response) || valid.length == 0) {
            return response;
        }
        var autoExecuteCommandTypes = [
            core_1.core.CommandType.COMMAND_TYPE_DIFF,
            core_1.core.CommandType.COMMAND_TYPE_CANCEL,
            core_1.core.CommandType.COMMAND_TYPE_CLIPBOARD,
            core_1.core.CommandType.COMMAND_TYPE_COPY,
            core_1.core.CommandType.COMMAND_TYPE_INSERT,
            core_1.core.CommandType.COMMAND_TYPE_SCROLL,
            core_1.core.CommandType.COMMAND_TYPE_LANGUAGE_MODE,
            core_1.core.CommandType.COMMAND_TYPE_NEXT,
            core_1.core.CommandType.COMMAND_TYPE_PASTE,
            core_1.core.CommandType.COMMAND_TYPE_PAUSE,
            core_1.core.CommandType.COMMAND_TYPE_REDO,
            core_1.core.CommandType.COMMAND_TYPE_SAVE,
            core_1.core.CommandType.COMMAND_TYPE_SHOW,
            core_1.core.CommandType.COMMAND_TYPE_UNDO,
            core_1.core.CommandType.COMMAND_TYPE_USE,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_CONTINUE,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_INLINE_BREAKPOINT,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_PAUSE,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_SHOW_HOVER,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_START,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_INTO,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OUT,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_STEP_OVER,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_STOP,
            core_1.core.CommandType.COMMAND_TYPE_DEBUGGER_TOGGLE_BREAKPOINT,
            core_1.core.CommandType.COMMAND_TYPE_START_DICTATE,
            core_1.core.CommandType.COMMAND_TYPE_STOP_DICTATE,
            core_1.core.CommandType.COMMAND_TYPE_SHOW_REVISION_BOX,
            core_1.core.CommandType.COMMAND_TYPE_HIDE_REVISION_BOX,
        ];
        var executeKeys = [
            "up",
            "down",
            "left",
            "right",
            "space",
            "enter",
            "tab",
            "pagedown",
            "pageup",
        ];
        if (!valid[0].transcript || !valid[0].commands || valid[0].commands.length == 0) {
            return response;
        }
        // run commands are often in a terminal, where we don't want to do things unexpectedly
        if (valid[0].transcript.startsWith("run")) {
            return response;
        }
        if (valid.length == 1 ||
            valid[0].commands.every(function (e) {
                return autoExecuteCommandTypes.includes(e.type || core_1.core.CommandType.COMMAND_TYPE_NONE) ||
                    (e.type == core_1.core.CommandType.COMMAND_TYPE_PRESS && executeKeys.includes(e.text || ""));
            })) {
            response.execute = valid[0];
        }
        else if (valid[0].commands[0].type == core_1.core.CommandType.COMMAND_TYPE_CUSTOM) {
            var custom = this.active.customCommands.filter(function (e) { return e.id == valid[0].commands[0].customCommandId && e.autoExecute; });
            if (custom.length > 0) {
                response.execute = valid[0];
            }
        }
        return response;
    };
    Executor.prototype.clearPending = function () {
        this.pending = undefined;
    };
    Executor.prototype.execute = function (response, updateRenderer) {
        if (updateRenderer === void 0) { updateRenderer = true; }
        return __awaiter(this, void 0, void 0, function () {
            var forwardToPlugin, _i, _a, command, pluginResponse, e_1, _b, _c, command, commandType;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this.lastEndpointId = response.endpointId;
                        // reset the state of the alternatives spinner each time a new command is executed,
                        // and if the command needs a spinner, it will set it back below
                        this.bridge.setState({
                            alternativesSpinner: []
                        }, [this.mainWindow, this.miniModeWindow]);
                        if (updateRenderer) {
                            this.showAlternativesIfPresent(response);
                        }
                        if (response.alternatives && response.alternatives.length > 0) {
                            this.nativeCommands.useNeedsUndo = false;
                        }
                        if (!this.hasExecute(response)) {
                            this.resolveChainFinished();
                            this.newChainFinishedPromise();
                            return [2 /*return*/];
                        }
                        else {
                            this.addToHistory(response);
                        }
                        forwardToPlugin = true;
                        if ((this.active.app == "jetbrains" && this.active.filename == "jetbrains-modal") ||
                            this.revisionBoxWindow.shown()) {
                            forwardToPlugin = false;
                        }
                        if (forwardToPlugin &&
                            !this.settings.getNuxCompleted() &&
                            response.execute &&
                            response.execute.commands) {
                            for (_i = 0, _a = response.execute.commands; _i < _a.length; _i++) {
                                command = _a[_i];
                                if (command.type == core_1.core.CommandType.COMMAND_TYPE_UNDO) {
                                    forwardToPlugin = false;
                                }
                            }
                        }
                        if (!forwardToPlugin) return [3 /*break*/, 4];
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.pluginManager.sendResponseToApp(this.active.app, response)];
                    case 2:
                        pluginResponse = _d.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _d.sent();
                        console.log(e_1);
                        return [3 /*break*/, 4];
                    case 4:
                        if (!(response.execute && response.execute.commands)) return [3 /*break*/, 8];
                        _b = 0, _c = response.execute.commands;
                        _d.label = 5;
                    case 5:
                        if (!(_b < _c.length)) return [3 /*break*/, 8];
                        command = _c[_b];
                        commandType = (0, alternatives_1.commandTypeToString)(command.type);
                        if (!(commandType in this.commandHandler())) return [3 /*break*/, 7];
                        if (command.type != core_1.core.CommandType.COMMAND_TYPE_DIFF &&
                            command.type != core_1.core.CommandType.COMMAND_TYPE_INSERT &&
                            command.type != core_1.core.CommandType.COMMAND_TYPE_RUN) {
                            this.insertHistory.clear();
                        }
                        return [4 /*yield*/, this.commandHandler()[commandType](command)];
                    case 6:
                        _d.sent();
                        if (command.type == core_1.core.CommandType.COMMAND_TYPE_RUN ||
                            command.type == core_1.core.CommandType.COMMAND_TYPE_PRESS) {
                            this.insertHistory.clear();
                        }
                        _d.label = 7;
                    case 7:
                        _b++;
                        return [3 /*break*/, 5];
                    case 8:
                        if (!(response.execute && response.execute.remaining)) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.executeChain(response.execute.remaining)];
                    case 9:
                        _d.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        this.handleResponseFromPlugin(pluginResponse);
                        _d.label = 11;
                    case 11:
                        this.nux.updateForResponse(response);
                        return [2 /*return*/];
                }
            });
        });
    };
    Executor.prototype.executePending = function (index) {
        return __awaiter(this, void 0, void 0, function () {
            var alternative;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.pending && this.pending.alternatives)) return [3 /*break*/, 2];
                        alternative = this.pending.alternatives[index];
                        if (!alternative) return [3 /*break*/, 2];
                        if (this.settings.getLogAudio() || this.settings.getLogSource()) {
                            this.api.logEvent("client.stream.resolution", {
                                dt: Date.now(),
                                data: {
                                    endpoint_id: this.lastEndpointId,
                                    resolved_alternative_id: alternative.alternativeId,
                                    resolved_endpoint_id: this.pending.endpointId
                                }
                            });
                        }
                        return [4 /*yield*/, this.execute({ execute: alternative }, false)];
                    case 1:
                        _a.sent();
                        this.bridge.setState({
                            highlighted: [index]
                        }, [this.mainWindow, this.miniModeWindow]);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Executor.prototype.executeChain = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.log.logVerbose("Executing chain: ".concat(text));
                        return [4 /*yield*/, this.stream.sendInitializeRequest()];
                    case 1:
                        _a.sent();
                        this.stream.sendCallbackRequest({
                            type: core_1.core.CallbackType.CALLBACK_TYPE_CHAIN,
                            text: text
                        });
                        return [4 /*yield*/, this.chainFinishedPromise];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Executor.prototype.postProcessResponse = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!response.alternatives) {
                            return [2 /*return*/, response];
                        }
                        if (!(os.platform() != "linux")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.invalidateBadApplicationCommands(response, function () { return _this.system.installedApplications(); }, function (command) { return command.type == core_1.core.CommandType.COMMAND_TYPE_LAUNCH; })];
                    case 1:
                        response = _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.invalidateBadApplicationCommands(response, function () { return _this.system.runningApplications(); }, function (command) {
                            return command.type == core_1.core.CommandType.COMMAND_TYPE_FOCUS ||
                                command.type == core_1.core.CommandType.COMMAND_TYPE_QUIT;
                        })];
                    case 3:
                        response = _a.sent();
                        return [4 /*yield*/, this.invalidateBadClickCommands(response)];
                    case 4:
                        response = _a.sent();
                        return [4 /*yield*/, this.invalidateBadUseCommands(response)];
                    case 5:
                        response = _a.sent();
                        return [4 /*yield*/, this.invalidateMaxKeystrokeCommands(response)];
                    case 6:
                        response = _a.sent();
                        response = this.removeCommandsForUseOrCancel(response);
                        response = this.truncateAlternativesIfNeeded(response);
                        response = this.setExecuteToFirstAlternativeIfNeeded(response);
                        return [2 /*return*/, response];
                }
            });
        });
    };
    Executor.prototype.showAlternativesIfPresent = function (response) {
        var _this = this;
        // don't show alternatives for meta responses, since that would blow away the choices
        if ((0, alternatives_1.isMetaResponse)(response)) {
            return;
        }
        if (response.alternatives && response.alternatives.length > 0) {
            this.log.logVerbose("Showing alternatives [".concat(response.alternatives.map(function (e) { return e.transcript; }).join(", "), "]"));
            this.bridge.setState({
                alternatives: response.alternatives
            }, [this.mainWindow, this.miniModeWindow]);
            if (response.final) {
                this.savePendingResponseIfNeeded(response);
                this.bridge.setState({
                    highlighted: this.hasExecute(response) ? [0] : []
                }, [this.mainWindow, this.miniModeWindow]);
            }
        }
        if ((this.settings.getMiniMode() || !this.mainWindow.shown()) &&
            this.settings.getUseMiniModeHideTimeout()) {
            if (this.miniModeHideTimeout) {
                clearTimeout(this.miniModeHideTimeout);
            }
            this.miniModeHideTimeout = global.setTimeout(function () {
                _this.bridge.setState({
                    alternatives: []
                }, [_this.mainWindow, _this.miniModeWindow]);
            }, Math.max(1, 1000 * this.settings.getMiniModeHideTimeout()));
        }
        setTimeout(function () {
            _this.bridge.send("updateMiniModeWindowHeight", {}, [_this.miniModeWindow]);
        }, 50);
    };
    Executor.prototype.truncateAlternativesIfNeeded = function (response) {
        if ((this.settings.getMiniMode() || !this.mainWindow.shown()) &&
            this.settings.getUseMiniModeFewerAlternatives()) {
            response.alternatives = (response.alternatives || []).slice(0, Math.max(1, this.settings.getMiniModeFewerAlternativesCount()));
        }
        return response;
    };
    return Executor;
}());
exports["default"] = Executor;
