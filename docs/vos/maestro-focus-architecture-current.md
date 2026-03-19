# Maestro Focus Architecture Technical Note

## Overview

This document describes the current "focus" architecture in Arqon Maestro, covering the complete flow from voice command to window activation.

## 1. Scope: System Focus vs Application Focus

**System Focus** refers to the application that is currently active at the OS/window manager level - the window that has keyboard input focus.

When Maestro needs to determine which application has focus, it queries the OS using:
- **Linux**: `xprop -root _NET_ACTIVE_WINDOW` to get the active window ID
- **X11**: Queries `WM_CLASS` and `_NET_WM_NAME` for window metadata

This determines:
- Which app had focus before a focus command (for "return focus" history)
- Which app is currently focused for validation
- Whether to track focus in the focus history

## 2. Command Flow

### 2.1 Voice Input to Command

```
User says "focus terminal"
        ↓
STT processes audio → transcript "focus terminal"
        ↓
Command response parsed → COMMAND_TYPE_FOCUS with text="terminal"
        ↓
RuntimeCommandEmitter creates RuntimeCommand with:
  - family: "focus"
  - object.type: "surface"
  - binding.strategy: "search"
  - binding.resolvedId: "terminal"
```

### 2.2 Validation Flow

Before execution, the executor validates focus commands against running applications:

```typescript
// In executor.ts postProcessResponse()
response = await this.invalidateBadApplicationCommands(
  response,
  () => this.system.runningApplications(),
  (command: core.ICommand) =>
    command.type == core.CommandType.COMMAND_TYPE_FOCUS ||
    command.type == core.CommandType.COMMAND_TYPE_QUIT
);
```

This calls `system.applicationMatches()` to check if the target (e.g., "terminal") matches any running application window title.

### 2.3 Application Matching

The `system.applicationMatches()` function (in `system.ts`) maps voice targets to actual window titles:

```typescript
const focusTargetMappings = {
  'terminal': ['terminal', 'gnome-terminal', 'term', 'shell', 'console', '@'],
  'code': ['code', 'vscode', 'vs code', 'visual studio code'],
  'chrome': ['chrome', 'google-chrome', 'google chrome', 'chromium', 'brave'],
  'browser': [..., 'firefox'],
  'firefox': ['firefox'],
  'editor': ['code', 'vscode', ...],
};
```

The "@" mapping for terminal catches shell prompts (e.g., `user@host:~`).

### 2.4 Alias Resolution

Aliases in `system.ts` map spoken forms to canonical targets:

```typescript
private aliases = {
  terminal: "terminal",
  term: "terminal", 
  shell: "terminal",
  console: "terminal",
  vscode: "code",
  "vs code": "code",
  "visual studio code": "code",
  chrome: "chrome",
  google: "chrome",
  browser: "chrome",
  firefox: "firefox",
};
```

## 3. Execution

### 3.1 Command Handler

When `COMMAND_TYPE_FOCUS` is executed, it calls:

```typescript
// In command-handler.ts
async COMMAND_TYPE_FOCUS(data: core.ICommand): Promise<any> {
  await this.focusHistory.focusTarget(data.text!, this.system, this.active.app);
}
```

### 3.2 Focus History Service

The `FocusHistoryService` tracks focus transitions:

```typescript
async focusTarget(target: string, system: System, currentApp?: string) {
  if (this.isReturnAlias(target)) {
    await this.returnFocus(system, currentApp);
    return;
  }
  
  this.observe(currentApp);  // Record previous app
  await system.focus(target);  // Activate target
  await this.refreshFromSystem(system);  // Update current app
}
```

### 3.3 Driver Implementation

The `system.focus()` calls the driver:

```typescript
async focus(application: string) {
  await driver.focusApplication(application, this.aliases);
  await this.delay(300);
}
```

#### Linux (xdotool)

The driver uses chained xdotool commands for reliability:

```bash
xdotool search --onlyvisible --class <window-class> windowactivate
```

**Window class mappings:**

| Target | X11 Window Class |
|--------|-----------------|
| code | `code` |
| chrome | `google-chrome` |
| terminal | `gnome-terminal-server` |
| firefox | `firefox` |
| brave | `Brave-browser` |

#### macOS (AppleScript)

``` applescript
tell application "TargetApp" to activate
```

