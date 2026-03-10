import Log from "../log";
import Settings from "../settings";
import STTTracking, { ChunkMetrics } from "./tracking";
import { TranscriptAlternative, TranscriptPayload } from "./envelopes";

/**
 * Transcript comparison result between WebSocket and Bus paths
 */
export interface TranscriptComparison {
  session_id: string;
  chunk_id: string;
  websocket_transcript: string;
  bus_transcript: string;
  match: boolean;
  similarity_score: number; // 0-1
  latency_websocket_ms: number;
  latency_bus_ms: number;
  timestamp: string;
  transcript_type: "partial" | "final";
}

/**
 * Command comparison result
 */
export interface CommandComparison {
  session_id: string;
  chunk_id: string;
  websocket_commands: Command[];
  bus_commands: Command[];
  match: boolean;
  execution_time_websocket_ms: number;
  execution_time_bus_ms: number;
}

/**
 * Extracted command from transcript
 */
interface Command {
  type: string;
  index?: number;
}

/**
 * Aggregated comparison report
 */
export interface ComparisonReport {
  total_comparisons: number;
  transcript_matches: number;
  transcript_mismatches: number;
  commands_compared: number;
  command_matches: number;
  command_mismatches: number;
  avg_latency_websocket_ms: number;
  avg_latency_bus_ms: number;
  duplicates_detected: number;
  out_of_order_detected: number;
  transcript_match_rate: number;
  command_match_rate: number | null; // Null if no commands compared
  latency_delta_avg_ms: number;
  generated_at: string;
}

/**
 * Response stored for comparison
 */
interface StoredResponse {
  session_id: string;
  chunk_id: string;
  transcript: string;
  alternatives: TranscriptAlternative[];
  latency_ms: number;
  is_final: boolean;
  received_at: number;
  message_id: string;
  path: "websocket" | "bus";
}

/**
 * Callback for comparison results
 */
type ComparisonCallback = (comparison: TranscriptComparison) => void;

/**
 * STT Comparator for comparing WebSocket and Bus paths
 * 
 * This module validates that the Bus path produces equivalent results
 * to the WebSocket path before cutover.
 */
export default class STTComparator {
  private enabled: boolean = false;
  private websocketResponses: Map<string, StoredResponse[]> = new Map();
  private busResponses: Map<string, StoredResponse[]> = new Map();
  private comparisonCallbacks: ComparisonCallback[] = [];
  private seenMessageIds: Set<string> = new Set();
  private comparisonBuffer: Map<string, { websocket?: StoredResponse; bus?: StoredResponse }> = new Map();
  
  // Metrics for reporting
  private totalComparisons: number = 0;
  private transcriptMatches: number = 0;
  private transcriptMismatches: number = 0;
  private commandsCompared: number = 0;
  private commandMatches: number = 0;
  private commandMismatches: number = 0;
  private totalLatencyWebsocket: number = 0;
  private totalLatencyBus: number = 0;
  private duplicatesDetected: number = 0;
  private outOfOrderDetected: number = 0;
  private sessionCount: number = 0;
  
  // Configuration
  private similarityThreshold: number = 0.95;
  private maxLatencyDeltaMs: number = 1000;
  private reportIntervalSeconds: number = 300;
  private sampleRate: number = 1.0;
  
  private reportInterval?: NodeJS.Timeout;

  constructor(
    private log: Log,
    private settings: Settings,
    private tracking: STTTracking
  ) {
    this.loadConfiguration();
  }

  /**
   * Load comparison configuration from settings
   */
  private loadConfiguration(): void {
    this.enabled = this.settings.getArqonBusCompareEnabled();
    this.similarityThreshold = this.settings.getArqonBusCompareThreshold();
    this.reportIntervalSeconds = this.settings.getArqonBusCompareReportInterval();
    this.sampleRate = this.settings.getArqonBusCompareSampleRate();
    
    if (this.enabled) {
      this.startReportInterval();
    }
  }

  /**
   * Enable or disable comparison
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.startReportInterval();
    } else {
      this.stopReportInterval();
    }
  }

  /**
   * Check if comparison is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Register a callback for comparison results
   */
  onComparisonResult(callback: ComparisonCallback): void {
    this.comparisonCallbacks.push(callback);
  }

