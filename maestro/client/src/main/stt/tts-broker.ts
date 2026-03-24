import Log from "../log";
import Settings from "../settings";
import STTTracking from "./tracking";
import { KokoroTtsProvider, TtsPlaybackOptions, TtsProvider } from "./tts-providers";

export type TtsPersona =
  | "default_system"
  | "assistant_continuity"
  | "architect_agent"
  | "research_agent"
  | "warning_sentinel";

export type TtsPriorityClass =
  | "p1_reflex"
  | "p2_warning"
  | "p3_direct"
  | "p4_guidance"
  | "p5_background";

export interface TtsBrokerRequest {
  messageId: string;
  audioDataB64: string;
  format: string;
  transcript: string;
  persona?: TtsPersona;
  priorityClass?: TtsPriorityClass;
  interruptible?: boolean;
  messageClass?: "ack" | "guidance" | "warning" | "cognitive";
}

interface ActivePlaybackState {
  messageId: string;
  priority: TtsPriorityClass;
  interruptible: boolean;
}

interface BrokerProviders {
  kokoro: TtsProvider;
}

const PRIORITY_ORDER: Record<TtsPriorityClass, number> = {
  p1_reflex: 1,
  p2_warning: 2,
  p3_direct: 3,
  p4_guidance: 4,
  p5_background: 5,
};

export default class TtsBroker {
  private kokoroProvider: TtsProvider;
  private activePlayback: ActivePlaybackState | null = null;

  constructor(
    private log: Log,
    private tracking: STTTracking,
    private settings: Settings,
    providers?: Partial<BrokerProviders>,
  ) {
    this.kokoroProvider = providers?.kokoro || new KokoroTtsProvider(log, tracking, settings);
  }

  refreshProviders(): void {
    this.kokoroProvider = new KokoroTtsProvider(this.log, this.tracking, this.settings);
  }

  getProviderSummary(): string {
    return "kokoro_only";
  }

  async speak(request: TtsBrokerRequest): Promise<boolean> {
    const persona = this.resolvePersona(request);
    const priority = request.priorityClass || this.defaultPriorityForPersona(persona);
    const interruptible = request.interruptible ?? true;

    if (this.activePlayback) {
      const incomingHigherPriority =
        PRIORITY_ORDER[priority] < PRIORITY_ORDER[this.activePlayback.priority];
      if (incomingHigherPriority || this.activePlayback.interruptible) {
        this.interruptCurrentPlayback(
          incomingHigherPriority ? "higher_priority_request" : "interruptible_preemption",
        );
      } else {
        this.log.logVerbose(
          `[TtsBroker] Deferring non-interrupting request ${request.messageId}; active playback is higher priority`,
        );
        this.tracking.logMetric("stt.tts.broker.deferred", {
          message_id: request.messageId,
          active_message_id: this.activePlayback.messageId,
          incoming_priority: priority,
          active_priority: this.activePlayback.priority,
        });
        return false;
      }
    }

    this.activePlayback = {
      messageId: request.messageId,
      priority,
      interruptible,
    };

    const voiceOverride = this.resolveVoiceForPersona(persona);
    const playbackOptions: TtsPlaybackOptions = {
      voiceOverride,
      persona,
      priorityClass: priority,
    };

    this.tracking.logMetric("stt.tts.broker.route", {
      message_id: request.messageId,
      persona,
      priority_class: priority,
      provider_primary: "kokoro",
    });

    try {
      const kokoroResult = await this.kokoroProvider.play(
        request.messageId,
        request.audioDataB64,
        request.format,
        request.transcript,
        playbackOptions,
      );

      if (!kokoroResult.success) {
        this.tracking.logMetric("stt.tts.fail_closed", {
          message_id: request.messageId,
          provider: "kokoro",
          fallback_enabled: false,
          reason: kokoroResult.error || "kokoro_failure",
        });
      }

      return kokoroResult.success;
    } finally {
      if (this.activePlayback?.messageId === request.messageId) {
        this.activePlayback = null;
      }
    }
  }

  interruptCurrentPlayback(reason: string = "external_interrupt"): boolean {
    const interrupted = this.kokoroProvider.stopCurrentPlayback(reason);
    if (interrupted && this.activePlayback) {
      this.tracking.logMetric("stt.tts.playback_interrupted", {
        message_id: this.activePlayback.messageId,
        reason,
      });
    }
    this.activePlayback = null;
    return interrupted;
  }

  private resolvePersona(request: TtsBrokerRequest): TtsPersona {
    if (request.persona) {
      return request.persona;
    }
    if (request.messageClass === "warning") {
      return "warning_sentinel";
    }
    const text = (request.transcript || "").toLowerCase();
    if (
      text.includes("warning") ||
      text.includes("blocked") ||
      text.includes("refused") ||
      text.includes("secure mode")
    ) {
      return "warning_sentinel";
    }
    if (request.messageClass === "guidance" || request.messageClass === "cognitive") {
      return "assistant_continuity";
    }
    return "default_system";
  }

  private defaultPriorityForPersona(persona: TtsPersona): TtsPriorityClass {
    if (persona === "warning_sentinel") {
      return "p2_warning";
    }
    if (persona === "assistant_continuity") {
      return "p4_guidance";
    }
    return "p3_direct";
  }

  private resolveVoiceForPersona(persona: TtsPersona): string {
    const defaultVoice = this.settings.getArqonTtsKokoroVoice();
    const warningVoice = process.env.MAESTRO_TTS_WARNING_VOICE || "af_bella";
    const assistantVoice = process.env.MAESTRO_TTS_ASSISTANT_VOICE || defaultVoice;
    const architectVoice = process.env.MAESTRO_TTS_ARCHITECT_VOICE || assistantVoice;
    const researchVoice = process.env.MAESTRO_TTS_RESEARCH_VOICE || assistantVoice;

    const map: Record<TtsPersona, string> = {
      default_system: defaultVoice,
      assistant_continuity: assistantVoice,
      architect_agent: architectVoice,
      research_agent: researchVoice,
      warning_sentinel: warningVoice,
    };
    return map[persona] || defaultVoice;
  }
}
