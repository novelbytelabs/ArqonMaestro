import Log from "../log";
import Settings from "../settings";
import { TranscriptComparison, ComparisonReport } from "./comparator";

/**
 * Mismatch details for debugging
 */
export interface MismatchDetails {
  id: string;
  timestamp: string;
  session_id: string;
  chunk_id: string;
  transcript_type: "partial" | "final";
  websocket_transcript: string;
  bus_transcript: string;
  similarity_score: number;
  latency_websocket_ms: number;
  latency_bus_ms: number;
  latency_delta_ms: number;
  category: MismatchCategory;
}

/**
 * Categories of mismatches for pattern analysis
 */
export type MismatchCategory = 
  | "exact_text"
  | "minor_difference"
  | "significant_difference"
  | "timing_issue"
  | "partial_vs_final"
  | "missing_bus"
  | "missing_websocket";

/**
 * Mismatch pattern analysis
 */
export interface MismatchPattern {
  category: MismatchCategory;
  count: number;
  percentage: number;
  examples: MismatchDetails[];
}

/**
 * Detailed report for debugging
 */
export interface DetailedReport {
  summary: ComparisonReport;
  mismatches: MismatchDetails[];
  patterns: MismatchPattern[];
  latency_histogram: LatencyHistogram;
  generated_at: string;
  exported_at?: string;
}

/**
 * Latency histogram buckets
 */
export interface LatencyHistogram {
  websocket: { [bucket: string]: number };
  bus: { [bucket: string]: number };
  delta: { [bucket: string]: number };
}

/**
 * Configuration for mismatch reporter
 */
export interface MismatchReporterConfig {
  maxStoredMismatches: number;
  maxExamplesPerPattern: number;
  histogramBuckets: number[];
}

/**
 * Callback for mismatch notifications
 */
type MismatchCallback = (mismatch: MismatchDetails) => void;

/**
 * Mismatch Reporter for aggregating and analyzing comparison mismatches
 * 
 * This module aggregates mismatch data, generates detailed reports,
 * and supports export in JSON format for analysis.
 */
export default class MismatchReporter {
  private mismatches: MismatchDetails[] = [];
  private callbacks: MismatchCallback[] = [];
  private config: MismatchReporterConfig;
  
  // Pattern counters
  private patternCounts: Map<MismatchCategory, number> = new Map();
  
  // Latency tracking for histograms
  private websocketLatencies: number[] = [];
  private busLatencies: number[] = [];
  private latencyDeltas: number[] = [];

  constructor(
    private log: Log,
    private settings: Settings
  ) {
    this.config = {
      maxStoredMismatches: 1000,
      maxExamplesPerPattern: 5,
      histogramBuckets: [0, 100, 200, 300, 500, 1000, 2000, 5000],
    };
    
    // Initialize pattern counters
    const categories: MismatchCategory[] = [
      "exact_text",
      "minor_difference",
      "significant_difference",
      "timing_issue",
      "partial_vs_final",
      "missing_bus",
      "missing_websocket",
    ];
    categories.forEach(cat => this.patternCounts.set(cat, 0));
  }

