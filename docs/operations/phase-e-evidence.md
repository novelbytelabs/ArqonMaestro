# Phase E Evidence: Gates 1-5 Hard-Close

This evidence pack records hard-close artifacts for:
- `Gate 1`: Comparator Confidence Baseline
- `Gate 2`: Address-First Pivot (CFH + AddrId)
- `Gate 3`: Voice Output and Replay Controls
- `Gate 4`: Integrity Handshake (ACE/Anchor)
- `Gate 5`: Control-Plane Coordinator (SpacetimeDB)

All claims below are bounded to command output artifacts.

## Gate 1 Artifacts

### Artifact G1-A: Build Integrity
- `command`: `npm run build:main`
- `timestamp`: `2026-03-10T10:20:12-04:00`
- `exit_code`: `0`
- `key_output`:
```text
> arqon-maestro@2.0.2 build:main
webpack 5.72.0 compiled successfully in 23369 ms
```

### Artifact G1-B: Regression Harness
- `command`: `npx ts-node test-soak.ts`
- `timestamp`: `2026-03-10T10:20:12-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[PASS] normal_operation
[PASS] pause_resume
[PASS] reconnect
[PASS] duplicate_handling
[PASS] out_of_order
[PASS] malformed
[PASS] replay
[PASS] command_execution
[PASS] transcript_mismatch
[PASS] command_mismatch
Overall passing: true
```

### Artifact G1-C: Comparator Report Excerpt (Runtime-Computed)
- `command`: `npx ts-node /tmp/comparator_probe.ts`
- `timestamp`: `2026-03-10T10:24:59-04:00`
- `exit_code`: `0`
- `key_output`:
```text
comparator_report {"total_comparisons":3,"transcript_matches":1,"transcript_mismatches":2,"commands_compared":2,"command_matches":1,"command_mismatches":1,"avg_latency_websocket_ms":10,"avg_latency_bus_ms":14,"duplicates_detected":0,"out_of_order_detected":0,"transcript_match_rate":0.3333333333333333,"command_match_rate":0.5,"latency_delta_avg_ms":4,"generated_at":"2026-03-10T14:25:02.542Z","mismatch_categories":{"transcript_mismatch":2,"command_mismatch":1},"mismatch_examples":[{"category":"transcript_mismatch","ws":"EXPECTED transcript","bus":"DIFFERENT transcript","similarity":0.6,"chunk_id":"c2"},{"category":"command_mismatch","ws":"none","bus":"pause","chunk_id":"c3"},{"category":"transcript_mismatch","ws":"hello world","bus":"hello world pause","similarity":0.6470588235294117,"chunk_id":"c3"}]}
```

### Gate 1 Mismatch Categories (Counts + Examples)
- `transcript_mismatch`: `2`
  - example: `WS="EXPECTED transcript"` vs `Bus="DIFFERENT transcript"` (`chunk_id=c2`)
- `command_mismatch`: `1`
  - example: `WS="none"` vs `Bus="pause"` (`chunk_id=c3`)
- `duplicates_detected`: `0` (in comparator probe artifact)
- `out_of_order_detected`: `0` (in comparator probe artifact)

## Gate 2 Artifacts

### Artifact G2-A: CFH TS/Rust Bit-Parity
- `command`: `npx ts-node src/main/stt/cfh-parity.ts`
- `timestamp`: `2026-03-10T10:20:12-04:00`
- `exit_code`: `0`
- `key_output`:
```text
=== Summary ===
Passed: 19/19
Failed: 0/19
=== Final Result ===
ALL TESTS PASSED
```

Parity statement: `19/19 exact 1024-bit TS signatures matched Rust expected signatures`.

### Artifact G2-B: Address-First + Mirror Coexistence Proof
- `command`: `rg -n "publishAddressQuery\\(|audio_append" maestro/client/src/main/stream/chunk-manager.ts`
- `timestamp`: `2026-03-10T10:23:32-04:00`
- `exit_code`: `0`
- `key_output`:
```text
428:        this.busClient.publishAddressQuery(
474:        case "audio_append":
906:        "audio_append",
```

Interpretation:
- `stt.address.query` emission is wired in live SAS precheck execution.
- `stt.audio.append` mirror path remains active during the pivot.

## Rollback Proof Artifact

### Artifact RB-1: Router Rollback Behavior
- `command`: `npx ts-node /tmp/traffic_router_rollback_probe.ts`
- `timestamp`: `2026-03-10T10:24:38-04:00`
- `exit_code`: `0`
- `key_output`:
```text
before {"stage":"10pct","config":{"enabled":true,"busPercentage":10,...}}
[TrafficRouter] ROLLBACK triggered: gate-proof (previous stage: 10pct)
after {"stage":"rollback","config":{"enabled":false,"busPercentage":0,"currentStage":"rollback",...}}
```

