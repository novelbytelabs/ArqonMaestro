import { clipboard } from "electron";
import * as os from "os";
import Settings from "../settings";
import * as driver from "../driver/stub";

export default class System {
  // some applications don't have what they're commonly referred to in their application bundle,
  // so create a set of aliases to allow people to refer to apps more naturally
  private aliases: { [key: string]: string } = {
    terminal: "terminal",
    term: "terminal",
    shell: "terminal",
    console: "terminal",
    vscode: "code",
    "vs code": "code",
    "visual studio code": "code",
    chrome: "chrome",
    google: "chrome",
    browser: "chrome",
    firefox: "firefox",
  };

  constructor(private settings: Settings) {}

  private normalizePressKey(key: string): string {
    const normalized = (key || "").toLowerCase().trim();
    switch (normalized) {
      case "return":
        return "enter";
      case "del":
        return "delete";
      case "pgup":
      case "page up":
        return "pageup";
      case "pgdn":
      case "page down":
        return "pagedown";
      default:
        return normalized;
    }
  }

  applicationMatches(application: string, possible: string[]): string[] {
    console.log(`[DEBUG applicationMatches] app='${application}', possible=${JSON.stringify(possible)}`);
    
    let alias = application.toLowerCase();
    if (this.aliases[alias]) {
      alias = this.aliases[alias];
    }

    // Special handling for focus targets - map to known window titles/classes
    const focusTargetMappings: { [key: string]: string[] } = {
      'terminal': ['terminal', 'gnome-terminal', 'term', 'shell', 'console', '@'],  // @ matches user@host shell prompts
      'code': ['code', 'vscode', 'vs code', 'visual studio code', 'visualstudiocode'],
      'chrome': ['chrome', 'google-chrome', 'google chrome', 'chromium', 'brave'],
      'browser': ['chrome', 'google-chrome', 'google chrome', 'chromium', 'brave', 'firefox'],
      'firefox': ['firefox'],
      'editor': ['code', 'vscode', 'vs code', 'visual studio code', 'visualstudiocode'],
    };

    const mappings = focusTargetMappings[alias] || [alias];
    console.log(`[DEBUG applicationMatches] alias='${alias}', mappings=${JSON.stringify(mappings)}`);

    const result = possible.filter(
      (e: string) => {
        const lowerE = e.toLowerCase();
        // Check direct matches
        if (mappings.some(m => lowerE.includes(m))) {
          return true;
        }
        // Check if the app name contains the application text
        return lowerE.includes(application.toLowerCase()) ||
               lowerE.includes(application.toLowerCase().replace(/\s/g, "")) ||
               lowerE.includes(alias);
      }
    );
    console.log(`[DEBUG applicationMatches] result=${JSON.stringify(result)}`);
    return result;
  }

  click(button: string = "left", count: number = 1) {
    return driver.click(button, count);
  }

  clickable(): Promise<string[]> {
    return driver.getClickableButtons();
  }

  clickButton(name: string) {
    return driver.clickButton(name);
  }

  async copy() {
    await this.pressKey("c", os.platform() == "darwin" ? ["command"] : ["control"]);
    await this.delay(300);
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async determineActiveApplication() {
    // Defensive guard: ensure we get a string before calling .toLowerCase()
    const rawResult = await driver.getActiveApplication();
    const result = String(rawResult || "").toLowerCase();
    if (result === "system dialog") {
      return "system dialog";
    } else if (result.includes("atom")) {
      return "atom";
    } else if (
      result.includes("visualstudiocode") ||
      result.includes("visual studio code") ||
      result.includes("vs code") ||
      result.includes("vscode") ||
      result.includes("code/code") ||
      result.includes("code--unity-launch") ||
      (result.split(" ").length > 0 && result.split(" ")[0].endsWith("code")) ||
      (result.split("/").length > 0 && result.split("/")[0].endsWith("code"))
    ) {
      return "vscode";
    } else if (
      result.includes("jetbrains") ||
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
      result.includes("webstorm")
    ) {
      return "jetbrains";
    } else if (
      result.includes("chrome") ||
      result.includes("chromium") ||
      result.includes("brave")
    ) {
      return "chrome";
    } else if (result.includes("firefox")) {
      return "firefox";
    } else if (result.includes("safari")) {
      return "safari";
    } else if (result.includes("edge")) {
      return "edge";
    } else if (result.includes("hyper")) {
      return "hyper";
    } else if (result.includes("iterm")) {
      return "iterm";
    } else if (this.isTerminal(result)) {
      return "terminal";
    } else if (result.includes("slack")) {
      return "slack";
    } else if (
      result.includes("electron") ||
      result.includes("serenade") ||
      result.includes("arqon") ||
      result.includes("arqonmaestro")
    ) {
      return "arqonmaestro";
    }

    return result;
  }

  getClipboard(): string {
    return clipboard.readText();
  }

  async getEditorStateWithAccessibilityApi() {
    const state: { text: string; cursor: number; error: boolean } = await driver.getEditorState();
    return {
      source: state.text,
      cursor: state.cursor,
      error: state.error,
    };
  }

  async focus(application: string) {
    console.log("[SYSTEM] focus() called with:", application);
    try {
      await driver.focusApplication(application, this.aliases);
      await this.delay(300);
    } catch (e) {}
  }

  installedApplications() {
    return driver.getInstalledApplications();
  }

  isTerminal(app: string): boolean {
    return (
      app.includes("alacritty") ||
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
      app.includes("xterm")
    );
  }

  launch(application: string) {
    try {
      return driver.launchApplication(application, this.aliases);
    } catch (e) {}
  }

  async paste(app: string = "") {
    const data = this.settings.getPasteKeys(app);
    await this.pressKey(data.key, data.modifiers);
    await this.delay(100);
  }

  async pressKey(key: string, modifiers: string[] = [], count: number = 1) {
    await driver.pressKey(this.normalizePressKey(key), modifiers, count);
    await this.delay(50);
  }

  quit(application: string) {
    return driver.quitApplication(application, this.aliases);
  }

  runningApplications(): Promise<string[]> {
    return driver
      .getRunningApplications()
      .then((applications: string[]) =>
        applications.filter(
          (e: string) => !e.includes("coreservices") && !e.includes("privateframeworks")
        )
      );
  }

  async selectAll() {
    await this.pressKey("a", os.platform() == "darwin" ? ["command"] : ["control"]);
    await this.delay(300);
  }

  async setClipboard(text: string) {
    clipboard.writeText(text);
    await this.delay(100);
  }

  typeText(text: string, app: string) {
    if (!text) {
      return;
    }

    if (!this.isTerminal(app) && this.settings.getClipboardInsert()) {
      return this.typeTextWithClipboard(text, app);
    } else {
      return this.typeTextWithKeystrokes(text);
    }
  }

  async typeTextWithClipboard(text: string, app: string) {
    const previous = this.getClipboard();
    await this.setClipboard(text);
    await this.paste(app);
    this.setClipboard(previous);
  }

  async typeTextWithKeystrokes(text: string) {
    await driver.typeText(text);
    await this.delay(50);
  }
}
