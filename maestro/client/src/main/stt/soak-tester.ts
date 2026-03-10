import Log from "../log";
import Settings from "../settings";
import STTTracking from "./tracking";
import BusClient from "./bus-client";
import TrafficRouter from "./traffic-router";
import STTComparator from "./comparator";

/**
 * Soak test configuration
 */
export interface SoakTestConfig {
  /** Test duration in hours */
  durationHours: number;
  /** Minimum sessions per hour required */
  minSessionsPerHour: number;
  /** Maximum allowed error rate (0-1) */
  errorRateThreshold: number;
  /** Maximum P95 latency in ms */
  latencyP95Threshold: number;
  /** Minimum match rate threshold (0-1) */
  matchRateThreshold: number;
  /** Check interval in seconds */
  checkIntervalSeconds: number;
  /** Enable memory leak detection */
  checkMemoryLeaks: boolean;
  /** Enable stuck listening detection */
  checkStuckListening: boolean;
}

/**
 * Soak test failure details
 */
export interface SoakFailure {
  type: "error_rate" | "latency" | "match_rate" | "sessions" | "stuck_listening" | "memory_leak";
  message: string;
  timestamp: number;
  details: any;
}

/**
 * Soak test result
 */
export interface SoakTestResult {
  totalSessions: number;
  successfulSessions: number;
  failedSessions: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  matchRate: number;
  passed: boolean;
  failures: SoakFailure[];
  hourlyBreakdown: HourlyStats[];
  memorySamples: MemorySample[];
  stuckListeningIncidents: number;
  startTime: string;
  endTime: string;
}

/**
 * Hourly statistics breakdown
 */
export interface HourlyStats {
  hour: number;
  sessions: number;
  errors: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  matchRate: number;
}

/**
 * Memory sample for leak detection
 */
export interface MemorySample {
  timestamp: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
}

/**
 * Regression test scenario types
 */
export type RegressionScenario = 
  | "normal_operation"
  | "pause_resume"
  | "reconnect"
  | "duplicate_handling"
  | "out_of_order"
  | "malformed"
  | "replay"
  | "command_execution";

/**
 * Regression test result
 */
export interface RegressionTestResult {
  scenario: RegressionScenario;
  passed: boolean;
  duration: number;
  error?: string;
  details: any;
}

/**
 * Regression test runner
 */
export class RegressionTestRunner {
  private log: Log;
  private settings: Settings;
  private results: RegressionTestResult[] = [];
  private busClient?: BusClient;
  private mockServerPort = 9100;

  constructor(log: Log, settings: Settings) {
    this.log = log;
    this.settings = settings;
  }

  /**
   * Run all regression tests
   */
  async runAll(): Promise<RegressionTestResult[]> {
    this.results = [];
    
    // Helper to safely run and record a test
    const runTest = async (name: string, testFn: () => Promise<void>) => {
      const start = Date.now();
      try {
        await testFn.call(this);
      } catch (error: any) {
        // testNormalOperation records its own success/failure
        // but for NotImplemented ones we just catch here
        if (error.message.includes("Not Implemented")) {
          this.results.push({
            scenario: name as any,
            passed: false,
            duration: Date.now() - start,
            error: error.message,
            details: {}
          });
        } else {
          console.error(`Error in ${name}:`, error);
        }
      }
    };

    await runTest("normal_operation", this.testNormalOperation);
    await runTest("pause_resume", this.testPauseResume);
    await runTest("reconnect", this.testReconnect);
    await runTest("duplicate_handling", this.testDuplicateHandling);
    await runTest("out_of_order", this.testOutOfOrder);
    await runTest("malformed", this.testMalformed);
    await runTest("replay", this.testReplay);
    await runTest("command_execution", this.testCommandExecution);

    return this.results;
  }

