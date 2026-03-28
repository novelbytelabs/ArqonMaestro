import { screen } from "electron";
import { jsonc } from "jsonc";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import Microphone from "./stream/microphone";
import { core } from "../gen/core";
import { Endpoint } from "../shared/endpoint";
import { devices } from "./audio";

export type Theme = "light" | "dark" | "system";

export default class Settings {
  private loaded = false;
  private systemData: any = {};
  private userData: any = {};
  private wordsData: any = {};
  private wordsLastLoad: number = 0;
  private legacyLogFiles = [
    "arqon.log",
    "serenade.log",
    "error.log",
    "verbose.log",
    "core.log",
    "speech-engine.log",
    "code-engine.log",
  ];

  constructor() {
    this.setInstalled(true);
  }

  private createIfNotExists(file: string) {
    fs.mkdirpSync(path.dirname(file));
    if (!fs.existsSync(file)) {
      fs.closeSync(fs.openSync(file, "w"));
    }
  }

  private preferredPath(): string {
    return path.join(os.homedir(), ".arqon");
  }

  private legacyPath(): string {
    return path.join(os.homedir(), ".serenade");
  }

  private dataForFile(file: string): any {
    if (file == "user") {
      return this.userData;
    } else if (file == "system") {
      return this.systemData;
    } else if (file == "words") {
      return this.wordsData;
    }
  }

  private get(file: string, key: string, defaultValue?: any): any {
    if (!this.loaded) {
      this.load();
      this.loaded = true;
    }

    let data = this.dataForFile(file);
    if (data[key] === undefined) {
      return defaultValue;
    }

    return data[key];
  }

  private load() {
    this.systemData = {};
    this.userData = {};
    this.wordsData = {};

    this.migrateLegacyStateIfNeeded();
    this.migrateLegacyFileIfNeeded(this.systemFile(), this.legacySystemFile());
    this.migrateLegacyFileIfNeeded(this.userFile(), this.legacyUserFile());
    this.migrateLegacyFileIfNeeded(this.wordsFile(), this.legacyWordsFile());

    this.createIfNotExists(this.systemFile());
    this.createIfNotExists(this.userFile());
    this.createIfNotExists(this.wordsFile());

    const systemFileContent = fs.readFileSync(this.systemFile()).toString();
    if (systemFileContent) {
      this.systemData = JSON.parse(systemFileContent);
    }

    const userFileContent = fs.readFileSync(this.userFile()).toString();
    if (userFileContent) {
      this.userData = JSON.parse(userFileContent);
    }

    let migrated = false;
    const legacySystemSettings = this.userData.system;
    if (legacySystemSettings && typeof legacySystemSettings == "object") {
      const legacyEndpoint = legacySystemSettings.streaming_endpoint;
      const currentEndpoint = this.systemData.streaming_endpoint;
      if (
        typeof legacyEndpoint == "string" &&
        legacyEndpoint.length > 0 &&
        !currentEndpoint
      ) {
        this.systemData.streaming_endpoint = legacyEndpoint;
        migrated = true;
      }

      if (legacySystemSettings.streaming_endpoint !== undefined) {
        delete legacySystemSettings.streaming_endpoint;
        migrated = true;
      }

      if (Object.keys(legacySystemSettings).length == 0) {
        delete this.userData.system;
        migrated = true;
      }
    }

    const wordsFileContent = fs.readFileSync(this.wordsFile()).toString();
    if (wordsFileContent) {
      try {
        this.wordsData = jsonc.parse(wordsFileContent);
      } catch (e) {}
    }

    if (migrated) {
      this.save();
    }
  }

  private save() {
    this.createIfNotExists(this.systemFile());
    this.createIfNotExists(this.userFile());

    fs.writeFileSync(this.systemFile(), JSON.stringify(this.systemData, null, 2));
    fs.writeFileSync(this.userFile(), JSON.stringify(this.userData, null, 2));
  }

