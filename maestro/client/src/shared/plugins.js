"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.plugins = void 0;
var atom_png_1 = __importDefault(require("../../static/img/atom.png"));
var vscode_png_1 = __importDefault(require("../../static/img/vscode.png"));
var jetbrains_png_1 = __importDefault(require("../../static/img/jetbrains.png"));
var hyper_png_1 = __importDefault(require("../../static/img/hyper.png"));
var iterm_png_1 = __importDefault(require("../../static/img/iterm.png"));
var chrome_png_1 = __importDefault(require("../../static/img/chrome.png"));
var edge_png_1 = __importDefault(require("../../static/img/edge.png"));
exports.plugins = {
    atom: {
        name: "Atom",
        icon: atom_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro"
    },
    vscode: {
        name: "VS Code",
        icon: vscode_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro/tree/main/vscode-plugin"
    },
    jetbrains: {
        name: "JetBrains",
        icon: jetbrains_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro"
    },
    hyper: {
        name: "Hyper",
        icon: hyper_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro"
    },
    iterm: {
        name: "iTerm",
        icon: iterm_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro"
    },
    chrome: {
        name: "Chrome",
        icon: chrome_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro"
    },
    edge: {
        name: "Edge",
        icon: edge_png_1["default"],
        url: "https://github.com/novelbytelabs/ArqonMaestro"
    }
};