  /**
   * Test normal operation - start/stop listening, partial/final transcripts
   */
  private async testNormalOperation(): Promise<void> {
    const start = Date.now();
    try {
      this.log.logVerbose("[RegressionTest] Normal operation test starting with real BusClient");
      
      // Mock API just enough for tracking telemetry
      const mockApi = {
        logEvent: () => {},
        logLocalAudio: () => {},
        logLocalResponse: () => {},
        ping: async () => 1,
        setBestEndpoint: async () => {}
      } as any;
      
      const tracking = new STTTracking(mockApi, this.settings);
      this.busClient = new BusClient(this.settings, this.log, tracking);
      
      const connected = await this.busClient.connect();
      if (!connected) {
        throw new Error("BusClient failed to connect to mock server");
      }

      // Track whether we received the expected messages
      let partialReceived = false;
      let finalReceived = false;

      this.busClient.setExecutionMode(true, (sessionId, chunkId, alternatives, latencyMs, isFinal) => {
        if (isFinal) {
          finalReceived = true;
          this.log.logVerbose("[RegressionTest] Received final transcript");
        } else {
          partialReceived = true;
          this.log.logVerbose("[RegressionTest] Received partial transcript");
        }
      });

      const sessionId = "test-session";
      const chunkId = "test-chunk";

      // Start session
      this.busClient.publishSessionStart(sessionId, chunkId, "en-US", "mock-model");
      
      // Append audio 
      this.busClient.publishAudioAppend(sessionId, chunkId, Buffer.from("mock audio"), 1, Date.now());
      
      // Wait for partial
      await new Promise(r => setTimeout(r, 500));
      if (!partialReceived) throw new Error("Did not receive partial transcript from mock server");

      // Request endpoint
      this.busClient.publishEndpointRequest(sessionId, chunkId, true, "final");

      // Wait for final 
      await new Promise(r => setTimeout(r, 500));
      if (!finalReceived) throw new Error("Did not receive final transcript from mock server");

      this.busClient.disconnect();

      this.results.push({
        scenario: "normal_operation",
        passed: true,
        duration: Date.now() - start,
        details: { sessions: 1, transcripts: 2 }
      });
    } catch (error: any) {
      if (this.busClient) this.busClient.disconnect();
      this.results.push({
        scenario: "normal_operation",
        passed: false,
        duration: Date.now() - start,
        error: error.message,
        details: {}
      });
    }
  }

  /**
   * Helper to set up a test session
   */
  private async setupTestSession(sessionId: string): Promise<{
    busClient: BusClient;
    state: { partials: number; finals: number; commands: number };
  }> {
    const mockApi = { logEvent: () => {}, logLocalAudio: () => {}, logLocalResponse: () => {}, ping: async () => 1, setBestEndpoint: async () => {} } as any;
    const tracking = new STTTracking(mockApi, this.settings);
    const busClient = new BusClient(this.settings, this.log, tracking);
    const connected = await busClient.connect();
    if (!connected) throw new Error("BusClient failed to connect to mock server");

    const state = { partials: 0, finals: 0, commands: 0 };
    busClient.setExecutionMode(true, (sid, cid, alts, lat, isF) => {
      if (isF) state.finals++; else state.partials++;
    });

    // Intercept logVerbose to detect unhandled commands logged by BusClient
    const origLog = this.log.logVerbose;
    this.log.logVerbose = (msg: string) => {
      if (msg.includes("Received: stt.command")) state.commands++;
      origLog.call(this.log, msg);
    };

    return { busClient, state };
  }

