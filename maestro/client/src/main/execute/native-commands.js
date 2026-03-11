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
var CompositeOperation = /** @class */ (function () {
    function CompositeOperation(operations) {
        this.operations = operations;
    }
    CompositeOperation.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, operation;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = this.operations;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        operation = _a[_i];
                        return [4 /*yield*/, operation.execute()];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    CompositeOperation.prototype.keystrokesCount = function () {
        var total = 0;
        for (var _i = 0, _a = this.operations; _i < _a.length; _i++) {
            var operation = _a[_i];
            total += operation.keystrokesCount();
        }
        return total;
    };
    return CompositeOperation;
}());
var KeylessOperation = /** @class */ (function () {
    function KeylessOperation(inner) {
        this.inner = inner;
    }
    KeylessOperation.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.inner();
                return [2 /*return*/];
            });
        });
    };
    KeylessOperation.prototype.keystrokesCount = function () {
        return 0;
    };
    return KeylessOperation;
}());
var MoveCursor = /** @class */ (function () {
    function MoveCursor(system, initial, final) {
        this.system = system;
        this.initial = initial;
        this.final = final;
    }
    MoveCursor.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            var change;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        change = this.final - this.initial;
                        if (!(change > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.system.pressKey("right", [], change)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2:
                        if (!(change < 0)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.system.pressKey("left", [], -change)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MoveCursor.prototype.keystrokesCount = function () {
        return Math.abs(this.final - this.initial);
    };
    return MoveCursor;
}());
var PressKey = /** @class */ (function () {
    function PressKey(system, key, modifiers, count) {
        this.system = system;
        this.key = key;
        this.modifiers = modifiers;
        this.count = count;
    }
    PressKey.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.system.pressKey(this.key, this.modifiers, this.count)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PressKey.prototype.keystrokesCount = function () {
        return this.count;
    };
    return PressKey;
}());
var TypeText = /** @class */ (function () {
    function TypeText(active, insertHistory, system, text) {
        this.active = active;
        this.insertHistory = insertHistory;
        this.system = system;
        this.text = text;
    }
    TypeText.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.insertHistory.add(this.text, this.active.app);
                        return [4 /*yield*/, this.system.typeText(this.text, this.active.app)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TypeText.prototype.keystrokesCount = function () {
        return this.text.length;
    };
    return TypeText;
}());
var Substitution = /** @class */ (function () {
    function Substitution(active, insertHistory, system, start, stop, substitution, cursor) {
        this.active = active;
        this.insertHistory = insertHistory;
        this.system = system;
        this.start = start;
        this.stop = stop;
        this.substitution = substitution;
        this.cursor = cursor;
    }
    Substitution.prototype.operation = function () {
        return new CompositeOperation([
            new MoveCursor(this.system, this.cursor, this.stop),
            new PressKey(this.system, "backspace", [], this.stop - this.start),
            new TypeText(this.active, this.insertHistory, this.system, this.substitution),
        ]);
    };
    Substitution.prototype.finalCursor = function () {
        return this.start + this.substitution.length;
    };
    return Substitution;
}());
var RevisionBoxDiff = /** @class */ (function () {
    function RevisionBoxDiff(revisionBoxWindow, command) {
        this.revisionBoxWindow = revisionBoxWindow;
        this.command = command;
    }
    RevisionBoxDiff.prototype.apply = function (state) {
        var _this = this;
        this.beforeState = state;
        return new KeylessOperation(function () {
            _this.revisionBoxWindow.setEditorState({
                source: _this.command.source.toString(),
                cursor: _this.command.cursor,
                cursorEnd: _this.command.cursorEnd
            });
        });
    };
    RevisionBoxDiff.prototype.undo = function (state) {
        var _this = this;
        return new KeylessOperation(function () {
            _this.revisionBoxWindow.setEditorState({
                source: _this.beforeState.source.toString(),
                cursor: _this.beforeState.cursor,
                cursorEnd: 0
            });
        });
    };
    RevisionBoxDiff.prototype.hasExpectedUndoSource = function () {
        return true;
    };
    return RevisionBoxDiff;
}());
var RevisionBoxPress = /** @class */ (function () {
    function RevisionBoxPress(revisionBoxWindow, system, command) {
        this.revisionBoxWindow = revisionBoxWindow;
        this.system = system;
        this.command = command;
    }
    RevisionBoxPress.prototype.apply = function (state) {
        this.beforeState = state;
        return new PressKey(this.system, this.command.text, this.command.modifiers, Math.max(1, this.command.index || 0));
    };
    RevisionBoxPress.prototype.undo = function () {
        var _this = this;
        return new KeylessOperation(function () {
            _this.revisionBoxWindow.setEditorState({
                source: _this.beforeState.source.toString(),
                cursor: _this.beforeState.cursor,
                cursorEnd: 0
            });
        });
    };
    RevisionBoxPress.prototype.hasExpectedUndoSource = function () {
        return true;
    };
    return RevisionBoxPress;
}());
var Insert = /** @class */ (function () {
    function Insert(active, insertHistory, system, text) {
        this.active = active;
        this.insertHistory = insertHistory;
        this.system = system;
        this.text = text;
    }
    Insert.prototype.apply = function (state) {
        return new TypeText(this.active, this.insertHistory, this.system, this.text);
    };
    Insert.prototype.undo = function (state) {
        return new PressKey(this.system, "backspace", [], this.text.length);
    };
    Insert.prototype.hasExpectedUndoSource = function (state) {
        return true;
    };
    return Insert;
}());
var NativeDiff = /** @class */ (function () {
    function NativeDiff(active, insertHistory, system, command) {
        this.active = active;
        this.insertHistory = insertHistory;
        this.system = system;
        this.command = command;
        this.beforeCursor = -1;
        this.beforeSource = "";
        this.afterSource = "";
    }
    NativeDiff.prototype.normalize = function (text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, "-")
            .replace(/[\u2026]/g, "...");
    };
    NativeDiff.prototype.apply = function (state) {
        this.beforeCursor = state.cursor;
        this.beforeSource = state.source.toString();
        this.afterSource = this.command.source.toString();
        var operations = [];
        var cursor = state.cursor;
        for (var i = this.command.changes.length - 1; i >= 0; i--) {
            var change = this.command.changes[i];
            var substitution = new Substitution(this.active, this.insertHistory, this.system, change.start, change.stop, change.substitution, cursor);
            cursor = substitution.finalCursor();
            operations.push(substitution.operation());
        }
        operations.push(new MoveCursor(this.system, cursor, this.command.cursor));
        return new CompositeOperation(operations);
    };
    NativeDiff.prototype.undo = function (state) {
        var operations = [];
        var cursor = state.cursor;
        for (var i = 0; i < this.command.changes.length; i++) {
            var change = this.command.changes[i];
            var stop_1 = change.start + change.substitution.length;
            if (!state.canSetState) {
                cursor = stop_1;
            }
            var substitution = new Substitution(this.active, this.insertHistory, this.system, change.start, stop_1, this.beforeSource.substring(change.start, change.stop), cursor);
            cursor = substitution.finalCursor();
            operations.push(substitution.operation());
        }
        operations.push(new MoveCursor(this.system, this.beforeCursor, cursor));
        return new CompositeOperation(operations);
    };
    NativeDiff.prototype.hasExpectedUndoSource = function (state) {
        return (!state.canSetState ||
            this.normalize(state.source.toString()) == this.normalize(this.afterSource));
    };
    return NativeDiff;
}());
var NativeCommands = /** @class */ (function () {
    function NativeCommands(active, insertHistory, revisionBoxWindow, system) {
        this.active = active;
        this.insertHistory = insertHistory;
        this.revisionBoxWindow = revisionBoxWindow;
        this.system = system;
        this.maxUndoStackSize = 20;
        this.nextCommandIndex = 0;
        this.undoStack = [];
        this.maxKeystrokes = 250;
        this.useNeedsUndo = false;
    }
    NativeCommands.prototype.applyCommand = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        if (command.apply(state).keystrokesCount() >= this.maxKeystrokes) {
                            return [2 /*return*/];
                        }
                        this.useNeedsUndo = true;
                        return [4 /*yield*/, command.apply(state)];
                    case 2: return [4 /*yield*/, (_a.sent()).execute()];
                    case 3:
                        _a.sent();
                        this.undoStack.splice(this.nextCommandIndex, this.undoStack.length - this.nextCommandIndex + 1);
                        this.undoStack.push(command);
                        while (this.undoStack.length > this.maxUndoStackSize) {
                            this.undoStack.shift();
                        }
                        this.nextCommandIndex = this.undoStack.length;
                        return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.applyInsert = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.applyCommand(new Insert(this.active, this.insertHistory, this.system, text))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.applyNativeDiff = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.applyCommand(new NativeDiff(this.active, this.insertHistory, this.system, command))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.applyRevisionBoxDiff = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.applyCommand(new RevisionBoxDiff(this.revisionBoxWindow, command))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.applyRevisionBoxPress = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.applyCommand(new RevisionBoxPress(this.revisionBoxWindow, this.system, command))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.canRedo = function () {
        return this.nextCommandIndex < this.undoStack.length;
    };
    NativeCommands.prototype.canUndo = function (state) {
        return (this.nextCommandIndex - 1 >= 0 &&
            this.undoStack[this.nextCommandIndex - 1].hasExpectedUndoSource(state));
    };
    NativeCommands.prototype.diffKeystrokesCount = function (state, command) {
        return new NativeDiff(this.active, this.insertHistory, this.system, command)
            .apply(state)
            .keystrokesCount();
    };
    NativeCommands.prototype.insertKeystrokesCount = function (state, text) {
        return new Insert(this.active, this.insertHistory, this.system, text)
            .apply(state)
            .keystrokesCount();
    };
    NativeCommands.prototype.needsUndoStack = function (state) {
        return !state.canSetState || this.revisionBoxWindow.shown();
    };
    NativeCommands.prototype.redo = function (state) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.nextCommandIndex < this.undoStack.length &&
                            this.undoStack[this.nextCommandIndex].apply(state).keystrokesCount() < this.maxKeystrokes)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.undoStack[this.nextCommandIndex].apply(state).execute()];
                    case 1:
                        _a.sent();
                        this.nextCommandIndex++;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.redoKeystrokesCount = function (state) {
        return this.undoStack[this.nextCommandIndex].apply(state).keystrokesCount();
    };
    NativeCommands.prototype.undo = function (state) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.nextCommandIndex - 1 >= 0 &&
                            this.undoStack[this.nextCommandIndex - 1].hasExpectedUndoSource(state) &&
                            this.undoStack[this.nextCommandIndex - 1].undo(state).keystrokesCount() < this.maxKeystrokes)) return [3 /*break*/, 2];
                        this.nextCommandIndex--;
                        return [4 /*yield*/, this.undoStack[this.nextCommandIndex].undo(state).execute()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    NativeCommands.prototype.undoKeystrokesCount = function (state) {
        return this.undoStack[this.nextCommandIndex - 1].undo(state).keystrokesCount();
    };
    return NativeCommands;
}());
exports["default"] = NativeCommands;
