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
import {
  FocusConditionedCommandContextEnvelope,
  deriveFocusContextEvidenceFields,
} from "../runtime/focus-conditioned-command-context";
import {
  PolicyShapedAtlasShardHint,
  derivePolicyShapedAtlasShardEvidenceFields,
  derivePolicyShapedAtlasShardHint,
} from "../runtime/policy-shaped-atlas-shards";
import {
  deriveMultiResolutionAtlasEvidenceFields,
  deriveMultiResolutionAtlasPlan,
} from "../runtime/multi-resolution-atlas";
import {
  deriveCounterfactualRepairEvidenceFields,
} from "../runtime/counterfactual-repair-intelligence";
import {
  deriveDynamicPrecisionRegimeObservation,
} from "../runtime/dynamic-precision-regimes";
import { voiceSemanticAddressRegistry } from "../runtime/voice-semantic-address-registry";
import { deriveWorkflowMemoryObservation } from "../runtime/workflow-memory-observation";
import { deriveWorkflowMemoryContinuityRanking } from "../runtime/workflow-memory-continuity-ranking";
import { deriveWorkflowMemoryContinuityOrdering } from "../runtime/workflow-memory-continuity-ordering";
import { deriveWorkflowMemoryCandidatePoolOrdering } from "../runtime/workflow-memory-candidate-pool-ordering";
import { deriveWorkflowMemoryReuseSubstrate } from "../runtime/workflow-memory-reuse-substrate";
import { deriveEmptyWorkflowCandidateDiscoveryState, deriveWorkflowCandidateDiscovery } from "../runtime/workflow-candidate-discovery";
import { deriveEmptyWorkflowSkeletonInferenceState, deriveWorkflowSkeletonInference } from "../runtime/workflow-skeleton-inference";
import { deriveWorkflowCandidateScoring } from "../runtime/workflow-candidate-scoring";
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
      focusRankingApplied: boolean;
      focusRankingBoost: number;
      focusRankingReasonCodes: string[];
      focusLegalityApplied: boolean;
      focusLegalityLawful: boolean | null;
      focusLegalityPenaltyApplied: boolean;
      focusLegalityPenalty: number;
      focusLegalityReasonCodes: string[];
      focusLegalityCommandKind: string | null;
      focusTaskMomentumApplied?: boolean;
      focusTaskMomentumBoost?: number;
      focusTaskMomentumPenaltyApplied?: boolean;
      focusTaskMomentumPenalty?: number;
      focusTaskMomentumReasonCodes?: string[];
      focusTaskMomentumMatchedSemanticAddressId?: string | null;
      atlasShardRankingApplied?: boolean;
      atlasShardRankingBoost?: number;
      atlasShardRankingReasonCodes?: string[];
      atlasShardRankingCandidateKind?: string | null;
      atlasShardNarrowingApplied?: boolean;
      atlasShardNarrowingFallbackUsed?: boolean;
      atlasShardNarrowingCandidateCountBefore?: number;
      atlasShardNarrowingCandidateCountAfter?: number;
      atlasShardNarrowingReasonCodes?: string[];
      atlasShardNarrowingAllowedCandidateKinds?: string[] | null;
      multiResolutionAtlasFamilyRoutingApplied?: boolean;
      multiResolutionAtlasFamilyRoutingBoost?: number;
      multiResolutionAtlasFamilyRoutingReasonCodes?: string[];
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId?: string | null;
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId?: string | null;
      multiResolutionAtlasPrefixBandRoutingApplied?: boolean;
      multiResolutionAtlasPrefixBandRoutingBoost?: number;
      multiResolutionAtlasPrefixBandRoutingReasonCodes?: string[];
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId?: string | null;
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId?: string | null;
      multiResolutionAtlasTailStrategyRoutingApplied?: boolean;
      multiResolutionAtlasTailStrategyRoutingBoost?: number;
      multiResolutionAtlasTailStrategyRoutingReasonCodes?: string[];
      multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId?: string | null;
      multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId?: string | null;
      warmApplied: boolean;
      warmAppliedStage: "candidate_rank" | "tail_strategy_prearm" | "shortlist_only" | null;
      workflowMemoryOrderingApplied?: boolean;
      workflowMemoryOrderingBoost?: number;
      workflowMemoryOrderingAdjustedScore?: number | null;
      workflowMemoryOrderingReasonCodes?: string[];
    }
  >();
  private chunkH3FocusContextEnvelope = new Map<string, FocusConditionedCommandContextEnvelope>();
  private chunkH3AtlasShardHint = new Map<string, PolicyShapedAtlasShardHint>();

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
        focusContextEnvelope: this.chunkH3FocusContextEnvelope.get(chunkId) ?? undefined,
        atlasShardHint: this.chunkH3AtlasShardHint.get(chunkId) ?? undefined,
        multiResolutionAtlasPlan: this.getMultiResolutionAtlasPlan(chunkId, {
          regionId: event.regionId,
          commandClass: event.commandClass,
          parameterType: event.parameterType ?? null,
          canonicalMergedText: transcriptTail && transcriptTail.trim().length > 0 ? transcriptTail : null,
        }),
      });
      const semanticLookupCandidatePoolSemanticAddressIds =
        Array.isArray((semanticLookup as any).candidateSemanticAddressIds)
          ? ((semanticLookup as any).candidateSemanticAddressIds as string[])
          : Array.isArray((semanticLookup as any).topCandidateSemanticAddressIds)
            ? ((semanticLookup as any).topCandidateSemanticAddressIds as string[])
            : null;
      const semanticLookupCandidatePoolScores =
        Array.isArray((semanticLookup as any).candidateScores)
          ? ((semanticLookup as any).candidateScores as number[])
          : Array.isArray((semanticLookup as any).candidateNormalizedScores)
            ? ((semanticLookup as any).candidateNormalizedScores as number[])
            : Array.isArray((semanticLookup as any).topCandidateNormalizedScores)
              ? ((semanticLookup as any).topCandidateNormalizedScores as number[])
              : null;
      const workflowMemoryOrderingFields = this.getWorkflowMemoryOrderingFields({
        candidateSemanticAddressId: semanticLookup.bestCandidateId,
        baseScore: semanticLookup.bestCandidateScore ?? null,
        continuationSuggested: null,
      });
      const workflowMemoryCandidatePoolOrderingFields =
        this.getWorkflowMemoryCandidatePoolOrderingFields({
          candidateSemanticAddressIds: semanticLookupCandidatePoolSemanticAddressIds,
          candidateScores: semanticLookupCandidatePoolScores,
          continuationSuggested: null,
        });
      const adjustedSemanticLookupBestCandidateId =
        workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingApplied &&
        workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter
          ? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter
          : semanticLookup.bestCandidateId;
      const adjustedSemanticLookupBestCandidateScore =
        workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingApplied &&
        workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateScoreAfter !== null
          ? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateScoreAfter
          : workflowMemoryOrderingFields.workflowMemoryOrderingApplied &&
            workflowMemoryOrderingFields.workflowMemoryOrderingAdjustedScore !== null
            ? workflowMemoryOrderingFields.workflowMemoryOrderingAdjustedScore
            : semanticLookup.bestCandidateScore;
      this.emitH3Evidence(chunkId, "voice_semantic_address_lookup_completed", {
        source: event.source,
        regionId: event.regionId,
        commandClass: event.commandClass,
        parameterType: event.parameterType ?? null,
        atlasVersion: event.atlasVersion ?? "unknown",
        lookupCandidateCount: semanticLookup.lookupCandidateCount,
        bestCandidateId: adjustedSemanticLookupBestCandidateId,
        bestCandidateScore: adjustedSemanticLookupBestCandidateScore,
        workflowMemoryCandidatePoolSemanticAddressIdsBefore:
          semanticLookupCandidatePoolSemanticAddressIds ?? undefined,
        workflowMemoryCandidatePoolScoresBefore:
          semanticLookupCandidatePoolScores ?? undefined,
        canonicalMergedText: semanticLookup.bestCanonicalMergedText,
        warmHitClass: semanticLookup.warmHitClass,
        lookupPath: semanticLookup.lookupPath,
        confidencePolicyVersion: semanticLookup.confidencePolicyVersion,
        weakThreshold: semanticLookup.weakThreshold,
        strongThreshold: semanticLookup.strongThreshold,
        candidateAgeMs: semanticLookup.candidateAgeMs,
        recentConflictPenaltyApplied: semanticLookup.recentConflictPenaltyApplied,
        staleProtectionApplied: semanticLookup.staleProtectionApplied,
        focusRankingApplied: semanticLookup.focusRankingApplied,
        focusRankingBoost: semanticLookup.focusRankingBoost,
        focusRankingReasonCodes: semanticLookup.focusRankingReasonCodes,
        focusLegalityApplied: semanticLookup.focusLegalityApplied,
        focusLegalityLawful: semanticLookup.focusLegalityLawful,
        focusLegalityPenaltyApplied: semanticLookup.focusLegalityPenaltyApplied,
        focusLegalityPenalty: semanticLookup.focusLegalityPenalty,
        focusLegalityReasonCodes: semanticLookup.focusLegalityReasonCodes,
        focusLegalityCommandKind: semanticLookup.focusLegalityCommandKind,
        focusTaskMomentumApplied: semanticLookup.focusTaskMomentumApplied ?? false,
        focusTaskMomentumBoost: semanticLookup.focusTaskMomentumBoost ?? 0,
        focusTaskMomentumPenaltyApplied: semanticLookup.focusTaskMomentumPenaltyApplied ?? false,
        focusTaskMomentumPenalty: semanticLookup.focusTaskMomentumPenalty ?? 0,
        focusTaskMomentumReasonCodes: semanticLookup.focusTaskMomentumReasonCodes ?? ["focus_task_momentum_not_evaluated"],
        focusTaskMomentumMatchedSemanticAddressId: semanticLookup.focusTaskMomentumMatchedSemanticAddressId ?? undefined,
        atlasShardRankingApplied: semanticLookup.atlasShardRankingApplied,
        atlasShardRankingBoost: semanticLookup.atlasShardRankingBoost,
        atlasShardRankingReasonCodes: semanticLookup.atlasShardRankingReasonCodes,
        atlasShardRankingCandidateKind: semanticLookup.atlasShardRankingCandidateKind,
        atlasShardNarrowingApplied: semanticLookup.atlasShardNarrowingApplied ?? false,
        atlasShardNarrowingFallbackUsed: semanticLookup.atlasShardNarrowingFallbackUsed ?? false,
        atlasShardNarrowingCandidateCountBefore: semanticLookup.atlasShardNarrowingCandidateCountBefore ?? undefined,
        atlasShardNarrowingCandidateCountAfter: semanticLookup.atlasShardNarrowingCandidateCountAfter ?? undefined,
        atlasShardNarrowingReasonCodes: semanticLookup.atlasShardNarrowingReasonCodes ?? ["atlas_shard_narrowing_not_evaluated"],
        atlasShardNarrowingAllowedCandidateKinds: semanticLookup.atlasShardNarrowingAllowedCandidateKinds ?? undefined,
        multiResolutionAtlasFamilyRoutingApplied:
          semanticLookup.multiResolutionAtlasFamilyRoutingApplied ?? false,
        multiResolutionAtlasFamilyRoutingBoost:
          semanticLookup.multiResolutionAtlasFamilyRoutingBoost ?? 0,
        multiResolutionAtlasFamilyRoutingReasonCodes:
          semanticLookup.multiResolutionAtlasFamilyRoutingReasonCodes ?? ["multi_resolution_family_routing_not_evaluated"],
        multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
          semanticLookup.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? undefined,
        multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
          semanticLookup.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? undefined,
        multiResolutionAtlasPrefixBandRoutingApplied:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingApplied ?? false,
        multiResolutionAtlasPrefixBandRoutingBoost:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingBoost ?? 0,
        multiResolutionAtlasPrefixBandRoutingReasonCodes:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingReasonCodes ?? ["multi_resolution_prefix_band_routing_not_evaluated"],
        multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId ?? undefined,
        multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId ?? undefined,
        multiResolutionAtlasTailStrategyRoutingApplied:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingApplied ?? false,
        multiResolutionAtlasTailStrategyRoutingBoost:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingBoost ?? 0,
        multiResolutionAtlasTailStrategyRoutingReasonCodes:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingReasonCodes ?? ["multi_resolution_tail_strategy_routing_not_evaluated"],
        multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId ?? undefined,
  
      multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId ?? undefined,
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
          bestCandidateScore: adjustedSemanticLookupBestCandidateScore,
          canonicalMergedText: semanticLookup.bestCanonicalMergedText,
          warmHitClass: semanticLookup.warmHitClass,
          lookupPath: semanticLookup.lookupPath,
          confidencePolicyVersion: semanticLookup.confidencePolicyVersion,
          weakThreshold: semanticLookup.weakThreshold,
          strongThreshold: semanticLookup.strongThreshold,
          candidateAgeMs: semanticLookup.candidateAgeMs,
          recentConflictPenaltyApplied: semanticLookup.recentConflictPenaltyApplied,
          staleProtectionApplied: semanticLookup.staleProtectionApplied,
          focusRankingApplied: semanticLookup.focusRankingApplied,
          focusRankingBoost: semanticLookup.focusRankingBoost,
          focusRankingReasonCodes: semanticLookup.focusRankingReasonCodes,
          focusLegalityApplied: semanticLookup.focusLegalityApplied,
          focusLegalityLawful: semanticLookup.focusLegalityLawful,
          focusLegalityPenaltyApplied: semanticLookup.focusLegalityPenaltyApplied,
          focusLegalityPenalty: semanticLookup.focusLegalityPenalty,
          focusLegalityReasonCodes: semanticLookup.focusLegalityReasonCodes,
          focusLegalityCommandKind: semanticLookup.focusLegalityCommandKind,
          atlasShardRankingApplied: semanticLookup.atlasShardRankingApplied,
          atlasShardRankingBoost: semanticLookup.atlasShardRankingBoost,
          atlasShardRankingReasonCodes: semanticLookup.atlasShardRankingReasonCodes,
          atlasShardRankingCandidateKind: semanticLookup.atlasShardRankingCandidateKind,
          atlasShardNarrowingApplied: semanticLookup.atlasShardNarrowingApplied ?? false,
          atlasShardNarrowingFallbackUsed: semanticLookup.atlasShardNarrowingFallbackUsed ?? false,
          atlasShardNarrowingCandidateCountBefore: semanticLookup.atlasShardNarrowingCandidateCountBefore ?? undefined,
          atlasShardNarrowingCandidateCountAfter: semanticLookup.atlasShardNarrowingCandidateCountAfter ?? undefined,
          atlasShardNarrowingReasonCodes: semanticLookup.atlasShardNarrowingReasonCodes ?? ["atlas_shard_narrowing_not_evaluated"],
          atlasShardNarrowingAllowedCandidateKinds: semanticLookup.atlasShardNarrowingAllowedCandidateKinds ?? undefined,
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
        focusRankingApplied: semanticLookup.focusRankingApplied,
        focusRankingBoost: semanticLookup.focusRankingBoost,
        focusRankingReasonCodes: semanticLookup.focusRankingReasonCodes,
        focusLegalityApplied: semanticLookup.focusLegalityApplied,
        focusLegalityLawful: semanticLookup.focusLegalityLawful,
        focusLegalityPenaltyApplied: semanticLookup.focusLegalityPenaltyApplied,
        focusLegalityPenalty: semanticLookup.focusLegalityPenalty,
        focusLegalityReasonCodes: semanticLookup.focusLegalityReasonCodes,
        focusLegalityCommandKind: semanticLookup.focusLegalityCommandKind,
        focusTaskMomentumApplied: semanticLookup.focusTaskMomentumApplied ?? false,
        focusTaskMomentumBoost: semanticLookup.focusTaskMomentumBoost ?? 0,
        focusTaskMomentumPenaltyApplied: semanticLookup.focusTaskMomentumPenaltyApplied ?? false,
        focusTaskMomentumPenalty: semanticLookup.focusTaskMomentumPenalty ?? 0,
        focusTaskMomentumReasonCodes: semanticLookup.focusTaskMomentumReasonCodes ?? ["focus_task_momentum_not_evaluated"],
        focusTaskMomentumMatchedSemanticAddressId: semanticLookup.focusTaskMomentumMatchedSemanticAddressId ?? undefined,
        atlasShardRankingApplied: semanticLookup.atlasShardRankingApplied,
        atlasShardRankingBoost: semanticLookup.atlasShardRankingBoost,
        atlasShardRankingReasonCodes: semanticLookup.atlasShardRankingReasonCodes,
        atlasShardRankingCandidateKind: semanticLookup.atlasShardRankingCandidateKind,
        atlasShardNarrowingApplied: semanticLookup.atlasShardNarrowingApplied ?? false,
        atlasShardNarrowingFallbackUsed: semanticLookup.atlasShardNarrowingFallbackUsed ?? false,
        atlasShardNarrowingCandidateCountBefore: semanticLookup.atlasShardNarrowingCandidateCountBefore ?? undefined,
        atlasShardNarrowingCandidateCountAfter: semanticLookup.atlasShardNarrowingCandidateCountAfter ?? undefined,
        atlasShardNarrowingReasonCodes: semanticLookup.atlasShardNarrowingReasonCodes ?? ["atlas_shard_narrowing_not_evaluated"],
        atlasShardNarrowingAllowedCandidateKinds: semanticLookup.atlasShardNarrowingAllowedCandidateKinds ?? undefined,
        multiResolutionAtlasFamilyRoutingApplied:
          semanticLookup.multiResolutionAtlasFamilyRoutingApplied ?? false,
        multiResolutionAtlasFamilyRoutingBoost:
          semanticLookup.multiResolutionAtlasFamilyRoutingBoost ?? 0,
        multiResolutionAtlasFamilyRoutingReasonCodes:
          semanticLookup.multiResolutionAtlasFamilyRoutingReasonCodes ?? ["multi_resolution_family_routing_not_evaluated"],
        multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
          semanticLookup.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? undefined,
        multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
          semanticLookup.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? undefined,
        multiResolutionAtlasPrefixBandRoutingApplied:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingApplied ?? false,
        multiResolutionAtlasPrefixBandRoutingBoost:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingBoost ?? 0,
        multiResolutionAtlasPrefixBandRoutingReasonCodes:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingReasonCodes ?? ["multi_resolution_prefix_band_routing_not_evaluated"],
        multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId ?? undefined,
        multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId:
          semanticLookup.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId ?? undefined,
        multiResolutionAtlasTailStrategyRoutingApplied:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingApplied ?? false,
        multiResolutionAtlasTailStrategyRoutingBoost:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingBoost ?? 0,
        multiResolutionAtlasTailStrategyRoutingReasonCodes:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingReasonCodes ?? ["multi_resolution_tail_strategy_routing_not_evaluated"],
        multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId ?? undefined,
  
      multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId:
          semanticLookup.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId ?? undefined,
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
          focusRankingApplied: semanticLookup.focusRankingApplied,
          focusRankingBoost: semanticLookup.focusRankingBoost,
          focusRankingReasonCodes: semanticLookup.focusRankingReasonCodes,
          focusLegalityApplied: semanticLookup.focusLegalityApplied,
          focusLegalityLawful: semanticLookup.focusLegalityLawful,
          focusLegalityPenaltyApplied: semanticLookup.focusLegalityPenaltyApplied,
          focusLegalityPenalty: semanticLookup.focusLegalityPenalty,
          focusLegalityReasonCodes: semanticLookup.focusLegalityReasonCodes,
          focusLegalityCommandKind: semanticLookup.focusLegalityCommandKind,
          atlasShardRankingApplied: semanticLookup.atlasShardRankingApplied,
          atlasShardRankingBoost: semanticLookup.atlasShardRankingBoost,
          atlasShardRankingReasonCodes: semanticLookup.atlasShardRankingReasonCodes,
          atlasShardRankingCandidateKind: semanticLookup.atlasShardRankingCandidateKind,
          workflowMemoryOrderingVersion:
            workflowMemoryOrderingFields.workflowMemoryOrderingVersion,
          workflowMemoryOrderingEligible:
            workflowMemoryOrderingFields.workflowMemoryOrderingEligible,
          workflowMemoryOrderingApplied:
            workflowMemoryOrderingFields.workflowMemoryOrderingApplied,
          workflowMemoryOrderingBaseScore:
            workflowMemoryOrderingFields.workflowMemoryOrderingBaseScore,
          workflowMemoryOrderingAdjustedScore:
            workflowMemoryOrderingFields.workflowMemoryOrderingAdjustedScore,
          workflowMemoryOrderingBoost:
            workflowMemoryOrderingFields.workflowMemoryOrderingBoost,
          workflowMemoryOrderingPreviousSemanticAddressId:
            workflowMemoryOrderingFields.workflowMemoryOrderingPreviousSemanticAddressId,
          workflowMemoryOrderingCandidateSemanticAddressId:
            workflowMemoryOrderingFields.workflowMemoryOrderingCandidateSemanticAddressId,
          workflowMemoryOrderingMatchedTransitionKey:
            workflowMemoryOrderingFields.workflowMemoryOrderingMatchedTransitionKey,
          workflowMemoryOrderingTransitionCount:
            workflowMemoryOrderingFields.workflowMemoryOrderingTransitionCount,
          workflowMemoryOrderingSource:
            workflowMemoryOrderingFields.workflowMemoryOrderingSource,
          workflowMemoryOrderingReasonCodes:
            workflowMemoryOrderingFields.workflowMemoryOrderingReasonCodes,
          multiResolutionAtlasFamilyRoutingApplied:
            semanticLookup.multiResolutionAtlasFamilyRoutingApplied ?? false,
          multiResolutionAtlasFamilyRoutingBoost:
            semanticLookup.multiResolutionAtlasFamilyRoutingBoost ?? 0,
          multiResolutionAtlasFamilyRoutingReasonCodes:
            semanticLookup.multiResolutionAtlasFamilyRoutingReasonCodes ?? ["multi_resolution_family_routing_not_evaluated"],
          multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
            semanticLookup.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? undefined,
          multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
            semanticLookup.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? undefined,
          multiResolutionAtlasPrefixBandRoutingApplied:
            semanticLookup.multiResolutionAtlasPrefixBandRoutingApplied ?? false,
          multiResolutionAtlasPrefixBandRoutingBoost:
            semanticLookup.multiResolutionAtlasPrefixBandRoutingBoost ?? 0,
          multiResolutionAtlasPrefixBandRoutingReasonCodes:
            semanticLookup.multiResolutionAtlasPrefixBandRoutingReasonCodes ?? ["multi_resolution_prefix_band_routing_not_evaluated"],
          multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId:
            semanticLookup.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId ?? undefined,
          multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId:
            semanticLookup.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId ?? undefined,
          multiResolutionAtlasTailStrategyRoutingApplied:
            semanticLookup.multiResolutionAtlasTailStrategyRoutingApplied ?? false,
          multiResolutionAtlasTailStrategyRoutingBoost:
            semanticLookup.multiResolutionAtlasTailStrategyRoutingBoost ?? 0,
          multiResolutionAtlasTailStrategyRoutingReasonCodes:
            semanticLookup.multiResolutionAtlasTailStrategyRoutingReasonCodes ?? ["multi_resolution_tail_strategy_routing_not_evaluated"],
          multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId:
            semanticLookup.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId ?? undefined,
    
      multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId:
            semanticLookup.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId ?? undefined,
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
        semanticAddressId: warmLookup?.bestCandidateId ?? undefined,
        canonicalMergedText: warmLookup?.bestCanonicalMergedText ?? undefined,
        bestCandidateId: warmLookup?.bestCandidateId ?? undefined,
        bestCandidateScore: warmLookup?.bestCandidateScore ?? undefined,
        warmHitClass: warmLookup?.warmHitClass ?? undefined,
        warmApplied: warmLookup?.warmApplied ?? undefined,
        warmAppliedStage: warmLookup?.warmAppliedStage ?? undefined,
        confidencePolicyVersion: warmLookup?.confidencePolicyVersion ?? undefined,
        weakThreshold: warmLookup?.weakThreshold ?? undefined,
        strongThreshold: warmLookup?.strongThreshold ?? undefined,
        candidateAgeMs: warmLookup?.candidateAgeMs ?? undefined,
        recentConflictPenaltyApplied: warmLookup?.recentConflictPenaltyApplied ?? undefined,
        staleProtectionApplied: warmLookup?.staleProtectionApplied ?? undefined,
        focusRankingApplied: warmLookup?.focusRankingApplied ?? undefined,
        focusRankingBoost: warmLookup?.focusRankingBoost ?? undefined,
        focusRankingReasonCodes: warmLookup?.focusRankingReasonCodes ?? undefined,
        focusLegalityApplied: warmLookup?.focusLegalityApplied ?? undefined,
        focusLegalityLawful: warmLookup?.focusLegalityLawful ?? undefined,
        focusLegalityPenaltyApplied: warmLookup?.focusLegalityPenaltyApplied ?? undefined,
        focusLegalityPenalty: warmLookup?.focusLegalityPenalty ?? undefined,
        focusLegalityReasonCodes: warmLookup?.focusLegalityReasonCodes ?? undefined,
        focusLegalityCommandKind: warmLookup?.focusLegalityCommandKind ?? undefined,
        focusTaskMomentumApplied: warmLookup?.focusTaskMomentumApplied ?? undefined,
        focusTaskMomentumBoost: warmLookup?.focusTaskMomentumBoost ?? undefined,
        focusTaskMomentumPenaltyApplied: warmLookup?.focusTaskMomentumPenaltyApplied ?? undefined,
        focusTaskMomentumPenalty: warmLookup?.focusTaskMomentumPenalty ?? undefined,
        focusTaskMomentumReasonCodes: warmLookup?.focusTaskMomentumReasonCodes ?? undefined,
        focusTaskMomentumMatchedSemanticAddressId: warmLookup?.focusTaskMomentumMatchedSemanticAddressId ?? undefined,
        atlasShardRankingApplied: warmLookup?.atlasShardRankingApplied ?? undefined,
        atlasShardRankingBoost: warmLookup?.atlasShardRankingBoost ?? undefined,
        atlasShardRankingReasonCodes: warmLookup?.atlasShardRankingReasonCodes ?? undefined,
        atlasShardRankingCandidateKind: warmLookup?.atlasShardRankingCandidateKind ?? undefined,
        atlasShardNarrowingApplied: warmLookup?.atlasShardNarrowingApplied ?? undefined,
        atlasShardNarrowingFallbackUsed: warmLookup?.atlasShardNarrowingFallbackUsed ?? undefined,
        atlasShardNarrowingCandidateCountBefore: warmLookup?.atlasShardNarrowingCandidateCountBefore ?? undefined,
        atlasShardNarrowingCandidateCountAfter: warmLookup?.atlasShardNarrowingCandidateCountAfter ?? undefined,
        atlasShardNarrowingReasonCodes: warmLookup?.atlasShardNarrowingReasonCodes ?? undefined,
        atlasShardNarrowingAllowedCandidateKinds: warmLookup?.atlasShardNarrowingAllowedCandidateKinds ?? undefined,
        multiResolutionAtlasFamilyRoutingApplied:
          warmLookup?.multiResolutionAtlasFamilyRoutingApplied ?? undefined,
        multiResolutionAtlasFamilyRoutingBoost:
          warmLookup?.multiResolutionAtlasFamilyRoutingBoost ?? undefined,
        multiResolutionAtlasFamilyRoutingReasonCodes:
          warmLookup?.multiResolutionAtlasFamilyRoutingReasonCodes ?? undefined,
        multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
          warmLookup?.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? undefined,
        multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
          warmLookup?.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? undefined,
        multiResolutionAtlasPrefixBandRoutingApplied:
          warmLookup?.multiResolutionAtlasPrefixBandRoutingApplied ?? undefined,
        multiResolutionAtlasPrefixBandRoutingBoost:
          warmLookup?.multiResolutionAtlasPrefixBandRoutingBoost ?? undefined,
        multiResolutionAtlasPrefixBandRoutingReasonCodes:
          warmLookup?.multiResolutionAtlasPrefixBandRoutingReasonCodes ?? undefined,
        multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId:
          warmLookup?.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId ?? undefined,
        multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId:
          warmLookup?.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId ?? undefined,
        multiResolutionAtlasTailStrategyRoutingApplied:
          warmLookup?.multiResolutionAtlasTailStrategyRoutingApplied ?? undefined,
        multiResolutionAtlasTailStrategyRoutingBoost:
          warmLookup?.multiResolutionAtlasTailStrategyRoutingBoost ?? undefined,
        multiResolutionAtlasTailStrategyRoutingReasonCodes:
          warmLookup?.multiResolutionAtlasTailStrategyRoutingReasonCodes ?? undefined,
        multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId:
          warmLookup?.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId ?? undefined,
  
      multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId:
          warmLookup?.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId ?? undefined,
        warmDiscardReason: "live_geometric_evidence_override",
        liveEvidenceOverride: true,
        lookupPath: warmLookup?.lookupPath ?? undefined,
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
      semanticAddressId: warmLookup?.bestCandidateId ?? undefined,
      canonicalMergedText: warmLookup?.bestCanonicalMergedText ?? undefined,
      bestCandidateId: warmLookup?.bestCandidateId ?? undefined,
      bestCandidateScore: warmLookup?.bestCandidateScore ?? undefined,
      warmHitClass: warmLookup?.warmHitClass ?? undefined,
      warmApplied: warmLookup?.warmApplied ?? undefined,
      warmAppliedStage: warmLookup?.warmAppliedStage ?? undefined,
      confidencePolicyVersion: warmLookup?.confidencePolicyVersion ?? undefined,
      weakThreshold: warmLookup?.weakThreshold ?? undefined,
      strongThreshold: warmLookup?.strongThreshold ?? undefined,
      candidateAgeMs: warmLookup?.candidateAgeMs ?? undefined,
      recentConflictPenaltyApplied: warmLookup?.recentConflictPenaltyApplied ?? undefined,
      staleProtectionApplied: warmLookup?.staleProtectionApplied ?? undefined,
      focusRankingApplied: warmLookup?.focusRankingApplied ?? undefined,
      focusRankingBoost: warmLookup?.focusRankingBoost ?? undefined,
      focusRankingReasonCodes: warmLookup?.focusRankingReasonCodes ?? undefined,
      focusLegalityApplied: warmLookup?.focusLegalityApplied ?? undefined,
      focusLegalityLawful: warmLookup?.focusLegalityLawful ?? undefined,
      focusLegalityPenaltyApplied: warmLookup?.focusLegalityPenaltyApplied ?? undefined,
      focusLegalityPenalty: warmLookup?.focusLegalityPenalty ?? undefined,
      focusLegalityReasonCodes: warmLookup?.focusLegalityReasonCodes ?? undefined,
      focusLegalityCommandKind: warmLookup?.focusLegalityCommandKind ?? undefined,
      atlasShardRankingApplied: warmLookup?.atlasShardRankingApplied ?? undefined,
      atlasShardRankingBoost: warmLookup?.atlasShardRankingBoost ?? undefined,
      atlasShardRankingReasonCodes: warmLookup?.atlasShardRankingReasonCodes ?? undefined,
      atlasShardRankingCandidateKind: warmLookup?.atlasShardRankingCandidateKind ?? undefined,
      multiResolutionAtlasFamilyRoutingApplied:
        warmLookup?.multiResolutionAtlasFamilyRoutingApplied ?? undefined,
      multiResolutionAtlasFamilyRoutingBoost:
        warmLookup?.multiResolutionAtlasFamilyRoutingBoost ?? undefined,
      multiResolutionAtlasFamilyRoutingReasonCodes:
        warmLookup?.multiResolutionAtlasFamilyRoutingReasonCodes ?? undefined,
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
        warmLookup?.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? undefined,
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
        warmLookup?.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? undefined,
      warmDiscardReason: liveEvidenceOverride ? "live_geometric_evidence_override" : null,
      liveEvidenceOverride,
      lookupPath: warmLookup?.lookupPath ?? undefined,
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

  setFocusConditionedCommandContextForChunk(
    chunkId: string,
    envelope: FocusConditionedCommandContextEnvelope | null | undefined
  ): void {
    if (!envelope) {
      this.chunkH3FocusContextEnvelope.delete(chunkId);
      this.chunkH3AtlasShardHint.delete(chunkId);
      return;
    }
    this.chunkH3FocusContextEnvelope.set(chunkId, envelope);
    this.chunkH3AtlasShardHint.set(chunkId, derivePolicyShapedAtlasShardHint(envelope));
  }

  clearFocusConditionedCommandContextForChunk(chunkId: string): void {
    this.chunkH3FocusContextEnvelope.delete(chunkId);
    this.chunkH3AtlasShardHint.delete(chunkId);
  }

  private getFocusContextEvidenceFields(chunkId: string) {
    return deriveFocusContextEvidenceFields(this.chunkH3FocusContextEnvelope.get(chunkId) ?? null);
  }

  private getAtlasShardEvidenceFields(chunkId: string) {
    return derivePolicyShapedAtlasShardEvidenceFields(this.chunkH3AtlasShardHint.get(chunkId) ?? null);
  }

  private getMultiResolutionAtlasEvidenceFields(
    chunkId: string,
    seed: Partial<{ regionId: string | null; commandClass: string | null; parameterType: string | null; canonicalMergedText: string | null }> = {}
  ) {
    const latest = this.chunkH3LatestGeometricEvent.get(chunkId);
    return deriveMultiResolutionAtlasEvidenceFields(this.chunkH3AtlasShardHint.get(chunkId) ?? undefined, {
      regionId: seed.regionId ?? latest?.regionId ?? null,
      commandClass: seed.commandClass ?? latest?.commandClass ?? null,
      parameterType: seed.parameterType === "numeric" || seed.parameterType === "open"
        ? seed.parameterType
        : (latest?.parameterType ?? null),
      canonicalMergedText: seed.canonicalMergedText ?? null,
    });
  }

  private getMultiResolutionAtlasPlan(
    chunkId: string,
    seed: Partial<{ regionId: string | null; commandClass: string | null; parameterType: string | null; canonicalMergedText: string | null }> = {}
  ) {
    const latest = this.chunkH3LatestGeometricEvent.get(chunkId);
    return deriveMultiResolutionAtlasPlan(this.chunkH3AtlasShardHint.get(chunkId) ?? undefined, {
      regionId: seed.regionId ?? latest?.regionId ?? null,
      commandClass: seed.commandClass ?? latest?.commandClass ?? null,
      parameterType: seed.parameterType === "numeric" || seed.parameterType === "open"
        ? seed.parameterType
        : (latest?.parameterType ?? null),
      canonicalMergedText: seed.canonicalMergedText ?? null,
    });
  }



  private getCounterfactualRepairEvidenceFields(
    chunkId: string,
    eventName: string,
    seed: Partial<{ semanticAddressId: string | null; canonicalMergedText: string | null; regionId: string | null; commandClass: string | null; parameterType: string | null; transcriptText: string | null; reason: string | null; finalGranted: boolean | null }> = {}
  ) {
    const latest = this.chunkH3LatestGeometricEvent.get(chunkId);
    return deriveCounterfactualRepairEvidenceFields({
      semanticAddressId: seed.semanticAddressId ?? null,
      canonicalMergedText: seed.canonicalMergedText ?? null,
      regionId: seed.regionId ?? latest?.regionId ?? null,
      commandClass: seed.commandClass ?? latest?.commandClass ?? null,
      parameterType: seed.parameterType === "numeric" || seed.parameterType === "open"
        ? seed.parameterType
        : (latest?.parameterType ?? null),
      transcriptText: seed.transcriptText ?? null,
      eventName,
      reason: seed.reason ?? null,
      finalGranted: seed.finalGranted ?? undefined,
    });
  }

  private getDynamicPrecisionActiveRegimeMap() {
    const self = this as any;
    if (!(self.chunkH3DynamicPrecisionActiveRegime instanceof Map)) {
      self.chunkH3DynamicPrecisionActiveRegime = new Map<string, string>();
    }
    return self.chunkH3DynamicPrecisionActiveRegime as Map<string, string>;
  }

  private getDynamicPrecisionStabilityTickMap() {
    const self = this as any;
    if (!(self.chunkH3DynamicPrecisionStabilityTickCount instanceof Map)) {
      self.chunkH3DynamicPrecisionStabilityTickCount = new Map<string, number>();
    }
    return self.chunkH3DynamicPrecisionStabilityTickCount as Map<string, number>;
  }

  private getDynamicPrecisionCooldownMap() {
    const self = this as any;
    if (!(self.chunkH3DynamicPrecisionCooldownTicksRemaining instanceof Map)) {
      self.chunkH3DynamicPrecisionCooldownTicksRemaining = new Map<string, number>();
    }
    return self.chunkH3DynamicPrecisionCooldownTicksRemaining as Map<string, number>;
  }

  private getWorkflowCandidateDiscoveryState() {
    const self = this as any;
    if (!self.h3WorkflowCandidateDiscoveryState || typeof self.h3WorkflowCandidateDiscoveryState !== "object") {
      self.h3WorkflowCandidateDiscoveryState = deriveEmptyWorkflowCandidateDiscoveryState();
    }
    return self.h3WorkflowCandidateDiscoveryState as ReturnType<typeof deriveEmptyWorkflowCandidateDiscoveryState>;
  }

  private getWorkflowCandidateDiscoveryFields(
    chunkId: string,
    eventName: string,
    seed: Partial<{
      semanticAddressId: string | null;
      finalGranted: boolean | null;
    }> = {}
  ) {
    void chunkId;
    void eventName;
    const fields = deriveWorkflowCandidateDiscovery({
      semanticAddressId: seed.semanticAddressId ?? null,
      finalGranted: seed.finalGranted ?? null,
      source: "h3_runtime_evidence",
      previousState: this.getWorkflowCandidateDiscoveryState(),
    });

    if (fields.workflowCandidateDiscoveryGovernedStateUpdated && fields.nextState) {
      const self = this as any;
      self.h3WorkflowCandidateDiscoveryState = fields.nextState;
    }

    return fields;
  }

  private getWorkflowMemoryState() {
    const self = this as any;
    if (!self.h3WorkflowMemoryState || typeof self.h3WorkflowMemoryState !== "object") {
      self.h3WorkflowMemoryState = {
        lastGovernedSemanticAddressId: null,
        sequenceLength: 0,
        consecutiveRepeatCount: 0,
        transitionCounts: {},
      };
    }
    return self.h3WorkflowMemoryState as {
      lastGovernedSemanticAddressId: string | null;
      sequenceLength: number;
      consecutiveRepeatCount: number;
      transitionCounts: Record<string, number>;
    };
  }

  private getWorkflowReuseHistory() {
    const self = this as any;
    if (!Array.isArray(self.h3WorkflowReuseGovernedHistory)) {
      self.h3WorkflowReuseGovernedHistory = [];
    }
    return self.h3WorkflowReuseGovernedHistory as string[];
  }

  private updateWorkflowReuseHistory(semanticAddressId: string | null): void {
    if (!semanticAddressId) {
      return;
    }
    const self = this as any;
    const governedHistory = this.getWorkflowReuseHistory();
    const nextHistory = [...governedHistory, semanticAddressId].slice(-16);
    self.h3WorkflowReuseGovernedHistory = nextHistory;
  }

  private getWorkflowSkeletonInferenceState() {
    const self = this as any;
    if (!self.h3WorkflowSkeletonInferenceState || typeof self.h3WorkflowSkeletonInferenceState !== "object") {
      self.h3WorkflowSkeletonInferenceState = deriveEmptyWorkflowSkeletonInferenceState();
    }
    return self.h3WorkflowSkeletonInferenceState as ReturnType<typeof deriveEmptyWorkflowSkeletonInferenceState>;
  }

  private getWorkflowSkeletonInferenceFields(
    chunkId: string,
    eventName: string,
    seed: Partial<{
      discoverySequenceSemanticAddressIds: string[] | null;
      discoveryPatternKey: string | null;
      discoveryThresholdMet: boolean | null;
    }> = {}
  ) {
    void chunkId;
    void eventName;
    const fields = deriveWorkflowSkeletonInference({
      discoverySequenceSemanticAddressIds: seed.discoverySequenceSemanticAddressIds ?? null,
      discoveryPatternKey: seed.discoveryPatternKey ?? null,
      discoveryThresholdMet: seed.discoveryThresholdMet ?? null,
      source: "h3_runtime_evidence",
      previousState: this.getWorkflowSkeletonInferenceState(),
    });

    if (fields.workflowSkeletonInferenceGovernedStateUpdated && fields.nextState) {
      const self = this as any;
      self.h3WorkflowSkeletonInferenceState = fields.nextState;
    }

    return fields;
  }

  private getWorkflowCandidateScoringFields(
    chunkId: string,
    eventName: string,
    seed: Partial<{
      discoveryEligible: boolean | null;
      discoveryOccurrenceCount: number | null;
      discoveryDistinctRunCount: number | null;
      discoverySequenceLength: number | null;
      discoveryStartBoundaryConfidence: number | null;
      discoveryEndBoundaryConfidence: number | null;
      discoveryRepeatedSubsequenceDetected: boolean | null;
      discoveryRediscoveryMerged: boolean | null;
      skeletonEligible: boolean | null;
      skeletonCanonicalStepSemanticAddressIds: string[] | null;
      skeletonFixedStepIndices: number[] | null;
      skeletonVariableStepIndices: number[] | null;
      skeletonOptionalStepIndices: number[] | null;
      skeletonInferredSlotCount: number | null;
      skeletonGeneralizationConfidence: number | null;
      skeletonAbstractionEligible: boolean | null;
      skeletonFamilyVariantCount: number | null;
      skeletonFamilySplitRequired: boolean | null;
    }> = {}
  ) {
    void chunkId;
    void eventName;
    return deriveWorkflowCandidateScoring({
      discoveryEligible: seed.discoveryEligible ?? null,
      discoveryOccurrenceCount: seed.discoveryOccurrenceCount ?? null,
      discoveryDistinctRunCount: seed.discoveryDistinctRunCount ?? null,
      discoverySequenceLength: seed.discoverySequenceLength ?? null,
      discoveryStartBoundaryConfidence: seed.discoveryStartBoundaryConfidence ?? null,
      discoveryEndBoundaryConfidence: seed.discoveryEndBoundaryConfidence ?? null,
      discoveryRepeatedSubsequenceDetected: seed.discoveryRepeatedSubsequenceDetected ?? null,
      discoveryRediscoveryMerged: seed.discoveryRediscoveryMerged ?? null,
      skeletonEligible: seed.skeletonEligible ?? null,
      skeletonCanonicalStepSemanticAddressIds:
        seed.skeletonCanonicalStepSemanticAddressIds ?? null,
      skeletonFixedStepIndices: seed.skeletonFixedStepIndices ?? null,
      skeletonVariableStepIndices: seed.skeletonVariableStepIndices ?? null,
      skeletonOptionalStepIndices: seed.skeletonOptionalStepIndices ?? null,
      skeletonInferredSlotCount: seed.skeletonInferredSlotCount ?? null,
      skeletonGeneralizationConfidence: seed.skeletonGeneralizationConfidence ?? null,
      skeletonAbstractionEligible: seed.skeletonAbstractionEligible ?? null,
      skeletonFamilyVariantCount: seed.skeletonFamilyVariantCount ?? null,
      skeletonFamilySplitRequired: seed.skeletonFamilySplitRequired ?? null,
      source: "h3_runtime_evidence",
    });
  }

  private getWorkflowMemoryReuseFields(
    seed: Partial<{
      semanticAddressId: string | null;
      finalGranted: boolean | null;
    }> = {}
  ) {
    return deriveWorkflowMemoryReuseSubstrate({
      governedHistory: this.getWorkflowReuseHistory(),
      currentSemanticAddressId: seed.semanticAddressId ?? null,
      finalGranted: seed.finalGranted ?? null,
      source: "h3_runtime_evidence",
    });
  }

  private getWorkflowMemoryEvidenceFields(
    chunkId: string,
    eventName: string,
    seed: Partial<{
      semanticAddressId: string | null;
      finalGranted: boolean | null;
    }> = {}
  ) {
    void chunkId;
    void eventName;
    const workflowState = this.getWorkflowMemoryState();
    const fields = deriveWorkflowMemoryObservation({
      semanticAddressId: seed.semanticAddressId ?? null,
      finalGranted: seed.finalGranted ?? null,
      source: "h3_runtime_evidence",
      previousState: workflowState,
    });

    if (fields.workflowMemoryGovernedStateUpdated && fields.nextState) {
      const self = this as any;
      self.h3WorkflowMemoryState = fields.nextState;
    }

    return fields;
  }

  private getWorkflowMemoryRankingFields(
    seed: Partial<{
      candidateSemanticAddressId: string | null;
      continuationSuggested: boolean | null;
    }> = {}
  ) {
    const workflowState = this.getWorkflowMemoryState();
    const candidateSemanticAddressId = seed.candidateSemanticAddressId ?? null;
    const previousSemanticAddressId = workflowState.lastGovernedSemanticAddressId ?? null;
    const transitionKey =
      previousSemanticAddressId &&
      candidateSemanticAddressId &&
      previousSemanticAddressId !== candidateSemanticAddressId
        ? `${previousSemanticAddressId}->${candidateSemanticAddressId}`
        : null;
    const transitionCount = transitionKey ? (workflowState.transitionCounts[transitionKey] ?? 0) : 0;
    const continuationSuggested =
      seed.continuationSuggested ?? (transitionKey ? transitionCount > 0 : false);

    return deriveWorkflowMemoryContinuityRanking({
      previousSemanticAddressId,
      candidateSemanticAddressId,
      transitionCounts: workflowState.transitionCounts,
      continuationSuggested,
      source: "h3_runtime_evidence",
    });
  }

  private getWorkflowMemoryOrderingFields(
    seed: Partial<{
      candidateSemanticAddressId: string | null;
      baseScore: number | null;
      continuationSuggested: boolean | null;
    }> = {}
  ) {
    const rankingFields = this.getWorkflowMemoryRankingFields({
      candidateSemanticAddressId: seed.candidateSemanticAddressId ?? null,
      continuationSuggested: seed.continuationSuggested ?? null,
    });

    return deriveWorkflowMemoryContinuityOrdering({
      baseScore: seed.baseScore ?? null,
      previousSemanticAddressId:
        rankingFields.workflowMemoryRankingPreviousSemanticAddressId ?? null,
      candidateSemanticAddressId:
        rankingFields.workflowMemoryRankingCandidateSemanticAddressId ?? null,
      matchedTransitionKey:
        rankingFields.workflowMemoryRankingMatchedTransitionKey ?? null,
      transitionCount:
        rankingFields.workflowMemoryRankingTransitionCount ?? null,
      rankingApplied: rankingFields.workflowMemoryRankingApplied ?? false,
      rankingBoost: rankingFields.workflowMemoryRankingBoost ?? 0,
      source: "h3_runtime_evidence",
    });
  }


  private getWorkflowMemoryCandidatePoolOrderingFields(
    seed: Partial<{
      candidateSemanticAddressIds: string[] | null;
      candidateScores: number[] | null;
      continuationSuggested: boolean | null;
    }> = {}
  ) {
    const workflowState = this.getWorkflowMemoryState();

    return deriveWorkflowMemoryCandidatePoolOrdering({
      previousSemanticAddressId: workflowState.lastGovernedSemanticAddressId ?? null,
      candidateSemanticAddressIds: seed.candidateSemanticAddressIds ?? null,
      candidateScores: seed.candidateScores ?? null,
      transitionCounts: workflowState.transitionCounts,
      continuationSuggested: seed.continuationSuggested ?? null,
      source: "h3_runtime_evidence",
    });
  }

  private getDynamicPrecisionEvidenceFields(
    chunkId: string,
    seed: Partial<{
      regionId: string | null;
      commandClass: string | null;
      parameterType: string | null;
      ambiguityBand: string | null;
      repairWindowOpen: boolean | null;
      stressBand: string | null;
      guardrailSuggested: boolean | null;
      guardrailKind: string | null;
    }> = {}
  ) {
    const latest = this.chunkH3LatestGeometricEvent.get(chunkId);
    const activeRegimeMap = this.getDynamicPrecisionActiveRegimeMap();
    const stabilityTickMap = this.getDynamicPrecisionStabilityTickMap();
    const cooldownMap = this.getDynamicPrecisionCooldownMap();
    const fields = deriveDynamicPrecisionRegimeObservation({
      regionId: seed.regionId ?? latest?.regionId ?? null,
      commandClass: seed.commandClass ?? latest?.commandClass ?? null,
      parameterType: seed.parameterType === "numeric" || seed.parameterType === "open"
        ? seed.parameterType
        : (latest?.parameterType ?? null),
      ambiguityBand:
        seed.ambiguityBand === "low" || seed.ambiguityBand === "medium" || seed.ambiguityBand === "high"
          ? seed.ambiguityBand
          : null,
      repairWindowOpen: seed.repairWindowOpen ?? null,
      stressBand:
        seed.stressBand === "nominal" || seed.stressBand === "elevated" || seed.stressBand === "critical"
          ? seed.stressBand
          : null,
      guardrailSuggested: seed.guardrailSuggested ?? null,
      guardrailKind: seed.guardrailKind ?? null,
      source: "h3_runtime_evidence",
      currentRegime: activeRegimeMap.get(chunkId) as any ?? null,
      stabilityTickCount: stabilityTickMap.get(chunkId) ?? null,
      cooldownTicksRemaining: cooldownMap.get(chunkId) ?? null,
    });

    if (fields.dynamicPrecisionEligible) {
      if (fields.dynamicPrecisionActiveRegime) {
        activeRegimeMap.set(chunkId, fields.dynamicPrecisionActiveRegime);
      }
      if (typeof fields.dynamicPrecisionStabilityTickCount === "number") {
        stabilityTickMap.set(chunkId, fields.dynamicPrecisionStabilityTickCount);
      }
      if (typeof fields.dynamicPrecisionCooldownTicksRemaining === "number") {
        cooldownMap.set(chunkId, fields.dynamicPrecisionCooldownTicksRemaining);
      }
    } else {
      activeRegimeMap.delete(chunkId);
      stabilityTickMap.delete(chunkId);
      cooldownMap.delete(chunkId);
    }

    return fields;
  }

  private emitH3Evidence(
    chunkId: string,
    eventName: string,
    overrides: Record<string, any> = {}
  ): void {
    const latest = this.chunkH3LatestGeometricEvent.get(chunkId);
    const trace = h23Recorder.getTraceSnapshot(chunkId);
    const decision = h23Recorder.getLatestDecision(chunkId);
    const focusFields = this.getFocusContextEvidenceFields(chunkId);
    const atlasShardFields = this.getAtlasShardEvidenceFields(chunkId);
    const multiResolutionAtlasFields = this.getMultiResolutionAtlasEvidenceFields(chunkId, {
      regionId: overrides.regionId ?? latest?.regionId ?? undefined,
      commandClass: overrides.commandClass ?? latest?.commandClass ?? undefined,
      parameterType: overrides.parameterType ?? latest?.parameterType ?? undefined,
      canonicalMergedText: overrides.canonicalMergedText ?? overrides.mergedText ?? undefined,
    });
    const counterfactualRepairFields = this.getCounterfactualRepairEvidenceFields(chunkId, eventName, {
      semanticAddressId: overrides.semanticAddressId ?? undefined,
      canonicalMergedText: overrides.canonicalMergedText ?? overrides.mergedText ?? undefined,
      regionId: overrides.regionId ?? latest?.regionId ?? undefined,
      commandClass: overrides.commandClass ?? latest?.commandClass ?? undefined,
      parameterType: overrides.parameterType ?? latest?.parameterType ?? undefined,
      transcriptText: overrides.transcriptText ?? undefined,
      reason: (overrides as any).reason ?? undefined,
      finalGranted: decision?.granted ?? undefined,
    });
    const dynamicPrecisionFields = this.getDynamicPrecisionEvidenceFields(chunkId, {
      regionId: overrides.regionId ?? latest?.regionId ?? null,
      commandClass: overrides.commandClass ?? latest?.commandClass ?? null,
      parameterType: overrides.parameterType ?? latest?.parameterType ?? null,
      ambiguityBand: counterfactualRepairFields.counterfactualRepairAmbiguityBand,
      repairWindowOpen: counterfactualRepairFields.counterfactualRepairSignalRepairWindowOpen,
      stressBand: counterfactualRepairFields.counterfactualRepairStressBand,
      guardrailSuggested: counterfactualRepairFields.counterfactualRepairRankingGuardrailSuggested,
      guardrailKind: counterfactualRepairFields.counterfactualRepairRankingGuardrailKind,
    });
    const workflowMemoryFields = this.getWorkflowMemoryEvidenceFields(chunkId, eventName, {
      semanticAddressId: overrides.semanticAddressId ?? null,
      finalGranted: decision?.granted ?? null,
    });
    const workflowCandidateDiscoveryFields = this.getWorkflowCandidateDiscoveryFields(chunkId, eventName, {
      semanticAddressId: overrides.semanticAddressId ?? overrides.bestCandidateId ?? null,
      finalGranted: decision?.granted ?? null,
    });
    const discoveryEmergenceForSkeleton =
      (workflowCandidateDiscoveryFields.workflowCandidateDiscoveryCandidateEmergenceThresholdMet ?? false) ||
      ((workflowCandidateDiscoveryFields.workflowCandidateDiscoveryRepeatedSubsequenceDetected ?? false) &&
        (workflowCandidateDiscoveryFields.workflowCandidateDiscoveryOccurrenceCount ?? 0) >= 2);
    const workflowSkeletonInferenceFields = this.getWorkflowSkeletonInferenceFields(chunkId, eventName, {
      discoverySequenceSemanticAddressIds:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoverySequenceSemanticAddressIds ?? null,
      discoveryPatternKey:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryPatternKey ?? null,
      discoveryThresholdMet: discoveryEmergenceForSkeleton,
    });
    const workflowCandidateScoringFields = this.getWorkflowCandidateScoringFields(chunkId, eventName, {
      discoveryEligible:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryEligible ?? null,
      discoveryOccurrenceCount:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryOccurrenceCount ?? null,
      discoveryDistinctRunCount:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryDistinctRunCount ?? null,
      discoverySequenceLength:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoverySequenceLength ?? null,
      discoveryStartBoundaryConfidence:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryStartBoundaryConfidence ?? null,
      discoveryEndBoundaryConfidence:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryEndBoundaryConfidence ?? null,
      discoveryRepeatedSubsequenceDetected:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryRepeatedSubsequenceDetected ?? null,
      discoveryRediscoveryMerged:
        workflowCandidateDiscoveryFields.workflowCandidateDiscoveryRediscoveryMerged ?? null,
      skeletonEligible:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceEligible ?? null,
      skeletonCanonicalStepSemanticAddressIds:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceCanonicalStepSemanticAddressIds ?? null,
      skeletonFixedStepIndices:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceFixedStepIndices ?? null,
      skeletonVariableStepIndices:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceVariableStepIndices ?? null,
      skeletonOptionalStepIndices:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceOptionalStepIndices ?? null,
      skeletonInferredSlotCount:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceInferredSlotCount ?? null,
      skeletonGeneralizationConfidence:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceGeneralizationConfidence ?? null,
      skeletonAbstractionEligible:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceAbstractionEligible ?? null,
      skeletonFamilyVariantCount:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceFamilyVariantCount ?? null,
      skeletonFamilySplitRequired:
        workflowSkeletonInferenceFields.workflowSkeletonInferenceFamilySplitRequired ?? null,
    });
    const workflowMemoryRankingFields = this.getWorkflowMemoryRankingFields({
      candidateSemanticAddressId:
        overrides.semanticAddressId ?? overrides.bestCandidateId ?? null,
      continuationSuggested: overrides.workflowMemoryContinuationSuggested ?? null,
    });
    const workflowMemoryOrderingFields = this.getWorkflowMemoryOrderingFields({
      candidateSemanticAddressId:
        overrides.semanticAddressId ?? overrides.bestCandidateId ?? null,
      baseScore: overrides.bestCandidateScore ?? null,
      continuationSuggested: overrides.workflowMemoryContinuationSuggested ?? null,
    });
    const workflowMemoryCandidatePoolOrderingFields =
      this.getWorkflowMemoryCandidatePoolOrderingFields({
        candidateSemanticAddressIds:
          overrides.workflowMemoryCandidatePoolSemanticAddressIdsBefore ?? null,
        candidateScores:
          overrides.workflowMemoryCandidatePoolScoresBefore ?? null,
        continuationSuggested: overrides.workflowMemoryContinuationSuggested ?? null,
      });
    const workflowMemoryReuseFields = this.getWorkflowMemoryReuseFields({
      semanticAddressId: overrides.semanticAddressId ?? null,
      finalGranted: decision?.granted ?? null,
    });
    const adjustedBestCandidateId =
      workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingApplied &&
      workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter
        ? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter
        : overrides.bestCandidateId ?? null;
    const adjustedBestCandidateScore =
      workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingApplied &&
      workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateScoreAfter !== null
        ? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateScoreAfter
        : workflowMemoryOrderingFields.workflowMemoryOrderingApplied &&
          workflowMemoryOrderingFields.workflowMemoryOrderingAdjustedScore !== null
          ? workflowMemoryOrderingFields.workflowMemoryOrderingAdjustedScore
          : overrides.bestCandidateScore ?? null;
    emitH3RuntimeEvidence({
      event: eventName,
      chunkId,
      timestampMs: this.relativeChunkNowMs(chunkId),
      source: overrides.source ?? latest?.source ?? undefined,
      regionId: overrides.regionId ?? latest?.regionId ?? undefined,
      commandClass: overrides.commandClass ?? latest?.commandClass ?? undefined,
      hadTranscriptText: overrides.hadTranscriptText ?? undefined,
      transcriptText: overrides.transcriptText ?? undefined,
      routeBefore: overrides.routeBefore ?? this.chunkH3Route.get(chunkId) ?? undefined,
      routeAfter: overrides.routeAfter ?? this.chunkH3Route.get(chunkId) ?? undefined,
      tailStartMs: this.chunkH3TailCaptureStartMs.get(chunkId) ?? undefined,
      tailEndMs: overrides.tailEndMs ?? undefined,
      tailText: overrides.tailText ?? undefined,
      mergedText: overrides.mergedText ?? undefined,
      stepCount: trace.length,
      finalGranted: decision?.granted ?? undefined,
      reason: overrides.reason ?? decision?.reason ?? undefined,
      parameterType: overrides.parameterType ?? undefined,
      numericRaw: overrides.numericRaw ?? undefined,
      numericNormalized: overrides.numericNormalized ?? undefined,
      numericParseConfidence: overrides.numericParseConfidence ?? undefined,
      numericStrategyVersion: overrides.numericStrategyVersion ?? undefined,
      openRaw: overrides.openRaw ?? undefined,
      openNormalized: overrides.openNormalized ?? undefined,
      openParseConfidence: overrides.openParseConfidence ?? undefined,
      openStrategyVersion: overrides.openStrategyVersion ?? undefined,
      openTargetKind: overrides.openTargetKind ?? undefined,
      semanticAddressId: overrides.semanticAddressId ?? undefined,
      canonicalMergedText: overrides.canonicalMergedText ?? undefined,
      slotSignature: overrides.slotSignature ?? undefined,
      atlasVersion: overrides.atlasVersion ?? latest?.atlasVersion ?? undefined,
      lookupCandidateCount: overrides.lookupCandidateCount ?? undefined,
      bestCandidateId: adjustedBestCandidateId ?? undefined,
      bestCandidateScore: adjustedBestCandidateScore ?? undefined,
      warmHitClass: overrides.warmHitClass ?? undefined,
      governanceRequired: overrides.governanceRequired ?? undefined,
      governanceQualified: overrides.governanceQualified ?? undefined,
      h23StepCount: overrides.h23StepCount ?? undefined,
      h24FinalGranted: overrides.h24FinalGranted ?? undefined,
      successCount: overrides.successCount ?? undefined,
      warmApplied: overrides.warmApplied ?? undefined,
      warmAppliedStage: overrides.warmAppliedStage ?? undefined,
      confidencePolicyVersion: overrides.confidencePolicyVersion ?? undefined,
      weakThreshold: overrides.weakThreshold ?? undefined,
      strongThreshold: overrides.strongThreshold ?? undefined,
      candidateAgeMs: overrides.candidateAgeMs ?? undefined,
      recentConflictPenaltyApplied: overrides.recentConflictPenaltyApplied ?? undefined,
      staleProtectionApplied: overrides.staleProtectionApplied ?? undefined,
      focusRankingApplied: overrides.focusRankingApplied ?? undefined,
      focusRankingBoost: overrides.focusRankingBoost ?? undefined,
      focusRankingReasonCodes: overrides.focusRankingReasonCodes ?? undefined,
      focusLegalityApplied: overrides.focusLegalityApplied ?? focusFields.focusLegalityApplied,
      focusLegalityLawful: overrides.focusLegalityLawful ?? focusFields.focusLegalityLawful,
      focusLegalityPenaltyApplied: overrides.focusLegalityPenaltyApplied ?? focusFields.focusLegalityPenaltyApplied,
      focusLegalityPenalty: overrides.focusLegalityPenalty ?? focusFields.focusLegalityPenalty,
      focusLegalityReasonCodes: overrides.focusLegalityReasonCodes ?? focusFields.focusLegalityReasonCodes,
      focusLegalityCommandKind: overrides.focusLegalityCommandKind ?? focusFields.focusLegalityCommandKind,
      focusTaskMomentumApplied: overrides.focusTaskMomentumApplied ?? undefined,
      focusTaskMomentumBoost: overrides.focusTaskMomentumBoost ?? undefined,
      focusTaskMomentumPenaltyApplied: overrides.focusTaskMomentumPenaltyApplied ?? undefined,
      focusTaskMomentumPenalty: overrides.focusTaskMomentumPenalty ?? undefined,
      focusTaskMomentumReasonCodes: overrides.focusTaskMomentumReasonCodes ?? undefined,
      focusTaskMomentumMatchedSemanticAddressId: overrides.focusTaskMomentumMatchedSemanticAddressId ?? undefined,
      warmDiscardReason: overrides.warmDiscardReason ?? undefined,
      liveEvidenceOverride: overrides.liveEvidenceOverride ?? undefined,
      lookupPath: overrides.lookupPath ?? undefined,
      focusContextSchemaVersion: focusFields.focusContextSchemaVersion,
      focusContextEligible: focusFields.focusContextEligible,
      focusSnapshotFresh: focusFields.focusSnapshotFresh,
      focusAuthorityType: focusFields.focusAuthorityType,
      focusAppId: focusFields.focusAppId,
      focusWindowId: focusFields.focusWindowId,
      focusRegionId: focusFields.focusRegionId,
      focusSubregionId: focusFields.focusSubregionId,
      focusControlId: focusFields.focusControlId,
      focusHasSelection: focusFields.focusHasSelection,
      focusSelectionTextLength: focusFields.focusSelectionTextLength,
      focusCaretOffset: focusFields.focusCaretOffset,
      focusSnapshotAgeMs: focusFields.focusSnapshotAgeMs,
      focusConfidence: focusFields.focusConfidence,
      focusRecentDeltaCount: focusFields.focusRecentDeltaCount,
      focusRecentTaskHistoryCount: focusFields.focusRecentTaskHistoryCount,
      focusDeicticResolutionEligible: focusFields.focusDeicticResolutionEligible,
      focusRankingEligible: focusFields.focusRankingEligible,
      focusLegalityEligible: focusFields.focusLegalityEligible,
      focusReasonCodes: focusFields.focusReasonCodes,
      atlasShardPolicyVersion: atlasShardFields.atlasShardPolicyVersion,
      atlasShardHintId: atlasShardFields.atlasShardHintId,
      atlasShardHintEligible: atlasShardFields.atlasShardHintEligible,
      atlasShardHintSource: atlasShardFields.atlasShardHintSource,
      atlasShardHintPriority: atlasShardFields.atlasShardHintPriority,
      atlasShardReasonCodes: atlasShardFields.atlasShardReasonCodes,
      atlasShardRankingApplied: overrides.atlasShardRankingApplied ?? undefined,
      atlasShardRankingBoost: overrides.atlasShardRankingBoost ?? undefined,
      atlasShardRankingReasonCodes: overrides.atlasShardRankingReasonCodes ?? undefined,
      atlasShardRankingCandidateKind: overrides.atlasShardRankingCandidateKind ?? undefined,
      atlasShardNarrowingApplied: overrides.atlasShardNarrowingApplied ?? undefined,
      atlasShardNarrowingFallbackUsed: overrides.atlasShardNarrowingFallbackUsed ?? undefined,
      atlasShardNarrowingCandidateCountBefore: overrides.atlasShardNarrowingCandidateCountBefore ?? undefined,
      atlasShardNarrowingCandidateCountAfter: overrides.atlasShardNarrowingCandidateCountAfter ?? undefined,
      atlasShardNarrowingReasonCodes: overrides.atlasShardNarrowingReasonCodes ?? undefined,
      atlasShardNarrowingAllowedCandidateKinds: overrides.atlasShardNarrowingAllowedCandidateKinds ?? undefined,
      multiResolutionAtlasSchemaVersion:
        overrides.multiResolutionAtlasSchemaVersion ?? multiResolutionAtlasFields.multiResolutionAtlasSchemaVersion,
      multiResolutionAtlasPolicyVersion:
        overrides.multiResolutionAtlasPolicyVersion ?? multiResolutionAtlasFields.multiResolutionAtlasPolicyVersion,
      multiResolutionAtlasEligible:
        overrides.multiResolutionAtlasEligible ?? multiResolutionAtlasFields.multiResolutionAtlasEligible,
      multiResolutionAtlasCoarseRegionId:
        overrides.multiResolutionAtlasCoarseRegionId ?? multiResolutionAtlasFields.multiResolutionAtlasCoarseRegionId,
      multiResolutionAtlasFamilyAtlasId:
        overrides.multiResolutionAtlasFamilyAtlasId ?? multiResolutionAtlasFields.multiResolutionAtlasFamilyAtlasId,
      multiResolutionAtlasPrefixBandId:
        overrides.multiResolutionAtlasPrefixBandId ?? multiResolutionAtlasFields.multiResolutionAtlasPrefixBandId,
      multiResolutionAtlasTailStrategyId:
        overrides.multiResolutionAtlasTailStrategyId ?? multiResolutionAtlasFields.multiResolutionAtlasTailStrategyId,
      multiResolutionAtlasSource:
        overrides.multiResolutionAtlasSource ?? multiResolutionAtlasFields.multiResolutionAtlasSource,
      multiResolutionAtlasReasonCodes:
        overrides.multiResolutionAtlasReasonCodes ?? multiResolutionAtlasFields.multiResolutionAtlasReasonCodes,
      multiResolutionAtlasFamilyRoutingApplied:
        overrides.multiResolutionAtlasFamilyRoutingApplied ?? undefined,
      multiResolutionAtlasFamilyRoutingBoost:
        overrides.multiResolutionAtlasFamilyRoutingBoost ?? undefined,
      multiResolutionAtlasFamilyRoutingReasonCodes:
        overrides.multiResolutionAtlasFamilyRoutingReasonCodes ?? undefined,
      multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId:
        overrides.multiResolutionAtlasFamilyRoutingMatchedFamilyAtlasId ?? undefined,
      multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId:
        overrides.multiResolutionAtlasFamilyRoutingCandidateFamilyAtlasId ?? undefined,
      multiResolutionAtlasPrefixBandRoutingApplied:
        overrides.multiResolutionAtlasPrefixBandRoutingApplied ?? undefined,
      multiResolutionAtlasPrefixBandRoutingBoost:
        overrides.multiResolutionAtlasPrefixBandRoutingBoost ?? undefined,
      multiResolutionAtlasPrefixBandRoutingReasonCodes:
        overrides.multiResolutionAtlasPrefixBandRoutingReasonCodes ?? undefined,
      multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId:
        overrides.multiResolutionAtlasPrefixBandRoutingMatchedPrefixBandId ?? undefined,
      multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId:
        overrides.multiResolutionAtlasPrefixBandRoutingCandidatePrefixBandId ?? undefined,
      multiResolutionAtlasTailStrategyRoutingApplied:
        overrides.multiResolutionAtlasTailStrategyRoutingApplied ?? undefined,
      multiResolutionAtlasTailStrategyRoutingBoost:
        overrides.multiResolutionAtlasTailStrategyRoutingBoost ?? undefined,
      multiResolutionAtlasTailStrategyRoutingReasonCodes:
        overrides.multiResolutionAtlasTailStrategyRoutingReasonCodes ?? undefined,
      multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId:
        overrides.multiResolutionAtlasTailStrategyRoutingMatchedTailStrategyId ?? undefined,

      dynamicPrecisionSchemaVersion:
        overrides.dynamicPrecisionSchemaVersion ?? dynamicPrecisionFields.dynamicPrecisionSchemaVersion,
      dynamicPrecisionPolicyVersion:
        overrides.dynamicPrecisionPolicyVersion ?? dynamicPrecisionFields.dynamicPrecisionPolicyVersion,
      dynamicPrecisionEscalationPilotVersion:
        overrides.dynamicPrecisionEscalationPilotVersion ?? dynamicPrecisionFields.dynamicPrecisionEscalationPilotVersion,
      dynamicPrecisionFamilySwitchingVersion:
        overrides.dynamicPrecisionFamilySwitchingVersion ?? dynamicPrecisionFields.dynamicPrecisionFamilySwitchingVersion,
      dynamicPrecisionHysteresisVersion:
        overrides.dynamicPrecisionHysteresisVersion ?? dynamicPrecisionFields.dynamicPrecisionHysteresisVersion,
      dynamicPrecisionEligible:
        overrides.dynamicPrecisionEligible ?? dynamicPrecisionFields.dynamicPrecisionEligible,
      dynamicPrecisionObservedFamily:
        overrides.dynamicPrecisionObservedFamily ?? dynamicPrecisionFields.dynamicPrecisionObservedFamily,
      dynamicPrecisionBaselineRegime:
        overrides.dynamicPrecisionBaselineRegime ?? dynamicPrecisionFields.dynamicPrecisionBaselineRegime,
      dynamicPrecisionSuggestedRegime:
        overrides.dynamicPrecisionSuggestedRegime ?? dynamicPrecisionFields.dynamicPrecisionSuggestedRegime,
      dynamicPrecisionCurrentRegime:
        overrides.dynamicPrecisionCurrentRegime ?? dynamicPrecisionFields.dynamicPrecisionCurrentRegime,
      dynamicPrecisionProposedRegime:
        overrides.dynamicPrecisionProposedRegime ?? dynamicPrecisionFields.dynamicPrecisionProposedRegime,
      dynamicPrecisionEscalationEligible:
        overrides.dynamicPrecisionEscalationEligible ?? dynamicPrecisionFields.dynamicPrecisionEscalationEligible,
      dynamicPrecisionEscalationSuggested:
        overrides.dynamicPrecisionEscalationSuggested ?? dynamicPrecisionFields.dynamicPrecisionEscalationSuggested,
      dynamicPrecisionDeescalationEligible:
        overrides.dynamicPrecisionDeescalationEligible ?? dynamicPrecisionFields.dynamicPrecisionDeescalationEligible,
      dynamicPrecisionDeescalationSuggested:
        overrides.dynamicPrecisionDeescalationSuggested ?? dynamicPrecisionFields.dynamicPrecisionDeescalationSuggested,
      dynamicPrecisionObservedAmbiguityBand:
        overrides.dynamicPrecisionObservedAmbiguityBand ?? dynamicPrecisionFields.dynamicPrecisionObservedAmbiguityBand,
      dynamicPrecisionObservedRepairWindowOpen:
        overrides.dynamicPrecisionObservedRepairWindowOpen ?? dynamicPrecisionFields.dynamicPrecisionObservedRepairWindowOpen,
      dynamicPrecisionObservedStressBand:
        overrides.dynamicPrecisionObservedStressBand ?? dynamicPrecisionFields.dynamicPrecisionObservedStressBand,
      dynamicPrecisionObservedGuardrailSuggested:
        overrides.dynamicPrecisionObservedGuardrailSuggested ?? dynamicPrecisionFields.dynamicPrecisionObservedGuardrailSuggested,
      dynamicPrecisionObservedGuardrailKind:
        overrides.dynamicPrecisionObservedGuardrailKind ?? dynamicPrecisionFields.dynamicPrecisionObservedGuardrailKind,
      dynamicPrecisionSource:
        overrides.dynamicPrecisionSource ?? dynamicPrecisionFields.dynamicPrecisionSource,
      dynamicPrecisionFamilyPolicyId:
        overrides.dynamicPrecisionFamilyPolicyId ?? dynamicPrecisionFields.dynamicPrecisionFamilyPolicyId,
      dynamicPrecisionHysteresisState:
        overrides.dynamicPrecisionHysteresisState ?? dynamicPrecisionFields.dynamicPrecisionHysteresisState,
      dynamicPrecisionStabilityTickCount:
        overrides.dynamicPrecisionStabilityTickCount ?? dynamicPrecisionFields.dynamicPrecisionStabilityTickCount,
      dynamicPrecisionCooldownTicksRemaining:
        overrides.dynamicPrecisionCooldownTicksRemaining ?? dynamicPrecisionFields.dynamicPrecisionCooldownTicksRemaining,
      dynamicPrecisionTransitionAllowed:
        overrides.dynamicPrecisionTransitionAllowed ?? dynamicPrecisionFields.dynamicPrecisionTransitionAllowed,
      dynamicPrecisionTransitionDecision:
        overrides.dynamicPrecisionTransitionDecision ?? dynamicPrecisionFields.dynamicPrecisionTransitionDecision,
      dynamicPrecisionActiveRegime:
        overrides.dynamicPrecisionActiveRegime ?? dynamicPrecisionFields.dynamicPrecisionActiveRegime,
      dynamicPrecisionSwitchApplied:
        overrides.dynamicPrecisionSwitchApplied ?? dynamicPrecisionFields.dynamicPrecisionSwitchApplied,
      dynamicPrecisionStrategyProfileId:
        overrides.dynamicPrecisionStrategyProfileId ?? dynamicPrecisionFields.dynamicPrecisionStrategyProfileId,
      dynamicPrecisionReasonCodes:
        overrides.dynamicPrecisionReasonCodes ?? dynamicPrecisionFields.dynamicPrecisionReasonCodes,
      workflowMemorySchemaVersion:
        overrides.workflowMemorySchemaVersion ?? workflowMemoryFields.workflowMemorySchemaVersion,
      workflowMemoryPolicyVersion:
        overrides.workflowMemoryPolicyVersion ?? workflowMemoryFields.workflowMemoryPolicyVersion,
      workflowMemoryEligible:
        overrides.workflowMemoryEligible ?? workflowMemoryFields.workflowMemoryEligible,
      workflowMemoryCurrentSemanticAddressId:
        overrides.workflowMemoryCurrentSemanticAddressId ?? workflowMemoryFields.workflowMemoryCurrentSemanticAddressId,
      workflowMemoryPreviousSemanticAddressId:
        overrides.workflowMemoryPreviousSemanticAddressId ?? workflowMemoryFields.workflowMemoryPreviousSemanticAddressId,
      workflowMemoryTransitionObserved:
        overrides.workflowMemoryTransitionObserved ?? workflowMemoryFields.workflowMemoryTransitionObserved,
      workflowMemoryTransitionKey:
        overrides.workflowMemoryTransitionKey ?? workflowMemoryFields.workflowMemoryTransitionKey,
      workflowMemoryTransitionSeenBefore:
        overrides.workflowMemoryTransitionSeenBefore ?? workflowMemoryFields.workflowMemoryTransitionSeenBefore,
      workflowMemoryTransitionCount:
        overrides.workflowMemoryTransitionCount ?? workflowMemoryFields.workflowMemoryTransitionCount,
      workflowMemorySequenceLength:
        overrides.workflowMemorySequenceLength ?? workflowMemoryFields.workflowMemorySequenceLength,
      workflowMemoryRepeatDetected:
        overrides.workflowMemoryRepeatDetected ?? workflowMemoryFields.workflowMemoryRepeatDetected,
      workflowMemoryRepeatCount:
        overrides.workflowMemoryRepeatCount ?? workflowMemoryFields.workflowMemoryRepeatCount,
      workflowMemoryContinuationSuggested:
        overrides.workflowMemoryContinuationSuggested ?? workflowMemoryFields.workflowMemoryContinuationSuggested,
      workflowMemoryGovernedStateUpdated:
        overrides.workflowMemoryGovernedStateUpdated ?? workflowMemoryFields.workflowMemoryGovernedStateUpdated,
      workflowMemorySource:
        overrides.workflowMemorySource ?? workflowMemoryFields.workflowMemorySource,
      workflowMemoryReasonCodes:
        overrides.workflowMemoryReasonCodes ?? workflowMemoryFields.workflowMemoryReasonCodes,
      workflowMemoryRankingVersion:
        overrides.workflowMemoryRankingVersion ?? workflowMemoryRankingFields.workflowMemoryRankingVersion,
      workflowMemoryRankingEligible:
        overrides.workflowMemoryRankingEligible ?? workflowMemoryRankingFields.workflowMemoryRankingEligible,
      workflowMemoryRankingApplied:
        overrides.workflowMemoryRankingApplied ?? workflowMemoryRankingFields.workflowMemoryRankingApplied,
      workflowMemoryRankingBoost:
        overrides.workflowMemoryRankingBoost ?? workflowMemoryRankingFields.workflowMemoryRankingBoost,
      workflowMemoryRankingPreviousSemanticAddressId:
        overrides.workflowMemoryRankingPreviousSemanticAddressId ?? workflowMemoryRankingFields.workflowMemoryRankingPreviousSemanticAddressId,
      workflowMemoryRankingCandidateSemanticAddressId:
        overrides.workflowMemoryRankingCandidateSemanticAddressId ?? workflowMemoryRankingFields.workflowMemoryRankingCandidateSemanticAddressId,
      workflowMemoryRankingMatchedTransitionKey:
        overrides.workflowMemoryRankingMatchedTransitionKey ?? workflowMemoryRankingFields.workflowMemoryRankingMatchedTransitionKey,
      workflowMemoryRankingTransitionCount:
        overrides.workflowMemoryRankingTransitionCount ?? workflowMemoryRankingFields.workflowMemoryRankingTransitionCount,
      workflowMemoryRankingSeenBefore:
        overrides.workflowMemoryRankingSeenBefore ?? workflowMemoryRankingFields.workflowMemoryRankingSeenBefore,
      workflowMemoryRankingSource:
        overrides.workflowMemoryRankingSource ?? workflowMemoryRankingFields.workflowMemoryRankingSource,
      workflowMemoryRankingReasonCodes:
        overrides.workflowMemoryRankingReasonCodes ?? workflowMemoryRankingFields.workflowMemoryRankingReasonCodes,
      workflowMemoryOrderingVersion:
        overrides.workflowMemoryOrderingVersion ?? workflowMemoryOrderingFields.workflowMemoryOrderingVersion,
      workflowMemoryOrderingEligible:
        overrides.workflowMemoryOrderingEligible ?? workflowMemoryOrderingFields.workflowMemoryOrderingEligible,
      workflowMemoryOrderingApplied:
        overrides.workflowMemoryOrderingApplied ?? workflowMemoryOrderingFields.workflowMemoryOrderingApplied,
      workflowMemoryOrderingBaseScore:
        overrides.workflowMemoryOrderingBaseScore ?? workflowMemoryOrderingFields.workflowMemoryOrderingBaseScore,
      workflowMemoryOrderingAdjustedScore:
        overrides.workflowMemoryOrderingAdjustedScore ?? workflowMemoryOrderingFields.workflowMemoryOrderingAdjustedScore,
      workflowMemoryOrderingBoost:
        overrides.workflowMemoryOrderingBoost ?? workflowMemoryOrderingFields.workflowMemoryOrderingBoost,
      workflowMemoryOrderingPreviousSemanticAddressId:
        overrides.workflowMemoryOrderingPreviousSemanticAddressId ?? workflowMemoryOrderingFields.workflowMemoryOrderingPreviousSemanticAddressId,
      workflowMemoryOrderingCandidateSemanticAddressId:
        overrides.workflowMemoryOrderingCandidateSemanticAddressId ?? workflowMemoryOrderingFields.workflowMemoryOrderingCandidateSemanticAddressId,
      workflowMemoryOrderingMatchedTransitionKey:
        overrides.workflowMemoryOrderingMatchedTransitionKey ?? workflowMemoryOrderingFields.workflowMemoryOrderingMatchedTransitionKey,
      workflowMemoryOrderingTransitionCount:
        overrides.workflowMemoryOrderingTransitionCount ?? workflowMemoryOrderingFields.workflowMemoryOrderingTransitionCount,
      workflowMemoryOrderingSource:
        overrides.workflowMemoryOrderingSource ?? workflowMemoryOrderingFields.workflowMemoryOrderingSource,
      workflowMemoryOrderingReasonCodes:
        overrides.workflowMemoryOrderingReasonCodes ?? workflowMemoryOrderingFields.workflowMemoryOrderingReasonCodes,
      workflowMemoryCandidatePoolOrderingVersion:
        overrides.workflowMemoryCandidatePoolOrderingVersion ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingVersion,
      workflowMemoryCandidatePoolOrderingEligible:
        overrides.workflowMemoryCandidatePoolOrderingEligible ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingEligible,
      workflowMemoryCandidatePoolOrderingApplied:
        overrides.workflowMemoryCandidatePoolOrderingApplied ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolOrderingApplied,
      workflowMemoryCandidatePoolCandidateCountBefore:
        overrides.workflowMemoryCandidatePoolCandidateCountBefore ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolCandidateCountBefore,
      workflowMemoryCandidatePoolCandidateCountAfter:
        overrides.workflowMemoryCandidatePoolCandidateCountAfter ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolCandidateCountAfter,
      workflowMemoryCandidatePoolSemanticAddressIdsBefore:
        overrides.workflowMemoryCandidatePoolSemanticAddressIdsBefore ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolSemanticAddressIdsBefore,
      workflowMemoryCandidatePoolSemanticAddressIdsAfter:
        overrides.workflowMemoryCandidatePoolSemanticAddressIdsAfter ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolSemanticAddressIdsAfter,
      workflowMemoryCandidatePoolScoresBefore:
        overrides.workflowMemoryCandidatePoolScoresBefore ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolScoresBefore,
      workflowMemoryCandidatePoolScoresAfter:
        overrides.workflowMemoryCandidatePoolScoresAfter ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolScoresAfter,
      workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore:
        overrides.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdBefore,
      workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter:
        overrides.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateSemanticAddressIdAfter,
      workflowMemoryCandidatePoolTopCandidateScoreBefore:
        overrides.workflowMemoryCandidatePoolTopCandidateScoreBefore ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateScoreBefore,
      workflowMemoryCandidatePoolTopCandidateScoreAfter:
        overrides.workflowMemoryCandidatePoolTopCandidateScoreAfter ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolTopCandidateScoreAfter,
      workflowMemoryCandidatePoolSource:
        overrides.workflowMemoryCandidatePoolSource ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolSource,
      workflowMemoryCandidatePoolReasonCodes:
        overrides.workflowMemoryCandidatePoolReasonCodes ?? workflowMemoryCandidatePoolOrderingFields.workflowMemoryCandidatePoolReasonCodes,
      workflowMemoryReuseVersion:
        overrides.workflowMemoryReuseVersion ?? workflowMemoryReuseFields.workflowMemoryReuseVersion,
      workflowMemoryReuseEligible:
        overrides.workflowMemoryReuseEligible ?? workflowMemoryReuseFields.workflowMemoryReuseEligible,
      workflowMemoryReuseApplied:
        overrides.workflowMemoryReuseApplied ?? workflowMemoryReuseFields.workflowMemoryReuseApplied,
      workflowMemoryReusePatternLength:
        overrides.workflowMemoryReusePatternLength ?? workflowMemoryReuseFields.workflowMemoryReusePatternLength,
      workflowMemoryReuseMatchedSequenceSemanticAddressIds:
        overrides.workflowMemoryReuseMatchedSequenceSemanticAddressIds ?? workflowMemoryReuseFields.workflowMemoryReuseMatchedSequenceSemanticAddressIds,
      workflowMemoryReuseMatchedSequenceKey:
        overrides.workflowMemoryReuseMatchedSequenceKey ?? workflowMemoryReuseFields.workflowMemoryReuseMatchedSequenceKey,
      workflowMemoryReuseSeenBefore:
        overrides.workflowMemoryReuseSeenBefore ?? workflowMemoryReuseFields.workflowMemoryReuseSeenBefore,
      workflowMemoryReuseOccurrenceCount:
        overrides.workflowMemoryReuseOccurrenceCount ?? workflowMemoryReuseFields.workflowMemoryReuseOccurrenceCount,
      workflowMemoryReuseSuggestedNextSemanticAddressId:
        overrides.workflowMemoryReuseSuggestedNextSemanticAddressId ?? workflowMemoryReuseFields.workflowMemoryReuseSuggestedNextSemanticAddressId,
      workflowMemoryReuseSuggestedNextCount:
        overrides.workflowMemoryReuseSuggestedNextCount ?? workflowMemoryReuseFields.workflowMemoryReuseSuggestedNextCount,
      workflowMemoryReuseSource:
        overrides.workflowMemoryReuseSource ?? workflowMemoryReuseFields.workflowMemoryReuseSource,
      workflowMemoryReuseReasonCodes:
        overrides.workflowMemoryReuseReasonCodes ?? workflowMemoryReuseFields.workflowMemoryReuseReasonCodes,
      workflowCandidateDiscoverySchemaVersion:
        overrides.workflowCandidateDiscoverySchemaVersion ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoverySchemaVersion,
      workflowCandidateDiscoveryPolicyVersion:
        overrides.workflowCandidateDiscoveryPolicyVersion ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryPolicyVersion,
      workflowCandidateDiscoveryEligible:
        overrides.workflowCandidateDiscoveryEligible ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryEligible,
      workflowCandidateDiscoverySequenceSemanticAddressIds:
        overrides.workflowCandidateDiscoverySequenceSemanticAddressIds ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoverySequenceSemanticAddressIds,
      workflowCandidateDiscoveryPatternKey:
        overrides.workflowCandidateDiscoveryPatternKey ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryPatternKey,
      workflowCandidateDiscoveryOccurrenceCount:
        overrides.workflowCandidateDiscoveryOccurrenceCount ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryOccurrenceCount,
      workflowCandidateDiscoveryDistinctRunCount:
        overrides.workflowCandidateDiscoveryDistinctRunCount ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryDistinctRunCount,
      workflowCandidateDiscoverySequenceLength:
        overrides.workflowCandidateDiscoverySequenceLength ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoverySequenceLength,
      workflowCandidateDiscoveryStartBoundaryConfidence:
        overrides.workflowCandidateDiscoveryStartBoundaryConfidence ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryStartBoundaryConfidence,
      workflowCandidateDiscoveryEndBoundaryConfidence:
        overrides.workflowCandidateDiscoveryEndBoundaryConfidence ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryEndBoundaryConfidence,
      workflowCandidateDiscoveryRepeatedSubsequenceDetected:
        overrides.workflowCandidateDiscoveryRepeatedSubsequenceDetected ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryRepeatedSubsequenceDetected,
      workflowCandidateDiscoveryCandidateEmergenceThresholdMet:
        overrides.workflowCandidateDiscoveryCandidateEmergenceThresholdMet ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryCandidateEmergenceThresholdMet,
      workflowCandidateDiscoveryRediscoveryMerged:
        overrides.workflowCandidateDiscoveryRediscoveryMerged ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryRediscoveryMerged,
      workflowCandidateDiscoveryGovernedStateUpdated:
        overrides.workflowCandidateDiscoveryGovernedStateUpdated ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryGovernedStateUpdated,
      workflowCandidateDiscoverySource:
        overrides.workflowCandidateDiscoverySource ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoverySource,
      workflowCandidateDiscoveryReasonCodes:
        overrides.workflowCandidateDiscoveryReasonCodes ?? workflowCandidateDiscoveryFields.workflowCandidateDiscoveryReasonCodes,
      workflowSkeletonInferenceSchemaVersion:
        overrides.workflowSkeletonInferenceSchemaVersion ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceSchemaVersion,
      workflowSkeletonInferencePolicyVersion:
        overrides.workflowSkeletonInferencePolicyVersion ?? workflowSkeletonInferenceFields.workflowSkeletonInferencePolicyVersion,
      workflowSkeletonInferenceEligible:
        overrides.workflowSkeletonInferenceEligible ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceEligible,
      workflowSkeletonInferenceFamilyKey:
        overrides.workflowSkeletonInferenceFamilyKey ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceFamilyKey,
      workflowSkeletonInferencePatternKey:
        overrides.workflowSkeletonInferencePatternKey ?? workflowSkeletonInferenceFields.workflowSkeletonInferencePatternKey,
      workflowSkeletonInferenceCanonicalStepSemanticAddressIds:
        overrides.workflowSkeletonInferenceCanonicalStepSemanticAddressIds ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceCanonicalStepSemanticAddressIds,
      workflowSkeletonInferenceFixedStepIndices:
        overrides.workflowSkeletonInferenceFixedStepIndices ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceFixedStepIndices,
      workflowSkeletonInferenceVariableStepIndices:
        overrides.workflowSkeletonInferenceVariableStepIndices ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceVariableStepIndices,
      workflowSkeletonInferenceOptionalStepIndices:
        overrides.workflowSkeletonInferenceOptionalStepIndices ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceOptionalStepIndices,
      workflowSkeletonInferenceInferredSlotCount:
        overrides.workflowSkeletonInferenceInferredSlotCount ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceInferredSlotCount,
      workflowSkeletonInferenceGeneralizationConfidence:
        overrides.workflowSkeletonInferenceGeneralizationConfidence ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceGeneralizationConfidence,
      workflowSkeletonInferenceAbstractionEligible:
        overrides.workflowSkeletonInferenceAbstractionEligible ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceAbstractionEligible,
      workflowSkeletonInferenceFamilyVariantCount:
        overrides.workflowSkeletonInferenceFamilyVariantCount ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceFamilyVariantCount,
      workflowSkeletonInferenceFamilySplitRequired:
        overrides.workflowSkeletonInferenceFamilySplitRequired ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceFamilySplitRequired,
      workflowSkeletonInferenceGovernedStateUpdated:
        overrides.workflowSkeletonInferenceGovernedStateUpdated ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceGovernedStateUpdated,
      workflowSkeletonInferenceSource:
        overrides.workflowSkeletonInferenceSource ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceSource,
      workflowSkeletonInferenceReasonCodes:
        overrides.workflowSkeletonInferenceReasonCodes ?? workflowSkeletonInferenceFields.workflowSkeletonInferenceReasonCodes,
      workflowCandidateScoringSchemaVersion:
        overrides.workflowCandidateScoringSchemaVersion ?? workflowCandidateScoringFields.workflowCandidateScoringSchemaVersion,
      workflowCandidateScoringPolicyVersion:
        overrides.workflowCandidateScoringPolicyVersion ?? workflowCandidateScoringFields.workflowCandidateScoringPolicyVersion,
      workflowCandidateScoringEligible:
        overrides.workflowCandidateScoringEligible ?? workflowCandidateScoringFields.workflowCandidateScoringEligible,
      workflowCandidateScoreVersion:
        overrides.workflowCandidateScoreVersion ?? workflowCandidateScoringFields.workflowCandidateScoreVersion,
      workflowCandidateConfidenceScore:
        overrides.workflowCandidateConfidenceScore ?? workflowCandidateScoringFields.workflowCandidateConfidenceScore,
      workflowCandidateUtilityScore:
        overrides.workflowCandidateUtilityScore ?? workflowCandidateScoringFields.workflowCandidateUtilityScore,
      workflowCandidateCreationRiskScore:
        overrides.workflowCandidateCreationRiskScore ?? workflowCandidateScoringFields.workflowCandidateCreationRiskScore,
      workflowCandidateSuggestionPressureScore:
        overrides.workflowCandidateSuggestionPressureScore ?? workflowCandidateScoringFields.workflowCandidateSuggestionPressureScore,
      workflowCandidateTrustScore:
        overrides.workflowCandidateTrustScore ?? workflowCandidateScoringFields.workflowCandidateTrustScore,
      workflowCandidateNoveltyScore:
        overrides.workflowCandidateNoveltyScore ?? workflowCandidateScoringFields.workflowCandidateNoveltyScore,
      workflowCandidateDuplicateRiskScore:
        overrides.workflowCandidateDuplicateRiskScore ?? workflowCandidateScoringFields.workflowCandidateDuplicateRiskScore,
      workflowCandidateStructuralStabilityRisk:
        overrides.workflowCandidateStructuralStabilityRisk ?? workflowCandidateScoringFields.workflowCandidateStructuralStabilityRisk,
      workflowCandidateParameterVolatilityRisk:
        overrides.workflowCandidateParameterVolatilityRisk ?? workflowCandidateScoringFields.workflowCandidateParameterVolatilityRisk,
      workflowCandidateBoundaryClarityRisk:
        overrides.workflowCandidateBoundaryClarityRisk ?? workflowCandidateScoringFields.workflowCandidateBoundaryClarityRisk,
      workflowCandidateAbstractionRiskComponent:
        overrides.workflowCandidateAbstractionRiskComponent ?? workflowCandidateScoringFields.workflowCandidateAbstractionRiskComponent,
      workflowCandidateLatentExecutionHazardRisk:
        overrides.workflowCandidateLatentExecutionHazardRisk ?? workflowCandidateScoringFields.workflowCandidateLatentExecutionHazardRisk,
      workflowCandidateClutterRisk:
        overrides.workflowCandidateClutterRisk ?? workflowCandidateScoringFields.workflowCandidateClutterRisk,
      workflowCandidateUserMisalignmentRisk:
        overrides.workflowCandidateUserMisalignmentRisk ?? workflowCandidateScoringFields.workflowCandidateUserMisalignmentRisk,
      workflowCandidateCreationRiskBand:
        overrides.workflowCandidateCreationRiskBand ?? workflowCandidateScoringFields.workflowCandidateCreationRiskBand,
      workflowCandidateScoringSource:
        overrides.workflowCandidateScoringSource ?? workflowCandidateScoringFields.workflowCandidateScoringSource,
      workflowCandidateScoringReasonCodes:
        overrides.workflowCandidateScoringReasonCodes ?? workflowCandidateScoringFields.workflowCandidateScoringReasonCodes,
      workflowCandidateRiskReasonCodes:
        overrides.workflowCandidateRiskReasonCodes ?? workflowCandidateScoringFields.workflowCandidateRiskReasonCodes,
      counterfactualRepairSchemaVersion: overrides.counterfactualRepairSchemaVersion ?? counterfactualRepairFields.counterfactualRepairSchemaVersion,
      counterfactualRepairPolicyVersion: overrides.counterfactualRepairPolicyVersion ?? counterfactualRepairFields.counterfactualRepairPolicyVersion,
      counterfactualRepairEligible: overrides.counterfactualRepairEligible ?? counterfactualRepairFields.counterfactualRepairEligible,
      counterfactualRepairPrimarySemanticAddressId: overrides.counterfactualRepairPrimarySemanticAddressId ?? counterfactualRepairFields.counterfactualRepairPrimarySemanticAddressId,
      counterfactualRepairNearestAlternativeSemanticAddressId: overrides.counterfactualRepairNearestAlternativeSemanticAddressId ?? counterfactualRepairFields.counterfactualRepairNearestAlternativeSemanticAddressId,
      counterfactualRepairNearestAlternativeCanonicalMergedText: overrides.counterfactualRepairNearestAlternativeCanonicalMergedText ?? counterfactualRepairFields.counterfactualRepairNearestAlternativeCanonicalMergedText,
      counterfactualRepairAmbiguityBand: overrides.counterfactualRepairAmbiguityBand ?? counterfactualRepairFields.counterfactualRepairAmbiguityBand,
      counterfactualRepairRepairEligible: overrides.counterfactualRepairRepairEligible ?? counterfactualRepairFields.counterfactualRepairRepairEligible,
      counterfactualRepairRepairSignal: overrides.counterfactualRepairRepairSignal ?? counterfactualRepairFields.counterfactualRepairRepairSignal,
      counterfactualRepairSelectionFunctionVersion: overrides.counterfactualRepairSelectionFunctionVersion ?? counterfactualRepairFields.counterfactualRepairSelectionFunctionVersion,
      counterfactualRepairCandidatePopulationSize: overrides.counterfactualRepairCandidatePopulationSize ?? counterfactualRepairFields.counterfactualRepairCandidatePopulationSize,
      counterfactualRepairTopCandidateSemanticAddressIds: overrides.counterfactualRepairTopCandidateSemanticAddressIds ?? counterfactualRepairFields.counterfactualRepairTopCandidateSemanticAddressIds,
      counterfactualRepairTopCandidateNormalizedScores: overrides.counterfactualRepairTopCandidateNormalizedScores ?? counterfactualRepairFields.counterfactualRepairTopCandidateNormalizedScores,
      counterfactualRepairSelectionWinnerSemanticAddressId: overrides.counterfactualRepairSelectionWinnerSemanticAddressId ?? counterfactualRepairFields.counterfactualRepairSelectionWinnerSemanticAddressId,
      counterfactualRepairDeadDetected: overrides.counterfactualRepairDeadDetected ?? counterfactualRepairFields.counterfactualRepairDeadDetected,
      counterfactualRepairDeadReason: overrides.counterfactualRepairDeadReason ?? counterfactualRepairFields.counterfactualRepairDeadReason,
      counterfactualRepairCounterexampleCaptured: overrides.counterfactualRepairCounterexampleCaptured ?? counterfactualRepairFields.counterfactualRepairCounterexampleCaptured,
      counterfactualRepairCounterexampleKind: overrides.counterfactualRepairCounterexampleKind ?? counterfactualRepairFields.counterfactualRepairCounterexampleKind,
      counterfactualRepairAntibodyEligible: overrides.counterfactualRepairAntibodyEligible ?? counterfactualRepairFields.counterfactualRepairAntibodyEligible,
      counterfactualRepairAntibodyHint: overrides.counterfactualRepairAntibodyHint ?? counterfactualRepairFields.counterfactualRepairAntibodyHint,
      counterfactualRepairStressEvent: overrides.counterfactualRepairStressEvent ?? counterfactualRepairFields.counterfactualRepairStressEvent,
      counterfactualRepairStressBand: overrides.counterfactualRepairStressBand ?? counterfactualRepairFields.counterfactualRepairStressBand,
      counterfactualRepairOuroborosEvent: overrides.counterfactualRepairOuroborosEvent ?? counterfactualRepairFields.counterfactualRepairOuroborosEvent,
      counterfactualRepairSource: overrides.counterfactualRepairSource ?? counterfactualRepairFields.counterfactualRepairSource,
      counterfactualRepairReasonCodes: overrides.counterfactualRepairReasonCodes ?? counterfactualRepairFields.counterfactualRepairReasonCodes,
      counterfactualRepairAmbiguityPilotVersion: overrides.counterfactualRepairAmbiguityPilotVersion ?? counterfactualRepairFields.counterfactualRepairAmbiguityPilotVersion,
      counterfactualRepairAmbiguityPilotApplied: overrides.counterfactualRepairAmbiguityPilotApplied ?? counterfactualRepairFields.counterfactualRepairAmbiguityPilotApplied,
      counterfactualRepairAmbiguityPrimaryScore: overrides.counterfactualRepairAmbiguityPrimaryScore ?? counterfactualRepairFields.counterfactualRepairAmbiguityPrimaryScore,
      counterfactualRepairAmbiguityAlternativeScore: overrides.counterfactualRepairAmbiguityAlternativeScore ?? counterfactualRepairFields.counterfactualRepairAmbiguityAlternativeScore,
      counterfactualRepairAmbiguityScoreGap: overrides.counterfactualRepairAmbiguityScoreGap ?? counterfactualRepairFields.counterfactualRepairAmbiguityScoreGap,
      counterfactualRepairAmbiguityEscalationSuggested: overrides.counterfactualRepairAmbiguityEscalationSuggested ?? counterfactualRepairFields.counterfactualRepairAmbiguityEscalationSuggested,
      counterfactualRepairAmbiguityEscalationKind: overrides.counterfactualRepairAmbiguityEscalationKind ?? counterfactualRepairFields.counterfactualRepairAmbiguityEscalationKind,
      counterfactualRepairAmbiguityReasonCodes: overrides.counterfactualRepairAmbiguityReasonCodes ?? counterfactualRepairFields.counterfactualRepairAmbiguityReasonCodes,
      counterfactualRepairSignalPilotVersion: overrides.counterfactualRepairSignalPilotVersion ?? counterfactualRepairFields.counterfactualRepairSignalPilotVersion,
      counterfactualRepairSignalPilotApplied: overrides.counterfactualRepairSignalPilotApplied ?? counterfactualRepairFields.counterfactualRepairSignalPilotApplied,
      counterfactualRepairSignalTrajectoryState: overrides.counterfactualRepairSignalTrajectoryState ?? counterfactualRepairFields.counterfactualRepairSignalTrajectoryState,
      counterfactualRepairSignalAbortedTrajectoryDetected: overrides.counterfactualRepairSignalAbortedTrajectoryDetected ?? counterfactualRepairFields.counterfactualRepairSignalAbortedTrajectoryDetected,
      counterfactualRepairSignalDirectionReversalDetected: overrides.counterfactualRepairSignalDirectionReversalDetected ?? counterfactualRepairFields.counterfactualRepairSignalDirectionReversalDetected,
      counterfactualRepairSignalSelfCorrectionDetected: overrides.counterfactualRepairSignalSelfCorrectionDetected ?? counterfactualRepairFields.counterfactualRepairSignalSelfCorrectionDetected,
      counterfactualRepairSignalRepairWindowOpen: overrides.counterfactualRepairSignalRepairWindowOpen ?? counterfactualRepairFields.counterfactualRepairSignalRepairWindowOpen,
      counterfactualRepairSignalEscalationSuggested: overrides.counterfactualRepairSignalEscalationSuggested ?? counterfactualRepairFields.counterfactualRepairSignalEscalationSuggested,
      counterfactualRepairSignalEscalationKind: overrides.counterfactualRepairSignalEscalationKind ?? counterfactualRepairFields.counterfactualRepairSignalEscalationKind,
      counterfactualRepairSignalReasonCodes: overrides.counterfactualRepairSignalReasonCodes ?? counterfactualRepairFields.counterfactualRepairSignalReasonCodes,
      counterfactualRepairRankingPilotVersion: overrides.counterfactualRepairRankingPilotVersion ?? counterfactualRepairFields.counterfactualRepairRankingPilotVersion,
      counterfactualRepairRankingPilotApplied: overrides.counterfactualRepairRankingPilotApplied ?? counterfactualRepairFields.counterfactualRepairRankingPilotApplied,
      counterfactualRepairRankingPrimaryScore: overrides.counterfactualRepairRankingPrimaryScore ?? counterfactualRepairFields.counterfactualRepairRankingPrimaryScore,
      counterfactualRepairRankingAlternativeScore: overrides.counterfactualRepairRankingAlternativeScore ?? counterfactualRepairFields.counterfactualRepairRankingAlternativeScore,
      counterfactualRepairRankingScoreGap: overrides.counterfactualRepairRankingScoreGap ?? counterfactualRepairFields.counterfactualRepairRankingScoreGap,
      counterfactualRepairRankingStressAdjusted: overrides.counterfactualRepairRankingStressAdjusted ?? counterfactualRepairFields.counterfactualRepairRankingStressAdjusted,
      counterfactualRepairRankingRepairAdjusted: overrides.counterfactualRepairRankingRepairAdjusted ?? counterfactualRepairFields.counterfactualRepairRankingRepairAdjusted,
      counterfactualRepairRankingGuardrailSuggested: overrides.counterfactualRepairRankingGuardrailSuggested ?? counterfactualRepairFields.counterfactualRepairRankingGuardrailSuggested,
      counterfactualRepairRankingGuardrailKind: overrides.counterfactualRepairRankingGuardrailKind ?? counterfactualRepairFields.counterfactualRepairRankingGuardrailKind,
      counterfactualRepairRankingReasonCodes: overrides.counterfactualRepairRankingReasonCodes ?? counterfactualRepairFields.counterfactualRepairRankingReasonCodes,
      counterfactualRepairCounterexampleFormatVersion: overrides.counterfactualRepairCounterexampleFormatVersion ?? counterfactualRepairFields.counterfactualRepairCounterexampleFormatVersion,
      counterfactualRepairAntibodyPilotVersion: overrides.counterfactualRepairAntibodyPilotVersion ?? counterfactualRepairFields.counterfactualRepairAntibodyPilotVersion,
      counterfactualRepairAntibodyPilotApplied: overrides.counterfactualRepairAntibodyPilotApplied ?? counterfactualRepairFields.counterfactualRepairAntibodyPilotApplied,
      counterfactualRepairCounterexampleEventClass: overrides.counterfactualRepairCounterexampleEventClass ?? counterfactualRepairFields.counterfactualRepairCounterexampleEventClass,
      counterfactualRepairCounterexampleSignature: overrides.counterfactualRepairCounterexampleSignature ?? counterfactualRepairFields.counterfactualRepairCounterexampleSignature,
      counterfactualRepairCounterexampleTranscriptDigest: overrides.counterfactualRepairCounterexampleTranscriptDigest ?? counterfactualRepairFields.counterfactualRepairCounterexampleTranscriptDigest,
      counterfactualRepairAntibodyMintSuggested: overrides.counterfactualRepairAntibodyMintSuggested ?? counterfactualRepairFields.counterfactualRepairAntibodyMintSuggested,
      counterfactualRepairAntibodyMintKey: overrides.counterfactualRepairAntibodyMintKey ?? counterfactualRepairFields.counterfactualRepairAntibodyMintKey,
      counterfactualRepairAntibodyQuarantineSuggested: overrides.counterfactualRepairAntibodyQuarantineSuggested ?? counterfactualRepairFields.counterfactualRepairAntibodyQuarantineSuggested,
      counterfactualRepairAntibodyQuarantineBand: overrides.counterfactualRepairAntibodyQuarantineBand ?? counterfactualRepairFields.counterfactualRepairAntibodyQuarantineBand,
      counterfactualRepairAntibodyValidationGateHint: overrides.counterfactualRepairAntibodyValidationGateHint ?? counterfactualRepairFields.counterfactualRepairAntibodyValidationGateHint,
      counterfactualRepairAntibodyPilotReasonCodes: overrides.counterfactualRepairAntibodyPilotReasonCodes ?? counterfactualRepairFields.counterfactualRepairAntibodyPilotReasonCodes,
      multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId:
        overrides.multiResolutionAtlasTailStrategyRoutingCandidateTailStrategyId ?? undefined,
    });

    if (decision?.granted && typeof overrides.semanticAddressId === "string" && overrides.semanticAddressId.length > 0) {
      this.updateWorkflowReuseHistory(overrides.semanticAddressId);
    }
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
      this.chunkH3FocusContextEnvelope.delete(chunk.id);
      this.chunkH3AtlasShardHint.delete(chunk.id);
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
    this.chunkH3FocusContextEnvelope.delete(id);
    this.chunkH3AtlasShardHint.delete(id);
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
    this.chunkH3FocusContextEnvelope.clear();
    this.chunkH3AtlasShardHint.clear();
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
