# ArqonMaestro Rebranding Guide

This document tracks all locations where "Serenade" appears in the codebase that need to be changed to "ArqonMaestro".

## Quick Summary

| Category | Files Affected | Priority |
|----------|---------------|----------|
| GUI Strings (TSX) | 12 files | HIGH |
| Main Process (TS) | 10 files | HIGH |
| Package Names | 3 files | HIGH |
| Window Titles | 5 files | HIGH |
| Settings Paths | 2 files | MEDIUM |
| URLs/Links | 8 files | MEDIUM |
| Protocol Handler | 2 files | MEDIUM |

## High Priority - GUI Visible Changes

### 1. Window Titles (in `src/main/windows/*.ts`)

| File | Current | Change To |
|------|---------|-----------|
| main.ts:335 | `"Serenade"` | `"ArqonMaestro"` |
| main.ts:97, 352 | `Serenade ${version}` | `ArqonMaestro ${version}` |
| main.ts:357, 364 | `"Hide Serenade"` | `"Hide ArqonMaestro"` |
| main.ts:380 | `this.tray.setTitle("Serenade")` | `this.tray.setTitle("ArqonMaestro")` |
| mini-mode.ts:169 | `"Serenade"` | `"ArqonMaestro"` |
| settings.ts:70 | `"Serenade Settings"` | `"ArqonMaestro Settings"` |
| text-input.ts:78 | `"Serenade Text Input"` | `"ArqonMaestro Text Input"` |
| language-switcher.ts:55 | `"Serenade Languages"` | `"ArqonMaestro Languages"` |
| revision-box.ts:163 | `"Serenade Revision Box"` | `"ArqonMaestro Revision Box"` |

### 2. Application Name (in `src/main/index.ts`)

```typescript
// Line 48
app.setName("Serenade");  →  app.setName("ArqonMaestro")

// Line 49  
app.setAsDefaultProtocolClient("serenade");  →  app.setAsDefaultProtocolClient("arqon")
```

### 3. Menu Labels (in `src/main/windows/main.ts`)

```typescript
// Lines 95-98
{ label: "Serenade", ... }
{ label: `Serenade ${version}`, ... }

// Lines 351-352
menu.push({ label: `Serenade ${version}`, enabled: false });
```

### 4. Tray Icon (in `src/main/windows/main.ts`)

```typescript
// Line 380
this.tray.setTitle("Serenade");  →  this.tray.setTitle("ArqonMaestro")
```

## Medium Priority - Configuration & Paths

### 5. Settings Path (in `src/main/settings.ts`)

```typescript
// Line 102
return path.join(this.path(), "serenade.json");
// Change to: "arqon.json"

// Line 384
return `${os.homedir()}/.serenade`;
// Change to: `${os.homedir()}/.arqon`
```

### 6. Log Files (in `src/main/log.ts`)

```typescript
// Line 14
fs.createWriteStream(path.join(os.homedir(), ".serenade", "error.log"))
// Change to: ".arqon"

// Line 28
path.join(os.homedir(), ".serenade", "verbose.log")
// Change to: ".arqon"
```

### 7. Protocol Handler (in `src/main/index.ts`)

```typescript
// Line 49
app.setAsDefaultProtocolClient("serenade");  →  app.setAsDefaultProtocolClient("arqon")
```

### 8. URLs in Settings (in `src/main/settings.ts`)

```typescript
// Lines 327, 332, 337 - These are Serenade cloud endpoints
// These can stay as-is (cloud service) OR change to Arqon endpoints
"stream-us-west-2.serenade.ai"  →  (keep or use Arqon endpoints)
"stream-us-east-1.serenade.ai"   →  (keep or use Arqon endpoints)
"stream-eu-west-2.serenade.ai"   →  (keep or use Arqon endpoints)
```

## Medium Priority - GUI Strings

### 9. Welcome Screen (in `src/renderer/pages/onboarding/welcome.tsx`)

```tsx
// Lines 17-22
alt="Serenade"                           →  alt="ArqonMaestro"
Welcome to Serenade!                     →  Welcome to ArqonMaestro!
Let's start writing code with voice!     →  (keep or change)
```

### 10. Settings Pages (in `src/renderer/pages/settings/*.tsx`)

| File | Line | Current | Change To |
|------|------|---------|-----------|
| general.tsx | 84 | "Listen shortcut" subtitle | "Keyboard shortcut for toggling ArqonMaestro" |
| general.tsx | 96 | "Compact UI" subtitle | "Shrink the main ArqonMaestro window" |
| general.tsx | 158 | Serenade v{version} | ArqonMaestro v{version} |
| general.tsx | 84 | "Serenade" | "ArqonMaestro" |
| plugins.tsx | 113-150 | "Install Serenade for..." | "Install ArqonMaestro for..." |
| server.tsx | 50-51 | "Serenade Local" | "ArqonMaestro Local" |
| server.tsx | 60 | "Serenade Local" | "ArqonMaestro Local" |
| server.tsx | 96-97 | "improve Serenade" | "improve ArqonMaestro" |
| server.tsx | 110-111 | "improve Serenade" | "improve ArqonMaestro" |
| advanced.tsx | 73 | "Show suggestions" subtitle | (keep - just tips) |
| advanced.tsx | 106 | "Serenade is minimized" | "ArqonMaestro is minimized" |
| docs.tsx | 50-66 | Links to serenade.ai | Update to Arqon docs URLs |

