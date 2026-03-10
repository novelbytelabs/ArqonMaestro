import { globalShortcut, nativeTheme } from "electron";
import fetch from "electron-fetch";
import Active from "./active";
import API from "./api";
import BusPluginServer from "./ipc/bus-plugin-server";
import { ChunkQueue } from "./stream/chunk-queue";
import ChunkManager from "./stream/chunk-manager";
import CommandHandler from "./execute/command-handler";
import Custom from "./ipc/custom";
import Executor from "./execute/executor";
import InsertHistory from "./execute/insert-history";
import LanguageSwitcherWindow from "./windows/language-switcher";
import Local from "./ipc/local";
import Log from "./log";
import MainWindow from "./windows/main";
import Metadata from "../shared/metadata";
import Microphone from "./stream/microphone";
import MiniModeWindow from "./windows/mini-mode";
import NativeCommands from "./execute/native-commands";
import NUX from "./nux";
import PluginManager from "./ipc/plugin-manager";
import RendererBridge from "./bridge";
import RendererProcessEventHandlers from "./events";
import RevisionBoxWindow from "./windows/revision-box";
import Settings from "./settings";
import SettingsWindow from "./windows/settings";
import Stream from "./stream/stream";
import System from "./execute/system";
import TextInputWindow from "./windows/text-input";
import Window from "./windows/window";
import STTTracking from "./stt/tracking";
import { createBusClient } from "./stt/bus-client";
import { createSTTComparator } from "./stt/comparator";
import { createTrafficRouter } from "./stt/traffic-router";
import * as examples from "./examples";
import { SpeechRecorder } from "./audio";

export default class App {
  private busPluginServer?: BusPluginServer;
  private bridge?: RendererBridge;
  private chunkManager?: ChunkManager;
  private custom?: Custom;
  private executor?: Executor;
  private languageSwitcherWindow?: Promise<LanguageSwitcherWindow>;
  private local?: Local;
  private mainWindow?: MainWindow;
  private microphone?: Microphone;
  private miniModeWindow?: MiniModeWindow;
  private revisionBoxWindow?: RevisionBoxWindow;
  private settingsWindow?: Promise<SettingsWindow>;
  private stream?: Stream;
  private textInputWindow?: Promise<TextInputWindow>;

  private previousShouldUseDarkColors?: boolean;

  public log?: Log;
  public settings?: Settings;