  /**
   * Store a WebSocket response for comparison
   */
  storeWebSocketResponse(
    sessionId: string,
    chunkId: string,
    alternatives: TranscriptAlternative[],
    latencyMs: number,
    isFinal: boolean
  ): void {
    if (!this.enabled) return;
    
    // Apply sample rate
    if (Math.random() > this.sampleRate) return;

    const transcript = alternatives[0]?.transcript || "";
    const messageId = `${sessionId}_${chunkId}_ws_${isFinal ? "final" : "partial"}`;
    
    // Check for duplicates
    if (this.seenMessageIds.has(messageId)) {
      this.duplicatesDetected++;
      this.log.logVerbose(`[Comparator] Duplicate WebSocket message: ${messageId}`);
      return;
    }
    this.seenMessageIds.add(messageId);

    const response: StoredResponse = {
      session_id: sessionId,
      chunk_id: chunkId,
      transcript,
      alternatives,
      latency_ms: latencyMs,
      is_final: isFinal,
      received_at: Date.now(),
      message_id: messageId,
      path: "websocket",
    };

    const key = this.getBufferKey(sessionId, chunkId);
    if (!this.websocketResponses.has(key)) {
      this.websocketResponses.set(key, []);
    }
    this.websocketResponses.get(key)!.push(response);

    // Update comparison buffer
    this.updateComparisonBuffer(sessionId, chunkId, response);
    
    this.totalLatencyWebsocket += latencyMs;
    this.totalComparisons++;
  }

  /**
   * Store a Bus response for comparison
   */
  storeBusResponse(
    sessionId: string,
    chunkId: string,
    alternatives: TranscriptAlternative[],
    latencyMs: number,
    isFinal: boolean
  ): void {
    if (!this.enabled) return;
    
    // Apply sample rate
    if (Math.random() > this.sampleRate) return;

    const transcript = alternatives[0]?.transcript || "";
    const messageId = `${sessionId}_${chunkId}_bus_${isFinal ? "final" : "partial"}`;
    
    // Check for duplicates
    if (this.seenMessageIds.has(messageId)) {
      this.duplicatesDetected++;
      this.log.logVerbose(`[Comparator] Duplicate Bus message: ${messageId}`);
      return;
    }
    this.seenMessageIds.add(messageId);

    const response: StoredResponse = {
      session_id: sessionId,
      chunk_id: chunkId,
      transcript,
      alternatives,
      latency_ms: latencyMs,
      is_final: isFinal,
      received_at: Date.now(),
      message_id: messageId,
      path: "bus",
    };

    const key = this.getBufferKey(sessionId, chunkId);
    if (!this.busResponses.has(key)) {
      this.busResponses.set(key, []);
    }
    this.busResponses.get(key)!.push(response);

    // Update comparison buffer
    this.updateComparisonBuffer(sessionId, chunkId, response);
    
    this.totalLatencyBus += latencyMs;
  }

  /**
   * Update comparison buffer and trigger comparison if both paths available
   */
  private updateComparisonBuffer(sessionId: string, chunkId: string, response: StoredResponse): void {
    const key = this.getBufferKey(sessionId, chunkId);
    const buffer = this.comparisonBuffer.get(key) || {};
    
    if (response.path === "websocket") {
      buffer.websocket = response;
    } else {
      buffer.bus = response;
    }
    
    this.comparisonBuffer.set(key, buffer);
    
    // Trigger comparison if both paths have responses
    if (buffer.websocket && buffer.bus) {
      this.performComparison(buffer.websocket, buffer.bus);
      // Clear from buffer after comparison
      this.comparisonBuffer.delete(key);
    }
  }

