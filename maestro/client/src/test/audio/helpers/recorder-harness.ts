import { SpeechRecorder, SpeechRecorderOptions } from "../../../main/audio/index";

export type RecorderCtor = new (options?: SpeechRecorderOptions) => SpeechRecorder;

export interface ChunkStartEvent {
  audioLength: number;
  frameIndex?: number;
  timestampMs?: number;
  streamTimeMs?: number;
}

export interface AudioEvent {
  audioLength: number;
  frameIndex?: number;
  timestampMs?: number;
  streamTimeMs?: number;
  speaking: boolean;
  consecutiveSilence: number;
  volume: number;
}

export interface TraceEvent {
  kind: "chunk-start" | "chunk-end" | "audio";
  frameIndex?: number;
}

export interface RecorderTrace {
  chunkStarts: ChunkStartEvent[];
  chunkEnds: number;
  audioEvents: AudioEvent[];
  eventOrder: TraceEvent[];
  providerCalls: {
    denoise: number;
    vad: number;
  };
}

interface InternalRecorder {
  processPcmData?: (data: Buffer) => void;
  captureStartWallClockMs?: number;
  frameIndex?: number;
  pcmBuffer?: Buffer;
  leadingFrames?: Buffer[];
  speaking?: boolean;
  consecutiveSpeech?: number;
  consecutiveSilence?: number;
  currentChunkFrames?: number;
  debugFrameCounter?: number;
  denoiseProvider?: { process: (frame: unknown) => unknown };
  vadProvider?: { process: (frame: unknown) => unknown };
}

export interface RunScenarioOptions {
  buffers: Buffer[];
  captureStartWallClockMs?: number;
  recorderCtor?: RecorderCtor;
  recorderOptions?: Omit<SpeechRecorderOptions, "onChunkStart" | "onAudio" | "onChunkEnd">;
}

const DEFAULT_CAPTURE_START_MS = 1_710_000_000_000;

export function runRecorderScenario(options: RunScenarioOptions): RecorderTrace {
  const chunkStarts: ChunkStartEvent[] = [];
  const audioEvents: AudioEvent[] = [];
  const eventOrder: TraceEvent[] = [];
  let chunkEnds = 0;

  const Recorder = options.recorderCtor ?? SpeechRecorder;
  const recorder = new Recorder({
    ...options.recorderOptions,
    onChunkStart: (data) => {
      chunkStarts.push({
        audioLength: data.audio.length,
        frameIndex: data.frameIndex,
        timestampMs: data.timestampMs,
        streamTimeMs: data.streamTimeMs,
      });
      eventOrder.push({ kind: "chunk-start", frameIndex: data.frameIndex });
    },
    onAudio: (data) => {
      audioEvents.push({
        audioLength: data.audio.length,
        frameIndex: data.frameIndex,
        timestampMs: data.timestampMs,
        streamTimeMs: data.streamTimeMs,
        speaking: data.speaking,
        consecutiveSilence: data.consecutiveSilence,
        volume: data.volume,
      });
      eventOrder.push({ kind: "audio", frameIndex: data.frameIndex });
    },
    onChunkEnd: () => {
      chunkEnds += 1;
      eventOrder.push({ kind: "chunk-end" });
    },
  });

  const internal = recorder as unknown as InternalRecorder;
  const processPcmData = internal.processPcmData;

  if (typeof processPcmData !== "function") {
    throw new Error("Recorder test harness could not access processPcmData().");
  }

  internal.captureStartWallClockMs = options.captureStartWallClockMs ?? DEFAULT_CAPTURE_START_MS;
  internal.frameIndex = 0;
  internal.pcmBuffer = Buffer.alloc(0);
  internal.leadingFrames = [];
  internal.speaking = false;
  internal.consecutiveSpeech = 0;
  internal.consecutiveSilence = 0;
  internal.currentChunkFrames = 0;
  internal.debugFrameCounter = 0;

  let denoiseCalls = 0;
  let vadCalls = 0;

  if (internal.denoiseProvider && typeof internal.denoiseProvider.process === "function") {
    const original = internal.denoiseProvider.process.bind(internal.denoiseProvider);
    internal.denoiseProvider.process = (frame: unknown) => {
      denoiseCalls += 1;
      return original(frame);
    };
  }

  if (internal.vadProvider && typeof internal.vadProvider.process === "function") {
    const original = internal.vadProvider.process.bind(internal.vadProvider);
    internal.vadProvider.process = (frame: unknown) => {
      vadCalls += 1;
      return original(frame);
    };
  }

  for (const buffer of options.buffers) {
    processPcmData.call(recorder, buffer);
  }

  return {
    chunkStarts,
    chunkEnds,
    audioEvents,
    eventOrder,
    providerCalls: {
      denoise: denoiseCalls,
      vad: vadCalls,
    },
  };
}

export function hasIllegalChunkOrdering(eventOrder: TraceEvent[]): boolean {
  let activeChunks = 0;

  for (const event of eventOrder) {
    if (event.kind === "chunk-start") {
      activeChunks += 1;
    }

    if (event.kind === "chunk-end") {
      activeChunks -= 1;
      if (activeChunks < 0) {
        return true;
      }
    }
  }

  return false;
}
