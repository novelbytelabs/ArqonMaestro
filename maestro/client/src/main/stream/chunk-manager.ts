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
import { TurnEvent } from "../audio/turn-events";
import WhisperCommandFastProvider from "../stt/whisper-command-fast-provider";
import ParakeetCommandFastProvider, {
  ParakeetStreamSession,
} from "../stt/parakeet-command-fast-provider";
import FasterWhisperDictationProvider from "../stt/faster-whisper-dictation-provider";
import Qwen3ASRDictationProvider from "../stt/qwen3-asr-dictation-provider";

const ENABLE_WHISPER_COMMAND_LANE = process.env.MAESTRO_ENABLE_WHISPER_COMMAND_LANE === "1";
const ENABLE_PARAKEET_COMMAND_LANE = process.env.MAESTRO_ENABLE_PARAKEET_COMMAND_LANE === "1";
const ENABLE_FASTER_WHISPER_DICTATION_FALLBACK =
  process.env.MAESTRO_ENABLE_FASTER_WHISPER_DICTATION_FALLBACK === "1";

type DictationProviderPreference = "qwen3" | "legacy" | "faster_whisper";

interface Request {
  requestType: "audio" | "editor" | "endpoint" | "initialize";
  audio?: Buffer;
  chunkId?: string;
  finalize?: boolean;
}

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
  private loggedFasterWhisperUnavailable = false;
  private loggedQwen3Unavailable = false;
  private dictationPreflightLastOk = false;
  private dictationPreflightLastReason = "";
  private dictationPreflightLastAtMs = 0;
  private dictationProviderPreference: DictationProviderPreference = "qwen3";
  private dictationWarmupInFlight?: Promise<void>;
  private dictationProviderStartAtMs = new Map<string, number>();
  private dictationRuntimeLastStage = "idle";

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

  private async enqueue(request: Request, flush: boolean = true) {
    this.buffer.push(request);
    if (flush) {
      this.flush();
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
      const result = await stream.finalize();
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
      await this.stream.sendTextRequest(result.transcript, true);
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

        const emittedCount = this.runtimeCommandDispatcher.emitNormalizedCommands(
          finalResponse,
          sessionId
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
