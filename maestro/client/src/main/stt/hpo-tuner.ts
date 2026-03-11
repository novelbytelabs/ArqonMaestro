import { spawn, ChildProcess } from "child_process";
import * as http from "http";
import Settings from "../settings";
import Log from "../log";
import STTTracking, { STTScenarioClass, classifyTranscript } from "./tracking";

const HPO_PORT = 7782;

interface TuningCandidate {
  arqon_tts_kokoro_timeout_ms: number;
  chunk_silence_threshold: number;
  chunk_speech_threshold: number;
  execute_silence_threshold: number;
  arqon_bus_compare_threshold: number;
}

interface HpoBounds {
  min: number;
  max: number;
  scale?: "Linear" | "Log";
}

interface HpoConfig {
  seed: number;
  budget: number;
  bounds: Record<string, HpoBounds>;
}

export default class HPOTuner {
  private serviceProcess: ChildProcess | null = null;
  private isReady = false;
  private settings: Settings;
  private log: Log;
  private tracking: STTTracking;

  // State sliding windows
  private ackShortLatencies: number[] = [];
  private recentFailures = 0;
  private maxLatenciesWindow = 20;

  // Actuation safety state
  private lastActuationTime = 0;
  private readonly COOLDOWN_MS = 15000;
  private lastBaselineConfig: TuningCandidate | null = null;

  constructor(settings: Settings, log: Log, tracking: STTTracking) {
    this.settings = settings;
    this.log = log;
    this.tracking = tracking;
  }

  async start(): Promise<void> {
    if (!this.settings.getArqonHpoHomeostasisEnabled()) {
      this.log.logVerbose("[HPOTuner] Homeostasis is disabled. Not starting service.");
      return;
    }

    this.log.logVerbose(`[HPOTuner] Starting Python HPO service on port ${HPO_PORT}...`);
    // Run via the specified conda env
    this.serviceProcess = spawn(
      "/home/irbsurfer/miniconda3/envs/helios-gpu-118/bin/python",
      ["src/main/stt/hpo-service.py", HPO_PORT.toString()],
      { cwd: process.cwd() } // Depends on where ran from; standard Maestro client
    );

    if (this.serviceProcess.stdout) {
      this.serviceProcess.stdout.on("data", (data) => {
        this.log.logVerbose(`[HPO Service] ${data.toString().trim()}`);
      });
    }

    if (this.serviceProcess.stderr) {
      this.serviceProcess.stderr.on("data", (data) => {
        this.log.logError(`[HPO Service Err] ${data.toString().trim()}`);
      });
    }

    this.serviceProcess.on("close", (code) => {
      this.log.logError(`[HPOTuner] Service exited with code ${code}`);
      this.isReady = false;
    });

    this.isReady = await this.waitForReady();

    if (this.isReady) {
      await this.initializeSolver();
      // Record baseline
      this.lastBaselineConfig = this.getCurrentConfig();
    }
  }

  stop(): void {
    if (this.serviceProcess && !this.serviceProcess.killed) {
      this.log.logVerbose("[HPOTuner] Stopping python service...");
      this.serviceProcess.kill();
    }
    this.isReady = false;
  }

  private waitForReady(timeoutMs = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          this.log.logError("[HPOTuner] Timeout waiting for Python service readyz.");
          resolve(false);
          return;
        }

