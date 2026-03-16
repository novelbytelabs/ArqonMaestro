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
 * This implementation uses xdotool and wmctrl for Linux,
 * AppleScript for macOS, and stubs for other platforms.
 * For production, this would be replaced with:
 * - Electron's accessibility APIs
 * - Native Node.js libraries like robotjs or nut.js
 * - Rust-based driver implementation
 */

import { spawnSync, execSync } from "child_process";
import * as os from "os";

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

// Mouse operations - using xdotool on Linux
export function click(button: string, count: number): void {
  const platform = os.platform();
  
  if (platform === "linux") {
    try {
      const btn = button === "right" ? "2" : button === "middle" ? "3" : "1";
      const countStr = count > 1 ? " --repeat " + count : "";
      execSync("xdotool mouseclick" + countStr + " " + btn, { encoding: "utf8" });
    } catch (e) {
      console.warn("[arqon-driver] click failed:", e);
    }
  } else if (platform === "darwin") {
    try {
      const btn = button === "right" ? "right" : button === "middle" ? "middle" : "left";
      const cmd = "osascript -e 'tell application \"System Events\" to click " + btn + " button of process \"System Events\"'";
      execSync(cmd, { encoding: "utf8" });
    } catch (e) {
      console.warn("[arqon-driver] click failed:", e);
    }
  } else {
    console.warn("[arqon-driver] click not supported on platform:", platform);
  }
}

// UI element operations
export function getClickableButtons(): Promise<string[]> {
  console.warn("[arqon-driver stub] getClickableButtons() not implemented");
  return Promise.resolve([]);
}

export function clickButton(name: string): void {
  console.warn("[arqon-driver stub] clickButton() not implemented - would click button:", name);
}

// Keyboard operations - now using xdotool on Linux
export function pressKey(key: string, modifiers?: string[], count?: number): void {
  const platform = os.platform();
  const countStr = count && count > 1 ? " --repeat " + count + " --delay 50" : "";
  
  if (platform === "linux") {
    try {
      // Build modifier string
      let modStr = "";
      if (modifiers && modifiers.length > 0) {
        modStr = modifiers.join("+");
      }
      
      const fullKey = modStr ? modStr + "+" + key : key;
      execSync("xdotool key" + countStr + " " + fullKey, { encoding: "utf8" });
      console.log("[arqon-driver] Pressed key:", fullKey);
    } catch (e) {
      console.warn("[arqon-driver] pressKey failed for", key, ":", e);
    }
  } else if (platform === "darwin") {
    try {
      let modStr = "";
      if (modifiers) {
        modStr = modifiers.map(function(m) { return m === "control" ? "ctrl" : m; }).join(" ");
      }
      const cmd = "osascript -e 'tell application \"System Events\" to keystroke \"" + key + "\"" + (modStr ? " using " + modStr : "") + "'";
      execSync(cmd, { encoding: "utf8" });
    } catch (e) {
      console.warn("[arqon-driver] pressKey failed for", key, ":", e);
    }
  } else {
    console.warn("[arqon-driver] pressKey not supported on platform:", platform);
  }
}

export function type(text: string): void {
  console.warn("[arqon-driver stub] type() not implemented - would type:", text);
}

