"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var ws_1 = __importDefault(require("ws"));
var uuid_1 = require("uuid");
var core_1 = require("../../gen/core");
var maximumIconLength = 20000;
var VirtualPluginSocket = /** @class */ (function () {
    function VirtualPluginSocket(server, pluginId, app) {
        this.server = server;
        this.pluginId = pluginId;
        this.app = app;
        this.readyState = ws_1["default"].OPEN;
    }
    VirtualPluginSocket.prototype.send = function (data) {
        this.server.publishToPlugin(this.pluginId, this.app, data);
    };
    VirtualPluginSocket.prototype.close = function () {
        this.readyState = ws_1["default"].CLOSED;
    };
    return VirtualPluginSocket;
}());
var BusPluginServer = /** @class */ (function () {
    function BusPluginServer(settings, active, bridge, custom, mainWindow, miniModeWindow, pluginManager, stream, log) {
        this.settings = settings;
        this.active = active;
        this.bridge = bridge;
        this.custom = custom;
        this.mainWindow = mainWindow;
        this.miniModeWindow = miniModeWindow;
        this.pluginManager = pluginManager;
        this.stream = stream;
        this.log = log;
        this.pluginSockets = new Map();
        this.connect();
    }
    BusPluginServer.prototype.getBusUrl = function () {
        return this.settings.getArqonBusWsUrl();
    };
    BusPluginServer.prototype.connect = function () {
        var _this = this;
        if (this.socket && this.socket.readyState === ws_1["default"].OPEN) {
            return;
        }
        this.socket = new ws_1["default"](this.getBusUrl());
        this.socket.on("open", function () {
            _this.log.logVerbose("[BusPluginServer] Connected to ".concat(_this.getBusUrl()));
        });
        this.socket.on("message", function (message) { return _this.handleRawMessage(message); });
        this.socket.on("close", function () { return _this.scheduleReconnect(); });
        this.socket.on("error", function (e) {
            _this.log.logError("[BusPluginServer] Socket error: ".concat(e));
            _this.scheduleReconnect();
        });
    };
    BusPluginServer.prototype.scheduleReconnect = function () {
        var _this = this;
        if (this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = global.setTimeout(function () {
            _this.reconnectTimer = undefined;
            _this.connect();
        }, 1000);
    };
    BusPluginServer.prototype.extractRequest = function (parsed) {
        if (!parsed || typeof parsed !== "object") {
            return null;
        }
        if (typeof parsed.message === "string") {
            return parsed;
        }
        if (parsed.payload && typeof parsed.payload.message === "string") {
            return {
                message: parsed.payload.message,
                data: parsed.payload.data
            };
        }
        return null;
    };
    BusPluginServer.prototype.pluginSocketKey = function (id, app) {
        return "".concat(app, ":").concat(id);
    };
    BusPluginServer.prototype.getPluginSocket = function (id, app) {
        var key = this.pluginSocketKey(id, app);
        var existing = this.pluginSockets.get(key);
        if (existing && existing.readyState === ws_1["default"].OPEN) {
            return existing;
        }
        if (existing) {
            this.pluginSockets["delete"](key);
        }
        var socket = new VirtualPluginSocket(this, id, app);
        this.pluginSockets.set(key, socket);
        return socket;
    };
    BusPluginServer.prototype.getSocketForRequest = function (data) {
        var id = data === null || data === void 0 ? void 0 : data.id;
        var app = data === null || data === void 0 ? void 0 : data.app;
        if (typeof id !== "string" || typeof app !== "string") {
            return undefined;
        }
        return this.getPluginSocket(id, app);
    };
    BusPluginServer.prototype.handleRawMessage = function (message) {
        var parsed;
        try {
            parsed = JSON.parse(typeof message === "string" ? message : message.toString());
        }
        catch (_a) {
            return;
        }
        var request = this.extractRequest(parsed);
        if (!request) {
            return;
        }
        var reqData = request.data || {};
        var socket = this.getSocketForRequest(reqData);
        if (request.message === "active") {
            var icon = reqData.icon;
            var iconValid = icon == undefined ||
                (typeof icon === "string" && icon.startsWith("data:") && icon.length <= maximumIconLength);
            if (!iconValid) {
                this.log.logVerbose("Plugin provided an app icon that does not adhere to requirements");
                icon = undefined;
            }
            if (socket) {
                this.pluginManager.updateActive(socket, reqData.id, reqData.app, reqData.match, icon);
            }
        }
        else if (request.message === "callback") {
            this.pluginManager.resolve(reqData.callback, reqData.data);
        }
        else if (request.message === "disconnect") {
            if (socket) {
                this.pluginManager.removeWebSocket(socket);
            }
        }
        else if (request.message === "heartbeat") {
            if (socket) {
                this.pluginManager.updateHeartbeat(socket, reqData.id, reqData.app);
            }
        }
        if (request.message === "customCommands") {
            var commands = Array.isArray(reqData.commands) ? reqData.commands : [];
            var hints = Array.isArray(reqData.hints) ? reqData.hints : [];
            var words = Array.isArray(reqData.words) ? reqData.words : [];
            this.log.logVerbose("Received ".concat(commands.length, " commands, ").concat(hints.length, " hints, ").concat(words.length, " words"));
            this.active.customCommands = commands;
            this.active.customHints = hints;
            this.active.customWords = words;
            if (socket) {
                this.custom.connect(socket);
            }
        }
        else if (request.message === "error") {
            this.bridge.setState({
                scriptError: reqData.error
                    .split("\n")
                    .filter(function (e) { return !e.startsWith("    at"); })
                    .join("\n")
                    .replace(/\n\s*\n/g, "\n")
            }, [this.mainWindow, this.miniModeWindow]);
            if (socket) {
                this.custom.connect(socket);
            }
        }
        else if (request.message === "evaluateInPlugin") {
            this.pluginManager.sendCommandToApp(this.active.app, new core_1.core.Command({
                type: core_1.core.CommandType.COMMAND_TYPE_EVALUATE_IN_PLUGIN,
                text: reqData.command
            }));
        }
        else if (request.message === "keepalive") {
            this.custom.clearKeepAliveTimeout();
        }
        else if (request.message === "sendText") {
            this.stream.sendTextRequest(reqData.text, false);
        }
        else if (this.active.isFirstPartyBrowser() && this.active.pluginConnected()) {
            if (request.message === "domClick") {
                this.pluginManager.sendCommandToApp(this.active.app, new core_1.core.Command({
                    type: core_1.core.CommandType.COMMAND_TYPE_DOM_CLICK,
                    text: reqData.query
                }));
            }
            else if (request.message === "domFocus") {
                this.pluginManager.sendCommandToApp(this.active.app, new core_1.core.Command({
                    type: core_1.core.CommandType.COMMAND_TYPE_DOM_FOCUS,
                    text: reqData.query
                }));
            }
            else if (request.message === "domBlur") {
                this.pluginManager.sendCommandToApp(this.active.app, new core_1.core.Command({
                    type: core_1.core.CommandType.COMMAND_TYPE_DOM_BLUR,
                    text: reqData.query
                }));
            }
            else if (request.message === "domCopy") {
                this.pluginManager.sendCommandToApp(this.active.app, new core_1.core.Command({
                    type: core_1.core.CommandType.COMMAND_TYPE_DOM_COPY,
                    text: reqData.query
                }));
            }
            else if (request.message === "domScroll") {
                this.pluginManager.sendCommandToApp(this.active.app, new core_1.core.Command({
                    type: core_1.core.CommandType.COMMAND_TYPE_DOM_SCROLL,
                    text: reqData.query
                }));
            }
        }
    };
    BusPluginServer.prototype.publishToPlugin = function (pluginId, app, rawPayload) {
        if (!this.socket || this.socket.readyState !== ws_1["default"].OPEN) {
            throw new Error("BusPluginServer is not connected");
        }
        var payload;
        try {
            payload = JSON.parse(rawPayload);
        }
        catch (_a) {
            return;
        }
        var envelope = {
            id: "maestro_".concat((0, uuid_1.v4)().replace(/-/g, "")),
            timestamp: new Date().toISOString(),
            type: "event",
            version: "1.0",
            room: "maestro",
            channel: "plugin.chrome",
            payload: {
                protocol: "maestro-plugin-v1",
                app: app,
                id: pluginId,
                message: payload.message,
                data: payload.data || {}
            },
            metadata: {
                transport: "arqonbus",
                source: "maestro-client"
            }
        };
        this.socket.send(JSON.stringify(envelope));
    };
    BusPluginServer.prototype.stop = function () {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = undefined;
        }
    };
    return BusPluginServer;
}());
exports["default"] = BusPluginServer;