  /**
   * Perform comparison between WebSocket and Bus responses
   */
  private performComparison(ws: StoredResponse, bus: StoredResponse): void {
    const similarityScore = this.calculateSimilarity(ws.transcript, bus.transcript);
    const match = similarityScore >= this.similarityThreshold;
    
    const comparison: TranscriptComparison = {
      session_id: ws.session_id,
      chunk_id: ws.chunk_id,
      websocket_transcript: ws.transcript,
      bus_transcript: bus.transcript,
      match,
      similarity_score: similarityScore,
      latency_websocket_ms: ws.latency_ms,
      latency_bus_ms: bus.latency_ms,
      timestamp: new Date().toISOString(),
      transcript_type: ws.is_final ? "final" : "partial",
    };

    if (match) {
      this.transcriptMatches++;
    } else {
      this.transcriptMismatches++;
      this.logMismatch(comparison);
    }

    // Notify callbacks
    this.comparisonCallbacks.forEach(cb => cb(comparison));
    
    // Log metrics
    this.tracking.logMetric("stt.comparison.transcript", {
      session_id: ws.session_id,
      chunk_id: ws.chunk_id,
      match,
      similarity_score: similarityScore,
      latency_websocket_ms: ws.latency_ms,
      latency_bus_ms: bus.latency_ms,
      transcript_type: comparison.transcript_type,
    });
  }

  /**
   * Calculate similarity score between two transcripts using Levenshtein distance
   */
  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (!a || !b) return 0.0;
    
    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    return 1.0 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,      // insertion
            matrix[i - 1][j] + 1       // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Log mismatch details
   */
  private logMismatch(comparison: TranscriptComparison): void {
    this.log.logVerbose(`[Comparator] Transcript mismatch:`);
    this.log.logVerbose(`  Session: ${comparison.session_id}`);
    this.log.logVerbose(`  Chunk: ${comparison.chunk_id}`);
    this.log.logVerbose(`  Type: ${comparison.transcript_type}`);
    this.log.logVerbose(`  WebSocket: "${comparison.websocket_transcript}"`);
    this.log.logVerbose(`  Bus: "${comparison.bus_transcript}"`);
    this.log.logVerbose(`  Similarity: ${(comparison.similarity_score * 100).toFixed(1)}%`);
    this.log.logVerbose(`  Latency WS: ${comparison.latency_websocket_ms}ms, Bus: ${comparison.latency_bus_ms}ms`);
    
    // Log to telemetry
    this.tracking.onMismatchDetected(
      comparison.chunk_id,
      comparison.websocket_transcript,
      comparison.bus_transcript
    );
  }

  /**
   * Get buffer key for session/chunk
   */
  private getBufferKey(sessionId: string, chunkId: string): string {
    return `${sessionId}:${chunkId}`;
  }

  /**
   * Generate comparison report
   */
  generateReport(): ComparisonReport {
    const avgLatencyWebsocket = this.totalComparisons > 0 
      ? this.totalLatencyWebsocket / this.totalComparisons 
      : 0;
    const avgLatencyBus = this.totalComparisons > 0 
      ? this.totalLatencyBus / this.totalComparisons 
      : 0;
    const transcriptMatchRate = this.totalComparisons > 0 
      ? this.transcriptMatches / this.totalComparisons 
      : 0;
    const commandMatchRate = this.commandsCompared > 0
      ? this.commandMatches / this.commandsCompared
      : null;

    const report: ComparisonReport = {
      total_comparisons: this.totalComparisons,
      transcript_matches: this.transcriptMatches,
      transcript_mismatches: this.transcriptMismatches,
      commands_compared: this.commandsCompared,
      command_matches: this.commandMatches,
      command_mismatches: this.commandMismatches,
      avg_latency_websocket_ms: avgLatencyWebsocket,
      avg_latency_bus_ms: avgLatencyBus,
      duplicates_detected: this.duplicatesDetected,
      out_of_order_detected: this.outOfOrderDetected,
      transcript_match_rate: transcriptMatchRate,
      command_match_rate: commandMatchRate,
      latency_delta_avg_ms: avgLatencyBus - avgLatencyWebsocket,
      generated_at: new Date().toISOString(),
    };

    return report;
  }

