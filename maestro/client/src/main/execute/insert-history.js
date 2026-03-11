"use strict";
exports.__esModule = true;
var InsertHistory = /** @class */ (function () {
    function InsertHistory() {
        this.history = [];
    }
    InsertHistory.prototype.add = function (text, app) {
        this.history.unshift({ app: app, text: text, dt: Date.now() });
    };
    InsertHistory.prototype.clear = function () {
        this.history = [];
    };
    InsertHistory.prototype.latest = function (app) {
        if (this.history.length == 0) {
            return "";
        }
        var value = this.history[0];
        if (app != value.app || Date.now() - value.dt > 10000) {
            this.clear();
            return "";
        }
        return value.text;
    };
    return InsertHistory;
}());
exports["default"] = InsertHistory;
