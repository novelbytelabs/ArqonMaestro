"use strict";
/**
 * arqon-driver stub
 *
 * Stub replacement for the native arqon driver module.
 *
 * The original driver provides:
 * - mouse click simulation
 * - UI element detection
 * - keyboard simulation
 * - application management (launch, quit, focus)
 * - text input
 *
 * This stub provides no-op implementations that log warnings.
 * For production, this would be replaced with:
 * - Electron's accessibility APIs
 * - Native Node.js libraries like robotjs or nut.js
 * - Rust-based driver implementation
 */
exports.__esModule = true;
exports.getRunningApplications = exports.quitApplication = exports.launchApplication = exports.getInstalledApplications = exports.focusApplication = exports.getEditorState = exports.getActiveApplication = exports.moveMouse = exports.typeText = exports.type = exports.pressKey = exports.clickButton = exports.getClickableButtons = exports.click = void 0;
var child_process_1 = require("child_process");
function xprop(args) {
    try {
        var result = (0, child_process_1.spawnSync)("xprop", args, {
            encoding: "utf8",
            env: process.env
        });
        if (result.status === 0) {
            return result.stdout.trim();
        }
    }
    catch (e) { }
    return "";
}
// Mouse operations
function click(button, count) {
    console.warn("[arqon-driver stub] click() not implemented - would click", button, count);
}
exports.click = click;
// UI element operations
function getClickableButtons() {
    console.warn("[arqon-driver stub] getClickableButtons() not implemented");
    return Promise.resolve([]);
}
exports.getClickableButtons = getClickableButtons;
function clickButton(name) {
    console.warn("[arqon-driver stub] clickButton() not implemented - would click button:", name);
}
exports.clickButton = clickButton;
// Keyboard operations
function pressKey(key, modifiers, count) {
    console.warn("[arqon-driver stub] pressKey() not implemented - would press:", key, modifiers, count);
}
exports.pressKey = pressKey;
function type(text) {
    console.warn("[arqon-driver stub] type() not implemented - would type:", text);
}
exports.type = type;
function typeText(text) {
    console.warn("[arqon-driver stub] typeText() not implemented - would type:", text);
}
exports.typeText = typeText;
// Mouse movement
function moveMouse(x, y) {
    console.warn("[arqon-driver stub] moveMouse() not implemented - would move to:", x, y);
}
exports.moveMouse = moveMouse;
// Application operations
// Returns a string representing the active application name
// This is used by System.determineActiveApplication() which calls .toLowerCase() on it
function getActiveApplication() {
    var activeWindow = xprop(["-root", "_NET_ACTIVE_WINDOW"]);
    var match = activeWindow.match(/0x[0-9a-f]+/i);
    if (!match || match[0] == "0x0") {
        return Promise.resolve("");
    }
    var properties = xprop(["-id", match[0], "WM_CLASS", "_NET_WM_NAME"]);
    var classMatch = properties.match(/WM_CLASS\(STRING\)\s*=\s*(.+)/);
    if (classMatch) {
        return Promise.resolve(classMatch[1].replace(/"/g, "").toLowerCase());
    }
    var nameMatch = properties.match(/_NET_WM_NAME\([A-Z_]+\)\s*=\s*"(.+)"/);
    if (nameMatch) {
        return Promise.resolve(nameMatch[1].toLowerCase());
    }
    return Promise.resolve("");
}
exports.getActiveApplication = getActiveApplication;
function getEditorState() {
    console.warn("[arqon-driver stub] getEditorState() not implemented");
    return Promise.resolve({});
}
exports.getEditorState = getEditorState;
function focusApplication(name, aliases) {
    console.warn("[arqon-driver stub] focusApplication() not implemented - would focus:", name, aliases);
}
exports.focusApplication = focusApplication;
function getInstalledApplications() {
    console.warn("[arqon-driver stub] getInstalledApplications() not implemented");
    return Promise.resolve([]);
}
exports.getInstalledApplications = getInstalledApplications;
function launchApplication(name, aliases) {
    console.warn("[arqon-driver stub] launchApplication() not implemented - would launch:", name, aliases);
}
exports.launchApplication = launchApplication;
function quitApplication(name, aliases) {
    console.warn("[arqon-driver stub] quitApplication() not implemented - would quit:", name, aliases);
}
exports.quitApplication = quitApplication;
function getRunningApplications() {
    console.warn("[arqon-driver stub] getRunningApplications() not implemented");
    return Promise.resolve([]);
}
exports.getRunningApplications = getRunningApplications;
// Default export
exports["default"] = {
    click: click,
    getClickableButtons: getClickableButtons,
    clickButton: clickButton,
    pressKey: pressKey,
    type: type,
    typeText: typeText,
    moveMouse: moveMouse,
    getActiveApplication: getActiveApplication,
    getEditorState: getEditorState,
    focusApplication: focusApplication,
    getInstalledApplications: getInstalledApplications,
    launchApplication: launchApplication,
    quitApplication: quitApplication,
    getRunningApplications: getRunningApplications
};
