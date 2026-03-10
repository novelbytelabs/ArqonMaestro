# STT Transport Migration: Final Walkthrough and Decision

## Executive Result

- **Decision**: `GO` for manual phased rollout.
- **Constraint**: Keep conservative defaults until explicit operator promotion.
- **Gate Status**: `Gate 1 HARD-CLOSED`, `Gate 2 HARD-CLOSED`, `Gate 3 HARD-CLOSED` (see evidence pack).

## Recovery Walkthrough

1. Restored build integrity in STT migration modules.
2. Replaced simulated validation behavior with executable harness checks.
3. Added/validated mock-bus integration path for regression scenarios.
4. Enforced explicit stage-approval requirement in traffic promotion logic.
5. Reconciled documentation to reflect code reality and test evidence.
6. Implemented non-blocking native voice playback (`VoiceOutput`) with idempotency constraints.
7. Hardened Gate 3 verification by isolating replay smoke onto a dedicated default port and enforcing honest playback failure handling.

## Evidence Snapshot

### Build

```bash
npm run build:main
```

Result: success (`webpack ... compiled successfully`, exit `0`).

### Regression Harness

```bash
npx ts-node test-soak.ts
```

Result: `11/11` passing, `Overall passing: true`, exit `0`.

### CFH TS/Rust Parity

```bash
npx ts-node src/main/stt/cfh-parity.ts
```

Result: `19/19` exact signature matches, `ALL TESTS PASSED`, exit `0`.

### Comparator Analytics + Coexistence

- Comparator reports runtime-derived transcript and command parity metrics.
- Address-first precheck emits `stt.address.query` while `stt.audio.append` mirror remains active during pivot.
- VoiceOutput executes non-blockingly via standard OS bindings (e.g. `aplay`) and respects the standard cutover rollback flag.

## Safety Posture

Current defaults remain conservative:

- `arqon_bus_enabled = false`
- `arqon_bus_shadow_mode = true`
- `arqon_bus_cutover_enabled = false`
- `arqon_bus_traffic_percentage = 0`
- `arqon_bus_current_stage = "shadow"`

## Rollout Recommendation

Use explicit gated promotions only:

`shadow -> 1pct -> 10pct -> 50pct -> 100pct`

with manual approval and rollback validation at every stage.

## Rollback

Immediate fallback:

- Set `arqon_bus_traffic_percentage = 0`
- Set `arqon_bus_cutover_enabled = false`
- Optionally set `arqon_bus_enabled = false`

Command-level rollback behavior proof is recorded in:
- [Phase E Evidence](phase-e-evidence.md)
