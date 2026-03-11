import Log from "../log";
import Settings from "../settings";
import STTTracking, { classifyTranscript } from "./tracking";
import HPOTuner from "./hpo-tuner";
import {
  TtsProvider,
  createTtsProvider,
  FallbackTtsProvider,
} from "./tts-providers";

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
  private provider: TtsProvider;
  private settings: Settings;
  private tuner?: HPOTuner;

  constructor(private log: Log, private tracking: STTTracking, settings: Settings, tuner?: HPOTuner) {
    this.settings = settings;
    this.tuner = tuner;
    this.provider = createTtsProvider(log, tracking, settings);
  }

  /**
   * Refresh the TTS provider (called when settings change)
   */
  refreshProvider(): void {
    this.provider = createTtsProvider(this.log, this.tracking, this.settings);
    this.log.logVerbose(`[VoiceOutput] Provider refreshed to: ${this.provider.getType()}`);
  }

  /**
   * Get current provider type
   */
  getProviderType(): string {
    return this.provider.getType();
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
    transcript: string
  ): Promise<boolean> {
    const startMs = Date.now();
    const initialProvider = this.provider.getType();

    this.log.logVerbose(
      `[VoiceOutput] Playing speech request ${messageId} with provider: ${initialProvider}`
    );

    // Try primary provider
    const result = await this.provider.play(messageId, audioDataB64, format, transcript);
    const ttfaMs = Date.now() - startMs;
    const scenario = classifyTranscript(transcript);

    // If primary provider failed and fallback is enabled, try fallback
    if (!result.success && initialProvider === "kokoro") {
      const fallbackEnabled = this.settings.getArqonTtsKokoroFallbackEnabled();
      
      if (fallbackEnabled) {
        this.log.logVerbose(
          `[VoiceOutput] Kokoro failed, falling back to aplay`
        );

        // Emit fallback telemetry
        this.tracking.logMetric("stt.tts.fallback.used", {
          message_id: messageId,
          kokoro_error: result.error,
          fallback_provider: "fallback",
        });

        // Keep configured provider unchanged; fallback is per-request.
        const fallbackProvider = new FallbackTtsProvider(this.log, this.tracking, this.settings);
        const fallbackResult = await fallbackProvider.play(
          messageId,
          audioDataB64,
          format,
          transcript
        );

        return fallbackResult.success;
      } else {
        // Fallback disabled - fail closed
        this.log.logError(
          `[VoiceOutput] Kokoro failed and fallback disabled, failing closed for ${messageId}`
        );

        this.tracking.logMetric("stt.tts.fail_closed", {
          message_id: messageId,
          provider: "kokoro",
          reason: result.error,
          fallback_enabled: false,
        });

        return false;
      }
    }

    if (this.tuner) {
      this.tuner.recordTelemetry(scenario, ttfaMs, result.success);
      // Let iteration cycle run asynchronously after tracking completion
      this.tuner.runLoopCycle().catch((e) => this.log.logError(`[VoiceOutput] Error running tuner loop: ${e}`));
    }
    
    return result.success;
  }
}
