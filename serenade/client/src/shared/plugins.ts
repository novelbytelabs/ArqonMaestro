import atom from "../../static/img/atom.png";
import vscode from "../../static/img/vscode.png";
import jetbrains from "../../static/img/jetbrains.png";
import hyper from "../../static/img/hyper.png";
import iterm from "../../static/img/iterm.png";
import chrome from "../../static/img/chrome.png";
import edge from "../../static/img/edge.png";

export interface PluginConfiguration {
  name: string;
  icon: string;
  url: string;
}

export const plugins: { [key: string]: PluginConfiguration } = {
  atom: {
    name: "Atom",
    icon: atom,
    url: "https://github.com/novelbytelabs/ArqonMaestro",
  },
  vscode: {
    name: "VS Code",
    icon: vscode,
    url: "https://github.com/novelbytelabs/ArqonMaestro/tree/main/vscode-plugin",
  },
  jetbrains: {
    name: "JetBrains",
    icon: jetbrains,
    url: "https://github.com/novelbytelabs/ArqonMaestro",
  },
  hyper: {
    name: "Hyper",
    icon: hyper,
    url: "https://github.com/novelbytelabs/ArqonMaestro",
  },
  iterm: {
    name: "iTerm",
    icon: iterm,
    url: "https://github.com/novelbytelabs/ArqonMaestro",
  },
  chrome: {
    name: "Chrome",
    icon: chrome,
    url: "https://github.com/novelbytelabs/ArqonMaestro",
  },
  edge: {
    name: "Edge",
    icon: edge,
    url: "https://github.com/novelbytelabs/ArqonMaestro",
  },
};
