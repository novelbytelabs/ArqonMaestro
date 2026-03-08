import WebSocket from "ws";
import fetch from "electron-fetch";
import { v4 as uuid } from "uuid";
import Active from "../active";
import API from "../api";
import ChunkManager from "./chunk-manager";
import Custom from "../ipc/custom";
import Executor from "../execute/executor";
import Log from "../log";
import Settings from "../settings";
import { core } from "../../gen/core";

export default class Stream {
  private isConnected: boolean = false;
  private lastActivity: number = 0;
  private lastConnectionError?: string;
  private keepAliveTimeout?: NodeJS.Timeout;
  private loggingBuffer: Buffer[] = [];
  private coreSocket?: WebSocket;

  constructor(
    private active: Active,
    private api: API,
    private log: Log,
    private settings: Settings
  ) {
    // disconnect after an hour with no commands
    setInterval(() => {
      if (this.connected() && Date.now() > this.lastActivity + 3600000) {
        this.disconnect();
        return;
      }
    }, 300000);

    setInterval(() => {
      if (!this.connected()) {
        return;
      }

      this.log.logVerbose("Sending keepalive");
      this.send(this.coreSocket, {
        keepAliveRequest: {},
      });

      this.keepAliveTimeout = global.setTimeout(() => {
        this.disconnect();
      }, 3000);
    }, 30000);
  }

  private send(socket: WebSocket | undefined, data: any) {
    if (!this.connected() || !socket || socket.readyState != WebSocket.OPEN) {
      return;
    }

    socket!.send(core.EvaluateRequest.encode(core.EvaluateRequest.create(data)).finish());
  }

