import RendererBridge from "../bridge";
import Executor from "../execute/executor";
import Log from "../log";
import { Chunk } from "../stream/chunk-queue";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import { core } from "../../gen/core";
import { isMetaResponse } from "../../shared/alternatives";

interface CommandResponseServiceDeps {
  bridge: RendererBridge;
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
  onFinalResponseReady: (response: core.ICommandsResponse, sessionId?: string) => void;
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

    console.log(
      `[STREAM_TRACE] command_response_apply_enter chunkId="${response.chunkId || chunk.id}" final=${!!response.final} executePresent=${!!response.execute} executeCount=${(response.execute?.commands || []).length} alternatives=${(response.alternatives || []).length} transcript="${response.execute?.transcript || response.alternatives?.[0]?.transcript || ""}"`
    );

    if (response.final) {
      const beforeExecuteCount = (response.execute?.commands || []).length;
      const beforeAlternatives = (response.alternatives || []).length;
      response = await this.deps.executor.postProcessResponse(response);
      console.log(
        `[STREAM_TRACE] command_response_post_process chunkId="${response.chunkId || chunk.id}" executeBefore=${beforeExecuteCount} alternativesBefore=${beforeAlternatives} executeAfter=${(response.execute?.commands || []).length} alternativesAfter=${(response.alternatives || []).length} transcript="${response.execute?.transcript || response.alternatives?.[0]?.transcript || ""}"`
      );
      if (chunk.reverted) {
        chunk.revertedResponse = response;
      } else {
        chunk.response = response;
      }

      console.log(
        `[STREAM_TRACE] command_response_final_ready chunkId="${response.chunkId || chunk.id}" executePresent=${!!response.execute} executeCount=${(response.execute?.commands || []).length} alternatives=${(response.alternatives || []).length}`
      );
      params.onFinalResponseReady(response, params.getSessionId());
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
      console.log(
        `[STREAM_TRACE] command_response_attempt_evaluate chunkId="${response.chunkId || chunk.id}" executePresent=${!!response.execute} executeCount=${(response.execute?.commands || []).length} alternatives=${(response.alternatives || []).length}`
      );
      await attemptToEvaluateChunk(chunk);
    }
  }
}
