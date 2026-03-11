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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var electron_1 = require("electron");
var os_1 = __importDefault(require("os"));
var path_1 = __importDefault(require("path"));
var url_1 = require("url");
var Window = /** @class */ (function () {
    function Window() {
        this.isShown = false;
    }
    Window.prototype.createWindow = function (bridge, settings) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        var icon = "icon_512x512.png";
                        if (os_1["default"].platform() == "win32") {
                            icon = "icon.ico";
                        }
                        var position = _this.position();
                        _this.window = new electron_1.BrowserWindow({
                            icon: path_1["default"].join(__dirname, "..", "static", "img", icon),
                            titleBarStyle: "hidden",
                            alwaysOnTop: true,
                            show: _this.main() || _this.transparent(),
                            x: position.x,
                            y: position.y,
                            width: _this.width(),
                            height: _this.height(),
                            minWidth: _this.minWidth(),
                            minHeight: _this.minHeight(),
                            maxWidth: _this.maxWidth(),
                            maxHeight: _this.maxHeight(),
                            title: _this.title(),
                            frame: false,
                            skipTaskbar: !_this.main(),
                            resizable: !_this.transparent(),
                            transparent: _this.transparent(),
                            hasShadow: !_this.transparent(),
                            webPreferences: {
                                contextIsolation: false,
                                nodeIntegration: true
                            }
                        });
                        _this.loadURL(_this.url());
                        _this.window.setVisibleOnAllWorkspaces(true);
                        _this.window.setMenuBarVisibility(false);
                        _this.window.setAutoHideMenuBar(true);
                        _this.window.setAlwaysOnTop(true);
                        if (!_this.main()) {
                            _this.window.on("close", function (e) {
                                e.preventDefault();
                                _this.hide();
                            });
                        }
                        _this.window.webContents.on("new-window", function (e, url) {
                            e.preventDefault();
                            electron_1.shell.openExternal(url);
                        });
                        _this.window.once("ready-to-show", function () {
                            bridge.updateDarkMode([_this]);
                            resolve();
                        });
                    })];
            });
        });
    };
    Window.prototype.destroy = function () {
        var _a, _b;
        (_a = this.window) === null || _a === void 0 ? void 0 : _a.close();
        (_b = this.window) === null || _b === void 0 ? void 0 : _b.destroy();
        this.isShown = false;
    };
    Window.prototype.focus = function () {
        var _a, _b;
        (_a = this.window) === null || _a === void 0 ? void 0 : _a.focus();
        (_b = this.window) === null || _b === void 0 ? void 0 : _b.focusOnWebView();
    };
    Window.prototype.height = function () {
        return 500;
    };
    Window.prototype.hide = function () {
        var _a;
        if (!this.shown()) {
            return;
        }
        (_a = this.window) === null || _a === void 0 ? void 0 : _a.hide();
        this.isShown = false;
    };
    Window.prototype.loadURL = function (url) {
        if (!this.window) {
            return;
        }
        if (process.env.NODE_ENV !== "production") {
            this.window.loadURL("http://localhost:4000#/".concat(url));
        }
        else {
            this.window.loadURL((0, url_1.format)({
                pathname: path_1["default"].join(__dirname, "renderer/index.html"),
                protocol: "file",
                slashes: true,
                hash: url
            }));
        }
    };
    Window.prototype.main = function () {
        return false;
    };
    Window.prototype.maxHeight = function () {
        return undefined;
    };
    Window.prototype.maxWidth = function () {
        return undefined;
    };
    Window.prototype.minHeight = function () {
        return this.height();
    };
    Window.prototype.minWidth = function () {
        return this.width();
    };
    Window.prototype.positionNearMainWindow = function (mainWindow) {
        if (!mainWindow || !mainWindow.window) {
            return { x: 0, y: 0 };
        }
        var mainWindowBounds = mainWindow.window.getBounds();
        var currentDisplayArea = electron_1.screen.getDisplayMatching(mainWindowBounds).workArea;
        var x = mainWindowBounds.x + mainWindowBounds.width;
        var y = mainWindowBounds.y;
        if (x + this.width() > currentDisplayArea.x + currentDisplayArea.width) {
            x = Math.max(currentDisplayArea.x, mainWindowBounds.x - this.width());
        }
        if (y + this.height() > currentDisplayArea.y + currentDisplayArea.height) {
            y = Math.max(currentDisplayArea.y, currentDisplayArea.y + currentDisplayArea.height - this.height());
        }
        return { x: x, y: y };
    };
    Window.prototype.send = function (message, data) {
        var _a;
        try {
            (_a = this.window) === null || _a === void 0 ? void 0 : _a.webContents.send(message, data);
        }
        catch (e) { }
    };
    Window.prototype.setSize = function (height, width) {
        var _a;
        if (!this.window) {
            return;
        }
        var setWidth = width !== undefined ? width : this.window.getSize()[0];
        var setHeight = height !== undefined ? height : this.window.getSize()[1];
        (_a = this.window) === null || _a === void 0 ? void 0 : _a.setSize(setWidth, setHeight);
    };
    Window.prototype.show = function () {
        var position = this.position();
        var bounds = this.window.getBounds();
        bounds.x = position.x;
        bounds.y = position.y;
        this.window.setBounds(bounds);
        this.window.show();
        this.window.focus();
        this.isShown = true;
    };
    Window.prototype.shown = function () {
        return this.isShown;
    };
    Window.prototype.transparent = function () {
        return false;
    };
    Window.prototype.width = function () {
        return 500;
    };
    return Window;
}());
exports["default"] = Window;