        const req = http.get(`http://127.0.0.1:${HPO_PORT}/readyz`, (res) => {
          if (res.statusCode === 200) {
            clearInterval(interval);
            resolve(true);
          }
        });
        req.on("error", () => {}); // Ignore connection refused while starting up
      }, 500);
    });
  }

  private async postJson(endpoint: string, body: any): Promise<any> {
    const payload = JSON.stringify(body);
    const options = {
      hostname: "127.0.0.1",
      port: HPO_PORT,
      path: endpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
            return;
          }
          try {
            resolve(responseBody ? JSON.parse(responseBody) : {});
          } catch (e: any) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }

  private async initializeSolver() {
    // Defines the tuning surface max/min per gate 6b
    const config: HpoConfig = {
      seed: 42,
      budget: 1000,
      bounds: {
        chunk_silence_threshold: { min: 50, max: 2000 },
        chunk_speech_threshold: { min: 10, max: 500 },
        execute_silence_threshold: { min: 300, max: 4000 },
        arqon_bus_compare_threshold: { min: 0.5, max: 1.0 },
      },
    };
    await this.postJson("/init", config);
  }

  getCurrentConfig(): TuningCandidate {
    // Note settings might not have getters implemented for all so defaults used
    return {
      arqon_tts_kokoro_timeout_ms: 10000,
      chunk_silence_threshold: this.settings.getChunkSilenceThreshold(),
      chunk_speech_threshold: this.settings.getChunkSpeechThreshold(),
      execute_silence_threshold: this.settings.getExecuteSilenceThreshold(),
      arqon_bus_compare_threshold: this.settings.getArqonBusCompareThreshold(),
    };
  }

  // Actuation Loop functions
  
  /**
   * Objective Function Computation
   */
  private computeLoss(): number | null {
    if (this.ackShortLatencies.length === 0) return null;
    
    // Sort and calculate p95
    const latencies = [...this.ackShortLatencies].sort((a,b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);
    const p95Ttfa = latencies[p95Idx];
    
    // loss = 0.50*p95_ack_tts_ttfa + failure_penalty
    let loss = p95Ttfa * 0.5;
    
    // Penalty for recent failures (e.g. Kokoro crash or timeout resulting in fail-closed/fallback)
    if (this.recentFailures > 0) {
      loss += (this.recentFailures * 10000); 
    }
    
    return loss;
  }

  public recordTelemetry(scenario: STTScenarioClass, ttfaMs: number, success: boolean) {
    if (!this.settings.getArqonHpoHomeostasisEnabled()) return;

    if (!success) {
      this.recentFailures++;
    } else if (scenario === "ack_short") {
      this.ackShortLatencies.push(ttfaMs);
      if (this.ackShortLatencies.length > this.maxLatenciesWindow) {
        this.ackShortLatencies.shift();
      }
    }
  }

  private isSafeToActuate(candidate: TuningCandidate): { safe: boolean; reason?: string } {
    const current = this.getCurrentConfig();
    const now = Date.now();

    // 1. Cooldown
    if (now - this.lastActuationTime < this.COOLDOWN_MS) {
      return { safe: false, reason: "cooldown_active" };
    }

    // 2. Max delta enforcement (e.g., don't jump more than 10% or absolute thresholds)
    // To simplify, ensuring thresholds do not invert
    if (candidate.execute_silence_threshold <= candidate.chunk_silence_threshold) {
      return { safe: false, reason: "execute_silence <= chunk_silence" };
    }

    return { safe: true };
  }

  public applyRollback(): void {
    if (this.lastBaselineConfig) {
      this.log.logVerbose("[HPOTuner] Rollback triggered, restoring last baseline configuration");
      this.applyCandidate(this.lastBaselineConfig, true);
    }
  }

  private applyCandidate(candidate: TuningCandidate, force: boolean = false) {
    if (!force) {
      const safety = this.isSafeToActuate(candidate);
      if (!safety.safe) {
        this.log.logVerbose(`[HPOTuner] Actuation blocked by guardrails: ${safety.reason}`);
        this.tracking.logMetric("stt.hpo.actuate_blocked", { reason: safety.reason });
        return;
      }
    }

    const dryRun = this.settings.getArqonHpoDryRun();
    this.tracking.logMetric("stt.hpo.actuate", { dryRun, candidate });

    if (!dryRun) {
      // Need setter for this one or assume it acts purely via observation layer
      // this.settings.set("system", "arqon_tts_kokoro_timeout_ms", candidate.arqon_tts_kokoro_timeout_ms);
      this.settings.setChunkSilenceThreshold(candidate.chunk_silence_threshold);
      this.settings.setChunkSpeechThreshold(candidate.chunk_speech_threshold);
      this.settings.setExecuteSilenceThreshold(candidate.execute_silence_threshold);
      this.settings.setArqonBusCompareThreshold(candidate.arqon_bus_compare_threshold);
      this.lastActuationTime = Date.now();
    } else {
      this.log.logVerbose("[HPOTuner] Dry-run actuate - skipping runtime state mutation.");
    }
  }

  public async runLoopCycle(): Promise<void> {
    if (!this.isReady || !this.settings.getArqonHpoHomeostasisEnabled()) return;

    try {
      const loss = this.computeLoss();

      // Seed current state into HPO history
      if (loss !== null) {
        const currentParams = this.getCurrentConfig();
        const seedPayload = {
          params: currentParams,
          value: loss,
          cost: 1.0,
        };
        const seedRes = await this.postJson("/seed", seedPayload);
        this.log.logVerbose(`[HPOTuner] Seeded loss=${loss}. history_len=${seedRes.history_len}`);
      }

      // Propose new candidate
      const askRes = await this.postJson("/ask_one", {});
      if (askRes.candidate) {
        this.log.logVerbose(`[HPOTuner] Proposed candidate: ${JSON.stringify(askRes.candidate)}`);
        this.applyCandidate(askRes.candidate as TuningCandidate);
      }
      
      // Reset window metrics after evaluation epoch
      this.recentFailures = 0;
      
    } catch (e: any) {
      this.log.logError(`[HPOTuner] Loop cycle iteration failed: ${e.message}`);
    }
  }
}
