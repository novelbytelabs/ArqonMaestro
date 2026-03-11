"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var electron_1 = require("electron");
var window_1 = __importDefault(require("./window"));
var RevisionBoxWindow = /** @class */ (function (_super) {
    __extends(RevisionBoxWindow, _super);
    function RevisionBoxWindow(mainWindow, miniModeWindow, settings, system) {
        var _this = _super.call(this) || this;
        _this.mainWindow = mainWindow;
        _this.miniModeWindow = miniModeWindow;
        _this.settings = settings;
        _this.system = system;
        _this.promises = {};
        _this.previousApplication = "";
        _this.previousClipboardContents = "";
        return _this;
    }
    RevisionBoxWindow.create = function (bridge, mainWindow, miniModeWindow, settings, system) {
        return __awaiter(this, void 0, void 0, function () {
            var instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        instance = new RevisionBoxWindow(mainWindow, miniModeWindow, settings, system);
                        return [4 /*yield*/, instance.createWindow(bridge, settings)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    RevisionBoxWindow.prototype.getEditorState = function () {
        var _this = this;
        return new Promise(function (resolve) {
            var id = Math.random().toString();
            _this.promises[id] = resolve;
            _this.send("getRevisionBoxState", { id: id });
        });
    };
    RevisionBoxWindow.prototype.height = function () {
        return 300;
    };
    RevisionBoxWindow.prototype.hide = function (action) {
        if (action === void 0) { action = ""; }
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.shown()) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.getEditorState()];
                    case 1:
                        state = _a.sent();
                        this.system.setClipboard(state.source);
                        this.setEditorState({ source: "", cursor: 0, cursorEnd: 0 }, true);
                        _super.prototype.hide.call(this);
                        if (!this.previousApplication) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.system.focus(this.previousApplication)];
                    case 2:
                        _a.sent();
                        if (!(action == "send" || action == "close")) return [3 /*break*/, 9];
                        if (!state.source) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.system.paste(this.previousApplication)];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this.system.pressKey("backspace")];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        if (!(action == "send")) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.system.pressKey("enter")];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8:
                        this.system.setClipboard(this.previousClipboardContents);
                        _a.label = 9;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    RevisionBoxWindow.prototype.onGetEditorState = function (state) {
        if (!this.promises[state.id]) {
            return;
        }
        this.promises[state.id]({
            source: state.source,
            cursor: state.cursor,
            cursorEnd: state.cursorEnd
        });
        this.promises[state.id] = undefined;
    };
    RevisionBoxWindow.prototype.position = function () {
        var position = this.settings.getMinimizedPosition();
        if (!this.window ||
            !this.mainWindow.window ||
            !this.miniModeWindow.window ||
            this.mainWindow.shown() ||
            position == "window") {
            return _super.prototype.positionNearMainWindow.call(this, this.mainWindow);
        }
        var bounds = this.window.getBounds();
        var mainBounds = this.mainWindow.window.getBounds();
        var miniModeBounds = this.miniModeWindow.window.getBounds();
        var display = electron_1.screen.getDisplayMatching(mainBounds).workArea;
        if (position == "top-left") {
            return {
                x: display.x + miniModeBounds.width,
                y: display.y
            };
        }
        else if (position == "top-right") {
            return {
                x: display.x + display.width - miniModeBounds.width - bounds.width,
                y: display.y
            };
        }
        else if (position == "bottom-right") {
            return {
                x: display.x + display.width - miniModeBounds.width - bounds.width,
                y: display.y + display.height - bounds.height
            };
        }
        return {
            x: display.x + miniModeBounds.width,
            y: display.y + display.height - bounds.height
        };
    };
    RevisionBoxWindow.prototype.setEditorState = function (state, allEditors) {
        if (allEditors === void 0) { allEditors = true; }
        this.send("setRevisionBoxState", __assign(__assign({}, state), { allEditors: allEditors }));
    };
    RevisionBoxWindow.prototype.show = function (action) {
        if (action === void 0) { action = ""; }
        return __awaiter(this, void 0, void 0, function () {
            var app, active, source;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.system.determineActiveApplication()];
                    case 1:
                        app = _a.sent();
                        active = app.split(" ");
                        this.previousApplication = active[active.length - 1];
                        this.previousClipboardContents = this.system.getClipboard();
                        source = "";
                        if (!(action == "clipboard")) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.system.getClipboard()];
                    case 2:
                        source = _a.sent();
                        return [3 /*break*/, 10];
                    case 3:
                        if (!(action == "selection")) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.system.copy()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, this.system.getClipboard()];
                    case 5:
                        source = _a.sent();
                        return [3 /*break*/, 10];
                    case 6:
                        if (!(action == "all" && !this.system.isTerminal(app))) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.system.selectAll()];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.system.copy()];
                    case 8:
                        _a.sent();
                        return [4 /*yield*/, this.system.getClipboard()];
                    case 9:
                        source = _a.sent();
                        _a.label = 10;
                    case 10:
                        this.setEditorState({ source: source, cursor: source.length, cursorEnd: 0 });
                        _super.prototype.show.call(this);
                        setTimeout(function () {
                            _this.focus();
                            _this.send("focusRevisionBox", {});
                        }, 200);
                        return [2 /*return*/];
                }
            });
        });
    };
    RevisionBoxWindow.prototype.title = function () {
        return "ArqonMaestro Revision Box";
    };
    RevisionBoxWindow.prototype.url = function () {
        return "revision";
    };
    RevisionBoxWindow.prototype.width = function () {
        return 500;
    };
    return RevisionBoxWindow;
}(window_1["default"]));
exports["default"] = RevisionBoxWindow;
