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
var os = __importStar(require("os"));
var driver = __importStar(require("../driver/stub"));
var System = /** @class */ (function () {
    function System(settings) {
        this.settings = settings;
        // some applications don't have what they're commonly referred to in their application bundle,
        // so create a set of aliases to allow people to refer to apps more naturally
        this.aliases = {
            terminal: "term",
            vscode: "code",
            "visual studio code": "code"
        };
    }
    System.prototype.applicationMatches = function (application, possible) {
        var alias = application.toLowerCase();
        if (this.aliases[alias]) {
            alias = this.aliases[alias];
        }
        return possible.filter(function (e) {
            return e.toLowerCase().includes(application.toLowerCase()) ||
                e.toLowerCase().includes(application.toLowerCase().replace(/\s/g, "")) ||
                e.toLowerCase().includes(alias);
        });
    };
    System.prototype.click = function (button, count) {
        if (button === void 0) { button = "left"; }
        if (count === void 0) { count = 1; }
        return driver.click(button, count);
    };
    System.prototype.clickable = function () {
        return driver.getClickableButtons();
    };
    System.prototype.clickButton = function (name) {
        return driver.clickButton(name);
    };
    System.prototype.copy = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pressKey("c", os.platform() == "darwin" ? ["command"] : ["control"])];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.delay(300)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    System.prototype.determineActiveApplication = function () {
        return __awaiter(this, void 0, void 0, function () {
            var rawResult, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, driver.getActiveApplication()];
                    case 1:
                        rawResult = _a.sent();
                        result = String(rawResult || "").toLowerCase();
                        if (result === "system dialog") {
                            return [2 /*return*/, "system dialog"];
                        }
                        else if (result.includes("atom")) {
                            return [2 /*return*/, "atom"];
                        }
                        else if (result.includes("visualstudiocode") ||
                            result.includes("visual studio code") ||
                            result.includes("vs code") ||
                            result.includes("vscode") ||
                            result.includes("code/code") ||
                            result.includes("code--unity-launch") ||
                            (result.split(" ").length > 0 && result.split(" ")[0].endsWith("code")) ||
                            (result.split("/").length > 0 && result.split("/")[0].endsWith("code"))) {
                            return [2 /*return*/, "vscode"];
                        }
                        else if (result.includes("jetbrains") ||
                            result.includes("androidstudio") ||
                            result.includes("appcode") ||
                            result.includes("clion") ||
                            result.includes("datagrip") ||
                            result.includes("goland") ||
                            result.includes("intellij") ||
                            result.includes("phpstorm") ||
                            result.includes("pycharm") ||
                            result.includes("rider") ||
                            result.includes("rubymine") ||
                            result.includes("resharper") ||
                            result.includes("webstorm")) {
                            return [2 /*return*/, "jetbrains"];
                        }
                        else if (result.includes("chrome") ||
                            result.includes("chromium") ||
                            result.includes("brave")) {
                            return [2 /*return*/, "chrome"];
                        }
                        else if (result.includes("firefox")) {
                            return [2 /*return*/, "firefox"];
                        }
                        else if (result.includes("safari")) {
                            return [2 /*return*/, "safari"];
                        }
                        else if (result.includes("edge")) {
                            return [2 /*return*/, "edge"];
                        }
                        else if (result.includes("hyper")) {
                            return [2 /*return*/, "hyper"];
                        }
                        else if (result.includes("iterm")) {
                            return [2 /*return*/, "iterm"];
                        }
                        else if (this.isTerminal(result)) {
                            return [2 /*return*/, "terminal"];
                        }
                        else if (result.includes("slack")) {
                            return [2 /*return*/, "slack"];
                        }
                        else if (result.includes("electron") ||
                            result.includes("serenade") ||
                            result.includes("arqon") ||
                            result.includes("arqonmaestro")) {
                            return [2 /*return*/, "arqonmaestro"];
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    System.prototype.getClipboard = function () {
        return electron_1.clipboard.readText();
    };
    System.prototype.getEditorStateWithAccessibilityApi = function () {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, driver.getEditorState()];
                    case 1:
                        state = _a.sent();
                        return [2 /*return*/, {
                                source: state.text,
                                cursor: state.cursor,
                                error: state.error
                            }];
                }
            });
        });
    };
    System.prototype.focus = function (application) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, driver.focusApplication(application, this.aliases)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.delay(300)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.installedApplications = function () {
        return driver.getInstalledApplications();
    };
    System.prototype.isTerminal = function (app) {
        return (app.includes("alacritty") ||
            app.includes("bash") ||
            app.includes("hyper") ||
            app.includes("iterm") ||
            app.includes("mintty") ||
            app.includes("msys2") ||
            app.includes("powershell") ||
            app.includes("putty") ||
            app.includes("shell") ||
            app.includes("terminal") ||
            app.includes("terminator") ||
            app.includes("warp") ||
            app.includes("xterm"));
    };
    System.prototype.launch = function (application) {
        try {
            return driver.launchApplication(application, this.aliases);
        }
        catch (e) { }
    };
    System.prototype.paste = function (app) {
        if (app === void 0) { app = ""; }
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = this.settings.getPasteKeys(app);
                        return [4 /*yield*/, this.pressKey(data.key, data.modifiers)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.delay(100)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.pressKey = function (key, modifiers, count) {
        if (modifiers === void 0) { modifiers = []; }
        if (count === void 0) { count = 1; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, driver.pressKey(key, modifiers, count)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.delay(50)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.quit = function (application) {
        return driver.quitApplication(application, this.aliases);
    };
    System.prototype.runningApplications = function () {
        return driver
            .getRunningApplications()
            .then(function (applications) {
            return applications.filter(function (e) { return !e.includes("coreservices") && !e.includes("privateframeworks"); });
        });
    };
    System.prototype.selectAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.pressKey("a", os.platform() == "darwin" ? ["command"] : ["control"])];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.delay(300)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.setClipboard = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        electron_1.clipboard.writeText(text);
                        return [4 /*yield*/, this.delay(100)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.typeText = function (text, app) {
        if (!text) {
            return;
        }
        if (!this.isTerminal(app) && this.settings.getClipboardInsert()) {
            return this.typeTextWithClipboard(text, app);
        }
        else {
            return this.typeTextWithKeystrokes(text);
        }
    };
    System.prototype.typeTextWithClipboard = function (text, app) {
        return __awaiter(this, void 0, void 0, function () {
            var previous;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        previous = this.getClipboard();
                        return [4 /*yield*/, this.setClipboard(text)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.paste(app)];
                    case 2:
                        _a.sent();
                        this.setClipboard(previous);
                        return [2 /*return*/];
                }
            });
        });
    };
    System.prototype.typeTextWithKeystrokes = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, driver.typeText(text)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.delay(50)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return System;
}());
exports["default"] = System;
