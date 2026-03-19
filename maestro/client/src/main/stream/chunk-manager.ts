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
import { TurnEvent } from "../audio/turn-events";

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
  private executionTrace?: ExecutionTrace;
  private listeningSessionService: ListeningSessionService;
  private listeningStateService: ListeningStateService;
  private chunkEvaluationService: ChunkEvaluationService;
  private commandResponseService: CommandResponseService;
  private sttRoutingService: STTRoutingService;
  private sttShadowPublisher: STTShadowPublisher;
  private transcriptResponseObserver: TranscriptResponseObserver;

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
      this.stream.sendAudioRequest(request.audio!, request.chunkId!);
    } else if (request.requestType == "editor") {
      await this.stream.sendEditorStateRequest();
    } else if (request.requestType == "endpoint") {
      await this.stream.sendEndpointRequest(request.chunkId!, request.finalize!);
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
        this.enqueue({ requestType: "endpoint", chunkId, finalize: true });
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
      onPredictiveTranscript: () => {},
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
  }

  onAudio(audio: any, silence: number) {
    const current = this.chunkQueue.getIndex(0);
    if (!current) {
      return;
    }
    current.silence = silence;
    if (this.speaking) {
      current.audioSize++;
      this.enqueue({ requestType: "audio", audio: Buffer.from(audio.buffer), chunkId: current.id });

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
        this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: true });
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
    this.enqueue({ requestType: "endpoint", chunkId: current.id, finalize: true });
  }

  async onChunkStart(audio: any) {
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
    this.enqueue({ requestType: "audio", audio: Buffer.from(audio.buffer), chunkId: id });
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

    const generation = ++this.toggleGeneration;
    const requestedListening = listening;
    this.lastToggleTime = this.listeningStateService.recordToggleRequest(
      listening,
      this.listening,
      this.lastToggleTime
    );
    this.listening = listening;

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
