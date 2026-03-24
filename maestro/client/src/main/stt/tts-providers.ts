import { spawn } from "child_process";
import * as http from "http";
import * as https from "https";
import Log from "../log";
import STTTracking from "./tracking";
import Settings from "../settings";

/**
 * TTS Provider types
 */
export type TtsProviderType = "kokoro" | "piper";

/**
 * Result of a TTS playback operation
 */
export interface TtsPlaybackResult {
  success: boolean;
  provider: TtsProviderType;
  latencyMs: number;
  error?: string;
}

export interface TtsPlaybackOptions {
  voiceOverride?: string;
  persona?: string;
  priorityClass?: "p1_reflex" | "p2_warning" | "p3_direct" | "p4_guidance" | "p5_background";
}

/**
 * Interface for TTS providers
 */
export interface TtsProvider {
  /**
   * Get the provider type
   */
  getType(): TtsProviderType;

  /**
   * Play audio from base64-encoded data
   * @param messageId Unique message identifier for deduplication
   * @param audioDataB64 Base64-encoded audio data
   * @param format Audio format (e.g., "raw", "pcm")
   * @param transcript Text transcript for logging
   * @returns Playback result
   */
  play(
    messageId: string,
    audioDataB64: string,
    format: string,
    transcript: string,
    options?: TtsPlaybackOptions,
  ): Promise<TtsPlaybackResult>;

  stopCurrentPlayback(reason?: string): boolean;
}

/**
 * Base class for TTS providers with common functionality
 */
abstract class BaseTtsProvider implements TtsProvider {
  protected log: Log;
  protected tracking: STTTracking;
  protected settings: Settings;
  protected playedMessages = new Set<string>();
  protected readonly MAX_TRACKED_MESSAGES = 100;
  protected activePlaybackProcess: ReturnType<typeof spawn> | null = null;

  constructor(log: Log, tracking: STTTracking, settings: Settings) {
    this.log = log;
    this.tracking = tracking;
    this.settings = settings;
  }

  abstract getType(): TtsProviderType;

  /**
   * Check and track message for replay deduplication
   * Returns false if message was already played (replay)
   */
  protected checkAndTrackReplay(messageId: string): boolean {
    if (this.playedMessages.has(messageId)) {
      this.log.logVerbose(`[${this.getType()}] Ignoring replayed message: ${messageId}`);
      return false;
    }

    // Track for idempotency
    this.playedMessages.add(messageId);
    if (this.playedMessages.size > this.MAX_TRACKED_MESSAGES) {
      const first = this.playedMessages.values().next().value;
      if (first) {
        this.playedMessages.delete(first);
      }
    }
    return true;
  }

  abstract play(
    messageId: string,
    audioDataB64: string,
    format: string,
    transcript: string,
    options?: TtsPlaybackOptions,
  ): Promise<TtsPlaybackResult>;

  stopCurrentPlayback(reason: string = "interrupted"): boolean {
    const proc = this.activePlaybackProcess;
    if (!proc || proc.killed) {
      return false;
    }
    try {
      proc.kill();
      this.log.logVerbose(`[${this.getType()}] Stopped active playback (${reason})`);
      this.activePlaybackProcess = null;
      return true;
    } catch (error: any) {
      this.log.logError(
        `[${this.getType()}] Failed to stop active playback: ${error?.message || error}`,
      );
      return false;
    }
  }

  protected trackPlaybackProcess(proc: ReturnType<typeof spawn>): void {
    this.activePlaybackProcess = proc;
    const clear = () => {
      if (this.activePlaybackProcess === proc) {
        this.activePlaybackProcess = null;
      }
    };
    proc.once("close", clear);
    proc.once("error", clear);
    proc.once("exit", clear);
  }
}

interface KokoroSynthesizeResponse {
  audio_data_b64?: string;
  audio_b64?: string;
  audio?: string;
  format?: string;
}

interface KokoroStreamChunk {
  audio_chunk_b64?: string;
  audio_data_b64?: string;
  done?: boolean;
  format?: string;
  error?: string;
}

/**
 * Kokoro TTS provider using sidecar HTTP contract.
 * Expected endpoint: POST <arqon_tts_kokoro_url>/synthesize
 */
export class KokoroTtsProvider extends BaseTtsProvider {
  getType(): TtsProviderType {
    return "kokoro";
  }

  private postJson(urlString: string, body: any, timeoutMs: number): Promise<any> {
    const parsedUrl = new URL(urlString);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    };

