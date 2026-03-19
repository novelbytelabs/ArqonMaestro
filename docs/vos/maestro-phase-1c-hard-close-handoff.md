# Maestro Phase 1C Hard-Close Handoff

## Purpose

This document exists so a new AI session can start Phase 2A (Identity and safety gating) without reconstructing the entire VOS thread from scratch.

It defines:

* current implementation state
* what is already done
* what still must be done (Phase 2A targets)
* what files and docs matter
* how to verify work safely
* the user's non-negotiable working preferences
* a ready-to-paste prompt for the next AI

This is a handoff and execution guide, not a replacement for the roadmap.

## Read This First

Before touching code, the next AI should read these in order:

1. [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
2. [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
3. [`maestro-decision-log.md`](./maestro-decision-log.md)
4. [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)
5. [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
6. [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
7. [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
8. [`maestro-talon-integration-strategy.md`](./maestro-talon-integration-strategy.md)

## Branch And Working State

Current branch:

* `feature/phase1a-runtime-spine`

Branch rule:

* stay on this branch until the user explicitly says otherwise

Current worktree state:

* intentionally dirty
* includes real Phase 1C runtime changes that are fully implemented and verified
* do not revert unrelated changes

## User Preferences And Constraints

These are important and should be treated as execution constraints:

* no placeholders
* no shims
* no stubs
* no fake code
* no fast hacking
* do real implementation work only
* preserve app behavior while we iterate
* keep Maestro runnable as a live app
* stay on the current feature branch
* test as you go
* update `/docs/vos` continuity docs as important decisions land
* all planning/docs for this thread live under `/docs/vos`

Tone and execution style:

* be thorough
* prefer safe, incremental hardening
* avoid pretending unsupported routes already exist
* if a route is not real yet, classify it honestly and keep it visible

## What Phase 1C Meant

From the roadmap, Phase 1C is closed only when all of the following are true:

1. Implement one high-confidence route per core command family before adding lower-trust fallbacks.
2. Bring up the native or subprocess route for terminal/process commands.
3. Bring up the editor semantic route for at least one editor surface where available.
4. Bring up the Talon-backed focus and visible desktop control route where native control is not available.

## What Is Already Done

Phase 1C is completely hard-closed (see VOS-035).

It includes:

* `ActuationPolicyService` fully implemented with Trust Tiers (1-4).
* Policy decision integration into the runtime-command dispatcher.
* Blocked route auditing and route explanations in `execution-trace.ts`.
* `TalonAdapter` fully implemented as the Tier 3/4 fallback UI provider (Zero-installation validated: works entirely via capability registry boundaries).
* `talon_fallback` route properly sequenced in dispatcher planning against existing local/plugin routes.
* Comprehensive test suites for all new routing logic (22 dispatcher tests, 30 talon-adapter tests, 20 policy service tests).

## Verification That Already Passes

These commands currently pass and should continue passing:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false --skipLibCheck
```

```bash
cd maestro/client && npm run build:main
```

```bash
~/.nvm/versions/node/v18.20.8/bin/node ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts
```

```bash
~/.nvm/versions/node/v18.20.8/bin/node ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/talon-adapter.test.ts
```

```bash
~/.nvm/versions/node/v18.20.8/bin/node ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/actuation-policy-service.test.ts
```

Known verification gotchas:

* see [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)
* Use Node 18+ for tests checking optional-chaining (already configured via nvm path above if available, else standard node18 logic).
* Prefer project-local TypeScript, not `npx tsc`.

## Critical Code Files

The next AI should inspect these first:

* [`actuation-policy-service.ts`](../../maestro/client/src/main/runtime/actuation-policy-service.ts)
* [`talon-adapter.ts`](../../maestro/client/src/main/runtime/talon-adapter.ts)
* [`runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts)
* [`execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts)

## The Main Remaining Gap (Phase 2A)

The next step is **Phase 2A: Identity and safety gating**.
From the roadmap:
1. Implement enrollment, verification state, and authorization policy hooks for voice identity.
2. Enforce secure mode, shared-room mode, confirmation policy, and always-available reflex rules.
3. Thread identity state into route approval and execution outcomes.

Right now the system has the Actuation Policy Engine in place, but it lacks the real voice identity state threaded into it (e.g. knowing if we are actually in secure mode or shared-room mode dynamically, verifying the current speaker matches the enrolled owner).

## Prompt For The Next AI

Use this prompt to start the next session:

```text
You are starting Phase 2A implementation for Arqon Maestro inside /home/irbsurfer/Projects/arqon/ArqonMaestro on branch feature/phase1a-runtime-spine.

Read these files first, in order:
1. docs/vos/maestro-project-roadmap.md
2. docs/vos/maestro-implementation-progress.md
3. docs/vos/maestro-decision-log.md
4. docs/vos/maestro-gotcha-registry.md
5. docs/vos/maestro-phase-1c-hard-close-handoff.md

Then explicitly account for gotchas:
- G-008 (`ts-node` target override in runtime tests, or use Node 18 via nvm paths provided)

Then inspect these code files:
- maestro/client/src/main/runtime/actuation-policy-service.ts
- maestro/client/src/main/runtime/runtime-command-dispatcher.ts
- maestro/client/src/main/runtime/execution-trace.ts

Mission:
Begin Phase 2A (Identity and safety gating) by threading identity state and mode enforcement into the route approval process. Do this honestly, without fake code, placeholders, shims, stubs, or hand-wavy coverage.

Current state:
- Phase 1A, 1B, and 1C are complete.
- The Actuation Policy Engine and Talon Adapter provide the necessary gates, but they need real voice identity state input to function effectively.

Your job:
1. Implement enrollment, verification state, and authorization policy hooks for voice identity.
2. Enforce secure mode, shared-room mode, confirmation policy, and always-available reflex rules using the new hooks.
3. Connect these directly into the existing `actuation-policy-service.ts` so that routes are correctly approved or blocked based on the identity state.
4. Run verification and write comprehensive tests for your new state hooks.
5. Update docs/vos/maestro-project-roadmap.md, maestro-implementation-progress.md, maestro-decision-log.md, and maestro-gotcha-registry.md if new design decisions are made.

Important constraints:
- Stay on the current branch.
- Do not revert unrelated changes.
- Preserve app behavior.
- The user strongly prefers thorough, real implementation work and will reject fake or placeholder architecture.
```