export function typeText(text: string): void {
  const platform = os.platform();
  
  if (platform === "linux") {
    try {
      // Escape special characters for xdotool
      const escaped = text.replace(/([\\"])/g, "\\$1");
      execSync("xdotool type --delay 50 \"" + escaped + "\"", { encoding: "utf8" });
    } catch (e) {
      console.warn("[arqon-driver] typeText failed:", e);
    }
  } else if (platform === "darwin") {
    try {
      const cmd = "osascript -e 'tell application \"System Events\" to keystroke \"" + text + "\"'";
      execSync(cmd, { encoding: "utf8" });
    } catch (e) {
      console.warn("[arqon-driver] typeText failed:", e);
    }
  } else {
    console.warn("[arqon-driver] typeText not supported on platform:", platform);
  }
}

// Mouse movement
export function moveMouse(x: number, y: number): void {
  console.warn("[arqon-driver stub] moveMouse() not implemented - would move to:", x, y);
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
  console.warn("[arqon-driver stub] getEditorState() not implemented");
  return Promise.resolve({});
}

export function focusApplication(name: string, aliases?: { [key: string]: string }): void {
  const platform = os.platform();
  
  // Resolve alias if provided
  const target = (aliases && aliases[name]) || name;
  
  // Map common app names to their X11 window classes
  const classMap: { [key: string]: string } = {
    'code': 'code',
    'vscode': 'code',
    'visual studio code': 'code',
    'editor': 'code',
    'chrome': 'google-chrome',
    'google chrome': 'google-chrome',
    'google': 'google-chrome',
    'browser': 'google-chrome',
    'chromium': 'chromium',
    'firefox': 'firefox',
    'terminal': 'gnome-terminal',
    'term': 'gnome-terminal',
    'shell': 'gnome-terminal',
    'console': 'gnome-terminal',
    'gnome terminal': 'gnome-terminal',
    'brave': 'Brave-browser',
  };
  
  const windowClass = classMap[target.toLowerCase()] || target;
  
  const display = process.env.DISPLAY || ':0';
  
  if (platform === "linux") {
    try {
      console.log("[arqon-driver] focusApplication called:", target, "class:", windowClass, "display:", display);
      // Use the CHAINED command format - this is more reliable!
      // xdotool search --class <name> windowactivate
      // This runs search, then immediately activates the first match
      const result = spawnSync("xdotool", ["search", "--onlyvisible", "--class", windowClass, "windowactivate"], { 
        encoding: "utf8",
        env: { ...process.env, DISPLAY: display }
      });
      
      if (result.status === 0) {
        console.log("[arqon-driver] Focused window via xdotool class:", windowClass);
        return;
      }
      
      // Try window name as fallback
      const nameResult = spawnSync("xdotool", ["search", "--onlyvisible", "--name", target, "windowactivate"], { 
        encoding: "utf8",
        env: { ...process.env, DISPLAY: display }
      });
      
      if (nameResult.status === 0) {
        console.log("[arqon-driver] Focused window via xdotool name:", target);
        return;
      }
      
      // Last resort: try wmctrl
      const wmctrlResult = spawnSync("wmctrl", ["-a", target], { encoding: "utf8" });
      if (wmctrlResult.status === 0) {
        console.log("[arqon-driver] Focused window via wmctrl:", target);
        return;
      }
      
      console.warn("[arqon-driver] Could not find window:", target, "(class:", windowClass, ")");
    } catch (e) {
      console.warn("[arqon-driver] focusApplication failed for", target, ":", e);
    }
  } else if (platform === "darwin") {
    // Use AppleScript for macOS
    try {
      execSync("osascript -e 'tell application \"" + target + "\" to activate'", { encoding: "utf8" });
      console.log("[arqon-driver] Focused macOS app:", target);
    } catch (e) {
      console.warn("[arqon-driver] focusApplication failed for", target, ":", e);
    }
  } else {
    console.warn("[arqon-driver] focusApplication not supported on platform:", platform);
  }
}

export function getInstalledApplications(): Promise<string[]> {
  console.warn("[arqon-driver stub] getInstalledApplications() not implemented");
  return Promise.resolve([]);
}

export function launchApplication(name: string, aliases?: { [key: string]: string }): void {
  const platform = os.platform();
  const target = (aliases && aliases[name]) || name;
  
  if (platform === "linux") {
    try {
      execSync("gtk-launch " + target + " 2>/dev/null || " + target + " &", { encoding: "utf8" });
      console.log("[arqon-driver] Launched app:", target);
    } catch (e) {
      // Try xdg-open as fallback
      try {
        execSync("xdg-open " + target, { encoding: "utf8" });
        console.log("[arqon-driver] Launched via xdg-open:", target);
      } catch (e2) {
        console.warn("[arqon-driver] Could not launch", target, ":", e2);
      }
    }
  } else if (platform === "darwin") {
    try {
      execSync("open -a \"" + target + "\"", { encoding: "utf8" });
      console.log("[arqon-driver] Launched macOS app:", target);
    } catch (e) {
      console.warn("[arqon-driver] Could not launch", target, ":", e);
    }
  } else {
    console.warn("[arqon-driver] launchApplication not supported on platform:", platform);
  }
}

export function quitApplication(name: string, aliases?: { [key: string]: string }): void {
  console.warn("[arqon-driver stub] quitApplication() not implemented - would quit:", name, aliases);
}

export function getRunningApplications(): Promise<string[]> {
  const platform = os.platform();
  
  if (platform === "linux") {
    try {
      const result = spawnSync("wmctrl", ["-l"], { encoding: "utf8" });
      if (result.status === 0 && result.stdout) {
        const apps = result.stdout
          .split("\n")
          .filter(function(line) { return line.trim(); })
          .map(function(line) {
            // Format: "0x00c00000  0 hostname Application Name"
            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
              return parts.slice(2).join(" ");
            }
            return "";
          })
          .filter(function(app) { return app.length > 0; });
        return Promise.resolve(apps);
      }
    } catch (e) {
      console.warn("[arqon-driver] getRunningApplications failed:", e);
    }
    return Promise.resolve([]);
  } else if (platform === "darwin") {
    try {
      const result = execSync("osascript -e 'tell application \"System Events\" to get name of every process whose background only is false'", { encoding: "utf8" });
      const apps = result.trim().split(", ");
      return Promise.resolve(apps);
    } catch (e) {
      console.warn("[arqon-driver] getRunningApplications failed:", e);
    }
    return Promise.resolve([]);
  }
  
  console.warn("[arqon-driver stub] getRunningApplications() not implemented");
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
