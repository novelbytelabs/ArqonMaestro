import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
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
      
      // We spawn a process to play to avoid blocking the Node.js event loop
      // E.g., paplay for wav, aplay for raw/wav on Linux
      // Since this is run in a mocked test environment sometimes, we ensure we handle failures gracefully
      let command = "aplay";
      let args = ["-q"]; // quiet
      
      if (format === "raw" || format === "pcm") {
         args.push("-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw");
      }

      const proc = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] });
      
      proc.on("error", (err) => {
        this.log.logError(`[VoiceOutput] Playback error for ${messageId}: ${err.message}`);
      });

      proc.on("close", (code) => {
        const duration = Date.now() - startMs;
        this.log.logVerbose(`[VoiceOutput] Playback finished for ${messageId} in ${duration}ms (exit code ${code})`);
      });

      // Write audio to process stdin
      proc.stdin.write(buffer);
      proc.stdin.end();

      this.tracking.logMetric("stt.speech.playback_started", { 
        message_id: messageId, 
        bytes: buffer.length 
      });
      
      return true;

    } catch (e: any) {
      this.log.logError(`[VoiceOutput] Failed to start playback: ${e.message}`);
      return false;
    }
  }
}
