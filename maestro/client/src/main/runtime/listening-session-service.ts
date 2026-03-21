import App from "../app";
import RendererBridge from "../bridge";
import Custom from "../ipc/custom";
import Executor from "../execute/executor";
import MainWindow from "../windows/main";
import Microphone from "../stream/microphone";
import MiniModeWindow from "../windows/mini-mode";
import Stream from "../stream/stream";
import { TurnEvent } from "../audio/turn-events";

interface ListeningSessionServiceDeps {
  app: App;
  bridge: RendererBridge;
  custom: Custom;
  executor: Executor;
  mainWindow: MainWindow;
  microphone: Microphone;
  miniModeWindow: MiniModeWindow;
  stream: Stream;
}

interface ListeningSessionStartParams {
  chunkManager: any;
  generation: number;
  isGenerationCurrent: () => boolean;
  onChunkStart: (audio: any) => void;
  onAudio: (audio: any, consecutiveSilence: number) => void;
  onChunkEnd: () => void;
  onTurnEvent: (event: TurnEvent) => void;
  onPrepareStart: () => void;
  onConnected: () => Promise<void>;
  onConnectionFailed: (error: string) => void;
}

// Owns the live listening session boundary: microphone registration, stream
// connect/disconnect, and the shell-visible start/stop consequences.
export default class ListeningSessionService {
  constructor(private deps: ListeningSessionServiceDeps) {}

  private registerMicrophoneCallbacks(params: ListeningSessionStartParams) {
    this.deps.microphone.unregister("chunk-manager");
    this.deps.microphone.register("chunk-manager", (data: any) => {
      if (data.event == "chunk_start") {
        params.onChunkStart(data.audio);
      } else if (data.event == "audio") {
        params.onAudio(data.audio, data.consecutiveSilence);
      } else if (data.event == "chunk_end") {
        params.onChunkEnd();
      } else if (data.event == "turn_event" && data.turnEvent) {
        params.onTurnEvent(data.turnEvent as TurnEvent);
      }
    });
  }

  async start(params: ListeningSessionStartParams): Promise<boolean> {
    params.onPrepareStart();
    this.registerMicrophoneCallbacks(params);

    const connected = await this.deps.stream.connect(
      params.chunkManager,
      this.deps.custom,
      this.deps.executor
    );

    if (!params.isGenerationCurrent()) {
      this.deps.microphone.unregister("chunk-manager");
      if (connected) {
        this.deps.stream.sendDisableRequest();
        this.deps.stream.disconnect();
      }
      return false;
    }

    if (!connected) {
      this.deps.microphone.unregister("chunk-manager");
      params.onConnectionFailed(this.deps.stream.connectionError());
      this.deps.mainWindow.updateTray();
      return false;
    }

    await params.onConnected();
    return true;
  }

  stop() {
    this.deps.microphone.unregister("chunk-manager");
    this.deps.stream.sendDisableRequest();
    this.deps.stream.disconnect();
    this.deps.app.clearAlternativesAndShowExamples();
    this.deps.bridge.setState(
      {
        speaking: false,
      },
      [this.deps.mainWindow]
    );
  }
}
