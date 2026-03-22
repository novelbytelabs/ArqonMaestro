import { globalShortcut, nativeTheme } from "electron";
import fetch from "electron-fetch";
import * as fs from "fs-extra";
import * as path from "path";
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
import HPOTuner from "./stt/hpo-tuner";
import FocusHistoryService from "./runtime/focus-history-service";
import RuntimeCommandEmitter from "./runtime/runtime-command-emitter";
import RuntimeCommandDispatcher from "./runtime/runtime-command-dispatcher";
import { RuntimeExecutionPort, RuntimeShellCallbackPort } from "./runtime/runtime-dispatch-ports";
import {
  CommandRiskLevel,
  InteractionMode,
} from "./runtime/authorization-service";
import {
  SecurityMode,
  EnrollmentStatus,
  SpeakerRole,
} from "./runtime/identity-gateway-service";
import { EnrollmentPersistenceState } from "./runtime/speaker-enrollment-service";
import { SecuritySessionPersistenceState } from "./runtime/security-session-policy-service";
import * as examples from "./examples";
import { SpeechRecorder } from "./audio";

interface SecurityRuntimePersistencePayload {
  version: number;
  activeProfileId: string;
  profilesLastAction: string;
  profilesLastError: string;
  enrollmentState: EnrollmentPersistenceState;
  securitySessionState?: SecuritySessionPersistenceState;
  savedAt: string;
}

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
  private hpoTuner?: HPOTuner;
  private securityActiveProfileId: string = "";
  private securityProfilesLastAction: string = "";
  private securityProfilesLastError: string = "";
  private securityPersistInterval?: NodeJS.Timeout;
  private lastPersistedSecurityStateJson = "";

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
    const focusHistory = new FocusHistoryService(log);

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
      system,
      focusHistory
    );

    const nativeCommands = new NativeCommands(active, insertHistory, revisionBoxWindow, system);
    const api = new API(active, bridge, log, mainWindow, metadata, settings, () => settingsWindow);
    
    // Create STT tracking instance for correlation IDs and metrics
    const tracking = new STTTracking(api, settings);
    
    // Create HPOTuner for online optimization
    const hpoTuner = (instance.hpoTuner = new HPOTuner(settings, log, tracking));
    
    const stream = (instance.stream = new Stream(active, api, log, settings, tracking));
    const runtimeCommandEmitter = new RuntimeCommandEmitter(log);
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
      log,
      () => instance.getSecurityPanelState()
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
      () => settingsWindow,
      settings,
      stream,
      system,
      () => commandHandler
    ));
    instance.loadSecurityRuntimeState();
    const runtimeCommandDispatcher = new RuntimeCommandDispatcher(
      custom as RuntimeShellCallbackPort,
      runtimeCommandEmitter,
      executor as RuntimeExecutionPort,
      log
    );
    stream.setRuntimeCommandDispatcher(runtimeCommandDispatcher);

    // Note: Executor test methods are available but not exposed to window
    // Recovery is tested automatically when focus commands fail verification

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
      tracking,
      runtimeCommandDispatcher
    ));

    // Initialize Arqon Bus client for shadow publishing
    const busClient = createBusClient(settings, log, tracking, hpoTuner);
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

    // Initialise HPO service if enabled
    await hpoTuner.start();

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
    instance.startSecurityPersistenceLoop();

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
      const [coreHealthy, speechHealthy, codeHealthy] = await Promise.all([
        localServiceHealthy("http://localhost:17200/api/status"),
        localServiceHealthy("http://localhost:17202/api/status"),
        localServiceHealthy("http://localhost:17203/api/status"),
      ]);
      initialLoggedIn = initialLoggedIn && coreHealthy && speechHealthy && codeHealthy;
      if (!initialLoggedIn) {
        console.warn(
          "[ArqonMaestro] Local endpoint selected but local backend is not fully healthy yet."
        );
        console.warn("[ArqonMaestro] Local endpoint is configured fail-closed. Remote fallback disabled.");
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
        const [coreHealthy, speechHealthy, codeHealthy] = await Promise.all([
          localServiceHealthy("http://localhost:17200/api/status"),
          localServiceHealthy("http://localhost:17202/api/status"),
          localServiceHealthy("http://localhost:17203/api/status"),
        ]);

        if (coreHealthy && speechHealthy && codeHealthy) {
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
    this.persistSecurityRuntimeState("app_quit");
    if (this.securityPersistInterval) {
      clearInterval(this.securityPersistInterval);
      this.securityPersistInterval = undefined;
    }
    this.local?.stop();
    this.custom?.stop();
    this.microphone?.stop();
    this.busPluginServer?.stop();
    this.hpoTuner?.stop();
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
    const securityState = this.getSecurityPanelState();
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
        ...securityState,
      },
      windows ? windows : [this.mainWindow, this.miniModeWindow, this.settingsWindow]
    );
  }

  getSecurityPanelState(): Record<string, unknown> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return {
        securityMode: SecurityMode.NORMAL,
        securityInteractionMode: InteractionMode.COMMAND,
        securityIdentityState: "unknown",
        securityIdentityDisplayName: "",
        securityIdentityId: "",
        securityContaminated: false,
        securityIsVerified: false,
        securityConfidenceValue: 0,
        securityEvidenceReady: false,
        securityVerificationProviderReady: false,
        securityDiarizationProviderReady: false,
        securityVerificationProviderError: "identity_gateway_unavailable",
        securityDiarizationProviderError: "identity_gateway_unavailable",
        securityEnrollmentCount: 0,
        securityEnrollmentActive: false,
        securityEnrollmentStatus: "pending",
        securityEnrollmentName: "",
        securityProfiles: [],
        securityActiveProfileId: "",
        securityProfilesLastAction: "",
        securityProfilesLastError: "",
        securityLastAuthorizationDecision: "",
        securityLastAuthorizationReason: "",
        securityLastAuthorizationReasonCode: "",
        securityLastBlockedCommand: "",
        securityLastBlockedAt: "",
        securityPolicyMode: "assist",
        securityRequiresReauthNext: false,
        securityGraceValid: false,
        securityGraceExpiresAt: "",
        securityLastReasonCode: "",
        securityLastLifecyclePhase: "heard",
        securityLastInteractionId: 0,
        securityReplayGeneratedAt: "",
        securityReplayTotalRecords: 0,
        securityReplaySessionEventCount: 0,
        securityReplayLastSequence: 0,
      };
    }

    const context = gateway.getIdentityContext();
    const evidence = gateway.getIdentityEvidenceStatus();
    const status = this.executor?.getLastAuthorizationStatus();
    const activeProfileId =
      this.resolveSecurityActiveProfileId(gateway) || context.identityId || "default_owner";
    const enrollment = gateway.getEnrollment(activeProfileId);
    const resolvedIdentityDisplayName =
      enrollment?.displayName || context.displayName || context.identityId || "";
    const securityProfiles = gateway
      .getAllEnrollments()
      .map((profile) => ({
        id: profile.identityId,
        displayName: profile.displayName,
        status: profile.status,
        role: profile.role,
        isActive: profile.identityId === activeProfileId,
        enrolledAt: profile.enrolledAt,
        updatedAt: profile.updatedAt,
        lastVerifiedAt: profile.lastVerifiedAt || "",
      }));

    return {
      securityMode: context.securityMode,
      securityInteractionMode: context.interactionMode,
      securityIdentityState: context.identityState,
      securityIdentityDisplayName: resolvedIdentityDisplayName,
      securityIdentityId: context.identityId || "",
      securityContaminated: context.contaminated,
      securityIsVerified: context.isVerified,
      securityConfidenceValue: context.confidenceValue,
      securityEvidenceReady: evidence.ready,
      securityVerificationProviderReady: evidence.verificationProviderReady,
      securityDiarizationProviderReady: evidence.diarizationProviderReady,
      securityVerificationProviderError: evidence.verificationLoadError || "",
      securityDiarizationProviderError: evidence.diarizationLoadError || "",
      securityEnrollmentCount: gateway.getAllEnrollments().length,
      securityEnrollmentActive: !!enrollment,
      securityEnrollmentStatus: enrollment?.status || "pending",
      securityEnrollmentName: enrollment?.displayName || "",
      securityProfiles,
      securityActiveProfileId: activeProfileId,
      securityProfilesLastAction: this.securityProfilesLastAction,
      securityProfilesLastError: this.securityProfilesLastError,
      securityLastAuthorizationDecision: status?.decision || "",
      securityLastAuthorizationReason: status?.reason || "",
      securityLastAuthorizationReasonCode: status?.reasonCode || "",
      securityLastBlockedCommand: status?.blockedCommand || "",
      securityLastBlockedAt: status?.blockedAt || "",
      securityPolicyMode: status?.securityPolicyMode || "assist",
      securityRequiresReauthNext: !!status?.securityRequiresReauthNext,
      securityGraceValid: !!status?.securityGraceValid,
      securityGraceExpiresAt: status?.securityGraceExpiresAt || "",
      securityLastReasonCode: status?.securitySessionReasonCode || status?.reasonCode || "",
      securityLastLifecyclePhase: status?.securityLastLifecyclePhase || "heard",
      securityLastInteractionId: status?.securityLastInteractionId || 0,
      securityReplayGeneratedAt: status?.securityReplayGeneratedAt || "",
      securityReplayTotalRecords: status?.securityReplayTotalRecords || 0,
      securityReplaySessionEventCount: status?.securityReplaySessionEventCount || 0,
      securityReplayLastSequence: status?.securityReplayLastSequence || 0,
    };
  }

  onTranscriptHeard(): void {
    this.executor?.onTranscriptHeard();
  }

  onPauseToListeningBoundary(): void {
    this.executor?.onPauseToListeningBoundary();
    this.persistSecurityRuntimeState("pause_to_listen_boundary");
  }

  private securityRuntimeStateFile(): string {
    return path.join(this.settings?.path() || "", "security-runtime-state.json");
  }

  private loadSecurityRuntimeState(): void {
    if (!this.settings || !this.executor) {
      return;
    }
    const file = this.securityRuntimeStateFile();
    try {
      if (!fs.existsSync(file)) {
        return;
      }
      const raw = fs.readFileSync(file, "utf8");
      const parsed = JSON.parse(raw) as Partial<SecurityRuntimePersistencePayload>;
      const gateway = this.executor.getIdentityGateway();
      gateway.restoreEnrollmentState(parsed.enrollmentState);
      if (typeof parsed.activeProfileId === "string" && parsed.activeProfileId.trim()) {
        this.securityActiveProfileId = parsed.activeProfileId.trim();
      }
      if (typeof parsed.profilesLastAction === "string") {
        this.securityProfilesLastAction = parsed.profilesLastAction;
      }
      if (typeof parsed.profilesLastError === "string") {
        this.securityProfilesLastError = parsed.profilesLastError;
      }
      this.executor.restoreSecuritySessionState(parsed.securitySessionState);
      this.lastPersistedSecurityStateJson = JSON.stringify(parsed);
      this.log?.logVerbose(
        `[SecurityRuntimeState] Restored state from ${file} (version=${parsed.version || "unknown"})`
      );
    } catch (error) {
      this.securityProfilesLastError = "security_runtime_state_restore_failed";
      this.log?.logError(`[SecurityRuntimeState] Failed to restore state from ${file}: ${error}`);
    }
  }

  private buildSecurityRuntimePersistencePayload(): SecurityRuntimePersistencePayload | undefined {
    if (!this.executor) {
      return undefined;
    }
    const gateway = this.executor.getIdentityGateway();
    return {
      version: 1,
      activeProfileId: this.securityActiveProfileId || "",
      profilesLastAction: this.securityProfilesLastAction || "",
      profilesLastError: this.securityProfilesLastError || "",
      enrollmentState: gateway.exportEnrollmentState(),
      securitySessionState: this.executor.exportSecuritySessionState(),
      savedAt: new Date().toISOString(),
    };
  }

  private persistSecurityRuntimeState(reason: string): void {
    if (!this.settings) {
      return;
    }
    const payload = this.buildSecurityRuntimePersistencePayload();
    if (!payload) {
      return;
    }
    try {
      const file = this.securityRuntimeStateFile();
      const next = JSON.stringify(payload, null, 2);
      if (next === this.lastPersistedSecurityStateJson) {
        return;
      }
      fs.mkdirpSync(path.dirname(file));
      fs.writeFileSync(file, next, "utf8");
      this.lastPersistedSecurityStateJson = next;
      this.log?.logVerbose(`[SecurityRuntimeState] Persisted (${reason}) -> ${file}`);
    } catch (error) {
      this.securityProfilesLastError = "security_runtime_state_persist_failed";
      this.log?.logError(`[SecurityRuntimeState] Failed to persist (${reason}): ${error}`);
    }
  }

  private startSecurityPersistenceLoop(): void {
    if (this.securityPersistInterval) {
      return;
    }
    this.securityPersistInterval = setInterval(() => {
      this.persistSecurityRuntimeState("interval");
    }, 10_000);
  }

  private resolveSecurityActiveProfileId(gateway: NonNullable<ReturnType<Executor["getIdentityGateway"]>>): string {
    if (this.securityActiveProfileId && gateway.getEnrollment(this.securityActiveProfileId)) {
      return this.securityActiveProfileId;
    }

    const active = gateway.getActiveEnrollments()[0] || gateway.getAllEnrollments()[0];
    this.securityActiveProfileId = active?.identityId || "";
    return this.securityActiveProfileId;
  }

  async createSecurityProfile(displayName: string): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }
    const allProfiles = gateway.getAllEnrollments();
    const identityId = `profile_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const normalizedDisplayName = (displayName || "").trim() || "New Profile";
    await gateway.createEnrollment({
      identityId,
      displayName: normalizedDisplayName,
      role: allProfiles.length === 0 ? SpeakerRole.SOVEREIGN_OWNER : SpeakerRole.APPROVED_USER,
      metadata: {
        createdBy: "settings_profiles_tab",
      },
    });
    if (!this.securityActiveProfileId) {
      this.securityActiveProfileId = identityId;
    }
    this.securityProfilesLastAction = `created:${identityId}`;
    this.securityProfilesLastError = "";
    this.persistSecurityRuntimeState("create_profile");
  }

  async updateSecurityProfile(
    profileId: string,
    updates: { displayName?: string; status?: EnrollmentStatus }
  ): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway || !profileId) {
      return;
    }
    await gateway.updateEnrollment(profileId, {
      displayName: updates.displayName,
      status: updates.status,
    });
    this.securityProfilesLastAction = `updated:${profileId}`;
    this.securityProfilesLastError = "";
    this.persistSecurityRuntimeState("update_profile");
  }

  async switchSecurityProfile(profileId: string): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway || !profileId) {
      return;
    }
    const enrollment = gateway.getEnrollment(profileId);
    if (!enrollment) {
      const message = `security_profile_not_found:${profileId}`;
      this.securityProfilesLastError = message;
      throw new Error(message);
    }
    this.securityActiveProfileId = profileId;
    this.securityProfilesLastAction = `switched:${profileId}`;
    this.securityProfilesLastError = "";
    this.persistSecurityRuntimeState("switch_profile");
  }

  async deleteSecurityProfile(profileId: string): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway || !profileId) {
      return;
    }
    const activeId = this.resolveSecurityActiveProfileId(gateway);
    if (profileId === activeId) {
      const message = "security_profile_delete_active_blocked";
      this.securityProfilesLastError = message;
      throw new Error(message);
    }
    await gateway.deleteEnrollment(profileId);
    this.securityProfilesLastAction = `deleted:${profileId}`;
    this.securityProfilesLastError = "";
    this.persistSecurityRuntimeState("delete_profile");
  }

  async reEnrollSecurityProfile(profileId: string): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway || !profileId) {
      return;
    }
    const enrollment = gateway.getEnrollment(profileId);
    if (!enrollment) {
      const message = `security_profile_not_found:${profileId}`;
      this.securityProfilesLastError = message;
      throw new Error(message);
    }
    await gateway.reactivateEnrollment(profileId);
    this.securityActiveProfileId = profileId;
    this.securityProfilesLastAction = `reenrolled:${profileId}`;
    this.securityProfilesLastError = "";
    this.persistSecurityRuntimeState("reenroll_profile");
  }

  async listSecurityProfiles(): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }
    // No-op read for now; state is exposed via getSecurityPanelState().
    gateway.getAllEnrollments();
  }

  setSecurityProfilesError(message: string): void {
    this.securityProfilesLastError = message || "";
  }

  async setSecurityMode(mode: SecurityMode): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }
    await gateway.setSecurityMode(mode, "settings_security_tab");
    if (this.executor) {
      const policyMode =
        mode === SecurityMode.RESTRICTED
          ? "locked"
          : mode === SecurityMode.SHARED_ROOM || mode === SecurityMode.SECURE
          ? "assist"
          : "pilot";
      this.executor.setSecurityPolicyMode(policyMode);
    }
    this.persistSecurityRuntimeState("set_security_mode");
  }

  syncSecurityInteractionModeFromRuntime(dictateMode: boolean): void {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }
    gateway.setInteractionMode(dictateMode ? InteractionMode.DICTATION : InteractionMode.COMMAND);
  }

  async upsertSecurityEnrollment(displayName: string): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }

    const identityId = this.resolveSecurityActiveProfileId(gateway) || "default_owner";
    const existing = gateway.getEnrollment(identityId);
    if (existing) {
      await gateway.updateEnrollment(identityId, {
        displayName: (displayName || existing.displayName).trim() || existing.displayName,
        role: SpeakerRole.SOVEREIGN_OWNER,
        // Re-enroll should reactivate revoked/suspended identities.
        status: EnrollmentStatus.ACTIVE,
      });
      return;
    }

    await gateway.createEnrollment({
      identityId,
      displayName: (displayName || "Primary User").trim(),
      role: SpeakerRole.SOVEREIGN_OWNER,
      metadata: {
        createdBy: "settings_security_tab",
      },
    });
    this.persistSecurityRuntimeState("upsert_enrollment_create");
  }

  async resetSecurityEnrollment(): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }
    const activeProfileId = this.resolveSecurityActiveProfileId(gateway) || "default_owner";
    if (gateway.getEnrollment(activeProfileId)) {
      await gateway.revokeEnrollment(activeProfileId);
    }
    await gateway.resetVerification();
    this.persistSecurityRuntimeState("reset_enrollment");
  }

  async runSecurityAuthorizationProbe(): Promise<void> {
    const gateway = this.executor?.getIdentityGateway();
    if (!gateway) {
      return;
    }

    // Bounded verification probe for settings-driven enrollment flow:
    // in this slice we synthesize a deterministic verification result for the
    // active enrolled identity so security status can transition to verified
    // before policy probe evaluation.
    const activeProfileId = this.resolveSecurityActiveProfileId(gateway) || "default_owner";
    const enrolledIdentity =
      gateway.getEnrollment(activeProfileId) || gateway.getActiveEnrollments()[0];
    if (enrolledIdentity && enrolledIdentity.status === EnrollmentStatus.ACTIVE) {
      const threshold = enrolledIdentity.verificationThreshold?.minConfidence ?? 0.8;
      const confidence = Math.min(0.99, Math.max(threshold + 0.08, 0.9));
      await gateway.processVerificationResult({
        matched: true,
        claimedIdentityId: enrolledIdentity.identityId,
        confidence,
        providerData: {
          provider: "settings_security_probe",
          source: "settings_test_verification",
        },
      });
    }

    await gateway.authorize({
      commandFamily: "filesystem",
      commandVerb: "delete",
      riskLevel: CommandRiskLevel.HIGH,
      target: "settings_probe",
    });
    this.persistSecurityRuntimeState("security_authorization_probe");
  }

  async enrollAndVerifySecurityProfile(displayName: string): Promise<void> {
    await this.upsertSecurityEnrollment(displayName);
    await this.runSecurityAuthorizationProbe();
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
