import {
  ChildProcessWithoutNullStreams,
  spawn,
  spawnSync,
} from "child_process";

export interface SpeechRecorderOptions {
  device?: number;
  sileroVadSilenceThreshold?: number;
  sileroVadSpeechThreshold?: number;
  onChunkStart?: (data: { audio: Float32Array }) => void;
  onAudio?: (data: {
    audio: Float32Array;
    consecutiveSilence: number;
    speaking: boolean;
    volume: number;
  }) => void;
  onChunkEnd?: () => void;
}

export interface AudioDeviceInfo {
  id: number;
  name: string;
  maxInputChannels: number;
}

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const FRAME_SAMPLES = 512;
const FRAME_BYTES = FRAME_SAMPLES * BYTES_PER_SAMPLE;

class SpeechRecorder {
  private process?: ChildProcessWithoutNullStreams;
  private pcmBuffer: Buffer = Buffer.alloc(0);
  private running = false;
  private speaking = false;
  private consecutiveSilence = 0;
  private silenceFramesToEnd = 8;
  private silenceThreshold = 0.008;
  private speechThreshold = 0.015;

  constructor(private options: SpeechRecorderOptions = {}) {
    this.silenceThreshold = this.mapVadThreshold(options.sileroVadSilenceThreshold, 0.008);
    this.speechThreshold = this.mapVadThreshold(options.sileroVadSpeechThreshold, 0.015);
    if (this.silenceThreshold >= this.speechThreshold) {
      this.silenceThreshold = Math.max(0.001, this.speechThreshold * 0.7);
    }
  }

  private mapVadThreshold(value: number | undefined, fallback: number): number {
    if (value === undefined || Number.isNaN(value)) {
      return fallback;
    }

    // Existing UI defaults are tuned for the native module and are much larger than RMS.
    // Convert those values to a stable RMS range for PCM processing.
    if (value > 0.1) {
      return Math.max(0.001, Math.min(0.2, value * 0.01));
    }

    return Math.max(0.001, Math.min(0.2, value));
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
      return sources[this.options.device];
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

  private pcmToFloat32(buffer: Buffer): Float32Array {
    const samples = buffer.length / BYTES_PER_SAMPLE;
    const result = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const sample = buffer.readInt16LE(i * BYTES_PER_SAMPLE);
      result[i] = sample / 32768;
    }
    return result;
  }

  private rms(audio: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audio.length; i++) {
      sum += audio[i] * audio[i];
    }
    return Math.sqrt(sum / audio.length);
  }

  private processPcmData(data: Buffer): void {
    this.pcmBuffer = Buffer.concat([this.pcmBuffer, data]);

    while (this.pcmBuffer.length >= FRAME_BYTES) {
      const frame = this.pcmBuffer.subarray(0, FRAME_BYTES);
      this.pcmBuffer = this.pcmBuffer.subarray(FRAME_BYTES);

      const audio = this.pcmToFloat32(frame);
      const volume = this.rms(audio);
      const wasSpeaking = this.speaking;

      if (volume >= this.speechThreshold) {
        this.speaking = true;
        this.consecutiveSilence = 0;
      } else if (volume <= this.silenceThreshold) {
        this.consecutiveSilence += 1;
        if (this.consecutiveSilence >= this.silenceFramesToEnd) {
          this.speaking = false;
        }
      }

      if (!wasSpeaking && this.speaking) {
        this.options.onChunkStart?.({ audio });
      } else if (wasSpeaking && !this.speaking) {
        this.options.onChunkEnd?.();
      }

      this.options.onAudio?.({
        audio,
        consecutiveSilence: this.consecutiveSilence,
        speaking: this.speaking,
        volume,
      });
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    this.speaking = false;
    this.consecutiveSilence = 0;
    this.pcmBuffer = Buffer.alloc(0);

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
    if (this.speaking) {
      this.options.onChunkEnd?.();
    }

    this.speaking = false;
    this.consecutiveSilence = 0;

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

export { SpeechRecorder, devices, getDevices };
export default SpeechRecorder;
