"use strict";
exports.__esModule = true;
exports.ChunkQueue = void 0;
var ChunkQueue = /** @class */ (function () {
    function ChunkQueue() {
        this.maximumSize = 50;
        this.queue = [];
    }
    ChunkQueue.prototype.add = function (id) {
        this.queue.unshift({
            audioSize: 0,
            executed: 0,
            id: id,
            reverted: 0,
            silence: 0
        });
        while (this.queue.length > this.maximumSize) {
            this.queue.pop();
        }
    };
    ChunkQueue.prototype.clear = function () {
        this.queue = [];
    };
    ChunkQueue.prototype.getChunk = function (id) {
        var index = this.indexOf(id);
        return index > -1 ? this.getIndex(index) : null;
    };
    ChunkQueue.prototype.getIndex = function (index) {
        return this.queue[index];
    };
    ChunkQueue.prototype.indexOf = function (id) {
        return this.queue.findIndex(function (e) { return e.id == id; });
    };
    ChunkQueue.prototype.remove = function (id) {
        this.queue = this.queue.filter(function (e) { return e.id != id; });
    };
    ChunkQueue.prototype.size = function () {
        return this.queue.length;
    };
    return ChunkQueue;
}());
exports.ChunkQueue = ChunkQueue;
