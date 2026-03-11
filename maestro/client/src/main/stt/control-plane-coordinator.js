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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.MemoryControlPlaneStore = exports.SpacetimeDbControlPlaneStore = void 0;
var http_1 = __importDefault(require("http"));
var https_1 = __importDefault(require("https"));
var url_1 = require("url");
function httpRequestJson(urlStr, method, body) {
    return __awaiter(this, void 0, void 0, function () {
        var url, useHttps, transport, payload;
        return __generator(this, function (_a) {
            url = new url_1.URL(urlStr);
            useHttps = url.protocol === "https:";
            transport = useHttps ? https_1["default"] : http_1["default"];
            payload = body !== undefined ? JSON.stringify(body) : "";
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var req = transport.request({
                        hostname: url.hostname,
                        port: url.port || (useHttps ? 443 : 80),
                        path: "".concat(url.pathname).concat(url.search),
                        method: method,
                        headers: {
                            "Content-Type": "application/json",
                            "Content-Length": Buffer.byteLength(payload)
                        },
                        timeout: 3000
                    }, function (res) {
                        var raw = "";
                        res.on("data", function (chunk) {
                            raw += chunk.toString();
                        });
                        res.on("end", function () {
                            if ((res.statusCode || 500) >= 400) {
                                reject(new Error("HTTP ".concat(res.statusCode, ": ").concat(raw)));
                                return;
                            }
                            if (!raw) {
                                resolve({});
                                return;
                            }
                            try {
                                resolve(JSON.parse(raw));
                            }
                            catch (_a) {
                                resolve({});
                            }
                        });
                    });
                    req.on("error", reject);
                    req.on("timeout", function () {
                        req.destroy(new Error("request timeout"));
                    });
                    if (payload) {
                        req.write(payload);
                    }
                    req.end();
                })];
        });
    });
}
var SpacetimeDbControlPlaneStore = /** @class */ (function () {
    function SpacetimeDbControlPlaneStore(baseUrl) {
        this.baseUrl = baseUrl;
    }
    SpacetimeDbControlPlaneStore.prototype.healthcheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.baseUrl) {
                            return [2 /*return*/, false];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/health"), "GET")];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.heartbeatAgent = function (agentId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/heartbeat_agent"), "POST", { agent_id: agentId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.enqueueRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/enqueue_request"), "POST", request)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.acquireLease = function (requestId, ownerId, leaseMs, attempt) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/acquire_next_lease"), "POST", {
                            request_id: requestId,
                            owner_id: ownerId,
                            lease_ms: leaseMs,
                            attempt: attempt
                        })];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, !!(res && res.acquired)];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.ackSuccess = function (requestId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/ack_success"), "POST", { request_id: requestId })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.ackFailure = function (requestId, reason, terminal) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/ack_failure"), "POST", {
                            request_id: requestId,
                            reason: reason,
                            terminal: terminal
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.recordDecision = function (requestId, decision, reason) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/record_decision"), "POST", {
                            request_id: requestId,
                            decision: decision,
                            reason: reason,
                            timestamp: new Date().toISOString()
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.getIdempotency = function (fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            var res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/get_idempotency"), "POST", { fingerprint: fingerprint })];
                    case 1:
                        res = _a.sent();
                        return [2 /*return*/, res && res.request_id ? String(res.request_id) : undefined];
                }
            });
        });
    };
    SpacetimeDbControlPlaneStore.prototype.setIdempotency = function (fingerprint, requestId, terminalState) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, httpRequestJson("".concat(this.baseUrl, "/control/set_idempotency"), "POST", {
                            fingerprint: fingerprint,
                            request_id: requestId,
                            terminal_state: terminalState
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SpacetimeDbControlPlaneStore;
}());
exports.SpacetimeDbControlPlaneStore = SpacetimeDbControlPlaneStore;
var MemoryControlPlaneStore = /** @class */ (function () {
    function MemoryControlPlaneStore() {
        this.idempotency = new Map();
        this.healthy = true;
    }
    MemoryControlPlaneStore.prototype.setHealthy = function (healthy) {
        this.healthy = healthy;
    };
    MemoryControlPlaneStore.prototype.healthcheck = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.healthy];
            });
        });
    };
    MemoryControlPlaneStore.prototype.heartbeatAgent = function (_agentId) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MemoryControlPlaneStore.prototype.enqueueRequest = function (_request) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MemoryControlPlaneStore.prototype.acquireLease = function (_requestId, _ownerId, _leaseMs, _attempt) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.healthy];
            });
        });
    };
    MemoryControlPlaneStore.prototype.ackSuccess = function (_requestId) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MemoryControlPlaneStore.prototype.ackFailure = function (_requestId, _reason, _terminal) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MemoryControlPlaneStore.prototype.recordDecision = function (_requestId, _decision, _reason) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    MemoryControlPlaneStore.prototype.getIdempotency = function (fingerprint) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.idempotency.get(fingerprint)];
            });
        });
    };
    MemoryControlPlaneStore.prototype.setIdempotency = function (fingerprint, requestId, _terminalState) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.idempotency.set(fingerprint, requestId);
                return [2 /*return*/];
            });
        });
    };
    return MemoryControlPlaneStore;
}());
exports.MemoryControlPlaneStore = MemoryControlPlaneStore;
var ControlPlaneCoordinator = /** @class */ (function () {
    function ControlPlaneCoordinator(config, store, tracking, log) {
        this.config = config;
        this.store = store;
        this.tracking = tracking;
        this.log = log;
        this.queues = new Map();
        this.roundRobinAgents = [];
        this.roundRobinIndex = 0;
        this.inflightByAgent = new Map();
        this.inflightTotal = 0;
        this.attempts = new Map();
        this.pumpRunning = false;
        this.lastHealthState = false;
    }
    ControlPlaneCoordinator.prototype.submit = function (request, executor) {
        return __awaiter(this, void 0, void 0, function () {
            var duplicateRequestId, backboneHealthy, queue;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.config.enabled) return [3 /*break*/, 2];
                        return [4 /*yield*/, executor()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 2: return [4 /*yield*/, this.tryGetIdempotentRequest(request)];
                    case 3:
                        duplicateRequestId = _a.sent();
                        if (duplicateRequestId) {
                            this.tracking.logMetric("stt.control.dead_letter", {
                                request_id: request.requestId,
                                duplicate_of: duplicateRequestId,
                                agent_id: request.agentId
                            });
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, this.ensureBackboneHealthy()];
                    case 4:
                        backboneHealthy = _a.sent();
                        if (!(!backboneHealthy && this.config.failClosed)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.safeRecordDecision(request.requestId, "block", "spacetimedb_unavailable_fail_closed")];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.safeSetIdempotency(request.fingerprint, request.requestId, "blocked")];
                    case 6:
                        _a.sent();
                        this.tracking.logMetric("stt.control.blocked_fail_closed", {
                            request_id: request.requestId,
                            agent_id: request.agentId,
                            request_type: request.requestType
                        });
                        this.log.logError("[ControlPlane] Blocking request ".concat(request.requestId, ": SpacetimeDB unavailable"));
                        return [2 /*return*/, false];
                    case 7:
                        if (!backboneHealthy) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.safeStoreEnqueue(request)];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        queue = this.queues.get(request.agentId) || [];
                        queue.push({ request: request, executor: executor });
                        this.queues.set(request.agentId, queue);
                        if (this.roundRobinAgents.indexOf(request.agentId) === -1) {
                            this.roundRobinAgents.push(request.agentId);
                        }
                        this.tracking.logMetric("stt.control.enqueue", {
                            request_id: request.requestId,
                            agent_id: request.agentId,
                            request_type: request.requestType,
                            queue_depth: queue.length
                        });
                        this.kickPump();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    ControlPlaneCoordinator.prototype.tryGetIdempotentRequest = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!request.fingerprint) {
                            return [2 /*return*/, undefined];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.store.getIdempotency(request.fingerprint)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, undefined];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ControlPlaneCoordinator.prototype.safeSetIdempotency = function (fingerprint, requestId, state) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!fingerprint) {
                            return [2 /*return*/];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.store.setIdempotency(fingerprint, requestId, state)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _a = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ControlPlaneCoordinator.prototype.safeStoreEnqueue = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.store.heartbeatAgent(request.agentId)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.store.enqueueRequest(request)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    ControlPlaneCoordinator.prototype.ensureBackboneHealthy = function () {
        return __awaiter(this, void 0, void 0, function () {
            var healthy, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.store.healthcheck()];
                    case 1:
                        healthy = _b.sent();
                        if (healthy !== this.lastHealthState) {
                            this.lastHealthState = healthy;
                            this.log.logVerbose("[ControlPlane] SpacetimeDB health changed: ".concat(healthy ? "healthy" : "unhealthy"));
                        }
                        return [2 /*return*/, healthy];
                    case 2:
                        _a = _b.sent();
                        this.lastHealthState = false;
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ControlPlaneCoordinator.prototype.kickPump = function () {
        var _this = this;
        if (this.pumpRunning) {
            return;
        }
        this.pumpRunning = true;
        setImmediate(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, , 2, 3]);
                        return [4 /*yield*/, this.pump()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this.pumpRunning = false;
                        return [7 /*endfinally*/];
                    case 3: return [2 /*return*/];
                }
            });
        }); });
    };
    ControlPlaneCoordinator.prototype.pump = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, state_1;
            var _this = this;
            return __generator(this, function (_a) {
                _loop_1 = function () {
                    var next = this_1.popNextReadyItem();
                    if (!next) {
                        return { value: void 0 };
                    }
                    this_1.inflightTotal++;
                    this_1.inflightByAgent.set(next.request.agentId, (this_1.inflightByAgent.get(next.request.agentId) || 0) + 1);
                    this_1.dispatch(next)["catch"](function (error) {
                        _this.log.logError("[ControlPlane] Dispatch error for ".concat(next.request.requestId, ": ").concat(error));
                    });
                };
                this_1 = this;
                while (this.inflightTotal < this.config.globalInflightLimit) {
                    state_1 = _loop_1();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                }
                return [2 /*return*/];
            });
        });
    };
    ControlPlaneCoordinator.prototype.popNextReadyItem = function () {
        if (this.roundRobinAgents.length === 0) {
            return undefined;
        }
        var attempts = 0;
        while (attempts < this.roundRobinAgents.length) {
            if (this.roundRobinAgents.length === 0) {
                return undefined;
            }
            var idx = this.roundRobinIndex % this.roundRobinAgents.length;
            var agentId = this.roundRobinAgents[idx];
            var queue = this.queues.get(agentId) || [];
            var agentInflight = this.inflightByAgent.get(agentId) || 0;
            if (queue.length === 0) {
                this.roundRobinAgents.splice(idx, 1);
                this.queues["delete"](agentId);
                continue;
            }
            if (agentInflight >= this.config.agentInflightLimit) {
                this.roundRobinIndex = (idx + 1) % this.roundRobinAgents.length;
                attempts++;
                continue;
            }
            var item = queue.shift();
            if (queue.length === 0) {
                this.roundRobinAgents.splice(idx, 1);
                this.queues["delete"](agentId);
                if (this.roundRobinAgents.length > 0) {
                    this.roundRobinIndex = idx % this.roundRobinAgents.length;
                }
                else {
                    this.roundRobinIndex = 0;
                }
            }
            else {
                this.queues.set(agentId, queue);
                this.roundRobinIndex = (idx + 1) % this.roundRobinAgents.length;
            }
            return item;
        }
        return undefined;
    };
    ControlPlaneCoordinator.prototype.dispatch = function (item) {
        return __awaiter(this, void 0, void 0, function () {
            var request, startedAt, attempt, healthy, leaseAcquired, error_1, reason, attemptCount, queue, inflightForAgent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = item.request;
                        startedAt = Date.now();
                        attempt = (this.attempts.get(request.requestId) || 0) + 1;
                        this.attempts.set(request.requestId, attempt);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, 16, 17]);
                        return [4 /*yield*/, this.ensureBackboneHealthy()];
                    case 2:
                        healthy = _a.sent();
                        if (!healthy && this.config.failClosed) {
                            throw new Error("spacetimedb_unavailable_fail_closed");
                        }
                        if (!healthy) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.store.acquireLease(request.requestId, this.config.ownerId, this.config.leaseMs, attempt)];
                    case 3:
                        leaseAcquired = _a.sent();
                        if (!leaseAcquired) {
                            throw new Error("lease_not_acquired");
                        }
                        _a.label = 4;
                    case 4:
                        this.tracking.logMetric("stt.control.dispatch", {
                            request_id: request.requestId,
                            request_type: request.requestType,
                            agent_id: request.agentId,
                            attempt: attempt
                        });
                        return [4 /*yield*/, item.executor()];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.safeRecordDecision(request.requestId, "allow", "dispatched")];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.store.ackSuccess(request.requestId)];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, this.safeSetIdempotency(request.fingerprint, request.requestId, "success")];
                    case 8:
                        _a.sent();
                        this.tracking.logMetric("stt.control.latency_queue_ms", {
                            request_id: request.requestId,
                            queue_latency_ms: Date.now() - startedAt
                        });
                        return [3 /*break*/, 17];
                    case 9:
                        error_1 = _a.sent();
                        reason = error_1 && error_1.message ? error_1.message : String(error_1);
                        attemptCount = this.attempts.get(request.requestId) || 1;
                        if (!(attemptCount <= this.config.maxRetries)) return [3 /*break*/, 11];
                        queue = this.queues.get(request.agentId) || [];
                        queue.push(item);
                        this.queues.set(request.agentId, queue);
                        if (this.roundRobinAgents.indexOf(request.agentId) === -1) {
                            this.roundRobinAgents.push(request.agentId);
                        }
                        this.tracking.logMetric("stt.control.retry", {
                            request_id: request.requestId,
                            reason: reason,
                            attempt: attemptCount
                        });
                        return [4 /*yield*/, this.store.ackFailure(request.requestId, reason, false)];
                    case 10:
                        _a.sent();
                        return [3 /*break*/, 15];
                    case 11: return [4 /*yield*/, this.safeRecordDecision(request.requestId, "drop", reason)];
                    case 12:
                        _a.sent();
                        return [4 /*yield*/, this.store.ackFailure(request.requestId, reason, true)];
                    case 13:
                        _a.sent();
                        return [4 /*yield*/, this.safeSetIdempotency(request.fingerprint, request.requestId, "dead_letter")];
                    case 14:
                        _a.sent();
                        this.tracking.logMetric("stt.control.dead_letter", {
                            request_id: request.requestId,
                            reason: reason,
                            attempt: attemptCount
                        });
                        _a.label = 15;
                    case 15: return [3 /*break*/, 17];
                    case 16:
                        inflightForAgent = this.inflightByAgent.get(request.agentId) || 1;
                        this.inflightByAgent.set(request.agentId, Math.max(0, inflightForAgent - 1));
                        this.inflightTotal = Math.max(0, this.inflightTotal - 1);
                        this.kickPump();
                        return [7 /*endfinally*/];
                    case 17: return [2 /*return*/];
                }
            });
        });
    };
    ControlPlaneCoordinator.prototype.safeRecordDecision = function (requestId, decision, reason) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.store.recordDecision(requestId, decision, reason)];
                    case 1:
                        _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return ControlPlaneCoordinator;
}());
exports["default"] = ControlPlaneCoordinator;
