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
var core_1 = require("../gen/core");
var alternatives_1 = require("../shared/alternatives");
var chrome_basics_json_1 = __importDefault(require("../tutorials/chrome-basics.json"));
var cplusplus_basics_json_1 = __importDefault(require("../tutorials/cplusplus-basics.json"));
var csharp_basics_json_1 = __importDefault(require("../tutorials/csharp-basics.json"));
var formatting_json_1 = __importDefault(require("../tutorials/formatting.json"));
var go_basics_json_1 = __importDefault(require("../tutorials/go-basics.json"));
var java_basics_json_1 = __importDefault(require("../tutorials/java-basics.json"));
var javascript_advanced_json_1 = __importDefault(require("../tutorials/javascript-advanced.json"));
var javascript_basics_json_1 = __importDefault(require("../tutorials/javascript-basics.json"));
var navigation_json_1 = __importDefault(require("../tutorials/navigation.json"));
var python_advanced_json_1 = __importDefault(require("../tutorials/python-advanced.json"));
var python_basics_json_1 = __importDefault(require("../tutorials/python-basics.json"));
var ruby_basics_json_1 = __importDefault(require("../tutorials/ruby-basics.json"));
var rust_basics_json_1 = __importDefault(require("../tutorials/rust-basics.json"));
var tutorialSteps = {
    "chrome-basics": chrome_basics_json_1["default"],
    "cplusplus-basics": cplusplus_basics_json_1["default"],
    "csharp-basics": csharp_basics_json_1["default"],
    "go-basics": go_basics_json_1["default"],
    formatting: formatting_json_1["default"],
    "java-basics": java_basics_json_1["default"],
    "javascript-advanced": javascript_advanced_json_1["default"],
    "javascript-basics": javascript_basics_json_1["default"],
    navigation: navigation_json_1["default"],
    "python-advanced": python_advanced_json_1["default"],
    "python-basics": python_basics_json_1["default"],
    "ruby-basics": ruby_basics_json_1["default"],
    "rust-basics": rust_basics_json_1["default"]
};
var NUX = /** @class */ (function () {
    function NUX(active, app, bridge, mainWindow, miniModeWindow, pluginManager, settings) {
        this.active = active;
        this.app = app;
        this.bridge = bridge;
        this.mainWindow = mainWindow;
        this.miniModeWindow = miniModeWindow;
        this.pluginManager = pluginManager;
        this.settings = settings;
        this.index = 0;
        this.nextButtonEnabled = false;
        this.showingError = false;
    }
    NUX.prototype.alternativeMatchesCurrentStep = function (alternative, state) {
        if (!this.tutorial) {
            return false;
        }
        var step = this.tutorial.steps[this.index];
        var nextStep = this.tutorial.steps[this.index + 1];
        return (alternative.transcript == step.transcript ||
            alternative.description == step.transcript ||
            (!!step.matches && step.matches.indexOf(alternative.description) > -1) ||
            (!step.textOnly &&
                !!nextStep.source &&
                state.source === nextStep.source &&
                state.cursor === nextStep.cursor));
    };
    NUX.prototype.indexToString = function (i) {
        if (i == 1) {
            return "one";
        }
        else if (i == 2) {
            return "two";
        }
        else if (i == 3) {
            return "three";
        }
        else if (i == 4) {
            return "four";
        }
        else if (i == 5) {
            return "five";
        }
        else if (i == 6) {
            return "six";
        }
        else if (i == 7) {
            return "seven";
        }
        else if (i == 8) {
            return "eight";
        }
        else if (i == 9) {
            return "nine";
        }
        else if (i == 10) {
            return "ten";
        }
        else if (i == 11) {
            return "eleven";
        }
        else if (i == 12) {
            return "twelve";
        }
        else if (i == 13) {
            return "thirteen";
        }
        else if (i == 14) {
            return "fourteen";
        }
        else if (i == 15) {
            return "fifteen";
        }
        else if (i == 16) {
            return "sixteen";
        }
        else if (i == 17) {
            return "seventeen";
        }
        else if (i == 18) {
            return "eighteen";
        }
        else if (i == 19) {
            return "nineteen";
        }
        else if (i == 20) {
            return "twenty";
        }
        return "";
    };
    NUX.prototype.showError = function (title, body) {
        this.showingError = true;
        this.setNextButtonEnabled(false);
        this.bridge.setState({
            nuxStep: {
                title: title,
                body: body,
                error: true
            }
        }, [this.mainWindow, this.miniModeWindow]);
    };
    NUX.prototype.verifyEditorFocusAndFilename = function () {
        if (!this.tutorial) {
            return;
        }
        var step = this.tutorial.steps[this.index];
        if (!step || step.skipEditorFocus) {
            return;
        }
        if (step.nextWhenEditorFocused) {
            this.setNextButtonEnabled(this.active.pluginConnected());
            return;
        }
        // don't show this message during setup steps, because they have descriptions telling
        // you in more detail what this means
        var setupStep = step.nextWhenEditorFocused || step.nextWhenEditorFilename;
        if (!this.active.pluginConnected() && !setupStep) {
            this.showError(step.title, "<p>To continue the tutorial, make sure the ArqonMaestro plugin is installed and your editor has focus!</p>");
            return;
        }
        if (this.tutorial.filename) {
            var active = this.active.filename.split(".");
            var required = this.tutorial.filename.split(".");
            var matches = active[active.length - 1] == required[required.length - 1];
            if (step.nextWhenEditorFilename) {
                this.setNextButtonEnabled(matches);
                return;
            }
            if (!matches && !setupStep) {
                this.showError(step.title, "<p>To continue the tutorial, make sure you have a .".concat(required[required.length - 1], " file open and your editor is focused!</p>"));
                return;
            }
        }
        if (this.showingError) {
            this.showingError = false;
            this.showCurrentStep();
        }
    };
    NUX.prototype.back = function (voice) {
        if (voice === void 0) { voice = false; }
        if (this.index == 0 || this.settings.getNuxCompleted() || !this.tutorial) {
            return;
        }
        if (voice &&
            this.active.isFirstPartyBrowser() &&
            this.tutorial.steps[this.index].transcript == "back") {
            return;
        }
        this.index--;
        this.showCurrentStep();
    };
    NUX.prototype.complete = function () {
        this.settings.setNuxTutorialName("");
        this.settings.setNuxStep(0);
        this.settings.setNuxCompleted(true);
        this.app.clearAlternativesAndShowExamples();
        this.bridge.setState({
            nuxCompleted: true,
            nuxTutorial: ""
        }, [this.mainWindow, this.miniModeWindow]);
        if (this.verifyEditorInterval) {
            clearInterval(this.verifyEditorInterval);
            this.verifyEditorInterval = undefined;
        }
    };
    NUX.prototype.load = function (name) {
        var _this = this;
        this.tutorial = tutorialSteps[name];
        if (this.verifyEditorInterval) {
            clearInterval(this.verifyEditorInterval);
            this.verifyEditorInterval = undefined;
        }
        this.settings.setNuxTutorialName(name);
        this.settings.setNuxCompleted(false);
        this.index = this.settings.getNuxStep();
        this.showingError = false;
        this.showCurrentStep();
        this.verifyEditorInterval = global.setInterval(function () {
            _this.verifyEditorFocusAndFilename();
        }, 500);
        this.bridge.setState({
            nuxCompleted: false,
            nuxTutorial: name
        }, [this.mainWindow, this.miniModeWindow]);
    };
    NUX.prototype.next = function () {
        this.index++;
        this.settings.setNuxStep(Math.max(this.index, this.settings.getNuxStep()));
        this.showCurrentStep();
    };
    NUX.prototype.setEditorStateToStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var state;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.settings.getNuxCompleted() || !this.tutorial || step.source === undefined) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        state.source = state.source.toString();
                        if (state.source != step.source || state.cursor != step.cursor) {
                            this.pluginManager.sendCommandToApp(this.active.app, {
                                type: core_1.core.CommandType.COMMAND_TYPE_DIFF,
                                source: step.source,
                                cursor: step.cursor
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    NUX.prototype.setNextButtonEnabled = function (enabled) {
        this.nextButtonEnabled = enabled;
        this.bridge.setState({
            nuxNextButtonEnabled: enabled
        }, [this.mainWindow, this.miniModeWindow]);
    };
    NUX.prototype.showIfNeeded = function () {
        if (!this.settings.getNuxCompleted() && this.settings.getNuxTutorialName()) {
            this.load(this.settings.getNuxTutorialName());
        }
    };
    NUX.prototype.showCurrentStep = function () {
        return __awaiter(this, void 0, void 0, function () {
            var step;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.tutorial || this.showingError || this.settings.getNuxCompleted()) {
                    return [2 /*return*/];
                }
                if (this.index == this.tutorial.steps.length) {
                    this.complete();
                    return [2 /*return*/];
                }
                step = this.tutorial.steps[this.index];
                if (!step) {
                    this.complete();
                    return [2 /*return*/];
                }
                step.index = this.index;
                this.setEditorStateToStep(step);
                this.setNextButtonEnabled(!step.nextWhenEditorFocused &&
                    !step.nextWhenEditorFilename &&
                    (!step.transcript || step.textOnly || this.index < this.settings.getNuxStep()));
                if (this.settings.getMiniMode()) {
                    this.mainWindow.resizeCallbackEnabled = false;
                }
                this.bridge.setState({
                    nuxHintShown: false,
                    nuxStep: step
                }, [this.mainWindow, this.miniModeWindow]);
                // Keep applying this idempotent operation until calculation of the
                // size is right. It's really unclear why electron gives us an incorrect
                // size the first couple times.
                if (this.settings.getMiniMode()) {
                    setTimeout(function () {
                        _this.miniModeWindow.setHeight(500);
                        setTimeout(function () {
                            _this.miniModeWindow.show();
                            _this.bridge.send("updateMiniModeWindowHeight", {}, [_this.miniModeWindow]);
                            _this.mainWindow.resizeCallbackEnabled = true;
                        }, 50);
                    }, 50);
                }
                return [2 /*return*/];
            });
        });
    };
    NUX.prototype.updateForResponse = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var step, state, correct, valid, i, commands, source;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!response || !this.tutorial || this.showingError || this.settings.getNuxCompleted()) {
                            return [2 /*return*/];
                        }
                        step = this.tutorial.steps[this.index];
                        if (!step) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.active.getEditorState()];
                    case 1:
                        state = _a.sent();
                        state.source = state.source.toString();
                        if (response.execute &&
                            (this.alternativeMatchesCurrentStep(response.execute, state) ||
                                (this.nextButtonEnabled && !this.showingError && response.execute.transcript == "next"))) {
                            this.next();
                            return [2 /*return*/];
                        }
                        correct = null;
                        valid = (response.alternatives || []).filter(function (e) {
                            return (0, alternatives_1.isValidAlternative)(e);
                        });
                        for (i = 0; i < valid.length; i++) {
                            if (this.alternativeMatchesCurrentStep(valid[i], state)) {
                                correct = i;
                                break;
                            }
                        }
                        // in quiz mode, allow the user to explore more, possibly using multiple commands to achieve
                        // the desired editor state
                        if (!step.hideAnswer) {
                            if (correct != null && correct > 0) {
                                this.bridge.setState({
                                    nuxStep: {
                                        title: step.title,
                                        body: "<p>Now, select a different alternative by saying:</p>",
                                        transcript: this.indexToString(correct + 1)
                                    }
                                }, [this.mainWindow, this.miniModeWindow]);
                                return [2 /*return*/];
                            }
                            if (response.execute && response.execute.commands && !step.skipEditorFocus) {
                                commands = response.execute.commands.filter(function (e) { return e.type == core_1.core.CommandType.COMMAND_TYPE_DIFF; });
                                if (commands.length > 0) {
                                    source = commands[commands.length - 1].source;
                                    if (step && step.transcript && step.source != source) {
                                        this.bridge.setState({
                                            nuxStep: {
                                                title: "Undo",
                                                body: "<p>To get your editor back to where it was before, say:</p>",
                                                transcript: "undo",
                                                error: true
                                            }
                                        }, [this.mainWindow, this.miniModeWindow]);
                                        return [2 /*return*/];
                                    }
                                }
                            }
                        }
                        // enable the next button if the user said something that didn't match,
                        // so they can skip this step if they can't get it to work
                        if (!response.execute || (response.execute && response.execute.transcript != "next")) {
                            this.setNextButtonEnabled(true);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return NUX;
}());
exports["default"] = NUX;
