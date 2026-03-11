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
var MiniModeWindow = /** @class */ (function (_super) {
    __extends(MiniModeWindow, _super);
    function MiniModeWindow(bridge, mainWindow, settings) {
        var _this = _super.call(this) || this;
        _this.bridge = bridge;
        _this.mainWindow = mainWindow;
        _this.settings = settings;
        _this.currentHeight = 0;
        _this.ignoreMouseEvents = false;
        _this.offset = 5;
        return _this;
    }
    MiniModeWindow.prototype.setIgnoreMouseEvents = function (ignoreMouseEvents) {
        if (this.ignoreMouseEvents == ignoreMouseEvents) {
            return;
        }
        this.ignoreMouseEvents = ignoreMouseEvents;
    };
    MiniModeWindow.create = function (bridge, mainWindow, settings) {
        return __awaiter(this, void 0, void 0, function () {
            var instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        instance = new MiniModeWindow(bridge, mainWindow, settings);
                        return [4 /*yield*/, instance.createWindow(bridge, settings)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    MiniModeWindow.prototype.createWindow = function (bridge, settings) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_c) {
                _super.prototype.createWindow.call(this, bridge, settings);
                if ((_a = this.window) === null || _a === void 0 ? void 0 : _a.setWindowButtonVisibility) {
                    (_b = this.window) === null || _b === void 0 ? void 0 : _b.setWindowButtonVisibility(false);
                }
                return [2 /*return*/];
            });
        });
    };
    MiniModeWindow.prototype.height = function () {
        return this.currentHeight;
    };
    MiniModeWindow.prototype.minHeight = function () {
        return 0;
    };
    MiniModeWindow.prototype.minWidth = function () {
        return 275;
    };
    MiniModeWindow.prototype.position = function () {
        return this.positionNearMainWindow(this.mainWindow);
    };
    MiniModeWindow.prototype.setHeight = function (height) {
        // enforce a maximum size on the window so it scrolls
        height = Math.min(height, 700);
        height = Math.max(height, 39);
        if (!this.shown() || !this.window || height == this.height()) {
            return;
        }
        this.currentHeight = height;
        this.window.setSize(this.width(), this.height());
        this.snapToMain();
        // ensure there aren't any clickable artifacts from a height of zero, since windows enforces
        // a minimum window height of 39px
        this.setIgnoreMouseEvents(this.height() < 40);
    };
    MiniModeWindow.prototype.shouldPlaceAboveMain = function () {
        var _a;
        var mainBounds = (_a = this.mainWindow.window) === null || _a === void 0 ? void 0 : _a.getBounds();
        if (!mainBounds) {
            return false;
        }
        if (!this.mainWindow.shown() &&
            (this.settings.getMinimizedPosition() == "bottom-left" ||
                this.settings.getMinimizedPosition() == "bottom-right")) {
            return true;
        }
        // since height can be zero when nothing is displayed, assume a minimum height to avoid
        // thinking we can fit below when we can't once alternatives come in
        var height = Math.max(300, this.height());
        var display = electron_1.screen.getDisplayMatching(mainBounds).workArea;
        var fitsAbove = mainBounds.y - 2 * this.offset - height > display.y;
        var fitsBelow = mainBounds.y + mainBounds.height + 2 * this.offset + height < display.y + display.height;
        return fitsAbove && !fitsBelow;
    };
    MiniModeWindow.prototype.show = function () {
        var _a;
        if (this.shown()) {
            return;
        }
        (_a = this.window) === null || _a === void 0 ? void 0 : _a.showInactive();
        this.isShown = true;
    };
    MiniModeWindow.prototype.snapToMain = function () {
        if (!this.mainWindow.window) {
            return;
        }
        var mainBounds = this.mainWindow.window.getBounds();
        var display = electron_1.screen.getDisplayMatching(mainBounds).workArea;
        var x = mainBounds.x;
        var y = this.shouldPlaceAboveMain()
            ? mainBounds.y - this.offset - this.height()
            : mainBounds.y + mainBounds.height + this.offset;
        if (!this.mainWindow.shown()) {
            var position = this.settings.getMinimizedPosition();
            if (position == "window") {
                y = this.shouldPlaceAboveMain() ? display.y + display.height - this.height() : mainBounds.y;
            }
            else if (position == "top-left") {
                x = display.x;
                y = display.y;
            }
            else if (position == "top-right") {
                x = display.x + display.width - mainBounds.width;
                y = display.y;
            }
            else if (position == "bottom-right") {
                x = display.x + display.width - mainBounds.width;
                y = display.y + display.height - this.height();
            }
            else if (position == "bottom-left") {
                x = display.x;
                y = display.y + display.height - this.height();
            }
        }
        if (this.window) {
            var bounds = this.window.getBounds();
            if (bounds.x != x ||
                bounds.y != y ||
                bounds.width != mainBounds.width ||
                bounds.height != this.height()) {
                this.window.setBounds({
                    x: x,
                    y: y,
                    width: mainBounds.width,
                    height: this.height()
                });
                this.bridge.setState({
                    miniModeBottomUp: this.shouldPlaceAboveMain()
                }, [this]);
            }
        }
    };
    MiniModeWindow.prototype.title = function () {
        return "ArqonMaestro";
    };
    MiniModeWindow.prototype.transparent = function () {
        return true;
    };
    MiniModeWindow.prototype.url = function () {
        return "minimode";
    };
    MiniModeWindow.prototype.width = function () {
        return this.minWidth();
    };
    return MiniModeWindow;
}(window_1["default"]));
exports["default"] = MiniModeWindow;
