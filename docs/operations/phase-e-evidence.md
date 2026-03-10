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

### 3) Gate 1: True Comparator Analytics

- Replaced fake `command_match_rate: 1.0` and `0` mismatches with runtime-calculated fields (`commands_compared`, `command_match_rate : number | null`).
- Verified `comparator.ts` accurately represents null metrics and mismatch scenarios.

### 4) Gate 2: Bit-Parity CFH

Command:

```bash
npx ts-node src/main/stt/cfh-parity.ts
```

Observed result:

- `✓ [unicode accent] "café"`
- `Passed: 19/19`
- `ALL TESTS PASSED`
- Complete bit-for-bit parity proven between TypeScript SplixMix64/SHA-256 and Rust Arqon Core.

### 5) Gate 2: Address-First Predictive Routing

- Verified `stt.address.query` envelope format execution in `BusClient.publishAddressQuery`.
- Wired `executeSASPrecheck` in `chunk-manager.ts` to actively bypass audio streaming and cutover to the Bus path.

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
