import Log from "../log";
import Settings from "../settings";
import STTTracking, { classifyTranscript } from "./tracking";
import HPOTuner from "./hpo-tuner";
import TtsBroker, { TtsPersona, TtsPriorityClass } from "./tts-broker";

/**
 * Handles voice output requests (TTS) received from the Bus.
 * Uses provider abstraction for TTS (Kokoro or Fallback).
 * Ensures non-blocking playback, replay handling, and idempotency.
 * 
 * Gate 6: Kokoro TTS integration with explicit failure/fallback semantics:
 * - Kokoro fails + fallback enabled => fallback path executes
 * - Kokoro fails + fallback disabled => fail closed with explicit signal
 */
export default class VoiceOutput {
  private broker: TtsBroker;
  private settings: Settings;
  private tuner?: HPOTuner;

  constructor(private log: Log, private tracking: STTTracking, settings: Settings, tuner?: HPOTuner) {
    this.settings = settings;
    this.tuner = tuner;
    this.broker = new TtsBroker(log, tracking, settings);
  }

  /**
   * Refresh the TTS provider (called when settings change)
   */
  refreshProvider(): void {
    this.broker.refreshProviders();
    this.log.logVerbose(`[VoiceOutput] TTS broker providers refreshed`);
  }

  /**
   * Get current provider type
   */
  getProviderType(): string {
    return this.broker.getProviderSummary();
  }

  /**
   * Play the given speech request using the configured TTS provider.
   * Handles:
   * - Replay deduplication
   * - Provider selection based on settings
   * - Fallback semantics (Kokoro → Fallback)
   * - Telemetry emission
   */
  async play(
    messageId: string,
    audioDataB64: string,
    format: string,
    transcript: string,
    options?: {
      persona?: TtsPersona;
      priorityClass?: TtsPriorityClass;
      interruptible?: boolean;
      messageClass?: "ack" | "guidance" | "warning" | "cognitive";
      interruptCurrentPlayback?: boolean;
    }
  ): Promise<boolean> {
    const startMs = Date.now();
    if (options?.interruptCurrentPlayback) {
      this.broker.interruptCurrentPlayback("explicit_interrupt_request");
    }

    this.log.logVerbose(`[VoiceOutput] Playing speech request ${messageId} via TTS broker`);
    const success = await this.broker.speak({
      messageId,
      audioDataB64,
      format,
      transcript,
      persona: options?.persona,
      priorityClass: options?.priorityClass,
      interruptible: options?.interruptible,
      messageClass: options?.messageClass,
    });
    const ttfaMs = Date.now() - startMs;
    const scenario = classifyTranscript(transcript);

    if (this.tuner) {
      this.tuner.recordTelemetry(scenario, ttfaMs, success);
      // Let iteration cycle run asynchronously after tracking completion
      this.tuner.runLoopCycle().catch((e) => this.log.logError(`[VoiceOutput] Error running tuner loop: ${e}`));
    }
    
    return success;
  }

  stop(reason: string = "voice_output_stop"): boolean {
    return this.broker.interruptCurrentPlayback(reason);
  }
}
