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

### G-007: Denoise Runtime Framing May Be 10 ms Even When Recorder Contract Is 30 ms

Current planning direction:

* Wave A denoise default is ONNX denoiser integration on a 16 kHz-native path

Implementation trap:

* denoise internals may prefer 10 ms subframes while recorder/turn contracts currently operate on larger logical frames

Why this matters:

* accidental contract drift at this seam can break callback timing expectations, turn transitions, or regression fixtures

Use with care:

* keep 10 ms chunking internal to denoise/provider boundaries
* keep external recorder/turn metadata semantics stable unless explicitly versioned

### G-008: `onnxruntime-node` Must Stay Externalized In `main.webpack.ts`

Symptom:

`npm run build:main` fails with webpack parse errors on platform `.node` binaries under `onnxruntime-node/bin/napi-v6/...`.

Required fix:

In [`maestro/client/main.webpack.ts`](../../maestro/client/main.webpack.ts), keep these externals:

* `onnxruntime-node`
* `onnxruntime-node/dist/binding.js`

Why this matters:

`SileroVadProvider` imports the package and its binding subpath at runtime; bundling those native binaries causes webpack parse failures.

### G-009: Program A1 Security Session Policy Defaults To `pilot` Unless Explicitly Set

Symptom:

Assist-specific grace behavior (`9s`) appears inactive in manual tests even when security/session wiring exists.

Why:

The Program A1 bridge initializes in `pilot` mode by default to preserve explicit degrade/restore semantics. Assist grace is only active while effective mode is `assist`.

Use with care:

* if validating grace behavior, explicitly set mode to `assist` in test/setup paths
* if validating Pilot downgrade behavior, begin in `pilot` and trigger unknown activation

Verification commands:

```bash
cd maestro/client
npx ts-node src/main/runtime/security-session-policy-service.test.ts
npx ts-node src/main/runtime/authorization-service-security-session.test.ts
```

### G-010: Active Profile Delete Is Intentionally Blocked

Symptom:

Deleting a profile can fail with `security_profile_delete_active_blocked`.

Why:

Program A profile-management slice explicitly blocks deletion of the current active profile to avoid leaving security context without a selected profile anchor.

Use with care:

* switch to another profile first, then delete
* check renderer state fields `securityProfilesLastAction` and `securityProfilesLastError` for operation outcome diagnostics
