# Maestro Phase 1B Hard-Close Handoff

## Purpose

This document exists so a new AI session can finish Phase 1B without reconstructing the entire VOS thread from scratch.

It defines:

* current implementation state
* what is already done
* what still must be done to hard-close Phase 1B
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
5. [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
6. [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
7. [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
8. [`maestro-chooser-ux.md`](./maestro-chooser-ux.md)
9. [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)

## Branch And Working State

Current branch:

* `feature/phase1a-runtime-spine`

Branch rule:

* stay on this branch until the user explicitly says otherwise

Current worktree state:

* intentionally dirty
* includes real Phase 1B runtime changes not yet fully hard-closed
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

## What Phase 1B Means

From the roadmap, Phase 1B is closed only when all of the following are true:

1. the canonical normalized command object and hot-path runtime contract are live end to end
2. a narrow but real command slice works across reflex, focus, navigation, and terminal/editor execution
3. visible focus semantics and explicit confirmation behavior are preserved where required
4. chooser, clarification, refusal, and block outcomes travel through one consistent runtime path
5. hot-path latency is measured rather than guessed
6. repair and cancellation work during live operation

## What Is Already Done

Phase 1A is complete.

Phase 1B already includes:

* richer runtime command envelope in [`runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts)
* explicit dispatch planning in [`runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts)
* local routes:
  * `reflex_local`
  * `focus_local`
  * `execution_local`
  * `app_control_local`
  * `editing_local`
  * `composite_local`
* plugin-assisted routes:
  * `focus_plugin`
  * `navigation_plugin`
  * `editing_plugin`
  * `system_plugin`
  * `mixed_plugin_assisted`
* residual explicit legacy classes:
  * `mixed_legacy`
  * `unknown_legacy`
* real focus history via [`focus-history-service.ts`](../../maestro/client/src/main/runtime/focus-history-service.ts)
* full current protobuf command-enum classification coverage in the runtime emitter
* focused runtime tests for dispatcher planning, emitter classification, and focus history
* stage-latency trace fields in [`execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts)

## Verification That Already Passes

These commands currently pass and should continue passing:

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false --skipLibCheck
```

```bash
cd maestro/client && npm run build:main
```

```bash
TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts
```

```bash
TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-emitter.test.ts
```

```bash
./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/focus-history-service.test.ts
```

Known verification gotchas:

* see [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md)
* `ts-node` tests may need the `TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}'` override
* prefer project-local TypeScript, not `npx tsc`

## Critical Code Files

The next AI should inspect these first:

* [`runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts)
* [`runtime-command-emitter.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.ts)
* [`execution-trace.ts`](../../maestro/client/src/main/runtime/execution-trace.ts)
* [`focus-history-service.ts`](../../maestro/client/src/main/runtime/focus-history-service.ts)
* [`executor.ts`](../../maestro/client/src/main/execute/executor.ts)
* [`command-handler.ts`](../../maestro/client/src/main/execute/command-handler.ts)
* [`command-response-service.ts`](../../maestro/client/src/main/runtime/command-response-service.ts)
* [`chunk-evaluation-service.ts`](../../maestro/client/src/main/runtime/chunk-evaluation-service.ts)
* [`chunk-manager.ts`](../../maestro/client/src/main/stream/chunk-manager.ts)
* [`stream.ts`](../../maestro/client/src/main/stream/stream.ts)
* [`app.ts`](../../maestro/client/src/main/app.ts)
* [`active.ts`](../../maestro/client/src/main/active.ts)

Current focused tests:

* [`runtime-command-dispatcher.test.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts)
* [`runtime-command-emitter.test.ts`](../../maestro/client/src/main/runtime/runtime-command-emitter.test.ts)
* [`focus-history-service.test.ts`](../../maestro/client/src/main/runtime/focus-history-service.test.ts)

## The Main Remaining Gap

The biggest remaining Phase 1B gap is this roadmap line:

* chooser, clarification, refusal, and block outcomes should emit through one consistent runtime path

Right now the runtime is strong on executable command routing, but non-execute outcomes still mostly live in legacy response presentation behavior:

* `alternatives`
* execute-vs-alternatives promotion
* pending alternative resolution
* invalid/no-op handling
* blocked or clarification-like outcomes inferred from response shape rather than normalized runtime outcome objects

This means the system is not yet fully unified around one hot-path runtime outcome model.

## Independent Evaluation Findings (2026-03-15)

Current implementation has meaningful progress, but hard-close should remain pending for these reasons:

* outcome classifier branch order currently makes some intended outcomes effectively unreachable in common flows (`blocked`, `refusal`, and `clarification_required` can be shadowed by earlier generic non-execute checks)
* `command_execution` currently uses an incorrect fallback reason (`no_commands_extracted`) on executable paths
* outcome classification is recorded and logged, but is not yet a strong actionable seam that governs non-executable runtime handling end to end
* `execution-trace.recordOutcome()` currently calls `trackChunk(outcome.chunkId || "", ...)`, which can collapse multiple no-chunk outcomes into one empty trace key
* test coverage is strong at unit level but still needs focused integration assertions for dispatcher + trace + outcome interactions

Treat this as Phase 1B close-candidate status, not final hard-close.

## Recommended Remaining Work For Hard Close

### 1. Introduce a normalized runtime outcome model

Add a small but real normalized outcome layer for non-execute results.

Status:

* initial version implemented

Still required:

* fix outcome precedence/ordering and semantic reachability
* tighten reason mapping so executable outcomes never carry non-execute reasons

Likely shape:

* `command_execution`
* `chooser_required`
* `clarification_required`
* `refusal`
* `blocked`
* `presentation_only`

Important:

* do not invent a giant framework
* do not replace all legacy response logic in one swing
* create a real seam that the current response path can emit through

Best candidate location:

* new runtime file near the dispatcher and emitter, such as:
  * `maestro/client/src/main/runtime/runtime-outcome-emitter.ts`
  * or `maestro/client/src/main/runtime/runtime-outcome.ts`

### 2. Route non-execute outcomes through one shared path

The next AI should unify these cases:

* alternatives shown because ambiguity remains
* alternatives highlighted after user selection
* explicit no-op/invalid presentation-only bundles
* responses with no execute but valid alternatives
* responses that effectively represent refusal/block after post-processing invalidates all action

Candidate integration points:

* [`command-response-service.ts`](../../maestro/client/src/main/runtime/command-response-service.ts)
* [`runtime-command-dispatcher.ts`](../../maestro/client/src/main/runtime/runtime-command-dispatcher.ts)
* [`executor.ts`](../../maestro/client/src/main/execute/executor.ts)

The end state should make it possible to say:

* this chunk produced executable commands
* this chunk produced chooser-required ambiguity
* this chunk produced presentation-only outcome
* this chunk was blocked or refused

without guessing from scattered renderer calls.

Still required:

* use normalized outcome to drive behavior decisions for non-executable outcomes (not only logging)
* ensure chooser/clarification/refusal/block actions are surfaced through one shared runtime seam

### 3. Make trace output outcome-aware

Once outcomes are normalized, trace should record them explicitly.

Potential additions:

* outcome type
* chooser shown
* clarification required
* refusal reason
* blocked reason

Keep this small and phase-appropriate.

Still required:

* fix empty chunk-id trace key behavior for outcome events

### 4. Add focused tests for outcome normalization

Add tests for:

* no-op/invalid only -> `presentation_only`
* valid alternatives without execute -> chooser or clarification outcome
* execute-only -> command execution outcome
* invalidated response that results in no valid executable path -> refusal/block/presentation outcome as designed

Do not skip tests here.

Still required:

* add integration-level tests that assert dispatcher + outcome classifier + execution trace produce coherent results together

### 5. Reconcile exit evidence honestly

Before closing Phase 1B, confirm these are truly satisfied:

* first command slice has at least one trustworthy route each
* focus semantics are real, not implied
* latency is measurable from trace fields
* cancel/undo/repair still work in live operation
* chooser/clarification/refusal/block are unified onto one runtime path

If one of these is not actually complete, say so in the docs instead of pretending Phase 1B is done.

## Concrete Suggested Implementation Order

Use this order unless live code evidence suggests a safer one:

1. read current runtime seams and confirm where non-execute outcomes are inferred today
2. add a small normalized runtime outcome type and emitter
3. wire `command-response-service` to emit a normalized outcome before renderer presentation
4. extend `execution-trace` to record normalized outcome kind
5. add focused tests for outcome classification
6. run the full verification pack
7. manually validate Maestro still runs
8. update continuity docs
9. if Phase 1B is truly complete, hard-close it in the roadmap and progress doc

## What Not To Do

Do not:

* replace the whole inherited response model in one rewrite
* claim a new executor route exists unless it is real
* hide unsupported behavior behind vague fallback wording
* remove the current focused tests
* change branches
* force Rust migration in this phase
* silently reinterpret block/refusal/chooser semantics without checking the docs

## Relevant Spec References For The Remaining Work

Use these docs when deciding semantics:

* [`maestro-runtime-command-contract.md`](./maestro-runtime-command-contract.md)
* [`maestro-chooser-ux.md`](./maestro-chooser-ux.md)
* [`maestro-error-recovery-misrecognition-handling.md`](./maestro-error-recovery-misrecognition-handling.md)
* [`maestro-actuation-policy-engine.md`](./maestro-actuation-policy-engine.md)
* [`maestro-workflow-contract.md`](./maestro-workflow-contract.md)
* [`maestro-modes-state-machine.md`](./maestro-modes-state-machine.md)
* [`maestro-voice-identity-security-architecture.md`](./maestro-voice-identity-security-architecture.md)
* [`maestro-preference-model.md`](./maestro-preference-model.md)

Semantics to preserve from those docs:

* chooser is for lawful ambiguity, not bad parsing
* refusal is preferable to unsafe guessing
* block and refusal should be visible and explainable
* cancel should override chooser/repair states where appropriate
* focus should stay explicit and trustworthy

## Minimum Deliverables For Another AI

The next AI should aim to deliver all of these:

1. a normalized runtime outcome model for Phase 1B non-execute cases
2. live runtime wiring so non-execute outcomes pass through one shared path
3. trace visibility for those outcomes
4. focused tests covering the new outcome behavior
5. passing verification commands
6. continuity doc updates:
   * [`maestro-project-roadmap.md`](./maestro-project-roadmap.md)
   * [`maestro-implementation-progress.md`](./maestro-implementation-progress.md)
   * [`maestro-decision-log.md`](./maestro-decision-log.md)
   * [`maestro-gotcha-registry.md`](./maestro-gotcha-registry.md) if a new trap appears

## Hard-Close Checklist

Phase 1B can be called hard-closed only when:

* executable and non-executable hot-path outcomes both have explicit normalized runtime treatment
* route and outcome reasons are visible in traces/logs
* the narrow command slice still works
* focused tests cover the new normalization behavior
* build and TypeScript checks pass
* manual app validation still looks good
* docs reflect reality

## Resume Commands

Useful commands for the next AI:

```bash
git branch --show-current
```

```bash
git status --short
```

```bash
rg -n "Phase 1B|chooser|clarification|refusal|block|runtime-command-dispatcher|execution-trace" docs/vos maestro/client/src/main -g '!**/*.js'
```

```bash
./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false --skipLibCheck
```

```bash
cd maestro/client && npm run build:main
```

```bash
TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts
```

```bash
TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-emitter.test.ts
```

```bash
./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/focus-history-service.test.ts
```

## Prompt For The Next AI

Use this prompt to start the next session:

```text
You are continuing Phase 1B implementation for Arqon Maestro inside /home/irbsurfer/Projects/arqon/ArqonMaestro on branch feature/phase1a-runtime-spine.

Read these files first, in order:
1. docs/vos/maestro-project-roadmap.md
2. docs/vos/maestro-implementation-progress.md
3. docs/vos/maestro-decision-log.md
4. docs/vos/maestro-gotcha-registry.md
5. docs/vos/maestro-phase-1b-hard-close-handoff.md

Then explicitly account for gotchas:
- G-008 (`ts-node` target override in runtime tests)
- G-009 (runtime-outcome precedence can hide blocked/refusal/clarification)
- G-010 (`command_execution` reason semantic drift)
- G-011 (empty chunk-id outcome trace key collision risk)
- G-012 (unit tests alone are insufficient for hard-close acceptance)

Then inspect these code files:
- maestro/client/src/main/runtime/runtime-command-dispatcher.ts
- maestro/client/src/main/runtime/runtime-command-emitter.ts
- maestro/client/src/main/runtime/execution-trace.ts
- maestro/client/src/main/runtime/command-response-service.ts
- maestro/client/src/main/execute/executor.ts
- maestro/client/src/main/stream/chunk-manager.ts
- maestro/client/src/main/execute/command-handler.ts
- maestro/client/src/main/runtime/focus-history-service.ts

Mission:
Hard-close Phase 1B honestly, without fake code, placeholders, shims, stubs, or hand-wavy coverage.

Current state:
- Phase 1A is complete.
- Phase 1B is a close-candidate but not accepted as hard-closed.
- Runtime outcome model exists, but hard-close quality gates are still open.

Your job:
1. Fix runtime-outcome classification precedence so blocked/refusal/clarification outcomes are reachable and semantically distinct.
2. Fix `command_execution` reason semantics (no non-execute reasons on executable outcomes).
3. Promote runtime outcome to an actionable seam for non-executable handling, not trace-only logging.
4. Fix `execution-trace.recordOutcome` chunk keying so missing chunk ids do not collapse into one empty-key trace.
5. Add focused integration tests covering dispatcher + runtime outcome + execution trace behavior together.
6. Run verification:
   - ./maestro/client/node_modules/.bin/tsc -p maestro/client/tsconfig.json --noEmit --pretty false --skipLibCheck
   - cd maestro/client && npm run build:main
   - TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-dispatcher.test.ts
   - TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/runtime-command-emitter.test.ts
   - ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/focus-history-service.test.ts
   - TS_NODE_COMPILER_OPTIONS='{"target":"es2019"}' ./maestro/client/node_modules/.bin/ts-node maestro/client/src/main/runtime/__tests__/runtime-outcome.test.ts
7. Run manual validation specifically for chooser/clarification/refusal/block flows in the live app.
8. Update docs/vos/maestro-project-roadmap.md, maestro-implementation-progress.md, maestro-decision-log.md, and maestro-gotcha-registry.md if needed.

Important constraints:
- Stay on the current branch.
- Do not revert unrelated changes.
- Preserve app behavior.
- Do not over-rewrite the inherited response model.
- Be explicit about what is really complete versus still pending.
- The user strongly prefers thorough, real implementation work and will reject fake or placeholder architecture.

Success condition:
Phase 1B is only closed if executable and non-executable hot-path outcomes are both normalized, tested, traced, and reflected accurately in the docs.
```

## After Another AI Finishes

When another AI claims Phase 1B is done, inspect:

* whether outcome normalization is real or just renamed legacy behavior
* whether trace/log evidence exists
* whether tests actually cover new behavior
* whether the app still builds and runs
* whether docs were updated honestly

If those checks hold, then Phase 1B can be reviewed for hard close and commit.
