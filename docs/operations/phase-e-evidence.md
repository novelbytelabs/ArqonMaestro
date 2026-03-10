# Phase E Evidence: STT Migration Recovery Verification

This pack records the command-level evidence for the 2026-03-09 recovery hard-close.

## Verified Commands

### 1) Build Integrity

Command:

```bash
npm run build:main
```

Observed result:

- `webpack ... compiled successfully`
- Exit code `0`

### 2) Regression Harness

Command:

```bash
npx ts-node test-soak.ts
```

Observed result:

- `--- TEST RESULTS ---`
- `[PASS] normal_operation`
- `[PASS] pause_resume`
- `[PASS] reconnect`
- `[PASS] duplicate_handling`
- `[PASS] out_of_order`
- `[PASS] malformed`
- `[PASS] replay`
- `[PASS] command_execution`
- `Overall passing: true`
- Exit code `0`

## Scope Proven by Evidence

- Recovery from broken compile state to green build.
- Replacement of stub-only regression gating with executable scenario checks.
- End-to-end mock-bus exercise through `BusClient` and `MockArqonBusServer`.
- Manual stage-approval gating wired into promotion logic.

## Configuration Reality (Current Defaults)

Current defaults in `maestro/client/src/main/settings.ts`:

- `arqon_bus_enabled = false`
- `arqon_bus_shadow_mode = true`
- `arqon_bus_cutover_enabled = false`
- `arqon_bus_traffic_percentage = 0`
- `arqon_bus_current_stage = "shadow"`

These defaults are intentionally conservative and prevent accidental cutover.

## Artifacts

- `maestro/client/src/main/stt/soak-tester.ts`
- `maestro/client/src/main/stt/mock-server.ts`
- `maestro/client/src/main/stt/traffic-router.ts`
- `maestro/client/src/main/settings.ts`
- `maestro/client/test-soak.ts`

## Decision

- `GO` for controlled, manual staged rollout.
- `NO-GO` for immediate automatic 100% cutover.
