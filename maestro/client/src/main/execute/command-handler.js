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
var electron_1 = require("electron");
var electron_2 = require("electron");
var core_1 = require("../../gen/core");
var CommandHandler = /** @class */ (function () {
    function CommandHandler(active, app, bridge, chunkManager, custom, executor, mainWindow, nativeCommands, nux, revisionBoxWindow, settings, stream, system, languageSwitcherWindow) {
        this.active = active;
        this.app = app;
        this.bridge = bridge;
        this.chunkManager = chunkManager;
        this.custom = custom;
        this.executor = executor;
        this.mainWindow = mainWindow;
        this.nativeCommands = nativeCommands;
        this.nux = nux;
        this.revisionBoxWindow = revisionBoxWindow;
        this.settings = settings;
        this.stream = stream;
        this.system = system;
        this.languageSwitcherWindow = languageSwitcherWindow;
    }
    CommandHandler.prototype.clearPending = function () {
        this.executor.clearPending();
        this.app.clearAlternativesAndShowExamples();
    };
    CommandHandler.prototype.COMMAND_TYPE_BACK = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.nux.back(true);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_CALLBACK = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var command, state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        command = this.active.customCommands.filter(function (e) { return e.templated == data.path; })[0];
                        return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        state.source = Buffer.from(data.source || "");
                        state.cursor = data.cursor || 0;
                        this.stream.sendCallbackRequest({
                            type: data.callbackType,
                            text: data.text
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_CANCEL = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.clearPending();
                if (this.revisionBoxWindow.shown()) {
                    this.revisionBoxWindow.hide("cancel");
                }
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_CLICK = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var button;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!data.path) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.system.clickButton(data.path)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        button = data.text || "left";
                        return [4 /*yield*/, this.system.click(button)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_CLIPBOARD = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.stream.sendEditorStateRequest(true)];
                    case 1:
                        _a.sent();
                        this.stream.sendCallbackRequest({
                            type: core_1.core.CallbackType.CALLBACK_TYPE_PASTE,
                            text: data.direction || ""
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_COPY = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                electron_1.clipboard.writeText(data.text || "");
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_CUSTOM = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.custom.execute(data.customCommandId, data.replacements);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_DIFF = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var state, trigger;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        trigger = this.settings.revisionBoxTrigger(this.active.app);
                        if (!((!state.canSetState && trigger == "auto") || trigger == "always")) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.revisionBoxWindow.show()];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!this.revisionBoxWindow.shown()) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.nativeCommands.applyRevisionBoxDiff(data)];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5:
                        if (!!state.canSetState) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.nativeCommands.applyNativeDiff(data)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_FOCUS = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.system.focus(data.text)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_HIDE_REVISION_BOX = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.revisionBoxWindow.hide(data.text);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_INSERT = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.nativeCommands.applyInsert(data.source || data.text || "")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_LANGUAGE_MODE = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.active.languageSwitcherLanguage = data.language;
                this.bridge.setState({
                    languageSwitcherLanguage: data.language
                }, [this.mainWindow, this.languageSwitcherWindow()]);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_LAUNCH = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.system.launch(data.text)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_OPEN_IN_BROWSER = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, electron_2.shell.openExternal(data.path)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_PAUSE = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.clearPending();
                this.chunkManager.toggle(false);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_PRESS = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.revisionBoxWindow.shown()) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.nativeCommands.applyRevisionBoxPress(data)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.system.pressKey(data.text, data.modifiers, Math.max(1, data.index || 0))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_REDO = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        if (!this.nativeCommands.needsUndoStack(state)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.nativeCommands.redo(state)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_RUN = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.nativeCommands.applyNativeDiff(data)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.system.pressKey("enter")];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_QUIT = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.system.quit(data.text)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_SELECT = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.revisionBoxWindow.shown()) {
                    this.nativeCommands.applyRevisionBoxDiff(data);
                }
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_SHOW_REVISION_BOX = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.revisionBoxWindow.show(data.text);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_START_DICTATE = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.active.dictateMode = true;
                this.bridge.setState({
                    dictateMode: true
                }, [this.mainWindow]);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_STOP_DICTATE = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.active.dictateMode = false;
                this.bridge.setState({
                    dictateMode: false
                }, [this.mainWindow]);
                return [2 /*return*/];
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_UNDO = function (_data) {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.settings.getNuxCompleted()) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.nux.showCurrentStep()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                    case 2: return [4 /*yield*/, this.active.getEditorState()];
                    case 3:
                        state = _a.sent();
                        if (!this.nativeCommands.needsUndoStack(state)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.nativeCommands.undo(state)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.COMMAND_TYPE_USE = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        if (!this.nativeCommands.useNeedsUndo) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.nativeCommands.undo(state)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.executor.executePending(data.index - 1)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return CommandHandler;
}());
exports["default"] = CommandHandler;