### 11. Onboarding Pages (in `src/renderer/pages/onboarding/*.tsx`)

| File | Line | Current | Change To |
|------|------|---------|-----------|
| welcome.tsx | all | "Serenade" | "ArqonMaestro" |
| plugins.tsx | 24 | "Serenade integrates..." | "ArqonMaestro integrates..." |
| permissions.tsx | 21 | "Serenade integrates..." | "ArqonMaestro integrates..." |
| privacy.tsx | 24 | "Serenade is open-source..." | "ArqonMaestro is open-source..." |

### 12. Other UI Components

| File | Line | Current | Change To |
|------|------|---------|-----------|
| accessibility-permission.tsx | 11 | "Serenade requires..." | "ArqonMaestro requires..." |
| revision-box.tsx | 188-189 | "Serenade plugin" | "ArqonMaestro plugin" |
| update-notification.tsx | 17-19 | "Serenade is downloading" | "ArqonMaestro is downloading" |
| active-app-indicator.tsx | 26-27 | "serenade" / "Serenade" | "arqon" / "ArqonMaestro" |

## Low Priority - Technical Names

### 13. Plugin URLs (in `src/shared/plugins.ts`)

```typescript
// These are external URLs to Serenade services
// May need to be updated if Arqon has its own plugin URLs
url: "https://atom.io/packages/serenade"     →  (keep or change)
url: "https://marketplace.visualstudio.com/items?itemName=serenade.serenade"  →  (change)
url: "https://serenade.ai/install#jetbrains"  →  (change)
```

### 14. Custom Commands (in `src/main/ipc/custom.ts`)

```typescript
// Line 9
"/* Serenade Custom Commands"  →  "/* ArqonMaestro Custom Commands"

// Line 11
"with the Serenade API"        →  "with the ArqonMaestro API"

// Line 30
"Serenade API documentation"   →  "ArqonMaestro API documentation"

// Lines 89-90, 134
"serenade-custom-commands-server"  →  "arqon-custom-commands-server"
```

### 15. Active App Check (in `src/main/active.ts` and `src/main/execute/system.ts`)

```typescript
// active.ts lines 358, 371
if (app == "serenade")        →  if (app == "arqon")

// system.ts line 107
result.includes("serenade")    →  result.includes("arqon")
```

### 16. Driver Stub (in `src/main/driver/stub.ts`)

```typescript
// All comments and console.warn messages
"[serenade-driver stub]"  →  "[arqon-driver stub]"

// Line 59
return Promise.resolve("serenade")  →  return Promise.resolve("arqon")
```

## Files to Modify (Summary)

### Core Files to Change
1. `src/main/index.ts` - App name, protocol
2. `src/main/settings.ts` - Paths, URLs
3. `src/main/log.ts` - Log paths
4. `src/main/active.ts` - App name check
5. `src/main/execute/system.ts` - App name check

### Window Files
6. `src/main/windows/main.ts` - Window titles, menu, tray
7. `src/main/windows/mini-mode.ts` - Title
8. `src/main/windows/settings.ts` - Title
9. `src/main/windows/text-input.ts` - Title
10. `src/main/windows/language-switcher.ts` - Title
11. `src/main/windows/revision-box.ts` - Title

### UI Files
12. `src/renderer/pages/onboarding/welcome.tsx`
13. `src/renderer/pages/onboarding/plugins.tsx`
14. `src/renderer/pages/onboarding/permissions.tsx`
15. `src/renderer/pages/onboarding/privacy.tsx`
16. `src/renderer/pages/settings/general.tsx`
17. `src/renderer/pages/settings/plugins.tsx`
18. `src/renderer/pages/settings/server.tsx`
19. `src/renderer/pages/settings/advanced.tsx`
20. `src/renderer/pages/settings/docs.tsx`
21. `src/renderer/pages/accessibility-permission.tsx`
22. `src/renderer/pages/revision-box.tsx`
23. `src/renderer/components/update-notification.tsx`
24. `src/renderer/components/indicators/active-app-indicator.tsx`
25. `src/renderer/events.ts` - History state

### Other Files
26. `src/shared/plugins.ts` - Plugin URLs
27. `src/main/ipc/custom.ts` - Custom commands
28. `src/main/driver/stub.ts` - Stub name

## Suggested Replacement Names

| Original | Replace With | Notes |
|----------|-------------|-------|
| Serenade | ArqonMaestro | Main app name |
| serenade | arqon | Internal/command names |
| .serenade | .arqon | Config/logs directory |
| serenade.json | arqon.json | Config file |
| serenade.ai | arqon.ai | URLs (when available) |

## Build After Changes

After making all changes, rebuild:

```bash
npm run build
```
