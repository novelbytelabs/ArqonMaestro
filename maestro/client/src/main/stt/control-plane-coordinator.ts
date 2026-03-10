import http from "http";
import https from "https";
import { URL } from "url";
import Log from "../log";
import STTTracking from "./tracking";

export type ControlPlaneRequestType = "stt.speech.request" | "stt.action.review";

export interface ControlPlaneDispatchRequest {
  requestId: string;
  requestType: ControlPlaneRequestType;
  agentId: string;
  sessionId: string;
  chunkId: string;
  fingerprint: string;
  payload: any;
}

export interface ControlPlaneCoordinatorConfig {
  enabled: boolean;
  spacetimeDbUrl: string;
  failClosed: boolean;
  agentInflightLimit: number;
  globalInflightLimit: number;
  leaseMs: number;
  maxRetries: number;
  ownerId: string;
}

export interface ControlPlaneStore {
  healthcheck(): Promise<boolean>;
  heartbeatAgent(agentId: string): Promise<void>;
  enqueueRequest(request: ControlPlaneDispatchRequest): Promise<void>;
  acquireLease(requestId: string, ownerId: string, leaseMs: number, attempt: number): Promise<boolean>;
  ackSuccess(requestId: string): Promise<void>;
  ackFailure(requestId: string, reason: string, terminal: boolean): Promise<void>;
  recordDecision(requestId: string, decision: "allow" | "block" | "defer" | "drop", reason: string): Promise<void>;
  getIdempotency(fingerprint: string): Promise<string | undefined>;
  setIdempotency(fingerprint: string, requestId: string, terminalState: "success" | "dead_letter" | "blocked"): Promise<void>;
}

interface QueueItem {
  request: ControlPlaneDispatchRequest;
  executor: () => Promise<void>;
}