  private set(file: string, key: string, value: any) {
    if (!this.loaded) {
      this.load();
      this.loaded = true;
    }

    let data = this.dataForFile(file);
    data[key] = value;
    this.save();
  }

  private systemFile(): string {
    return path.join(this.preferredPath(), "arqon.json");
  }

  private userFile(): string {
    return path.join(this.preferredPath(), "settings.json");
  }

  private wordsFile(): string {
    return path.join(this.preferredPath(), "words.json");
  }

  private legacySystemFile(): string {
    return path.join(this.legacyPath(), "serenade.json");
  }

  private legacyUserFile(): string {
    return path.join(this.legacyPath(), "settings.json");
  }

  private legacyWordsFile(): string {
    return path.join(this.legacyPath(), "words.json");
  }

  private migrateLegacyFileIfNeeded(preferred: string, legacy: string) {
    if (!fs.existsSync(legacy)) {
      return;
    }

    const preferredExists = fs.existsSync(preferred);
    const preferredSize = preferredExists ? fs.statSync(preferred).size : 0;
    const legacySize = fs.statSync(legacy).size;
    if (preferredExists && preferredSize > 0) {
      return;
    }

    if (legacySize == 0) {
      return;
    }

    fs.mkdirpSync(path.dirname(preferred));
    fs.copyFileSync(legacy, preferred);
  }

  private migrateLegacyDirectoryIfNeeded(preferred: string, legacy: string) {
    if (!fs.existsSync(legacy) || !fs.statSync(legacy).isDirectory()) {
      return;
    }

    const preferredExists = fs.existsSync(preferred);
    if (preferredExists && fs.statSync(preferred).isDirectory() && fs.readdirSync(preferred).length > 0) {
      return;
    }

    fs.mkdirpSync(path.dirname(preferred));
    fs.copySync(legacy, preferred, {
      overwrite: false,
      errorOnExist: false,
    });
  }

  private migrateLegacyStateIfNeeded() {
    fs.mkdirpSync(this.preferredPath());
    this.migrateLegacyDirectoryIfNeeded(
      path.join(this.preferredPath(), "scripts"),
      path.join(this.legacyPath(), "scripts")
    );

    for (const name of this.legacyLogFiles) {
      this.migrateLegacyFileIfNeeded(
        path.join(this.preferredPath(), name),
        path.join(this.legacyPath(), name)
      );
    }
  }

  revisionBoxTrigger(app: string): string {
    const data = this.getShowRevisionBox();
    if (app) {
      for (const k of Object.keys(data)) {
        if (app.includes(k)) {
          if (data[k] === true) {
            return "auto";
          } else if (data[k] === false) {
            return "never";
          }

          return data[k];
        }
      }
    }

    return data["default"] || data.all_apps || "never";
  }

  getAnimations(): boolean {
    return this.get("user", "animations", false);
  }

  getBounds(): any {
    const result = this.get("system", "bounds", { x: 0, y: 0, width: 0, height: 0 });
    const display = screen.getDisplayNearestPoint({ x: result.x, y: result.y });
    if (result.x < display.workArea.x || result.x > display.workArea.x + display.workArea.width) {
      result.x = display.workArea.x;
    }
    if (result.y < display.workArea.y || result.y > display.workArea.y + display.workArea.height) {
      result.y = display.workArea.y;
    }

    return result;
  }

  getChunkSilenceThreshold(): number {
    return this.get("user", "chunk_silence_threshold", 0.3);
  }

  getChunkSpeechThreshold(): number {
    return this.get("user", "chunk_speech_threshold", 0.3);
  }

  getClipboardInsert(): boolean {
    return this.get("user", "clipboard_insert", true);
  }

  getContinueRunningInTray(): boolean {
    return this.get("user", "continue_running_in_tray", false);
  }

  async getCustomHints(): Promise<string[]> {
    await this.loadWordsFileIfNeeded();
    const result = this.get("words", "hints", []);
    if (Array.isArray(result) && result.every((item) => typeof item === "string")) {
      return result;
    }

    return [];
  }

