# Focus Command Issue - Deep Dive Summary

## Problem Statement

The Arqon Maestro "focus" command (e.g., "focus code", "focus chrome", "focus terminal") does not actually switch application focus. The voice command is recognized correctly and the UI shows it was understood, but the target application window does not come to the foreground.

## Environment

- **OS**: Linux (Ubuntu 6.8)
- **Maestro**: Running as Electron app
- **Node.js**: v18+ required (confirmed in TROUBLESHOOTING.md)
- **Tools available**: xdotool, wmctrl installed

## What Works vs What Doesn't

### From Terminal (CLI):
- ✅ `xdotool windowactivate $(xdotool search --onlyvisible --name chrome | head -1)` — Brings Chrome to front
- ❌ `xdotool windowactivate $(xdotool search --onlyvisible --name vscode | head -1)` — Does NOT bring VS Code to front
- ❌ `wmctrl -R vscode` — Does NOT work

### From Maestro (Voice Command):
- ❌ "focus chrome" — Does NOT bring Chrome to front
- ❌ "focus code" — Does NOT bring VS Code to front

## Key Finding

The problem appears to be **two-fold**:

1. **The driver was a stub** — `maestro/client/src/main/driver/stub.ts` had no actual implementation of `focusApplication()`. This was fixed by implementing xdotool-based commands.

2. **xdotool behaves differently from terminal vs Electron** — Commands that work from the terminal don't work when executed from within the Electron app's main process.

## Code Location

The driver implementation is in:
- `maestro/client/src/main/driver/stub.ts` (modified to implement focus using xdotool/wmctrl)
- Build system: Webpack, TypeScript
- Entry point: Electron main process

## Current Implementation (in stub.ts)

```typescript
// Focus implementation using xdotool on Linux
async focusApplication(target: string): Promise<boolean> {
  const targetMap: Record<string, string[]> = {
    'chrome': ['google-chrome', 'chrome', 'Chrome'],
    'code': ['code', 'Visual Studio Code', 'vscode'],
    'terminal': ['gnome-terminal', 'terminal', 'Terminal'],
  };
  
  const searchTerms = targetMap[target] || [target];
  
  for (const term of searchTerms) {
    // Try wmctrl -a first
    const wmctrlResult = await this.execCommand(`wmctrl -a ${term}`);
    if (wmctrlResult.exitCode === 0) return true;
    
    // Try xdotool search + windowactivate
    const windowId = await this.getWindowId(term);
    if (windowId) {
      const activateResult = await this.execCommand(`xdotool windowactivate ${windowId}`);
      if (activateResult.exitCode === 0) return true;
    }
  }
  
  return false;
}
```

## Hypotheses to Investigate

1. **Electron sandboxing** — The Electron main process may be running in a sandboxed environment that restricts xdotool/wmctrl execution.

2. **Process ownership** — xdotool may need to run as the same user (it does), but there may be X11 display permission issues.

3. **Window manager restrictions** — Ubuntu's window manager (likely GNOME/Mutter) may block focus stealing from Electron apps but allow it from terminal.

4. **xdotool timing issues** — The window may need time to focus after activation.

5. **Different X11 display** — Electron may be using a different display or virtual display.

6. **Alternative approaches**:
   - Use `node-x11` library for direct X11 calls
   - Use `robotjs` for cross-platform input/focus
   - Use `electron` native APIs (if available)
   - Use keyboard shortcuts simulation (e.g., Alt+Tab)
   - Use D-Bus calls to GNOME shell

## Steps to Debug

1. Add logging to the driver to see what commands are being executed and their output
2. Check if xdotool is even found: `which xdotool`
3. Test with explicit paths: `/usr/bin/xdotool`
4. Check stderr output from xdotool when run from Electron
5. Try simpler xdotool commands (e.g., `xdotool getactivewindow`)
6. Try `xdotool windowfocus` in addition to `windowactivate`
7. Try adding a small delay between search and activate
8. Test if other xdotool commands work (e.g., `type`, `key`)

## Files to Examine

- `maestro/client/src/main/driver/stub.ts` — Current driver implementation
- `maestro/client/src/main/index.ts` — Electron main entry, may have contextBridge or IPC
- `maestro/client/src/main/services/` — Any existing services that run shell commands
- `maestro/client/package.json` — Dependencies and scripts