  private async localServiceHealthy(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: "GET", timeout: 1500 });
      return response.ok;
    } catch (_e) {
      return false;
    }
  }

  private async validateBackend(): Promise<string | undefined> {
    if (this.settings.getStreamingEndpoint().id != "local") {
      return undefined;
    }

    const checks = await Promise.all([
      this.localServiceHealthy("http://localhost:17202/api/status"),
      this.localServiceHealthy("http://localhost:17203/api/status"),
    ]);

    const missing = [];
    if (!checks[0]) {
      missing.push("speech-engine (:17202)");
    }
    if (!checks[1]) {
      missing.push("code-engine (:17203)");
    }

    if (missing.length == 0) {
      return undefined;
    }

    return (
      "Local backend incomplete: missing " +
      missing.join(" and ") +
      ". Build the full local stack with `./gradlew client:installServer -x downloadModels` after installing the native dependencies from `maestro/docs/building.md`, or use a cloud endpoint."
    );
  }

  async connect(chunkManager: ChunkManager, custom: Custom, executor: Executor): Promise<boolean> {
    this.lastActivity = Date.now();
    if (this.connected()) {
      return Promise.resolve(true);
    }

    const backendIssue = await this.validateBackend();
    if (backendIssue) {
      this.lastConnectionError = backendIssue;
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (connected: boolean, error?: string) => {
        if (settled) {
          return;
        }

        settled = true;
        if (!connected) {
          this.lastConnectionError = error || "Unable to connect to stream.";
          this.isConnected = false;
          this.coreSocket?.removeAllListeners();
          this.coreSocket?.terminate();
          this.coreSocket = undefined;
        } else {
          this.lastConnectionError = undefined;
        }

        resolve(connected);
      };

      const connectionTimeout = global.setTimeout(() => {
        finish(false, "Timed out connecting to the speech backend.");
      }, 5000);

      this.coreSocket = new WebSocket(
        `${
          (process.env.ENDPOINT && process.env.ENDPOINT.startsWith("https")) ||
          (!process.env.ENDPOINT && this.settings.getStreamingEndpoint().id != "local")
            ? "wss"
            : "ws"
        }://${
          process.env.ENDPOINT
            ? process.env.ENDPOINT.replace("https://", "").replace("http://", "")
            : this.settings.getStreamingEndpoint().address
        }/stream/`
      );

      this.coreSocket.on("open", () => {
        this.log.logVerbose("Stream connected");
        this.isConnected = true;
        clearTimeout(connectionTimeout);
        finish(true);
      });

      this.coreSocket.on("message", (data: any) => {
        const response = core.EvaluateResponse.toObject(core.EvaluateResponse.decode(data), {
          defaults: true,
        });

        if (response.commandsResponse) {
          this.lastActivity = Date.now();
          if (response.commandsResponse.textResponse) {
            this.onTextCommandsResponse(custom, executor, response.commandsResponse);
          } else {
            this.onCommandsResponse(chunkManager, response.commandsResponse);
          }
        } else if (response.keepAliveResponse) {
          if (this.keepAliveTimeout) {
            clearTimeout(this.keepAliveTimeout);
          }
        }
      });

      this.coreSocket.on("close", () => {
        clearTimeout(connectionTimeout);
        if (!settled) {
          finish(false, "The speech stream closed before initialization completed.");
          return;
        }

        // an idle timeout might trigger close but not error, so reset the state to be safe
        // this callback is also triggered by toggling chunk manager
        this.disconnect();
      });

      this.coreSocket.on("error", (e) => {
        this.log.logError(e);
        clearTimeout(connectionTimeout);
        if (!settled) {
          finish(false, "Unable to connect to the speech stream.");
        } else {
          chunkManager.toggle(false);
        }
      });
    });
  }

  connected(): boolean {
    return this.isConnected;
  }

  connectionError(): string {
    return this.lastConnectionError || "";
  }

  disconnect() {
    if (!this.connected()) {
      return;
    }

    this.log.logVerbose("Stream disconnected");
    this.isConnected = false;
    this.coreSocket?.close();
    this.loggingBuffer = [];
    this.coreSocket = undefined;
  }

  onCommandsResponse(chunkManager: ChunkManager, response: core.ICommandsResponse) {
    chunkManager.onCommandsResponse(response);
  }

  async onTextCommandsResponse(
    custom: Custom,
    executor: Executor,
    response: core.ICommandsResponse
  ) {
    response = await executor.postProcessResponse(response);
    await executor.execute(response);
    custom.send("callback", {
      transcript: response.execute?.transcript,
    });
  }

  sendAppendToPreviousRequest() {
    this.send(this.coreSocket, {
      appendToPreviousRequest: {},
    });
  }

  sendAudioRequest(audio: Buffer, chunkId: string) {
    console.log(`[Stream] Audio request ${chunkId} bytes=${audio.length}`);
    if (
      this.settings.getStreamingEndpoint() &&
      this.settings.getStreamingEndpoint().id == "local" &&
      this.settings.getLogAudio()
    ) {
      this.loggingBuffer.push(Buffer.from(audio));
    }

    this.send(this.coreSocket, {
      audioRequest: {
        audio: Buffer.from(audio),
        chunkId,
      },
    });
  }

  sendCallbackRequest(callbackRequest: core.ICallbackRequest) {
    this.log.logVerbose(`Sending callback request: ${callbackRequest.type}`);
    this.send(this.coreSocket, {
      callbackRequest,
    });
  }

  sendDisableRequest() {
    this.send(this.coreSocket, {
      disableRequest: {},
    });
  }

  async sendEditorStateRequest(clipboard: boolean = false, editorState?: any): Promise<any> {
    this.log.logVerbose("Sending editor state");
    if (!editorState) {
      editorState = await this.active.getEditorState(clipboard);
    }

    this.send(this.coreSocket, {
      editorStateRequest: {
        editorState,
      },
    });
  }

  async sendEndpointRequest(chunkId: string, finalize: boolean) {
    if (
      this.settings.getStreamingEndpoint() &&
      this.settings.getStreamingEndpoint().id == "local" &&
      this.settings.getLogAudio() &&
      this.loggingBuffer.length > 0 &&
      finalize
    ) {
      this.api.logLocalAudio(Buffer.concat(this.loggingBuffer), chunkId);
      this.loggingBuffer = [];
    }

    const endpointId = uuid();
    this.log.logVerbose(
      `Sending ${finalize ? "final" : "partial"} endpoint request for ${chunkId}`
    );
    console.log(`[Stream] Endpoint request ${chunkId} finalize=${finalize}`);
    this.send(this.coreSocket, {
      endpointRequest: {
        chunkId,
        finalize,
        endpointId,
      },
    });
  }

  async sendInitializeRequest(): Promise<any> {
    this.log.logVerbose("Sending initialize request");
    console.log("[Stream] Initialize request");
    this.send(this.coreSocket, {
      initializeRequest: {
        editorState: await this.active.getEditorState(),
      },
    });
  }

  async sendTextRequest(text: string, includeAlternatives: boolean) {
    this.log.logVerbose(`Sending text request: ${text}, ${includeAlternatives}`);
    await this.sendInitializeRequest();
    this.send(this.coreSocket, {
      textRequest: {
        text,
        includeAlternatives,
      },
    });
  }
}
