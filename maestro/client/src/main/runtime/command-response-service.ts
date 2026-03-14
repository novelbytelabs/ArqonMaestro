import RendererBridge from "../bridge";
import Executor from "../execute/executor";
import Log from "../log";
import { Chunk } from "../stream/chunk-queue";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import { core } from "../../gen/core";
import { isMetaResponse } from "../../shared/alternatives";
import RuntimeCommandEmitter from "./runtime-command-emitter";

interface CommandResponseServiceDeps {
  bridge: RendererBridge;
  commandEmitter: RuntimeCommandEmitter;
  executor: Executor;
  log: Log;
  mainWindow: MainWindow;
  miniModeWindow: MiniModeWindow;
}

interface ApplyResponseParams {
  chunk: Chunk;
  response: core.ICommandsResponse;
  getSessionId: () => string | undefined;
  logResponse: (response: core.ICommandsResponse) => Promise<void>;
  recordNormalizedCommands: (chunkId: string, count: number, sessionId?: string) => void;
  reachedSilenceThreshold: (chunk: Chunk) => boolean;
  shouldAppendToPrevious: (response: core.ICommandsResponse) => boolean;
  attemptToEvaluateChunk: (chunk: Chunk) => Promise<void>;
}

// Owns response post-processing plus renderer-facing partial/final presentation
// so ChunkManager can stay focused on routing, session, and queue state.
export default class CommandResponseService {
  constructor(private deps: CommandResponseServiceDeps) {}

  async apply(params: ApplyResponseParams): Promise<void> {
    const { attemptToEvaluateChunk, chunk, logResponse, reachedSilenceThreshold, shouldAppendToPrevious } =
      params;
    let { response } = params;

    if (response.final) {
      response = await this.deps.executor.postProcessResponse(response);
      if (chunk.reverted) {
        chunk.revertedResponse = response;
      } else {
        chunk.response = response;
      }

      const normalizedCommands = this.deps.commandEmitter.emit(response, params.getSessionId());
      if (response.chunkId) {
        params.recordNormalizedCommands(
          response.chunkId,
          normalizedCommands.length,
          params.getSessionId()
        );
      }
    }

    if (!shouldAppendToPrevious(response)) {
      const partial = !chunk.executed && (!response.final || !reachedSilenceThreshold(chunk));
      if (
        !isMetaResponse(response) &&
        response.alternatives &&
        response.alternatives.length > 0
      ) {
        this.deps.log.logVerbose(`Setting partial = ${partial}`);
        this.deps.bridge.setState(
          {
            partial,
          },
          [this.deps.mainWindow, this.deps.miniModeWindow]
        );

        if (partial) {
          response = this.deps.executor.truncateAlternativesIfNeeded(response);
          this.deps.executor.showAlternativesIfPresent(response);
        }
      }
    }

    await logResponse(response);
    if (response.final) {
      await attemptToEvaluateChunk(chunk);
    }
  }
}