  static async create() {
    const instance = new App();

    // these windows are created after the main window is shown, so all callers await
    // promises to ensure they're initialized
    let languageSwitcherWindow: Promise<LanguageSwitcherWindow> | undefined = undefined;
    let settingsWindow: Promise<SettingsWindow> | undefined = undefined;
    let textInputWindow: Promise<TextInputWindow> | undefined = undefined;

    // these windows are needed by the main window (which is created first) so they can be
    // destroyed when the app is quit, but otherwise are always initialized before they
    // are used, so they are not promises like the above
    let revisionBoxWindow: RevisionBoxWindow | undefined = undefined;
    let miniModeWindow: MiniModeWindow | undefined = undefined;

    const chunkQueue = new ChunkQueue();
    const insertHistory = new InsertHistory();
    const metadata = new Metadata();
    const settings = (instance.settings = new Settings());
    const bridge = (instance.bridge = new RendererBridge(settings));
    const system = new System(settings);
    const log = (instance.log = new Log(settings));
    instance.updateDarkModeForAllWindows();

    const custom = (instance.custom = await Custom.create(settings));
    const mainWindow = (instance.mainWindow = await MainWindow.create(
      instance,
      bridge,
      metadata,
      settings,
      () => instance.chunkManager,
      () => miniModeWindow,
      () => [
        revisionBoxWindow,
        miniModeWindow,
        languageSwitcherWindow,
        settingsWindow,
        textInputWindow,
      ]
    ));

    miniModeWindow = instance.miniModeWindow = await MiniModeWindow.create(
      bridge,
      mainWindow,
      settings
    );

    mainWindow.show();
    if (settings.getMiniMode()) {
      miniModeWindow.snapToMain();
      miniModeWindow.show();
    }

    revisionBoxWindow = instance.revisionBoxWindow = await RevisionBoxWindow.create(
      bridge,
      mainWindow,
      miniModeWindow,
      settings,
      system
    );

    nativeTheme.on("updated", () => {
      // this seems to be triggered more often than it changes, so we cache the value here
      if (
        settings.getDarkMode() != "system" ||
        nativeTheme.shouldUseDarkColors === instance.previousShouldUseDarkColors
      ) {
        return;
      }

      instance.updateDarkModeForAllWindows();
      instance.previousShouldUseDarkColors = nativeTheme.shouldUseDarkColors;
    });

    const pluginManager = new PluginManager(settings);
    const microphone = (instance.microphone = new Microphone(
      bridge,
      mainWindow,
      settings,
      () => settingsWindow
    ));

    const active = new Active(
      bridge,
      custom,
      revisionBoxWindow,
      insertHistory,
      mainWindow,
      metadata,
      miniModeWindow,
      pluginManager,
      settings,
      system
    );

    const nativeCommands = new NativeCommands(active, insertHistory, revisionBoxWindow, system);
    const api = new API(active, bridge, log, mainWindow, metadata, settings, () => settingsWindow);
    
    // Create STT tracking instance for correlation IDs and metrics
    const tracking = new STTTracking(api, settings);
    
    const stream = (instance.stream = new Stream(active, api, log, settings, tracking));
    const local = (instance.local = new Local(bridge, log, mainWindow, metadata, settings));
    const nux = new NUX(
      active,
      instance,
      bridge,
      mainWindow,
      miniModeWindow,
      pluginManager,
      settings
    );

    instance.busPluginServer = new BusPluginServer(
      settings,
      active,
      bridge,
      custom,
      mainWindow,
      miniModeWindow,
      pluginManager,
      stream,
      log
    );

    await custom.start();
    const executor = (instance.executor = new Executor(
      active,
      api,
      bridge,
      insertHistory,
      log,
      mainWindow,
      miniModeWindow,
      nativeCommands,
      nux,
      pluginManager,
      revisionBoxWindow,
      settings,
      stream,
      system,
      () => commandHandler
    ));

    const chunkManager: ChunkManager = (instance.chunkManager = new ChunkManager(
      active,
      api,
      instance,
      bridge,
      chunkQueue,
      custom,
      executor,
      log,
      mainWindow,
      microphone,
      miniModeWindow,
      settings,
      stream,
      tracking
    ));

    // Initialize Arqon Bus client for shadow publishing
    const busClient = createBusClient(settings, log, tracking);
    chunkManager.setBusClient(busClient);
    
    // Initialize STT Comparator for dual-run comparison
    const comparator = createSTTComparator(log, settings, tracking);
    chunkManager.setComparator(comparator);
    
    // Initialize Traffic Router for gradual cutover
    const trafficRouter = createTrafficRouter(settings, log, tracking);
    chunkManager.setTrafficRouter(trafficRouter);
    
    // Start stage check if cutover is enabled
    if (trafficRouter.isEnabled()) {
      trafficRouter.startStageCheck(
        (stage) => {
          log.logVerbose(`[App] Cutover promoted to stage: ${stage}`);
        },
        (reason) => {
          log.logError(`[App] Cutover rolled back: ${reason}`);
        }
      );
    }
    
    // Start health check if Bus is enabled
    if (busClient.isEnabled()) {
      busClient.startHealthCheck(() => {
        return {
          status: busClient.isConnected() ? "healthy" : "unhealthy",
          latency: 0,
          errors: 0,
        };
      });
    }

    const commandHandler: CommandHandler = new CommandHandler(
      active,
      instance,
      bridge,
      chunkManager,
      custom,
      executor,
      mainWindow,
      nativeCommands,
      nux,
      revisionBoxWindow,
      settings,
      stream,
      system,
      () => languageSwitcherWindow
    );

    new RendererProcessEventHandlers(
      active,
      instance,
      api,
      bridge,
      chunkManager,
      custom,
      revisionBoxWindow,
      local,
      mainWindow,
      microphone,
      miniModeWindow,
      nux,
      pluginManager,
      settings,
      stream,
      () => languageSwitcherWindow,
      () => settingsWindow,
      () => textInputWindow
    );

    // users will see an onboarding step to change these default values before using the product
    if (!settings.getToken()) {
      settings.setLogAudio(true);
      settings.setLogSource(true);
    }

    instance.sendAllSettings(local, microphone, miniModeWindow, settings, [
      mainWindow,
      miniModeWindow,
    ]);

    let endpoint = settings.getStreamingEndpoint();
    console.log("[ArqonMaestro] Streaming endpoint:", endpoint?.id, "-", endpoint?.address);
    console.log("[ArqonMaestro] Token present:", !!settings.getToken());

    const localServiceHealthy = async (url: string): Promise<boolean> => {
      try {
        const response = await fetch(url, { method: "GET", timeout: 1500 });
        return response.ok;
      } catch (_e) {
        return false;
      }
    };

    if (endpoint && endpoint.id == "local") {
      local.start();
    } else {
      console.log("[ArqonMaestro] Attempting to connect to remote endpoint:", endpoint?.address);
      try {
        await api.setBestEndpoint(settings.getStreamingEndpoints());
        console.log("[ArqonMaestro] setBestEndpoint completed successfully");
      } catch (e) {
        console.error("[ArqonMaestro] setBestEndpoint failed:", e);
      }
    }

    instance.registerPushToTalk();

    const tokenPresent = !!settings.getToken();
    let initialLoggedIn = tokenPresent;
    if (endpoint && endpoint.id == "local") {
      const [speechHealthy, codeHealthy] = await Promise.all([
        localServiceHealthy("http://localhost:17202/api/status"),
        localServiceHealthy("http://localhost:17203/api/status"),
      ]);
      initialLoggedIn = initialLoggedIn && speechHealthy && codeHealthy;
      if (!initialLoggedIn) {
        console.warn(
          "[ArqonMaestro] Local endpoint selected but local backend is not fully healthy yet."
        );

        const remoteEndpoints = settings.getStreamingEndpoints().filter((e) => e.id != "local");
        if (tokenPresent && remoteEndpoints.length > 0) {
          const pings = await Promise.all(remoteEndpoints.map((e) => api.ping(e, false)));
          const index = Math.max(0, pings.indexOf(Math.min(...pings)));
          const fallback = remoteEndpoints[index];
          settings.setStreamingEndpoint(fallback.id!);
          endpoint = settings.getStreamingEndpoint();
          initialLoggedIn = true;
          console.warn(
            "[ArqonMaestro] Falling back to remote endpoint:",
            fallback.id,
            fallback.address
          );
          bridge.setState({ endpoint, latency: pings[index] }, [mainWindow, miniModeWindow]);
        }
      }
    }

    console.log("[ArqonMaestro] Setting loggedIn state:", initialLoggedIn);
    bridge.setState({ loggedIn: initialLoggedIn, listening: false }, [
      mainWindow,
      miniModeWindow,
    ]);
    // Renderer startup can race with IPC listener registration; send once more
    // so loggedIn doesn't stay undefined on the loading page.
    setTimeout(() => {
      bridge.setState({ loggedIn: initialLoggedIn, listening: false }, [
        mainWindow,
        miniModeWindow,
      ]);
    }, 1500);

    // Local backend startup can lag app initialization. Poll briefly and flip to logged-in
    // once both local services are healthy so restart is not required.
    if (endpoint && endpoint.id == "local" && tokenPresent && !initialLoggedIn) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts += 1;
        const [speechHealthy, codeHealthy] = await Promise.all([
          localServiceHealthy("http://localhost:17202/api/status"),
          localServiceHealthy("http://localhost:17203/api/status"),
        ]);

        if (speechHealthy && codeHealthy) {
          console.log("[ArqonMaestro] Local backend healthy; enabling loggedIn state.");
          bridge.setState({ loggedIn: true, listening: false }, [mainWindow, miniModeWindow]);
          clearInterval(interval);
          return;
        }

        if (attempts >= 30) {
          clearInterval(interval);
        }
      }, 1000);
    }
    instance.clearAlternativesAndShowExamples();
    nux.showIfNeeded();

    languageSwitcherWindow = instance.languageSwitcherWindow = LanguageSwitcherWindow.create(
      active,
      bridge,
      mainWindow,
      settings
    );

    textInputWindow = instance.textInputWindow = TextInputWindow.create(
      bridge,
      mainWindow,
      settings,
      system
    );

    settingsWindow = instance.settingsWindow = SettingsWindow.create(
      instance,
      bridge,
      local,
      mainWindow,
      microphone,
      miniModeWindow,
      settings
    );

    return instance;
  }

  clearAlternativesAndShowExamples() {
    if (!this.bridge || !this.mainWindow || !this.settings) {
      return;
    }

    let alternatives: any = examples.random(5).map((e: string) => ({
      description: e,
      example: true,
    }));

    // don't show suggestions when in NUX, since it's confusing to have the app telling you to say
    // different things at once, or when in mini/minimized mode, where they get in the way
    if (
      !this.settings.getToken() ||
      !this.settings.getNuxCompleted() ||
      !this.mainWindow.shown() ||
      this.settings.getMiniMode()
    ) {
      alternatives = [];
    }

    this.bridge.setState(
      {
        alternatives,
        highlighted: [],
      },
      [this.mainWindow, this.miniModeWindow]
    );
  }

  pushToTalkPressed() {
    this.chunkManager!.toggle();
  }

  quit() {
    this.local?.stop();
    this.custom?.stop();
    this.microphone?.stop();
    this.busPluginServer?.stop();
  }

  registerPushToTalk() {
    globalShortcut.unregisterAll();

    if (this.settings!.getPushToTalk()) {
      try {
        globalShortcut.register(this.settings!.getPushToTalk(), () => {
          this.pushToTalkPressed();
        });
      } catch (e) {}
    }

    if (this.settings!.getTextInputKeybinding()) {
      try {
        globalShortcut.register(this.settings!.getTextInputKeybinding(), async () => {
          if (!this.textInputWindow) {
            return;
          }

          const textInputWindow = await this.textInputWindow;
          if (textInputWindow.shown()) {
            textInputWindow.hide();
          } else {
            this.stream!.connect(this.chunkManager!, this.custom!, this.executor!);
            textInputWindow.show();
          }
        });
      } catch (e) {}
    }
  }

  async sendAllSettings(
    local: Local,
    microphone: Microphone,
    miniModeWindow: MiniModeWindow,
    settings: Settings,
    windows: (Window | Promise<Window> | undefined)[]
  ) {
    this.bridge!.setState(
      {
        animations: settings.getAnimations(),
        chunkSilenceThreshold: settings.getChunkSilenceThreshold(),
        chunkSpeechThreshold: settings.getChunkSpeechThreshold(),
        clipboardInsert: settings.getClipboardInsert(),
        darkMode: settings.getDarkMode(),
        disableSuggestions: settings.getDisableSuggestions(),
        editorAutocomplete: settings.getEditorAutocomplete(),
        endpoint: settings.getStreamingEndpoint(),
        endpoints: settings.getStreamingEndpoints(),
        executeSilenceThreshold: settings.getExecuteSilenceThreshold(),
        logAudio: settings.getLogAudio(),
        logSource: settings.getLogSource(),
        microphones: microphone.microphones(),
        minimizedPosition: settings.getMinimizedPosition(),
        miniMode: settings.getMiniMode(),
        miniModeBottomUp: miniModeWindow.shouldPlaceAboveMain(),
        miniModeFewerAlternativesCount: settings.getMiniModeFewerAlternativesCount(),
        miniModeHideTimeout: settings.getMiniModeHideTimeout(),
        miniModeReversed: settings.getMiniModeReversed(),
        nuxCompleted: settings.getNuxCompleted(),
        nuxTutorial: settings.getNuxTutorialName(),
        plugins: settings.getPlugins(),
        pushToTalk: settings.getPushToTalk(),
        requiresNewerMac: local.requiresNewerMac(),
        requiresWsl: await local.requiresWsl(),
        showRevisionBox: settings.getShowRevisionBox(),
        stylers: settings.getStylers(),
        textInputKeybinding: settings.getTextInputKeybinding(),
        useMiniModeFewerAlternatives: settings.getUseMiniModeFewerAlternatives(),
        useMiniModeHideTimeout: settings.getUseMiniModeHideTimeout(),
        useVerboseLogging: settings.getUseVerboseLogging(),
      },
      windows ? windows : [this.mainWindow, this.miniModeWindow, this.settingsWindow]
    );
  }

  show() {
    this.mainWindow!.show();
  }

  async toggleMiniMode(enabled: boolean) {
    this.settings?.setMiniMode(enabled);
    this.mainWindow?.resizeToCurrentMode(true);
    this.clearAlternativesAndShowExamples();
    this.bridge?.setState(
      {
        miniMode: enabled,
      },
      [this.mainWindow, this.miniModeWindow, this.settingsWindow]
    );

    if (enabled) {
      this.miniModeWindow?.show();
    } else {
      this.miniModeWindow?.hide();
    }

    this.miniModeWindow?.snapToMain();
  }

  async updateDarkModeForAllWindows() {
    if (this.settings) {
      const darkMode = this.settings.getDarkMode();
      if (nativeTheme.themeSource != darkMode) {
        nativeTheme.themeSource = darkMode;
      }

      if (this.bridge) {
        this.bridge.setState(
          {
            darkMode,
            darkTheme:
              darkMode == "dark" || (darkMode == "system" && nativeTheme.shouldUseDarkColors),
          },
          [
            this.mainWindow,
            this.miniModeWindow,
            this.languageSwitcherWindow,
            this.revisionBoxWindow,
            this.settingsWindow,
            this.textInputWindow,
          ]
        );
      }
    }
  }
}
