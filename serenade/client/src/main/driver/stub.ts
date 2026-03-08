/**
 * serenade-driver stub
 * 
 * Stub replacement for the native serenade-driver module.
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

import { spawnSync } from "child_process";

function xprop(args: string[]): string {
  try {
    const result = spawnSync("xprop", args, {
      encoding: "utf8",
      env: process.env,
    });
    if (result.status === 0) {
      return result.stdout.trim();
    }
  } catch (e) {}

  return "";
}

// Mouse operations
export function click(button: string, count: number): void {
  console.warn("[serenade-driver stub] click() not implemented - would click", button, count);
}

// UI element operations
export function getClickableButtons(): Promise<string[]> {
  console.warn("[serenade-driver stub] getClickableButtons() not implemented");
  return Promise.resolve([]);
}

export function clickButton(name: string): void {
  console.warn("[serenade-driver stub] clickButton() not implemented - would click button:", name);
}

// Keyboard operations
export function pressKey(key: string, modifiers?: string[], count?: number): void {
  console.warn("[serenade-driver stub] pressKey() not implemented - would press:", key, modifiers, count);
}

export function type(text: string): void {
  console.warn("[serenade-driver stub] type() not implemented - would type:", text);
}

export function typeText(text: string): void {
  console.warn("[serenade-driver stub] typeText() not implemented - would type:", text);
}

// Mouse movement
export function moveMouse(x: number, y: number): void {
  console.warn("[serenade-driver stub] moveMouse() not implemented - would move to:", x, y);
}

// Application operations
// Returns a string representing the active application name
// This is used by System.determineActiveApplication() which calls .toLowerCase() on it
export function getActiveApplication(): Promise<string> {
  const activeWindow = xprop(["-root", "_NET_ACTIVE_WINDOW"]);
  const match = activeWindow.match(/0x[0-9a-f]+/i);
  if (!match || match[0] == "0x0") {
    return Promise.resolve("");
  }

  const properties = xprop(["-id", match[0], "WM_CLASS", "_NET_WM_NAME"]);
  const classMatch = properties.match(/WM_CLASS\(STRING\)\s*=\s*(.+)/);
  if (classMatch) {
    return Promise.resolve(classMatch[1].replace(/"/g, "").toLowerCase());
  }

  const nameMatch = properties.match(/_NET_WM_NAME\([A-Z_]+\)\s*=\s*"(.+)"/);
  if (nameMatch) {
    return Promise.resolve(nameMatch[1].toLowerCase());
  }

  return Promise.resolve("");
}

export function getEditorState(): Promise<any> {
  console.warn("[serenade-driver stub] getEditorState() not implemented");
  return Promise.resolve({});
}

export function focusApplication(name: string, aliases?: { [key: string]: string }): void {
  console.warn("[serenade-driver stub] focusApplication() not implemented - would focus:", name, aliases);
}

export function getInstalledApplications(): Promise<string[]> {
  console.warn("[serenade-driver stub] getInstalledApplications() not implemented");
  return Promise.resolve([]);
}

export function launchApplication(name: string, aliases?: { [key: string]: string }): void {
  console.warn("[serenade-driver stub] launchApplication() not implemented - would launch:", name, aliases);
}

export function quitApplication(name: string, aliases?: { [key: string]: string }): void {
  console.warn("[serenade-driver stub] quitApplication() not implemented - would quit:", name, aliases);
}

export function getRunningApplications(): Promise<string[]> {
  console.warn("[serenade-driver stub] getRunningApplications() not implemented");
  return Promise.resolve([]);
}

// Default export
export default {
  click,
  getClickableButtons,
  clickButton,
  pressKey,
  type,
  typeText,
  moveMouse,
  getActiveApplication,
  getEditorState,
  focusApplication,
  getInstalledApplications,
  launchApplication,
  quitApplication,
  getRunningApplications,
};