  async getCustomWords(): Promise<any> {
    await this.loadWordsFileIfNeeded();
    const result = this.get("words", "words", {});
    if (
      Object.keys(result).every((key) => typeof key === "string" && typeof result[key] === "string")
    ) {
      return result;
    }

    return {};
  }

  getDarkMode(): Theme {
    return this.get("user", "dark_mode", "system");
  }

  getDisableAnalytics(): boolean {
    return this.get("user", "disable_analytics", false);
  }

  getDisableSuggestions(): boolean {
    return this.get("user", "disable_suggestions", false);
  }

  getDisableAutoUpdate(): boolean {
    return this.get("system", "disable_auto_update", false);
  }

  getEditorAutocomplete(): boolean {
    return this.get("user", "autocomplete", false);
  }

  getExecuteSilenceThreshold(): number {
    return this.get("user", "execute_silence_threshold", 1);
  }

  getLogAudio(): boolean {
    // support legacy setting
    const legacy = this.get("user", "local_logging_opt_out", undefined);
    if (legacy === true) {
      this.set("user", "log_audio", false);
      return false;
    }

    return this.get("user", "log_audio", false);
  }

  getLogSource(): boolean {
    // support legacy setting
    const legacy = this.get("user", "local_logging_opt_out", undefined);
    if (legacy === true) {
      this.set("user", "log_source", false);
      return false;
    }

    return this.get("user", "log_source", false);
  }

  getMicrophone(): any {
    // use the microphone from settings only if the microphone at that index has a matching name.
    // microphones can re-order and different microphones can have the same name,
    // so only set to a non-default microphone if it matches both name and index.
    const data = this.get("system", "microphone", Microphone.systemDefaultMicrophone);
    if (data.id != Microphone.systemDefaultMicrophone.id) {
      const active = devices().filter((e: any) => e.id == data.id);
      if (active.length != 1 || active[0].name != data.name) {
        this.setMicrophone(Microphone.systemDefaultMicrophone);
      }
    }

    return this.get("system", "microphone", Microphone.systemDefaultMicrophone);
  }

  getMinimizedPosition(): string {
    return this.get(
      "user",
      "minimized_position",
      os.platform() == "win32" ? "bottom-right" : "top-right"
    );
  }

  getMiniMode(): boolean {
    return this.get("user", "mini_mode", true);
  }

  getMiniModeFewerAlternativesCount(): number {
    return this.get("user", "mini_mode_fewer_alternatives_count", 5);
  }

  getMiniModeHideTimeout(): number {
    return this.get("user", "mini_mode_timeout_value", 5);
  }

  getMiniModeReversed(): boolean {
    return this.get("user", "mini_mode_reversed", true);
  }

  getPlugins(): string[] {
    return this.get("system", "plugins", []);
  }

  getPluginInstalled(plugin: string): boolean {
    return this.getPlugins().includes(plugin);
  }

  getNuxCompleted(): boolean {
    return this.get("system", "nux_completed", false);
  }

  getNuxStep(): number {
    return this.get("system", "nux_step", 0);
  }

  getNuxTutorialName(): string {
    return this.get("system", "nux_tutorial_name", "");
  }

  getPasteKeys(app?: string): { key: string; modifiers: string[] } {
    const data = this.get("user", "paste_override", {
      "gnome-terminal": { key: "v", modifiers: ["control", "shift"] },
    });

    if (app) {
      for (const k of Object.keys(data)) {
        if (app.includes(k)) {
          return { key: data[k].key, modifiers: data[k].modifiers };
        }
      }
    }

    return { key: "v", modifiers: os.platform() == "darwin" ? ["command"] : ["control"] };
  }

  getPushToTalk(): string {
    return this.get("user", "push_to_talk", "Alt+Space");
  }

  getShowRevisionBox(): any {
    return this.get("user", "show_revision_box", { all_apps: false });
  }

