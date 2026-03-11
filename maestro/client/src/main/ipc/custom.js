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
var child_process = __importStar(require("child_process"));
var fs = __importStar(require("fs-extra"));
var os = __importStar(require("os"));
var path = __importStar(require("path"));
var Custom = /** @class */ (function () {
    function Custom(settings) {
        this.settings = settings;
        this.primaryServerFilename = "arqon-maestro-custom-commands-server.js";
        this.legacyServerFilename = "serenade-custom-commands-server.min.js";
        this.defaultCustomCommandsFile = "/* ArqonMaestro Custom Commands\n\nIn this file, you can define your own custom commands with the ArqonMaestro API.\n\nFor instance, here's a custom automation that opens your terminal and runs a command:\n\narqon.global().command(\"make\", api => {\n  api.focusApplication(\"terminal\");\n  api.typeText(\"make clean && make\");\n  api.pressKey(\"return\");\n});\n\nAnd, here's a Python snippet for creating a test method:\n\narqon.language(\"python\").snippet(\n  \"test method <%identifier%>\",\n  \"def test_<%identifier%>(self):<%newline%><%indent%>pass\",\n  { \"identifier\": [\"underscores\"] }\n  \"method\"\n);\n\nFor more information, check out the ArqonMaestro API documentation: https://novelbytelabs.github.io/ArqonMaestro/\n\n*/";
    }
    Custom.create = function (settings) {
        return __awaiter(this, void 0, void 0, function () {
            var instance;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        instance = new Custom(settings);
                        return [4 /*yield*/, instance.install()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    Custom.prototype.clearKeepAliveTimeout = function () {
        if (this.keepAliveTimeout) {
            clearTimeout(this.keepAliveTimeout);
            this.keepAliveTimeout = undefined;
        }
    };
    Custom.prototype.connect = function (socket) {
        if (this.socket) {
            return;
        }
        this.socket = socket;
        if (this.resolveStart) {
            this.resolveStart();
            this.resolveStart = undefined;
        }
    };
    Custom.prototype.execute = function (id, matches) {
        this.send("execute", { id: id, matches: matches });
    };
    Custom.prototype.install = function () {
        return __awaiter(this, void 0, void 0, function () {
            var customCommandsFile, _a, server;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, fs.mkdirp(path.join(this.settings.path(), "scripts"))];
                    case 1:
                        _b.sent();
                        customCommandsFile = path.join(this.settings.path(), "scripts", "custom.js");
                        return [4 /*yield*/, fs.pathExists(customCommandsFile)];
                    case 2:
                        _a = !(_b.sent());
                        if (_a) return [3 /*break*/, 4];
                        return [4 /*yield*/, fs.readFile(customCommandsFile, "utf8")];
                    case 3:
                        _a = (_b.sent()) == "";
                        _b.label = 4;
                    case 4:
                        if (!_a) return [3 /*break*/, 6];
                        return [4 /*yield*/, fs.writeFile(customCommandsFile, this.defaultCustomCommandsFile)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        server = path.join(this.settings.path(), "ipc");
                        return [4 /*yield*/, fs.remove(server)];
                    case 7:
                        _b.sent();
                        return [4 /*yield*/, fs.mkdirp(server)];
                    case 8:
                        _b.sent();
                        return [4 /*yield*/, fs.copy(path.join(__dirname, "..", "static", "custom-commands-server", this.primaryServerFilename), path.join(server, this.primaryServerFilename))];
                    case 9:
                        _b.sent();
                        return [4 /*yield*/, fs.copy(path.join(__dirname, "..", "static", "custom-commands-server", this.legacyServerFilename), path.join(server, this.legacyServerFilename))];
                    case 10:
                        _b.sent();
                        return [4 /*yield*/, fs.copy(path.join(__dirname, "static", "custom-commands-server-modules"), "".concat(server, "/node_modules"))];
                    case 11:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Custom.prototype.reload = function () {
        this.send("reload", {});
    };
    Custom.prototype.send = function (message, data) {
        if (!this.socket || this.socket.readyState != 1 || !this.process) {
            return;
        }
        this.socket.send(JSON.stringify({
            message: message,
            data: data
        }));
    };
    Custom.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        // Do not block app startup indefinitely if the custom commands server
                        // can't connect back (e.g. missing sidecar dependencies).
                        var resolved = false;
                        var resolveOnce = function () {
                            if (resolved) {
                                return;
                            }
                            resolved = true;
                            _this.resolveStart = undefined;
                            resolve();
                        };
                        _this.resolveStart = resolveOnce;
                        _this.stop();
                        var stream = fs.createWriteStream(path.join(_this.settings.path(), "arqon.log"));
                        var fallbackNodeModules = path.join(__dirname, "..", "..", "node_modules");
                        var existingNodePath = process.env.NODE_PATH || "";
                        var nodePath = [fallbackNodeModules, existingNodePath].filter(function (e) { return e; }).join(path.delimiter);
                        _this.process = child_process.fork(_this.primaryServerFilename, [], {
                            cwd: path.join(_this.settings.path(), "ipc"),
                            stdio: "pipe",
                            env: __assign(__assign({}, process.env), { NODE_PATH: nodePath })
                        });
                        _this.process.stdout.pipe(stream);
                        _this.process.stderr.pipe(stream);
                        _this.process.on("exit", function () {
                            resolveOnce();
                            _this.process = undefined;
                        });
                        global.setTimeout(function () {
                            resolveOnce();
                        }, 2000);
                        // every 30 seconds, send a keepalive message, and if we don't hear back in 3 seconds,
                        // then restart the custom commands process
                        _this.keepAliveInterval = global.setInterval(function () {
                            _this.send("keepalive", {});
                            _this.keepAliveTimeout = global.setTimeout(function () {
                                if (_this.socket) {
                                    _this.stop();
                                    _this.start();
                                }
                            }, 3000);
                        }, 30000);
                    })];
            });
        });
    };
    Custom.prototype.stop = function () {
        this.clearKeepAliveTimeout();
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = undefined;
        }
        if (this.socket) {
            if (typeof this.socket.terminate === "function") {
                this.socket.terminate();
            }
            else {
                this.socket.close();
            }
            this.socket = undefined;
        }
        if (this.process) {
            this.process.kill("SIGTERM");
            this.process = undefined;
            if (os.platform() != "win32") {
                child_process.spawnSync("pkill", ["-f", "arqon-maestro-custom-commands-server"]);
                child_process.spawnSync("pkill", ["-f", "serenade-custom-commands-server"]);
            }
        }
    };
    return Custom;
}());
exports["default"] = Custom;
