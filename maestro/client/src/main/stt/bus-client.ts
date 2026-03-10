import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import Log from "../log";
import Settings from "../settings";
import STTTracking from "./tracking";
import {
  BusMessage,
  STTEnvelope,
  serializeBusMessage,
  deserializeBusMessage,
  STTCommonFields,
  TranscriptAlternative,
  STTSessionStartPayload,
  STTAudioAppendPayload,
  STTEndpointRequestPayload,
  TranscriptPayload,
  STTSessionStopPayload,
  STTHealthStatusPayload,
  createSessionStartEnvelope,
  createAudioAppendEnvelope,
  createEndpointRequestEnvelope,
  createTranscriptPartialEnvelope,
  createTranscriptFinalEnvelope,
  createSessionStopEnvelope,
  createHealthStatusEnvelope,
  createAddressQueryEnvelope,
  toBusMessage,
  BusMessageType,
} from "./envelopes";

/**
 * Callback types for Bus responses
 */
export type TranscriptResponseCallback = (
  sessionId: string,
  chunkId: string,
  alternatives: TranscriptAlternative[],
  latencyMs: number,
  isFinal: boolean
) => void;

/**
 * Execution mode response handler
 */
export type ExecutionResponseHandler = (
  sessionId: string,
  chunkId: string,
  alternatives: TranscriptAlternative[],
  latencyMs: number,
  isFinal: boolean
) => void;

/**
 * Connection state for the Arqon Bus client
 */
export enum BusConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
}

/**
 * Bus client configuration
 */
export interface BusClientConfig {
  /** WebSocket URL for Arqon Bus */
  wsUrl: string;
  /** Room name for STT traffic */
  room: string;
  /** Channel name */
  channel: string;
  /** Client ID for this instance */
  clientId: string;
  /** Enable shadow mode (publish only, don't act on responses) */
  shadowMode: boolean;
  /** Auto-reconnect on disconnect */
  autoReconnect: boolean;
  /** Reconnect delay in ms */
  reconnectDelay: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts: number;
  /** Ping interval in ms */
  pingInterval: number;
}

/**
 * Bus client metrics
 */
export interface BusClientMetrics {
  messagesPublished: number;
  messagesReceived: number;
  publishFailures: number;
  connectionErrors: number;
  lastPublishTime?: number;
  lastReceiveTime?: number;
}

/**
 * Arqon Bus Client for STT Shadow Publishing
 * 
 * This client mirrors STT events to the Arqon Bus while keeping
 * WebSocket as the primary execution path.
 */
export default class BusClient {
  private socket?: WebSocket;
  private state: BusConnectionState = BusConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private pingInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private config: BusClientConfig;
  private metrics: BusClientMetrics = {
    messagesPublished: 0,
    messagesReceived: 0,
    publishFailures: 0,
    connectionErrors: 0,
  };

  // Callbacks for response handling (for comparison)
  private transcriptCallbacks: TranscriptResponseCallback[] = [];

  // Execution mode handler for when Bus is the primary path
  private executionHandler?: ExecutionResponseHandler;

  // Track pending requests for execution mode
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  // Execution mode state
  private executionMode: boolean = false;

  constructor(
    private settings: Settings,
    private log: Log,
    private tracking: STTTracking
  ) {
    this.config = this.buildConfig();
  }

