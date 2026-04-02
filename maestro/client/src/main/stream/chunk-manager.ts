import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuid } from "uuid";
import Active from "../active";
import API from "../api";
import App from "../app";
import Custom from "../ipc/custom";
import Executor from "../execute/executor";
import Log from "../log";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import Microphone from "./microphone";
import RendererBridge from "../bridge";
import Settings from "../settings";
import Stream from "./stream";
import { Chunk, ChunkQueue } from "./chunk-queue";
import STTTracking from "../stt/tracking";
import { core } from "../../gen/core";
import { commandTypeToString, isMetaResponse, isValidAlternative } from "../../shared/alternatives";
import STTComparator from "../stt/comparator";
import TrafficRouter, { RoutingDecision } from "../stt/traffic-router";
import ExecutionTrace from "../runtime/execution-trace";
import ListeningSessionService from "../runtime/listening-session-service";
import ListeningStateService from "../runtime/listening-state-service";
import ChunkEvaluationService from "../runtime/chunk-evaluation-service";
import CommandResponseService from "../runtime/command-response-service";
import RuntimeCommandDispatcher from "../runtime/runtime-command-dispatcher";
import STTRoutingService from "../runtime/stt-routing-service";
import STTShadowPublisher from "../runtime/stt-shadow-publisher";
import TranscriptResponseObserver from "../runtime/transcript-response-observer";
import { phase3ABenchmarkService } from "../runtime/phase3a-benchmark-service";
import H3GeometricCommandGovernor from "../runtime/h3-geometric-command-governor";
import { h23Recorder } from "../runtime/h23-live-trace-recorder";
import { TurnEvent } from "../audio/turn-events";
import WhisperCommandFastProvider from "../stt/whisper-command-fast-provider";
import ParakeetCommandFastProvider, {
  GeometricRegionEvent,
  ParakeetStreamSession,
} from "../stt/parakeet-command-fast-provider";
import FasterWhisperDictationProvider from "../stt/faster-whisper-dictation-provider";
import Qwen3ASRDictationProvider from "../stt/qwen3-asr-dictation-provider";
import GeometricRoutingService from "./geometric-routing-service";
import { emitH3RuntimeEvidence } from "../runtime/h3-runtime-evidence";
import { voiceSemanticAddressRegistry } from "../runtime/voice-semantic-address-registry";
import { normalizeNumericTail } from "./numeric-tail-normalizer";
import { normalizeOpenTail } from "./open-tail-normalizer";

const ENABLE_WHISPER_COMMAND_LANE = process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE === "1";
const ENABLE_PARAKEET_COMMAND_LANE = process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE !== "0";
const FORCE_LEGACY_COMMAND_LANE = process.env.MAESTRO_FORCE_LEGACY_COMMAND_LANE === "1";
const ENABLE_FASTER_WHISPER_DICTATION_FALLBACK =
  process.env.MAESTRO_ENABLE_FASTER_WHISPER_DICTATION_FALLBACK === "1";
const H3_GEOMETRIC_ENABLED = process.env.H3_GEOMETRIC_ENABLED === "true";

type DictationProviderPreference = "qwen3" | "legacy" | "faster_whisper";

interface Request {
  requestType: "audio" | "editor" | "endpoint" | "initialize";
  audio?: Buffer;
  chunkId?: string;
  finalize?: boolean;
}

type H3Route = "legacy_text" | "geometric_only" | "geometric_prefix_asr_tail";
const H3_NUMERIC_STRATEGY_VERSION = "3b1-numeric-v1";
const H3_OPEN_STRATEGY_VERSION = "3b2b-open-v1";
const H3_OPEN_TARGET_LIKENESS_FLOOR = 0.72;
const H3_SEMANTIC_V1_REGIONS = new Set(["pause", "new tab", "go to line", "go to", "open"]);

/**
 * When speaking, chunks go through the following states:
 * - onChunkStart: speech is detected, and the leading buffer is sent
 * - onAudio: speech is continuing
 * - onChunkEnd: chunk has ended, so send a finalized endpoint request
 *
 * We need to make sure to handle all of the following cases:
 * - speaking -> endpoint -> response -> silence
 * - speaking -> endpoint -> silence -> response
 * - speaking -> endpoint -> speaking -> response -> endpoint -> response -> silence
 * - speaking -> endpoint -> speaking -> response -> endpoint -> silence -> response
 * - start executing -> speaking -> stop executing -> silence
 * - start executing -> speaking -> silence -> stop executing
 * - revert -> speaking -> response -> silence
 * - revert -> speaking -> silence -> response
 */
export default class ChunkManager {
  private audioSizeForDelayedInitialize: number = 6;
  private buffer: Request[] = [];
  private buffering: boolean = false;
  private deadlineToMakeNewInitializeRequest: number = 0;
  private maxAudioFramesPerChunk: number = 90;
  private speaking: boolean = false;
  private toggleGeneration: number = 0;
  private timeToWaitBeforeClassifyingAsNoise: number = 200;
  private timeToWaitBeforeStartingNewCommand: number = 5000;
  private lastToggleTime: number = 0;
  private sessionStartTime: number = 0;
  private audioSequenceNumber: number = 0;
  private lastTurnEventPartialRequestAt = 0;
  private forcedDisconnectHandled = false;
  private executionTrace?: ExecutionTrace;
  private listeningSessionService: ListeningSessionService;
  private listeningStateService: ListeningStateService;
  private chunkEvaluationService: ChunkEvaluationService;
  private commandResponseService: CommandResponseService;
  private sttRoutingService: STTRoutingService;
  private sttShadowPublisher: STTShadowPublisher;
  private transcriptResponseObserver: TranscriptResponseObserver;
  private whisperCommandFastProvider: WhisperCommandFastProvider;
  private parakeetCommandFastProvider: ParakeetCommandFastProvider;
  private fasterWhisperDictationProvider: FasterWhisperDictationProvider;
  private qwen3AsrDictationProvider: Qwen3ASRDictationProvider;
  private chunkAudioFrames = new Map<string, Buffer[]>();
  private chunkUseWhisperCommandFast = new Map<string, boolean>();
  private chunkUseFasterWhisperDictation = new Map<string, boolean>();
  private chunkUseQwen3AsrDictation = new Map<string, boolean>();
  private chunkUseParakeetCommandFast = new Map<string, boolean>();
  private chunkParakeetStream = new Map<string, ParakeetStreamSession>();
  private chunkFinalizationRequested = new Set<string>();
  private chunkFinalizeWatchdogs = new Map<string, NodeJS.Timeout>();
  private chunkTranscriptionInFlight = new Set<string>();
  private loggedWhisperUnavailable = false;
  private loggedForceLegacyCommandLane = false;
  private loggedFasterWhisperUnavailable = false;
  private loggedQwen3Unavailable = false;
  private dictationPreflightLastOk = false;
  private dictationPreflightLastReason = "";
  private dictationPreflightLastAtMs = 0;
  private dictationProviderPreference: DictationProviderPreference = "qwen3";
  private dictationWarmupInFlight?: Promise<void>;
  private dictationProviderStartAtMs = new Map<string, number>();
  private dictationRuntimeLastStage = "idle";
  private h3GeometricEnabled = H3_GEOMETRIC_ENABLED;
  private h3GeometricGovernor = new H3GeometricCommandGovernor();
  private h3GeometricRoutingService = new GeometricRoutingService();
  private chunkH3StepIndex = new Map<string, number>();
  private chunkH3Route = new Map<string, H3Route>();
  private chunkH3ParameterizedPrefix = new Map<string, string>();
  private chunkH3TailDecodeActive = new Map<string, boolean>();
  private chunkH3TailAudioFrames = new Map<string, Buffer[]>();
  private chunkH3LatestGeometricEvent = new Map<string, GeometricRegionEvent>();
  private chunkH3TailCaptureStartMs = new Map<string, number>();
  private chunkH3LastGeometricSignature = new Map<string, { signature: string; atMs: number }>();
  private chunkH3NumericStrategyEnabled = new Map<string, boolean>();
  private chunkH3OpenStrategyEnabled = new Map<string, boolean>();
  private chunkH3LatestTailHintText = new Map<string, string>();
  private chunkH3WarmLookup = new Map<
    string,
    {
      warmHitClass: "strong" | "weak" | "miss";
      bestCandidateId: string | null;
      bestCandidateScore: number | null;
      bestCanonicalMergedText: string | null;
      lookupPath: string;
      confidencePolicyVersion: string;
      weakThreshold: number;
      strongThreshold: number;
      candidateAgeMs: number | null;
      recentConflictPenaltyApplied: boolean;
      staleProtectionApplied: boolean;
      warmApplied: boolean;
      warmAppliedStage: "candidate_rank" | "tail_strategy_prearm" | "shortlist_only" | null;
    }
  >();

  listening: boolean = false;

  constructor(
    private active: Active,
    private api: API,
    private app: App,
    private bridge: RendererBridge,
    private chunkQueue: ChunkQueue,
    private custom: Custom,
    private executor: Executor,
    private log: Log,
    private mainWindow: MainWindow,
    private microphone: Microphone,
    private miniModeWindow: MiniModeWindow,
    private settings: Settings,
    private stream: Stream,
    private tracking: STTTracking,
    private runtimeCommandDispatcher: RuntimeCommandDispatcher
  ) {
    this.listeningSessionService = new ListeningSessionService({
      app,
      bridge,
      custom,
      executor,
      mainWindow,
      microphone,
      miniModeWindow,
      stream,
    });
    this.sttShadowPublisher = new STTShadowPublisher({
      getCurrentChunk: () => this.chunkQueue.getIndex(0),
      getCurrentSessionId: () => this.tracking.getCurrentSessionId() || undefined,
      log,
      settings,
      tracking,
    });
    this.listeningStateService = new ListeningStateService({
      bridge,
      log,
      mainWindow,
      miniModeWindow,
      shadowPublisher: this.sttShadowPublisher,
      tracking,
    });
    this.sttRoutingService = new STTRoutingService({
      getCurrentChunkId: () => this.chunkQueue.getIndex(0)?.id,
      log,
      tracking,
    });
    this.chunkEvaluationService = new ChunkEvaluationService({
      bridge,
      commandDispatcher: runtimeCommandDispatcher,
      getDispatchContext: () => {
        return this.executor.getRuntimeDispatchPolicyContext();
      },
      log,
      mainWindow,
      miniModeWindow,
      stream,
      tracking,
    });
    this.commandResponseService = new CommandResponseService({
      bridge,
      executor,
      log,
      mainWindow,
      miniModeWindow,
    });
    this.transcriptResponseObserver = new TranscriptResponseObserver({
      comparator: undefined,
      log,
      settings,
      tracking,
    });
    this.whisperCommandFastProvider = new WhisperCommandFastProvider(
      { enabled: ENABLE_WHISPER_COMMAND_LANE },
      log
    );
    this.parakeetCommandFastProvider = new ParakeetCommandFastProvider({
      enabled: ENABLE_PARAKEET_COMMAND_LANE,
      mode: this.settings.getArqonAsrParakeetMode(),
      sidecarUrl: this.settings.getArqonAsrParakeetCommandUrl(),
      timeoutMs: this.settings.getArqonAsrSidecarTimeoutMs(),
    }, log);
    this.qwen3AsrDictationProvider = new Qwen3ASRDictationProvider({
      sidecarMode: this.settings.getArqonAsrQwen3Mode(),
      sidecarUrl: this.settings.getArqonAsrQwen3DictationUrl(),
      timeoutMs: this.settings.getArqonAsrQwen3TimeoutMs(),
    }, log);
    this.fasterWhisperDictationProvider = new FasterWhisperDictationProvider(
      { enabled: ENABLE_FASTER_WHISPER_DICTATION_FALLBACK },
      log
    );
    setTimeout(() => {
      this.bootstrapQwen3SidecarIfNeeded().catch(() => {});
    }, 0);
  }

  private updateDictationRuntimeStatus(update: {
    provider?: string;
    sidecarHealth?: string;
    warmupStatus?: string;
    chunkId?: string;
    stage?: string;
    errorCode?: string;
    latencyMs?: number;
    emitMetric?: boolean;
  }): void {
    const stage = update.stage || this.dictationRuntimeLastStage;
    if (update.stage) {
      this.dictationRuntimeLastStage = update.stage;
    }

    if (update.emitMetric !== false) {
      this.tracking.logDictationRuntimeStage({
        chunk_id: update.chunkId || "",
        stage,
        provider: update.provider,
        sidecar_health: update.sidecarHealth,
        error_code: update.errorCode,
        latency_ms: update.latencyMs,
      });
    }

    this.executor.updateDictationRuntimeStatus({
      provider: update.provider,
      sidecarHealth: update.sidecarHealth,
      warmupStatus: update.warmupStatus,
      chunkId: update.chunkId,
      stage,
      errorCode: update.errorCode,
      latencyMs: update.latencyMs,
    });
  }

  private getQwen3SidecarHealthUrl(): string {
    const sidecarUrl = this.settings.getArqonAsrQwen3DictationUrl();
    try {
      const parsed = new URL(sidecarUrl);
      parsed.pathname = "/health";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    } catch (_error) {
      return "http://127.0.0.1:5002/health";
    }
  }

  private async probeQwen3SidecarHealth(timeoutMs: number = 1500): Promise<boolean> {
    const url = this.getQwen3SidecarHealthUrl();
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(ok);
      };

