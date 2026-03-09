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
import STTTracking, { ChunkMetrics } from "../stt/tracking";
import { core } from "../../gen/core";
import { commandTypeToString, isMetaResponse, isValidAlternative } from "../../shared/alternatives";
import STTComparator from "../stt/comparator";
import TrafficRouter, { RoutingDecision, RoutingPath } from "../stt/traffic-router";

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
  private busClient: any = null;
  private sessionStartTime: number = 0;
  private audioSequenceNumber: number = 0;
  private comparator?: STTComparator;
  private trafficRouter?: TrafficRouter;
  private currentRoutingDecision?: RoutingDecision;
  private busResponseLatency?: number;
  private websocketResponseLatency?: number;

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
    private tracking: STTTracking
  ) {
    // Lazy load bus client to avoid circular dependencies
  }

  /**
   * Set the Bus client for shadow publishing
   */
  setBusClient(busClient: any) {
    this.busClient = busClient;
    if (busClient && busClient.isEnabled()) {
      busClient.connect();
    }
  }

  /**
   * Set the comparator for WebSocket vs Bus comparison
   */
  setComparator(comparator: STTComparator) {
    this.comparator = comparator;
    if (this.comparator && this.busClient && this.busClient.isEnabled()) {
      // Register callback to receive Bus responses for comparison
      this.busClient.registerTranscriptCallback(
        (
          sessionId: string,
          chunkId: string,
          alternatives: any[],
          latencyMs: number,
          isFinal: boolean
        ) => {
          if (this.comparator?.isEnabled()) {
            this.comparator.storeBusResponse(
              sessionId,
              chunkId,
              alternatives,
              latencyMs,
              isFinal
            );
          }
        }
      );
    }
  }

  /**
   * Set the traffic router for cutover routing
   */
  setTrafficRouter(router: TrafficRouter) {
    this.trafficRouter = router;
    this.log.logVerbose("[ChunkManager] Traffic router configured");
  }

  /**
   * Get current routing decision
   */
  getCurrentRoutingDecision(): RoutingDecision | undefined {
    return this.currentRoutingDecision;
  }

  /**
   * Route session to either WebSocket or Bus based on traffic router
   */
  private routeSession(sessionId: string): RoutingPath {
    if (!this.trafficRouter || !this.trafficRouter.isEnabled()) {
      return "websocket";
    }

    // Check if Bus is healthy
    if (!this.trafficRouter.isBusHealthy()) {
      return "websocket";
    }

    // Get routing decision
    const decision = this.trafficRouter.route(sessionId);
    this.currentRoutingDecision = decision;

    this.log.logVerbose(
      `[ChunkManager] Session ${sessionId.substring(0, 8)} routed to: ${decision.path}`
    );

    // Enable execution mode on Bus client if routed to bus
    if (decision.path === "bus" && this.busClient) {
      this.busClient.setExecutionMode(true, this.handleBusResponse.bind(this));
    } else if (this.busClient) {
      this.busClient.setExecutionMode(false);
    }

    return decision.path;
  }

  /**
   * Handle response from Bus (execution mode)
   */
  private handleBusResponse(
    sessionId: string,
    chunkId: string,
    alternatives: any[],
    latencyMs: number,
    isFinal: boolean
  ) {
    this.busResponseLatency = latencyMs;
    
    // Record metrics for the Bus path
    if (this.trafficRouter && this.currentRoutingDecision?.path === "bus") {
      this.trafficRouter.recordSessionResult(
        sessionId,
        "bus",
        true, // success - we received a response
        latencyMs,
        this.websocketResponseLatency,
        undefined // matched - comparison handled separately
      );
    }
  }

  /**
   * Check if should route to Bus for current session
   */
  private shouldUseBusPath(): boolean {
    return this.currentRoutingDecision?.path === "bus" && this.busClient?.isConnected();
  }

  /**
   * Publish an STT envelope to the Bus if enabled
   */
  private publishToBus(envelopeType: string, ...args: any[]) {
    if (!this.busClient || !this.busClient.isEnabled() || !this.tracking.getCurrentSessionId()) {
      return;
    }

    try {
      const sessionId = this.tracking.getCurrentSessionId()!;
      const chunk = this.chunkQueue.getIndex(0);
      const chunkId = chunk?.id || uuid();

      switch (envelopeType) {
        case "session_start":
          this.busClient.publishSessionStart(
            sessionId,
            chunkId,
            "en-US", // TODO: Get actual language
            this.settings.getStreamingEndpoint()?.id || "default"
          );
          break;
        case "audio_append":
          this.busClient.publishAudioAppend(
            sessionId,
            chunkId,
            args[0], // audioData
            args[1], // sequenceNumber
            args[2]  // timestampMs
          );
          break;
        case "endpoint_request":
          this.busClient.publishEndpointRequest(
            sessionId,
            chunkId,
            args[0], // finalize
            args[1]  // endpointType
          );
          break;
        case "transcript_partial":
          this.busClient.publishTranscriptPartial(
            sessionId,
            chunkId,
            args[0], // alternatives
            args[1], // latencyMs
            args[2], // silenceThreshold
            args[3], // modelId
            args[4]  // redactionApplied
          );
          break;
        case "transcript_final":
          this.busClient.publishTranscriptFinal(
            sessionId,
            chunkId,
            args[0], // alternatives
            args[1], // latencyMs
            args[2], // silenceThreshold
            args[3], // modelId
            args[4]  // redactionApplied
          );
          break;
        case "session_stop":
          this.busClient.publishSessionStop(
            sessionId,
            args[0], // chunkId
            args[1], // reason
            args[2]  // durationMs
          );
          break;
      }
    } catch (error) {
      this.log.logVerbose(`[ChunkManager] Bus publish error: ${error}`);
    }
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
      session_id: this.tracking.getCurrentSessionId(),
      chunk_id: response.chunkId,
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
    if (this.chunkQueue.size() == 0) {
      this.log.logVerbose(`Attempt to evaluate chunk, but empty chunk queue`);
      return;
    }

    const current = this.chunkQueue.getIndex(0);
    this.log.logVerbose(
      `Attempt to evaluate chunk\n  chunk.id: ${chunk.id}\n  chunk.executed: ${
        chunk.executed
      }\n  chunk.reverted: ${
        chunk.reverted
      }\n  chunk.response: ${!!chunk.response}\n  chunk.silence: ${
        chunk.silence
      } (${this.reachedSilenceThreshold(chunk)})\n  current.id: ${
        current.id
      }\n  current.audioSize: ${current.audioSize}`
    );

    if (!chunk.reverted && chunk.executed) {
      this.log.logVerbose(`Not executing chunk ${chunk.id}: already executed`);
      return;
    }

    if (chunk.id != current.id) {
      this.log.logVerbose(`Not executing chunk ${chunk.id}: new chunk started`);
      return;
    }

    if (!chunk.reverted && !chunk.response) {
      this.log.logVerbose(`Not executing chunk ${chunk.id}: no final response yet`);
      return;
    }

    if (chunk.reverted && !chunk.revertedResponse) {
      this.log.logVerbose(`Not executing chunk ${chunk.id}: no reverted response yet`);
      return;
    }

    if (!this.reachedSilenceThreshold(chunk)) {
      this.log.logVerbose(`Not executing chunk ${chunk.id}: waiting for silence`);
      return;
    }

    // nothing to execute means noise, so send an initialize request
    if (
      !chunk.reverted &&
      chunk.response &&
      (!chunk.response.alternatives || chunk.response.alternatives.length == 0) &&
      !chunk.response.execute
    ) {
      this.log.logVerbose(`Not executing chunk ${chunk.id}: no alternatives or execute`);
      this.deadlineToMakeNewInitializeRequest =
        chunk.audioSize < this.audioSizeForDelayedInitialize
          ? Date.now() + this.timeToWaitBeforeClassifyingAsNoise
          : 0;
      return;
    }

    if (chunk.response && chunk.response.final && this.shouldAppendToPrevious(chunk.response)) {
      this.log.logVerbose(`Appending to previous ${chunk.id}`);
      chunk.reverted = Date.now();
      chunk.executed = 0;
      chunk.silence = 0;
      this.stream.sendAppendToPreviousRequest();
      this.enqueue({ requestType: "endpoint", chunkId: chunk.id, finalize: true });
      return;
    }

    this.log.logVerbose(`Setting partial to false`);
    this.bridge.setState(
      {
        partial: false,
      },
      [this.mainWindow, this.miniModeWindow]
    );

    this.log.logVerbose(`Executing chunk ${chunk.id}`);
    this.deadlineToMakeNewInitializeRequest = 0;
    chunk.executed = Date.now();
    
    // Track execution
    this.tracking.onExecuted(chunk.id);
    
    this.startBuffering();
    await this.executor.execute(this.getResponse(chunk));
    await this.stopBufferingAndFlush();
  }

  async onCommandsResponse(response: core.ICommandsResponse) {
    const chunk = this.chunkQueue.getChunk(response.chunkId!);
    if (!chunk) {
      this.log.logVerbose(`No chunk found for ${response.chunkId!}`);
      return;
    }

    this.log.logVerbose(
      `Received ${response.final ? "final" : "partial"} response for ${chunk.id}: [${(
        response.alternatives || []
      )
        .map((e: any) => e.transcript)
        .join(", ")}]`
    );

    // Track response latency
    if (response.final) {
      this.tracking.onFinalResponse(chunk.id);
      this.tracking.logLatencyMetrics(chunk.id);
      
      // Track WebSocket latency for comparison with Bus
      this.websocketResponseLatency = metrics?.received_at ? Date.now() - metrics.received_at : 0;
    } else {
      this.tracking.onPartialResponse(chunk.id);
    }

    // Store WebSocket response for comparison with Bus
    if (this.comparator?.isEnabled()) {
      const sessionId = this.tracking.getCurrentSessionId();
      if (sessionId) {
        this.comparator.storeWebSocketResponse(
          sessionId,
          chunk.id,
          alternatives,
          latencyMs,
          response.final
        );
      }
    }

    // Publish to Arqon Bus (shadow publish)
    const metrics = this.tracking.getChunkMetrics(chunk.id);
    const latencyMs = metrics?.received_at ? Date.now() - metrics.received_at : 0;
    const silenceThreshold = response.silenceThreshold || 0.3;
    const modelId = this.settings.getStreamingEndpoint()?.id || "default";
    
    const alternatives = (response.alternatives || []).map((alt, index) => ({
      transcript: alt.transcript || "",
      rank: index,
      score: alt.confidence || 0,
      is_final: response.final || false,
    }));
    
    if (response.final) {
      this.publishToBus("transcript_final", alternatives, latencyMs, silenceThreshold, modelId, false);
    } else {
      this.publishToBus("transcript_partial", alternatives, latencyMs, silenceThreshold, modelId, false);
    }

    if (response.final) {
      response = await this.executor.postProcessResponse(response);
      if (chunk.reverted) {
        chunk.revertedResponse = response;
      } else {
        chunk.response = response;
      }
    }

    if (!this.shouldAppendToPrevious(response)) {
      const partial = !chunk.executed && (!response.final || !this.reachedSilenceThreshold(chunk));
      if (!isMetaResponse(response) && response.alternatives && response.alternatives.length > 0) {
        this.log.logVerbose(`Setting partial = ${partial}`);
        this.bridge.setState(
          {
            partial,
          },
          [this.mainWindow, this.miniModeWindow]
        );

        if (partial) {
          response = this.executor.truncateAlternativesIfNeeded(response);
          this.executor.showAlternativesIfPresent(response);
        }
      }
    }

    await this.logResponse(response);
    if (response.final) {
      await this.attemptToEvaluateChunk(chunk);
    }
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

      // Publish audio to Bus (shadow publish)
      this.publishToBus("audio_append", Buffer.from(audio.buffer), this.audioSequenceNumber++, Date.now());

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
    
    // Publish endpoint request to Bus (shadow publish)
    this.publishToBus("endpoint_request", true, "force_final");
    
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

    // Reset audio sequence number for new chunk
    this.audioSequenceNumber = 0;

    // Publish session start to Bus (shadow publish)
    if (this.tracking.getCurrentSessionId()) {
      this.publishToBus("session_start");
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

  async toggle(listening?: boolean) {
    if (listening === undefined) {
      listening = !this.listening;
    }

    const generation = ++this.toggleGeneration;
    const requestedListening = listening;
    
    // Track session state changes for race condition detection
    if (listening !== this.listening) {
      // Check if we're toggling within a short time (potential race condition)
      const now = Date.now();
      if (this.lastToggleTime && (now - this.lastToggleTime) < 100) {
        this.tracking.onPauseResumeRace();
      }
      this.lastToggleTime = now;
    }
    
    this.listening = listening;
    
    // Start or end tracking session
    if (listening) {
      this.sessionStartTime = Date.now();
      this.tracking.startSession();
      
      // Route session to WebSocket or Bus
      const sessionId = this.tracking.getCurrentSessionId();
      if (sessionId) {
        this.routeSession(sessionId);
      }
    } else {
      // Publish session stop to Bus (shadow publish)
      const current = this.chunkQueue.getIndex(0);
      const durationMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
      if (this.tracking.getCurrentSessionId()) {
        this.publishToBus("session_stop", current?.id || "", "user_toggle", durationMs);
      }
      this.tracking.endSession();
    }
    
    this.bridge.setState(
      {
        backendIssue: "",
        listening,
        partial: false,
        speakingVolume: 0,
        suggestion: "",
        statusText: listening ? "Listening" : "Paused",
      },
      [this.mainWindow, this.miniModeWindow]
    );

    this.log.logVerbose(`Toggling listening to ${listening}`);
    setTimeout(async () => {
      if (generation != this.toggleGeneration) {
        return;
      }

      this.mainWindow.updateTray();
      if (requestedListening) {
        this.startBuffering();
        // Ensure resume always starts from a clean callback/queue state.
        this.microphone.unregister("chunk-manager");
        this.chunkQueue.clear();
        this.buffer = [];
        this.speaking = false;
        this.microphone.register("chunk-manager", (data: any) => {
          if (data.event == "chunk_start") {
            this.onChunkStart(data.audio);
          } else if (data.event == "audio") {
            this.onAudio(data.audio, data.consecutiveSilence);
          } else if (data.event == "chunk_end") {
            this.onChunkEnd();
          }
        });

        const connected = await this.stream.connect(this, this.custom, this.executor);
        if (generation != this.toggleGeneration) {
          this.microphone.unregister("chunk-manager");
          if (connected) {
            this.stream.sendDisableRequest();
            this.stream.disconnect();
          }
          return;
        }

        if (!connected) {
          this.microphone.unregister("chunk-manager");
          this.chunkQueue.clear();
          this.buffer = [];
          this.buffering = false;
          this.speaking = false;
          this.listening = false;
          this.bridge.setState(
            {
              backendIssue: this.stream.connectionError(),
              listening: false,
              speaking: false,
              statusText: "Paused",
            },
            [this.mainWindow, this.miniModeWindow]
          );
          this.mainWindow.updateTray();
          return;
        }

        console.log("[Stream] Connected for listening session");

        this.stopBufferingAndFlush();
      } else {
        this.microphone.unregister("chunk-manager");
        this.stream.sendDisableRequest();
        this.stream.disconnect();
        this.app.clearAlternativesAndShowExamples();
        this.chunkQueue.clear();
        this.deadlineToMakeNewInitializeRequest = 0;
        this.buffer = [];
        this.buffering = false;
        this.speaking = false;
        this.bridge.setState(
          {
            speaking: false,
          },
          [this.mainWindow]
        );
      }
    }, 1);
  }
}
