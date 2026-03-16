import { core } from "../gen/core";
import bash from "../../static/img/bash.png";
import csharp from "../../static/img/csharp.png";
import c from "../../static/img/c.png";
import dart from "../../static/img/dart.png";
import go from "../../static/img/go.png";
import html from "../../static/img/html.png";
import java from "../../static/img/java.png";
import javascript from "../../static/img/javascript.png";
import kotlin from "../../static/img/kotlin.png";
import python from "../../static/img/python.png";
import ruby from "../../static/img/ruby.png";
import rust from "../../static/img/rust.png";
import css from "../../static/img/css.png";
import typescript from "../../static/img/typescript.png";

export interface LanguageConfiguration {
  id: core.Language;
  extensions: string[];
  name: string;
  icon: string;
  styler: core.StylerType;
}

const languageConfigs: LanguageConfiguration[] = [
  {
    id: core.Language.LANGUAGE_BASH,
    extensions: ["bash", "sh"],
    icon: bash,
    name: "Bash",
    styler: core.StylerType.STYLER_TYPE_EDITOR,
  },
  {
    id: core.Language.LANGUAGE_CSHARP,
    extensions: ["cs", "csharp"],
    icon: csharp,
    name: "C#",
    styler: core.StylerType.STYLER_TYPE_CLANG_MICROSOFT,
  },
  {
    id: core.Language.LANGUAGE_CPLUSPLUS,
    extensions: ["cpp", "cc", "cxx", "c++", "hpp", "hh", "hxx", "h++", "c", "h", "cplusplus"],
    icon: c,
    name: "C/C++",
    styler: core.StylerType.STYLER_TYPE_CLANG_GOOGLE,
  },
  {
    id: core.Language.LANGUAGE_DART,
    extensions: ["dart"],
    icon: dart,
    name: "Dart",
    styler: core.StylerType.STYLER_TYPE_EDITOR,
  },
  {
    id: core.Language.LANGUAGE_DEFAULT,
    extensions: ["json", "md", "rst", "toml", "txt", "yaml", "yml"],
    icon: "",
    name: "Text",
    styler: core.StylerType.STYLER_TYPE_EDITOR,
  },
  {
    id: core.Language.LANGUAGE_GO,
    extensions: ["go"],
    icon: go,
    name: "Go",
    styler: core.StylerType.STYLER_TYPE_GOFMT,
  },
  {
    id: core.Language.LANGUAGE_HTML,
    extensions: ["html", "svelte", "vue", "xml", "xaml"],
    icon: html,
    name: "HTML",
    styler: core.StylerType.STYLER_TYPE_PRETTIER,
  },
  {
    id: core.Language.LANGUAGE_JAVA,
    extensions: ["java"],
    icon: java,
    name: "Java",
    styler: core.StylerType.STYLER_TYPE_PRETTIER,
  },
  {
    id: core.Language.LANGUAGE_JAVASCRIPT,
    extensions: ["js", "jsx"],
    icon: javascript,
    name: "JavaScript",
    styler: core.StylerType.STYLER_TYPE_PRETTIER,
  },
  {
    id: core.Language.LANGUAGE_JAVASCRIPT,
    extensions: ["ts", "tsx", "typescript"],
    icon: typescript,
    name: "TypeScript",
    styler: core.StylerType.STYLER_TYPE_PRETTIER,
  },
  {
    id: core.Language.LANGUAGE_KOTLIN,
    extensions: ["kt"],
    icon: kotlin,
    name: "Kotlin",
    styler: core.StylerType.STYLER_TYPE_KTLINT,
  },
  {
    id: core.Language.LANGUAGE_PYTHON,
    extensions: ["py"],
    icon: python,
    name: "Python",
    styler: core.StylerType.STYLER_TYPE_BLACK,
  },
  {
    id: core.Language.LANGUAGE_RUBY,
    extensions: ["rb"],
    icon: ruby,
    name: "Ruby",
    styler: core.StylerType.STYLER_TYPE_EDITOR,
  },
  {
    id: core.Language.LANGUAGE_RUST,
    extensions: ["rs"],
    icon: rust,
    name: "Rust",
    styler: core.StylerType.STYLER_TYPE_RUSTFMT,
  },
  {
    id: core.Language.LANGUAGE_SCSS,
    extensions: ["css", "scss", "less"],
    icon: css,
    name: "CSS/SCSS",
    styler: core.StylerType.STYLER_TYPE_PRETTIER,
  },
];

export const languagesList = languageConfigs;

export const languages: { [key in core.Language]?: LanguageConfiguration } = {};
for (const config of languageConfigs) {
  if (!languages[config.id]) {
    languages[config.id] = config;
  }
}

export const getConfig = (id: core.Language, name?: string): LanguageConfiguration | undefined => {
  if (name) {
    return languageConfigs.find((c) => c.id === id && c.name === name);
  }
  return languageConfigs.find((c) => c.id === id);
};

export const filenameToLanguageConfig = (filename: string): LanguageConfiguration => {
  for (const config of languageConfigs) {
    if (config.extensions.some((e: string) => filename.toLowerCase().endsWith("." + e))) {
      return config;
    }
  }

  return languageConfigs.find((c) => c.id === core.Language.LANGUAGE_DEFAULT)!;
};

export const filenameToLanguage = (filename: string): core.Language => {
  return filenameToLanguageConfig(filename).id;
};