  getStreamingEndpoint(): Endpoint {
    const endpoints = this.getStreamingEndpoints();
    const endpoint = this.get("system", "streaming_endpoint", "us-west-2");
    return endpoints.filter((e: Endpoint) => e.id == endpoint)[0];
  }

  getStreamingEndpoints(): Endpoint[] {
    return this.get("system", "streaming_endpoints", [
      {
        id: "us-west-2",
        name: "US West Coast",
        address: "stream-us-west-2.serenade.ai",
      },
      {
        id: "us-east-1",
        name: "US East Coast",
        address: "stream-us-east-1.serenade.ai",
      },
      {
        id: "eu-west-2",
        name: "Europe",
        address: "stream-eu-west-2.serenade.ai",
      },
      {
        id: "local",
        name: "Local",
        address: "localhost:17200",
      },
    ]);
  }

  getStylers(): any {
    return this.get("user", "stylers", {});
  }

  getTextInputKeybinding(): string {
    return this.get("user", "text_input_keybinding", "Ctrl+Alt+Space");
  }

  getToken(): string {
    return this.get("system", "token", "");
  }

  getUseAccessibilityApi(): string[] {
    return this.get("user", "use_accessibility_api", []);
  }

  getUseMiniModeHideTimeout(): boolean {
    return this.get("user", "mini_mode_timeout", false);
  }

  getUseMiniModeFewerAlternatives(): boolean {
    return this.get("user", "mini_mode_fewer_alternatives", false);
  }

  getUseVerboseLogging(): boolean {
    return this.get("user", "verbose_logging", false);
  }

  async loadWordsFileIfNeeded() {
    const modified = (await fs.stat(this.wordsFile())).mtime.getTime();
    if (modified > this.wordsLastLoad) {
      this.load();
      this.wordsLastLoad = modified;
    }
  }

  path() {
    fs.mkdirpSync(this.preferredPath());
    return path.dirname(this.systemFile());
  }

  setAnimations(animations: boolean) {
    this.set("user", "animations", animations);
  }

  setBounds(bounds: { x: number; y: number; width: number; height: number }) {
    this.set("system", "bounds", bounds);
  }

  setChunkSilenceThreshold(threshold: number) {
    return this.set("user", "chunk_silence_threshold", threshold);
  }

  setChunkSpeechThreshold(threshold: number) {
    return this.set("user", "chunk_speech_threshold", threshold);
  }

  setClipboardInsert(clipboardInsert: boolean) {
    return this.set("user", "clipboard_insert", clipboardInsert);
  }

  setContinueRunningInTray(continueRunningInTray: boolean) {
    this.set("user", "continue_running_in_tray", continueRunningInTray);
  }

  setDarkMode(darkMode: string) {
    this.set("user", "dark_mode", darkMode);
  }

  setDisableSuggestions(disableSuggestions: boolean) {
    return this.set("user", "disable_suggestions", disableSuggestions);
  }

  setEditorAutocomplete(autocomplete: boolean) {
    this.set("user", "autocomplete", autocomplete);
  }

  setExecuteSilenceThreshold(threshold: number) {
    return this.set("user", "execute_silence_threshold", threshold);
  }

  setInstalled(installed: boolean) {
    this.set("system", "installed", installed);
  }

  setLogAudio(logAudio: boolean) {
    this.set("user", "log_audio", logAudio);
  }

  setLogSource(logSource: boolean) {
    this.set("user", "log_source", logSource);
  }

  setMicrophone(microphone: any) {
    return this.set("system", "microphone", microphone);
  }

  setMinimizedPosition(position: string) {
    this.set("user", "minimized_position", position);
  }

  setMiniMode(miniMode: boolean) {
    this.set("user", "mini_mode", miniMode);
  }

  setMiniModeFewerAlternativesCount(fewerAlternativesCount: number) {
    this.set("user", "mini_mode_fewer_alternatives_count", fewerAlternativesCount);
  }

