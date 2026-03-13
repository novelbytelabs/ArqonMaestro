import { ipcRenderer } from "electron";
import {
  RendererShell,
  RevisionBoxStatePayload,
  RevisionBoxStateRequest,
  ShellRoutePayload,
  ShellSettingsPayload,
  ShellStatePatch,
  ShellWindowState,
} from "./types";

class ElectronRendererShell implements RendererShell {
  onFocusRevisionBox(listener: () => void): void {
    ipcRenderer.on("focusRevisionBox", () => listener());
  }

  onFocusTextInput(listener: () => void): void {
    ipcRenderer.on("focusTextInput", () => listener());
  }

  onRequestRevisionBoxState(listener: (request: RevisionBoxStateRequest) => void): void {
    ipcRenderer.on("getRevisionBoxState", (_event: unknown, data: RevisionBoxStateRequest) =>
      listener(data)
    );
  }

  onSetRevisionBoxState(listener: (payload: RevisionBoxStatePayload) => void): void {
    ipcRenderer.on("setRevisionBoxState", (_event: unknown, data: RevisionBoxStatePayload) =>
      listener(data)
    );
  }

  onStatePatch(listener: (patch: ShellStatePatch) => void): void {
    ipcRenderer.on("setState", (_event: unknown, data: ShellStatePatch) => listener(data));
  }

  onRouteChange(listener: (payload: ShellRoutePayload) => void): void {
    ipcRenderer.on("setURL", (_event: unknown, data: ShellRoutePayload) => listener(data));
  }

  onMiniModeHeightUpdate(listener: () => void): void {
    ipcRenderer.on("updateMiniModeWindowHeight", () => listener());
  }

  sendRevisionBoxState(payload: RevisionBoxStatePayload): void {
    ipcRenderer.send("revisionBoxState", payload);
  }

  toggleChunkManager(listening: boolean): void {
    ipcRenderer.send("toggleChunkManager", listening);
  }

  showSettingsWindow(): void {
    ipcRenderer.send("showSettingsWindow");
  }

  setSettingsPage(page: string): void {
    ipcRenderer.send("setSettingsPage", page);
  }

  setSettings(settings: ShellSettingsPayload): void {
    ipcRenderer.send("setSettings", settings);
  }

  setLanguage(language: unknown): void {
    ipcRenderer.send("setLanguage", language);
  }

  closeLanguages(): void {
    ipcRenderer.send("closeLanguages");
  }

  hideTextInput(): void {
    ipcRenderer.send("hideTextInput");
  }

  sendTextRequest(text: string, includeAlternatives: boolean): void {
    ipcRenderer.send("sendTextRequest", { text, includeAlternatives });
  }

  setMiniModeWindowHeight(height: number): void {
    ipcRenderer.send("setMiniModeWindowHeight", { height });
  }

  loadTutorial(name: string, resize?: boolean): void {
    ipcRenderer.send("loadTutorial", { name, resize });
  }

  setNuxCompleted(completed: boolean): void {
    ipcRenderer.send("setNuxCompleted", completed);
  }

  nuxBack(): void {
    ipcRenderer.send("nuxBack");
  }

  nuxNext(): void {
    ipcRenderer.send("nuxNext");
  }

  showNuxHint(): void {
    ipcRenderer.send("showNuxHint");
  }

  openCustomCommands(): void {
    ipcRenderer.send("openCustomCommands");
  }

  openLogDirectory(): void {
    ipcRenderer.send("openLogDirectory");
  }

  toggleDictateMode(): void {
    ipcRenderer.send("toggleDictateMode");
  }

  requestAccessibilityPermission(): void {
    ipcRenderer.send("accessibilityPermission");
  }

  requestMicrophonePermission(): void {
    ipcRenderer.send("microphonePermission");
  }

  setWindowState(state: ShellWindowState, url: string): void {
    ipcRenderer.send("setWindowState", { state, url });
  }

  showLanguageSwitcher(): void {
    ipcRenderer.send("showLanguageSwitcher");
  }

  startLocal(): void {
    ipcRenderer.send("startLocal");
  }

  stopLocal(): void {
    ipcRenderer.send("stopLocal");
  }

  generateToken(): void {
    ipcRenderer.send("generateToken");
  }
}

export const electronShell = new ElectronRendererShell();