    return new Promise<any>((resolve, reject) => {
      const req = client.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "POST",
          headers,
        },
        (res) => {
          let responseBody = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            responseBody += chunk;
          });
          res.on("end", () => {
            const statusCode = res.statusCode || 0;
            if (statusCode < 200 || statusCode >= 300) {
              reject(new Error(`HTTP_${statusCode}: ${responseBody.slice(0, 200)}`));
              return;
            }

            try {
              resolve(responseBody ? JSON.parse(responseBody) : {});
            } catch (e: any) {
              reject(new Error(`invalid_json: ${e.message}`));
            }
          });
        },
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error("timeout"));
      });
      req.on("error", (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }

  private postNdjsonStream(
    urlString: string,
    body: any,
    timeoutMs: number,
    onChunk: (chunk: KokoroStreamChunk) => void,
  ): Promise<void> {
    const parsedUrl = new URL(urlString);
    const client = parsedUrl.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      Accept: "application/x-ndjson",
    };

    return new Promise<void>((resolve, reject) => {
      const req = client.request(
        {
          protocol: parsedUrl.protocol,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "POST",
          headers,
        },
        (res) => {
          let responseBody = "";
          let pending = "";
          const statusCode = res.statusCode || 0;
          res.setEncoding("utf8");

          res.on("data", (chunk) => {
            responseBody += chunk;
            if (statusCode < 200 || statusCode >= 300) {
              return;
            }
            pending += chunk;
            let newlineIndex = pending.indexOf("\n");
            while (newlineIndex >= 0) {
              const line = pending.slice(0, newlineIndex).trim();
              pending = pending.slice(newlineIndex + 1);
              if (line.length > 0) {
                try {
                  const parsed = JSON.parse(line) as KokoroStreamChunk;
                  try {
                    onChunk(parsed);
                  } catch (e: any) {
                    reject(new Error(`stream_chunk_error: ${e.message}`));
                    return;
                  }
                } catch (e: any) {
                  reject(new Error(`invalid_stream_json: ${e.message}`));
                  return;
                }
              }
              newlineIndex = pending.indexOf("\n");
            }
          });

          res.on("end", () => {
            if (statusCode < 200 || statusCode >= 300) {
              reject(new Error(`HTTP_${statusCode}: ${responseBody.slice(0, 200)}`));
              return;
            }
            if (pending.trim().length > 0) {
              try {
                const parsed = JSON.parse(pending.trim()) as KokoroStreamChunk;
                try {
                  onChunk(parsed);
                } catch (e: any) {
                  reject(new Error(`stream_chunk_error: ${e.message}`));
                  return;
                }
              } catch (e: any) {
                reject(new Error(`invalid_stream_json: ${e.message}`));
                return;
              }
            }
            resolve();
          });
        },
      );

      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error("timeout"));
      });
      req.on("error", (err) => reject(err));
      req.write(payload);
      req.end();
    });
  }

  private async playStreaming(
    messageId: string,
    audioDataB64: string,
    transcript: string,
    baseUrl: string,
    voice: string,
    timeoutMs: number,
    startMs: number,
  ): Promise<TtsPlaybackResult> {
    const args = ["-q", "-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw"];
    const streamUrl = `${baseUrl.replace(/\/+$/, "")}/synthesize_stream`;

    return await new Promise<TtsPlaybackResult>((resolve) => {
      let resolved = false;
      let streamComplete = false;
      let closeCode: number | null = null;
      let sawAudioChunk = false;

      const resolveOnce = (result: TtsPlaybackResult) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const proc = spawn("aplay", args, { stdio: ["pipe", "ignore", "ignore"] });

      const maybeResolveOnClose = () => {
        if (closeCode === null || !streamComplete) {
          return;
        }
        const latencyMs = Date.now() - startMs;
        if (closeCode !== 0 || !sawAudioChunk) {
          this.playedMessages.delete(messageId);
          const reason = closeCode !== 0 ? `exit_${closeCode}` : "stream_empty";
          this.tracking.logMetric("stt.tts.kokoro.failure", {
            message_id: messageId,
            reason,
          });
          resolveOnce({
            success: false,
            provider: "kokoro",
            latencyMs,
            error: reason,
          });
          return;
        }

        this.tracking.logMetric("stt.tts.kokoro.success", {
          message_id: messageId,
          latency_ms: latencyMs,
        });
        this.tracking.logMetric("stt.tts.latency_ms", {
          message_id: messageId,
          provider: "kokoro",
          latency_ms: latencyMs,
        });
        resolveOnce({
          success: true,
          provider: "kokoro",
          latencyMs,
        });
      };

      proc.once("error", (err) => {
        this.playedMessages.delete(messageId);
        const latencyMs = Date.now() - startMs;
        this.tracking.logMetric("stt.tts.kokoro.failure", {
          message_id: messageId,
          reason: err.message,
        });
        resolveOnce({
          success: false,
          provider: "kokoro",
          latencyMs,
          error: err.message,
        });
      });

      proc.once("close", (code) => {
        closeCode = code === null ? -1 : code;
        maybeResolveOnClose();
      });

      if (!proc.stdin) {
        this.playedMessages.delete(messageId);
        const latencyMs = Date.now() - startMs;
        this.tracking.logMetric("stt.tts.kokoro.failure", {
          message_id: messageId,
          reason: "stdin_unavailable",
        });
        resolveOnce({
          success: false,
          provider: "kokoro",
          latencyMs,
          error: "stdin_unavailable",
        });
        return;
      }

      proc.stdin.once("error", (err) => {
        this.playedMessages.delete(messageId);
        const latencyMs = Date.now() - startMs;
        this.tracking.logMetric("stt.tts.kokoro.failure", {
          message_id: messageId,
          reason: err.message,
        });
        resolveOnce({
          success: false,
          provider: "kokoro",
          latencyMs,
          error: err.message,
        });
      });

      this.tracking.logMetric("stt.tts.kokoro.stream_started", {
        message_id: messageId,
        url: streamUrl,
      });

      this.postNdjsonStream(
        streamUrl,
        {
          request_id: messageId,
          text: transcript,
          voice,
          format: "raw",
          stream: true,
          input_audio_b64: audioDataB64,
        },
        timeoutMs,
        (chunk) => {
          if (chunk.error) {
            throw new Error(chunk.error);
          }
          const audioB64 = chunk.audio_chunk_b64 || chunk.audio_data_b64;
          if (audioB64 && proc.stdin && !proc.stdin.destroyed) {
            sawAudioChunk = true;
            const buffer = Buffer.from(audioB64, "base64");
            proc.stdin.write(buffer);
            this.tracking.logMetric("stt.tts.kokoro.stream_chunk", {
              message_id: messageId,
              bytes: buffer.length,
            });
          }
          if (chunk.done === true && proc.stdin && !proc.stdin.destroyed) {
            proc.stdin.end();
          }
        },
      )
        .then(() => {
          streamComplete = true;
          this.tracking.logMetric("stt.tts.kokoro.stream_completed", {
            message_id: messageId,
          });
          if (proc.stdin && !proc.stdin.destroyed) {
            proc.stdin.end();
          }
          maybeResolveOnClose();
        })
        .catch((err) => {
          this.playedMessages.delete(messageId);
          const latencyMs = Date.now() - startMs;
          this.tracking.logMetric("stt.tts.kokoro.failure", {
            message_id: messageId,
            reason: err.message,
          });
          if (!proc.killed) {
            proc.kill();
          }
          resolveOnce({
            success: false,
            provider: "kokoro",
            latencyMs,
            error: err.message,
          });
        });
    });
  }

  async play(
    messageId: string,
    audioDataB64: string,
    format: string,
    transcript: string,
    options?: TtsPlaybackOptions,
  ): Promise<TtsPlaybackResult> {
    // Check for replay
    if (!this.checkAndTrackReplay(messageId)) {
      this.tracking.logMetric("stt.tts.replay_ignored", {
        message_id: messageId,
        provider: "kokoro",
      });
      return {
        success: false,
        provider: "kokoro",
        latencyMs: 0,
        error: "replay ignored",
      };
    }

    const startMs = Date.now();
    const baseUrl = this.settings.getArqonTtsKokoroUrl();
    const voice = options?.voiceOverride || this.settings.getArqonTtsKokoroVoice();
    const timeoutMs = this.settings.getArqonTtsKokoroTimeoutMs();
    const streamingEnabled = this.settings.getArqonTtsKokoroStreamingEnabled();

    if (!baseUrl) {
      const latencyMs = Date.now() - startMs;
      const error = "Kokoro sidecar URL not configured";
      this.log.logError(`[KokoroTts] ${error}`);
      this.tracking.logMetric("stt.tts.kokoro.failure", {
        message_id: messageId,
        reason: error,
      });
      return {
        success: false,
        provider: "kokoro",
        latencyMs,
        error,
      };
    }

    try {
      this.log.logVerbose(`[KokoroTts] Synthesizing speech request ${messageId} using ${baseUrl}`);

      this.tracking.logMetric("stt.tts.provider_selected", {
        message_id: messageId,
        provider: "kokoro",
      });
      this.tracking.logMetric("stt.tts.kokoro.started", {
        message_id: messageId,
        voice,
        url: baseUrl,
      });

      if (streamingEnabled) {
        const streamingResult = await this.playStreaming(
          messageId,
          audioDataB64,
          transcript,
          baseUrl,
          voice,
          timeoutMs,
          startMs,
        );
        if (streamingResult.success) {
          return streamingResult;
        }
        if (streamingResult.error && streamingResult.error.indexOf("HTTP_404") < 0) {
          return streamingResult;
        }
        this.tracking.logMetric("stt.tts.kokoro.stream_fallback", {
          message_id: messageId,
          reason: streamingResult.error || "stream_unavailable",
        });
      }

      const response = (await this.postJson(
        `${baseUrl.replace(/\/+$/, "")}/synthesize`,
        {
          request_id: messageId,
          text: transcript,
          voice,
          format,
          input_audio_b64: audioDataB64,
        },
        timeoutMs,
      )) as KokoroSynthesizeResponse;

      const synthesizedAudioB64 = response.audio_data_b64 || response.audio_b64 || response.audio;
      const outputFormat = response.format || format;

      if (!synthesizedAudioB64 || typeof synthesizedAudioB64 !== "string") {
        const latencyMs = Date.now() - startMs;
        const error = "missing_audio_data_b64";
        this.playedMessages.delete(messageId);
        this.log.logError(`[KokoroTts] Invalid synth response for ${messageId}: ${error}`);
        this.tracking.logMetric("stt.tts.kokoro.failure", {
          message_id: messageId,
          reason: error,
        });
        return {
          success: false,
          provider: "kokoro",
          latencyMs,
          error,
        };
      }

      const args = ["-q"];
      if (outputFormat === "raw" || outputFormat === "pcm") {
        args.push("-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw");
      }

      return await new Promise<TtsPlaybackResult>((resolve) => {
        let resolved = false;
        const resolveOnce = (result: TtsPlaybackResult) => {
          if (!resolved) {
            resolved = true;
            resolve(result);
          }
        };

        const proc = spawn("aplay", args, { stdio: ["pipe", "ignore", "ignore"] });
        this.trackPlaybackProcess(proc);
        const buffer = Buffer.from(synthesizedAudioB64, "base64");

        proc.once("error", (err) => {
          this.playedMessages.delete(messageId);
          const latencyMs = Date.now() - startMs;
          this.log.logError(`[KokoroTts] Playback error for ${messageId}: ${err.message}`);
          this.tracking.logMetric("stt.tts.kokoro.failure", {
            message_id: messageId,
            reason: err.message,
          });
          resolveOnce({
            success: false,
            provider: "kokoro",
            latencyMs,
            error: err.message,
          });
        });

        proc.once("close", (code) => {
          const latencyMs = Date.now() - startMs;
          if (code !== 0) {
            this.playedMessages.delete(messageId);
            const error = `exit code ${code}`;
            this.tracking.logMetric("stt.tts.kokoro.failure", {
              message_id: messageId,
              reason: `exit_${code}`,
            });
            resolveOnce({
              success: false,
              provider: "kokoro",
              latencyMs,
              error,
            });
            return;
          }

          this.tracking.logMetric("stt.tts.kokoro.success", {
            message_id: messageId,
            latency_ms: latencyMs,
          });
          this.tracking.logMetric("stt.tts.latency_ms", {
            message_id: messageId,
            provider: "kokoro",
            latency_ms: latencyMs,
          });
          resolveOnce({
            success: true,
            provider: "kokoro",
            latencyMs,
          });
        });

        if (!proc.stdin) {
          this.playedMessages.delete(messageId);
          const latencyMs = Date.now() - startMs;
          const error = "stdin_unavailable";
          this.tracking.logMetric("stt.tts.kokoro.failure", {
            message_id: messageId,
            reason: error,
          });
          resolveOnce({
            success: false,
            provider: "kokoro",
            latencyMs,
            error,
          });
          return;
        }

        proc.stdin.once("error", (err) => {
          this.playedMessages.delete(messageId);
          const latencyMs = Date.now() - startMs;
          this.tracking.logMetric("stt.tts.kokoro.failure", {
            message_id: messageId,
            reason: err.message,
          });
          resolveOnce({
            success: false,
            provider: "kokoro",
            latencyMs,
            error: err.message,
          });
        });

        proc.stdin.end(buffer);
      });
    } catch (e: any) {
      this.playedMessages.delete(messageId);
      const latencyMs = Date.now() - startMs;
      this.log.logError(`[KokoroTts] Failed to start playback: ${e.message}`);
      this.tracking.logMetric("stt.tts.kokoro.failure", {
        message_id: messageId,
        reason: e.message,
      });
      return {
        success: false,
        provider: "kokoro",
        latencyMs,
        error: e.message,
      };
    }
  }
}

/**
 * Factory function to create TTS provider based on settings
 */
export function createTtsProvider(
  log: Log,
  tracking: STTTracking,
  settings: Settings,
): TtsProvider {
  return new KokoroTtsProvider(log, tracking, settings);
}
