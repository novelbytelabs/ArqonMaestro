import { ipcMain, shell, systemPreferences } from "electron";
import { autoUpdater } from "electron-updater";
import { v4 as uuid } from "uuid";
import * as path from "path";
import * as os from "os";
import Active from "./active";
import API from "./api";
import App from "./app";
import ChunkManager from "./stream/chunk-manager";
import Custom from "./ipc/custom";
import LanguageSwitcherWindow from "./windows/language-switcher";
import Local from "./ipc/local";
import MainWindow from "./windows/main";
import Microphone from "./stream/microphone";
import MiniModeWindow from "./windows/mini-mode";
import NUX from "./nux";
import PluginManager from "./ipc/plugin-manager";
import RendererBridge from "./bridge";
import RevisionBoxWindow from "./windows/revision-box";
import Settings from "./settings";
import SettingsWindow from "./windows/settings";
import Stream from "./stream/stream";
import TextInputWindow from "./windows/text-input";
import Window from "./windows/window";
import { core } from "../gen/core";
import { SecurityMode } from "./runtime/identity-gateway-service";
import {
  getPhase3BReplayAuditSnapshot,
  getPhase3BReplayAuditSummary,
  resetPhase3BReplayAuditSnapshot,
} from "./runtime/phase3b-replay-audit-harness";
import type { PasskeyProviderVerificationOutcome } from "./runtime/passkey-bootstrap-service";

