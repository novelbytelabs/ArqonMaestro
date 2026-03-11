import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import Active from "../active";
import Custom from "./custom";
import MainWindow from "../windows/main";
import MiniModeWindow from "../windows/mini-mode";
import PluginManager, { PluginTransport } from "./plugin-manager";
import RendererBridge from "../bridge";
import Stream from "../stream/stream";
import { core } from "../../gen/core";
import Log from "../log";
import Settings from "../settings";

const maximumIconLength = 20000;

type PluginMessage = {
  message: string;
  data?: any;
};

class VirtualPluginSocket implements PluginTransport {
  readyState: number = WebSocket.OPEN;

  constructor(
    private server: BusPluginServer,
    private pluginId: string,
    private app: string
  ) {}

  send(data: string): void {
    this.server.publishToPlugin(this.pluginId, this.app, data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
  }
}

export default class BusPluginServer {
  private socket?: WebSocket;
  private reconnectTimer?: NodeJS.Timeout;
  private pluginSockets: Map<string, VirtualPluginSocket> = new Map();

  constructor(
    private settings: Settings,
    private active: Active,
    private bridge: RendererBridge,
    private custom: Custom,
    private mainWindow: MainWindow,
    private miniModeWindow: MiniModeWindow,
    private pluginManager: PluginManager,
    private stream: Stream,
    private log: Log
  ) {
    this.connect();
  }

  private getBusUrl(): string {
    return this.settings.getArqonBusWsUrl();
  }

  private connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }
    this.socket = new WebSocket(this.getBusUrl());
    this.socket.on("open", () => {
      this.log.logVerbose(`[BusPluginServer] Connected to ${this.getBusUrl()}`);
    });
    this.socket.on("message", (message) => this.handleRawMessage(message));
    this.socket.on("close", () => this.scheduleReconnect());
    this.socket.on("error", (e) => {
      this.log.logError(`[BusPluginServer] Socket error: ${e}`);
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = global.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 1000);
  }

  private extractRequest(parsed: any): PluginMessage | null {
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (typeof parsed.message === "string") {
      return parsed as PluginMessage;
    }

    if (parsed.payload && typeof parsed.payload.message === "string") {
      return {
        message: parsed.payload.message,
        data: parsed.payload.data,
      };
    }

    return null;
  }

  private pluginSocketKey(id: string, app: string): string {
    return `${app}:${id}`;
  }

  private getPluginSocket(id: string, app: string): VirtualPluginSocket {
    const key = this.pluginSocketKey(id, app);
    const existing = this.pluginSockets.get(key);
    if (existing && existing.readyState === WebSocket.OPEN) {
      return existing;
    }

    if (existing) {
      this.pluginSockets.delete(key);
    }

    const socket = new VirtualPluginSocket(this, id, app);
    this.pluginSockets.set(key, socket);
    return socket;
  }

  private getSocketForRequest(data: any): VirtualPluginSocket | undefined {
    const id = data?.id;
    const app = data?.app;
    if (typeof id !== "string" || typeof app !== "string") {
      return undefined;
    }
    return this.getPluginSocket(id, app);
  }