  setMiniModeHideTimeout(timeout: number) {
    this.set("user", "mini_mode_timeout_value", timeout);
  }

  setMiniModeReversed(reversed: boolean) {
    return this.set("user", "mini_mode_reversed", reversed);
  }

  setNuxCompleted(completed: boolean) {
    this.set("system", "nux_completed", completed);
  }

  setNuxStep(step: number) {
    this.set("system", "nux_step", step);
  }

  setNuxTutorialName(name: string) {
    this.set("system", "nux_tutorial_name", name);
  }

  setPluginInstalled(plugin: string) {
    let data = this.dataForFile("system");
    if (!data.plugins) {
      data.plugins = [];
    }

    if (!data.plugins.includes(plugin)) {
      data.plugins.push(plugin);
    }
  }

  setPushToTalk(pushToTalk: string) {
    this.set("user", "push_to_talk", pushToTalk);
  }

  setShowRevisionBox(data: any): any {
    this.set("user", "show_revision_box", {
      ...this.getShowRevisionBox(),
      ...data,
    });
  }

  setStreamingEndpoint(endpoint: string) {
    this.set("system", "streaming_endpoint", endpoint);
  }

  setStylers(stylers: any) {
    this.set("user", "stylers", stylers);
  }

  setTextInputKeybinding(textInputKeybinding: string) {
    this.set("user", "text_input_keybinding", textInputKeybinding);
  }

  setToken(token: string) {
    this.set("system", "token", token);
  }

  setUseMiniModeFewerAlternatives(fewerAlternatives: boolean) {
    this.set("user", "mini_mode_fewer_alternatives", fewerAlternatives);
  }

  setUseMiniModeHideTimeout(timeout: boolean) {
    this.set("user", "mini_mode_timeout", timeout);
  }

  setUseVerboseLogging(verboseLogging: boolean) {
    this.set("user", "verbose_logging", verboseLogging);
  }

  // ========================================================================
  // ArqonHPO Configuration
  // ========================================================================

  /**
   * Get whether ArqonHPO homeostatic tuning is enabled
   * Gate 6B default: false (fail-closed)
   */
  getArqonHpoHomeostasisEnabled(): boolean {
    return this.get("system", "arqon_hpo_homeostasis_enabled", false);
  }

  /**
   * Set ArqonHPO homeostatic tuning enabled state
   */
  setArqonHpoHomeostasisEnabled(enabled: boolean) {
    this.set("system", "arqon_hpo_homeostasis_enabled", enabled);
  }

  /**
   * Get whether ArqonHPO is in dry-run mode
   * Gate 6B default: true
   */
  getArqonHpoDryRun(): boolean {
    return this.get("system", "arqon_hpo_dry_run", true);
  }

  /**
   * Set ArqonHPO dry-run mode
   */
  setArqonHpoDryRun(dryRun: boolean) {
    this.set("system", "arqon_hpo_dry_run", dryRun);
  }

  // ========================================================================
  // Arqon Bus Configuration
  // ========================================================================

  /**
   * Get whether Arqon Bus integration is enabled
   * Production default: true (after cutover)
   */
  getArqonBusEnabled(): boolean {
    return this.get("system", "arqon_bus_enabled", false);
  }

  /**
   * Set Arqon Bus enabled state
   */
  setArqonBusEnabled(enabled: boolean) {
    this.set("system", "arqon_bus_enabled", enabled);
  }

  /**
   * Get Arqon Bus WebSocket URL
   */
  getArqonBusWsUrl(): string {
    return this.get("system", "arqon_bus_ws_url", "ws://localhost:9100");
  }

  /**
   * Set Arqon Bus WebSocket URL
   */
  setArqonBusWsUrl(url: string) {
    this.set("system", "arqon_bus_ws_url", url);
  }

  /**
   * Get Arqon Bus shadow mode setting
   * When enabled, messages are published but responses are not acted upon
   * Production default: false (after cutover)
   */
  getArqonBusShadowMode(): boolean {
    return this.get("system", "arqon_bus_shadow_mode", true);
  }

