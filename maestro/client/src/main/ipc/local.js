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
var electron_fetch_1 = __importDefault(require("electron-fetch"));
var child_process = __importStar(require("child_process"));
var fs = __importStar(require("fs-extra"));
var os = __importStar(require("os"));
var path = __importStar(require("path"));
var semver = __importStar(require("semver"));
var commandExists = require("command-exists");
var Local = /** @class */ (function () {
    function Local(bridge, log, mainWindow, metadata, settings) {
        this.bridge = bridge;
        this.log = log;
        this.mainWindow = mainWindow;
        this.metadata = metadata;
        this.settings = settings;
        this.processes = {};
        this.logStreams = {};
        this.started = false;
        this.startupHealthy = false;
        this.consecutiveHealthFailures = 0;
        this.recovering = false;
        this.recoveryAttempts = 0;
        this.maxRecoveryAttempts = 5;
    }
    Local.prototype.captureOutput = function (service, child) {
        if (this.logStreams[service]) {
            return;
        }
        var stream = fs.createWriteStream(path.join(this.settings.path(), "".concat(service, ".log")));
        child.stdout.pipe(stream);
        child.stderr.pipe(stream);
        this.logStreams[service] = stream;
    };
    Local.prototype.killAll = function () {
        for (var _i = 0, _a = Object.values(this.processes); _i < _a.length; _i++) {
            var e = _a[_i];
            if (e) {
                this.killProcess(e);
            }
        }
        for (var _b = 0, _c = Object.values(this.logStreams); _b < _c.length; _b++) {
            var e = _c[_b];
            if (e) {
                e.end();
            }
        }
        this.processes = {};
        this.logStreams = {};
        this.pkill("arqon-maestro-speech-engine");
        this.pkill("arqon-maestro-code-engine");
        this.pkill("arqon-maestro-core");
        this.pkill("serenade-speech-engine");
        this.pkill("serenade-code-engine");
        this.pkill("serenade-core");
        this.pkill("run-pro");
    };
    Local.prototype.killProcess = function (child) {
        if (child) {
            child.kill("SIGTERM");
        }
    };
    Local.prototype.pkill = function (name) {
        try {
            if (os.platform() == "win32") {
                child_process.spawnSync("wsl.exe", ["pkill", "-f", name]);
            }
            else {
                child_process.spawnSync("pkill", ["-f", name]);
            }
        }
        catch (e) { }
    };
    Local.prototype.stopPolling = function () {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = undefined;
        }
        if (this.localStartTimeout) {
            clearTimeout(this.localStartTimeout);
            this.localStartTimeout = undefined;
        }
    };
    Local.prototype.servicesHealthy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, speechResponse, codeResponse, _b, speechHealthy, codeHealthy, _e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.all([
                                (0, electron_fetch_1["default"])("http://localhost:17202/api/status", { method: "GET", timeout: 1500 }),
                                (0, electron_fetch_1["default"])("http://localhost:17203/api/status", { method: "GET", timeout: 1500 }),
                            ])];
                    case 1:
                        _a = _c.sent(), speechResponse = _a[0], codeResponse = _a[1];
                        if (!speechResponse.ok || !codeResponse.ok) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, Promise.all([
                                speechResponse.json(),
                                codeResponse.json(),
                            ])];
                    case 2:
                        _b = _c.sent(), speechHealthy = _b[0], codeHealthy = _b[1];
                        return [2 /*return*/, !!speechHealthy && !!codeHealthy];
                    case 3:
                        _e_1 = _c.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Local.prototype.setLocalState = function (localLoading, backendIssue) {
        if (backendIssue === void 0) { backendIssue = ""; }
        this.bridge.setState({
            backendIssue: backendIssue,
            localLoading: localLoading
        }, [this.mainWindow]);
    };
    Local.prototype.failStartup = function (message) {
        this.log.logError(new Error(message));
        this.started = false;
        this.startupHealthy = false;
        this.consecutiveHealthFailures = 0;
        this.recovering = false;
        this.recoveryAttempts = 0;
        this.stopPolling();
        this.killAll();
        this.setLocalState(false, message);
    };
    Local.prototype.scheduleRecovery = function (reason) {
        var _this = this;
        if (this.recovering || !this.started) {
            return;
        }
        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            this.failStartup("Local backend became unstable and exceeded recovery attempts (".concat(this.maxRecoveryAttempts, "). Last reason: ").concat(reason));
            return;
        }
        this.recovering = true;
        this.recoveryAttempts += 1;
        var attempt = this.recoveryAttempts;
        this.log.logError(new Error("Local backend unhealthy: ".concat(reason, ". Attempting recovery ").concat(attempt, "/").concat(this.maxRecoveryAttempts, ".")));
        this.setLocalState(true, "Local backend disconnected. Attempting recovery ".concat(attempt, "/").concat(this.maxRecoveryAttempts, "..."));
        this.started = false;
        this.stopPolling();
        this.killAll();
        global.setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.recovering = false;
                        return [4 /*yield*/, this.start()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); }, Math.min(1000 * attempt, 5000));
    };
    Local.prototype.localPath = function () {
        var parts = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            parts[_i] = arguments[_i];
        }
        return path.join.apply(path, __spreadArray([__dirname, "..", "static", "local"], parts, false));
    };
    Local.prototype.processCommandLine = function (pid) {
        try {
            var cmdline = fs.readFileSync("/proc/".concat(pid, "/cmdline"));
            return cmdline.toString("utf8").replace(/\0/g, " ").trim();
        }
        catch (_e) {
            return "";
        }
    };
    Local.prototype.listeningPids = function (port) {
        var _a, _b;
        if (os.platform() == "win32") {
            return [];
        }
        try {
            var result = child_process.spawnSync("ss", ["-ltnp"]);
            var output = "".concat(((_a = result.stdout) === null || _a === void 0 ? void 0 : _a.toString()) || "", "\n").concat(((_b = result.stderr) === null || _b === void 0 ? void 0 : _b.toString()) || "");
            var pattern = new RegExp(":".concat(port, "\\s"));
            var pids = [];
            for (var _i = 0, _c = output.split("\n"); _i < _c.length; _i++) {
                var line = _c[_i];
                if (!pattern.test(line)) {
                    continue;
                }
                var regex = /pid=(\d+)/g;
                var match = void 0;
                while ((match = regex.exec(line)) != null) {
                    var pid = parseInt(match[1], 10);
                    if (!isNaN(pid)) {
                        pids.push(pid);
                    }
                }
            }
            return __spreadArray([], new Set(pids), true);
        }
        catch (_e) {
            return [];
        }
    };
    Local.prototype.ensurePortsAvailable = function () {
        var _this = this;
        var ports = [17202, 17203];
        for (var _i = 0, ports_1 = ports; _i < ports_1.length; _i++) {
            var port = ports_1[_i];
            var initialPids = this.listeningPids(port);
            for (var _a = 0, initialPids_1 = initialPids; _a < initialPids_1.length; _a++) {
                var pid = initialPids_1[_a];
                var cmdline = this.processCommandLine(pid);
                if (cmdline.includes("arqon-maestro-speech-engine") ||
                    cmdline.includes("arqon-maestro-code-engine") ||
                    cmdline.includes("serenade-speech-engine") ||
                    cmdline.includes("serenade-code-engine") ||
                    cmdline.includes("run-pro")) {
                    try {
                        process.kill(pid, "SIGTERM");
                    }
                    catch (_e) { }
                }
            }
            // Give graceful shutdown a moment, then force-kill lingering local engine processes.
            if (initialPids.length > 0) {
                child_process.spawnSync("sleep", ["1"]);
            }
            var afterTermPids = this.listeningPids(port);
            for (var _b = 0, afterTermPids_1 = afterTermPids; _b < afterTermPids_1.length; _b++) {
                var pid = afterTermPids_1[_b];
                var cmdline = this.processCommandLine(pid);
                if (cmdline.includes("arqon-maestro-speech-engine") ||
                    cmdline.includes("arqon-maestro-code-engine") ||
                    cmdline.includes("serenade-speech-engine") ||
                    cmdline.includes("serenade-code-engine") ||
                    cmdline.includes("run-pro")) {
                    try {
                        process.kill(pid, "SIGKILL");
                    }
                    catch (_e) { }
                }
            }
            var remainingPids = this.listeningPids(port);
            if (remainingPids.length > 0) {
                var owners = remainingPids
                    .map(function (pid) {
                    var cmdline = _this.processCommandLine(pid) || "unknown";
                    return "".concat(pid, " (").concat(cmdline, ")");
                })
                    .join(", ");
                return "Port ".concat(port, " is already in use by ").concat(owners, ". Stop the conflicting process or switch off local endpoint mode.");
            }
        }
        return undefined;
    };
    Local.prototype.validateLocalBundle = function () {
        var requiredPaths = [
            { label: "speech-engine/run-pro", path: this.localPath("speech-engine", "run-pro") },
            {
                label: "code-engine/run-pro",
                path: this.localPath("code-engine", "run-pro")
            },
            { label: "core/bin/run-pro", path: this.localPath("core", "bin", "run-pro") },
            {
                label: "speech-engine-models",
                path: this.localPath("speech-engine-models")
            },
            {
                label: "code-engine-models",
                path: this.localPath("code-engine-models")
            },
        ];
        var missing = requiredPaths
            .filter(function (entry) { return !fs.existsSync(entry.path); })
            .map(function (entry) { return entry.label; });
        if (missing.length == 0) {
            return undefined;
        }
        return ("Local bundle incomplete: missing " +
            missing.join(", ") +
            ". Run `./gradlew client:installServer -x downloadModels` after installing the native dependencies from `maestro/docs/building.md`.");
    };
    Local.prototype.watchProcess = function (service, child) {
        var _this = this;
        if (!child) {
            return;
        }
        child.once("error", function (error) {
            if (!_this.started || !_this.pollingInterval) {
                return;
            }
            _this.failStartup("".concat(service, " failed during local startup: ").concat(error.message || "unknown process error"));
        });
        child.once("exit", function (code, signal) {
            if (!_this.started || !_this.pollingInterval) {
                return;
            }
            // Some run-pro launchers can exit 0 after handing off to the actual service binary.
            // In that case, verify service health before treating it as a startup failure.
            if ((service == "speech-engine" || service == "code-engine") && code === 0) {
                global.setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                    var url, response, _a, _e_2;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (!this.started || !this.pollingInterval) {
                                    return [2 /*return*/];
                                }
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 5, , 6]);
                                url = service == "speech-engine"
                                    ? "http://localhost:17202/api/status"
                                    : "http://localhost:17203/api/status";
                                return [4 /*yield*/, (0, electron_fetch_1["default"])(url, { method: "GET", timeout: 1500 })];
                            case 2:
                                response = _b.sent();
                                _a = response.ok;
                                if (!_a) return [3 /*break*/, 4];
                                return [4 /*yield*/, response.json()];
                            case 3:
                                _a = (_b.sent());
                                _b.label = 4;
                            case 4:
                                if (_a) {
                                    this.log.logVerbose("".concat(service, " launcher exited with code 0 after successful startup handoff."));
                                    return [2 /*return*/];
                                }
                                return [3 /*break*/, 6];
                            case 5:
                                _e_2 = _b.sent();
                                return [3 /*break*/, 6];
                            case 6:
                                this.failStartup("".concat(service, " exited before local startup completed (exit code 0) and health check failed."));
                                return [2 /*return*/];
                        }
                    });
                }); }, 1500);
                return;
            }
            var exitDetail = code !== null ? "exit code ".concat(code) : signal ? "signal ".concat(signal) : "unknown exit";
            _this.failStartup("".concat(service, " exited before local startup completed (").concat(exitDetail, ")."));
        });
    };
    Local.prototype.pollUntilRunning = function () {
        var _this = this;
        if (this.pollingInterval) {
            return;
        }
        this.setLocalState(true, "");
        this.localStartTimeout = global.setTimeout(function () {
            _this.failStartup("Local backend did not become healthy on :17202/:17203 within 30 seconds. Check `~/.arqon/speech-engine.log` and `~/.arqon/code-engine.log`, then rebuild the local bundle if needed.");
        }, 30000);
        this.pollingInterval = global.setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
            var healthy;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.servicesHealthy()];
                    case 1:
                        healthy = _a.sent();
                        if (healthy) {
                            this.consecutiveHealthFailures = 0;
                            if (!this.startupHealthy) {
                                this.startupHealthy = true;
                                if (this.localStartTimeout) {
                                    clearTimeout(this.localStartTimeout);
                                    this.localStartTimeout = undefined;
                                }
                                this.setLocalState(false, "");
                            }
                            return [2 /*return*/];
                        }
                        this.consecutiveHealthFailures += 1;
                        if (!this.startupHealthy) {
                            return [2 /*return*/];
                        }
                        if (this.consecutiveHealthFailures >= 3) {
                            this.scheduleRecovery("health checks failed three consecutive times");
                        }
                        return [2 /*return*/];
                }
            });
        }); }, 1000);
    };
    Local.prototype.requiresNewerMac = function () {
        return os.platform() == "darwin" && semver.lt(os.release(), "20.0.0");
    };
    Local.prototype.requiresWsl = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = os.platform() == "win32";
                        if (!_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, commandExists("wsl.exe")];
                    case 1:
                        _a = !(_b.sent());
                        _b.label = 2;
                    case 2: return [2 /*return*/, _a];
                }
            });
        });
    };
    Local.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, localBundleIssue, portIssue, speechEngineModels, codeEngineModels;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = this.started;
                        if (_a) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.requiresWsl()];
                    case 1:
                        _a = (_b.sent());
                        _b.label = 2;
                    case 2:
                        if (_a) {
                            return [2 /*return*/];
                        }
                        localBundleIssue = this.validateLocalBundle();
                        if (localBundleIssue) {
                            this.failStartup(localBundleIssue);
                            return [2 /*return*/];
                        }
                        this.started = true;
                        this.startupHealthy = false;
                        this.consecutiveHealthFailures = 0;
                        this.killAll();
                        portIssue = this.ensurePortsAvailable();
                        if (portIssue) {
                            this.failStartup(portIssue);
                            return [2 /*return*/];
                        }
                        this.pollUntilRunning();
                        speechEngineModels = path.join(__dirname, "..", "static", "local", "speech-engine-models");
                        this.log.logVerbose("Initial speech engine model path: " + speechEngineModels);
                        codeEngineModels = path.join(__dirname, "..", "static", "local", "code-engine-models");
                        this.log.logVerbose("Initial code engine model path: " + codeEngineModels);
                        if (os.platform() == "win32") {
                            speechEngineModels =
                                "/" +
                                    child_process
                                        .spawnSync("wsl.exe", [
                                        "wslpath",
                                        "-a",
                                        "'" + speechEngineModels.replace("\\", "\\\\") + "'",
                                    ])
                                        .stdout.toString()
                                        .trim();
                            this.log.logVerbose("WSL speech engine path: " + speechEngineModels);
                            codeEngineModels =
                                "/" +
                                    child_process
                                        .spawnSync("wsl.exe", [
                                        "wslpath",
                                        "-a",
                                        "'" + codeEngineModels.replace("\\", "\\\\") + "'",
                                    ])
                                        .stdout.toString()
                                        .trim();
                            this.log.logVerbose("WSL code engine path: " + codeEngineModels);
                        }
                        // here and below: WSL doesn't deal well with paths, so set the cwd to be the same as the binary
                        this.processes["speech-engine"] = child_process.spawn(os.platform() == "win32" ? "wsl.exe" : "./run-pro", os.platform() == "win32" ? ["./run-pro", speechEngineModels] : [speechEngineModels], {
                            cwd: path.join(__dirname, "..", "static", "local", "speech-engine"),
                            shell: true,
                            windowsHide: true
                        });
                        this.captureOutput("speech-engine", this.processes["speech-engine"]);
                        this.watchProcess("speech-engine", this.processes["speech-engine"]);
                        this.processes["code-engine"] = child_process.spawn(os.platform() == "win32" ? "wsl.exe" : "./run-pro", os.platform() == "win32" ? ["./run-pro", codeEngineModels] : [codeEngineModels], {
                            cwd: path.join(__dirname, "..", "static", "local", "code-engine"),
                            shell: true,
                            windowsHide: true
                        });
                        this.captureOutput("code-engine", this.processes["code-engine"]);
                        this.watchProcess("code-engine", this.processes["code-engine"]);
                        this.processes["core"] = child_process.spawn(os.platform() == "win32" ? "wsl.exe" : "./run-pro", os.platform() == "win32" ? ["./run-pro"] : [], {
                            cwd: path.join(__dirname, "..", "static", "local", "core", "bin"),
                            shell: true,
                            windowsHide: true
                        });
                        this.captureOutput("core", this.processes["core"]);
                        this.watchProcess("core", this.processes["core"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    Local.prototype.stop = function () {
        this.started = false;
        this.startupHealthy = false;
        this.consecutiveHealthFailures = 0;
        this.recovering = false;
        this.recoveryAttempts = 0;
        this.stopPolling();
        this.killAll();
        this.setLocalState(false);
    };
    return Local;
}());
exports["default"] = Local;
