"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var uuid_1 = require("uuid");
var alternatives_1 = require("../../shared/alternatives");
var PluginManager = /** @class */ (function () {
    function PluginManager(settings) {
        var _this = this;
        this.settings = settings;
        this.plugins = [];
        this.promises = {};
        setInterval(function () {
            _this.removePluginsWhere(function (e) { return Date.now() - e.lastHeartbeat > 5 * 60 * 1000; });
        }, 60 * 1000);
    }
    PluginManager.prototype.removePluginsWhere = function (predicate) {
        var result = [];
        for (var _i = 0, _a = this.plugins; _i < _a.length; _i++) {
            var plugin = _a[_i];
            if (predicate(plugin)) {
                plugin.websocket.close();
            }
            else {
                result.push(plugin);
            }
        }
        this.plugins = result;
    };
    PluginManager.prototype.updatePlugin = function (websocket, id, app, match, icon) {
        var plugin = this.fromId(id);
        if (plugin) {
            plugin.websocket = websocket;
            // only update the icon if it has a value. an empty string clears the
            // custom icon
            if (icon != undefined) {
                plugin.icon = icon;
            }
        }
        else {
            if (app == "intellij") {
                app = "jetbrains";
            }
            this.settings.setPluginInstalled(app);
            this.plugins.push({
                id: id,
                app: app,
                websocket: websocket,
                match: match,
                icon: icon,
                lastActive: Date.now(),
                lastHeartbeat: Date.now()
            });
        }
    };
    PluginManager.prototype.fromApp = function (app) {
        // search for exact app name matches first, then look for each plugin's match field
        var result = this.plugins.filter(function (e) { return e.app == app; });
        if (result.length == 0) {
            result = this.plugins.filter(function (e) { return e.match && app.match(new RegExp(e.match, "i")) != null; });
        }
        if (result.length == 0) {
            return null;
        }
        result.sort(function (a, b) { return b.lastActive - a.lastActive; });
        return result[0];
    };
    PluginManager.prototype.fromId = function (id) {
        var result = this.plugins.filter(function (e) { return e.id == id; });
        if (result.length == 0) {
            return null;
        }
        return result[0];
    };
    PluginManager.prototype.resolve = function (callback, value) {
        if (!this.promises[callback]) {
            return;
        }
        this.promises[callback](value);
        delete this.promises[callback];
    };
    PluginManager.prototype.sendResponseToApp = function (app, response) {
        return __awaiter(this, void 0, void 0, function () {
            var data, _i, _a, alternative, _b, _c, command, _d, _e, command, callback, plugin, websocket;
            var _this = this;
            return __generator(this, function (_f) {
                data = JSON.parse(JSON.stringify(response));
                // replace enum numerical values with strings, so plugins don't need the protobuf
                if (data.alternatives) {
                    for (_i = 0, _a = data.alternatives; _i < _a.length; _i++) {
                        alternative = _a[_i];
                        if (alternative.commands) {
                            for (_b = 0, _c = alternative.commands; _b < _c.length; _b++) {
                                command = _c[_b];
                                command.type = (0, alternatives_1.commandTypeToString)(command.type);
                            }
                        }
                    }
                }
                if (data.execute && data.execute.commands) {
                    for (_d = 0, _e = data.execute.commands; _d < _e.length; _d++) {
                        command = _e[_d];
                        command.type = (0, alternatives_1.commandTypeToString)(command.type);
                    }
                }
                // for backwards compatibility with previous format
                if (data.alternatives) {
                    data.alternativesList = data.alternatives;
                }
                if (data.execute && data.execute.commands) {
                    data.execute.commandsList = data.execute.commands;
                }
                callback = (0, uuid_1.v4)();
                plugin = this.fromApp(app);
                if (!plugin || plugin.websocket.readyState !== 1) {
                    return [2 /*return*/, Promise.resolve(null)];
                }
                websocket = plugin.websocket;
                websocket.send(JSON.stringify({ message: "response", data: {
                        callback: callback,
                        response: data
                    } }));
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.promises[callback] = resolve;
                        setTimeout(function () {
                            if (_this.promises[callback]) {
                                _this.promises[callback](null);
                                delete _this.promises[callback];
                                _this.removeWebSocket(websocket);
                            }
                        }, 3000);
                    })];
            });
        });
    };
    PluginManager.prototype.sendCommandToApp = function (app, command) {
        return this.sendResponseToApp(app, {
            execute: {
                commandsList: [command],
                commands: [command]
            }
        });
    };
    PluginManager.prototype.updateActive = function (websocket, id, app, match, icon) {
        this.updatePlugin(websocket, id, app, match, icon);
        this.fromId(id).lastActive = Date.now();
    };
    PluginManager.prototype.updateHeartbeat = function (websocket, id, app) {
        this.updatePlugin(websocket, id, app);
        this.fromId(id).lastHeartbeat = Date.now();
    };
    PluginManager.prototype.removeWebSocket = function (websocket) {
        this.removePluginsWhere(function (e) { return e.websocket === websocket; });
    };
    return PluginManager;
}());
exports["default"] = PluginManager;