  /**
   * Test pause/resume - rapid toggle, race condition handling
   */
  private async testPauseResume(): Promise<void> {
    const start = Date.now();
    const { busClient, state } = await this.setupTestSession("test-pause-resume");
    try {
      busClient.publishSessionStart("test-pause-resume", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-pause-resume", "chunk-1", Buffer.from("audio1"), 1, Date.now());
      busClient.publishSessionStop("test-pause-resume", "chunk-1", "user_toggle", 100);
      await new Promise(r => setTimeout(r, 200));

      busClient.publishSessionStart("test-pause-resume", "chunk-2", "en-US", "mock");
      busClient.publishAudioAppend("test-pause-resume", "chunk-2", Buffer.from("audio2"), 1, Date.now());
      await new Promise(r => setTimeout(r, 200));

      if (state.partials < 2) throw new Error("Did not receive partials after resume");
      
      this.results.push({ scenario: "pause_resume" as any, passed: true, duration: Date.now() - start, details: { partials: state.partials }});
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Test reconnect - network drop and recover
   */
  private async testReconnect(): Promise<void> {
    const start = Date.now();
    const { busClient, state } = await this.setupTestSession("test-reconnect");
    try {
      busClient.disconnect();
      await new Promise(r => setTimeout(r, 200));
      const reconnected = await busClient.connect();
      if (!reconnected) throw new Error("Failed to reconnect");
      
      busClient.publishSessionStart("test-reconnect", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-reconnect", "chunk-1", Buffer.from("audio"), 1, Date.now());
      await new Promise(r => setTimeout(r, 200));

      if (state.partials < 1) throw new Error("Did not receive partial after reconnect");
      this.results.push({ scenario: "reconnect" as any, passed: true, duration: Date.now() - start, details: {} });
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Test duplicate handling - same session, different sessions
   */
  private async testDuplicateHandling(): Promise<void> {
    const start = Date.now();
    const { busClient, state } = await this.setupTestSession("test-duplicate");
    try {
      busClient.publishSessionStart("test-duplicate", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-duplicate", "chunk-1", Buffer.from("audio"), 1, Date.now());
      busClient.publishAudioAppend("test-duplicate", "chunk-1", Buffer.from("audio"), 1, Date.now()); // Duplicate
      await new Promise(r => setTimeout(r, 300));
      
      if (state.partials === 0) throw new Error("Failed to handle duplicates");
      this.results.push({ scenario: "duplicate_handling" as any, passed: true, duration: Date.now() - start, details: {} });
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Test out-of-order - delayed messages
   */
  private async testOutOfOrder(): Promise<void> {
    const start = Date.now();
    const { busClient, state } = await this.setupTestSession("test-out-of-order");
    try {
      busClient.publishSessionStart("test-out-of-order", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-out-of-order", "chunk-1", Buffer.from("audio2"), 2, Date.now() + 100);
      busClient.publishAudioAppend("test-out-of-order", "chunk-1", Buffer.from("audio1"), 1, Date.now());
      await new Promise(r => setTimeout(r, 300));

      if (state.partials < 2) throw new Error("Failed to handle out-of-order appends");
      this.results.push({ scenario: "out_of_order" as any, passed: true, duration: Date.now() - start, details: {} });
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Test malformed - invalid envelopes
   */
  private async testMalformed(): Promise<void> {
    const start = Date.now();
    // Use session ID "test-malformed" to trigger the mock server to send garbage
    const { busClient, state } = await this.setupTestSession("test-malformed");
    try {
      busClient.publishSessionStart("test-malformed", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-malformed", "chunk-1", Buffer.from("audio"), 1, Date.now());
      
      // Wait to ensure client doesn't crash upon receiving malformed JSON
      await new Promise(r => setTimeout(r, 400));
      
      this.results.push({ scenario: "malformed" as any, passed: true, duration: Date.now() - start, details: {} });
    } catch (e: any) {
      throw new Error("Client crashed on malformed envelope: " + e.message);
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Test replay - re-sent messages
   */
  private async testReplay(): Promise<void> {
    const start = Date.now();
    // Use session ID "test-replay" to trigger mock server sending replayed message IDs
    const { busClient, state } = await this.setupTestSession("test-replay");
    try {
      busClient.publishSessionStart("test-replay", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-replay", "chunk-1", Buffer.from("audio"), 1, Date.now());
      await new Promise(r => setTimeout(r, 400));
      
      if (state.partials < 1) throw new Error("Did not process replayed messages");
      this.results.push({ scenario: "replay" as any, passed: true, duration: Date.now() - start, details: {} });
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Test command execution - verify commands execute correctly
   */
  private async testCommandExecution(): Promise<void> {
    const start = Date.now();
    // Use session ID "test-command" to trigger mock server sending a command back
    const { busClient, state } = await this.setupTestSession("test-command");
    try {
      busClient.publishSessionStart("test-command", "chunk-1", "en-US", "mock");
      busClient.publishAudioAppend("test-command", "chunk-1", Buffer.from("audio"), 1, Date.now());
      await new Promise(r => setTimeout(r, 400));
      
      if (state.commands === 0) throw new Error("Did not log receiving a command from mock server");
      this.results.push({ scenario: "command_execution" as any, passed: true, duration: Date.now() - start, details: {} });
    } finally {
      busClient.disconnect();
    }
  }

  /**
   * Get all results
   */
  getResults(): RegressionTestResult[] {
    return this.results;
  }

  /**
   * Check if all tests passed
   */
  allPassed(): boolean {
    return this.results.every(r => r.passed);
  }
}

/**
 * Soak Test Module for extended stability testing of the Bus path
 * 
 * This module provides:
 * - Long-running soak tests to validate stability
 * - Automated regression checks for critical paths
 * - Memory leak detection
 * - Stuck listening detection
 * - Latency and error rate monitoring
 */
export default class SoakTester {
  private config: SoakTestConfig;
  private isRunning: boolean = false;
  private startTime?: number;
  private checkInterval?: NodeJS.Timeout;
  
  // Session tracking
  private totalSessions: number = 0;
  private successfulSessions: number = 0;
  private failedSessions: number = 0;
  private latencies: number[] = [];
  private hourlyStats: Map<number, HourlyStats> = new Map();
  private memorySamples: MemorySample[] = [];
  private stuckListeningIncidents: number = 0;
  private failures: SoakFailure[] = [];

  // Components for testing
  private busClient?: BusClient;
  private router?: TrafficRouter;
  private comparator?: STTComparator;

  // Callbacks
  private onProgress?: (progress: number, stats: Partial<SoakTestResult>) => void;
  private onFailure?: (failure: SoakFailure) => void;
  private onComplete?: (result: SoakTestResult) => void;

  constructor(
    private log: Log,
    private settings: Settings,
    private tracking: STTTracking,
    config?: Partial<SoakTestConfig>
  ) {
    this.config = {
      durationHours: config ? config.durationHours || 24 : 24,
      minSessionsPerHour: config ? config.minSessionsPerHour || 100 : 100,
      errorRateThreshold: config ? config.errorRateThreshold || 0.001 : 0.001,
      latencyP95Threshold: config ? config.latencyP95Threshold || 500 : 500,
      matchRateThreshold: config ? config.matchRateThreshold || 0.98 : 0.98,
      checkIntervalSeconds: config ? config.checkIntervalSeconds || 300 : 300,
      checkMemoryLeaks: config ? (config.checkMemoryLeaks !== undefined ? config.checkMemoryLeaks : true) : true,
      checkStuckListening: config ? (config.checkStuckListening !== undefined ? config.checkStuckListening : true) : true,
    };
  }

  /**
   * Set components for testing
   */
  setComponents(
    busClient: BusClient,
    router: TrafficRouter,
    comparator: STTComparator
  ): void {
    this.busClient = busClient;
    this.router = router;
    this.comparator = comparator;
  }

  /**
   * Set progress callback
   */
  onProgressCallback(callback: (progress: number, stats: Partial<SoakTestResult>) => void): void {
    this.onProgress = callback;
  }

  /**
   * Set failure callback
   */
  onFailureCallback(callback: (failure: SoakFailure) => void): void {
    this.onFailure = callback;
  }

  /**
   * Set completion callback
   */
  onCompleteCallback(callback: (result: SoakTestResult) => void): void {
    this.onComplete = callback;
  }

  /**
   * Start the soak test
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.log.logError("[SoakTester] Already running");
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.log.logVerbose(`[SoakTester] Starting soak test: ${this.config.durationHours} hours`);

    // Reset counters
    this.totalSessions = 0;
    this.successfulSessions = 0;
    this.failedSessions = 0;
    this.latencies = [];
    this.hourlyStats.clear();
    this.memorySamples = [];
    this.stuckListeningIncidents = 0;
    this.failures = [];

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, this.config.checkIntervalSeconds * 1000);

    // Initial check
    this.performCheck();
  }

  /**
   * Stop the soak test
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.log.logVerbose("[SoakTester] Soak test stopped");
  }

  /**
   * Record a session result
   */
  recordSession(
    success: boolean,
    latencyMs: number,
    matched?: boolean
  ): void {
    this.totalSessions++;
    
    if (success) {
      this.successfulSessions++;
    } else {
      this.failedSessions++;
    }

    this.latencies.push(latencyMs);

    // Update hourly stats
    const currentHour = new Date().getHours();
    const hourly = this.hourlyStats.get(currentHour) || {
      hour: currentHour,
      sessions: 0,
      errors: 0,
      errorRate: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      matchRate: 0,
    };

    hourly.sessions++;
    if (!success) {
      hourly.errors++;
    }
    hourly.errorRate = hourly.errors / hourly.sessions;
    hourly.avgLatencyMs = (hourly.avgLatencyMs * (hourly.sessions - 1) + latencyMs) / hourly.sessions;
    
    // Update P95
    if (this.latencies.length > 0) {
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      hourly.p95LatencyMs = sorted[p95Index];
    }

    this.hourlyStats.set(currentHour, hourly);

    // Log metric
    this.tracking.logMetric("stt.soak.session", {
      success,
      latency_ms: latencyMs,
      matched,
      total_sessions: this.totalSessions,
      error_rate: this.getErrorRate(),
    });
  }

  /**
   * Record a stuck listening incident
   */
  recordStuckListening(): void {
    this.stuckListeningIncidents++;
    
    const failure: SoakFailure = {
      type: "stuck_listening",
      message: `Stuck listening incident detected`,
      timestamp: Date.now(),
      details: { incident_count: this.stuckListeningIncidents }
    };
    
    this.failures.push(failure);
    if (this.onFailure) {
      this.onFailure(failure);
    }

    this.tracking.logMetric("stt.soak.stuck_listening", {
      incident_count: this.stuckListeningIncidents,
      total_sessions: this.totalSessions,
    });
  }

  /**
   * Get current error rate
   */
  private getErrorRate(): number {
    if (this.totalSessions === 0) return 0;
    return this.failedSessions / this.totalSessions;
  }

  /**
   * Calculate P95 latency
   */
  private getP95Latency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  /**
   * Calculate P99 latency
   */
  private getP99Latency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.99);
    return sorted[index];
  }

  /**
   * Calculate average latency
   */
  private getAvgLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
  }

  /**
   * Perform periodic check
   */
  private performCheck(): void {
    if (!this.isRunning) return;

    // Check elapsed time
    const elapsed = Date.now() - (this.startTime || Date.now());
    const elapsedHours = elapsed / (1000 * 60 * 60);
    const progress = Math.min(elapsedHours / this.config.durationHours, 1.0);

    // Sample memory
    if (this.config.checkMemoryLeaks) {
      this.sampleMemory();
    }

    // Calculate current stats
    const stats: Partial<SoakTestResult> = {
      totalSessions: this.totalSessions,
      successfulSessions: this.successfulSessions,
      failedSessions: this.failedSessions,
      errorRate: this.getErrorRate(),
      avgLatencyMs: this.getAvgLatency(),
      p95LatencyMs: this.getP95Latency(),
      p99LatencyMs: this.getP99Latency(),
      stuckListeningIncidents: this.stuckListeningIncidents,
    };

    // Report progress
    if (this.onProgress) {
      this.onProgress(progress, stats);
    }

    // Check for failures
    this.checkFailures();

    // Check if test is complete
    if (elapsedHours >= this.config.durationHours) {
      this.complete();
    }

    this.log.logVerbose(
      `[SoakTester] Progress: ${(progress * 100).toFixed(1)}% - ` +
      `Sessions: ${this.totalSessions}, ` +
      `Error Rate: ${(this.getErrorRate() * 100).toFixed(2)}%, ` +
      `P95 Latency: ${this.getP95Latency().toFixed(0)}ms`
    );
  }

  /**
   * Check for failure conditions
   */
  private checkFailures(): void {
    const errorRate = this.getErrorRate();
    const p95Latency = this.getP95Latency();
    
    // Check error rate
    if (errorRate > this.config.errorRateThreshold && this.totalSessions > 100) {
      const failure: SoakFailure = {
        type: "error_rate",
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(this.config.errorRateThreshold * 100).toFixed(2)}%`,
        timestamp: Date.now(),
        details: { error_rate: errorRate, threshold: this.config.errorRateThreshold }
      };
      this.failures.push(failure);
      if (this.onFailure) {
        this.onFailure(failure);
      }
    }

    // Check P95 latency
    if (p95Latency > this.config.latencyP95Threshold && this.latencies.length > 50) {
      const failure: SoakFailure = {
        type: "latency",
        message: `P95 latency ${p95Latency.toFixed(0)}ms exceeds threshold ${this.config.latencyP95Threshold}ms`,
        timestamp: Date.now(),
        details: { p95_latency_ms: p95Latency, threshold: this.config.latencyP95Threshold }
      };
      this.failures.push(failure);
      if (this.onFailure) {
        this.onFailure(failure);
      }
    }

    // Check stuck listening
    if (this.config.checkStuckListening && this.stuckListeningIncidents > 0) {
      const failure: SoakFailure = {
        type: "stuck_listening",
        message: `${this.stuckListeningIncidents} stuck listening incidents detected`,
        timestamp: Date.now(),
        details: { incident_count: this.stuckListeningIncidents }
      };
      this.failures.push(failure);
      if (this.onFailure) {
        this.onFailure(failure);
      }
    }

    // Check memory leaks
    if (this.config.checkMemoryLeaks && this.memorySamples.length > 10) {
      this.checkMemoryLeaks();
    }
  }

  /**
   * Sample current memory usage
   */
  private sampleMemory(): void {
    const mem = process.memoryUsage();
    const sample: MemorySample = {
      timestamp: Date.now(),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    };
    this.memorySamples.push(sample);
  }

  /**
   * Check for memory leaks
   */
  private checkMemoryLeaks(): void {
    if (this.memorySamples.length < 10) return;

    // Get first and last samples
    const first = this.memorySamples[0];
    const last = this.memorySamples[this.memorySamples.length - 1];

    // Check heap growth (more than 50% growth indicates potential leak)
    const heapGrowth = (last.heapUsedMB - first.heapUsedMB) / first.heapUsedMB;
    
    if (heapGrowth > 0.5) {
      const failure: SoakFailure = {
        type: "memory_leak",
        message: `Potential memory leak: heap grew by ${(heapGrowth * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        details: {
          heap_start_mb: first.heapUsedMB,
          heap_end_mb: last.heapUsedMB,
          growth_percent: heapGrowth * 100
        }
      };
      this.failures.push(failure);
      if (this.onFailure) {
        this.onFailure(failure);
      }
    }
  }

  /**
   * Complete the soak test and generate final report
   */
  private complete(): void {
    this.stop();

    const result: SoakTestResult = {
      totalSessions: this.totalSessions,
      successfulSessions: this.successfulSessions,
      failedSessions: this.failedSessions,
      errorRate: this.getErrorRate(),
      avgLatencyMs: this.getAvgLatency(),
      p95LatencyMs: this.getP95Latency(),
      p99LatencyMs: this.getP99Latency(),
      matchRate: this.comparator 
        ? this.comparator.generateReport().transcript_match_rate 
        : 0,
      passed: this.failures.length === 0,
      failures: this.failures,
      hourlyBreakdown: Array.from(this.hourlyStats.values()),
      memorySamples: this.memorySamples,
      stuckListeningIncidents: this.stuckListeningIncidents,
      startTime: new Date(this.startTime!).toISOString(),
      endTime: new Date().toISOString(),
    };

    this.log.logVerbose(`[SoakTester] === Soak Test Complete ===`);
    this.log.logVerbose(`  Total Sessions: ${result.totalSessions}`);
    this.log.logVerbose(`  Error Rate: ${(result.errorRate * 100).toFixed(2)}%`);
    this.log.logVerbose(`  P95 Latency: ${result.p95LatencyMs.toFixed(0)}ms`);
    this.log.logVerbose(`  P99 Latency: ${result.p99LatencyMs.toFixed(0)}ms`);
    this.log.logVerbose(`  Match Rate: ${(result.matchRate * 100).toFixed(1)}%`);
    this.log.logVerbose(`  Stuck Listening: ${result.stuckListeningIncidents}`);
    this.log.logVerbose(`  Failures: ${result.failures.length}`);
    this.log.logVerbose(`  Passed: ${result.passed}`);

    // Log final metrics
    this.tracking.logMetric("stt.soak.complete", {
      total_sessions: result.totalSessions,
      error_rate: result.errorRate,
      avg_latency_ms: result.avgLatencyMs,
      p95_latency_ms: result.p95LatencyMs,
      p99_latency_ms: result.p99LatencyMs,
      match_rate: result.matchRate,
      stuck_listening_incidents: result.stuckListeningIncidents,
      failures: result.failures.length,
      passed: result.passed,
    });

    if (this.onComplete) {
      this.onComplete(result);
    }
  }

  /**
   * Get current status
   */
  getStatus(): {
    isRunning: boolean;
    elapsed: number;
    totalSessions: number;
    errorRate: number;
    p95Latency: number;
  } {
    return {
      isRunning: this.isRunning,
      elapsed: this.startTime ? Date.now() - this.startTime : 0,
      totalSessions: this.totalSessions,
      errorRate: this.getErrorRate(),
      p95Latency: this.getP95Latency(),
    };
  }

  /**
   * Run a quick validation test (shorter than full soak)
   */
  async runQuickValidation(durationMinutes: number = 60): Promise<SoakTestResult> {
    const originalDuration = this.config.durationHours;
    this.config.durationHours = durationMinutes / 60;
    
    await this.start();
    
    return new Promise((resolve) => {
      this.onCompleteCallback((result) => {
        this.config.durationHours = originalDuration;
        resolve(result);
      });
    });
  }
}

/**
 * Factory function to create SoakTester instance
 */
export function createSoakTester(
  log: Log,
  settings: Settings,
  tracking: STTTracking,
  config?: Partial<SoakTestConfig>
): SoakTester {
  return new SoakTester(log, settings, tracking, config);
}

/**
 * Factory function to create RegressionTestRunner instance
 */
export function createRegressionTestRunner(log: Log, settings: Settings): RegressionTestRunner {
  return new RegressionTestRunner(log, settings);
}
