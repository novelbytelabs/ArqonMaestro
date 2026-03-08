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
  console.warn("[serenade-driver stub] getActiveApplication() not implemented - returning default");
  // Return a string (not object) to prevent .toLowerCase() errors in calling code
  return Promise.resolve("ArqonMaestro");
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
