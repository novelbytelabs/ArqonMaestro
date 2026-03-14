# Maestro VOS Gotcha Registry

## Purpose

This file tracks sticky traps that are easy to forget and expensive to rediscover.

Use it for:

* toolchain surprises
* verification traps
* naming oddities
* architecture mismatches between docs and the inherited codebase

This is not a decision log.
It is a memory aid for future sessions.

## Current gotchas

### G-001: `npx tsc` Is Not The Right TypeScript Entry Point Here

Symptom:

Running `npx tsc` from the repo root prints the "This is not the tsc command you are looking for" message.

Use instead:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit
```

Note:

Prefer the project-local client TypeScript binary when checking renderer work.

### G-002: The Macro-System Filename Still Has A Typo

The macro-system spec is currently:

* [`maestro-mcaro-system.md`](./maestro-mcaro-system.md)

Do not casually rename it during unrelated work.

Why:

The typo is ugly, but a rename will create churn in links, tabs, and in-flight references.

### G-003: The Legacy Runtime Topology Still Exists Under The New VOS Plan

The current inherited codebase still broadly reflects:

* Electron client
* `core`
* `speech-engine`
* `code-engine`

Do not assume the modern hot-path local-service split already exists in code.

Why:

The docs describe the target architecture.
The implementation is still transitioning toward it.

### G-004: The Renderer Shell Contract Exists Now

The renderer host boundary now lives at:

* [`maestro/client/src/renderer/shell/index.ts`](../../maestro/client/src/renderer/shell/index.ts)

Verification command:

```bash
rg -n 'ipcRenderer' maestro/client/src/renderer
```

Expected result:

* only the shell adapter should appear

### G-005: Small Boundary Extractions May Verify Faster With Targeted Checks Than Full Compile Passes

For quick boundary work, use:

* targeted `rg` checks
* focused file reads
* local compile commands through the client toolchain

Why:

A full local compile pass may take longer than a narrow structural verification, especially during small adapter extractions.

### G-006: Current Client TypeScript Check Trips On A Dependency Type Error

Command:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false
```

Current observed error:

```text
maestro/client/node_modules/webpack-dev-middleware/types/index.d.ts(204,27): error TS2694: Namespace '"fs"' has no exported member 'StatSyncFn'.
```

Why this matters:

This means a full client TypeScript pass may fail on dependency typing noise even when a local boundary extraction is structurally fine.

Use with care:

Treat this as a known verification constraint until the dependency typing issue is cleaned up.