export default class RendererProcessEventHandlers {
  constructor(
    private active: Active,
    private app: App,
    private api: API,
    private bridge: RendererBridge,
    private chunkManager: ChunkManager,
    private custom: Custom,
    private revisionBoxWindow: RevisionBoxWindow,
    private local: Local,
    private mainWindow: MainWindow,
    private microphone: Microphone,
    private miniModeWindow: MiniModeWindow,
    private nux: NUX,
    private pluginManager: PluginManager,
    private settings: Settings,
    private stream: Stream,
    private languageSwitcherWindow: () => Promise<LanguageSwitcherWindow> | undefined,
    private settingsWindow: () => Promise<SettingsWindow> | undefined,
    private textInputWindow: () => Promise<TextInputWindow> | undefined
  ) {
    ipcMain.on("accessibilityPermission", () => {
      this.bridge.setState(
        {
          accessibilityPermission: systemPreferences.isTrustedAccessibilityClient
            ? systemPreferences.isTrustedAccessibilityClient(true)
            : true,
        },
        [this.mainWindow, this.miniModeWindow]
      );
    });

    ipcMain.on("closeLanguages", async (_event: any, _data: any) => {
      const languageSwitcherWindow = this.languageSwitcherWindow();
      if (languageSwitcherWindow) {
        (await languageSwitcherWindow).hide();
      }
    });

    ipcMain.on("forward", (_event: any, data: any) => {
      this.pluginManager.sendResponseToApp(this.active.app, data);
    });

    ipcMain.on("generateToken", (_event: any, data: any) => {
      this.settings.setToken(uuid());
    });

    ipcMain.on("hideTextInput", async () => {
      const textInputWindow = this.textInputWindow();
      if (textInputWindow) {
        (await textInputWindow).hide();
      }
    });

    ipcMain.on("loadTutorial", (_event: any, data: { name: string; resize?: boolean }) => {
      this.nux.load(data.name);
      this.resetNux();
      if (data.resize) {
        this.mainWindow.resizeToCurrentMode(true);
      }

      this.bridge.setState({ loggedIn: true }, [this.mainWindow, this.miniModeWindow]);
    });

    ipcMain.on("microphonePermission", () => {
      if (systemPreferences.askForMediaAccess !== undefined) {
        systemPreferences.askForMediaAccess("microphone").then((data) => {
          this.bridge.setState(
            {
              microphonePermission: data,
            },
            [this.mainWindow]
          );
        });
      }
    });

    ipcMain.on("nuxBack", () => {
      this.nux.back();
    });

    ipcMain.on("nuxNext", () => {
      this.nux.next();
    });

    ipcMain.on("openCustomCommands", () => {
      shell.openPath(path.join(this.settings.path(), "scripts", "custom.js"));
    });

    ipcMain.on("openLogDirectory", () => {
      shell.openPath(this.settings.path());
    });

    ipcMain.on("openURL", (_event: any, data: string) => {
      shell.openExternal(data);
    });

    ipcMain.on("reloadCustomCommands", () => {
      this.custom.reload();
    });

    ipcMain.on("restart", () => {
      autoUpdater.quitAndInstall();
    });

    ipcMain.on("revisionBoxState", (_event: any, data: any) => {
      this.revisionBoxWindow.onGetEditorState(data);
    });

    ipcMain.on("sendTextRequest", (_event: any, data: any) => {
      this.stream.sendTextRequest(data.text, data.includeAlternatives);
    });

    ipcMain.on("dictationUseLegacyFallback", () => {
      this.chunkManager.enableLegacyDictationFallback();
    });

    ipcMain.on("setLanguage", (_event: any, data: { language: core.Language; name: string }) => {
      this.active.languageSwitcherLanguage = data.language;
      this.active.languageSwitcherName = data.name;
      this.active.update(true);
    });

    ipcMain.on("setMiniModeWindowHeight", (_event: any, data: any) => {
      if (this.settings.getMiniMode()) {
        this.miniModeWindow.setHeight(data.height || 0);
      }
    });

    ipcMain.on("setNuxCompleted", async (_event: any, completed: boolean) => {
      if (this.settings.getNuxCompleted() == completed) {
        return;
      }

      if (completed) {
        this.nux.complete();
      } else {
        this.resetNux();
      }
    });

    ipcMain.on("setSettings", async (_event: any, data: any) => {
      if (data.animations !== undefined) {
        this.settings.setAnimations(data.animations);
        this.bridge.setState(
          {
            animations: data.animations,
          },
          [this.settingsWindow()]
        );
      }

      if (data.chunkSilenceThreshold !== undefined) {
        this.settings.setChunkSilenceThreshold(data.chunkSilenceThreshold);
        this.bridge.setState(
          {
            chunkSilenceThreshold: data.chunkSilenceThreshold,
          },
          [this.settingsWindow()]
        );
      }

      if (data.chunkSpeechThreshold !== undefined) {
        this.settings.setChunkSpeechThreshold(data.chunkSpeechThreshold);
        this.bridge.setState(
          {
            chunkSpeechThreshold: data.chunkSpeechThreshold,
          },
          [this.settingsWindow()]
        );
      }

      if (data.clipboardInsert !== undefined) {
        this.settings.setClipboardInsert(data.clipboardInsert);
        this.bridge.setState(
          {
            clipboardInsert: data.clipboardInsert,
          },
          [this.settingsWindow()]
        );
      }

      if (data.continueRunningInTray !== undefined) {
        this.settings.setContinueRunningInTray(data.continueRunningInTray);
        this.bridge.setState(
          {
            continueRunningInTray: data.continueRunningInTray,
          },
          [this.mainWindow, this.settingsWindow()]
        );
      }

      if (data.darkMode !== undefined) {
        this.settings.setDarkMode(data.darkMode);
        this.app.updateDarkModeForAllWindows();
      }

      if (data.disableSuggestions !== undefined) {
        this.settings.setDisableSuggestions(data.disableSuggestions);
        this.bridge.setState(
          {
            disableSuggestions: data.disableSuggestions,
          },
          [this.settingsWindow()]
        );
      }

      if (data.editorAutocomplete !== undefined) {
        this.settings.setEditorAutocomplete(data.editorAutocomplete);
        this.bridge.setState(
          {
            editorAutocomplete: data.editorAutocomplete,
          },
          [this.settingsWindow()]
        );
      }

      if (data.endpoint !== undefined) {
        this.chunkManager.toggle(false);
        this.settings.setStreamingEndpoint(data.endpoint);
        this.bridge.setState(
          {
            endpoint: this.settings.getStreamingEndpoint(),
          },
          [this.mainWindow, this.settingsWindow()]
        );

        this.api.ping(this.settings.getStreamingEndpoint());
      }

      if (data.executeSilenceThreshold !== undefined) {
        this.settings.setExecuteSilenceThreshold(data.executeSilenceThreshold);
        this.bridge.setState(
          {
            executeSilenceThreshold: data.executeSilenceThreshold,
          },
          [this.settingsWindow()]
        );
      }

      if (data.logAudio !== undefined) {
        this.settings.setLogAudio(data.logAudio);
        this.bridge.setState(
          {
            logAudio: data.logAudio,
          },
          [this.mainWindow, this.settingsWindow()]
        );
      }

      if (data.logSource !== undefined) {
        this.settings.setLogSource(data.logSource);
        this.bridge.setState(
          {
            logSource: data.logSource,
          },
          [this.mainWindow, this.settingsWindow()]
        );
      }

      if (data.microphone !== undefined && data.microphone.id != this.settings.getMicrophone().id) {
        this.microphone.changeMicrophone({
          id: data.microphone.id,
          name: data.microphone.name,
        });

        this.bridge.setState(
          {
            microphones: this.microphone.microphones(),
          },
          [this.settingsWindow()]
        );
      }

      if (data.minimizedPosition !== undefined) {
        this.settings.setMinimizedPosition(data.minimizedPosition);
        this.bridge.setState(
          {
            minimizedPosition: data.minimizedPosition,
          },
          [this.mainWindow, this.miniModeWindow, this.settingsWindow()]
        );
      }

      if (data.miniMode !== undefined) {
        this.app.clearAlternativesAndShowExamples();
        this.settings.setMiniMode(data.miniMode);
        this.bridge.setState(
          {
            miniMode: data.miniMode,
          },
          [this.mainWindow, this.miniModeWindow, this.settingsWindow()]
        );

        setImmediate(() => {
          this.app.toggleMiniMode(data.miniMode);
        });
      }

      if (data.useMiniModeFewerAlternatives !== undefined) {
        this.settings.setUseMiniModeFewerAlternatives(data.useMiniModeFewerAlternatives);
        this.bridge.setState(
          {
            useMiniModeFewerAlternatives: data.useMiniModeFewerAlternatives,
          },
          [this.miniModeWindow, this.settingsWindow()]
        );
      }

      if (data.miniModeFewerAlternativesCount !== undefined) {
        this.settings.setMiniModeFewerAlternativesCount(data.miniModeFewerAlternativesCount);
        this.bridge.setState(
          {
            miniModeFewerAlternativesCount: data.miniModeFewerAlternativesCount,
          },
          [this.miniModeWindow, this.settingsWindow()]
        );
      }

      if (data.useMiniModeHideTimeout !== undefined) {
        this.settings.setUseMiniModeHideTimeout(data.useMiniModeHideTimeout);
        this.bridge.setState(
          {
            useMiniModeHideTimeout: data.useMiniModeHideTimeout,
          },
          [this.miniModeWindow, this.settingsWindow()]
        );
      }

      if (data.miniModeHideTimeout !== undefined) {
        this.settings.setMiniModeHideTimeout(data.miniModeHideTimeout);
        this.bridge.setState(
          {
            miniModeHideTimeout: data.miniModeHideTimeout,
          },
          [this.miniModeWindow, this.settingsWindow()]
        );
      }

      if (data.miniModeReversed !== undefined) {
        this.settings.setMiniModeReversed(data.miniModeReversed);
        this.bridge.setState(
          {
            miniModeReversed: data.miniModeReversed,
          },
          [this.miniModeWindow, this.settingsWindow()]
        );
      }

      if (data.pushToTalk !== undefined) {
        this.settings.setPushToTalk(data.pushToTalk);
        this.bridge.setState(
          {
            pushToTalk: data.pushToTalk,
          },
          [this.settingsWindow()]
        );
      }

      if (data.showRevisionBox !== undefined) {
        this.settings.setShowRevisionBox(data.showRevisionBox);
        this.bridge.setState(
          {
            showRevisionBox: data.showRevisionBox,
          },
          [this.settingsWindow()]
        );
      }

      if (data.stylers !== undefined) {
        this.settings.setStylers(data.stylers);
        this.bridge.setState(
          {
            stylers: data.stylers,
          },
          [this.settingsWindow()]
        );
      }

      if (data.textInputKeybinding !== undefined) {
        this.settings.setTextInputKeybinding(data.textInputKeybinding);
        this.bridge.setState(
          {
            textInputKeybinding: data.textInputKeybinding,
          },
          [this.settingsWindow()]
        );
      }

      if (data.useVerboseLogging !== undefined) {
        this.settings.setUseVerboseLogging(data.useVerboseLogging);
        this.bridge.setState(
          {
            useVerboseLogging: data.useVerboseLogging,
          },
          [this.settingsWindow()]
        );
      }
    });

    ipcMain.on("setSettingsPage", (_event: any, settingsPage: string) => {
      if (settingsPage === "server") {
        settingsPage = "advanced";
      }
      this.bridge.setState(
        {
          settingsPage,
        },
        [this.settingsWindow()]
      );
      if (settingsPage === "security") {
        this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
      } else if (settingsPage === "profiles") {
        this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
      }
    });

    ipcMain.on("setWindowState", async (_event: any, data: { state: string; url: string }) => {
      const settingsWindow = this.settingsWindow();
      const languageSwitcherWindow = this.languageSwitcherWindow();

      let window: Window = this.mainWindow;
      if (data.url.includes("minimode")) {
        window = this.miniModeWindow;
      } else if (data.url.includes("settings") && settingsWindow) {
        window = await settingsWindow;
      } else if (data.url.includes("revision")) {
        window = this.revisionBoxWindow;
      } else if (data.url.includes("languages") && languageSwitcherWindow) {
        window = await languageSwitcherWindow;
      }

      if (data.state == "minimize") {
        window.window?.minimize();
      } else if (data.state == "maximize") {
        window.window?.maximize();
      } else if (data.state == "unmaximize") {
        window.window?.unmaximize();
      } else if (data.state == "close") {
        window.window?.close();
      }

      if (window == this.mainWindow) {
        this.miniModeWindow.snapToMain();
        this.active.showSuggestionIfNeeded();
      }
    });

    ipcMain.on("showLanguageSwitcher", async () => {
      const languageSwitcherWindow = this.languageSwitcherWindow();
      if (languageSwitcherWindow) {
        (await languageSwitcherWindow).show();
      }
    });

    ipcMain.on("showNuxHint", async () => {
      this.bridge.setState(
        {
          nuxHintShown: true,
        },
        [this.mainWindow, this.miniModeWindow]
      );
    });

    ipcMain.on("showSettingsWindow", async () => {
      const settingsWindow = this.settingsWindow();
      if (settingsWindow) {
        (await settingsWindow).show();
        this.bridge.setState(this.app.getSecurityPanelState(), [settingsWindow]);
      }
    });

    ipcMain.on("securityRefreshStatus", () => {
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityRequestSnapshot", (event: any) => {
      event.sender.send("securitySnapshot", this.app.getSecurityPanelState());
    });

    ipcMain.on("securityRequestReplaySnapshot", (event: any) => {
      event.sender.send("securityReplaySnapshot", getPhase3BReplayAuditSnapshot());
    });

    ipcMain.on("securityRequestReplaySummary", (event: any) => {
      event.sender.send("securityReplaySummary", getPhase3BReplayAuditSummary());
    });

    ipcMain.on("securityResetReplaySnapshot", () => {
      if (process.env.ARQON_SECURITY_DEVTOOLS !== "1") {
        return;
      }
      resetPhase3BReplayAuditSnapshot();
    });

    ipcMain.on("securityBeginPasskeyProviderChallenge", (_event: any, challengeId: string) => {
      this.app.beginPasskeyProviderChallenge(challengeId);
      this.bridge.setState(this.app.getSecurityPanelState(), [
        this.mainWindow,
        this.miniModeWindow,
        this.settingsWindow(),
      ]);
    });

    ipcMain.on("securityReportPasskeyProviderOutcome", (_event: any, outcome: any) => {
      const payload: PasskeyProviderVerificationOutcome = {
        provider: String(outcome?.provider || "").trim(),
        challengeId: String(outcome?.challengeId || "").trim(),
        verified: !!outcome?.verified,
        method:
          outcome?.method === "totp_recovery" ? "totp_recovery" : "passkey",
        reasonCode: String(outcome?.reasonCode || "").trim(),
      };
      if (!payload.provider) {
        return;
      }
      this.app.applyPasskeyProviderOutcome(payload);
      this.bridge.setState(this.app.getSecurityPanelState(), [
        this.mainWindow,
        this.miniModeWindow,
        this.settingsWindow(),
      ]);
    });

    ipcMain.on("securitySetMode", async (_event: any, mode: SecurityMode) => {
      await this.app.setSecurityMode(mode);
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityUpsertEnrollment", async (_event: any, displayName: string) => {
      await this.app.upsertSecurityEnrollment(displayName);
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityResetEnrollment", async () => {
      await this.app.resetSecurityEnrollment();
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityRunProbe", async () => {
      await this.app.runSecurityAuthorizationProbe();
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityEnrollAndVerify", async (_event: any, displayName: string) => {
      await this.app.enrollAndVerifySecurityProfile(displayName);
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityCreateProfile", async (_event: any, displayName: string) => {
      try {
        await this.app.createSecurityProfile(displayName);
      } catch (error: any) {
        this.app.setSecurityProfilesError(error?.message || "security_profile_create_failed");
      }
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on(
      "securityUpdateProfile",
      async (_event: any, profileId: string, updates: { displayName?: string; status?: string }) => {
        try {
          await this.app.updateSecurityProfile(profileId, updates as any);
        } catch (error: any) {
          this.app.setSecurityProfilesError(error?.message || "security_profile_update_failed");
        }
        this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
      }
    );

    ipcMain.on("securitySwitchProfile", async (_event: any, profileId: string) => {
      try {
        await this.app.switchSecurityProfile(profileId);
      } catch (error: any) {
        this.app.setSecurityProfilesError(error?.message || "security_profile_switch_failed");
      }
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityDeleteProfile", async (_event: any, profileId: string) => {
      try {
        await this.app.deleteSecurityProfile(profileId);
      } catch (error: any) {
        this.app.setSecurityProfilesError(error?.message || "security_profile_delete_failed");
      }
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityReEnrollProfile", async (_event: any, profileId: string) => {
      try {
        await this.app.reEnrollSecurityProfile(profileId);
      } catch (error: any) {
        this.app.setSecurityProfilesError(error?.message || "security_profile_reenroll_failed");
      }
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityListProfiles", async () => {
      try {
        await this.app.listSecurityProfiles();
      } catch (error: any) {
        this.app.setSecurityProfilesError(error?.message || "security_profile_list_failed");
      }
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });

    ipcMain.on("securityWizardPreviewPhrase", (_event: any, phrase: string) => {
      const normalized = (phrase || "").trim().toLowerCase();
      if (!normalized) {
        return;
      }

      this.bridge.setState(
        {
          alternatives: [
            {
              alternativeId: "wizard_preview_1",
              description: normalized,
              transcript: normalized,
              commands: [
                {
                  index: 1,
                  text: normalized,
                  type: core.CommandType.COMMAND_TYPE_PRESS,
                },
              ],
            },
          ],
          highlighted: [0],
          executedSuccess: [],
          staleOrFailed: [],
          partial: false,
          suggestion: "",
        },
        [this.mainWindow, this.miniModeWindow, this.settingsWindow()]
      );
    });

    ipcMain.on("startLocal", () => {
      this.local.start();
    });

    ipcMain.on("stopLocal", () => {
      this.local.stop();
      this.bridge.setState(
        {
          localRunning: false,
        },
        [this.mainWindow]
      );
    });

    ipcMain.on("toggleChunkManager", (_event: any, listening: boolean) => {
      this.chunkManager.toggle(listening);
    });

    ipcMain.on("toggleDictateMode", async (_event: any, _data: any) => {
      this.active.dictateMode = !this.active.dictateMode;
      this.app.syncSecurityInteractionModeFromRuntime(this.active.dictateMode);
      this.active.update(true);
      this.bridge.setState(this.app.getSecurityPanelState(), [this.settingsWindow()]);
    });
  }

  private resetNux() {
    this.settings.setNuxStep(0);
    this.settings.setNuxCompleted(false);
    this.app.clearAlternativesAndShowExamples();
    this.bridge.setState(
      {
        nuxCompleted: false,
      },
      [this.mainWindow, this.miniModeWindow]
    );
  }
}
