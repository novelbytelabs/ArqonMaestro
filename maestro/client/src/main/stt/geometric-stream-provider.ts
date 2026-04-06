import WebSocket from "ws";
import Log from "../log";
import { GeometricRegionEvent } from "./parakeet-command-fast-provider";

export interface GeometricStreamProviderConfig {
  enabled?: boolean;
  sidecarUrl?: string;
  timeoutMs?: number;
}

export interface GeometricStreamSession {
  sendAudio(audio: Buffer): void;
  finalize(): Promise<GeometricRegionEvent | null>;
  getLastRejectReason(): string | null;
  cancel(): void;
}

interface GeometricSidecarResponse {
  ok: boolean;
  is_final?: boolean;
  geometric_event?: GeometricRegionEvent | null;
  geometric_reject?: {
    reason?: string;
    [key: string]: unknown;
  } | null;
  error?: string;
}

export default class GeometricStreamProvider {
  private config: Required<GeometricStreamProviderConfig>;
  private ready = false;
  private loadError?: string;

  constructor(config: GeometricStreamProviderConfig = {}, private log?: Log) {
    const defaultUrl = process.env.MAESTRO_GEOMETRIC_SIDECAR_URL || "http://127.0.0.1:5003/detect_stream";
    this.config = {
      enabled: config.enabled !== undefined ? config.enabled : process.env.H3_GEOMETRIC_ENABLED !== "false",
      sidecarUrl: config.sidecarUrl || defaultUrl,
      timeoutMs: config.timeoutMs || 5000,
    };
    this.initializeReadiness();
  }

  private initializeReadiness(): void {
    if (!this.config.enabled) {
      this.ready = false;
      this.loadError = "provider_disabled";
      return;
    }
    if (!this.config.sidecarUrl) {
      this.ready = false;
      this.loadError = "sidecar_url_missing";
      return;
    }
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  getLoadError(): string | undefined {
    return this.loadError;
  }

  getConfig(): Required<GeometricStreamProviderConfig> {
    return { ...this.config };
  }

  createStream(
    chunkId: string,
    onGeometricEvent?: (event: GeometricRegionEvent) => void
  ): GeometricStreamSession {
    if (!this.ready) {
      throw new Error(`geometric_stream_unavailable:${this.loadError || "not_ready"}`);
    }

    const wsUrl = this.config.sidecarUrl
      .replace("http://", "ws://")
      .replace("https://", "wss://");
    const ws = new WebSocket(wsUrl);
    let connected = false;
    let settled = false;
    let canceled = false;
    let latestEvent: GeometricRegionEvent | null = null;
    let lastRejectReason: string | null = null;
    let initTimeout: ReturnType<typeof setTimeout> | undefined;

    const finalizePromise = new Promise<GeometricRegionEvent | null>((resolve, reject) => {
      const settleResolve = (value: GeometricRegionEvent | null) => {
        if (settled) return;
        settled = true;
        if (initTimeout) clearTimeout(initTimeout);
        resolve(value);
      };
      const settleReject = (error: Error) => {
        if (settled) return;
        settled = true;
        if (initTimeout) clearTimeout(initTimeout);
        reject(error);
      };

      initTimeout = setTimeout(() => {
        if (!connected) {
          ws.terminate();
          settleReject(new Error("geometric_sidecar_error:websocket_timeout"));
        }
      }, this.config.timeoutMs);

      ws.on("open", () => {
        connected = true;
        ws.send(JSON.stringify({ chunk_id: chunkId, sample_rate_hz: 16000 }));
      });

      ws.on("message", (data) => {
        if (canceled) return;
        try {
          const response = JSON.parse(data.toString()) as GeometricSidecarResponse;
          if (!response.ok) {
            throw new Error(`geometric_sidecar_error:${response.error || "unknown_error"}`);
          }
          if (response.geometric_event) {
            latestEvent = response.geometric_event;
            onGeometricEvent?.(response.geometric_event);
          }
          if (response.is_final && response.geometric_reject?.reason) {
            lastRejectReason = String(response.geometric_reject.reason);
          }
          if (response.is_final) {
            settleResolve(latestEvent);
            ws.close();
          }
        } catch (error) {
          settleReject(error instanceof Error ? error : new Error(String(error)));
          ws.terminate();
        }
      });

      ws.on("error", (err) => {
        if (canceled) return;
        this.log?.logVerbose(`[GeometricStreamProvider] WS error: ${err.message}`);
        settleReject(new Error(`geometric_sidecar_error:${err.message}`));
      });

      ws.on("close", () => {
        if (!settled && !canceled) {
          settleResolve(latestEvent);
        }
      });
    });
    // Attach a no-op handler immediately so connection errors do not surface
    // as unhandled rejections before finalize() awaits the promise.
    finalizePromise.catch(() => undefined);

    return {
      sendAudio: (audio: Buffer) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(audio);
        }
      },
      finalize: async () => {
        if (canceled) {
          throw new Error("geometric_sidecar_error:websocket_canceled");
        }
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ eof: true }));
        }
        return finalizePromise;
      },
      getLastRejectReason: () => lastRejectReason,
      cancel: () => {
        if (!settled) {
          canceled = true;
          settled = true;
          if (initTimeout) clearTimeout(initTimeout);
          ws.terminate();
        }
      },
    };
  }
}