  /**
   * Build configuration from settings
   */
  private buildConfig(): BusClientConfig {
    return {
      wsUrl: this.settings.getArqonBusWsUrl(),
      room: this.settings.getArqonBusRoom(),
      channel: this.settings.getArqonBusChannel(),
      clientId: `maestro-${uuid().substring(0, 8)}`,
      shadowMode: this.settings.getArqonBusShadowMode(),
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): BusClientConfig {
    return { ...this.config };
  }

  /**
   * Check if Bus is enabled in settings
   */
  isEnabled(): boolean {
    return this.settings.getArqonBusEnabled();
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state === BusConnectionState.CONNECTED;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): BusConnectionState {
    return this.state;
  }

  /**
   * Get client metrics
   */
  getMetrics(): BusClientMetrics {
    return { ...this.metrics };
  }

  /**
   * Register a callback for transcript responses from Bus
   * This is used for comparison mode to compare WebSocket vs Bus responses
   */
  registerTranscriptCallback(callback: TranscriptResponseCallback): void {
    this.transcriptCallbacks.push(callback);
  }

  /**
   * Unregister a transcript callback
   */
  unregisterTranscriptCallback(callback: TranscriptResponseCallback): void {
    const index = this.transcriptCallbacks.indexOf(callback);
    if (index > -1) {
      this.transcriptCallbacks.splice(index, 1);
    }
  }

  /**
   * Enable/disable execution mode
   * In execution mode, responses are returned to caller instead of just being published
   */
  setExecutionMode(enabled: boolean, handler?: ExecutionResponseHandler): void {
    this.executionMode = enabled;
    this.executionHandler = handler || undefined;
    
    // Update config to disable shadow mode when in execution mode
    if (enabled) {
      this.config.shadowMode = false;
      this.log.logVerbose("[BusClient] Execution mode enabled");
    } else {
      this.executionHandler = undefined;
      this.log.logVerbose("[BusClient] Execution mode disabled");
    }
  }

  /**
   * Check if execution mode is enabled
   */
  isExecutionMode(): boolean {
    return this.executionMode;
  }

  /**
   * Cancel pending request
   */
  cancelPendingRequest(sessionId: string, chunkId: string): void {
    const requestId = `${sessionId}_${chunkId}`;
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * Connect to Arqon Bus
   */
  async connect(): Promise<boolean> {
    if (!this.isEnabled()) {
      this.log.logVerbose("[BusClient] Bus is disabled in settings");
      return false;
    }

    if (this.state === BusConnectionState.CONNECTED || this.state === BusConnectionState.CONNECTING) {
      return this.state === BusConnectionState.CONNECTED;
    }

    this.state = BusConnectionState.CONNECTING;
    this.log.logVerbose(`[BusClient] Connecting to ${this.config.wsUrl}`);

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.config.wsUrl);

        const connectionTimeout = setTimeout(() => {
          this.log.logVerbose("[BusClient] Connection timeout");
          this.handleDisconnect();
          resolve(false);
        }, 5000);

        this.socket.on("open", () => {
          clearTimeout(connectionTimeout);
          this.state = BusConnectionState.CONNECTED;
          this.reconnectAttempts = 0;
          this.log.logVerbose("[BusClient] Connected");
          
          // Start ping interval
          this.startPing();
          
          // Join room and channel
          this.joinRoom();
          
          resolve(true);
        });

        this.socket.on("message", (data: any) => {
          this.handleMessage(data.toString());
        });

        this.socket.on("close", () => {
          this.log.logVerbose("[BusClient] Connection closed");
          this.handleDisconnect();
        });

        this.socket.on("error", (error) => {
          this.metrics.connectionErrors++;
          this.log.logError(`[BusClient] Socket error: ${error.message}`);
          this.handleDisconnect();
          resolve(false);
        });
      } catch (error: any) {
        this.metrics.connectionErrors++;
        this.log.logError(`[BusClient] Failed to connect: ${error.message}`);
        this.state = BusConnectionState.DISCONNECTED;
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from Arqon Bus
   */
  disconnect(): void {
    this.config.autoReconnect = false;
    this.stopPing();
    this.stopHealthCheck();
    
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.close();
      this.socket = undefined;
    }
    
    this.state = BusConnectionState.DISCONNECTED;
    this.log.logVerbose("[BusClient] Disconnected");
  }

  /**
   * Handle disconnection with auto-reconnect
   */
  private handleDisconnect(): void {
    this.stopPing();
    this.stopHealthCheck();
    this.state = BusConnectionState.DISCONNECTED;
    
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.state = BusConnectionState.RECONNECTING;
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * Math.min(this.reconnectAttempts, 5);
      this.log.logVerbose(`[BusClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  /**
   * Join room and channel
   */
  private joinRoom(): void {
    // Send join message for the STT room
    const joinMessage: BusMessage = {
      version: "1.0",
      id: `arq_${uuid()}`,
      type: "command" as BusMessageType,
      room: this.config.room,
      channel: this.config.channel,
      from: this.config.clientId,
      timestamp: new Date().toISOString(),
      payload: {
        message_id: uuid(),
        session_id: "",
        chunk_id: "",
        tenant_id: "default",
        timestamp: new Date().toISOString(),
        source: "maestro",
        version: "1.0",
        type: "stt.session.start" as any,
        payload: {
          language: "en-US",
          model_id: "default",
        },
      },
    };
    
    this.sendRaw(joinMessage);
  }

  /**
   * Start ping interval for keepalive
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.state === BusConnectionState.CONNECTED && this.socket) {
        this.socket.ping();
      }
    }, this.config.pingInterval);
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  /**
   * Start periodic health status publishing
   */
  startHealthCheck(healthCheckFn: () => { status: "healthy" | "degraded" | "unhealthy"; latency: number; errors: number }): void {
    this.stopHealthCheck();
    this.healthCheckInterval = setInterval(() => {
      if (this.state === BusConnectionState.CONNECTED) {
        const health = healthCheckFn();
        this.publishHealthStatus(health.status, health.latency, health.errors);
      }
    }, 10000);
  }

  /**
   * Stop health check interval
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    const message = deserializeBusMessage(data);
    if (!message) {
      return;
    }

    this.metrics.messagesReceived++;
    this.metrics.lastReceiveTime = Date.now();

    // Process transcript responses for comparison
    this.processTranscriptResponse(message);

    // Handle execution mode
    if (this.executionMode && this.executionHandler) {
      this.processExecutionResponse(message);
    }

    // In shadow mode, we don't act on any responses
    if (this.config.shadowMode) {
      this.log.logVerbose("[BusClient] Shadow mode: ignoring incoming messages");
      return;
    }

    // TODO: Handle responses from Bus if not in shadow mode
    // For now, we just log them
    this.log.logVerbose(`[BusClient] Received: ${message.payload.type}`);
  }

  /**
   * Process incoming transcript response and notify callbacks
   */
  private processTranscriptResponse(message: BusMessage): void {
    const payload = message.payload;
    const payloadType = payload.type;
    
    if (payloadType !== "stt.transcript.partial" && payloadType !== "stt.transcript.final") {
      return;
    }

    const transcriptPayload = payload as any;
    const commonFields = payload as STTCommonFields;
    
    if (!transcriptPayload.payload || !transcriptPayload.payload.alternatives) {
      return;
    }

    const alternatives: TranscriptAlternative[] = transcriptPayload.payload.alternatives.map(
      (alt: any, index: number) => ({
        transcript: alt.transcript || "",
        rank: alt.rank !== undefined ? alt.rank : index,
        score: alt.score !== undefined ? alt.score : 0,
        is_final: payloadType === "stt.transcript.final",
      })
    );

    const latencyMs = transcriptPayload.payload.latency_ms || 0;
    const isFinal = payloadType === "stt.transcript.final";

    this.log.logVerbose(`[BusClient] Transcript ${isFinal ? "final" : "partial"}: ${alternatives[0] && alternatives[0].transcript ? alternatives[0].transcript.substring(0, 50) : ""}...`);

    // Notify all registered callbacks
    for (const callback of this.transcriptCallbacks) {
      try {
        callback(
          commonFields.session_id,
          commonFields.chunk_id,
          alternatives,
          latencyMs,
          isFinal
        );
      } catch (error) {
        this.log.logError(`[BusClient] Callback error: ${error}`);
      }
    }
  }

  /**
   * Process execution mode response
   */
  private processExecutionResponse(message: BusMessage): void {
    const payload = message.payload;
    const payloadType = payload.type;
    
    if (payloadType !== "stt.transcript.partial" && payloadType !== "stt.transcript.final") {
      return;
    }

    const transcriptPayload = payload as any;
    const commonFields = payload as STTCommonFields;
    
    if (!transcriptPayload.payload || !transcriptPayload.payload.alternatives) {
      return;
    }

    const alternatives: TranscriptAlternative[] = transcriptPayload.payload.alternatives.map(
      (alt: any, index: number) => ({
        transcript: alt.transcript || "",
        rank: alt.rank !== undefined ? alt.rank : index,
        score: alt.score !== undefined ? alt.score : 0,
        is_final: payloadType === "stt.transcript.final",
      })
    );

    const latencyMs = transcriptPayload.payload.latency_ms || 0;
    const isFinal = payloadType === "stt.transcript.final";

    // Check for pending request
    const requestId = `${commonFields.session_id}_${commonFields.chunk_id}`;
    const pending = this.pendingRequests.get(requestId);
    
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);
      
      pending.resolve({
        alternatives,
        latencyMs,
        isFinal,
      });
    }

    // Also notify execution handler if set
    if (this.executionHandler) {
      try {
        this.executionHandler(
          commonFields.session_id,
          commonFields.chunk_id,
          alternatives,
          latencyMs,
          isFinal
        );
      } catch (error) {
        this.log.logError(`[BusClient] Execution handler error: ${error}`);
      }
    }
  }

  /**
   * Send a raw Bus message
   */
  private sendRaw(message: BusMessage): boolean {
    if (this.state !== BusConnectionState.CONNECTED || !this.socket) {
      return false;
    }

    try {
      this.socket.send(serializeBusMessage(message));
      this.metrics.messagesPublished++;
      this.metrics.lastPublishTime = Date.now();
      return true;
    } catch (error: any) {
      this.metrics.publishFailures++;
      this.log.logError(`[BusClient] Failed to publish: ${error.message}`);
      return false;
    }
  }

  /**
   * Publish an STT envelope to the Bus
   */
  publish(envelope: STTEnvelope): boolean {
    if (this.state !== BusConnectionState.CONNECTED) {
      return false;
    }

    const message = toBusMessage(envelope, this.config.room, this.config.channel, this.config.clientId);
    return this.sendRaw(message);
  }

  // ============================================================================
  // STT Event Publishing Methods
  // ============================================================================

  /**
   * Publish session start event
   */
  publishSessionStart(
    sessionId: string,
    chunkId: string,
    language: string,
    modelId: string,
    editorContext?: STTSessionStartPayload["editor_context"]
  ): boolean {
    const envelope = createSessionStartEnvelope(
      sessionId,
      chunkId,
      language,
      modelId,
      editorContext
    );
    return this.publish(envelope);
  }

  /**
   * Publish audio append event
   */
  publishAudioAppend(
    sessionId: string,
    chunkId: string,
    audioData: Buffer,
    sequenceNumber: number,
    timestampMs: number,
    addrId?: string
  ): boolean {
    const envelope = createAudioAppendEnvelope(
      sessionId,
      chunkId,
      audioData,
      sequenceNumber,
      timestampMs,
      undefined, // tenantId
      addrId
    );
    return this.publish(envelope);
  }

  /**
   * Publish endpoint request event
   */
  publishEndpointRequest(
    sessionId: string,
    chunkId: string,
    finalize: boolean,
    endpointType: "partial" | "final" | "force_final" = "partial"
  ): boolean {
    const envelope = createEndpointRequestEnvelope(
      sessionId,
      chunkId,
      finalize,
      endpointType
    );
    return this.publish(envelope);
  }

  /**
   * Publish partial transcript event
   */
  publishTranscriptPartial(
    sessionId: string,
    chunkId: string,
    alternatives: TranscriptAlternative[],
    latencyMs: number,
    silenceThreshold: number,
    modelId: string,
    redactionApplied: boolean = false
  ): boolean {
    const envelope = createTranscriptPartialEnvelope(
      sessionId,
      chunkId,
      alternatives,
      latencyMs,
      silenceThreshold,
      modelId,
      redactionApplied
    );
    return this.publish(envelope);
  }

  /**
   * Publish final transcript event
   */
  publishTranscriptFinal(
    sessionId: string,
    chunkId: string,
    alternatives: TranscriptAlternative[],
    latencyMs: number,
    silenceThreshold: number,
    modelId: string,
    redactionApplied: boolean = false
  ): boolean {
    const envelope = createTranscriptFinalEnvelope(
      sessionId,
      chunkId,
      alternatives,
      latencyMs,
      silenceThreshold,
      modelId,
      redactionApplied
    );
    return this.publish(envelope);
  }

  /**
   * Publish session stop event
   */
  publishSessionStop(
    sessionId: string,
    chunkId: string,
    reason: STTSessionStopPayload["reason"],
    durationMs: number
  ): boolean {
    const envelope = createSessionStopEnvelope(
      sessionId,
      chunkId,
      reason,
      durationMs
    );
    return this.publish(envelope);
  }

  /**
   * Publish health status event
   */
  publishHealthStatus(
    status: STTHealthStatusPayload["status"],
    latencyMs: number,
    errorCount: number = 0
  ): boolean {
    const sessionId = this.tracking.getCurrentSessionId() || "system";
    const envelope = createHealthStatusEnvelope(
      sessionId,
      status,
      latencyMs,
      errorCount
    );
    return this.publish(envelope);
  }

  /**
   * Publish an address query envelope for address-first routing.
   * This is the proactive path that enables O(0) routing.
   */
  publishAddressQuery(
    sessionId: string,
    chunkId: string,
    transcript: string,
    addrId: string,
    cfhSignature: string,
    confidence: number,
    isFinal: boolean,
    options?: {
      opcodeHint?: string;
      slotsHint?: Record<string, string>;
      tenantId?: string;
    }
  ): boolean {
    const envelope = createAddressQueryEnvelope(
      sessionId,
      chunkId,
      transcript,
      addrId,
      cfhSignature,
      confidence,
      isFinal,
      options
    );
    return this.publish(envelope);
  }

  /**
   * Publish a presence pulse (short heartbeat) with the current predictive address.
   * Uses the stt.address.query envelope type for consistent routing.
   */
  publishPresencePulse(
    sessionId: string,
    chunkId: string,
    addrId: string,
    cfhSignature: string,
    timestamp: number
  ): boolean {
    const envelope = createAddressQueryEnvelope(
      sessionId,
      chunkId,
      "presence_pulse", // marker transcript
      addrId,
      cfhSignature,
      1.0,  // full confidence in the hash itself
      false // never final
    );
    return this.publish(envelope);
  }
}

/**
 * Factory function to create BusClient instance
 */
export function createBusClient(
  settings: Settings,
  log: Log,
  tracking: STTTracking
): BusClient {
  return new BusClient(settings, log, tracking);
}
