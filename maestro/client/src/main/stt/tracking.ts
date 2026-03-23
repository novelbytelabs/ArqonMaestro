import { v4 as uuid } from "uuid";
import API from "../api";
import Settings from "../settings";

/**
 * Correlation IDs for end-to-end tracing through the STT pipeline.
 * These IDs propagate through both WebSocket and future Bus paths.
 */
export interface STTCorrelation {
  /** UUID for the entire listening session (start→stop) */
  session_id: string;
  /** UUID for each individual message/envelope */
  message_id: string;
  /** UUID for audio chunks (existing, kept for compatibility) */
  chunk_id: string;
  /** Array of [phase, timestamp] for end-to-end latency tracking */
  correlation_trace: [string, number][];
}

/**
 * Latency metrics for the STT pipeline.
 */
export interface STTLatencyMetrics {
  /** Time from audio chunk capture to partial transcript (ms) */
  audio_to_partial?: number;
  /** Time from audio chunk capture to final transcript (ms) */
  audio_to_final?: number;
  /** Time for endpoint detection (ms) */
  endpoint_detection?: number;
}

/**
 * Reliability metrics for the STT pipeline.
 */
export interface STTReliabilityMetrics {
  /** Number of reconnects during the session */
  reconnect_count: number;
  /** Time to reconnect (ms) */
  reconnect_latency?: number;
  /** Dropped audio chunks detected */
  drop_detected: boolean;
  /** Duplicate transcripts detected */
  duplicate_detected: boolean;
}

/**
 * State metrics for the STT pipeline.
 */
export interface STTStateMetrics {
  /** Time spent in stuck listening state (ms) */
  stuck_listening?: number;
  /** Count of pause/resume race conditions detected */
  pause_resume_race: number;
  /** Transcript mismatch between paths */
  mismatch_detected: boolean;
}

/**
 * Scenario classification for tuning loops
 */
export type STTScenarioClass = "ack_short" | "normal" | "long";

/**
 * Helper to classify a transcript into a scenario class
 */
export function classifyTranscript(transcript: string): STTScenarioClass {
  if (!transcript) return "normal";
  const words = transcript.trim().split(/\s+/).length;
  if (words >= 2 && words <= 5) return "ack_short";
  if (words > 5 && words <= 15) return "normal";
  if (words > 15) return "long";
  return "normal";
}

/**
 * Complete metrics for a chunk.
 */
export interface ChunkMetrics {
  correlation: STTCorrelation;
  latency: STTLatencyMetrics;
  received_at?: number;
  sent_at?: number;
  partial_response_at?: number;
  final_response_at?: number;
  executed_at?: number;
}

/**
 * Session-level tracking data.
 */
interface SessionData {
  session_id: string;
  start_time: number;
  end_time?: number;
  reconnect_count: number;
  last_reconnect_time?: number;
  stuck_listening_start?: number;
  pause_resume_race_count: number;
  chunks: Map<string, ChunkMetrics>;
  last_chunk_id?: string;
  expected_chunk_sequence: number;
}

/**
 * STT Tracking module for centralized correlation ID generation and metrics.
 * This module provides observability for the STT pipeline and supports
 * both the current WebSocket path and the future Bus path.
 */
export default class STTTracking {
  private currentSession: SessionData | null = null;
  private previousSession: SessionData | null = null;
  private api: API;
  private settings: Settings;
  private stuckListeningCheckInterval?: NodeJS.Timeout;
  private lastActivityTime: number = 0;
  private readonly STUCK_LISTENING_THRESHOLD = 30000; // 30 seconds

  constructor(api: API, settings: Settings) {
    this.api = api;
    this.settings = settings;
  }

  /**
   * Generate a new session ID for a listening session.
   */
  generateSessionId(): string {
    return uuid();
  }

  /**
   * Generate a new message ID for an individual message/envelope.
   */
  generateMessageId(): string {
    return uuid();
  }

  /**
   * Create a new correlation object with all required IDs.
   */
  createCorrelation(chunkId: string): STTCorrelation {
    return {
      session_id: this.currentSession && this.currentSession.session_id || "",
      message_id: this.generateMessageId(),
      chunk_id: chunkId,
      correlation_trace: [],
    };
  }

