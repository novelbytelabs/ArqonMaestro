import {
  ChildProcessWithoutNullStreams,
  spawn,
  spawnSync,
} from "child_process";

import { DenoiseProvider, NoopDenoiseProvider, DenoiseFrame } from "./denoise-provider";
import { VadProvider, DefaultVadProvider, VadDecision, VadConfig } from "./vad-provider";

export interface SpeechRecorderOptions {
  device?: number;
  sileroVadSilenceThreshold?: number;
  sileroVadSpeechThreshold?: number;
  sileroVadSpeakingThreshold?: number;
  onChunkStart?: (data: { audio: Int16Array; frameIndex: number; timestampMs: number; streamTimeMs: number }) => void;
  onAudio?: (data: {
    audio: Int16Array;
    consecutiveSilence: number;
    speaking: boolean;
    volume: number;
    frameIndex: number;
    timestampMs: number;
    streamTimeMs: number;
  }) => void;
  onChunkEnd?: () => void;
}

export interface AudioDeviceInfo {
  id: number;
  name: string;
  maxInputChannels: number;
}

/**
 * Audio frame contract with metadata
 * Wave A: Frame metadata attached at frame creation point
 */
export interface AudioFrame {
  /** PCM audio data */
  pcm16: Int16Array;
  /** Sample rate (Hz) */
  sampleRate: number;
  /** Number of channels */
  channels: number;
  /** Monotonic frame index */
  frameIndex: number;
  /** Wall-clock timestamp at capture */
  timestampMs: number;
  /** Stream time in milliseconds (derived from frame count and sample rate) */
  streamTimeMs: number;
}

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const FRAME_SAMPLES = 480;
const FRAME_BYTES = FRAME_SAMPLES * BYTES_PER_SAMPLE;

class SpeechRecorder {
  private debugFrameCounter = 0;
  private process?: ChildProcessWithoutNullStreams;
  private pcmBuffer: Buffer = Buffer.alloc(0);
  private leadingFrames: Buffer[] = [];
  private running = false;
  private speaking = false;
  private consecutiveSpeech = 0;
  private consecutiveSilence = 0;
  private consecutiveFramesForSpeaking = 1;
  private silenceFramesToEnd = 10;
  private leadingBufferFrames = 10;
  private currentChunkFrames = 0;
  private maxChunkFrames = 100;
  private baseSilenceThreshold = 0.008;
  private baseSpeechThreshold = 0.015;
  private noiseFloor = 0.002;
  
  // Wave A: Frame metadata tracking
  private frameIndex = 0;
  private streamStartTime = 0;
  
  // Wave A: Provider chain
  private denoiseProvider: DenoiseProvider;
  private vadProvider: VadProvider;

  constructor(private options: SpeechRecorderOptions = {}) {
    this.baseSilenceThreshold = this.mapVadThreshold(options.sileroVadSilenceThreshold, 0.008);
    this.baseSpeechThreshold = this.mapVadThreshold(
      options.sileroVadSpeakingThreshold ?? options.sileroVadSpeechThreshold,
      0.015
    );
    if (this.baseSilenceThreshold >= this.baseSpeechThreshold) {
      this.baseSilenceThreshold = Math.max(0.001, this.baseSpeechThreshold * 0.7);
    }
    
    // Initialize providers with current VAD configuration
    const vadConfig: VadConfig = {
      baseSilenceThreshold: this.baseSilenceThreshold,
      baseSpeechThreshold: this.baseSpeechThreshold,
      silenceFramesToEnd: this.silenceFramesToEnd,
      consecutiveFramesForSpeaking: this.consecutiveFramesForSpeaking,
    };
    
    this.denoiseProvider = new NoopDenoiseProvider();
    this.vadProvider = new DefaultVadProvider(vadConfig);
  }

  private mapVadThreshold(value: number | undefined, fallback: number): number {
    if (value === undefined || Number.isNaN(value)) {
      return fallback;
    }

    // Existing UI defaults are tuned for the native module and are much larger than RMS.
    // Convert those values to a stable RMS range for PCM processing.
    if (value > 0.1) {
      return Math.max(0.004, Math.min(0.2, value * 0.04));
    }

    return Math.max(0.001, Math.min(0.2, value));
  }

  private effectiveSilenceThreshold(): number {
    return Math.max(this.baseSilenceThreshold, this.noiseFloor * 1.8);
  }

  private effectiveSpeechThreshold(): number {
    return Math.max(this.baseSpeechThreshold, this.effectiveSilenceThreshold() * 1.5, this.noiseFloor * 3);
  }

  private hasCommand(command: string): boolean {
    return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
  }

