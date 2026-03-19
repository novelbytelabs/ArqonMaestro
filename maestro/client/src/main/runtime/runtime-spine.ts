import Active from "../active";
import API from "../api";
import Executor from "../execute/executor";
import Custom from "../ipc/custom";
import Log from "../log";
import Settings from "../settings";
import ChunkManager from "../stream/chunk-manager";
import { ChunkQueue } from "../stream/chunk-queue";
import Microphone from "../stream/microphone";
import Stream from "../stream/stream";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import RendererBridge from "../bridge";
import STTTracking from "../stt/tracking";
import { createBusClient } from "../stt/bus-client";
import { createSTTComparator } from "../stt/comparator";
import HPOTuner from "../stt/hpo-tuner";
import { createTrafficRouter } from "../stt/traffic-router";
import type App from "../app";
import ExecutionTrace from "./execution-trace";
import RuntimeCommandDispatcher from "./runtime-command-dispatcher";
import RuntimeCommandEmitter from "./runtime-command-emitter";

interface RuntimeSpineCoreDeps {
  active: Active;
  api: API;
  log: Log;
  settings: Settings;
}

interface RuntimeSpineChunkManagerDeps {
  active: Active;
  api: API;
  app: App;
  bridge: RendererBridge;
  chunkQueue: ChunkQueue;
  custom: Custom;
  executor: Executor;
  log: Log;
  mainWindow: MainWindow;
  microphone: Microphone;
  miniModeWindow: MiniModeWindow;
  settings: Settings;
}

// This isolates the hot-path/STT cluster from general app boot wiring so the
// main-process runtime spine can be reasoned about as one unit.
export default class RuntimeSpine {
  readonly tracking: STTTracking;
  readonly hpoTuner: HPOTuner;
  readonly stream: Stream;
  readonly executionTrace: ExecutionTrace;
  readonly runtimeCommandEmitter: RuntimeCommandEmitter;

  private chunkManager?: ChunkManager;
  private runtimeCommandDispatcher?: RuntimeCommandDispatcher;

  constructor({ active, api, log, settings }: RuntimeSpineCoreDeps) {
    this.tracking = new STTTracking(api, settings);
    this.hpoTuner = new HPOTuner(settings, log, this.tracking);
    this.stream = new Stream(active, api, log, settings, this.tracking);
    this.executionTrace = new ExecutionTrace(log);
    this.runtimeCommandEmitter = new RuntimeCommandEmitter(log);
  }

  attachChunkManager({
    active,
    api,
    app,
    bridge,
    chunkQueue,
    custom,
    executor,
    log,
    mainWindow,
    microphone,
    miniModeWindow,
    settings,
  }: RuntimeSpineChunkManagerDeps): ChunkManager {
    this.runtimeCommandDispatcher = new RuntimeCommandDispatcher(
      custom,
      this.runtimeCommandEmitter,
      executor,
      log,
      this.executionTrace
    );
    this.stream.setRuntimeCommandDispatcher(this.runtimeCommandDispatcher);

    const chunkManager = new ChunkManager(
      active,
      api,
      app,
      bridge,
      chunkQueue,
      custom,
      executor,
      log,
      mainWindow,
      microphone,
      miniModeWindow,
      settings,
      this.stream,
      this.tracking,
      this.runtimeCommandDispatcher
    );
    chunkManager.setExecutionTrace(this.executionTrace);
    executor.setExecutionTrace(this.executionTrace);

    const busClient = createBusClient(settings, log, this.tracking, this.hpoTuner);
    chunkManager.setBusClient(busClient);

    const comparator = createSTTComparator(log, settings, this.tracking);
    chunkManager.setComparator(comparator);

    const trafficRouter = createTrafficRouter(settings, log, this.tracking);
    chunkManager.setTrafficRouter(trafficRouter);

    if (trafficRouter.isEnabled()) {
      trafficRouter.startStageCheck(
        (stage) => {
          log.logVerbose(`[RuntimeSpine] Cutover promoted to stage: ${stage}`);
        },
        (reason) => {
          log.logError(`[RuntimeSpine] Cutover rolled back: ${reason}`);
        }
      );
    }

    if (busClient.isEnabled()) {
      busClient.startHealthCheck(() => {
        return {
          status: busClient.isConnected() ? "healthy" : "unhealthy",
          latency: 0,
          errors: 0,
        };
      });
    }

    this.chunkManager = chunkManager;
    return chunkManager;
  }

  async start(): Promise<void> {
    await this.hpoTuner.start();
  }

  stop(): void {
    this.hpoTuner.stop();
  }

  getChunkManager(): ChunkManager | undefined {
    return this.chunkManager;
  }
}