  /**
   * Register a callback for mismatch notifications
   */
  onMismatch(callback: MismatchCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Record a comparison mismatch
   */
  recordMismatch(comparison: TranscriptComparison): void {
    const latencyDelta = comparison.latency_bus_ms - comparison.latency_websocket_ms;
    
    // Categorize the mismatch
    const category = this.categorizeMismatch(comparison, latencyDelta);
    
    const mismatch: MismatchDetails = {
      id: `mismatch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: comparison.timestamp,
      session_id: comparison.session_id,
      chunk_id: comparison.chunk_id,
      transcript_type: comparison.transcript_type,
      websocket_transcript: comparison.websocket_transcript,
      bus_transcript: comparison.bus_transcript,
      similarity_score: comparison.similarity_score,
      latency_websocket_ms: comparison.latency_websocket_ms,
      latency_bus_ms: comparison.latency_bus_ms,
      latency_delta_ms: latencyDelta,
      category,
    };

    // Store mismatch
    this.mismatches.push(mismatch);
    
    // Trim if exceeding max
    if (this.mismatches.length > this.config.maxStoredMismatches) {
      this.mismatches = this.mismatches.slice(-this.config.maxStoredMismatches);
    }

    // Update pattern count
    this.patternCounts.set(category, (this.patternCounts.get(category) || 0) + 1);
    
    // Track latencies for histogram
    this.websocketLatencies.push(comparison.latency_websocket_ms);
    this.busLatencies.push(comparison.latency_bus_ms);
    this.latencyDeltas.push(latencyDelta);

    // Log mismatch
    this.log.logVerbose(`[MismatchReporter] Recorded mismatch: ${category} - similarity: ${(comparison.similarity_score * 100).toFixed(1)}%`);
    
    // Notify callbacks
    this.callbacks.forEach(cb => cb(mismatch));
  }

  /**
   * Categorize a mismatch based on characteristics
   */
  private categorizeMismatch(
    comparison: TranscriptComparison,
    latencyDelta: number
  ): MismatchCategory {
    const similarity = comparison.similarity_score;
    
    // Check if timing is the issue
    if (Math.abs(latencyDelta) > 500) {
      return "timing_issue";
    }
    
    // Categorize by similarity
    if (similarity >= 1.0) {
      return "exact_text";
    } else if (similarity >= 0.95) {
      return "minor_difference";
    } else if (similarity >= 0.80) {
      return "significant_difference";
    } else if (comparison.transcript_type === "partial") {
      return "partial_vs_final";
    }
    
    return "significant_difference";
  }

  /**
   * Get all recorded mismatches
   */
  getMismatches(): MismatchDetails[] {
    return [...this.mismatches];
  }

  /**
   * Get mismatches for a specific session
   */
  getMismatchesBySession(sessionId: string): MismatchDetails[] {
    return this.mismatches.filter(m => m.session_id === sessionId);
  }

  /**
   * Get mismatches for a specific chunk
   */
  getMismatchesByChunk(chunkId: string): MismatchDetails[] {
    return this.mismatches.filter(m => m.chunk_id === chunkId);
  }

  /**
   * Generate pattern analysis
   */
  generatePatterns(): MismatchPattern[] {
    const patterns: MismatchPattern[] = [];
    const totalMismatches = this.mismatches.length;
    
    if (totalMismatches === 0) {
      return patterns;
    }

    this.patternCounts.forEach((count, category) => {
      if (count > 0) {
        const examples = this.getMismatchesByCategory(category)
          .slice(0, this.config.maxExamplesPerPattern);
        
        patterns.push({
          category,
          count,
          percentage: (count / totalMismatches) * 100,
          examples,
        });
      }
    });

    // Sort by count descending
    patterns.sort((a, b) => b.count - a.count);
    
    return patterns;
  }

  /**
   * Get mismatches by category
   */
  getMismatchesByCategory(category: MismatchCategory): MismatchDetails[] {
    return this.mismatches.filter(m => m.category === category);
  }

  /**
   * Generate latency histogram
   */
  generateLatencyHistogram(): LatencyHistogram {
    const histogram: LatencyHistogram = {
      websocket: {},
      bus: {},
      delta: {},
    };

    // Generate buckets for websocket
    this.config.histogramBuckets.forEach((bucket, i) => {
      const nextBucket = this.config.histogramBuckets[i + 1];
      if (nextBucket !== undefined) {
        const count = this.websocketLatencies.filter(
          l => l >= bucket && l < nextBucket
        ).length;
        histogram.websocket[`${bucket}-${nextBucket}`] = count;
      } else {
        const count = this.websocketLatencies.filter(l => l >= bucket).length;
        histogram.websocket[`${bucket}+`] = count;
      }
    });

    // Generate buckets for bus
    this.config.histogramBuckets.forEach((bucket, i) => {
      const nextBucket = this.config.histogramBuckets[i + 1];
      if (nextBucket !== undefined) {
        const count = this.busLatencies.filter(
          l => l >= bucket && l < nextBucket
        ).length;
        histogram.bus[`${bucket}-${nextBucket}`] = count;
      } else {
        const count = this.busLatencies.filter(l => l >= bucket).length;
        histogram.bus[`${bucket}+`] = count;
      }
    });

    // Generate buckets for delta
    const deltaBuckets = [-1000, -500, -200, 0, 200, 500, 1000, 5000];
    deltaBuckets.forEach((bucket, i) => {
      const nextBucket = deltaBuckets[i + 1];
      if (nextBucket !== undefined) {
        const count = this.latencyDeltas.filter(
          l => l >= bucket && l < nextBucket
        ).length;
        histogram.delta[`${bucket}_${nextBucket}`] = count;
      } else {
        const count = this.latencyDeltas.filter(l => l >= bucket).length;
        histogram.delta[`${bucket}+`] = count;
      }
    });

    return histogram;
  }

  /**
   * Generate detailed report
   */
  generateDetailedReport(summary: ComparisonReport): DetailedReport {
    return {
      summary,
      mismatches: this.getMismatches(),
      patterns: this.generatePatterns(),
      latency_histogram: this.generateLatencyHistogram(),
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Export report as JSON string
   */
  exportToJSON(summary: ComparisonReport): string {
    const report = this.generateDetailedReport(summary);
    report.exported_at = new Date().toISOString();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report to file (returns JSON string for logging)
   */
  exportReport(summary: ComparisonReport): string {
    const json = this.exportToJSON(summary);
    
    this.log.logVerbose(`[MismatchReporter] Report exported (${json.length} bytes)`);
    this.log.logVerbose(`[MismatchReporter] Total mismatches: ${this.mismatches.length}`);
    this.log.logVerbose(`[MismatchReporter] Patterns:`);
    
    const patterns = this.generatePatterns();
    patterns.forEach(p => {
      this.log.logVerbose(`  ${p.category}: ${p.count} (${p.percentage.toFixed(1)}%)`);
    });
    
    return json;
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    totalMismatches: number;
    patterns: { category: MismatchCategory; count: number }[];
    avgSimilarity: number;
    avgLatencyDelta: number;
  } {
    const patterns: { category: MismatchCategory; count: number }[] = [];
    this.patternCounts.forEach((count, category) => {
      patterns.push({ category, count });
    });

    const avgSimilarity = this.mismatches.length > 0
      ? this.mismatches.reduce((sum, m) => sum + m.similarity_score, 0) / this.mismatches.length
      : 1.0;

    const avgLatencyDelta = this.latencyDeltas.length > 0
      ? this.latencyDeltas.reduce((sum, d) => sum + d, 0) / this.latencyDeltas.length
      : 0;

    return {
      totalMismatches: this.mismatches.length,
      patterns,
      avgSimilarity,
      avgLatencyDelta,
    };
  }

  /**
   * Clear stored mismatches
   */
  clear(): void {
    this.mismatches = [];
    this.patternCounts.forEach((_, key) => this.patternCounts.set(key, 0));
    this.websocketLatencies = [];
    this.busLatencies = [];
    this.latencyDeltas = [];
  }

  /**
   * Get critical mismatches (low similarity or high latency delta)
   */
  getCriticalMismatches(): MismatchDetails[] {
    return this.mismatches.filter(
      m => m.similarity_score < 0.80 || Math.abs(m.latency_delta_ms) > 1000
    );
  }

  /**
   * Check if there are critical mismatches
   */
  hasCriticalMismatches(): boolean {
    return this.getCriticalMismatches().length > 0;
  }
}

/**
 * Factory function to create MismatchReporter instance
 */
export function createMismatchReporter(
  log: Log,
  settings: Settings
): MismatchReporter {
  return new MismatchReporter(log, settings);
}
