import RendererBridge from "../bridge";
import Log from "../log";
import Stream from "../stream/stream";
import { Chunk } from "../stream/chunk-queue";
import STTTracking from "../stt/tracking";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import { core } from "../../gen/core";
import ExecutionTrace from "./execution-trace";
import RuntimeCommandDispatcher from "./runtime-command-dispatcher";

interface ChunkEvaluationServiceDeps {
  bridge: RendererBridge;
  commandDispatcher: RuntimeCommandDispatcher;
  log: Log;
  mainWindow: MainWindow;
  miniModeWindow: MiniModeWindow;
  stream: Stream;
  tracking: STTTracking;
}

interface ChunkEvaluationAttempt {
  audioSizeForDelayedInitialize: number;
  chunk: Chunk;
  current: Chunk | undefined;
  executionTrace?: ExecutionTrace;
  getChunkQueueSize: () => number;
  getNoiseClassificationDelayMs: () => number;
  getResponse: (chunk: Chunk) => core.ICommandsResponse | undefined;
  onAppendToPrevious: (chunkId: string) => void;
  onMarkNoiseDelayDeadline: (deadline: number) => void;
  onResetInitializeDeadline: () => void;
  reachedSilenceThreshold: (chunk: Chunk) => boolean;
  shouldAppendToPrevious: (response: core.ICommandsResponse) => boolean;
  startBuffering: () => void;
  stopBufferingAndFlush: () => Promise<void>;
}

// Owns the final "is this chunk ready to execute?" decision path so ChunkManager
// can focus on session/audio state instead of inline execution gating.
export default class ChunkEvaluationService {
  constructor(private deps: ChunkEvaluationServiceDeps) {}

  async attempt(params: ChunkEvaluationAttempt): Promise<void> {
    const {
      audioSizeForDelayedInitialize,
      chunk,
      current,
      executionTrace,
      getChunkQueueSize,
      getNoiseClassificationDelayMs,
      getResponse,
      onAppendToPrevious,
      onMarkNoiseDelayDeadline,
      onResetInitializeDeadline,
      reachedSilenceThreshold,
      shouldAppendToPrevious,
      startBuffering,
      stopBufferingAndFlush,
    } = params;

    if (getChunkQueueSize() == 0) {
      this.deps.log.logVerbose(`Attempt to evaluate chunk, but empty chunk queue`);
      return;
    }

    this.deps.log.logVerbose(
      `Attempt to evaluate chunk\n  chunk.id: ${chunk.id}\n  chunk.executed: ${
        chunk.executed
      }\n  chunk.reverted: ${
        chunk.reverted
      }\n  chunk.response: ${!!chunk.response}\n  chunk.silence: ${
        chunk.silence
      } (${reachedSilenceThreshold(chunk)})\n  current.id: ${
        current?.id
      }\n  current.audioSize: ${current?.audioSize}`
    );

    if (!current) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: no current chunk`);
      return;
    }

    if (!chunk.reverted && chunk.executed) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: already executed`);
      return;
    }

    if (chunk.id != current.id) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: new chunk started`);
      return;
    }

    if (!chunk.reverted && !chunk.response) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: no final response yet`);
      executionTrace?.recordParseOutcome(chunk.id, "waiting_for_silence");
      return;
    }

    if (chunk.reverted && !chunk.revertedResponse) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: no reverted response yet`);
      return;
    }

    if (!reachedSilenceThreshold(chunk)) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: waiting for silence`);
      executionTrace?.recordParseOutcome(chunk.id, "waiting_for_silence");
      return;
    }

    if (
      !chunk.reverted &&
      chunk.response &&
      (!chunk.response.alternatives || chunk.response.alternatives.length == 0) &&
      !chunk.response.execute
    ) {
      this.deps.log.logVerbose(`Not executing chunk ${chunk.id}: no alternatives or execute`);
      executionTrace?.recordParseOutcome(chunk.id, "no_alternatives_or_execute");
      onMarkNoiseDelayDeadline(
        chunk.audioSize < audioSizeForDelayedInitialize
          ? Date.now() + getNoiseClassificationDelayMs()
          : 0
      );
      return;
    }

    if (chunk.response && chunk.response.final && shouldAppendToPrevious(chunk.response)) {
      this.deps.log.logVerbose(`Appending to previous ${chunk.id}`);
      chunk.reverted = Date.now();
      chunk.executed = 0;
      chunk.silence = 0;
      this.deps.stream.sendAppendToPreviousRequest();
      onAppendToPrevious(chunk.id);
      return;
    }

    this.deps.log.logVerbose(`Setting partial to false`);
    this.deps.bridge.setState(
      {
        partial: false,
      },
      [this.deps.mainWindow, this.deps.miniModeWindow]
    );

    this.deps.log.logVerbose(`Executing chunk ${chunk.id}`);
    onResetInitializeDeadline();
    chunk.executed = Date.now();
    const sessionId = this.deps.tracking.getCurrentSessionId() || undefined;
    executionTrace?.recordExecutorHandoff(chunk.id, sessionId);
    this.deps.tracking.onExecuted(chunk.id);

    startBuffering();
    await this.deps.commandDispatcher.dispatch(getResponse(chunk)!, {
      sessionId,
      updateRenderer: true,
    });
    await stopBufferingAndFlush();
  }
}