async function httpRequestJson(urlStr: string, method: string, body?: any): Promise<any> {
  const url = new URL(urlStr);
  const useHttps = url.protocol === "https:";
  const transport = useHttps ? https : http;
  const payload = body !== undefined ? JSON.stringify(body) : "";

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (useHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: 3000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk.toString();
        });
        res.on("end", () => {
          if ((res.statusCode || 500) >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
            return;
          }
          if (!raw) {
            resolve({});
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

export class SpacetimeDbControlPlaneStore implements ControlPlaneStore {
  constructor(private baseUrl: string) {}

  async healthcheck(): Promise<boolean> {
    if (!this.baseUrl) {
      return false;
    }
    try {
      await httpRequestJson(`${this.baseUrl}/health`, "GET");
      return true;
    } catch {
      return false;
    }
  }

  async heartbeatAgent(agentId: string): Promise<void> {
    await httpRequestJson(`${this.baseUrl}/control/heartbeat_agent`, "POST", { agent_id: agentId });
  }

  async enqueueRequest(request: ControlPlaneDispatchRequest): Promise<void> {
    await httpRequestJson(`${this.baseUrl}/control/enqueue_request`, "POST", request);
  }

  async acquireLease(requestId: string, ownerId: string, leaseMs: number, attempt: number): Promise<boolean> {
    const res = await httpRequestJson(`${this.baseUrl}/control/acquire_next_lease`, "POST", {
      request_id: requestId,
      owner_id: ownerId,
      lease_ms: leaseMs,
      attempt,
    });
    return !!(res && res.acquired);
  }

  async ackSuccess(requestId: string): Promise<void> {
    await httpRequestJson(`${this.baseUrl}/control/ack_success`, "POST", { request_id: requestId });
  }

  async ackFailure(requestId: string, reason: string, terminal: boolean): Promise<void> {
    await httpRequestJson(`${this.baseUrl}/control/ack_failure`, "POST", {
      request_id: requestId,
      reason,
      terminal,
    });
  }

  async recordDecision(requestId: string, decision: "allow" | "block" | "defer" | "drop", reason: string): Promise<void> {
    await httpRequestJson(`${this.baseUrl}/control/record_decision`, "POST", {
      request_id: requestId,
      decision,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  async getIdempotency(fingerprint: string): Promise<string | undefined> {
    const res = await httpRequestJson(`${this.baseUrl}/control/get_idempotency`, "POST", { fingerprint });
    return res && res.request_id ? String(res.request_id) : undefined;
  }

  async setIdempotency(fingerprint: string, requestId: string, terminalState: "success" | "dead_letter" | "blocked"): Promise<void> {
    await httpRequestJson(`${this.baseUrl}/control/set_idempotency`, "POST", {
      fingerprint,
      request_id: requestId,
      terminal_state: terminalState,
    });
  }
}

export class MemoryControlPlaneStore implements ControlPlaneStore {
  private idempotency = new Map<string, string>();
  private healthy = true;

  setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }

  async healthcheck(): Promise<boolean> {
    return this.healthy;
  }

  async heartbeatAgent(_agentId: string): Promise<void> {}
  async enqueueRequest(_request: ControlPlaneDispatchRequest): Promise<void> {}
  async acquireLease(_requestId: string, _ownerId: string, _leaseMs: number, _attempt: number): Promise<boolean> {
    return this.healthy;
  }
  async ackSuccess(_requestId: string): Promise<void> {}
  async ackFailure(_requestId: string, _reason: string, _terminal: boolean): Promise<void> {}
  async recordDecision(_requestId: string, _decision: "allow" | "block" | "defer" | "drop", _reason: string): Promise<void> {}
  async getIdempotency(fingerprint: string): Promise<string | undefined> {
    return this.idempotency.get(fingerprint);
  }
  async setIdempotency(fingerprint: string, requestId: string, _terminalState: "success" | "dead_letter" | "blocked"): Promise<void> {
    this.idempotency.set(fingerprint, requestId);
  }
}

export default class ControlPlaneCoordinator {
  private queues = new Map<string, QueueItem[]>();
  private roundRobinAgents: string[] = [];
  private roundRobinIndex = 0;
  private inflightByAgent = new Map<string, number>();
  private inflightTotal = 0;
  private attempts = new Map<string, number>();
  private pumpRunning = false;
  private lastHealthState = false;

  constructor(
    private config: ControlPlaneCoordinatorConfig,
    private store: ControlPlaneStore,
    private tracking: STTTracking,
    private log: Log
  ) {}

  async submit(request: ControlPlaneDispatchRequest, executor: () => Promise<void>): Promise<boolean> {
    if (!this.config.enabled) {
      await executor();
      return true;
    }

    const duplicateRequestId = await this.tryGetIdempotentRequest(request);
    if (duplicateRequestId) {
      this.tracking.logMetric("stt.control.dead_letter", {
        request_id: request.requestId,
        duplicate_of: duplicateRequestId,
        agent_id: request.agentId,
      });
      return false;
    }

    const backboneHealthy = await this.ensureBackboneHealthy();
    if (!backboneHealthy && this.config.failClosed) {
      await this.safeRecordDecision(request.requestId, "block", "spacetimedb_unavailable_fail_closed");
      await this.safeSetIdempotency(request.fingerprint, request.requestId, "blocked");
      this.tracking.logMetric("stt.control.blocked_fail_closed", {
        request_id: request.requestId,
        agent_id: request.agentId,
        request_type: request.requestType,
      });
      this.log.logError(`[ControlPlane] Blocking request ${request.requestId}: SpacetimeDB unavailable`);
      return false;
    }

    if (backboneHealthy) {
      await this.safeStoreEnqueue(request);
    }

    const queue = this.queues.get(request.agentId) || [];
    queue.push({ request, executor });
    this.queues.set(request.agentId, queue);
    if (this.roundRobinAgents.indexOf(request.agentId) === -1) {
      this.roundRobinAgents.push(request.agentId);
    }

    this.tracking.logMetric("stt.control.enqueue", {
      request_id: request.requestId,
      agent_id: request.agentId,
      request_type: request.requestType,
      queue_depth: queue.length,
    });

    this.kickPump();
    return true;
  }

  private async tryGetIdempotentRequest(request: ControlPlaneDispatchRequest): Promise<string | undefined> {
    if (!request.fingerprint) {
      return undefined;
    }
    try {
      return await this.store.getIdempotency(request.fingerprint);
    } catch {
      return undefined;
    }
  }

  private async safeSetIdempotency(
    fingerprint: string,
    requestId: string,
    state: "success" | "dead_letter" | "blocked"
  ): Promise<void> {
    if (!fingerprint) {
      return;
    }
    try {
      await this.store.setIdempotency(fingerprint, requestId, state);
    } catch {}
  }

  private async safeStoreEnqueue(request: ControlPlaneDispatchRequest): Promise<void> {
    await this.store.heartbeatAgent(request.agentId);
    await this.store.enqueueRequest(request);
  }

  private async ensureBackboneHealthy(): Promise<boolean> {
    try {
      const healthy = await this.store.healthcheck();
      if (healthy !== this.lastHealthState) {
        this.lastHealthState = healthy;
        this.log.logVerbose(`[ControlPlane] SpacetimeDB health changed: ${healthy ? "healthy" : "unhealthy"}`);
      }
      return healthy;
    } catch {
      this.lastHealthState = false;
      return false;
    }
  }

  private kickPump(): void {
    if (this.pumpRunning) {
      return;
    }
    this.pumpRunning = true;
    setImmediate(async () => {
      try {
        await this.pump();
      } finally {
        this.pumpRunning = false;
      }
    });
  }

  private async pump(): Promise<void> {
    while (this.inflightTotal < this.config.globalInflightLimit) {
      const next = this.popNextReadyItem();
      if (!next) {
        return;
      }
      this.inflightTotal++;
      this.inflightByAgent.set(next.request.agentId, (this.inflightByAgent.get(next.request.agentId) || 0) + 1);
      this.dispatch(next).catch((error) => {
        this.log.logError(`[ControlPlane] Dispatch error for ${next.request.requestId}: ${error}`);
      });
    }
  }

  private popNextReadyItem(): QueueItem | undefined {
    if (this.roundRobinAgents.length === 0) {
      return undefined;
    }

    let attempts = 0;
    while (attempts < this.roundRobinAgents.length) {
      if (this.roundRobinAgents.length === 0) {
        return undefined;
      }
      const idx = this.roundRobinIndex % this.roundRobinAgents.length;
      const agentId = this.roundRobinAgents[idx];
      const queue = this.queues.get(agentId) || [];
      const agentInflight = this.inflightByAgent.get(agentId) || 0;

      if (queue.length === 0) {
        this.roundRobinAgents.splice(idx, 1);
        this.queues.delete(agentId);
        continue;
      }

      if (agentInflight >= this.config.agentInflightLimit) {
        this.roundRobinIndex = (idx + 1) % this.roundRobinAgents.length;
        attempts++;
        continue;
      }

      const item = queue.shift();
      if (queue.length === 0) {
        this.roundRobinAgents.splice(idx, 1);
        this.queues.delete(agentId);
        if (this.roundRobinAgents.length > 0) {
          this.roundRobinIndex = idx % this.roundRobinAgents.length;
        } else {
          this.roundRobinIndex = 0;
        }
      } else {
        this.queues.set(agentId, queue);
        this.roundRobinIndex = (idx + 1) % this.roundRobinAgents.length;
      }
      return item;
    }

    return undefined;
  }

  private async dispatch(item: QueueItem): Promise<void> {
    const request = item.request;
    const startedAt = Date.now();
    const attempt = (this.attempts.get(request.requestId) || 0) + 1;
    this.attempts.set(request.requestId, attempt);

    try {
      const healthy = await this.ensureBackboneHealthy();
      if (!healthy && this.config.failClosed) {
        throw new Error("spacetimedb_unavailable_fail_closed");
      }

      if (healthy) {
        const leaseAcquired = await this.store.acquireLease(
          request.requestId,
          this.config.ownerId,
          this.config.leaseMs,
          attempt
        );
        if (!leaseAcquired) {
          throw new Error("lease_not_acquired");
        }
      }

      this.tracking.logMetric("stt.control.dispatch", {
        request_id: request.requestId,
        request_type: request.requestType,
        agent_id: request.agentId,
        attempt,
      });

      await item.executor();

      await this.safeRecordDecision(request.requestId, "allow", "dispatched");
      await this.store.ackSuccess(request.requestId);
      await this.safeSetIdempotency(request.fingerprint, request.requestId, "success");

      this.tracking.logMetric("stt.control.latency_queue_ms", {
        request_id: request.requestId,
        queue_latency_ms: Date.now() - startedAt,
      });
    } catch (error: any) {
      const reason = error && error.message ? error.message : String(error);
      const attemptCount = this.attempts.get(request.requestId) || 1;
      if (attemptCount <= this.config.maxRetries) {
        const queue = this.queues.get(request.agentId) || [];
        queue.push(item);
        this.queues.set(request.agentId, queue);
        if (this.roundRobinAgents.indexOf(request.agentId) === -1) {
          this.roundRobinAgents.push(request.agentId);
        }
        this.tracking.logMetric("stt.control.retry", {
          request_id: request.requestId,
          reason,
          attempt: attemptCount,
        });
        await this.store.ackFailure(request.requestId, reason, false);
      } else {
        await this.safeRecordDecision(request.requestId, "drop", reason);
        await this.store.ackFailure(request.requestId, reason, true);
        await this.safeSetIdempotency(request.fingerprint, request.requestId, "dead_letter");
        this.tracking.logMetric("stt.control.dead_letter", {
          request_id: request.requestId,
          reason,
          attempt: attemptCount,
        });
      }
    } finally {
      const inflightForAgent = this.inflightByAgent.get(request.agentId) || 1;
      this.inflightByAgent.set(request.agentId, Math.max(0, inflightForAgent - 1));
      this.inflightTotal = Math.max(0, this.inflightTotal - 1);
      this.kickPump();
    }
  }

  private async safeRecordDecision(
    requestId: string,
    decision: "allow" | "block" | "defer" | "drop",
    reason: string
  ): Promise<void> {
    try {
      await this.store.recordDecision(requestId, decision, reason);
    } catch {}
  }
}
