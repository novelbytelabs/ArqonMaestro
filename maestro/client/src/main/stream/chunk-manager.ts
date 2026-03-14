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
import { generateSignatureBytes, sigBytesToU64x16 } from "../stt/cfh";
import ExecutionTrace from "../runtime/execution-trace";
import ListeningSessionService from "../runtime/listening-session-service";
import ChunkEvaluationService from "../runtime/chunk-evaluation-service";
import CommandResponseService from "../runtime/command-response-service";
import RuntimeCommandEmitter from "../runtime/runtime-command-emitter";

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
  private executionTrace?: ExecutionTrace;
  private listeningSessionService: ListeningSessionService;
  private chunkEvaluationService: ChunkEvaluationService;
  private commandResponseService: CommandResponseService;

  // Phase 3: Predictive Resolution & Presence Pulse
  private currentPredictiveAddrId?: string;
  private currentPredictiveCFHSignature?: string;
  private presencePulseInterval: number = 500; // ms
  private presencePulseTimer?: NodeJS.Timeout;
  
  // Phase 3: Throttle/Debounce for SAS Precheck
  private transcriptDebounceMs: number = 100;
  private transcriptDebounceTimer?: NodeJS.Timeout;
  private pendingTranscript?: { text: string; isFinal: boolean; chunkId: string };
  private throttleMaxRequestsPerSecond: number = 10;
  private throttleRequestTimestamps: number[] = [];
  private lastSASPrecheckResult?: { addrId: string; timestamp: number; valid: boolean };

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
    this.chunkEvaluationService = new ChunkEvaluationService({
      bridge,
      executor,
      log,
      mainWindow,
      miniModeWindow,
      stream,
      tracking,
    });
    this.commandResponseService = new CommandResponseService({
      bridge,
      commandEmitter: new RuntimeCommandEmitter(log),
      executor,
      log,
      mainWindow,
      miniModeWindow,
    });
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

  setExecutionTrace(executionTrace: ExecutionTrace) {
    this.executionTrace = executionTrace;
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
    const currentChunk = this.chunkQueue.getIndex(0);
    if (currentChunk) {
      this.executionTrace?.recordRouteChoice(currentChunk.id, decision.path, sessionId);
    }

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

  // ============================================================================
  // Phase 3: Predictive Resolution (CFH-based addr_id computation)
  // ============================================================================

  /**
   * Compute predictive addr_id from transcript text using CFH.
   * This enables O(0) routing via pre-computed semantic address.
   * 
   * @param transcript - The transcript text to compute addr_id for
   * @returns Promise<{ addrId: string, cfhSignature: string } | null>
   */
  private computeAddrIdFromTranscript(transcript: string): { addrId: string; cfhSignature: string } | null {
    if (!transcript || transcript.trim().length === 0) {
      return null;
    }

    try {
      const startTime = performance.now();
      
      // Generate CFH signature (128 bytes = 1024 bits)
      const sigBytes = generateSignatureBytes(transcript, 128);
      const sigU64 = sigBytesToU64x16(sigBytes);
      
      // Convert signature to hex for transmission
      const cfhSignature = Array.from(sigBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Compute bucket-based addr_id from signature
      // Using first 8 bytes of signature as hex string for addr_id
      const addrId = 'addr_' + cfhSignature.substring(0, 16);
      
      const elapsed = performance.now() - startTime;
      if (elapsed > 10) {
        this.log.logVerbose(`[ChunkManager] CFH signature generation took ${elapsed.toFixed(2)}ms (exceeds 10ms threshold)`);
      }
      
      return { addrId, cfhSignature };
    } catch (error) {
      this.log.logVerbose(`[ChunkManager] Error computing addr_id: ${error}`);
      return null;
    }
  }

  /**
   * Update predictive addr_id on transcript events (partial/final).
   * This should be called whenever a new transcript is received.
   */
  private updatePredictiveAddrId(transcript: string, isFinal: boolean): void {
    const result = this.computeAddrIdFromTranscript(transcript);
    if (result) {
      this.currentPredictiveAddrId = result.addrId;
      this.currentPredictiveCFHSignature = result.cfhSignature;
      
      this.log.logVerbose(
        `[ChunkManager] Predictive addr_id updated: ${this.currentPredictiveAddrId} (final: ${isFinal})`
      );
    }
  }

  // ============================================================================
  // Phase 3: Presence Pulse (Heartbeat mechanism)
  // ============================================================================

  /**
   * Start the presence pulse heartbeat mechanism.
   * Fires heartbeats with currentPredictiveAddrId at configured interval.
   */
  private startPresencePulse(): void {
    if (this.presencePulseTimer) {
      return; // Already running
    }

    this.log.logVerbose(`[ChunkManager] Starting presence pulse with ${this.presencePulseInterval}ms interval`);
    
    this.presencePulseTimer = setInterval(() => {
      this.publishPresencePulse();
    }, this.presencePulseInterval);
  }

  /**
   * Stop the presence pulse heartbeat.
   */
  private stopPresencePulse(): void {
    if (this.presencePulseTimer) {
      clearInterval(this.presencePulseTimer);
      this.presencePulseTimer = undefined;
      this.log.logVerbose(`[ChunkManager] Stopped presence pulse`);
    }
  }

  /**
   * Publish a presence pulse (heartbeat) with currentPredictiveAddrId.
   * Non-blocking execution should complete in < 10ms.
   */
  private publishPresencePulse(): void {
    if (!this.currentPredictiveAddrId) {
      return;
    }

    const startTime = performance.now();
    
    try {
      // Publish presence pulse to bus
      if (this.busClient && this.busClient.isEnabled() && this.tracking.getCurrentSessionId()) {
        const sessionId = this.tracking.getCurrentSessionId()!;
        const chunkId = this.chunkQueue.getIndex(0)?.id || uuid();
        
        // Publish as a special presence pulse message
        this.busClient.publishPresencePulse(
          sessionId,
          chunkId,
          this.currentPredictiveAddrId,
          this.currentPredictiveCFHSignature || '',
          Date.now()
        );
      }
      
      const elapsed = performance.now() - startTime;
      if (elapsed > 10) {
        this.log.logVerbose(`[ChunkManager] Presence pulse took ${elapsed.toFixed(2)}ms (exceeds 10ms threshold)`);
      }
    } catch (error) {
      this.log.logVerbose(`[ChunkManager] Error publishing presence pulse: ${error}`);
    }
  }

  // ============================================================================
  // Phase 3: Throttle/Debounce for SAS Precheck
  // ============================================================================

  /**
   * Check if we can send a new request based on throttle limits.
   * Returns true if under the limit (10 req/s), false if throttled.
   */
  private canSendSASPrecheck(): boolean {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Remove timestamps older than 1 second
    this.throttleRequestTimestamps = this.throttleRequestTimestamps.filter(ts => ts > oneSecondAgo);
    
    // Check if under limit
    return this.throttleRequestTimestamps.length < this.throttleMaxRequestsPerSecond;
  }

  /**
   * Record a SAS precheck request for throttle tracking.
   */
  private recordSASPrecheckRequest(): void {
    this.throttleRequestTimestamps.push(Date.now());
  }

  /**
   * Debounced SAS precheck - prevents flooding with rapid transcript changes.
   * Uses 100ms debounce delay.
   */
  private scheduleSASPrecheck(transcript: string, isFinal: boolean, chunkId: string): void {
    // Store pending transcript
    this.pendingTranscript = { text: transcript, isFinal, chunkId };
    
    // Clear existing debounce timer
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
    }
    
    // Set new debounce timer
    this.transcriptDebounceTimer = setTimeout(() => {
      this.executeSASPrecheck();
    }, this.transcriptDebounceMs);
  }

  /**
   * Execute the SAS precheck if not throttled.
   * Implements fallback behavior when throttled.
   */
  private executeSASPrecheck(): void {
    if (!this.pendingTranscript) {
      return;
    }
    
    const { text, isFinal, chunkId } = this.pendingTranscript;
    this.pendingTranscript = undefined;
    
    // Check throttle limit
    if (!this.canSendSASPrecheck()) {
      this.log.logVerbose(`[ChunkManager] SAS precheck throttled, using fallback for: ${text.substring(0, 30)}...`);
      // Fallback: use cached result if recent (< 5 seconds old)
      if (this.lastSASPrecheckResult && 
          Date.now() - this.lastSASPrecheckResult.timestamp < 5000) {
        this.log.logVerbose(`[ChunkManager] Using cached SAS precheck result`);
        return;
      }
      // If no cached result, proceed anyway (fallback to compute locally)
    }
    
    // Record the request for throttle tracking
    this.recordSASPrecheckRequest();
    
    // Perform the actual SAS precheck
    // This would typically send to a precheck service
    const result = this.computeAddrIdFromTranscript(text);
    if (result) {
      this.lastSASPrecheckResult = {
        addrId: result.addrId,
        timestamp: Date.now(),
        valid: true
      };
      
      // Phase 3: Emit the Address Query (Zero-Copy routing path)
      if (this.busClient && this.busClient.isEnabled() && this.tracking.getCurrentSessionId()) {
        this.busClient.publishAddressQuery(
          this.tracking.getCurrentSessionId()!,
          chunkId,
          text,
          result.addrId,
          result.cfhSignature,
          1.0, // Precheck confidence
          isFinal
        );
      }
    }
  }

  /**
   * Clean up throttle/debounce resources.
   */
  private cleanupThrottleDebounce(): void {
    if (this.transcriptDebounceTimer) {
      clearTimeout(this.transcriptDebounceTimer);
      this.transcriptDebounceTimer = undefined;
    }
    this.pendingTranscript = undefined;
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
            args[2], // timestampMs
            this.currentPredictiveAddrId // Vertical Pass
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
            args[4], // redactionApplied
            args[5], // addr_id (optional)
            args[6]  // cfh_signature (optional)
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
            args[4], // redactionApplied
            args[5], // addr_id (optional)
            args[6]  // cfh_signature (optional)
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

    this.log.logVerbose(
      `Received ${response.final ? "final" : "partial"} response for ${chunk.id}: [${(
        response.alternatives || []
      )
        .map((e: any) => e.transcript)
        .join(", ")}]`
    );

    const chunkMetrics = this.tracking.getChunkMetrics(chunk.id);
    const chunkLatencyMs = chunkMetrics?.received_at ? Date.now() - chunkMetrics.received_at : 0;

    // Track response latency
    if (response.final) {
      this.tracking.onFinalResponse(chunk.id);
      this.tracking.logLatencyMetrics(chunk.id);
      
      // Track WebSocket latency for comparison with Bus
      this.websocketResponseLatency = chunkLatencyMs;
    } else {
      this.tracking.onPartialResponse(chunk.id);
    }

    const busAlternatives = (response.alternatives || []).map((alt: any, index: number) => ({
      transcript: alt.transcript || "",
      rank: index,
      score: alt.confidence || alt.score || 0,
      is_final: !!response.final,
    }));

    // Store WebSocket response for comparison with Bus
    if (this.comparator?.isEnabled()) {
      const sessionId = this.tracking.getCurrentSessionId();
      if (sessionId) {
        this.comparator.storeWebSocketResponse(
          sessionId,
          chunk.id,
          busAlternatives,
          chunkLatencyMs,
          !!response.final
        );
      }
    }

    // Publish to Arqon Bus (shadow publish)
    const silenceThreshold = response.silenceThreshold || 0.3;
    const modelId = this.settings.getStreamingEndpoint()?.id || "default";
    
    // Phase 3: Compute and attach predictive addr_id to transcript envelopes
    const transcriptText = (response.alternatives || [])
      .map((alt: any) => alt.transcript)
      .filter(Boolean)
      .join(" ");
    
    // Update predictive addr_id on transcript events
    if (transcriptText) {
      this.updatePredictiveAddrId(transcriptText, !!response.final);
      
      // Schedule SAS precheck with debounce (throttle/debounce)
      this.scheduleSASPrecheck(transcriptText, !!response.final, chunk.id);
    }
    
    if (response.final) {
      this.publishToBus("transcript_final", busAlternatives, chunkLatencyMs, silenceThreshold, modelId, false, 
        this.currentPredictiveAddrId, this.currentPredictiveCFHSignature);
    } else {
      this.publishToBus("transcript_partial", busAlternatives, chunkLatencyMs, silenceThreshold, modelId, false,
        this.currentPredictiveAddrId, this.currentPredictiveCFHSignature);
    }

    await this.commandResponseService.apply({
      attemptToEvaluateChunk: (candidate) => this.attemptToEvaluateChunk(candidate),
      chunk,
      getSessionId: () => this.tracking.getCurrentSessionId() || undefined,
      logResponse: (candidate) => this.logResponse(candidate),
      recordNormalizedCommands: (chunkId, count, sessionId) => {
        this.executionTrace?.recordNormalizedCommands(chunkId, count, sessionId);
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

      // Publish audio to Bus (shadow publish)
      this.publishToBus(
        "audio_append", 
        Buffer.from(audio.buffer), 
        this.audioSequenceNumber++, 
        Date.now(),
        this.currentPredictiveAddrId // Initial pass for sequence tracking
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
    this.executionTrace?.trackChunk(id, chunkMetrics.correlation.session_id);
    if (this.currentRoutingDecision) {
      this.executionTrace?.recordRouteChoice(
        id,
        this.currentRoutingDecision.path,
        chunkMetrics.correlation.session_id
      );
    }

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

  private resetListeningBuffers() {
    this.chunkQueue.clear();
    this.buffer = [];
    this.buffering = false;
    this.speaking = false;
  }

  private async startListeningSession(generation: number): Promise<boolean> {
    return this.listeningSessionService.start({
      chunkManager: this,
      generation,
      isGenerationCurrent: () => generation == this.toggleGeneration,
      onChunkStart: (audio) => this.onChunkStart(audio),
      onAudio: (audio, consecutiveSilence) => this.onAudio(audio, consecutiveSilence),
      onChunkEnd: () => this.onChunkEnd(),
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
        this.bridge.setState(
          {
            backendIssue: error,
            listening: false,
            speaking: false,
            statusText: "Paused",
          },
          [this.mainWindow, this.miniModeWindow]
        );
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
      
      // Phase 3: Start presence pulse heartbeat
      this.startPresencePulse();
    } else {
      // Publish session stop to Bus (shadow publish)
      const current = this.chunkQueue.getIndex(0);
      const durationMs = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
      if (this.tracking.getCurrentSessionId()) {
        this.publishToBus("session_stop", current?.id || "", "user_toggle", durationMs);
      }
      this.tracking.endSession();
      
      // Phase 3: Stop presence pulse and cleanup throttle/debounce
      this.stopPresencePulse();
      this.cleanupThrottleDebounce();
      
      // Reset predictive addr_id
      this.currentPredictiveAddrId = undefined;
      this.currentPredictiveCFHSignature = undefined;
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
