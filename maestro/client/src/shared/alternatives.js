"use strict";
exports.__esModule = true;
exports.isValidAlternative = exports.isMetaResponse = exports.commandTypeToString = void 0;
var core_1 = require("../gen/core");
var commandTypeToString = function (commandType) {
    if (typeof commandType === "number") {
        return core_1.core.CommandType[commandType];
    }
    return commandType;
};
exports.commandTypeToString = commandTypeToString;
var isMetaResponse = function (response) {
    return (!!response &&
        response.alternatives &&
        response.alternatives.length > 0 &&
        response.alternatives[0].commands &&
        response.alternatives[0].commands.length > 0 &&
        [core_1.core.CommandType.COMMAND_TYPE_USE, core_1.core.CommandType.COMMAND_TYPE_CANCEL].includes(response.alternatives[0].commands[0].type));
};
exports.isMetaResponse = isMetaResponse;
var isValidAlternative = function (alternative) {
    return (alternative.commands &&
        alternative.commands.every(function (command) { return command.type != core_1.core.CommandType.COMMAND_TYPE_INVALID; }));
};
exports.isValidAlternative = isValidAlternative;
