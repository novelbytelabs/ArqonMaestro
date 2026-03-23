/**
 * Sidecar Health Check Client
 * Implements heartbeat and readiness probing for ASR sidecar endpoints.
 * 
 * Maestro must know if a sidecar is dead before routing audio to it.
 */
import http from "http";
import https from "https";

export interface SidecarHealthStatus {
  healthy: boolean;
  lastCheck: number;
  consecutiveFailures: number;
  lastSuccess?: number;
  lastError?: string;
}

export interface SidecarHealthConfig {
  host: string;
  port: number;
  healthEndpoint?: string;
  checkIntervalMs?: number;
  timeoutMs?: number;
  maxConsecutiveFailures?: number;
}

const DEFAULT_HEALTH_ENDPOINT = "/health";
const DEFAULT_CHECK_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_MAX_CONSECUTIVE_FAILURES = 3;

export class SidecarHealthChecker {
  private status: SidecarHealthStatus;
  private config: Required<SidecarHealthConfig>;
  private checkInterval?: NodeJS.Timeout;
  private onStatusChange?: (healthy: boolean) => void;

  constructor(config: SidecarHealthConfig, onStatusChange?: (healthy: boolean) => void) {
    this.config = {
      host: config.host,
      port: config.port,
      healthEndpoint: config.healthEndpoint || DEFAULT_HEALTH_ENDPOINT,
      checkIntervalMs: config.checkIntervalMs || DEFAULT_CHECK_INTERVAL_MS,
      timeoutMs: config.timeoutMs || DEFAULT_TIMEOUT_MS,
      maxConsecutiveFailures: config.maxConsecutiveFailures || DEFAULT_MAX_CONSECUTIVE_FAILURES,
    };
    this.onStatusChange = onStatusChange;
    this.status = {
      healthy: false,
      lastCheck: 0,
      consecutiveFailures: 0,
    };
  }

  /**
   * Start periodic health checks
   */
  start(): void {
    // Run initial check
    this.check();
    
    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Get current health status
   */
  getStatus(): SidecarHealthStatus {
    return { ...this.status };
  }

  /**
   * Check if sidecar is healthy (ready for traffic)
   */
  isHealthy(): boolean {
    return this.status.healthy;
  }

  /**
   * Perform immediate health check
   */
  async check(): Promise<boolean> {
    const wasHealthy = this.status.healthy;
    
    try {
      const result = await this.performHealthCheck();
      this.status.lastCheck = Date.now();
      
      if (result) {
        this.status.consecutiveFailures = 0;
        this.status.lastSuccess = Date.now();
        this.status.lastError = undefined;
        
        if (!wasHealthy) {
          this.status.healthy = true;
          this.onStatusChange?.(true);
        }
      } else {
        this.status.consecutiveFailures++;
        this.status.healthy = false;
        
        if (wasHealthy) {
          this.onStatusChange?.(false);
        }
      }
    } catch (error) {
      this.status.lastCheck = Date.now();
      this.status.consecutiveFailures++;
      this.status.lastError = error instanceof Error ? error.message : String(error);
      this.status.healthy = false;
      
      if (wasHealthy) {
        this.onStatusChange?.(false);
      }
    }

    // Mark unhealthy if too many consecutive failures
    if (this.status.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      this.status.healthy = false;
    }

    return this.status.healthy;
  }

  /**
   * Perform HTTP health check request
   */
  private performHealthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const protocol = this.config.port === 443 ? https : http;
      
      const options = {
        hostname: this.config.host,
        port: this.config.port,
        path: this.config.healthEndpoint,
        method: "GET",
        timeout: this.config.timeoutMs,
        headers: {
          "Accept": "application/json",
        },
      };

      const req = protocol.request(options, (res) => {
        // Check for 200 OK
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on("error", () => {
        resolve(false);
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }
}

/**
 * Health check pool for managing multiple sidecar health checkers
 */
export class SidecarHealthPool {
  private checkers: Map<string, SidecarHealthChecker> = new Map();

  /**
   * Register a sidecar for health monitoring
   */
  register(name: string, config: SidecarHealthConfig, onStatusChange?: (healthy: boolean) => void): SidecarHealthChecker {
    const checker = new SidecarHealthChecker(config, onStatusChange);
    this.checkers.set(name, checker);
    return checker;
  }

  /**
   * Start health monitoring for all registered sidecars
   */
  startAll(): void {
    for (const checker of this.checkers.values()) {
      checker.start();
    }
  }

  /**
   * Stop health monitoring for all registered sidecars
   */
  stopAll(): void {
    for (const checker of this.checkers.values()) {
      checker.stop();
    }
  }

  /**
   * Get health status for a specific sidecar
   */
  getStatus(name: string): SidecarHealthStatus | undefined {
    return this.checkers.get(name)?.getStatus();
  }

  /**
   * Check if a specific sidecar is healthy
   */
  isHealthy(name: string): boolean {
    return this.checkers.get(name)?.isHealthy() ?? false;
  }

  /**
   * Check if all registered sidecars are healthy
   */
  allHealthy(): boolean {
    for (const checker of this.checkers.values()) {
      if (!checker.isHealthy()) {
        return false;
      }
    }
    return this.checkers.size > 0;
  }

  /**
   * Get status for all registered sidecars
   */
  getAllStatus(): Record<string, SidecarHealthStatus> {
    const result: Record<string, SidecarHealthStatus> = {};
    for (const [name, checker] of this.checkers.entries()) {
      result[name] = checker.getStatus();
    }
    return result;
  }

  /**
   * Remove a sidecar from the pool
   */
  unregister(name: string): void {
    const checker = this.checkers.get(name);
    if (checker) {
      checker.stop();
      this.checkers.delete(name);
    }
  }
}