  private handleRawMessage(message: any) {
    let parsed: any;
    try {
      parsed = JSON.parse(typeof message === "string" ? message : message.toString());
    } catch {
      return;
    }

    const request = this.extractRequest(parsed);
    if (!request) {
      return;
    }

    const reqData = request.data || {};
    const socket = this.getSocketForRequest(reqData);

    if (request.message === "active") {
      let icon = reqData.icon;
      const iconValid =
        icon == undefined ||
        (typeof icon === "string" && icon.startsWith("data:") && icon.length <= maximumIconLength);

      if (!iconValid) {
        this.log.logVerbose("Plugin provided an app icon that does not adhere to requirements");
        icon = undefined;
      }

      if (socket) {
        this.pluginManager.updateActive(socket, reqData.id, reqData.app, reqData.match, icon);
      }
    } else if (request.message === "callback") {
      this.pluginManager.resolve(reqData.callback, reqData.data);
    } else if (request.message === "disconnect") {
      if (socket) {
        this.pluginManager.removeWebSocket(socket);
      }
    } else if (request.message === "heartbeat") {
      if (socket) {
        this.pluginManager.updateHeartbeat(socket, reqData.id, reqData.app);
      }
    }

    if (request.message === "customCommands") {
      const commands = Array.isArray(reqData.commands) ? reqData.commands : [];
      const hints = Array.isArray(reqData.hints) ? reqData.hints : [];
      const words = Array.isArray(reqData.words) ? reqData.words : [];
      this.log.logVerbose(
        `Received ${commands.length} commands, ${hints.length} hints, ${words.length} words`
      );
      this.active.customCommands = commands;
      this.active.customHints = hints;
      this.active.customWords = words;
      if (socket) {
        this.custom.connect(socket);
      }
    } else if (request.message === "error") {
      this.bridge.setState(
        {
          scriptError: reqData.error
            .split("\n")
            .filter((e: string) => !e.startsWith("    at"))
            .join("\n")
            .replace(/\n\s*\n/g, "\n"),
        },
        [this.mainWindow, this.miniModeWindow]
      );
      if (socket) {
        this.custom.connect(socket);
      }
    } else if (request.message === "evaluateInPlugin") {
      this.pluginManager.sendCommandToApp(
        this.active.app,
        new core.Command({
          type: core.CommandType.COMMAND_TYPE_EVALUATE_IN_PLUGIN,
          text: reqData.command,
        })
      );
    } else if (request.message === "keepalive") {
      this.custom.clearKeepAliveTimeout();
    } else if (request.message === "sendText") {
      this.stream.sendTextRequest(reqData.text, false);
    } else if (this.active.isFirstPartyBrowser() && this.active.pluginConnected()) {
      if (request.message === "domClick") {
        this.pluginManager.sendCommandToApp(
          this.active.app,
          new core.Command({
            type: core.CommandType.COMMAND_TYPE_DOM_CLICK,
            text: reqData.query,
          })
        );
      } else if (request.message === "domFocus") {
        this.pluginManager.sendCommandToApp(
          this.active.app,
          new core.Command({
            type: core.CommandType.COMMAND_TYPE_DOM_FOCUS,
            text: reqData.query,
          })
        );
      } else if (request.message === "domBlur") {
        this.pluginManager.sendCommandToApp(
          this.active.app,
          new core.Command({
            type: core.CommandType.COMMAND_TYPE_DOM_BLUR,
            text: reqData.query,
          })
        );
      } else if (request.message === "domCopy") {
        this.pluginManager.sendCommandToApp(
          this.active.app,
          new core.Command({
            type: core.CommandType.COMMAND_TYPE_DOM_COPY,
            text: reqData.query,
          })
        );
      } else if (request.message === "domScroll") {
        this.pluginManager.sendCommandToApp(
          this.active.app,
          new core.Command({
            type: core.CommandType.COMMAND_TYPE_DOM_SCROLL,
            text: reqData.query,
          })
        );
      }
    }
  }

  publishToPlugin(pluginId: string, app: string, rawPayload: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("BusPluginServer is not connected");
    }

    let payload: PluginMessage;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      return;
    }

    const envelope = {
      id: `maestro_${uuid().replace(/-/g, "")}`,
      timestamp: new Date().toISOString(),
      type: "event",
      version: "1.0",
      room: "maestro",
      channel: "plugin.chrome",
      payload: {
        protocol: "maestro-plugin-v1",
        app,
        id: pluginId,
        message: payload.message,
        data: payload.data || {},
      },
      metadata: {
        transport: "arqonbus",
        source: "maestro-client",
      },
    };

    this.socket.send(JSON.stringify(envelope));
  }

  stop() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}