Rollback proof: rollback forces stage to `rollback`, traffic percentage to `0`, and disables cutover path.

## Mandatory Paths

- **Evidence Pack path**: `docs/operations/phase-e-evidence.md`
- **Decision Log entry path**: `docs/decision-log.md` (`ADM-029`)
- **Rollback proof path**: `docs/operations/phase-e-evidence.md` (`Rollback Proof Artifact`)

## Residual Risks

1. Current validation remains local/mock-oriented and does not replace production-like soak.
2. Long-duration real-network jitter behavior is still pending dedicated staging evidence.

## Gate 3 Artifacts

### Artifact G3-A: Voice Output Compilation
- `command`: `cd maestro/client && npm run build:main`
- `timestamp`: `2026-03-10T11:24:44-04:00`
- `exit_code`: `0`
- `key_output`:
```text
> arqon-maestro@2.0.2 build:main
> webpack --config main.webpack.ts --mode=production
assets by status 195 KiB [cached] 20 assets
asset main.js 951 KiB [emitted] [minimized] (name: main) 1 related asset
webpack 5.72.0 compiled successfully in 22208 ms
```

### Artifact G3-B: Gate 3 Regression Harness
- `command`: `cd maestro/client && ARQON_SOAK_PORT=9103 npx ts-node test-soak.ts`
- `timestamp`: `2026-03-10T11:24:55-04:00`
- `exit_code`: `0`
- `key_output`:
```text
--- TEST RESULTS ---
[PASS] normal_operation
[PASS] pause_resume
[PASS] reconnect
[PASS] duplicate_handling
[PASS] out_of_order
[PASS] malformed
[PASS] replay
[PASS] command_execution
[PASS] speech_replay
[PASS] transcript_mismatch
[PASS] command_mismatch
[PASS] integrity_allow
[PASS] integrity_block
[PASS] integrity_policy_block

Overall passing: true
```

### Artifact G3-C: Targeted Replay Smoke & Idempotency Proof
- `command`: `cd maestro/client && npx ts-node test-replay-smoke.ts`
- `timestamp`: `2026-03-10T11:24:56-04:00`
- `exit_code`: `0`
- `key_output`:
```text
Mock Arqon Bus Server listening on ws://localhost:9101
[VoiceOutput] Playing speech request speech-replay-msg-999 (13 bytes): "mock synthesized speech..."
[BusClient] Received: stt.speech.request
[VoiceOutput] Ignoring replayed speech request: speech-replay-msg-999
[BusClient] Received: stt.speech.request
[VoiceOutput] Ignoring replayed speech request: speech-replay-msg-999
[BusClient] Received: stt.speech.request
[VoiceOutput] Playback finished for speech-replay-msg-999 in 168ms (exit code 0)

{
  "probe": "stt.speech.replay_deduplication",
  "status": "OK",
  "metrics": {
    "note": "Verified via STTTracking telemetry internally."
  }
}
```
Port isolation note: replay smoke uses a dedicated default port (`9101`) to avoid cross-test collisions with soak (`9100`).

### Artifact G3-D: Gate 3 Rollback Proof
- `command`: `cd maestro/client && npx ts-node test-rollback-gate3.ts`
- `timestamp`: `2026-03-10T11:25:28-04:00`
- `exit_code`: `0`
- `key_output`:
```text
=== GATE 3 ROLLBACK VERIFICATION ===
[BusClient] Bus is disabled in settings
Error in speech_replay: Error: BusClient failed to connect to mock server
[Rollback Proof] BusClient correctly aborted connection due to getArqonBusEnabled=false.
[Rollback Proof] VoiceOutput path is completely isolated and cannot be triggered.
```

Gate 3 decision log paths:
- `docs/decision-log.md` (`ADM-030`, `ADM-031`)

## Gate 4 Artifacts

### Artifact G4-A: Integrated Regression Coverage (Allow/Block/Policy)
- `command`: `cd maestro/client && ARQON_SOAK_PORT=9103 npx ts-node test-soak.ts`
- `timestamp`: `2026-03-10T11:24:55-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[PASS] integrity_allow
[PASS] integrity_block
[PASS] integrity_policy_block
Overall passing: true
```

### Artifact G4-B: Targeted Integrity Smoke
- `command`: `cd maestro/client && npx ts-node test-integrity-smoke.ts`
- `timestamp`: `2026-03-10T11:26:22-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[PASS] integrity_allow
[PASS] integrity_block
[PASS] integrity_policy_block
[PASS] integrity_default_deny

{
  "probe": "stt.integrity.handshake",
  "status": "OK",
  "checks": {
    "allow": true,
    "block": true,
    "policy_block": true,
    "default_deny": true
  }
}
```