  /**
   * Set Arqon Bus shadow mode
   */
  setArqonBusShadowMode(shadowMode: boolean) {
    this.set("system", "arqon_bus_shadow_mode", shadowMode);
  }

  /**
   * Get Arqon Bus room name
   */
  getArqonBusRoom(): string {
    return this.get("system", "arqon_bus_room", "stt");
  }

  /**
   * Set Arqon Bus room name
   */
  setArqonBusRoom(room: string) {
    this.set("system", "arqon_bus_room", room);
  }

  /**
   * Get Arqon Bus channel name
   */
  getArqonBusChannel(): string {
    return this.get("system", "arqon_bus_channel", "transcription");
  }

  /**
   * Set Arqon Bus channel name
   */
  setArqonBusChannel(channel: string) {
    this.set("system", "arqon_bus_channel", channel);
  }

  // ========================================================================
  // Arqon Bus Comparison Configuration
  // ========================================================================

  /**
   * Get whether comparison mode is enabled
   */
  getArqonBusCompareEnabled(): boolean {
    return this.get("system", "arqon_bus_compare_enabled", false);
  }

  /**
   * Set comparison mode enabled
   */
  setArqonBusCompareEnabled(enabled: boolean) {
    this.set("system", "arqon_bus_compare_enabled", enabled);
  }

  /**
   * Get similarity threshold for comparison (0-1)
   */
  getArqonBusCompareThreshold(): number {
    return this.get("system", "arqon_bus_compare_threshold", 0.95);
  }

  /**
   * Set similarity threshold
   */
  setArqonBusCompareThreshold(threshold: number) {
    this.set("system", "arqon_bus_compare_threshold", threshold);
  }

  /**
   * Get comparison report interval in seconds
   */
  getArqonBusCompareReportInterval(): number {
    return this.get("system", "arqon_bus_compare_report_interval_s", 300);
  }

  /**
   * Set comparison report interval
   */
  setArqonBusCompareReportInterval(intervalSeconds: number) {
    this.set("system", "arqon_bus_compare_report_interval_s", intervalSeconds);
  }

  /**
   * Get comparison sample rate (0-1)
   */
  getArqonBusCompareSampleRate(): number {
    return this.get("system", "arqon_bus_compare_sample_rate", 1.0);
  }

  /**
   * Set comparison sample rate
   */
  setArqonBusCompareSampleRate(rate: number) {
    this.set("system", "arqon_bus_compare_sample_rate", rate);
  }

  // ========================================================================
  // Arqon Bus Cutover Configuration
  // ========================================================================

  /**
   * Get whether cutover is enabled (master switch)
   * Production default: true (after cutover)
   */
  getArqonBusCutoverEnabled(): boolean {
    return this.get("system", "arqon_bus_cutover_enabled", false);
  }

  /**
   * Set cutover enabled state
   */
  setArqonBusCutoverEnabled(enabled: boolean) {
    this.set("system", "arqon_bus_cutover_enabled", enabled);
  }

  /**
   * Get current Bus traffic percentage (0-100)
   * Production default: 100 (after cutover)
   */
  getArqonBusTrafficPercentage(): number {
    return this.get("system", "arqon_bus_traffic_percentage", 0);
  }

  /**
   * Set Bus traffic percentage
   */
  setArqonBusTrafficPercentage(percentage: number) {
    this.set("system", "arqon_bus_traffic_percentage", Math.max(0, Math.min(100, percentage)));
  }

  /**
   * Get current cutover stage
   * Production default: 100pct (after cutover)
   */
  getArqonBusCurrentStage(): string {
    return this.get("system", "arqon_bus_current_stage", "shadow");
  }

  /**
   * Set current cutover stage
   */
  setArqonBusCurrentStage(stage: string) {
    this.set("system", "arqon_bus_current_stage", stage);
  }

