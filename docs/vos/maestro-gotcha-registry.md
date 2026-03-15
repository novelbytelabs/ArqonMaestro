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

### G-007: Focused Main-Process Checks Can Pass With `--skipLibCheck` Even When Full Client TypeScript Still Has Dependency Noise

Useful command:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false --skipLibCheck
```

Why:

This is a practical verification path for local Phase 1A code while the broader dependency typing issue is still present.

### G-008: `ts-node` Runtime Tests May Need A Target Override For Optional Chaining Compatibility

Symptom:

Running some runtime tests with plain `ts-node` can fail with an "Unexpected token '.'" parse error when loading files that use optional chaining.

Use instead:

```bash
TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./node_modules/.bin/ts-node src/main/runtime/runtime-command-dispatcher.test.ts
```

Why this matters:

The runtime code is valid TypeScript, but the active Node/ts-node execution path in this repo can require a downlevel target override for test execution compatibility.

### G-009: Runtime-Outcome Branch Order Can Accidentally Hide `blocked` / `refusal` / `clarification_required`

**Status**: FIXED (2026-03-15)

Symptom:

`RuntimeOutcomeClassifier` can return broad non-execute outcomes early, preventing intended later classifications from being reached in realistic responses.

**Fix Applied**: 
- Reordered classification checks to check `blocked`, `refusal`, `clarification` BEFORE `chooser` and `presentation_only`
- Added comments explaining the precedence requirements
- Added integration tests verifying blocked outcomes are reachable

Check:

* [`maestro/client/src/main/runtime/runtime-outcome.ts`](../../maestro/client/src/main/runtime/runtime-outcome.ts)
* outcome precedence and early returns inside `classify(...)`

### G-010: `command_execution` Reason Semantics Can Drift

**Status**: FIXED (2026-03-15)

Symptom:

Executable outcomes can carry non-execution reason labels (for example `no_commands_extracted`) if fallback reason assignment is not strict.

**Fix Applied**:
- Added `executed_successfully` to RuntimeOutcomeReason type
- Changed command_execution reason from `no_commands_extracted` to `executed_successfully`

Check:

* reason assignment in [`maestro/client/src/main/runtime/runtime-outcome.ts`](../../maestro/client/src/main/runtime/runtime-outcome.ts)

### G-011: Outcome Trace Keying Must Not Collapse Missing Chunk IDs

**Status**: FIXED (2026-03-15)

Symptom:

If outcome tracing uses `trackChunk("")` for missing chunk IDs, multiple unrelated outcomes can collapse into one empty-key trace state.

**Fix Applied**:
- Changed `recordOutcome` to generate unique ID when chunkId is missing: `outcome_${Date.now()}_${random}`
- This prevents trace collapse while maintaining debuggability

Check:

* [`maestro/client/src/main/runtime/execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts)
* `recordOutcome(...)` chunk-id handling

### G-012: Classifier Unit Tests Alone Are Not Enough For Phase 1B Acceptance

**Status**: FIXED (2026-03-15)

Symptom:

`runtime-outcome` unit tests pass, but dispatcher + trace + outcome behavior may still not be coherent end-to-end.

**Fix Applied**:
- Created [`runtime-integration.test.ts`](../../maestro/client/src/main/runtime/__tests__/runtime-integration.test.ts) with 8 integration tests
- Tests verify: dispatcher plan -> outcome classification -> trace recording flow
- Tests verify: chooser, blocked, presentation_only, no-op, mixed outcomes

Use with care:

Add or run focused integration assertions that exercise:

* dispatcher plan
* outcome classification
* execution-trace recording
* non-executable flow behavior
