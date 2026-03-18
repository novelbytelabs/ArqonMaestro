import {
  SpeechRecorder,
  SpeechRecorderOptions,
  TurnEvent,
  VadShadowComparison,
} from "../../../main/audio/index";

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
  kind: "chunk-start" | "chunk-end" | "audio" | "turn-event" | "vad-comparison";
  frameIndex?: number;
}

export interface RecorderTrace {
  chunkStarts: ChunkStartEvent[];
  chunkEnds: number;
  audioEvents: AudioEvent[];
  turnEvents: TurnEvent[];
  vadComparisons: VadShadowComparison[];
  eventOrder: TraceEvent[];
  providerCalls: {
    denoise: number;
    primaryVad: number;
    shadowVad: number;
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
  primaryVadProvider?: { process: (frame: unknown) => unknown };
  shadowVadProvider?: { process: (frame: unknown) => unknown };
}

export interface RunScenarioOptions {
  buffers: Buffer[];
  captureStartWallClockMs?: number;
  recorderCtor?: RecorderCtor;
  recorderOptions?: Omit<
    SpeechRecorderOptions,
    "onChunkStart" | "onAudio" | "onChunkEnd" | "onTurnEvent" | "onVadComparison"
  >;
}

const DEFAULT_CAPTURE_START_MS = 1_710_000_000_000;

export function runRecorderScenario(options: RunScenarioOptions): RecorderTrace {
  const chunkStarts: ChunkStartEvent[] = [];
  const audioEvents: AudioEvent[] = [];
  const turnEvents: TurnEvent[] = [];
  const vadComparisons: VadShadowComparison[] = [];
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
    onTurnEvent: (event) => {
      turnEvents.push(event);
      eventOrder.push({ kind: "turn-event", frameIndex: event.frameIndex });
    },
    onVadComparison: (comparison) => {
      vadComparisons.push(comparison);
      eventOrder.push({ kind: "vad-comparison", frameIndex: comparison.frameIndex });
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
  let primaryVadCalls = 0;
  let shadowVadCalls = 0;

  if (internal.denoiseProvider && typeof internal.denoiseProvider.process === "function") {
    const original = internal.denoiseProvider.process.bind(internal.denoiseProvider);
    internal.denoiseProvider.process = (frame: unknown) => {
      denoiseCalls += 1;
      return original(frame);
    };
  }

  if (internal.primaryVadProvider && typeof internal.primaryVadProvider.process === "function") {
    const original = internal.primaryVadProvider.process.bind(internal.primaryVadProvider);
    internal.primaryVadProvider.process = (frame: unknown) => {
      primaryVadCalls += 1;
      return original(frame);
    };
  }

  if (internal.shadowVadProvider && typeof internal.shadowVadProvider.process === "function") {
    const original = internal.shadowVadProvider.process.bind(internal.shadowVadProvider);
    internal.shadowVadProvider.process = (frame: unknown) => {
      shadowVadCalls += 1;
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
    turnEvents,
    vadComparisons,
    eventOrder,
    providerCalls: {
      denoise: denoiseCalls,
      primaryVad: primaryVadCalls,
      shadowVad: shadowVadCalls,
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
