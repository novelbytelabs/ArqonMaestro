import MainWindow from "../windows/main";
import RendererBridge from "../bridge";
import Settings from "../settings";
import SettingsWindow from "../windows/settings";
import Window from "../windows/window";
import { SpeechRecorder, devices } from "../audio";

declare var __static: string;

type MicrophoneInput = {
  id: number;
  name: string;
  selected: boolean;
};

export default class Microphone {
  private callbacks: { [key: string]: (message: any) => void } = {};
  private currentChunkAudio: any = new Int16Array(0);
  private currentConsecutiveSilence = 0;
  private currentSpeaking = false;
  private currentVolume = 0;
  private recorder: any = null;
  private lastUiUpdate = 0;
  private volumeWhileSpeakingBuffer: number[] = [];
  private volumeWhileSpeakingBufferSize = 10;

  // determined empirically by testing across a few different microphones and
  // used only as a visual indicator of volume, not used to determine speech
  private volumeNormalization = 5000;

  static systemDefaultMicrophone = { id: -1, name: "System Default" };
  running = false;

  constructor(
    private bridge: RendererBridge,
    private mainWindow: MainWindow,
    private settings: Settings,
    private settingsWindow: () => Promise<SettingsWindow> | undefined
  ) {}

  private calculateNormalizedVolume(volume: number): number {
    if (volume <= 1) {
      // Float RMS from PCM capture path.
      return Math.max(0, Math.min(1, volume / 0.05));
    }

    return Math.max(0, Math.min(1, volume / this.volumeNormalization));
  }

  private start() {
    if (this.running) {
      return;
    }

    console.log(
      `[Audio] Microphone start requested callbacks=${Object.keys(this.callbacks).join(",") || "none"}`
    );
    this.running = true;
    this.lastUiUpdate = 0;
    this.volumeWhileSpeakingBuffer = [];
    this.recorder = new SpeechRecorder({
      device: this.settings.getMicrophone().id,
      sileroVadSilenceThreshold: this.settings.getChunkSilenceThreshold(),
      sileroVadSpeechThreshold: this.settings.getChunkSpeechThreshold(),
      sileroVadSpeakingThreshold: this.settings.getChunkSpeechThreshold(),
      onChunkStart: ({ audio, frameIndex, timestampMs, streamTimeMs }: { audio: any; frameIndex?: number; timestampMs?: number; streamTimeMs?: number }) => {
        this.currentChunkAudio = audio;
        this.currentSpeaking = true;
        this.currentConsecutiveSilence = 0;
        this.volumeWhileSpeakingBuffer = [];
        for (const callback of Object.values(this.callbacks)) {
          callback({ event: "chunk_start", audio, frameIndex, timestampMs, streamTimeMs });
        }
      },
      onAudio: async ({
        audio,
        consecutiveSilence,
        speaking,
        volume,
        frameIndex,
        timestampMs,
        streamTimeMs,
      }: {
        audio: any;
        consecutiveSilence: number;
        speaking: boolean;
        volume: number;
        frameIndex?: number;
        timestampMs?: number;
        streamTimeMs?: number;
      }) => {
        this.currentChunkAudio = audio;
        this.currentConsecutiveSilence = consecutiveSilence;
        this.currentSpeaking = speaking;
        this.currentVolume = volume;
        // use only the start of each speech chunk for the low volume warning, or else we'll
        // always show it, since we're still speaking during the trailing buffer
        if (
          speaking &&
          this.volumeWhileSpeakingBuffer.length < this.volumeWhileSpeakingBufferSize
        ) {
          this.volumeWhileSpeakingBuffer.push(volume);
        }

        // throttle UI updates to keep the meter responsive without flooding the renderer
        if (Date.now() - this.lastUiUpdate >= 100) {
          this.lastUiUpdate = Date.now();
          let windows: Window[] = [this.mainWindow];
          if (this.settingsWindow() && (await this.settingsWindow()!).shown()) {
            windows.push(await this.settingsWindow()!);
          }

          this.bridge.setState(
            {
              speakingVolume:
                this.volumeWhileSpeakingBuffer.length == this.volumeWhileSpeakingBufferSize
                  ? this.volumeWhileSpeakingBuffer.reduce((a, b) => a + b) /
                    this.volumeWhileSpeakingBuffer.length
                  : 0,
              volume: this.calculateNormalizedVolume(volume),
            },
            windows
          );
        }

        for (const callback of Object.values(this.callbacks)) {
          callback({ event: "audio", audio, volume, speaking, consecutiveSilence, frameIndex, timestampMs, streamTimeMs });
        }
      },
      onChunkEnd: () => {
        this.currentSpeaking = false;
        this.currentConsecutiveSilence = 0;
        for (const callback of Object.values(this.callbacks)) {
          callback({ event: "chunk_end" });
        }
      },
    });

    this.recorder.start();
  }

  changeMicrophone(microphone: { id: number; name: string }) {
    this.stop();
    this.settings.setMicrophone(microphone);
    if (Object.keys(this.callbacks).length > 0) {
      setTimeout(() => {
        this.start();
      }, 1000);
    }
  }

  microphones(): MicrophoneInput[] {
    const inputs = devices().filter((e: any) => e.maxInputChannels > 0);
    return [Microphone.systemDefaultMicrophone].concat(inputs).map((e: any) => ({
      id: e.id,
      name: e.name,
      selected: e.id == this.settings.getMicrophone().id,
    }));
  }

  register(name: string, callback: (data: any) => void) {
    console.log(`[Audio] Register callback: ${name}`);
    const shouldStart = Object.keys(this.callbacks).length == 0;
    this.callbacks[name] = callback;
    if (shouldStart) {
      this.start();
    } else if (!this.running) {
      this.start();
    } else if (this.currentSpeaking) {
      callback({ event: "chunk_start", audio: this.currentChunkAudio, frameIndex: undefined, timestampMs: undefined, streamTimeMs: undefined });
      callback({
        event: "audio",
        audio: this.currentChunkAudio,
        volume: this.currentVolume,
        speaking: this.currentSpeaking,
        consecutiveSilence: this.currentConsecutiveSilence,
        frameIndex: undefined,
        timestampMs: undefined,
        streamTimeMs: undefined,
      });
    }
  }

  stop() {
    if (!this.running) {
      return;
    }

    console.log("[Audio] Microphone stop requested");
    this.recorder.stop();
    this.running = false;
    this.currentSpeaking = false;
    this.currentConsecutiveSilence = 0;
    this.currentChunkAudio = new Int16Array(0);
  }

  unregister(name: string) {
    console.log(`[Audio] Unregister callback: ${name}`);
    delete this.callbacks[name];
    if (Object.keys(this.callbacks).length == 0) {
      this.stop();
    }
  }
}