      try {
        const req = require("http")
          .get(url, (res: any) => {
            const status = Number(res.statusCode || 0);
            finish(status >= 200 && status < 300);
            res.resume();
          })
          .on("error", () => finish(false));
        req.setTimeout(timeoutMs, () => {
          req.destroy();
          finish(false);
        });
      } catch (_error) {
        finish(false);
      }
    });
  }

  private sidecarManagerCandidates(): string[] {
    return [
      path.resolve(process.cwd(), "src/main/stt/sidecars/sidecar_manager.sh"),
      path.resolve(__dirname, "..", "stt", "sidecars", "sidecar_manager.sh"),
      path.resolve(__dirname, "..", "..", "src", "main", "stt", "sidecars", "sidecar_manager.sh"),
    ];
  }

  private resolveSidecarManagerScript(): string | undefined {
    return this.sidecarManagerCandidates().find((candidate) => fs.existsSync(candidate));
  }

  private runSidecarManager(args: string[], timeoutMs: number): Promise<boolean> {
    const script = this.resolveSidecarManagerScript();
    if (!script) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const child = child_process.spawn("bash", [script, ...args], {
        stdio: "ignore",
        env: process.env,
      });
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(ok);
      };
      const timer = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch (_error) {}
        done(false);
      }, Math.max(1000, timeoutMs));
      child.once("error", () => {
        clearTimeout(timer);
        done(false);
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        done(code === 0);
      });
    });
  }

  private async bootstrapQwen3SidecarIfNeeded(): Promise<void> {
    const cfg = this.qwen3AsrDictationProvider.getConfig();
    if (cfg.sidecarMode !== "sidecar") {
      this.updateDictationRuntimeStatus({
        provider: "qwen3-local-bridge",
        sidecarHealth: "not_applicable",
        warmupStatus: "not_applicable",
        emitMetric: false,
      });
      return;
    }

    this.updateDictationRuntimeStatus({
      provider: "qwen3-sidecar",
      sidecarHealth: "probing",
      warmupStatus: "pending",
      stage: "sidecar_bootstrap",
    });

    const healthy = await this.probeQwen3SidecarHealth(1500);
    if (healthy) {
      this.updateDictationRuntimeStatus({
        provider: "qwen3-sidecar",
        sidecarHealth: "healthy",
        warmupStatus: "ready",
        stage: "sidecar_ready",
      });
      return;
    }

    const started = await this.runSidecarManager(["start", "qwen3"], 90000);
    if (!started) {
      this.updateDictationRuntimeStatus({
        provider: "qwen3-sidecar",
        sidecarHealth: "unreachable",
        warmupStatus: "failed",
        stage: "sidecar_bootstrap_failed",
        errorCode: "sidecar_start_failed",
      });
      return;
    }

    const warmed = await this.runSidecarManager(["warmup", "qwen3"], 30000);
    const healthyAfterStart = await this.probeQwen3SidecarHealth(3000);
    this.updateDictationRuntimeStatus({
      provider: "qwen3-sidecar",
      sidecarHealth: healthyAfterStart ? "healthy" : "unreachable",
      warmupStatus: warmed ? "ready" : "failed",
      stage: healthyAfterStart ? "sidecar_ready" : "sidecar_warmup_failed",
      errorCode: healthyAfterStart ? "" : "sidecar_unreachable",
    });
  }

  /**
   * Set the Bus client for shadow publishing
   */
  setBusClient(busClient: any) {
    this.sttRoutingService.setBusClient(busClient);
    this.sttShadowPublisher.setBusClient(busClient);
  }

  /**
   * Set the comparator for WebSocket vs Bus comparison
   */
  setComparator(comparator: STTComparator) {
    this.sttRoutingService.setComparator(comparator);
    this.transcriptResponseObserver = new TranscriptResponseObserver({
      comparator,
      log: this.log,
      settings: this.settings,
      tracking: this.tracking,
    });
  }

  /**
   * Set the traffic router for cutover routing
   */
  setTrafficRouter(router: TrafficRouter) {
    this.sttRoutingService.setTrafficRouter(router);
  }

  setExecutionTrace(executionTrace: ExecutionTrace) {
    this.executionTrace = executionTrace;
    this.sttRoutingService.setExecutionTrace(executionTrace);
  }

  private clearDictationFailureState(): void {
    this.bridge.setState(
      {
        backendIssue: "",
        backendIssueAction: "",
        backendIssueActionLabel: "",
      },
      [this.mainWindow, this.miniModeWindow]
    );
  }

  private updateLegacyDictationDiagnostics(chunk: Chunk): void {
    if (!this.active.dictateMode || this.dictationProviderPreference !== "legacy") {
      return;
    }

    const finalResponse = this.getResponse(chunk);
    if (!finalResponse || !finalResponse.final) {
      return;
    }

    const alternatives = Array.isArray(finalResponse.alternatives) ? finalResponse.alternatives : [];
    const hasExecute = !!finalResponse.execute;
    const likelySpeechChunk = chunk.audioSize >= 3;

    if (!hasExecute && alternatives.length === 0 && likelySpeechChunk) {
      this.updateDictationRuntimeStatus({
        provider: "kaldi-legacy",
        sidecarHealth: "not_applicable",
        warmupStatus: "not_applicable",
        chunkId: chunk.id,
        stage: "legacy_no_transcript",
        errorCode: "legacy_no_transcript",
      });
      this.bridge.setState(
        {
          backendIssue:
            "Kaldi/legacy dictation produced no transcript. Check ~/.arqon/speech-engine.log and ~/.arqon/core.log for this chunk.",
          backendIssueAction: "",
          backendIssueActionLabel: "",
        },
        [this.mainWindow, this.miniModeWindow]
      );
      this.log.logVerbose(`[Chunk] legacy dictation no transcript for ${chunk.id}`);
      return;
    }

    if (hasExecute || alternatives.length > 0) {
      this.updateDictationRuntimeStatus({
        provider: "kaldi-legacy",
        sidecarHealth: "not_applicable",
        warmupStatus: "not_applicable",
        chunkId: chunk.id,
        stage: "legacy_response_received",
        errorCode: "",
      });
      this.clearDictationFailureState();
    }
  }

  private setDictationFailureState(reason: string): void {
    // Fail-open for operator continuity: on hard Qwen3 errors, immediately
    // pivot to legacy dictation instead of dropping out of dictate mode.
    this.enableLegacyDictationFallback();
    this.bridge.setState(
      {
        alternatives: [
          {
            description:
              "Qwen3 dictation failed hard for this utterance. Switched to Kaldi/legacy dictation to keep typing live.",
          },
        ],
        highlighted: [0],
        executedSuccess: [],
        staleOrFailed: [0],
        backendIssue: "Qwen3 dictation failed: " + reason + " (auto-fell back to Kaldi/Legacy)",
        backendIssueAction: "",
        backendIssueActionLabel: "",
      },
      [this.mainWindow, this.miniModeWindow]
    );
    this.updateDictationRuntimeStatus({
      provider: "kaldi-legacy",
      sidecarHealth: "not_applicable",
      warmupStatus: "not_applicable",
      stage: "legacy_fallback_active",
      errorCode: "",
    });
    this.mainWindow.updateTray();
  }

  setDictationProviderPreference(preference: DictationProviderPreference): void {
    if (this.dictationProviderPreference === preference) {
      return;
    }
    this.dictationProviderPreference = preference;
    this.dictationPreflightLastOk = false;
    this.dictationPreflightLastReason = "";
    this.dictationPreflightLastAtMs = 0;
    this.dictationWarmupInFlight = undefined;
    if (preference !== "qwen3") {
      this.clearDictationFailureState();
    }
  }

  private scheduleQwen3WarmupPreflight(): void {
    if (this.dictationWarmupInFlight) {
      return;
    }

    this.dictationWarmupInFlight = (async () => {
      try {
        const smoke = Buffer.alloc(16000 / 4 * 2, 0);
        await this.qwen3AsrDictationProvider.transcribeDictation({
          chunkId: "dictation_preflight",
          pcm16leAudio: smoke,
          sampleRateHz: 16000,
        });
        this.dictationPreflightLastOk = true;
        this.dictationPreflightLastReason = "qwen3_preflight_ok";
        this.dictationPreflightLastAtMs = Date.now();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (reason.includes("qwen3_empty_audio") || reason.includes("qwen3_empty_transcript")) {
          this.dictationPreflightLastOk = true;
          this.dictationPreflightLastReason = "qwen3_preflight_ok_silence";
          this.dictationPreflightLastAtMs = Date.now();
          return;
        }
        this.dictationPreflightLastOk = false;
        this.dictationPreflightLastReason = reason;
        this.dictationPreflightLastAtMs = Date.now();
      } finally {
        this.dictationWarmupInFlight = undefined;
      }
    })();
  }

  enableLegacyDictationFallback(): void {
    this.setDictationProviderPreference("legacy");
    this.active.dictateMode = true;
    this.app.syncSecurityInteractionModeFromRuntime(true);
    this.active.update(true);
    this.updateDictationRuntimeStatus({
      provider: "kaldi-legacy",
      sidecarHealth: "not_applicable",
      warmupStatus: "not_applicable",
      stage: "legacy_fallback_active",
      errorCode: "",
    });
    this.bridge.setState(
      {
        dictateMode: true,
        statusText: "Listening",
        alternatives: [],
        highlighted: [],
        executedSuccess: [],
        staleOrFailed: [],
        backendIssue: "",
        backendIssueAction: "",
        backendIssueActionLabel: "",
      },
      [this.mainWindow, this.miniModeWindow]
    );
    this.mainWindow.updateTray();
    if (!this.listening) {
      void this.toggle(true);
    }
  }

  async verifyDictationReady(): Promise<{ ok: boolean; reason: string }> {
    if (this.dictationProviderPreference === "legacy") {
      return { ok: true, reason: "legacy_dictation_selected" };
    }

    if (this.dictationProviderPreference === "faster_whisper") {
      if (!this.fasterWhisperDictationProvider.isReady()) {
        const reason =
          this.fasterWhisperDictationProvider.getLoadError() || "faster_whisper_provider_not_ready";
        return { ok: false, reason };
      }
      return { ok: true, reason: "faster_whisper_ready" };
    }

    const now = Date.now();
    const recentSuccess =
      this.dictationPreflightLastOk && now - this.dictationPreflightLastAtMs < 5 * 60 * 1000;
    const recentFailure =
      !this.dictationPreflightLastOk && now - this.dictationPreflightLastAtMs < 10 * 1000;
    if (recentSuccess || recentFailure) {
      return {
        ok: this.dictationPreflightLastOk,
        reason: this.dictationPreflightLastReason || "dictation_preflight_cached",
      };
    }

    if (!this.qwen3AsrDictationProvider.isReady()) {
      const reason = this.qwen3AsrDictationProvider.getLoadError() || "qwen3_provider_not_ready";
      this.dictationPreflightLastOk = false;
      this.dictationPreflightLastReason = reason;
      this.dictationPreflightLastAtMs = now;
      return { ok: false, reason };
    }

    const cfg = this.qwen3AsrDictationProvider.getConfig();
    if (cfg.sidecarMode === "sidecar") {
      const healthy = await this.probeQwen3SidecarHealth(1500);
      if (!healthy) {
        this.dictationPreflightLastOk = false;
        this.dictationPreflightLastReason = "qwen3_sidecar_unreachable";
        this.dictationPreflightLastAtMs = now;
        this.updateDictationRuntimeStatus({
          provider: "qwen3-sidecar",
          sidecarHealth: "unreachable",
          warmupStatus: "failed",
          stage: "sidecar_health_failed",
          errorCode: "sidecar_unreachable",
        });
        return { ok: false, reason: "qwen3_sidecar_unreachable" };
      }
      this.dictationPreflightLastOk = true;
      this.dictationPreflightLastReason = "qwen3_sidecar_configured";
      this.dictationPreflightLastAtMs = now;
      this.updateDictationRuntimeStatus({
        provider: "qwen3-sidecar",
        sidecarHealth: "healthy",
        warmupStatus: "ready",
        stage: "sidecar_health_ok",
      });
      return { ok: true, reason: "qwen3_sidecar_configured" };
    }

    // Do not block mode-switch UX on model warmup/transcribe smoke checks.
    // Treat provider readiness as sufficient for immediate lane entry and run
    // deep warmup preflight asynchronously.
    this.dictationPreflightLastOk = true;
    this.dictationPreflightLastReason = "qwen3_provider_ready";
    this.dictationPreflightLastAtMs = Date.now();
    this.updateDictationRuntimeStatus({
      provider: "qwen3-local-bridge",
      sidecarHealth: "not_applicable",
      warmupStatus: "ready",
      stage: "provider_ready",
    });
    this.scheduleQwen3WarmupPreflight();
    return { ok: true, reason: "qwen3_provider_ready" };
  }

  /**
   * Get current routing decision
   */
  getCurrentRoutingDecision(): RoutingDecision | undefined {
    return this.sttRoutingService.getCurrentRoutingDecision();
  }

  private observeH3GeometricEvent(
    chunkId: string,
    event: GeometricRegionEvent | null | undefined,
    isFinalStep: boolean,
    transcriptTail?: string
  ): void {
    if (!this.h3GeometricEnabled) {
      return;
    }
    if (!event || event.source !== "spectral_manifold") {
      return;
    }

    const signature = `${event.regionId}|${event.commandClass}`;
    const nowMs = Date.now();
    const previous = this.chunkH3LastGeometricSignature.get(chunkId);
    const hasTranscriptTail = Boolean(transcriptTail && transcriptTail.trim().length > 0);
    if (
      !isFinalStep &&
      !hasTranscriptTail &&
      previous &&
      previous.signature === signature &&
      nowMs - previous.atMs < 250
    ) {
      return;
    }
    this.chunkH3LastGeometricSignature.set(chunkId, { signature, atMs: nowMs });

    this.chunkH3LatestGeometricEvent.set(chunkId, event);
    voiceSemanticAddressRegistry.markGeometricContext({
      chunkId,
      source: event.source,
      regionId: event.regionId,
      commandClass: event.commandClass,
      parameterType: event.parameterType,
      atlasVersion: event.atlasVersion,
      atlasSchema: event.atlasSchema,
      confidence: event.confidence,
      frameCount: event.frameCount,
    });
    if (transcriptTail && transcriptTail.trim().length > 0) {
      this.chunkH3LatestTailHintText.set(chunkId, transcriptTail.trim().toLowerCase());
    }
    if (H3_SEMANTIC_V1_REGIONS.has(event.regionId)) {
      this.emitH3Evidence(chunkId, "voice_semantic_address_lookup_started", {
        source: event.source,
        regionId: event.regionId,
        commandClass: event.commandClass,
        hadTranscriptText: Boolean(transcriptTail && transcriptTail.trim().length > 0),
        transcriptText: transcriptTail && transcriptTail.trim().length > 0 ? transcriptTail : null,
        parameterType: event.parameterType ?? null,
        atlasVersion: event.atlasVersion ?? "unknown",
        governanceRequired: true,
        reason: "semantic_lookup_started_advisory_only",
      });
      const semanticLookup = voiceSemanticAddressRegistry.lookup({
        chunkId,
        regionId: event.regionId,
        parameterType: event.parameterType ?? null,
        transcriptTailHint: transcriptTail,
        atlasVersion: event.atlasVersion,
        atlasSchema: event.atlasSchema,
      });
      this.emitH3Evidence(chunkId, "voice_semantic_address_lookup_completed", {
        source: event.source,
        regionId: event.regionId,
        commandClass: event.commandClass,
        parameterType: event.parameterType ?? null,
        atlasVersion: event.atlasVersion ?? "unknown",
        lookupCandidateCount: semanticLookup.lookupCandidateCount,
        bestCandidateId: semanticLookup.bestCandidateId,
        bestCandidateScore: semanticLookup.bestCandidateScore,
        canonicalMergedText: semanticLookup.bestCanonicalMergedText,
        warmHitClass: semanticLookup.warmHitClass,
        lookupPath: semanticLookup.lookupPath,
        confidencePolicyVersion: semanticLookup.confidencePolicyVersion,
        weakThreshold: semanticLookup.weakThreshold,
        strongThreshold: semanticLookup.strongThreshold,
        candidateAgeMs: semanticLookup.candidateAgeMs,
        recentConflictPenaltyApplied: semanticLookup.recentConflictPenaltyApplied,
        staleProtectionApplied: semanticLookup.staleProtectionApplied,
        governanceRequired: true,
        reason:
          semanticLookup.mismatchReason ??
          (semanticLookup.warmHitClass === "miss"
            ? "semantic_lookup_miss_advisory_only"
            : "semantic_lookup_hit_advisory_only"),
      });
      this.emitH3Evidence(
        chunkId,
        semanticLookup.warmHitClass === "miss"
          ? "voice_semantic_address_warm_miss"
          : "voice_semantic_address_warm_hit",
        {
          source: event.source,
          regionId: event.regionId,
          commandClass: event.commandClass,
          parameterType: event.parameterType ?? null,
          atlasVersion: event.atlasVersion ?? "unknown",
          lookupCandidateCount: semanticLookup.lookupCandidateCount,
          bestCandidateId: semanticLookup.bestCandidateId,
          bestCandidateScore: semanticLookup.bestCandidateScore,
          canonicalMergedText: semanticLookup.bestCanonicalMergedText,
          warmHitClass: semanticLookup.warmHitClass,
          lookupPath: semanticLookup.lookupPath,
          confidencePolicyVersion: semanticLookup.confidencePolicyVersion,
          weakThreshold: semanticLookup.weakThreshold,
          strongThreshold: semanticLookup.strongThreshold,
          candidateAgeMs: semanticLookup.candidateAgeMs,
          recentConflictPenaltyApplied: semanticLookup.recentConflictPenaltyApplied,
          staleProtectionApplied: semanticLookup.staleProtectionApplied,
          governanceRequired: true,
          reason:
            semanticLookup.mismatchReason ??
            (semanticLookup.warmHitClass === "miss"
              ? "warm_cache_miss_continue_normal_path"
              : "warm_cache_hit_advisory_continue_governed_path"),
        }
      );
      const canApplyWarm = semanticLookup.atlasCompatible && event.atlasBacked === true;
      let warmApplied = false;
      let warmAppliedStage: "candidate_rank" | "tail_strategy_prearm" | "shortlist_only" | null = null;
      let warmDiscardReason: string | null = null;
      if (!canApplyWarm) {
        warmDiscardReason = semanticLookup.mismatchReason ?? "warm_discarded_requires_live_atlas_backed_event";
      } else if (semanticLookup.warmHitClass === "strong") {
        warmApplied = true;
        warmAppliedStage = event.commandClass === "parameterized" ? "tail_strategy_prearm" : "candidate_rank";
      } else if (semanticLookup.warmHitClass === "weak") {
        warmApplied = true;
        warmAppliedStage = "shortlist_only";
      } else {
        warmDiscardReason = "warm_miss_continue_normal_path";
      }

      if (warmApplied && warmAppliedStage === "tail_strategy_prearm") {
        if (event.regionId === "go to line" && event.parameterType === "numeric") {
          this.chunkH3NumericStrategyEnabled.set(chunkId, true);
        }
        if ((event.regionId === "go to" || event.regionId === "open") && event.parameterType === "open") {
          this.chunkH3OpenStrategyEnabled.set(chunkId, true);
        }
      }

      const warmLookupStore =
        this.chunkH3WarmLookup ?? (this.chunkH3WarmLookup = new Map());
      warmLookupStore.set(chunkId, {
        warmHitClass: semanticLookup.warmHitClass,
        bestCandidateId: semanticLookup.bestCandidateId,
        bestCandidateScore: semanticLookup.bestCandidateScore,
        bestCanonicalMergedText: semanticLookup.bestCanonicalMergedText,
        lookupPath: semanticLookup.lookupPath,
        confidencePolicyVersion: semanticLookup.confidencePolicyVersion,
        weakThreshold: semanticLookup.weakThreshold,
        strongThreshold: semanticLookup.strongThreshold,
        candidateAgeMs: semanticLookup.candidateAgeMs,
        recentConflictPenaltyApplied: semanticLookup.recentConflictPenaltyApplied,
        staleProtectionApplied: semanticLookup.staleProtectionApplied,
        warmApplied,
        warmAppliedStage,
      });

      this.emitH3Evidence(
        chunkId,
        warmApplied ? "voice_semantic_address_warm_applied" : "voice_semantic_address_warm_discarded",
        {
          source: event.source,
          regionId: event.regionId,
          commandClass: event.commandClass,
          parameterType: event.parameterType ?? null,
          warmHitClass: semanticLookup.warmHitClass,
          semanticAddressId: semanticLookup.bestCandidateId,
          canonicalMergedText: semanticLookup.bestCanonicalMergedText,
          bestCandidateId: semanticLookup.bestCandidateId,
          bestCandidateScore: semanticLookup.bestCandidateScore,
          lookupPath: semanticLookup.lookupPath,
          confidencePolicyVersion: semanticLookup.confidencePolicyVersion,
          weakThreshold: semanticLookup.weakThreshold,
          strongThreshold: semanticLookup.strongThreshold,
          candidateAgeMs: semanticLookup.candidateAgeMs,
          recentConflictPenaltyApplied: semanticLookup.recentConflictPenaltyApplied,
          staleProtectionApplied: semanticLookup.staleProtectionApplied,
          warmApplied,
          warmAppliedStage,
          warmDiscardReason,
          liveEvidenceOverride: false,
          governanceRequired: true,
          reason: warmApplied
            ? "warm_applied_pre_dispatch_advisory_only"
            : warmDiscardReason ?? "warm_discarded_continue_normal_path",
        }
      );
    }
    const stepIndex = (this.chunkH3StepIndex.get(chunkId) ?? 0) + 1;
    this.chunkH3StepIndex.set(chunkId, stepIndex);
    const receivedAt = this.tracking.getChunkMetrics(chunkId)?.received_at;
    const timestampMs = receivedAt ? Date.now() - receivedAt : 0;
    const frameCount = Math.max(1, event.frameCount);
    const regionScore = Math.max(0, Math.min(1, event.confidence));
    const driftScore = Math.max(0, 1 - regionScore);

    const step = this.h3GeometricGovernor.observe({
      chunkId,
      stepIndex,
      timestampMs,
      isFinalStep,
      regionId: event.regionId,
      regionScore,
      driftScore,
      velocityConverged: isFinalStep || frameCount >= 2,
      frameCount,
      transcriptTail,
      acousticConfidence: regionScore,
    });

    const routeBefore = this.chunkH3Route.get(chunkId) ?? "legacy_text";
    const route = this.h3GeometricRoutingService.decide({
      regionId: event.regionId,
      commandClass: step.commandClass,
    });
    const routeAfter =
      this.chunkH3TailDecodeActive.get(chunkId) && routeBefore === "geometric_prefix_asr_tail"
        ? "geometric_prefix_asr_tail"
        : route.route;
    this.chunkH3Route.set(chunkId, routeAfter);
    this.emitH3Evidence(chunkId, "route_activation", {
      source: event.source,
      regionId: event.regionId,
      commandClass: step.commandClass,
      hadTranscriptText: Boolean(transcriptTail && transcriptTail.trim().length > 0),
      transcriptText: transcriptTail && transcriptTail.trim().length > 0 ? transcriptTail : null,
      routeBefore,
      routeAfter,
      reason:
        routeAfter !== route.route
          ? "tail_route_locked_until_finalize"
          : route.reason,
    });

    if (
      routeAfter === "geometric_prefix_asr_tail" &&
      step.structurallyStable &&
      event.regionId &&
      (event.regionId === "go to line" || event.regionId === "go to" || event.regionId === "open")
    ) {
      this.chunkH3ParameterizedPrefix.set(chunkId, event.regionId);
      const numericStrategyEnabled =
        event.regionId === "go to line" &&
        event.commandClass === "parameterized" &&
        event.parameterType === "numeric" &&
        event.atlasBacked === true;
      const openStrategyEnabled =
        (event.regionId === "go to" || event.regionId === "open") &&
        event.commandClass === "parameterized" &&
        event.parameterType === "open" &&
        event.atlasBacked === true;
      this.chunkH3NumericStrategyEnabled.set(chunkId, numericStrategyEnabled);
      this.chunkH3OpenStrategyEnabled.set(chunkId, openStrategyEnabled);
      if (event.regionId === "go to line") {
        this.emitH3Evidence(chunkId, "numeric_tail_strategy_selected", {
          source: event.source,
          regionId: event.regionId,
          commandClass: step.commandClass,
          routeBefore,
          routeAfter,
          reason: numericStrategyEnabled
            ? "numeric_strategy_selected"
            : "numeric_strategy_not_selected",
          parameterType: event.parameterType ?? null,
          numericParseConfidence: event.confidence,
          numericStrategyVersion: H3_NUMERIC_STRATEGY_VERSION,
        });
      } else if (event.regionId === "go to" || event.regionId === "open") {
        this.emitH3Evidence(chunkId, "open_tail_strategy_selected", {
          source: event.source,
          regionId: event.regionId,
          commandClass: step.commandClass,
          routeBefore,
          routeAfter,
          reason: openStrategyEnabled ? "open_strategy_selected" : "open_strategy_not_selected",
          parameterType: event.parameterType ?? null,
          openParseConfidence: event.confidence,
          openStrategyVersion: H3_OPEN_STRATEGY_VERSION,
          openTargetKind: "unknown",
        });
      }
      if (!this.chunkH3TailDecodeActive.get(chunkId)) {
        this.chunkH3TailDecodeActive.set(chunkId, true);
        this.chunkH3TailAudioFrames.set(chunkId, []);
        this.chunkH3TailCaptureStartMs.set(chunkId, this.relativeChunkNowMs(chunkId));
        this.log.logVerbose(
          `[Chunk][H3] Activated tail decode for ${chunkId} from spectral_manifold event: prefix="${event.regionId}" confidence=${event.confidence.toFixed(3)}`
        );
        this.emitH3Evidence(chunkId, "tail_capture_started", {
          source: event.source,
          regionId: event.regionId,
          commandClass: step.commandClass,
          hadTranscriptText: Boolean(transcriptTail && transcriptTail.trim().length > 0),
          transcriptText: transcriptTail && transcriptTail.trim().length > 0 ? transcriptTail : null,
          routeBefore,
          routeAfter,
          reason:
            routeAfter !== route.route
              ? "tail_route_locked_until_finalize"
              : route.reason,
        });
      }
    }
  }

  private composeH3MergedTranscript(prefix: string, tailTranscript: string): string {
    const tail = tailTranscript.trim().toLowerCase();
    if (!tail) {
      return prefix;
    }
    if (tail.startsWith(prefix)) {
      return tail;
    }
    return `${prefix} ${tail}`.trim();
  }

  private async tryHandleH3ParameterizedTailFinalize(chunkId: string): Promise<boolean> {
    if (!this.h3GeometricEnabled) {
      return false;
    }
    if (this.chunkH3Route.get(chunkId) !== "geometric_prefix_asr_tail") {
      return false;
    }

    const prefix = this.chunkH3ParameterizedPrefix.get(chunkId);
    if (!prefix) {
      return false;
    }

    const tailFrames = this.chunkH3TailAudioFrames.get(chunkId) || [];
    const tailAudio = tailFrames.length > 0 ? Buffer.concat(tailFrames) : Buffer.alloc(0);
    this.emitH3Evidence(chunkId, "tail_capture_completed", {
      routeBefore: "geometric_prefix_asr_tail",
      routeAfter: "geometric_prefix_asr_tail",
      reason: tailAudio.length === 0 ? "empty_tail_audio" : "tail_audio_ready",
      tailEndMs: this.relativeChunkNowMs(chunkId),
    });
    if (tailAudio.length === 0) {
      this.log.logVerbose(`[Chunk][H3] Tail decode skipped for ${chunkId}: empty tail audio`);
      return false;
    }

    this.emitH3Evidence(chunkId, "tail_decode_started", {
      routeBefore: "geometric_prefix_asr_tail",
      routeAfter: "geometric_prefix_asr_tail",
      numericStrategyVersion: this.chunkH3NumericStrategyEnabled.get(chunkId)
        ? H3_NUMERIC_STRATEGY_VERSION
        : null,
      openStrategyVersion: this.chunkH3OpenStrategyEnabled.get(chunkId)
        ? H3_OPEN_STRATEGY_VERSION
        : null,
    });
    const tailResult = await this.parakeetCommandFastProvider.transcribeCommand({
      chunkId,
      pcm16leAudio: tailAudio,
      sampleRateHz: 16000,
    });
    this.emitH3Evidence(chunkId, "tail_decode_completed", {
      routeBefore: "geometric_prefix_asr_tail",
      routeAfter: "geometric_prefix_asr_tail",
      tailEndMs: this.relativeChunkNowMs(chunkId),
      tailText: tailResult.transcript,
      reason: "tail_decode_ok",
      numericStrategyVersion: this.chunkH3NumericStrategyEnabled.get(chunkId)
        ? H3_NUMERIC_STRATEGY_VERSION
        : null,
      openStrategyVersion: this.chunkH3OpenStrategyEnabled.get(chunkId)
        ? H3_OPEN_STRATEGY_VERSION
        : null,
    });
    let mergedTranscript = this.composeH3MergedTranscript(prefix, tailResult.transcript);
    let openTailNormalization: ReturnType<typeof normalizeOpenTail> | null = null;
    const numericStrategyEnabled = this.chunkH3NumericStrategyEnabled.get(chunkId) === true;
    if (numericStrategyEnabled && prefix === "go to line") {
      const normalized = normalizeNumericTail(tailResult.transcript);
      const tailHint = this.chunkH3LatestTailHintText.get(chunkId) ?? "";
      const normalizedHint = normalizeNumericTail(tailHint);
      const malformedHintSignals =
        /\buh\b|\bum\b|\bmaybe\b/.test(tailHint) ||
        /\band\s*$/.test(tailHint) ||
        /\bhun\b/.test(tailHint);
      const rejectFromHint =
        tailHint.length > 0 &&
        malformedHintSignals &&
        normalizedHint.status !== "ok";
      this.emitH3Evidence(chunkId, "numeric_tail_normalized", {
        routeBefore: "geometric_prefix_asr_tail",
        routeAfter: "geometric_prefix_asr_tail",
        tailText: tailResult.transcript,
        reason: rejectFromHint ? "numeric_tail_rejected_from_partial_hint" : normalized.reason,
        parameterType: "numeric",
        numericRaw: tailResult.transcript,
        numericNormalized: normalized.normalized,
        numericParseConfidence: normalized.confidence,
        numericStrategyVersion: H3_NUMERIC_STRATEGY_VERSION,
      });
      if (rejectFromHint || normalized.normalized == null) {
        this.log.logVerbose(
          `[Chunk][H3] Numeric tail rejected for ${chunkId}: ${
            rejectFromHint ? "numeric_tail_rejected_from_partial_hint" : normalized.reason
          } raw="${tailResult.transcript}" hint="${tailHint}"`
        );
        this.emitH3Evidence(chunkId, "numeric_tail_rejected", {
          routeBefore: "geometric_prefix_asr_tail",
          routeAfter: "geometric_prefix_asr_tail",
          reason: rejectFromHint ? "numeric_tail_rejected_from_partial_hint" : normalized.reason,
          parameterType: "numeric",
          numericRaw: tailResult.transcript,
          numericNormalized: null,
          numericParseConfidence: normalized.confidence,
          numericStrategyVersion: H3_NUMERIC_STRATEGY_VERSION,
        });
        return true;
      }
      mergedTranscript = `${prefix} ${normalized.normalized}`.trim();
    }
    const openStrategyEnabled = this.chunkH3OpenStrategyEnabled.get(chunkId) === true;
    if (openStrategyEnabled && (prefix === "go to" || prefix === "open")) {
      const tailHint = (this.chunkH3LatestTailHintText.get(chunkId) ?? "").trim().toLowerCase();
      const openHintLooksConsistent = tailHint.length === 0 || tailHint === "open" || tailHint.startsWith("open ");
      if (prefix === "open" && !openHintLooksConsistent) {
        this.emitH3Evidence(chunkId, "open_tail_rejected", {
          routeBefore: "geometric_prefix_asr_tail",
          routeAfter: "geometric_prefix_asr_tail",
          reason: "open_tail_prefix_hint_mismatch_fallback",
          parameterType: "open",
          openRaw: tailResult.transcript,
          openNormalized: null,
          openParseConfidence: 0.0,
          openStrategyVersion: H3_OPEN_STRATEGY_VERSION,
          openTargetKind: "unknown",
        });
        this.log.logVerbose(
          `[Chunk][H3] Open tail fallback for ${chunkId}: prefix=open but hint="${tailHint}" mismatched; delegating to full finalize`
        );
        return false;
      }
      const normalized = normalizeOpenTail(tailResult.transcript, {
        commandPrefix: prefix === "open" ? "open" : "go to",
      });
      openTailNormalization = normalized;
      const openTailClass = normalized.status === "ok" ? "ok" : normalized.status === "partial" ? "partial" : "invalid";
      const openTailOk =
        normalized.status === "ok" &&
        normalized.normalized != null &&
        normalized.confidence >= H3_OPEN_TARGET_LIKENESS_FLOOR;
      this.emitH3Evidence(chunkId, "open_tail_normalized", {
        routeBefore: "geometric_prefix_asr_tail",
        routeAfter: "geometric_prefix_asr_tail",
        tailText: tailResult.transcript,
        reason: openTailOk ? "open_tail_ok" : normalized.reason,
        parameterType: "open",
        openRaw: tailResult.transcript,
        openNormalized: normalized.normalized,
        openParseConfidence: normalized.confidence,
        openStrategyVersion: H3_OPEN_STRATEGY_VERSION,
        openTargetKind: normalized.targetKind,
      });
      if (!openTailOk) {
        this.log.logVerbose(
          `[Chunk][H3] Open tail rejected for ${chunkId}: ${normalized.reason} raw="${tailResult.transcript}" kind=${normalized.targetKind} confidence=${normalized.confidence.toFixed(2)}`
        );
        this.emitH3Evidence(chunkId, "open_tail_rejected", {
          routeBefore: "geometric_prefix_asr_tail",
          routeAfter: "geometric_prefix_asr_tail",
          reason:
            normalized.status === "ok" &&
            normalized.confidence < H3_OPEN_TARGET_LIKENESS_FLOOR
              ? "open_tail_target_likeness_below_floor"
              : normalized.reason,
          parameterType: "open",
          openRaw: tailResult.transcript,
          openNormalized: normalized.normalized,
          openParseConfidence: normalized.confidence,
          openStrategyVersion: H3_OPEN_STRATEGY_VERSION,
          openTargetKind: normalized.targetKind,
        });
        return true;
      }
      mergedTranscript = `${prefix} ${normalized.normalized}`.trim();
      this.emitH3Evidence(chunkId, "open_tail_decode_completed", {
        routeBefore: "geometric_prefix_asr_tail",
        routeAfter: "geometric_prefix_asr_tail",
        tailText: tailResult.transcript,
        reason: `open_tail_${openTailClass}`,
        parameterType: "open",
        openRaw: tailResult.transcript,
        openNormalized: normalized.normalized,
        openParseConfidence: normalized.confidence,
        openStrategyVersion: H3_OPEN_STRATEGY_VERSION,
        openTargetKind: normalized.targetKind,
      });
    }
    const warmLookup = this.chunkH3WarmLookup?.get(chunkId);
    const liveEvidenceOverride = Boolean(
      warmLookup?.warmApplied &&
        warmLookup.bestCanonicalMergedText &&
        warmLookup.bestCanonicalMergedText.trim().toLowerCase() !== mergedTranscript.trim().toLowerCase()
    );
    if (liveEvidenceOverride) {
      this.emitH3Evidence(chunkId, "voice_semantic_address_warm_discarded", {
        semanticAddressId: warmLookup?.bestCandidateId ?? null,
        canonicalMergedText: warmLookup?.bestCanonicalMergedText ?? null,
        bestCandidateId: warmLookup?.bestCandidateId ?? null,
        bestCandidateScore: warmLookup?.bestCandidateScore ?? null,
        warmHitClass: warmLookup?.warmHitClass ?? null,
        warmApplied: warmLookup?.warmApplied ?? null,
        warmAppliedStage: warmLookup?.warmAppliedStage ?? null,
        confidencePolicyVersion: warmLookup?.confidencePolicyVersion ?? null,
        weakThreshold: warmLookup?.weakThreshold ?? null,
        strongThreshold: warmLookup?.strongThreshold ?? null,
        candidateAgeMs: warmLookup?.candidateAgeMs ?? null,
        recentConflictPenaltyApplied: warmLookup?.recentConflictPenaltyApplied ?? null,
        staleProtectionApplied: warmLookup?.staleProtectionApplied ?? null,
        warmDiscardReason: "live_geometric_evidence_override",
        liveEvidenceOverride: true,
        lookupPath: warmLookup?.lookupPath ?? null,
        reason: "live_geometric_evidence_override",
      });
      if (warmLookup?.bestCandidateId) {
        voiceSemanticAddressRegistry.markWarmConflict(warmLookup.bestCandidateId);
      }
      this.chunkH3WarmLookup?.delete(chunkId);
    }

    const geometricEvent = this.chunkH3LatestGeometricEvent.get(chunkId);
    this.observeH3GeometricEvent(chunkId, geometricEvent, true, tailResult.transcript);
    const h23StepIndex = h23Recorder.getTraceSnapshot(chunkId).length + 1;
    h23Recorder.recordFinal(chunkId, mergedTranscript, h23StepIndex, 0.95);
    this.emitH3Evidence(chunkId, "merged_transcript_emitted", {
      routeBefore: "geometric_prefix_asr_tail",
      routeAfter: "geometric_prefix_asr_tail",
      tailText: tailResult.transcript,
      mergedText: mergedTranscript,
      semanticAddressId: warmLookup?.bestCandidateId ?? null,
      canonicalMergedText: warmLookup?.bestCanonicalMergedText ?? null,
      bestCandidateId: warmLookup?.bestCandidateId ?? null,
      bestCandidateScore: warmLookup?.bestCandidateScore ?? null,
      warmHitClass: warmLookup?.warmHitClass ?? null,
      warmApplied: warmLookup?.warmApplied ?? null,
      warmAppliedStage: warmLookup?.warmAppliedStage ?? null,
      confidencePolicyVersion: warmLookup?.confidencePolicyVersion ?? null,
      weakThreshold: warmLookup?.weakThreshold ?? null,
      strongThreshold: warmLookup?.strongThreshold ?? null,
      candidateAgeMs: warmLookup?.candidateAgeMs ?? null,
      recentConflictPenaltyApplied: warmLookup?.recentConflictPenaltyApplied ?? null,
      staleProtectionApplied: warmLookup?.staleProtectionApplied ?? null,
      warmDiscardReason: liveEvidenceOverride ? "live_geometric_evidence_override" : null,
      liveEvidenceOverride,
      lookupPath: warmLookup?.lookupPath ?? null,
      reason: "merged_from_geometric_prefix_and_asr_tail",
      parameterType: numericStrategyEnabled ? "numeric" : openStrategyEnabled ? "open" : null,
      numericRaw: numericStrategyEnabled ? tailResult.transcript : null,
      numericNormalized: numericStrategyEnabled ? mergedTranscript.slice(prefix.length).trim() : null,
      numericStrategyVersion: numericStrategyEnabled ? H3_NUMERIC_STRATEGY_VERSION : null,
      openRaw: openStrategyEnabled ? tailResult.transcript : null,
      openNormalized: openStrategyEnabled ? mergedTranscript.slice(prefix.length).trim() : null,
      openStrategyVersion: openStrategyEnabled ? H3_OPEN_STRATEGY_VERSION : null,
      openTargetKind: openStrategyEnabled ? (openTailNormalization?.targetKind ?? "unknown") : null,
    });

    this.log.logVerbose(
      `[Chunk][H3] merged transcript ${chunkId}: "${mergedTranscript}" (tail ${tailResult.latencyMs}ms)`
    );
    await this.stream.sendTextRequest(mergedTranscript, true, chunkId);
    return true;
  }

  private relativeChunkNowMs(chunkId: string): number {
    const receivedAt = this.tracking.getChunkMetrics(chunkId)?.received_at;
    return receivedAt ? Date.now() - receivedAt : Date.now();
  }

  private emitH3Evidence(
    chunkId: string,
    eventName: string,
    overrides: Partial<{
      source: string;
      regionId: string;
      commandClass: string;
      hadTranscriptText: boolean;
      transcriptText: string | null;
      routeBefore: string;
      routeAfter: string;
      tailEndMs: number;
      tailText: string;
      mergedText: string;
      reason: string;
      parameterType: string | null;
      numericRaw: string | null;
      numericNormalized: string | null;
      numericParseConfidence: number | null;
      numericStrategyVersion: string | null;
      openRaw: string | null;
      openNormalized: string | null;
      openParseConfidence: number | null;
      openStrategyVersion: string | null;
      openTargetKind: string | null;
      semanticAddressId: string | null;
      canonicalMergedText: string | null;
      slotSignature: string | null;
      atlasVersion: string | null;
      lookupCandidateCount: number | null;
      bestCandidateId: string | null;
      bestCandidateScore: number | null;
      warmHitClass: string | null;
      governanceRequired: boolean | null;
      governanceQualified: boolean | null;
      h23StepCount: number | null;
      h24FinalGranted: boolean | null;
      successCount: number | null;
      warmApplied: boolean | null;
      warmAppliedStage: string | null;
      confidencePolicyVersion: string | null;
      weakThreshold: number | null;
      strongThreshold: number | null;
      candidateAgeMs: number | null;
      recentConflictPenaltyApplied: boolean | null;
      staleProtectionApplied: boolean | null;
      warmDiscardReason: string | null;
      liveEvidenceOverride: boolean | null;
      lookupPath: string | null;
    }> = {}
  ): void {
    const latest = this.chunkH3LatestGeometricEvent.get(chunkId);
    const trace = h23Recorder.getTraceSnapshot(chunkId);
    const decision = h23Recorder.getLatestDecision(chunkId);
    emitH3RuntimeEvidence({
      event: eventName,
      chunkId,
      timestampMs: this.relativeChunkNowMs(chunkId),
      source: overrides.source ?? latest?.source ?? null,
      regionId: overrides.regionId ?? latest?.regionId ?? null,
      commandClass: overrides.commandClass ?? latest?.commandClass ?? null,
      hadTranscriptText: overrides.hadTranscriptText ?? null,
      transcriptText: overrides.transcriptText ?? null,
      routeBefore: overrides.routeBefore ?? this.chunkH3Route.get(chunkId) ?? null,
      routeAfter: overrides.routeAfter ?? this.chunkH3Route.get(chunkId) ?? null,
      tailStartMs: this.chunkH3TailCaptureStartMs.get(chunkId) ?? null,
      tailEndMs: overrides.tailEndMs ?? null,
      tailText: overrides.tailText ?? null,
      mergedText: overrides.mergedText ?? null,
      stepCount: trace.length,
      finalGranted: decision?.granted ?? null,
      reason: overrides.reason ?? decision?.reason ?? null,
      parameterType: overrides.parameterType ?? null,
      numericRaw: overrides.numericRaw ?? null,
      numericNormalized: overrides.numericNormalized ?? null,
      numericParseConfidence: overrides.numericParseConfidence ?? null,
      numericStrategyVersion: overrides.numericStrategyVersion ?? null,
      openRaw: overrides.openRaw ?? null,
      openNormalized: overrides.openNormalized ?? null,
      openParseConfidence: overrides.openParseConfidence ?? null,
      openStrategyVersion: overrides.openStrategyVersion ?? null,
      openTargetKind: overrides.openTargetKind ?? null,
      semanticAddressId: overrides.semanticAddressId ?? null,
      canonicalMergedText: overrides.canonicalMergedText ?? null,
      slotSignature: overrides.slotSignature ?? null,
      atlasVersion: overrides.atlasVersion ?? latest?.atlasVersion ?? null,
      lookupCandidateCount: overrides.lookupCandidateCount ?? null,
      bestCandidateId: overrides.bestCandidateId ?? null,
      bestCandidateScore: overrides.bestCandidateScore ?? null,
      warmHitClass: overrides.warmHitClass ?? null,
      governanceRequired: overrides.governanceRequired ?? null,
      governanceQualified: overrides.governanceQualified ?? null,
      h23StepCount: overrides.h23StepCount ?? null,
      h24FinalGranted: overrides.h24FinalGranted ?? null,
      successCount: overrides.successCount ?? null,
      warmApplied: overrides.warmApplied ?? null,
      warmAppliedStage: overrides.warmAppliedStage ?? null,
      confidencePolicyVersion: overrides.confidencePolicyVersion ?? null,
      weakThreshold: overrides.weakThreshold ?? null,
      strongThreshold: overrides.strongThreshold ?? null,
      candidateAgeMs: overrides.candidateAgeMs ?? null,
      recentConflictPenaltyApplied: overrides.recentConflictPenaltyApplied ?? null,
      staleProtectionApplied: overrides.staleProtectionApplied ?? null,
      warmDiscardReason: overrides.warmDiscardReason ?? null,
      liveEvidenceOverride: overrides.liveEvidenceOverride ?? null,
      lookupPath: overrides.lookupPath ?? null,
    });
  }

  private async enqueue(request: Request, flush: boolean = true) {
    this.buffer.push(request);
    if (flush) {
      this.flush().catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        this.log.logVerbose(`[Chunk] flush failed: ${message}`);
      });
    }
  }

  private async flush() {
    if (this.buffering) {
      return;
    }

    while (this.buffer.length > 0) {
      const request = this.buffer.shift()!;
      if (request.requestType != "audio") {
        this.log.logVerbose(`Flushing ${request.requestType}`);
      }

      await this.send(request);
    }
  }

  private getLogEntry(alternative: core.ICommandsResponseAlternative): any {
    return {
      alternative_id: alternative.alternativeId,
      description: alternative.description,
      transcript: alternative.transcript,
      commands: (alternative.commands || []).map((c: any) => {
        let o: any = {
          type: commandTypeToString(c.type),
        };

        if (c.index > 0) {
          o.index = c.index;
        }

        return o;
      }),
    };
  }

  private getResponse(chunk: Chunk): any {
    if (chunk.reverted && chunk.revertedResponse) {
      return chunk.revertedResponse;
    }

    if (!chunk.reverted && chunk.response) {
      return chunk.response;
    }

    return undefined;
  }

  private async logResponse(response: core.ICommandsResponse) {
    let data: any = {
      token: this.settings.getToken(),
      endpoint_id: response.endpointId,
      session_id: this.tracking.getCurrentSessionId(),
    };

    if (this.settings.getLogAudio() || this.settings.getLogSource()) {
      data.endpoint = this.settings.getStreamingEndpoint().id;
      data.chunk_ids = response.chunkIds;
      if (response.execute) {
        data.execute = this.getLogEntry(response.execute);
      }

      if (response.alternatives && response.alternatives.length > 0) {
        data.alternatives = response.alternatives.map((e: core.ICommandsResponseAlternative) =>
          this.getLogEntry(e)
        );
      }
    }

    this.api.logEvent(`client.stream.${response.final ? "final" : "partial"}_response`, {
      dt: Date.now(),
      data,
    }, {
      session_id: this.tracking.getCurrentSessionId() || undefined,
      chunk_id: response.chunkId || undefined,
    });

    if (
      response.final &&
      this.settings.getStreamingEndpoint() &&
      this.settings.getStreamingEndpoint().id == "local" &&
      this.settings.getLogSource()
    ) {
      this.api.logLocalResponse(await this.active.getEditorState(), response);
    }
  }

  private reachedSilenceThreshold(chunk: Chunk): boolean {
    const response = this.getResponse(chunk);
    return (
      !!response &&
      chunk.silence >= this.settings.getExecuteSilenceThreshold() * response.silenceThreshold
    );
  }

  private async send(request: Request) {
    if (request.requestType == "initialize") {
      this.startBuffering();
      await this.stream.sendInitializeRequest();
      await this.stopBufferingAndFlush();
    } else if (request.requestType == "audio") {
      // Parakeet takes precedence over whisper for command lane
      if (request.chunkId && this.chunkUseParakeetCommandFast.get(request.chunkId)) {
        const stream = this.chunkParakeetStream.get(request.chunkId);
        if (stream && request.audio) {
          stream.sendAudio(request.audio);
          return;
        }
        this.chunkUseParakeetCommandFast.set(request.chunkId, false);
      }
      if (request.chunkId && this.chunkUseWhisperCommandFast.get(request.chunkId)) {
        return;
      }
      if (request.chunkId && this.chunkUseQwen3AsrDictation.get(request.chunkId)) {
        return;
      }
      if (request.chunkId && this.chunkUseFasterWhisperDictation.get(request.chunkId)) {
        return;
      }
      this.stream.sendAudioRequest(request.audio!, request.chunkId!);
    } else if (request.requestType == "editor") {
      await this.stream.sendEditorStateRequest();
    } else if (request.requestType == "endpoint") {
      // Parakeet takes precedence over whisper for command lane
      if (request.chunkId && this.chunkUseParakeetCommandFast.get(request.chunkId)) {
        if (request.finalize) {
          const handled = await this.handleParakeetFinalize(request.chunkId);
          if (!handled) {
            const whisperHandled = this.chunkUseWhisperCommandFast.get(request.chunkId)
              ? await this.handleWhisperFinalize(request.chunkId)
              : false;
            if (!whisperHandled) {
              await this.replayBufferedAudioAndFallbackToEndpoint(request.chunkId, request.finalize!);
            }
          }
        }
        return;
      }
      if (request.chunkId && this.chunkUseWhisperCommandFast.get(request.chunkId)) {
        if (request.finalize) {
          const handled = await this.handleWhisperFinalize(request.chunkId);
          if (!handled) {
            await this.replayBufferedAudioAndFallbackToEndpoint(request.chunkId, request.finalize!);
          }
        }
        return;
      }
      if (request.chunkId && this.chunkUseQwen3AsrDictation.get(request.chunkId)) {
        if (request.finalize) {
          const handled = await this.handleQwen3DictationFinalize(request.chunkId);
          if (!handled) {
            const fallbackHandled = this.chunkUseFasterWhisperDictation.get(request.chunkId)
              ? await this.handleFasterWhisperDictationFinalize(request.chunkId)
              : false;
            if (!fallbackHandled) {
              await this.replayBufferedAudioAndFallbackToEndpoint(request.chunkId, request.finalize!);
            }
          }
        }
        return;
      }
      if (request.chunkId && this.chunkUseFasterWhisperDictation.get(request.chunkId)) {
        if (request.finalize) {
          const handled = await this.handleFasterWhisperDictationFinalize(request.chunkId);
          if (!handled) {
            await this.replayBufferedAudioAndFallbackToEndpoint(request.chunkId, request.finalize!);
          }
        }
        return;
      }
      await this.stream.sendEndpointRequest(request.chunkId!, request.finalize!);
    }
  }

  private shouldUseWhisperForCurrentChunk(): boolean {
    if (FORCE_LEGACY_COMMAND_LANE) {
      if (!this.loggedForceLegacyCommandLane) {
        this.loggedForceLegacyCommandLane = true;
        this.log.logVerbose(
          "[Chunk] command lane forced to legacy endpoint via MAESTRO_FORCE_LEGACY_COMMAND_LANE=1"
        );
      }
      return false;
    }

    if (!ENABLE_WHISPER_COMMAND_LANE) {
      return false;
    }

    if (this.active.dictateMode) {
      return false;
    }

    if (!this.whisperCommandFastProvider.isReady()) {
      if (!this.loggedWhisperUnavailable) {
        this.loggedWhisperUnavailable = true;
        this.whisperCommandFastProvider.logUnavailableOnce();
      }
      return false;
    }

    return true;
  }

  /**
   * Check if Parakeet is available for command lane.
   * Parakeet takes precedence over whisper.cpp when available.
   */
  private shouldUseParakeetForCurrentChunk(): boolean {
    if (FORCE_LEGACY_COMMAND_LANE) {
      if (!this.loggedForceLegacyCommandLane) {
        this.loggedForceLegacyCommandLane = true;
        this.log.logVerbose(
          "[Chunk] command lane forced to legacy endpoint via MAESTRO_FORCE_LEGACY_COMMAND_LANE=1"
        );
      }
      return false;
    }

    if (!ENABLE_PARAKEET_COMMAND_LANE) {
      return false;
    }

    if (this.active.dictateMode) {
      return false;
    }

    if (!this.parakeetCommandFastProvider.isReady()) {
      return false;
    }

    return true;
  }

  private shouldUseQwen3ForCurrentChunk(): boolean {
    if (!this.active.dictateMode) {
      return false;
    }

    if (this.dictationProviderPreference !== "qwen3") {
      return false;
    }

    if (!this.qwen3AsrDictationProvider.isReady()) {
      if (!this.loggedQwen3Unavailable) {
        this.loggedQwen3Unavailable = true;
        this.qwen3AsrDictationProvider.logUnavailableOnce();
      }
      return false;
    }

    return true;
  }

  private shouldUseFasterWhisperForCurrentChunk(): boolean {
    if (!ENABLE_FASTER_WHISPER_DICTATION_FALLBACK) {
      return false;
    }

    if (!this.active.dictateMode) {
      return false;
    }

    if (this.dictationProviderPreference !== "faster_whisper") {
      return false;
    }

    if (!this.fasterWhisperDictationProvider.isReady()) {
      if (!this.loggedFasterWhisperUnavailable) {
        this.loggedFasterWhisperUnavailable = true;
        this.fasterWhisperDictationProvider.logUnavailableOnce();
      }
      return false;
    }

    return true;
  }

  private enqueueFinalEndpointOnce(chunkId: string) {
    if (!chunkId) {
      return;
    }

    if (this.chunkFinalizationRequested.has(chunkId)) {
      this.log.logVerbose(`[Chunk] Finalize deduped for ${chunkId}`);
      return;
    }

    this.chunkFinalizationRequested.add(chunkId);
    this.updateDictationRuntimeStatus({
      chunkId,
      stage: "finalize_requested",
    });
    this.armLegacyFinalizeWatchdog(chunkId);
    this.enqueue({ requestType: "endpoint", chunkId, finalize: true });
  }

  private armLegacyFinalizeWatchdog(chunkId: string): void {
    if (!this.active.dictateMode || this.dictationProviderPreference !== "legacy") {
      return;
    }
    this.clearFinalizeWatchdog(chunkId);
    const timer = setTimeout(() => {
      if (!this.chunkFinalizationRequested.has(chunkId)) {
        return;
      }
      const chunk = this.chunkQueue.getChunk(chunkId);
      const finalResponse = chunk ? this.getResponse(chunk) : undefined;
      if (finalResponse && finalResponse.final) {
        return;
      }
      this.updateDictationRuntimeStatus({
        provider: "kaldi-legacy",
        sidecarHealth: "not_applicable",
        warmupStatus: "not_applicable",
        chunkId,
        stage: "legacy_finalize_timeout",
        errorCode: "legacy_finalize_timeout",
      });
      this.bridge.setState(
        {
          backendIssue:
            "Kaldi/legacy finalize timed out without a transcript response. Check ~/.arqon/core.log and ~/.arqon/speech-engine.log.",
          backendIssueAction: "",
          backendIssueActionLabel: "",
        },
        [this.mainWindow, this.miniModeWindow]
      );
      this.log.logVerbose(`[Chunk] legacy finalize timeout for ${chunkId}`);
    }, 12000);
    this.chunkFinalizeWatchdogs.set(chunkId, timer);
  }

  private clearFinalizeWatchdog(chunkId: string): void {
    const existing = this.chunkFinalizeWatchdogs.get(chunkId);
    if (existing) {
      clearTimeout(existing);
      this.chunkFinalizeWatchdogs.delete(chunkId);
    }
  }

  private async handleParakeetFinalize(chunkId: string): Promise<boolean> {
    if (this.chunkTranscriptionInFlight.has(chunkId)) {
      this.log.logVerbose(`[Chunk] parakeet finalize deduped while in-flight for ${chunkId}`);
      return true;
    }

    const stream = this.chunkParakeetStream.get(chunkId);
    if (!stream) {
      this.log.logVerbose(`[Chunk] parakeet stream not found for ${chunkId}`);
      return false;
    }

    this.chunkTranscriptionInFlight.add(chunkId);
    let success = false;
    try {
      let handledByH3TailDecode = false;
      try {
        handledByH3TailDecode = await this.tryHandleH3ParameterizedTailFinalize(chunkId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.log.logVerbose(`[Chunk][H3] tail decode failed for ${chunkId}; falling back to full finalize: ${reason}`);
      }
      if (handledByH3TailDecode) {
        stream.cancel();
        success = true;
        return true;
      }

      const result = await stream.finalize();
      this.observeH3GeometricEvent(chunkId, result.geometricEvent, true);
      this.log.logVerbose(
        `[Chunk] parakeet command-fast transcript ${chunkId}: "${result.transcript}" (${result.latencyMs}ms)`
      );
      this.tracking.logParakeetSuccess({
        chunk_id: chunkId,
        latency_ms: result.latencyMs,
        text_length: result.transcript.length,
      });

      phase3ABenchmarkService.recordLaneSample({
        lane: "command_fast",
        provider: `parakeet/${result.model}/${result.device}`,
        success: true,
        latencyMs: result.latencyMs,
      });

      this.sttShadowPublisher.onTranscriptObserved(
        result.transcript,
        true,
        chunkId,
        [
          {
            transcript: result.transcript,
            rank: 0,
            score: 1,
            is_final: true,
          },
        ],
        result.latencyMs,
        0.3,
        `parakeet/${result.model}/${result.device}`
      );

      // CRITICAL: Dispatch to editor for execution
      await this.stream.sendTextRequest(result.transcript, true, result.chunkId);
      success = true;
      return true;
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      this.log.logVerbose(`[Chunk] parakeet stream finalize failed: ${errorMsg}`);
      this.tracking.logParakeetFailure({
        chunk_id: chunkId,
        error_code: errorMsg,
        retryable: true,
      });
      
      // Strict failure for sidecar mode - do not fallback to local here to avoid blowout
      return false;
    } finally {
      if (!success) {
        stream.cancel();
      }
      this.chunkParakeetStream.delete(chunkId);
      this.chunkTranscriptionInFlight.delete(chunkId);
    }
  }

  private async handleWhisperFinalize(chunkId: string): Promise<boolean> {
    if (this.chunkTranscriptionInFlight.has(chunkId)) {
      this.log.logVerbose(`[Chunk] whisper command-fast deduped while in-flight for ${chunkId}`);
      return true;
    }

    const frames = this.chunkAudioFrames.get(chunkId) || [];
    const audio = frames.length > 0 ? Buffer.concat(frames) : Buffer.alloc(0);
    if (audio.length === 0) {
      this.log.logVerbose(
        `[Chunk] whisper command-fast finalize skipped for ${chunkId}: empty audio`
      );
      return false;
    }

    this.chunkTranscriptionInFlight.add(chunkId);
    let success = false;
    try {
      const result = await this.whisperCommandFastProvider.transcribeCommand({
        chunkId,
        pcm16leAudio: audio,
        sampleRateHz: 16000,
      });

      this.log.logVerbose(
        `[Chunk] whisper command-fast transcript ${chunkId}: "${result.transcript}" (${result.latencyMs}ms)`
      );
      this.tracking.logMetric("stt.command_fast.whisper.success", {
        chunk_id: chunkId,
        latency_ms: result.latencyMs,
        transcript_chars: result.transcript.length,
      });
      phase3ABenchmarkService.recordLaneSample({
        lane: "command_fast",
        provider: "whisper.cpp",
        success: true,
        latencyMs: result.latencyMs,
      });

      this.sttShadowPublisher.onTranscriptObserved(
        result.transcript,
        true,
        chunkId,
        [
          {
            transcript: result.transcript,
            rank: 0,
            score: 1,
            is_final: true,
          },
        ],
        result.latencyMs,
        0.3,
        "whisper.cpp/base.en"
      );

      await this.stream.sendTextRequest(result.transcript, true);
      success = true;
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(
        `[Chunk] whisper command-fast failed for ${chunkId}; falling back to endpoint lane: ${reason}`
      );
      this.tracking.logMetric("stt.command_fast.whisper.failure", {
        chunk_id: chunkId,
        reason,
        fallback: "endpoint_request",
      });
      phase3ABenchmarkService.recordLaneSample({
        lane: "command_fast",
        provider: "whisper.cpp",
        success: false,
        latencyMs: 0,
        fallbackUsed: true,
        degraded: true,
        reason,
      });
      return false;
    } finally {
      if (success) {
        this.chunkAudioFrames.delete(chunkId);
        this.chunkUseWhisperCommandFast.delete(chunkId);
        this.chunkFinalizationRequested.delete(chunkId);
        this.clearFinalizeWatchdog(chunkId);
      }
      this.chunkTranscriptionInFlight.delete(chunkId);
    }
  }



  private async handleQwen3DictationFinalize(chunkId: string): Promise<boolean> {
    if (this.chunkTranscriptionInFlight.has(chunkId)) {
      this.log.logVerbose("[Chunk] qwen3 dictation deduped while in-flight for " + chunkId);
      this.updateDictationRuntimeStatus({
        provider: "qwen3-sidecar",
        chunkId,
        stage: "inflight_deduped",
        errorCode: "inflight_deduped",
      });
      return true;
    }

    const frames = this.chunkAudioFrames.get(chunkId) || [];
    const audio = frames.length > 0 ? Buffer.concat(frames) : Buffer.alloc(0);
    if (audio.length < 640) {
      this.log.logVerbose("[Chunk] qwen3 dictation finalize skipped for " + chunkId + ": empty audio");
      this.updateDictationRuntimeStatus({
        provider: "qwen3-sidecar",
        chunkId,
        stage: "provider_skipped_empty",
        errorCode: "empty_or_too_short_audio",
      });
      return false;
    }

    this.chunkTranscriptionInFlight.add(chunkId);
    const providerName =
      this.qwen3AsrDictationProvider.getConfig().sidecarMode === "sidecar"
        ? "qwen3-sidecar"
        : "qwen3-local-bridge";
    this.updateDictationRuntimeStatus({
      provider: providerName,
      chunkId,
      stage: "provider_started",
    });
    this.dictationProviderStartAtMs.set(chunkId, Date.now());
    try {
      const sidecarMode = this.qwen3AsrDictationProvider.getConfig().sidecarMode === "sidecar";
      const sidecarTimeoutMs = Math.max(1000, this.settings.getArqonAsrQwen3SidecarTimeoutMs());
      const transcriptionPromise = this.qwen3AsrDictationProvider.transcribeDictation({
        chunkId,
        pcm16leAudio: audio,
        sampleRateHz: 16000,
      });
      const result = sidecarMode
        ? await Promise.race([
            transcriptionPromise,
            new Promise<never>((_, reject) =>
              setTimeout(
                () => reject(new Error(`qwen3_timeout:sidecar_timeout_${sidecarTimeoutMs}ms`)),
                sidecarTimeoutMs
              )
            ),
          ])
        : await transcriptionPromise;

      this.log.logVerbose("[Chunk] qwen3 dictation transcript " + chunkId + ': "' + result.text + '" (' + result.latencyMs + 'ms)');
      const providerLatencyMs = Math.max(
        0,
        Date.now() - (this.dictationProviderStartAtMs.get(chunkId) || Date.now())
      );
      this.updateDictationRuntimeStatus({
        provider: providerName,
        chunkId,
        stage: "provider_finished",
        latencyMs: providerLatencyMs,
      });
      this.tracking.logQwen3Success({
        chunk_id: chunkId,
        latency_ms: result.latencyMs,
        text_length: result.text.length,
      });

      phase3ABenchmarkService.recordLaneSample({
        lane: "dictation_accurate",
        provider: "qwen3-asr/" + result.model + "/" + result.device,
        success: true,
        latencyMs: result.latencyMs,
      });

      this.sttShadowPublisher.onTranscriptObserved(
        result.text,
        true,
        chunkId,
        [{ transcript: result.text, rank: 0, score: 1, is_final: true }],
        result.latencyMs,
        0.3,
        "qwen3-asr/" + result.model + "/" + result.device
      );

      this.updateDictationRuntimeStatus({
        provider: providerName,
        chunkId,
        stage: "text_request_sent",
        latencyMs: result.latencyMs,
      });
      await this.stream.sendTextRequest(result.text, true);
      this.chunkAudioFrames.delete(chunkId);
      this.chunkUseQwen3AsrDictation.delete(chunkId);
      this.chunkFinalizationRequested.delete(chunkId);
      this.clearFinalizeWatchdog(chunkId);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const isBenignEmptyChunk =
        reason.includes("qwen3_empty_audio") || reason.includes("qwen3_empty_transcript");
      this.log.logVerbose(
        "[Chunk] qwen3 dictation failed for " +
          chunkId +
          (isBenignEmptyChunk ? "; benign empty chunk: " : "; hard failure: ") +
          reason
      );
      let errorCode = reason;
      if (reason.includes("sidecar_timeout")) {
        errorCode = "model_warmup_timeout";
      } else if (reason.includes("qwen3_sidecar_error")) {
        errorCode = "sidecar_unreachable";
      } else if (reason.includes("qwen3_empty_transcript")) {
        errorCode = "empty_transcript";
      } else if (reason.includes("qwen3_timeout")) {
        errorCode = "model_warmup_timeout";
      }
      this.tracking.logQwen3Failure({
        chunk_id: chunkId,
        error_code: errorCode,
        retryable: false,
      });
      this.updateDictationRuntimeStatus({
        provider: providerName,
        chunkId,
        stage: isBenignEmptyChunk ? "provider_skipped_empty" : "provider_failed",
        errorCode,
      });
      if (isBenignEmptyChunk) {
        // Do not consume this utterance as handled. Keep buffered audio and
        // let endpoint/legacy fallback attempt transcription for this chunk.
        this.chunkUseQwen3AsrDictation.delete(chunkId);
        this.updateDictationRuntimeStatus({
          provider: providerName,
          chunkId,
          stage: "provider_skipped_empty_fallback",
          errorCode,
        });
        return false;
      }
      this.chunkUseQwen3AsrDictation.delete(chunkId);
      this.setDictationFailureState(reason);
      return true;
    } finally {
      this.dictationProviderStartAtMs.delete(chunkId);
      this.chunkTranscriptionInFlight.delete(chunkId);
    }
  }

  private async replayBufferedAudioAndFallbackToEndpoint(
    chunkId: string,
    finalize: boolean
  ): Promise<void> {
    const frames = this.chunkAudioFrames.get(chunkId) || [];
    for (const frame of frames) {
      this.stream.sendAudioRequest(frame, chunkId);
    }
    await this.stream.sendEndpointRequest(chunkId, finalize);
  }

  private async handleFasterWhisperDictationFinalize(chunkId: string): Promise<boolean> {
    if (this.chunkTranscriptionInFlight.has(chunkId)) {
      this.log.logVerbose(`[Chunk] faster-whisper dictation deduped while in-flight for ${chunkId}`);
      return true;
    }

    const frames = this.chunkAudioFrames.get(chunkId) || [];
    const audio = frames.length > 0 ? Buffer.concat(frames) : Buffer.alloc(0);
    if (audio.length === 0) {
      this.log.logVerbose(
        `[Chunk] faster-whisper dictation finalize skipped for ${chunkId}: empty audio`
      );
      return false;
    }

    this.chunkTranscriptionInFlight.add(chunkId);
    let success = false;
    try {
      const result = await this.fasterWhisperDictationProvider.transcribeDictation({
        chunkId,
        pcm16leAudio: audio,
        sampleRateHz: 16000,
      });

      this.log.logVerbose(
        `[Chunk] faster-whisper dictation transcript ${chunkId}: "${result.text}" (${result.latencyMs}ms)`
      );
      this.tracking.logMetric("stt.dictation.faster_whisper.success", {
        chunk_id: chunkId,
        latency_ms: result.latencyMs,
        transcript_chars: result.text.length,
        model: result.model,
        device: result.device,
      });
      phase3ABenchmarkService.recordLaneSample({
        lane: "dictation_accurate",
        provider: `faster-whisper/${result.model}/${result.device}`,
        success: true,
        latencyMs: result.latencyMs,
      });

      this.sttShadowPublisher.onTranscriptObserved(
        result.text,
        true,
        chunkId,
        [
          {
            transcript: result.text,
            rank: 0,
            score: 1,
            is_final: true,
          },
        ],
        result.latencyMs,
        0.3,
        `faster-whisper/${result.model}/${result.device}`
      );

      await this.stream.sendTextRequest(result.text, true);
      success = true;
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.log.logVerbose(
        `[Chunk] faster-whisper dictation failed for ${chunkId}; falling back to endpoint lane: ${reason}`
      );
      this.tracking.logMetric("stt.dictation.faster_whisper.failure", {
        chunk_id: chunkId,
        reason,
        fallback: "endpoint_request",
      });
      phase3ABenchmarkService.recordLaneSample({
        lane: "dictation_accurate",
        provider: "faster-whisper",
        success: false,
        latencyMs: 0,
        fallbackUsed: true,
        degraded: true,
        reason,
      });
      this.chunkUseFasterWhisperDictation.delete(chunkId);
      return false;
    } finally {
      if (success) {
        this.chunkAudioFrames.delete(chunkId);
        this.chunkUseFasterWhisperDictation.delete(chunkId);
        this.chunkFinalizationRequested.delete(chunkId);
        this.clearFinalizeWatchdog(chunkId);
      }
      this.chunkTranscriptionInFlight.delete(chunkId);
    }
  }

  private shouldAppendToPrevious(response: core.ICommandsResponse): boolean {
    if (
      !this.active.pluginConnected() ||
      this.chunkQueue.size() < 2 ||
      this.active.dictateMode ||
      !response ||
      !response.alternatives ||
      response.alternatives.length == 0
    ) {
      return false;
    }

    const current = this.chunkQueue.getIndex(0);
    let previous = null;
    for (let i = 1; i < Math.min(this.chunkQueue.size(), 10); i++) {
      const chunk = this.chunkQueue.getIndex(i);
      if (chunk.executed || chunk.reverted) {
        previous = chunk;
        break;
      }
    }

    if (!previous) {
      return false;
    }

    let result =
      this.active.isFirstPartyEditor() &&
      !current.reverted &&
      Date.now() - Math.max(previous.reverted, previous.executed) <
        this.timeToWaitBeforeStartingNewCommand &&
      !isMetaResponse(response) &&
      response.alternatives.every(
        (e: core.ICommandsResponseAlternative) => !isValidAlternative(e)
      ) &&
      this.startsWithTextPrefix(this.getResponse(previous)) &&
      !this.startsWithTextPrefix(response);

    return !!result;
  }

  private startsWithTextPrefix(response: core.ICommandsResponse): boolean {
    return !!(
      response &&
      response.alternatives &&
      response.alternatives.length > 0 &&
      !!response.alternatives[0].transcript!.match(/^(add|change|dictate|insert|newline|type)/)
    );
  }

  async attemptToEvaluateChunk(chunk: Chunk): Promise<any> {
    await this.chunkEvaluationService.attempt({
      audioSizeForDelayedInitialize: this.audioSizeForDelayedInitialize,
      chunk,
      current: this.chunkQueue.getIndex(0),
      executionTrace: this.executionTrace,
      getChunkQueueSize: () => this.chunkQueue.size(),
      getNoiseClassificationDelayMs: () => this.timeToWaitBeforeClassifyingAsNoise,
      getResponse: (candidate) => this.getResponse(candidate),
      onAppendToPrevious: (chunkId) => {
        this.enqueueFinalEndpointOnce(chunkId);
      },
      onMarkNoiseDelayDeadline: (deadline) => {
        this.deadlineToMakeNewInitializeRequest = deadline;
      },
      onResetInitializeDeadline: () => {
        this.deadlineToMakeNewInitializeRequest = 0;
      },
      reachedSilenceThreshold: (candidate) => this.reachedSilenceThreshold(candidate),
      shouldAppendToPrevious: (response) => this.shouldAppendToPrevious(response),
      startBuffering: () => this.startBuffering(),
      stopBufferingAndFlush: () => this.stopBufferingAndFlush(),
    });
  }

  async onCommandsResponse(response: core.ICommandsResponse) {
    const chunk = this.chunkQueue.getChunk(response.chunkId!);
    if (!chunk) {
      this.log.logVerbose(`No chunk found for ${response.chunkId!}`);
      this.executionTrace?.recordParseOutcome(
        response.chunkId!,
        "no_chunk",
        this.tracking.getCurrentSessionId() || undefined
      );
      return;
    }
    const sessionId = this.tracking.getCurrentSessionId() || undefined;
    this.executionTrace?.trackChunk(chunk.id, sessionId);
    this.executionTrace?.recordParseOutcome(
      chunk.id,
      response.final ? "final_response" : "partial_response",
      sessionId
    );

    this.transcriptResponseObserver.observe({
      chunkId: chunk.id,
      onFinalLatency: (chunkLatencyMs) => {
        this.sttRoutingService.setWebsocketResponseLatency(chunkLatencyMs);
      },
      onPredictiveTranscript: () => {
        this.app.onTranscriptHeard();
      },
      onPublishTranscript: (kind, alternatives, chunkLatencyMs, silenceThreshold, modelId) => {
        this.sttShadowPublisher.onTranscriptObserved(
          (response.alternatives || [])
            .map((alt: any) => alt.transcript)
            .filter(Boolean)
            .join(" "),
          kind === "transcript_final",
          chunk.id,
          alternatives,
          chunkLatencyMs,
          silenceThreshold,
          modelId
        );
      },
      response,
      sessionId,
    });

    await this.commandResponseService.apply({
      attemptToEvaluateChunk: (candidate) => this.attemptToEvaluateChunk(candidate),
      chunk,
      getSessionId: () => this.tracking.getCurrentSessionId() || undefined,
      logResponse: (candidate) => this.logResponse(candidate),
      onFinalResponseReady: (finalResponse, sessionId) => {
        if (!finalResponse.chunkId) {
          return;
        }

        console.log(
          `[STREAM_TRACE] chunk_manager_final_ready chunkId="${finalResponse.chunkId}" sessionId="${sessionId || ""}" executePresent=${!!finalResponse.execute} executeCount=${(finalResponse.execute?.commands || []).length} alternatives=${(finalResponse.alternatives || []).length} transcript="${finalResponse.execute?.transcript || finalResponse.alternatives?.[0]?.transcript || ""}"`
        );

        const emittedCount = this.runtimeCommandDispatcher.emitNormalizedCommands(
          finalResponse,
          sessionId
        );
        console.log(
          `[STREAM_TRACE] chunk_manager_emit_normalized chunkId="${finalResponse.chunkId}" emittedCount=${emittedCount} executeCount=${(finalResponse.execute?.commands || []).length} alternatives=${(finalResponse.alternatives || []).length}`
        );
        this.executionTrace?.recordNormalizedCommands(
          finalResponse.chunkId,
          emittedCount,
          sessionId
        );
      },
      reachedSilenceThreshold: (candidate) => this.reachedSilenceThreshold(candidate),
      response,
      shouldAppendToPrevious: (candidate) => this.shouldAppendToPrevious(candidate),
    });

    this.updateLegacyDictationDiagnostics(chunk);

    if (response.final) {
      this.chunkAudioFrames.delete(chunk.id);
      this.chunkUseWhisperCommandFast.delete(chunk.id);
      this.chunkUseParakeetCommandFast.delete(chunk.id);
      this.chunkUseQwen3AsrDictation.delete(chunk.id);
      this.chunkUseFasterWhisperDictation.delete(chunk.id);
      this.chunkH3StepIndex.delete(chunk.id);
      this.chunkH3Route.delete(chunk.id);
      this.chunkH3ParameterizedPrefix.delete(chunk.id);
      this.chunkH3TailDecodeActive.delete(chunk.id);
      this.chunkH3TailAudioFrames.delete(chunk.id);
      this.chunkH3LatestGeometricEvent.delete(chunk.id);
      this.chunkH3TailCaptureStartMs.delete(chunk.id);
      this.chunkH3LastGeometricSignature.delete(chunk.id);
      this.chunkH3NumericStrategyEnabled.delete(chunk.id);
      this.chunkH3OpenStrategyEnabled.delete(chunk.id);
      this.chunkH3LatestTailHintText.delete(chunk.id);
      this.chunkH3WarmLookup?.delete(chunk.id);
      voiceSemanticAddressRegistry.clearChunk(chunk.id);
      this.chunkParakeetStream.get(chunk.id)?.cancel();
      this.chunkParakeetStream.delete(chunk.id);
      this.chunkFinalizationRequested.delete(chunk.id);
      this.clearFinalizeWatchdog(chunk.id);
      this.chunkTranscriptionInFlight.delete(chunk.id);
    }
  }

  onAudio(audio: any, silence: number) {
    if (!this.stream.connected()) {
      if (!this.forcedDisconnectHandled) {
        this.forcedDisconnectHandled = true;
        this.log.logVerbose("[Chunk] Stream disconnected during listening; forcing listening off");
        this.listeningStateService.handleConnectionFailure(
          "Speech stream disconnected. Toggle listening on to reconnect."
        );
        this.updateDictationRuntimeStatus({
          stage: "stream_disconnected",
          errorCode: "stream_disconnected",
        });
        setTimeout(() => {
          this.toggle(false);
        }, 0);
      }
      return;
    }
    this.forcedDisconnectHandled = false;

    const current = this.chunkQueue.getIndex(0);
    if (!current) {
      return;
    }
    current.silence = silence;
    if (this.speaking) {
      current.audioSize++;
      if (this.active.dictateMode && current.audioSize === 1) {
        this.updateDictationRuntimeStatus({
          chunkId: current.id,
          stage: "audio_buffered",
        });
      }
      const frameBuffer = Buffer.from(audio.buffer, audio.byteOffset || 0, audio.byteLength);
      this.chunkAudioFrames.get(current.id)?.push(frameBuffer);
      if (this.h3GeometricEnabled && this.chunkH3TailDecodeActive.get(current.id)) {
        this.chunkH3TailAudioFrames.get(current.id)?.push(frameBuffer);
      }
      this.enqueue({ requestType: "audio", audio: frameBuffer, chunkId: current.id });

      this.sttShadowPublisher.publishAudioAppend(
        Buffer.from(audio.buffer),
        this.audioSequenceNumber++,
        Date.now()
      );

      if (!current.forceFinalized && current.audioSize >= this.maxAudioFramesPerChunk) {
        current.forceFinalized = true;
        this.speaking = false;
        console.log(
          `[Chunk] Force finalize ${current.id} audioFrames=${current.audioSize}`
        );
        this.enqueue({ requestType: "editor" }, false);
        this.enqueueFinalEndpointOnce(current.id);
        return;
      }

      // Dictation robustness guard:
      // if the microphone chunk_end callback is missed, force finalize after
      // sustained silence so the utterance cannot stall indefinitely.
      if (
        this.active.dictateMode &&
        current.audioSize > 0 &&
        current.silence >= 10 &&
        !current.forceFinalized &&
        !this.chunkFinalizationRequested.has(current.id)
      ) {
        current.forceFinalized = true;
        this.speaking = false;
        this.log.logVerbose(
          `[Chunk] Dictation silence fallback finalize ${current.id} silenceFrames=${current.silence}`
        );
        this.updateDictationRuntimeStatus({
          chunkId: current.id,
          stage: "chunk_end_fallback_finalize",
        });
        this.enqueue({ requestType: "editor" }, false);
        this.enqueueFinalEndpointOnce(current.id);
        return;
      }

      // we want to send non-final endpoint requests (aka partials) every so often when it seems like a long
      // command is being spoken, but we're not near the end of it (at which point an endpoint request
      // will be sent anyway), in order to trade off a responsive UI with not overloading the server
      if (
        current.audioSize > 0 &&
        current.audioSize % (current.audioSize < 66 ? 15 : 66) == 0 &&
        current.silence < 4
      ) {
        this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: false });
      }
    }

    let silenceThreshold: number;
    if (!current.reverted && current.response) {
      silenceThreshold = current.response.silenceThreshold!;
    } else if (current.reverted && current.revertedResponse) {
      silenceThreshold = current.revertedResponse.silenceThreshold!;
    } else {
      return;
    }
    if (
      current.silence == Math.ceil(this.settings.getExecuteSilenceThreshold() * silenceThreshold)
    ) {
      this.log.logVerbose(`Silence hit for ${current.id}`);
      // Track endpoint detection timing
      const endpointTime = Date.now() - (this.tracking.getChunkMetrics(current.id)?.received_at || Date.now());
      this.tracking.onEndpointDetected(current.id, endpointTime);
      this.attemptToEvaluateChunk(current);
    }
  }

  onTurnEvent(event: TurnEvent) {
    const current = this.chunkQueue.getIndex(0);
    if (!current) {
      return;
    }

    this.log.logVerbose(
      `[TurnEvent] type=${event.type} chunk=${current.id} frame=${event.frameIndex} reason=${event.reason}`
    );

    // Patch 4 interruption plumbing:
    // Candidate interruption events should quickly surface partial hypotheses
    // without force-finalizing the chunk.
    if (
      (event.type === "barge_in_candidate" || event.type === "interrupt_candidate") &&
      this.speaking &&
      current.audioSize > 0 &&
      !current.forceFinalized
    ) {
      const now = Date.now();
      if (now - this.lastTurnEventPartialRequestAt >= 120) {
        this.lastTurnEventPartialRequestAt = now;
        this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: false });
      }
    }
  }

  async onChunkEnd() {
    this.speaking = false;
    console.log("[Chunk] Chunk end");
    this.bridge.setState(
      {
        speaking: false,
      },
      [this.mainWindow]
    );

    // if the settings window is opened and then listening is started, we can get a chunk end
    // without a corresponding chunk start, so make sure a chunk actually exists
    const current = this.chunkQueue.getIndex(0);
    if (!current) {
      return;
    }

    this.log.logVerbose(`Chunk end for ${current.id}`);
    
    this.sttShadowPublisher.publishEndpointRequest(true, "force_final");
    
    this.enqueue({ requestType: "editor" }, false);
    this.enqueueFinalEndpointOnce(current.id);
  }

  async onChunkStart(audio: any) {
    if (!this.stream.connected()) {
      if (!this.forcedDisconnectHandled) {
        this.forcedDisconnectHandled = true;
        this.log.logVerbose("[Chunk] Chunk start while stream disconnected; forcing listening off");
        this.listeningStateService.handleConnectionFailure(
          "Speech stream disconnected. Toggle listening on to reconnect."
        );
        this.updateDictationRuntimeStatus({
          stage: "stream_disconnected",
          errorCode: "stream_disconnected",
        });
        setTimeout(() => {
          this.toggle(false);
        }, 0);
      }
      return;
    }
    this.forcedDisconnectHandled = false;

    const id = uuid();
    this.chunkQueue.add(id);
    this.log.logVerbose(`Chunk start for ${id}`);
    console.log(`[Chunk] Chunk start ${id} samples=${audio.length}`);

    // Track chunk start for metrics
    const chunkMetrics = this.tracking.onChunkStart(id);
    this.log.logVerbose(`Chunk tracked: session=${chunkMetrics.correlation.session_id}, chunk=${id}`);
    this.executionTrace?.trackChunk(id, chunkMetrics.correlation.session_id);
    if (this.getCurrentRoutingDecision()) {
      this.executionTrace?.recordRouteChoice(
        id,
        this.getCurrentRoutingDecision()!.path,
        chunkMetrics.correlation.session_id
      );
    }

    // Reset audio sequence number for new chunk
    this.audioSequenceNumber = 0;
    const useWhisperCommandFast = this.shouldUseWhisperForCurrentChunk();
    const useParakeetCommandFast = this.shouldUseParakeetForCurrentChunk();
    const useQwen3Dictation = this.shouldUseQwen3ForCurrentChunk();
    const useFasterWhisperDictation = !useQwen3Dictation && this.shouldUseFasterWhisperForCurrentChunk();
    this.chunkUseWhisperCommandFast.set(id, useWhisperCommandFast);
    this.chunkUseParakeetCommandFast.set(id, useParakeetCommandFast);
    this.chunkUseQwen3AsrDictation.set(id, useQwen3Dictation);
    this.chunkUseFasterWhisperDictation.set(id, useFasterWhisperDictation);
    this.chunkH3StepIndex.set(id, 0);
    this.chunkH3Route.set(id, "legacy_text");
    this.chunkH3ParameterizedPrefix.delete(id);
    this.chunkH3TailDecodeActive.set(id, false);
    this.chunkH3TailAudioFrames.set(id, []);
    this.chunkH3LatestGeometricEvent.delete(id);
    this.chunkH3TailCaptureStartMs.delete(id);
    this.chunkH3NumericStrategyEnabled.delete(id);
    this.chunkH3OpenStrategyEnabled.delete(id);
    this.chunkH3LatestTailHintText.delete(id);
    this.chunkH3WarmLookup?.delete(id);
    if (useQwen3Dictation) {
      this.updateDictationRuntimeStatus({
        provider:
          this.qwen3AsrDictationProvider.getConfig().sidecarMode === "sidecar"
            ? "qwen3-sidecar"
            : "qwen3-local-bridge",
        sidecarHealth:
          this.qwen3AsrDictationProvider.getConfig().sidecarMode === "sidecar"
            ? "healthy"
            : "not_applicable",
        chunkId: id,
        stage: "chunk_started",
      });
    }

    if (useParakeetCommandFast && this.parakeetCommandFastProvider.isStreamingSupported()) {
      try {
        const stream = this.parakeetCommandFastProvider.createStream(id, (partialText) => {
          this.sttShadowPublisher.onTranscriptObserved(
            partialText,
            false,
            id,
            [],
            Date.now() - (chunkMetrics.received_at || Date.now()),
            0,
            this.parakeetCommandFastProvider.getConfig().modelPath
          );
        }, (geometricEvent) => {
          this.observeH3GeometricEvent(id, geometricEvent, false);
        });
        this.chunkParakeetStream.set(id, stream);
      } catch (err) {
        this.log.logVerbose(`Failed to start Parakeet WS stream: ${err}`);
      }
    }
    this.chunkAudioFrames.set(
      id,
      [Buffer.from(audio.buffer, audio.byteOffset || 0, audio.byteLength)]
    );

    if (this.tracking.getCurrentSessionId()) {
      this.sttShadowPublisher.onSessionStart();
    }

    if (!this.speaking) {
      this.bridge.setState(
        {
          speaking: true,
        },
        [this.mainWindow]
      );
    }

    // if one chunk comes down as noise, and another chunk is started within the threshold, then don't blow away
    // the server-side state, and keep going on the current command
    if (this.deadlineToMakeNewInitializeRequest < Date.now()) {
      this.deadlineToMakeNewInitializeRequest = Number.MAX_SAFE_INTEGER;
      this.enqueue({ requestType: "initialize" }, false);
    } else {
      this.enqueue({ requestType: "editor" }, false);
    }

    this.speaking = true;
    this.enqueue({
      requestType: "audio",
      audio: Buffer.from(audio.buffer, audio.byteOffset || 0, audio.byteLength),
      chunkId: id,
    });
  }

  startBuffering() {
    this.log.logVerbose("Buffering started");
    this.buffering = true;
  }

  async stopBufferingAndFlush() {
    this.log.logVerbose("Buffering stopped");
    this.buffering = false;
    await this.flush();
  }

  private resetListeningBuffers() {
    this.chunkQueue.clear();
    this.buffer = [];
    this.buffering = false;
    this.speaking = false;
    this.lastTurnEventPartialRequestAt = 0;
    this.chunkAudioFrames.clear();
    this.chunkUseWhisperCommandFast.clear();
    this.chunkUseParakeetCommandFast.clear();
    this.chunkUseQwen3AsrDictation.clear();
    this.chunkUseFasterWhisperDictation.clear();
    this.chunkH3StepIndex.clear();
    this.chunkH3Route.clear();
    this.chunkH3ParameterizedPrefix.clear();
    this.chunkH3TailDecodeActive.clear();
    this.chunkH3TailAudioFrames.clear();
    this.chunkH3LatestGeometricEvent.clear();
    this.chunkH3TailCaptureStartMs.clear();
    this.chunkH3LastGeometricSignature.clear();
    this.chunkH3NumericStrategyEnabled.clear();
    this.chunkH3OpenStrategyEnabled.clear();
    this.chunkH3LatestTailHintText.clear();
    this.chunkParakeetStream.forEach((stream) => stream.cancel());
    this.chunkParakeetStream.clear();
    this.chunkFinalizationRequested.clear();
    this.chunkFinalizeWatchdogs.forEach((timer) => clearTimeout(timer));
    this.chunkFinalizeWatchdogs.clear();
    this.chunkTranscriptionInFlight.clear();
  }

  private async startListeningSession(generation: number): Promise<boolean> {
    return this.listeningSessionService.start({
      chunkManager: this,
      generation,
      isGenerationCurrent: () => generation == this.toggleGeneration,
      onChunkStart: (audio) => this.onChunkStart(audio),
      onAudio: (audio, consecutiveSilence) => this.onAudio(audio, consecutiveSilence),
      onChunkEnd: () => this.onChunkEnd(),
      onTurnEvent: (event) => this.onTurnEvent(event),
      onPrepareStart: () => {
        this.startBuffering();
        this.resetListeningBuffers();
      },
      onConnected: async () => {
        console.log("[Stream] Connected for listening session");
        await this.stopBufferingAndFlush();
      },
      onConnectionFailed: (error) => {
        this.resetListeningBuffers();
        this.listening = false;
        this.listeningStateService.handleConnectionFailure(error);
        this.updateDictationRuntimeStatus({
          stage: "stream_disconnected",
          errorCode: "stream_disconnected",
        });
      },
    });
  }

  private stopListeningSession() {
    this.listeningSessionService.stop();
    this.resetListeningBuffers();
    this.deadlineToMakeNewInitializeRequest = 0;
  }

  async toggle(listening?: boolean) {
    if (listening === undefined) {
      listening = !this.listening;
    }

    if (listening && this.app.isPasskeyBootstrapBlocked()) {
      this.bridge.setState(
        {
          listening: false,
          statusText: "Locked: Passkey Required",
        },
        [this.mainWindow, this.miniModeWindow]
      );
      return;
    }

    const wasListening = this.listening;
    const generation = ++this.toggleGeneration;
    const requestedListening = listening;
    this.lastToggleTime = this.listeningStateService.recordToggleRequest(
      listening,
      this.listening,
      this.lastToggleTime
    );
    this.listening = listening;

    if (!wasListening && listening) {
      this.app.onPauseToListeningBoundary();
    }

    if (listening) {
      this.sessionStartTime = this.listeningStateService.startSession((sessionId) => {
        this.sttRoutingService.routeSession(sessionId);
      });
    } else {
      this.listeningStateService.stopSession(this.chunkQueue.getIndex(0)?.id || "", this.sessionStartTime);
    }
    this.listeningStateService.showListeningState(listening);
    setTimeout(async () => {
      if (generation != this.toggleGeneration) {
        return;
      }

      this.mainWindow.updateTray();
      if (requestedListening) {
        if (
          this.active.dictateMode &&
          this.dictationProviderPreference === "qwen3" &&
          this.qwen3AsrDictationProvider.getConfig().sidecarMode === "sidecar"
        ) {
          const healthy = await this.probeQwen3SidecarHealth(1500);
          if (!healthy) {
            this.listening = false;
            this.listeningStateService.showListeningState(false);
            this.listeningStateService.handleConnectionFailure(
              "Dictation sidecar unreachable on :5002. Start/warmup Qwen3 sidecar (`sidecar_manager.sh start qwen3`) and retry."
            );
            this.updateDictationRuntimeStatus({
              provider: "qwen3-sidecar",
              sidecarHealth: "unreachable",
              warmupStatus: "failed",
              stage: "sidecar_health_failed",
              errorCode: "sidecar_unreachable",
            });
            return;
          }
          this.updateDictationRuntimeStatus({
            provider: "qwen3-sidecar",
            sidecarHealth: "healthy",
            warmupStatus: "ready",
            stage: "listening_started",
          });
        }
        const started = await this.startListeningSession(generation);
        if (!started) {
          return;
        }
      } else {
        this.stopListeningSession();
      }
    }, 1);
  }
}
