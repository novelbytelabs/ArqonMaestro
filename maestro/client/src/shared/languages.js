"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
exports.__esModule = true;
exports.filenameToLanguage = exports.languages = void 0;
var core_1 = require("../gen/core");
var bash_png_1 = __importDefault(require("../../static/img/bash.png"));
var csharp_png_1 = __importDefault(require("../../static/img/csharp.png"));
var c_png_1 = __importDefault(require("../../static/img/c.png"));
var dart_png_1 = __importDefault(require("../../static/img/dart.png"));
var go_png_1 = __importDefault(require("../../static/img/go.png"));
var html_png_1 = __importDefault(require("../../static/img/html.png"));
var java_png_1 = __importDefault(require("../../static/img/java.png"));
var javascript_png_1 = __importDefault(require("../../static/img/javascript.png"));
var kotlin_png_1 = __importDefault(require("../../static/img/kotlin.png"));
var python_png_1 = __importDefault(require("../../static/img/python.png"));
var ruby_png_1 = __importDefault(require("../../static/img/ruby.png"));
var rust_png_1 = __importDefault(require("../../static/img/rust.png"));
var css_png_1 = __importDefault(require("../../static/img/css.png"));
exports.languages = (_a = {},
    _a[core_1.core.Language.LANGUAGE_BASH] = {
        extensions: ["bash", "sh"],
        icon: bash_png_1["default"],
        name: "Bash",
        styler: core_1.core.StylerType.STYLER_TYPE_EDITOR
    },
    _a[core_1.core.Language.LANGUAGE_CSHARP] = {
        extensions: ["cs", "csharp"],
        icon: csharp_png_1["default"],
        name: "C#",
        styler: core_1.core.StylerType.STYLER_TYPE_CLANG_MICROSOFT
    },
    _a[core_1.core.Language.LANGUAGE_CPLUSPLUS] = {
        extensions: ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++", "c", "h", "cplusplus"],
        icon: c_png_1["default"],
        name: "C/C++",
        styler: core_1.core.StylerType.STYLER_TYPE_CLANG_GOOGLE
    },
    _a[core_1.core.Language.LANGUAGE_DART] = {
        extensions: ["dart"],
        icon: dart_png_1["default"],
        name: "Dart",
        styler: core_1.core.StylerType.STYLER_TYPE_EDITOR
    },
    _a[core_1.core.Language.LANGUAGE_DEFAULT] = {
        extensions: ["json", "md", "rst", "toml", "txt", "yaml", "yml"],
        icon: "",
        name: "Text",
        styler: core_1.core.StylerType.STYLER_TYPE_EDITOR
    },
    _a[core_1.core.Language.LANGUAGE_GO] = {
        extensions: ["go"],
        icon: go_png_1["default"],
        name: "Go",
        styler: core_1.core.StylerType.STYLER_TYPE_GOFMT
    },
    _a[core_1.core.Language.LANGUAGE_HTML] = {
        extensions: ["html", "svelte", "vue", "xml", "xaml"],
        icon: html_png_1["default"],
        name: "HTML",
        styler: core_1.core.StylerType.STYLER_TYPE_PRETTIER
    },
    _a[core_1.core.Language.LANGUAGE_JAVA] = {
        extensions: ["java"],
        icon: java_png_1["default"],
        name: "Java",
        styler: core_1.core.StylerType.STYLER_TYPE_PRETTIER
    },
    _a[core_1.core.Language.LANGUAGE_JAVASCRIPT] = {
        extensions: ["js", "jsx", "ts", "tsx", "typescript"],
        icon: javascript_png_1["default"],
        name: "JavaScript",
        styler: core_1.core.StylerType.STYLER_TYPE_PRETTIER
    },
    _a[core_1.core.Language.LANGUAGE_KOTLIN] = {
        extensions: ["kt"],
        icon: kotlin_png_1["default"],
        name: "Kotlin",
        styler: core_1.core.StylerType.STYLER_TYPE_KTLINT
    },
    _a[core_1.core.Language.LANGUAGE_PYTHON] = {
        extensions: ["py"],
        icon: python_png_1["default"],
        name: "Python",
        styler: core_1.core.StylerType.STYLER_TYPE_BLACK
    },
    _a[core_1.core.Language.LANGUAGE_RUBY] = {
        extensions: ["rb"],
        icon: ruby_png_1["default"],
        name: "Ruby",
        styler: core_1.core.StylerType.STYLER_TYPE_EDITOR
    },
    _a[core_1.core.Language.LANGUAGE_RUST] = {
        extensions: ["rs"],
        icon: rust_png_1["default"],
        name: "Rust",
        styler: core_1.core.StylerType.STYLER_TYPE_RUSTFMT
    },
    _a[core_1.core.Language.LANGUAGE_SCSS] = {
        extensions: ["css", "scss", "less"],
        icon: css_png_1["default"],
        name: "CSS/SCSS",
        styler: core_1.core.StylerType.STYLER_TYPE_PRETTIER
    },
    _a);
var filenameToLanguage = function (filename) {
    for (var _i = 0, _a = Object.keys(exports.languages); _i < _a.length; _i++) {
        var language = _a[_i];
        var k = language;
        if (exports.languages[k] &&
            exports.languages[k].extensions.some(function (e) { return filename.toLowerCase().endsWith("." + e); })) {
            return k;
        }
    }
    return core_1.core.Language.LANGUAGE_DEFAULT;
};
exports.filenameToLanguage = filenameToLanguage;