  private pulseSources(): string[] {
    try {
      const result = spawnSync("pactl", ["list", "short", "sources"], {
        encoding: "utf8",
      });
      if (result.status !== 0 || !result.stdout) {
        return [];
      }

      return result.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.includes(".monitor"))
        .map((line) => line.split(/\s+/)[1])
        .filter((name) => !!name);
    } catch (_e) {
      return [];
    }
  }

  private selectedPulseSource(): string | undefined {
    const sources = this.pulseSources();
    if (this.options.device !== undefined && this.options.device >= 0) {
      const source = sources[this.options.device];
      if (source) {
        return source;
      }

      console.warn(
        `[Audio] Requested microphone index ${this.options.device} is unavailable; falling back to default source`
      );
    }

    try {
      const result = spawnSync("pactl", ["get-default-source"], {
        encoding: "utf8",
      });
      const source = (result.stdout || "").trim();
      if (source && !source.includes(".monitor")) {
        return source;
      }
    } catch (_e) {}

    return sources[0];
  }

  private spawnRecorder(): ChildProcessWithoutNullStreams {
    if (this.hasCommand("parec")) {
      const args = [
        "--format=s16le",
        `--rate=${SAMPLE_RATE}`,
        `--channels=${CHANNELS}`,
        "--raw",
      ];
      const source = this.selectedPulseSource();
      if (source) {
        args.push("--device", source);
        console.log(`[Audio] Using PulseAudio source: ${source}`);
      } else {
        console.log("[Audio] Using default PulseAudio source");
      }
      return spawn(
        "parec",
        args,
        { stdio: ["pipe", "pipe", "pipe"] }
      );
    }

    return spawn(
      "arecord",
      ["-q", "-f", "S16_LE", "-r", `${SAMPLE_RATE}`, "-c", `${CHANNELS}`, "-t", "raw"],
      { stdio: ["pipe", "pipe", "pipe"] }
    );
  }

  private pcmToInt16(buffer: Buffer): Int16Array {
    const samples = buffer.length / BYTES_PER_SAMPLE;
    const result = new Int16Array(samples);
    for (let i = 0; i < samples; i++) {
      result[i] = buffer.readInt16LE(i * BYTES_PER_SAMPLE);
    }
    return result;
  }

  private rms(audio: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < audio.length; i++) {
      const sample = audio[i] / 32768;
      sum += sample * sample;
    }
    return Math.sqrt(sum / audio.length);
  }

  private concatFrames(frames: Buffer[]): Int16Array {
    if (frames.length == 0) {
      return new Int16Array(0);
    }

    return this.pcmToInt16(Buffer.concat(frames));
  }

  /**
   * Create an AudioFrame with metadata
   * Wave A: Frame metadata attached at frame creation point
   */
  private createAudioFrame(pcmData: Int16Array): AudioFrame {
    const timestampMs = Date.now();
    const streamTimeMs = (this.frameIndex * FRAME_SAMPLES / SAMPLE_RATE) * 1000;
    
    return {
      pcm16: pcmData,
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      frameIndex: this.frameIndex,
      timestampMs,
      streamTimeMs,
    };
  }

  /**
   * Process PCM data through the provider chain
   * Wave A: Denoise -> VAD -> speech state decisions
   */
  private processPcmData(data: Buffer): void {
    this.pcmBuffer = Buffer.concat([this.pcmBuffer, data]);

    while (this.pcmBuffer.length >= FRAME_BYTES) {
      const frame = this.pcmBuffer.subarray(0, FRAME_BYTES);
      this.pcmBuffer = this.pcmBuffer.subarray(FRAME_BYTES);
      this.leadingFrames.push(Buffer.from(frame));
      if (this.leadingFrames.length > this.leadingBufferFrames) {
        this.leadingFrames.shift();
      }

      // Wave A: Create frame with metadata
      const audio = this.pcmToInt16(frame);
      const audioFrame = this.createAudioFrame(audio);
      
      // Wave A: Pass through denoise provider
      const denoiseResult = this.denoiseProvider.process({
        pcm16: audioFrame.pcm16,
        sampleRate: audioFrame.sampleRate,
        channels: audioFrame.channels,
        frameIndex: audioFrame.frameIndex,
        timestampMs: audioFrame.timestampMs,
        streamTimeMs: audioFrame.streamTimeMs,
      });
      
      // Use denoised audio for VAD
      const denoisedAudio = denoiseResult.frame.pcm16;
      const volume = this.rms(denoisedAudio);
      
      // Wave A: Get VAD decision from provider
      const vadDecision = this.vadProvider.process({
        pcm16: denoisedAudio,
        sampleRate: audioFrame.sampleRate,
        channels: audioFrame.channels,
        frameIndex: audioFrame.frameIndex,
        timestampMs: audioFrame.timestampMs,
        streamTimeMs: audioFrame.streamTimeMs,
      });
      
      // Use VAD provider result for speech state
      this.speaking = vadDecision.isSpeech;
      this.noiseFloor = vadDecision.noiseFloor;
      
      // Get thresholds for logging (computed by provider internally)
      const silenceThreshold = this.effectiveSilenceThreshold();
      const speechThreshold = this.effectiveSpeechThreshold();
      
      const wasSpeaking = vadDecision.isSpeech;

      if (!wasSpeaking && this.speaking) {
        this.currentChunkFrames = 0;
        console.log(
          `[Audio] Chunk start volume=${volume.toFixed(4)} speechThreshold=${speechThreshold.toFixed(
            4
          )} noiseFloor=${this.noiseFloor.toFixed(4)}`
        );
        // Wave A: Include frame metadata in callback
        this.options.onChunkStart?.({ 
          audio: this.concatFrames(this.leadingFrames),
          frameIndex: audioFrame.frameIndex,
          timestampMs: audioFrame.timestampMs,
          streamTimeMs: audioFrame.streamTimeMs,
        });
      } else if (wasSpeaking && !this.speaking) {
        this.currentChunkFrames = 0;
        console.log(
          `[Audio] Chunk end silenceFrames=${this.consecutiveSilence} silenceThreshold=${silenceThreshold.toFixed(
            4
          )} noiseFloor=${this.noiseFloor.toFixed(4)}`
        );
        this.options.onChunkEnd?.();
      }

      if (this.speaking) {
        this.currentChunkFrames += 1;
        if (this.currentChunkFrames >= this.maxChunkFrames) {
          this.currentChunkFrames = 0;
          this.speaking = false;
          this.consecutiveSpeech = 0;
          this.consecutiveSilence = 0;
          console.log(
            `[Audio] Chunk force-end maxChunkFrames=${this.maxChunkFrames} volume=${volume.toFixed(
              4
            )}`
          );
          this.options.onChunkEnd?.();
        }
      }

      this.debugFrameCounter += 1;
      if (
        (this.speaking || volume > silenceThreshold * 0.5) &&
        this.debugFrameCounter % 25 == 0
      ) {
        console.log(
          `[Audio] Frame volume=${volume.toFixed(4)} speaking=${this.speaking} silence=${this.consecutiveSilence} noiseFloor=${this.noiseFloor.toFixed(4)} thresholds=${silenceThreshold.toFixed(
            4
          )}/${speechThreshold.toFixed(4)}`
        );
      }

      // Wave A: Include frame metadata in audio callback
      this.options.onAudio?.({
        audio: denoisedAudio,
        consecutiveSilence: this.consecutiveSilence,
        speaking: this.speaking,
        volume,
        frameIndex: audioFrame.frameIndex,
        timestampMs: audioFrame.timestampMs,
        streamTimeMs: audioFrame.streamTimeMs,
      });
      
      // Increment frame index after processing
      this.frameIndex++;
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.speaking = false;
    this.consecutiveSpeech = 0;
    this.consecutiveSilence = 0;
    this.currentChunkFrames = 0;
    this.debugFrameCounter = 0;
    this.pcmBuffer = Buffer.alloc(0);
    this.leadingFrames = [];
    this.noiseFloor = 0.002;
    
    // Wave A: Reset frame metadata
    this.frameIndex = 0;
    this.streamStartTime = Date.now();
    
    // Wave A: Reset providers
    this.denoiseProvider.reset();
    this.vadProvider.reset();
    
    console.log(
      `[Audio] Starting recorder device=${this.options.device ?? -1} silenceThreshold=${this.baseSilenceThreshold.toFixed(
        4
      )} speechThreshold=${this.baseSpeechThreshold.toFixed(4)}`
    );

    this.process = this.spawnRecorder();
    this.process.stdout.on("data", (chunk: Buffer) => {
      if (this.running) {
        this.processPcmData(chunk);
      }
    });

    this.process.stderr.on("data", (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        console.warn(`[Audio] ${message}`);
      }
    });

    this.process.on("error", (error) => {
      console.error("[Audio] Recorder error:", error);
    });

    this.process.on("close", () => {
      if (this.running) {
        this.running = false;
        this.options.onChunkEnd?.();
      }
    });
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.pcmBuffer = Buffer.alloc(0);
    this.leadingFrames = [];
    if (this.speaking) {
      this.options.onChunkEnd?.();
    }

    this.speaking = false;
    this.consecutiveSpeech = 0;
    this.consecutiveSilence = 0;
    this.currentChunkFrames = 0;

    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = undefined;
    }
  }
}

function devices(): AudioDeviceInfo[] {
  try {
    const result = spawnSync("pactl", ["list", "short", "sources"], {
      encoding: "utf8",
    });
    if (result.status === 0 && result.stdout) {
      const parsed = result.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.includes(".monitor"))
        .map((line, index) => {
          const parts = line.split(/\s+/);
          return {
            id: index,
            name: parts[1] || `Microphone ${index + 1}`,
            maxInputChannels: 1,
          };
        });

      if (parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_e) {}

  return [];
}

async function getDevices(): Promise<AudioDeviceInfo[]> {
  return devices();
}

export { SpeechRecorder, devices, getDevices, NoopDenoiseProvider, DefaultVadProvider };
export type { DenoiseProvider, DenoiseFrame, VadProvider, VadDecision, VadConfig };
export default SpeechRecorder;