  /**
   * Log the current report
   */
  logReport(): void {
    const report = this.generateReport();
    
    this.log.logVerbose(`[Comparator] === Comparison Report ===`);
    this.log.logVerbose(`  Total Comparisons: ${report.total_comparisons}`);
    this.log.logVerbose(`  Transcript Matches: ${report.transcript_matches} (${(report.transcript_match_rate * 100).toFixed(1)}%)`);
    this.log.logVerbose(`  Transcript Mismatches: ${report.transcript_mismatches}`);
    this.log.logVerbose(`  Commands Compared: ${report.commands_compared}`);
    if (report.command_match_rate !== null) {
      this.log.logVerbose(`  Command Match Rate: ${(report.command_match_rate * 100).toFixed(1)}%`);
    } else {
      this.log.logVerbose(`  Command Match Rate: N/A (Not Yet Compared)`);
    }
    this.log.logVerbose(`  Avg Latency WS: ${report.avg_latency_websocket_ms.toFixed(0)}ms`);
    this.log.logVerbose(`  Avg Latency Bus: ${report.avg_latency_bus_ms.toFixed(0)}ms`);
    this.log.logVerbose(`  Latency Delta: ${report.latency_delta_avg_ms.toFixed(0)}ms`);
    this.log.logVerbose(`  Duplicates: ${report.duplicates_detected}`);
    this.log.logVerbose(`  Out of Order: ${report.out_of_order_detected}`);
    this.log.logVerbose(`============================`);
    
    // Log metrics for telemetry
    this.tracking.logMetric("stt.comparison.report", {
      total_comparisons: report.total_comparisons,
      transcript_match_rate: report.transcript_match_rate,
      command_match_rate: report.command_match_rate === null ? -1 : report.command_match_rate,
      avg_latency_websocket_ms: report.avg_latency_websocket_ms,
      avg_latency_bus_ms: report.avg_latency_bus_ms,
      latency_delta_avg_ms: report.latency_delta_avg_ms,
      duplicates_detected: report.duplicates_detected,
      out_of_order_detected: report.out_of_order_detected,
    });
  }

  /**
   * Start periodic report generation
   */
  private startReportInterval(): void {
    this.stopReportInterval();
    this.reportInterval = setInterval(() => {
      if (this.totalComparisons > 0) {
        this.logReport();
      }
    }, this.reportIntervalSeconds * 1000);
  }

  /**
   * Stop periodic report generation
   */
  private stopReportInterval(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): {
    totalComparisons: number;
    transcriptMatches: number;
    transcriptMismatches: number;
    duplicatesDetected: number;
    enabled: boolean;
  } {
    return {
      totalComparisons: this.totalComparisons,
      transcriptMatches: this.transcriptMatches,
      transcriptMismatches: this.transcriptMismatches,
      duplicatesDetected: this.duplicatesDetected,
      enabled: this.enabled,
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.websocketResponses.clear();
    this.busResponses.clear();
    this.comparisonBuffer.clear();
    this.seenMessageIds.clear();
    this.totalComparisons = 0;
    this.transcriptMatches = 0;
    this.transcriptMismatches = 0;
    this.totalLatencyWebsocket = 0;
    this.totalLatencyBus = 0;
    this.duplicatesDetected = 0;
    this.outOfOrderDetected = 0;
    this.sessionCount = 0;
  }

  /**
   * Check if pass/fail thresholds are met
   */
  checkPassFail(): { passed: boolean; reasons: string[] } {
    const report = this.generateReport();
    const reasons: string[] = [];
    
    // Pass gates
    if (report.transcript_match_rate < 0.90) {
      reasons.push(`Transcript match rate below 90%: ${(report.transcript_match_rate * 100).toFixed(1)}%`);
    }
    if (report.latency_delta_avg_ms > 1000) {
      reasons.push(`Bus latency delta too high: ${report.latency_delta_avg_ms.toFixed(0)}ms > 1000ms`);
    }
    const duplicateRate = report.total_comparisons > 0 
      ? report.duplicates_detected / report.total_comparisons 
      : 0;
    if (duplicateRate > 0.05) {
      reasons.push(`Duplicate rate too high: ${(duplicateRate * 100).toFixed(1)}%`);
    }
    const outOfOrderRate = report.total_comparisons > 0 
      ? report.out_of_order_detected / report.total_comparisons 
      : 0;
    if (outOfOrderRate > 0.02) {
      reasons.push(`Out-of-order rate too high: ${(outOfOrderRate * 100).toFixed(1)}%`);
    }
    
    return {
      passed: reasons.length === 0,
      reasons,
    };
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    this.stopReportInterval();
    this.reset();
  }
}

/**
 * Factory function to create STTComparator instance
 */
export function createSTTComparator(
  log: Log,
  settings: Settings,
  tracking: STTTracking
): STTComparator {
  return new STTComparator(log, settings, tracking);
}
