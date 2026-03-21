import { core } from "../../gen/core";
import { Chunk } from "../stream/chunk-queue";
import ChunkEvaluationService from "./chunk-evaluation-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function run(): Promise<void> {
  async function runTest(name: string, fn: () => Promise<void> | void): Promise<void> {
    try {
      await Promise.resolve(fn());
      passed++;
      console.log(`✓ ${name}`);
    } catch (error) {
      failed++;
      console.log(`✗ ${name}: ${error}`);
    }
  }

  await runTest("forwards runtime dispatch policy context on chunk execution", async () => {
    const response = {
      final: true,
      alternatives: [{ alternativeId: "a1" }],
    } as unknown as core.ICommandsResponse;
    const chunk: Chunk = {
      audioSize: 10,
      executed: 0,
      id: "chunk-1",
      reverted: 0,
      silence: 1000,
      response,
    };

    const calls: Array<any> = [];
    const service = new ChunkEvaluationService({
      bridge: {
        setState: () => undefined,
      } as any,
      commandDispatcher: {
        dispatch: async (_response: core.ICommandsResponse, options: any) => {
          calls.push(options);
        },
      } as any,
      getDispatchContext: () => ({
        securityMode: "secure",
        speakerVerified: true,
        interactionMode: "command",
        currentApp: "chrome",
        targetSurface: "browser",
        surfaceContext: {
          activeSurface: null,
          previousSurface: null,
          activeOverlay: null,
          overlayIsFocusBlocking: false,
          confidence: "unknown",
          reason: "test",
          timestamp: Date.now(),
        },
      }),
      log: {
        logVerbose: () => undefined,
      } as any,
      mainWindow: {} as any,
      miniModeWindow: {} as any,
      stream: {} as any,
      tracking: {
        getCurrentSessionId: () => "session-42",
        onExecuted: () => undefined,
      } as any,
    });

    await service.attempt({
      audioSizeForDelayedInitialize: 6,
      chunk,
      current: chunk,
      getChunkQueueSize: () => 1,
      getNoiseClassificationDelayMs: () => 200,
      getResponse: () => response,
      onAppendToPrevious: () => undefined,
      onMarkNoiseDelayDeadline: () => undefined,
      onResetInitializeDeadline: () => undefined,
      reachedSilenceThreshold: () => true,
      shouldAppendToPrevious: () => false,
      startBuffering: () => undefined,
      stopBufferingAndFlush: async () => undefined,
    });

    assert(calls.length === 1, `expected exactly one dispatch call, got ${calls.length}`);
    assert(calls[0].sessionId === "session-42", `unexpected session id: ${calls[0].sessionId}`);
    assert(calls[0].securityMode === "secure", "expected security mode to be forwarded");
    assert(calls[0].speakerVerified === true, "expected speaker verification to be forwarded");
    assert(calls[0].interactionMode === "command", "expected interaction mode to be forwarded");
    assert(calls[0].currentApp === "chrome", "expected current app to be forwarded");
    assert(calls[0].targetSurface === "browser", "expected target surface to be forwarded");
    assert(calls[0].surfaceContext?.reason === "test", "expected surface context to be forwarded");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