  /**
   * Get whether instant rollback is enabled
   */
  getArqonBusRollbackEnabled(): boolean {
    return this.get("system", "arqon_bus_rollback_enabled", false);
  }

  /**
   * Set rollback enabled state
   */
  setArqonBusRollbackEnabled(enabled: boolean) {
    this.set("system", "arqon_bus_rollback_enabled", enabled);
  }

  /**
   * Get stage check interval in seconds
   */
  getArqonBusStageCheckInterval(): number {
    return this.get("system", "arqon_bus_stage_check_interval_s", 60);
  }

  /**
   * Set stage check interval
   */
  setArqonBusStageCheckInterval(intervalSeconds: number) {
    this.set("system", "arqon_bus_stage_check_interval_s", intervalSeconds);
  }

  /**
   * Get explicit approval flag for stage promotion
   */
  getArqonBusStageApproval(): boolean {
    return this.get("system", "arqon_bus_stage_approval", false);
  }

  /**
   * Set explicit approval flag for stage promotion
   */
  setArqonBusStageApproval(approved: boolean) {
    this.set("system", "arqon_bus_stage_approval", approved);
  }

  // ========================================================================
  // Arqon Control Plane Configuration (Gate 5)
  // ========================================================================

  /**
   * Get whether control-plane coordination is enabled.
   */
  getArqonControlPlaneEnabled(): boolean {
    return this.get("system", "arqon_control_plane_enabled", false);
  }

  setArqonControlPlaneEnabled(enabled: boolean) {
    this.set("system", "arqon_control_plane_enabled", enabled);
  }

  /**
   * Get SpacetimeDB URL for control-plane coordination state.
   */
  getArqonControlPlaneSpacetimeDbUrl(): string {
    return this.get("system", "arqon_control_plane_spacetimedb_url", "http://localhost:3000");
  }

  setArqonControlPlaneSpacetimeDbUrl(url: string) {
    this.set("system", "arqon_control_plane_spacetimedb_url", url);
  }

  /**
   * Fail-closed behavior when control-plane backbone is unavailable.
   */
  getArqonControlPlaneFailClosed(): boolean {
    return this.get("system", "arqon_control_plane_fail_closed", true);
  }

  setArqonControlPlaneFailClosed(enabled: boolean) {
    this.set("system", "arqon_control_plane_fail_closed", enabled);
  }

  /**
   * Maximum in-flight requests per agent in the coordinator.
   */
  getArqonControlPlaneAgentInflightLimit(): number {
    return this.get("system", "arqon_control_plane_agent_inflight_limit", 2);
  }

  setArqonControlPlaneAgentInflightLimit(limit: number) {
    this.set("system", "arqon_control_plane_agent_inflight_limit", Math.max(1, Math.floor(limit)));
  }

  /**
   * Maximum in-flight requests globally in the coordinator.
   */
  getArqonControlPlaneGlobalInflightLimit(): number {
    return this.get("system", "arqon_control_plane_global_inflight_limit", 8);
  }

  setArqonControlPlaneGlobalInflightLimit(limit: number) {
    this.set("system", "arqon_control_plane_global_inflight_limit", Math.max(1, Math.floor(limit)));
  }

  // ========================================================================
  // Kokoro TTS Configuration (Gate 6)
  // ========================================================================

  /**
   * Get Kokoro sidecar base URL (Firecracker-hosted service).
   */
  getArqonTtsKokoroUrl(): string {
    return this.get("system", "arqon_tts_kokoro_url", "http://127.0.0.1:7781");
  }

  setArqonTtsKokoroUrl(url: string) {
    this.set("system", "arqon_tts_kokoro_url", url);
  }

  /**
   * Get Kokoro voice selection
   */
  getArqonTtsKokoroVoice(): string {
    return this.get("system", "arqon_tts_kokoro_voice", "af_heart");
  }

  setArqonTtsKokoroVoice(voice: string) {
    this.set("system", "arqon_tts_kokoro_voice", voice);
  }