  /**
   * Add a timestamped phase to the correlation trace.
   */
  addTracePoint(correlation: STTCorrelation, phase: string): void {
    correlation.correlation_trace.push([phase, Date.now()]);
  }

  /**
   * Start a new listening session.
   */
  startSession(): string {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      session_id: sessionId,
      start_time: Date.now(),
      reconnect_count: 0,
      pause_resume_race_count: 0,
      chunks: new Map(),
      expected_chunk_sequence: 0,
    };
    this.lastActivityTime = Date.now();
    
    // Start stuck listening detection
    this.startStuckListeningCheck();
    
    // Log session start
    this.logSessionEvent("session_start", {
      session_id: sessionId,
      timestamp: Date.now(),
    });
    
    return sessionId;
  }

  /**
   * End the current listening session.
   */
  endSession(): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.end_time = Date.now();
    
    // Stop stuck listening check
    this.stopStuckListeningCheck();
    
    // Log session end
    this.logSessionEvent("session_end", {
      session_id: this.currentSession.session_id,
      duration: this.currentSession.end_time - this.currentSession.start_time,
      total_chunks: this.currentSession.chunks.size,
      reconnect_count: this.currentSession.reconnect_count,
      pause_resume_race_count: this.currentSession.pause_resume_race_count,
    });

    // Archive session for comparison (used for Bus migration)
    this.previousSession = this.currentSession;
    this.currentSession = null;
  }

  /**
   * Record a chunk being received from the microphone.
   */
  onChunkStart(chunkId: string): ChunkMetrics {
    if (!this.currentSession) {
      this.startSession();
    }

    const correlation = this.createCorrelation(chunkId);
    this.addTracePoint(correlation, "chunk_start");

    const metrics: ChunkMetrics = {
      correlation,
      latency: {},
      received_at: Date.now(),
    };

    this.currentSession!.chunks.set(chunkId, metrics);
    this.currentSession!.last_chunk_id = chunkId;
    this.currentSession!.expected_chunk_sequence++;
    this.lastActivityTime = Date.now();

    return metrics;
  }

  /**
   * Record audio being sent to the server.
   */
  onAudioSent(chunkId: string): void {
    const metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
    if (metrics) {
      metrics.sent_at = Date.now();
      this.addTracePoint(metrics.correlation, "audio_sent");
      this.lastActivityTime = Date.now();
    }
  }

  /**
   * Record a partial response from the server.
   */
  onPartialResponse(chunkId: string): void {
    const metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
    if (metrics && metrics.received_at) {
      metrics.latency.audio_to_partial = Date.now() - metrics.received_at;
      metrics.partial_response_at = Date.now();
      this.addTracePoint(metrics.correlation, "partial_response");
      this.lastActivityTime = Date.now();
    }
  }

  /**
   * Record a final response from the server.
   */
  onFinalResponse(chunkId: string): void {
    const metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
    if (metrics && metrics.received_at) {
      metrics.latency.audio_to_final = Date.now() - metrics.received_at;
      metrics.final_response_at = Date.now();
      this.addTracePoint(metrics.correlation, "final_response");
      this.lastActivityTime = Date.now();
    }
  }

  /**
   * Record execution of a command.
   */
  onExecuted(chunkId: string): void {
    const metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
    if (metrics) {
      metrics.executed_at = Date.now();
      this.addTracePoint(metrics.correlation, "executed");
      this.lastActivityTime = Date.now();
    }
  }

  /**
   * Record endpoint detection timing.
   */
  onEndpointDetected(chunkId: string, detectionTime: number): void {
    const metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
    if (metrics && metrics.received_at) {
      metrics.latency.endpoint_detection = detectionTime;
      this.addTracePoint(metrics.correlation, "endpoint_detected");
    }
  }

  /**
   * Record a reconnect event.
   */
  onReconnect(): void {
    if (!this.currentSession) {
      return;
    }

    const now = Date.now();
    const reconnectLatency = this.currentSession.last_reconnect_time
      ? now - this.currentSession.last_reconnect_time
      : undefined;

    this.currentSession.reconnect_count++;
    this.currentSession.last_reconnect_time = now;

    this.logMetric("stt.reconnect.count", {
      session_id: this.currentSession.session_id,
      count: this.currentSession.reconnect_count,
      latency: reconnectLatency,
    });
  }

  /**
   * Detect and record a pause/resume race condition.
   */
  onPauseResumeRace(): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.pause_resume_race_count++;

    this.logMetric("stt.state.pause_resume_race", {
      session_id: this.currentSession.session_id,
      count: this.currentSession.pause_resume_race_count,
    });
  }

  /**
   * Detect a dropped chunk (sequence gap).
   */
  onChunkDrop(expectedSequence: number, actualSequence: number): void {
    if (!this.currentSession) {
      return;
    }

    this.logMetric("stt.drop.detected", {
      session_id: this.currentSession.session_id,
      expected_sequence: expectedSequence,
      actual_sequence: actualSequence,
      dropped_count: expectedSequence - actualSequence,
    });
  }

  /**
   * Detect a duplicate transcript.
   */
  onDuplicateDetected(chunkId: string): void {
    this.logMetric("stt.duplicate.detected", {
      session_id: this.currentSession && this.currentSession.session_id,
      chunk_id: chunkId,
    });
  }

  /**
   * Detect a transcript mismatch between paths (for Bus migration).
   */
  onMismatchDetected(chunkId: string, websocketTranscript: string, busTranscript: string): void {
    this.logMetric("stt.state.mismatch", {
      session_id: this.currentSession && this.currentSession.session_id,
      chunk_id: chunkId,
      websocket_transcript: websocketTranscript,
      bus_transcript: busTranscript,
    });
  }

  /**
   * Get current session ID.
   */
  getCurrentSessionId(): string | null {
    return this.currentSession && this.currentSession.session_id || null;
  }

  /**
   * Get metrics for a specific chunk.
   */
  getChunkMetrics(chunkId: string): ChunkMetrics | undefined {
    return this.currentSession ? this.currentSession.chunks.get(chunkId) : undefined;
  }

  /**
   * Get session-level metrics.
   */
  getSessionMetrics(): {
    session_id: string;
    duration: number;
    total_chunks: number;
    reconnect_count: number;
    pause_resume_race_count: number;
  } | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      session_id: this.currentSession.session_id,
      duration: Date.now() - this.currentSession.start_time,
      total_chunks: this.currentSession.chunks.size,
      reconnect_count: this.currentSession.reconnect_count,
      pause_resume_race_count: this.currentSession.pause_resume_race_count,
    };
  }

  /**
   * Start stuck listening detection.
   */
  private startStuckListeningCheck(): void {
    this.stopStuckListeningCheck();
    
    this.stuckListeningCheckInterval = setInterval(() => {
      if (!this.currentSession) {
        return;
      }

      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      if (timeSinceLastActivity > this.STUCK_LISTENING_THRESHOLD) {
        // Record stuck listening metric
        if (!this.currentSession.stuck_listening_start) {
          this.currentSession.stuck_listening_start = this.lastActivityTime;
        }

        this.logMetric("stt.state.stuck_listening", {
          session_id: this.currentSession.session_id,
          stuck_duration: timeSinceLastActivity,
          threshold: this.STUCK_LISTENING_THRESHOLD,
        });
      }
    }, 5000);
  }

  /**
   * Stop stuck listening detection.
   */
  private stopStuckListeningCheck(): void {
    if (this.stuckListeningCheckInterval) {
      clearInterval(this.stuckListeningCheckInterval);
      this.stuckListeningCheckInterval = undefined;
    }
  }

  /**
   * Log a session-level event.
   */
  private logSessionEvent(event: string, data: any): void {
    if (this.settings.getDisableAnalytics()) {
      return;
    }

    this.api.logEvent(`stt.session.${event}`, {
      dt: Date.now(),
      data: {
        ...data,
      },
    });
  }

  /**
   * Log a metric with correlation data.
   */
  logMetric(metricName: string, data: any): void {
    if (this.settings.getDisableAnalytics()) {
      return;
    }

    this.api.logEvent(metricName, {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession && this.currentSession.session_id,
      },
    });
  }

  /**
   * Log latency metrics for a chunk (called on final response).
   */
  logLatencyMetrics(chunkId: string): void {
    const metrics = this.currentSession && this.currentSession.chunks.get(chunkId);
    if (!metrics) {
      return;
    }

    if (metrics.latency.audio_to_partial !== undefined) {
      this.api.logEvent("stt.latency.audio_to_partial", {
        dt: Date.now(),
        data: {
          chunk_id: chunkId,
          session_id: metrics.correlation.session_id,
          latency_ms: metrics.latency.audio_to_partial,
          correlation_trace: metrics.correlation.correlation_trace,
        },
      });
    }

    if (metrics.latency.audio_to_final !== undefined) {
      this.api.logEvent("stt.latency.audio_to_final", {
        dt: Date.now(),
        data: {
          chunk_id: chunkId,
          session_id: metrics.correlation.session_id,
          latency_ms: metrics.latency.audio_to_final,
          correlation_trace: metrics.correlation.correlation_trace,
        },
      });
    }

    if (metrics.latency.endpoint_detection !== undefined) {
      this.api.logEvent("stt.latency.endpoint_detection", {
        dt: Date.now(),
        data: {
          chunk_id: chunkId,
          session_id: metrics.correlation.session_id,
          latency_ms: metrics.latency.endpoint_detection,
        },
      });
    }
  }

  /**
   * Log Parakeet (command_fast) success metrics.
   * Metric: stt.command_fast.parakeet.success
   */
  logParakeetSuccess(data: {
    chunk_id: string;
    latency_ms: number;
    text_length?: number;
  }): void {
    this.api.logEvent("stt.command_fast.parakeet.success", {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession?.session_id,
      },
    });
  }

  /**
   * Log Parakeet (command_fast) failure metrics.
   * Metric: stt.command_fast.parakeet.failure
   */
  logParakeetFailure(data: {
    chunk_id: string;
    error_code: string;
    retryable: boolean;
  }): void {
    this.api.logEvent("stt.command_fast.parakeet.failure", {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession?.session_id,
      },
    });
  }

  /**
   * Log Qwen3 ASR (dictation) success metrics.
   * Metric: stt.dictation.qwen3_asr.success
   */
  logQwen3Success(data: {
    chunk_id: string;
    latency_ms: number;
    text_length?: number;
  }): void {
    this.api.logEvent("stt.dictation.qwen3_asr.success", {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession?.session_id,
      },
    });
  }

  /**
   * Log Qwen3 ASR (dictation) failure metrics.
   * Metric: stt.dictation.qwen3_asr.failure
   */
  logQwen3Failure(data: {
    chunk_id: string;
    error_code: string;
    retryable: boolean;
  }): void {
    this.api.logEvent("stt.dictation.qwen3_asr.failure", {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession?.session_id,
      },
    });
  }

  /**
   * Log vLLM 503 recovery event for dictation.
   * Metric: stt.dictation.vllm_503_recovery
   */
  logVLLM503Recovery(data: {
    chunk_id: string;
    recovery_success: boolean;
    fallback_used: boolean;
  }): void {
    this.api.logEvent("stt.dictation.vllm_503_recovery", {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession?.session_id,
      },
    });
  }

  /**
   * Log sidecar subprocess crash.
   * Metric: stt.sidecar.crash
   */
  logSidecarCrash(data: {
    sidecar_name: string;
    exit_code?: number;
    fallback_activated: boolean;
  }): void {
    this.api.logEvent("stt.sidecar.crash", {
      dt: Date.now(),
      data: {
        ...data,
        session_id: this.currentSession?.session_id,
      },
    });
  }
}

/**
 * Factory function to create STTTracking instance.
 */
export function createSTTTracking(api: API, settings: Settings): STTTracking {
  return new STTTracking(api, settings);
}
