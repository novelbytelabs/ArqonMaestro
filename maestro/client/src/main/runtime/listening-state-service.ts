import RendererBridge from "../bridge";
import Log from "../log";
import STTShadowPublisher from "./stt-shadow-publisher";
import STTTracking from "../stt/tracking";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";

interface ListeningStateServiceDeps {
  bridge: RendererBridge;
  log: Log;
  mainWindow: MainWindow;
  miniModeWindow: MiniModeWindow;
  shadowPublisher: STTShadowPublisher;
  tracking: STTTracking;
}

// Owns high-level listening state transitions: session bookkeeping, toggle
// race detection, and renderer-visible listening status.
export default class ListeningStateService {
  constructor(private deps: ListeningStateServiceDeps) {}

  recordToggleRequest(
    requestedListening: boolean,
    currentListening: boolean,
    lastToggleTime: number
  ): number {
    if (requestedListening !== currentListening) {
      const now = Date.now();
      if (lastToggleTime && now - lastToggleTime < 100) {
        this.deps.tracking.onPauseResumeRace();
      }
      return now;
    }

    return lastToggleTime;
  }

  startSession(routeSession: (sessionId: string) => void): number {
    const sessionStartTime = Date.now();
    this.deps.tracking.startSession();
    const sessionId = this.deps.tracking.getCurrentSessionId();
    if (sessionId) {
      routeSession(sessionId);
    }
    return sessionStartTime;
  }

  stopSession(currentChunkId: string, sessionStartTime: number): void {
    if (this.deps.tracking.getCurrentSessionId()) {
      const durationMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
      this.deps.shadowPublisher.onSessionStop(currentChunkId, durationMs);
    }
    this.deps.tracking.endSession();
  }

  showListeningState(listening: boolean): void {
    this.deps.bridge.setState(
      {
        backendIssue: "",
        listening,
        partial: false,
        speakingVolume: 0,
        suggestion: "",
        statusText: listening ? "Listening" : "Paused",
      },
      [this.deps.mainWindow, this.deps.miniModeWindow]
    );
    this.deps.log.logVerbose(`Toggling listening to ${listening}`);
  }

  handleConnectionFailure(error: string): void {
    this.deps.bridge.setState(
      {
        backendIssue: error,
        listening: false,
        speaking: false,
        statusText: "Paused",
      },
      [this.deps.mainWindow, this.deps.miniModeWindow]
    );
    this.deps.mainWindow.updateTray();
  }
}
