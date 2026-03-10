import { spawn } from "child_process";
import Log from "../log";
import STTTracking from "./tracking";

/**
 * Handles voice output requests (TTS) received from the Bus.
 * Ensures non-blocking playback, replay handling, and idempotency.
 */
export default class VoiceOutput {
  private playedMessages = new Set<string>();
  private readonly MAX_TRACKED_MESSAGES = 100;

  constructor(private log: Log, private tracking: STTTracking) {}

  /**
   * Play the given speech request.
   * Handles replay deduping by message_id.
   */
  async play(messageId: string, audioDataB64: string, format: string, transcript: string): Promise<boolean> {
    if (this.playedMessages.has(messageId)) {
      this.log.logVerbose(`[VoiceOutput] Ignoring replayed speech request: ${messageId}`);
      this.tracking.logMetric("stt.speech.replay_ignored", { message_id: messageId });
      return false; // Ignored due to replay
    }

    // Track for idempotency
    this.playedMessages.add(messageId);
    if (this.playedMessages.size > this.MAX_TRACKED_MESSAGES) {
      const first = this.playedMessages.values().next().value;
      if (first) {
        this.playedMessages.delete(first);
      }
    }

    try {
      const buffer = Buffer.from(audioDataB64, "base64");
      this.log.logVerbose(`[VoiceOutput] Playing speech request ${messageId} (${buffer.length} bytes): "${transcript.substring(0, 30)}..."`);

      const startMs = Date.now();
      const args = ["-q"]; // quiet
      if (format === "raw" || format === "pcm") {
        args.push("-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw");
      }

      return new Promise<boolean>((resolve) => {
        let resolved = false;
        const resolveOnce = (value: boolean) => {
          if (!resolved) {
            resolved = true;
            resolve(value);
          }
        };

        const proc = spawn("aplay", args, { stdio: ["pipe", "ignore", "ignore"] });

        proc.once("spawn", () => {
          this.tracking.logMetric("stt.speech.playback_started", {
            message_id: messageId,
            bytes: buffer.length,
          });
          resolveOnce(true);
        });

        proc.once("error", (err) => {
          this.playedMessages.delete(messageId);
          this.log.logError(`[VoiceOutput] Playback error for ${messageId}: ${err.message}`);
          this.tracking.logMetric("stt.speech.playback_failed", { message_id: messageId, reason: err.message });
          resolveOnce(false);
        });

        proc.once("close", (code) => {
          const duration = Date.now() - startMs;
          this.log.logVerbose(`[VoiceOutput] Playback finished for ${messageId} in ${duration}ms (exit code ${code})`);
          if (code !== 0) {
            this.playedMessages.delete(messageId);
            this.tracking.logMetric("stt.speech.playback_failed", { message_id: messageId, reason: `exit_${code}` });
          } else {
            this.tracking.logMetric("stt.speech.playback_completed", { message_id: messageId, duration_ms: duration });
          }
        });

        if (!proc.stdin) {
          this.playedMessages.delete(messageId);
          this.log.logError(`[VoiceOutput] Playback error for ${messageId}: missing stdin pipe`);
          this.tracking.logMetric("stt.speech.playback_failed", { message_id: messageId, reason: "stdin_unavailable" });
          resolveOnce(false);
          return;
        }

        proc.stdin.once("error", (err) => {
          this.playedMessages.delete(messageId);
          this.log.logError(`[VoiceOutput] Playback stdin error for ${messageId}: ${err.message}`);
          this.tracking.logMetric("stt.speech.playback_failed", { message_id: messageId, reason: err.message });
          resolveOnce(false);
        });

        proc.stdin.end(buffer);
      });
    } catch (e: any) {
      this.playedMessages.delete(messageId);
      this.log.logError(`[VoiceOutput] Failed to start playback: ${e.message}`);
      this.tracking.logMetric("stt.speech.playback_failed", { message_id: messageId, reason: e.message });
      return false;
    }
  }
}