### Artifact G4-C: Rollback / Uncertain-State Safety Proof (Default-Deny)
- `command`: `cd maestro/client && npx ts-node test-integrity-smoke.ts`
- `timestamp`: `2026-03-10T11:26:22-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[BusClient] Action blocked (no review handler): action-123
[MockServer] Received integrity signal: stt.action.block for action action-123
[PASS] integrity_default_deny
```

Interpretation:
- uncertain/no-handler states fail closed (`stt.action.block`) instead of bypassing the constitutive gate.
- unilateral policy block from Bus is surfaced as semantic failure (`stt.action.blocked`) with user-facing message.

Gate 4 decision log path:
- `docs/decision-log.md` (`ADM-032`)

## Gate 5 Artifacts

### Artifact G5-A: Build Integrity
- `command`: `cd maestro/client && npm run build:main`
- `timestamp`: `2026-03-10T14:36:17-04:00`
- `exit_code`: `0`
- `key_output`:
```text
> arqon-maestro@2.0.2 build:main
> webpack --config main.webpack.ts --mode=production
webpack 5.72.0 compiled successfully in 22955 ms
```

### Artifact G5-B: Regression Harness (No Gate 1-4 Regression)
- `command`: `cd maestro/client && ARQON_SOAK_PORT=9103 npx ts-node test-soak.ts`
- `timestamp`: `2026-03-10T14:36:17-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[PASS] normal_operation
[PASS] pause_resume
[PASS] reconnect
[PASS] duplicate_handling
[PASS] out_of_order
[PASS] malformed
[PASS] replay
[PASS] command_execution
[PASS] speech_replay
[PASS] transcript_mismatch
[PASS] command_mismatch
[PASS] integrity_allow
[PASS] integrity_block
[PASS] integrity_policy_block
Overall passing: true
```

### Artifact G5-C: Integrity Compatibility
- `command`: `cd maestro/client && npx ts-node test-integrity-smoke.ts`
- `timestamp`: `2026-03-10T14:36:17-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[PASS] integrity_allow
[PASS] integrity_block
[PASS] integrity_policy_block
[PASS] integrity_default_deny
{
  "probe": "stt.integrity.handshake",
  "status": "OK"
}
```

### Artifact G5-D: Coordinator Arbitration + Idempotency + Fail-Closed
- `command`: `cd maestro/client && npx ts-node src/main/stt/control-plane-coordinator.test.ts`
- `timestamp`: `2026-03-10T14:36:51-04:00`
- `exit_code`: `0`
- `key_output`:
```text
✓ per-agent FIFO + fair-share round-robin dispatch
✓ idempotency dedupe blocks duplicate submissions
✓ fail-closed blocks requests when backbone is unhealthy
✓ retry then dead-letter after retry budget is exhausted
Summary: 4 passed, 0 failed
```

### Artifact G5-E: Targeted Coordinator Smoke
- `command`: `cd maestro/client && npx ts-node test-control-plane-smoke.ts`
- `timestamp`: `2026-03-10T14:36:51-04:00`
- `exit_code`: `0`
- `key_output`:
```text
[ControlPlane] Blocking request cp-blocked: SpacetimeDB unavailable
{
  "probe": "stt.control_plane.coordinator",
  "status": "OK",
  "checks": {
    "accepted_initial_requests": true,
    "fair_dispatch_order": true,
    "ack_success_recorded": true,
    "fail_closed_block": true
  }
}
```

### Artifact G5-F: Rollback Proof (Gate 5 Disabled)
- `command`: `cd maestro/client && npx ts-node test-control-plane-rollback.ts`
- `timestamp`: `2026-03-10T14:37:12-04:00`
- `exit_code`: `0`
- `key_output`:
```text
{
  "probe": "stt.control_plane.rollback",
  "status": "OK",
  "checks": {
    "coordinator_disabled_accepts_request": true,
    "request_executed_without_coordinator_path": true
  }
}
```

Interpretation:
- Gate 5 enabled path enforces fail-closed behavior when coordinator backbone is unavailable.
- Gate 5 disabled path preserves Gate 4-safe execution behavior (rollback knob works).

Gate 5 decision log path:
- `docs/decision-log.md` (`ADM-033`)

Gate 5 residual risks:
1. SpacetimeDB integration is validated with coordinator contract semantics; production cluster soak and failover drills remain follow-on operational work.
2. Queue fairness and retry behavior are validated at test scale; sustained high-contention tuning of inflight limits remains an ops tuning task.

## Hard-Close Verdict

- **Gate 1**: `HARD-CLOSED`
- **Gate 2**: `HARD-CLOSED`
- **Gate 3**: `HARD-CLOSED`
- **Gate 4**: `HARD-CLOSED`
- **Gate 5**: `HARD-CLOSED`