  /**
   * Get Kokoro synthesis timeout in milliseconds
   */
  getArqonTtsKokoroTimeoutMs(): number {
    return this.get("system", "arqon_tts_kokoro_timeout_ms", 5000);
  }

  setArqonTtsKokoroTimeoutMs(timeout: number) {
    this.set("system", "arqon_tts_kokoro_timeout_ms", timeout);
  }

  /**
   * Enable streamed Kokoro synthesis/playback path.
   * Falls back to non-streaming endpoint if stream endpoint is unavailable.
   */
  getArqonTtsKokoroStreamingEnabled(): boolean {
    return this.get("system", "arqon_tts_kokoro_streaming_enabled", true);
  }

  setArqonTtsKokoroStreamingEnabled(enabled: boolean) {
    this.set("system", "arqon_tts_kokoro_streaming_enabled", enabled);
  }

  // ====== Sidecar ASR Configuration ======
  // Parakeet command lane sidecar endpoint (HTTP proxy)
  getArqonAsrParakeetCommandUrl(): string {
    return this.get("system", "arqon_asr_parakeet_command_url", "ws://127.0.0.1:5001/transcribe_stream");
  }

  setArqonAsrParakeetCommandUrl(url: string) {
    this.set("system", "arqon_asr_parakeet_command_url", url);
  }

  // Qwen3 dictation lane sidecar endpoint (HTTP proxy)
  getArqonAsrQwen3DictationUrl(): string {
    return this.get("system", "arqon_asr_qwen3_dictation_url", "http://127.0.0.1:5002/transcribe");
  }

  setArqonAsrQwen3DictationUrl(url: string) {
    this.set("system", "arqon_asr_qwen3_dictation_url", url);
  }

  // Sidecar ASR timeout (ms)
  getArqonAsrSidecarTimeoutMs(): number {
    return this.get("system", "arqon_asr_sidecar_timeout_ms", 5000);
  }

  setArqonAsrSidecarTimeoutMs(timeout: number) {
    this.set("system", "arqon_asr_sidecar_timeout_ms", timeout);
  }

  // Qwen3 dictation timeout (ms) for local model load + inference.
  // Kept separate from sidecar timeout because local adapter boot can be slower.
  getArqonAsrQwen3TimeoutMs(): number {
    return this.get("system", "arqon_asr_qwen3_timeout_ms", 90000);
  }

  setArqonAsrQwen3TimeoutMs(timeout: number) {
    this.set("system", "arqon_asr_qwen3_timeout_ms", timeout);
  }

  // Sidecar ASR mode: "local" (spawn Python bridge) or "sidecar" (HTTP proxy)
  getArqonAsrParakeetMode(): "local" | "sidecar" {
    return this.get("system", "arqon_asr_parakeet_mode", "sidecar");
  }

  setArqonAsrParakeetMode(mode: "local" | "sidecar") {
    this.set("system", "arqon_asr_parakeet_mode", mode);
  }

  getArqonAsrQwen3Mode(): "local" | "sidecar" {
    return this.get("system", "arqon_asr_qwen3_mode", "sidecar");
  }

  setArqonAsrQwen3Mode(mode: "local" | "sidecar") {
    this.set("system", "arqon_asr_qwen3_mode", mode);
  }

  getArqonAsrQwen3SidecarTimeoutMs(): number {
    return this.get("system", "arqon_asr_qwen3_sidecar_timeout_ms", 8000);
  }

  setArqonAsrQwen3SidecarTimeoutMs(timeout: number) {
    this.set("system", "arqon_asr_qwen3_sidecar_timeout_ms", timeout);
  }

  getArqonFocusSimpleModeEnabled(): boolean {
    return this.get("system", "arqon_focus_simple_mode_enabled", true);
  }

  setArqonFocusSimpleModeEnabled(enabled: boolean) {
    this.set("system", "arqon_focus_simple_mode_enabled", enabled);
  }
}