## 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     VOICE INPUT                                 │
│                  "focus terminal"                               │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STT SERVICE                                  │
│              Transcript: "focus terminal"                        │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│               RUNTIME COMMAND EMITTER                           │
│  - type: COMMAND_TYPE_FOCUS                                     │
│  - text: "terminal"                                             │
│  - family: "focus"                                              │
│  - object.type: "surface"                                        │
│  - binding.strategy: "search"                                    │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                  VALIDATION FLOW                                │
│  invalidateBadApplicationCommands()                               │
│    ↓                                                            │
│  system.runningApplications() → [window titles from wmctrl]     │
│    ↓                                                            │
│  system.applicationMatches("terminal", windows)                  │
│    ↓                                                            │
│  Check if "terminal" matches any window title                    │
│    (Uses focusTargetMappings + aliases)                         │
│    ↓                                                            │
│  If match found: command stays valid                             │
│  If no match: command marked as COMMAND_TYPE_INVALID              │
└─────────────────────┬───────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                  EXECUTION                                      │
│  COMMAND_TYPE_FOCUS handler                                      │
│    ↓                                                            │
│  FocusHistoryService.focusTarget("terminal", system, current)   │
│    ↓                                                            │
│  system.focus("terminal")                                       │
│    ↓                                                            │
│  driver.focusApplication("terminal", aliases)                   │
│    ↓                                                            │
│  xdotool search --onlyvisible --class gnome-terminal-server \  │
│    windowactivate                                                │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Current Implementation Files

| File | Purpose |
|------|---------|
| `maestro/client/src/main/execute/system.ts` | System class with focus logic, aliases, applicationMatches() |
| `maestro/client/src/main/driver/stub.ts` | Driver with xdotool/AppleScript implementations |
| `maestro/client/src/main/execute/executor.ts` | Validation via invalidateBadApplicationCommands() |
| `maestro/client/src/main/runtime/focus-history-service.ts` | Focus history tracking |
| `maestro/client/src/main/execute/command-handler.ts` | COMMAND_TYPE_FOCUS handler |

## 6. Known Issues and Gotchas

### 6.1 Validation Requires Running Application

The focus command validation checks if the target matches a running application. If the terminal window title doesn't contain recognized keywords (like "terminal" or "@"), the command may be marked invalid.

**Workaround**: The focusTargetMappings include "@" to match shell prompts.

### 6.2 X11 Window Class vs Window Title

- **Window Class**: The app's X11 class (e.g., "code", "google-chrome")
- **Window Title**: The actual window text (e.g., "filename.ts - VS Code")

The driver uses window class for xdotool; validation uses window title from wmctrl.

### 6.3 Wayland Compatibility

xdotool does NOT work on Wayland. The system runs on X11 (verified: `echo $XDG_SESSION_TYPE` returns "x11").

### 6.4 Display Variable

When running from Electron, the DISPLAY environment variable must be set correctly. The driver explicitly sets `DISPLAY: ":1"`.

## 7. Testing Commands

### Check current focus
```bash
xdotool getactivewindow getwindowname
```

### List running windows
```bash
wmctrl -l
```

### Get window class
```bash
xprop WM_CLASS
# Click on window to inspect
```

### Test xdotool focus manually
```bash
# For VS Code
xdotool search --onlyvisible --class code windowactivate

# For Chrome  
xdotool search --onlyvisible --class google-chrome windowactivate

# For Terminal
xdotool search --onlyvisible --class gnome-terminal-server windowactivate
```

## 8. Future Improvements

1. **Unified mapping**: Consolidate aliases, focusTargetMappings, and driver classMap into a single configuration
2. **Real-time window detection**: Use xdotool to get current window class rather than relying on wmctrl titles
3. **Integrated terminal support**: Handle "focus terminal" in VS Code to switch to integrated terminal
4. **Chooser for ambiguity**: When multiple terminal windows exist, show chooser UI

---

*Last updated: 2026-03-15*
*Status: Active development - Phase 1C*

## Appendix: Project Roadmap Context

From [`maestro-project-roadmap.md`](./maestro-project-roadmap.md):

### Phase 1 Goals (Completed)

> Line 192: "Support a narrow but real command slice across reflex, **focus**, navigation, and terminal/editor execution."

> Line 193: "Preserve visible **focus** semantics and explicit confirmation behavior where required."

### Completed Milestones

- Line 212: "first real **focus-history** service backing `return focus` semantics completed"

### Core Focus Commands (Line 263-267)

- `focus terminal`
- `focus editor`
- `return focus`

### Future Work (Line 285)

> "Bring up the Talon-backed **focus** and visible desktop control route where native control is not available."
