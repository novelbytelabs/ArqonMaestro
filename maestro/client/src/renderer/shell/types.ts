export type RevisionBoxState = {
  source: string;
  cursor: number;
  cursorEnd: number;
};

export type RevisionBoxStateRequest = {
  id: string;
};

export type RevisionBoxStatePayload = RevisionBoxState & {
  id?: string;
  allEditors?: boolean;
};

export type ShellWindowState = "minimize" | "maximize" | "unmaximize" | "close";

export type ShellRoutePayload = {
  url: string;
};

export type ShellSettingsPayload = Record<string, unknown>;

export type ShellTutorialPayload = {
  name: string;
  resize?: boolean;
};

export type ShellStatePatch = Record<string, unknown>;

export interface RendererShell {
  onFocusRevisionBox(listener: () => void): void;
  onFocusTextInput(listener: () => void): void;
  onRequestRevisionBoxState(listener: (request: RevisionBoxStateRequest) => void): void;
  onSetRevisionBoxState(listener: (payload: RevisionBoxStatePayload) => void): void;
  onStatePatch(listener: (patch: ShellStatePatch) => void): void;
  onRouteChange(listener: (payload: ShellRoutePayload) => void): void;
  onMiniModeHeightUpdate(listener: () => void): void;

  sendRevisionBoxState(payload: RevisionBoxStatePayload): void;
  toggleChunkManager(listening: boolean): void;
  showSettingsWindow(): void;
  setSettingsPage(page: string): void;
  setSettings(settings: ShellSettingsPayload): void;
  setLanguage(language: unknown): void;
  closeLanguages(): void;
  hideTextInput(): void;
  sendTextRequest(text: string, includeAlternatives: boolean): void;
  setMiniModeWindowHeight(height: number): void;
  loadTutorial(name: string, resize?: boolean): void;
  setNuxCompleted(completed: boolean): void;
  nuxBack(): void;
  nuxNext(): void;
  showNuxHint(): void;
  openCustomCommands(): void;
  openLogDirectory(): void;
  toggleDictateMode(): void;
  requestAccessibilityPermission(): void;
  requestMicrophonePermission(): void;
  setWindowState(state: ShellWindowState, url: string): void;
  showLanguageSwitcher(): void;
  startLocal(): void;
  stopLocal(): void;
  generateToken(): void;
}
