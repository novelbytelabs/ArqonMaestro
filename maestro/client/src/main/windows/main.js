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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var electron_1 = require("electron");
var os = __importStar(require("os"));
var path = __importStar(require("path"));
var window_1 = __importDefault(require("./window"));
var MainWindow = /** @class */ (function (_super) {
    __extends(MainWindow, _super);
    function MainWindow(app, metadata, settings, chunkManager, miniModeWindow, windowsToDestroy) {
        var _this = _super.call(this) || this;
        _this.app = app;
        _this.metadata = metadata;
        _this.settings = settings;
        _this.chunkManager = chunkManager;
        _this.miniModeWindow = miniModeWindow;
        _this.windowsToDestroy = windowsToDestroy;
        _this.expandedHeight = 500;
        _this.loggedInWidth = 275;
        _this.loggedOutHeight = 375;
        _this.loggedOutWidth = 600;
        _this.miniModeHeight = 86;
        _this.quitInProgress = false;
        _this.resizeCallbackEnabled = true;
        return _this;
    }
    MainWindow.create = function (app, bridge, metadata, settings, chunkManager, miniModeWindow, windowsToDestroy) {
        return __awaiter(this, void 0, void 0, function () {
            var instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        instance = new MainWindow(app, metadata, settings, chunkManager, miniModeWindow, windowsToDestroy);
                        return [4 /*yield*/, instance.createWindow(bridge, settings)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    MainWindow.prototype.saveBounds = function () {
        this.settings.setBounds(this.window.getBounds());
    };
    MainWindow.prototype.windowMoved = function () {
        var _this = this;
        if (!this.window) {
            return;
        }
        if (this.windowMovedTimeout) {
            clearTimeout(this.windowMovedTimeout);
        }
        var miniModeWindow = this.miniModeWindow();
        if (miniModeWindow) {
            miniModeWindow.hide();
        }
        this.windowMovedTimeout = global.setTimeout(function () {
            if (!_this.window || !_this.shown()) {
                return;
            }
            _this.saveBounds();
            var miniModeWindow = _this.miniModeWindow();
            if (miniModeWindow) {
                miniModeWindow.snapToMain();
                if (_this.settings.getMiniMode()) {
                    miniModeWindow.show();
                }
            }
        }, 500);
    };
    MainWindow.prototype.createMenu = function () {
        var _this = this;
        this.updateTray();
        electron_1.Menu.setApplicationMenu(electron_1.Menu.buildFromTemplate([
            {
                label: "ArqonMaestro",
                submenu: [
                    { label: "ArqonMaestro ".concat(this.metadata.version), enabled: false },
                    { type: "separator" },
                    {
                        label: "Quit",
                        accelerator: "CommandOrControl+Q",
                        click: function (_menuItem, _browserWindow, _event) {
                            _this.quit();
                        }
                    },
                ]
            },
            {
                label: "Edit",
                submenu: [
                    { role: "undo" },
                    { role: "redo" },
                    { type: "separator" },
                    { role: "cut" },
                    { role: "copy" },
                    { role: "paste" },
                    { role: "delete" },
                    { role: "selectAll" },
                ]
            },
            {
                label: "View",
                submenu: __spreadArray(__spreadArray([], (process.env.NODE_ENV != "production"
                    ? [
                        { role: "reload" },
                        { role: "forceReload" },
                        { role: "toggleDevTools" },
                        { type: "separator" },
                    ]
                    : []), true), [
                    { role: "resetZoom" },
                    { role: "zoomIn" },
                    { role: "zoomOut" },
                    { type: "separator" },
                    { role: "togglefullscreen" },
                ], false)
            },
            {
                label: "Window",
                submenu: [{ role: "minimize" }, { role: "zoom" }]
            },
        ]));
    };
    MainWindow.prototype.createWindow = function (bridge, settings) {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        this.createMenu();
                        return [4 /*yield*/, _super.prototype.createWindow.call(this, bridge, settings)];
                    case 1:
                        _g.sent();
                        this.resizeToCurrentMode();
                        (_a = this.window) === null || _a === void 0 ? void 0 : _a.on("close", function (e) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, _a, e_2, e_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 5, , 6]);
                                        if (!this.quitInProgress && this.settings.getContinueRunningInTray()) {
                                            e.preventDefault();
                                            this.hide(false, true);
                                            return [2 /*return*/, false];
                                        }
                                        _i = 0, _a = this.windowsToDestroy();
                                        _b.label = 1;
                                    case 1:
                                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                                        e_2 = _a[_i];
                                        if (!e_2) return [3 /*break*/, 3];
                                        return [4 /*yield*/, Promise.resolve(e_2)];
                                    case 2:
                                        (_b.sent()).destroy();
                                        _b.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4:
                                        electron_1.app.quit();
                                        return [3 /*break*/, 6];
                                    case 5:
                                        e_1 = _b.sent();
                                        return [3 /*break*/, 6];
                                    case 6: return [2 /*return*/, true];
                                }
                            });
                        }); });
                        (_b = this.window) === null || _b === void 0 ? void 0 : _b.on("minimize", function (e) {
                            _this.hide(true);
                        });
                        (_c = this.window) === null || _c === void 0 ? void 0 : _c.on("move", function (e) {
                            _this.windowMoved();
                        });
                        (_d = this.window) === null || _d === void 0 ? void 0 : _d.on("resize", function (e) {
                            if (_this.resizeCallbackEnabled) {
                                _this.windowMoved();
                            }
                        });
                        (_e = this.window) === null || _e === void 0 ? void 0 : _e.on("show", function (e) {
                            _this.show(true);
                        });
                        (_f = this.window) === null || _f === void 0 ? void 0 : _f.on("restore", function (e) {
                            _this.show(true);
                        });
                        electron_1.app.on("activate", function (_event, hasVisibleWindows) {
                            if (!hasVisibleWindows) {
                                _this.show();
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    MainWindow.prototype.defaultClose = function () {
        return false;
    };
    MainWindow.prototype.height = function () {
        if (this.settings.getMiniMode()) {
            return this.miniModeHeight;
        }
        return Math.max(this.minHeight(), this.settings.getBounds().height);
    };
    MainWindow.prototype.hide = function (windowAlreadyHidden, removeFromDock) {
        var _a, _b;
        if (windowAlreadyHidden === void 0) { windowAlreadyHidden = false; }
        if (removeFromDock === void 0) { removeFromDock = false; }
        if (!this.isShown) {
            return;
        }
        if (removeFromDock && electron_1.app.dock) {
            (_a = this.window) === null || _a === void 0 ? void 0 : _a.setSkipTaskbar(true);
            if (electron_1.app.dock) {
                electron_1.app.dock.hide();
            }
        }
        this.isShown = false;
        this.updateTray();
        if (!windowAlreadyHidden) {
            (_b = this.window) === null || _b === void 0 ? void 0 : _b.minimize();
        }
        var miniModeWindow = this.miniModeWindow();
        if (miniModeWindow) {
            miniModeWindow.show();
            miniModeWindow.snapToMain();
        }
        this.app.clearAlternativesAndShowExamples();
    };
    MainWindow.prototype.main = function () {
        return true;
    };
    MainWindow.prototype.minHeight = function () {
        if (!this.settings.getToken()) {
            return this.loggedOutHeight;
        }
        if (this.settings.getMiniMode()) {
            return this.miniModeHeight;
        }
        return this.expandedHeight;
    };
    MainWindow.prototype.minWidth = function () {
        return this.settings.getToken() ? this.loggedInWidth : this.loggedOutWidth;
    };
    MainWindow.prototype.position = function () {
        var bounds = this.settings.getBounds();
        var currentDisplayArea = electron_1.screen.getDisplayMatching(bounds).workArea;
        if (bounds.x < currentDisplayArea.x ||
            bounds.y < currentDisplayArea.y ||
            bounds.x > currentDisplayArea.x + currentDisplayArea.width ||
            bounds.y > currentDisplayArea.y + currentDisplayArea.height) {
            bounds.x = currentDisplayArea.x;
            bounds.y = currentDisplayArea.y;
        }
        return { x: bounds.x, y: bounds.y };
    };
    MainWindow.prototype.resizeToCurrentMode = function (resetToDefault) {
        if (resetToDefault === void 0) { resetToDefault = false; }
        if (!this.window) {
            return;
        }
        this.window.setMinimumSize(this.minWidth(), this.minHeight());
        this.window.setMaximumSize(2000, this.settings.getMiniMode() ? this.miniModeHeight : 2000);
        this.window.setSize(resetToDefault ? this.minWidth() : this.width(), resetToDefault ? this.minHeight() : this.height(), true);
        this.saveBounds();
    };
    MainWindow.prototype.show = function (windowAlreadyShown) {
        var _a;
        if (windowAlreadyShown === void 0) { windowAlreadyShown = false; }
        if (this.isShown) {
            return;
        }
        (_a = this.window) === null || _a === void 0 ? void 0 : _a.setSkipTaskbar(false);
        if (electron_1.app.dock) {
            electron_1.app.dock.show();
        }
        this.isShown = true;
        this.updateTray();
        if (!windowAlreadyShown && this.window) {
            if (this.window.isMinimized()) {
                this.window.restore();
            }
            this.window.showInactive();
        }
        var miniModeWindow = this.miniModeWindow();
        if (miniModeWindow) {
            if (this.settings.getMiniMode()) {
                miniModeWindow.show();
            }
            else {
                miniModeWindow.hide();
            }
        }
        this.app.clearAlternativesAndShowExamples();
    };
    MainWindow.prototype.quit = function () {
        this.quitInProgress = true;
        // suppress errors that might occur while closing the app
        try {
            electron_1.app.quit();
        }
        catch (e) { }
    };
    MainWindow.prototype.title = function () {
        return "ArqonMaestro";
    };
    MainWindow.prototype.updateTray = function () {
        var _this = this;
        var mac = os.platform() == "darwin";
        var trayIcon = mac ? "/img/MacOSTrayTemplate.png" : "/img/Tray.png";
        if (this.chunkManager() && this.chunkManager().listening) {
            trayIcon = mac ? "/img/MacOSTrayListeningTemplate.png" : "/img/TrayListening.png";
        }
        trayIcon = path.join(__dirname, "..", "static", trayIcon);
        if (!this.tray) {
            this.tray = new electron_1.Tray(trayIcon);
        }
        this.tray.setImage(trayIcon);
        var menu = [];
        menu.push({ label: "ArqonMaestro ".concat(this.metadata.version), enabled: false });
        menu.push({ type: "separator" });
        if (this.shown()) {
            menu.push({
                label: "Hide ArqonMaestro",
                click: function (_menuItem, _browserWindow, _event) {
                    _this.hide(false);
                }
            });
        }
        else {
            menu.push({
                label: "Show ArqonMaestro",
                click: function (_menuItem, _browserWindow, _event) {
                    _this.show();
                }
            });
        }
        menu.push({
            label: "Quit",
            click: function (_menuItem, _browserWindow, _event) {
                _this.quit();
            }
        });
        this.tray.setContextMenu(electron_1.Menu.buildFromTemplate(menu));
        if (!mac) {
            this.tray.setTitle("ArqonMaestro");
            if (this.tray.listenerCount("click") == 0) {
                this.tray.on("click", function () {
                    _this.show();
                });
            }
        }
    };
    MainWindow.prototype.url = function () {
        return "";
    };
    MainWindow.prototype.width = function () {
        return Math.max(this.minWidth(), this.settings.getBounds().width);
    };
    return MainWindow;
}(window_1["default"]));
exports["default"] = MainWindow;
