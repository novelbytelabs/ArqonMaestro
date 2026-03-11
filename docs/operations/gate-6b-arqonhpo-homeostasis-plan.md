# Gate 6B Plan: ArqonHPO Online Homeostasis for Maestro Latency

## Status

`IN PROGRESS` (online integration in-flight; latency target not yet met)

## Latest Evidence Snapshot (2026-03-10)

Most recent benchmark run (real Kokoro sidecar on `127.0.0.1:7781`):

- `stream_ack_short_ttfa_ms.p95 = 658ms`
- `stream_total_ms.p95 = 3253ms`
- `stream_errors = 0`
- `stt.bus_audio_to_final_ms.p95 = 3ms`

Target verdict:
- `p95_ack_tts_ttfa_ms < 200`: `NOT MET`
- `p95_ack_tts_total_ms < 200`: `NOT MET`

Interpretation:
- Online integration and telemetry are progressing, but the latency hard target is not yet achieved in current Kokoro path.

## Intent Clarification (Locked)

This gate is for **online homeostatic control** with ArqonHPO in live operation.
It is **not** an offline HPO campaign workflow and is **not** an Optuna-style slow tuning pass.

- Online mode required: `ArqonSolver.ask_one()` + `seed()`
- Closed-loop behavior required: measure -> decide -> apply -> observe
- Deterministic governance required: bounded changes, cooldown, rollback, evidence

## Frozen Preferences and Constraints

These are explicit user constraints and must be treated as non-negotiable for Gate 6B:

1. **Firecracker-only Kokoro production runtime** (no host-native Kokoro production path).
2. **No fast-hacking**: no stubs/shims/placeholders in production path.
3. **Mocks policy**: only the already-allowed STT mock server may be used for targeted tests; hard-close must include real-path validation.
4. **Streaming is mandatory** for Kokoro path.
5. **Arqon Bus-first posture**: remove reliance on legacy websocket service patterns and avoid drift back to `17373` in active runtime paths.
6. **Fail-closed default posture** on safety-critical failures.
7. **Evidence-first hard-close**: claims must match command output artifacts.
8. **Use case priority**: short acknowledgements (2-5 words) must be optimized first.

## Scope

Implement an online homeostatic tuner that adjusts latency-relevant Maestro knobs safely at runtime.

In scope:
- Online ArqonHPO tuning loop for TTS + STT latency.
- Safe actuation layer for a bounded subset of settings.
- Objective function + telemetry ingestion pipeline.
- Rollback, freeze, and fail-closed protections.
- Evidence and operational documentation updates.

Out of scope:
- Reopening Gates 1-5.
- Replacing control-plane coordinator design.
- Tuning arbitrary unsafe knobs without guardrails.

## Primary Outcome Targets (Locked)

This gate has two linked outcomes and both are required:

1. **ArqonHPO online integration** in Maestro runtime.
2. **Sub-200ms latency objective** for short acknowledgements.

### Latency SLO/SLI targets

Primary class: `ack_short` (2-5 words such as “upload complete”, “policy updated”).

- **Target SLO-A (hard target):** `p95_ack_tts_ttfa_ms < 200`
- **Target SLO-B (hard target):** `p95_ack_tts_total_ms < 200` when synthesis payload is short and stream path is warm
- **Guardrail SLO-C:** no regression of STT final latency beyond agreed threshold during tuning

If SLO-A/B are not achieved, the implementation cannot be hard-closed as “target met”; it must be marked as “integration complete, latency target unmet” with quantified bottlenecks and a next-step remediation plan.

## Critical Context Links

### Existing plans/evidence
- [Voice plane implementation plan](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/voice_plane_implementation_plan.md)
- [Gate 6 Kokoro plan](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/gate-6-kokoro-plan.md)
- [Phase E evidence](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/phase-e-evidence.md)
- [Walkthrough](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/walkthrough.md)
- [Port reference](/home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/port-reference.md)

### Maestro runtime files
- [Settings surface](/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/src/main/settings.ts)
- [Kokoro/fallback providers](/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/src/main/stt/tts-providers.ts)
- [Voice output router](/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/src/main/stt/voice-output.ts)
- [STT tracking/telemetry](/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/src/main/stt/tracking.ts)
- [Chunk manager latency path](/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/src/main/stream/chunk-manager.ts)
- [Current benchmark harness](/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/benchmark-tts-stt.ts)

### ArqonHPO references
- [ArqonHPO README](/home/irbsurfer/Projects/arqon/ArqonHPO/README.md)
- [Python API reference](/home/irbsurfer/Projects/arqon/ArqonHPO/docs/docs/documentation/reference/python.md)
- [Batch vs online mode](/home/irbsurfer/Projects/arqon/ArqonHPO/docs/docs/documentation/concepts/batch_vs_online.md)

## Architecture (Target)

### Control loop components

1. **Telemetry Collector**
- Consumes runtime events (`stt.tts.*`, STT latency events) and emits normalized samples.
- Must tag each sample with:
  - timestamp
  - scenario class (`ack_short`, `normal`, `long`)
  - active knob values
  - outcome (success/failure/fallback/fail_closed)

2. **Objective Evaluator**
- Computes scalar loss from rolling window statistics.
- Prioritizes short acknowledgements.
- Applies hard penalties for failures and fallback overuse.

3. **ArqonHPO Online Tuner**
- Uses `ask_one()` to propose next candidate.
- Uses `seed()` with observed reward/loss.
- Maintains deterministic seed + audit artifact stream.

4. **Safe Actuator**
- Applies candidate knobs only if all guardrails pass.
- Enforces per-knob bounds + max-delta + cooldown.
- Supports emergency freeze and one-command rollback.

5. **Governance Layer**
- Emits decision artifacts for every change attempt:
  - allow/block reason
  - before/after config
  - expected vs observed latency delta

## Tune Surface (Phase 1)

Only tune these initially:

### TTS knobs
- `arqon_tts_kokoro_timeout_ms`
- `arqon_tts_kokoro_streaming_enabled` (must remain `true` unless explicit safety override)
- `arqon_tts_kokoro_fallback_enabled` (policy-controlled; should normally remain `true` in production-safe mode)

### STT knobs
- `chunk_silence_threshold`
- `chunk_speech_threshold`
- `execute_silence_threshold`
- `arqon_bus_compare_threshold` (small bounded moves only)

Do not auto-tune these in Phase 1:
- `arqon_tts_provider`
- `arqon_tts_kokoro_url`
- microphone selection
- transport ports/endpoints

## Objective Function (Initial)

Primary objective is low-latency acknowledgements without safety regressions.

Proposed loss:

`loss = 0.50*p95_ack_tts_ttfa + 0.20*p95_ack_tts_total + 0.20*p95_stt_final + 0.10*stability_penalty + failure_penalty`

Where:
- `p95_ack_tts_ttfa`: first-audio latency for 2-5 word replies.
- `p95_ack_tts_total`: full completion latency for ack replies.
- `p95_stt_final`: speech-to-final latency.
- `stability_penalty`: oscillation or high variance term.
- `failure_penalty`: very large penalty when fail-closed/fallback/failure thresholds exceeded.

Constraint overlay:
- Candidate proposals that move `p95_ack_tts_ttfa` away from the `<200ms` target over rolling windows should be auto-blocked unless in explicit exploratory canary mode.

## Phased Implementation Plan

### Phase A: Baseline and instrumentation hardening

Deliverables:
- Expand benchmark harness to segment by scenario class (`ack_short`, `normal`, `long`).
- Ensure TTFA metric is captured from streamed Kokoro path.
- Verify STT final latency collection path is consistent.

Acceptance:
- Repeatable baseline report generated with fixed seed and fixed workload.
- Report includes p50/p95/p99, failure rates, fallback rates.

### Phase B: Online tuner service (dry-run mode)

Deliverables:
- Add tuner service module (Python or TS wrapper) using ArqonHPO online API.
- Dry-run mode: proposes knobs but does not apply them.
- Decision log output with candidate + expected constraints.

Acceptance:
- Dry-run produces candidate stream and valid ArqonHPO `seed()` updates.
- No writes to runtime settings in dry-run mode.

### Phase C: Safe actuation + rollback

Deliverables:
- Controlled settings writer with lock + cooldown + max-delta.
- Emergency freeze flag (`arqon_hpo_homeostasis_enabled=false`).
- Single-switch rollback to last known-good profile.

Acceptance:
- Guardrail violations block apply and emit explicit reason.
- Rollback command restores prior profile and is proven by smoke test.

### Phase D: Live loop in canary mode

Deliverables:
- Canary rollout (e.g., small percentage or time-windowed updates).
- Runtime monitoring thresholds for automatic freeze.
- Residual risk log.

Acceptance:
- Measured latency improvement on `ack_short` class without safety regressions.
- No increase in fail-closed events beyond threshold.
- Trend line demonstrates convergence toward `<200ms` target, with explicit delta-to-target report.

### Phase E: Hard-close evidence and governance

Deliverables:
- Evidence pack updates with raw command artifacts.
- Decision-log entry documenting chosen objective/guardrails.
- Closeout section in ops docs.

Acceptance:
- All hard-close commands exit `0`.
- Claims in docs match command output exactly.

## Guardrails and Gotchas

### Gotcha 1: Wrong HPO mode
- Problem: using batch `ask()/tell()` for live loop can create slow, brittle behavior.
- Requirement: live tuning must use `ask_one()/seed()`.

### Gotcha 2: Metric contamination
- Problem: mixing cold-start and warm-path samples corrupts objective.
- Requirement: tag each sample with warm/cold state and segment reporting.

### Gotcha 3: Fallback masking regressions
- Problem: latency “looks okay” while Kokoro silently fails and fallback carries traffic.
- Requirement: hard penalty on fallback ratio and explicit fallback KPI in objective.

### Gotcha 4: Oscillation from aggressive updates
- Problem: knobs bounce and degrade user experience.
- Requirement: max-delta + cooldown + minimum dwell before next change.

### Gotcha 5: Settings race conditions
- Problem: concurrent writers cause inconsistent config state.
- Requirement: single writer/lock and atomic update + readback verification.

### Gotcha 6: Port drift / legacy websocket relapse
- Problem: accidental dependency reintroduced on legacy websocket port patterns.
- Requirement: add explicit regression test that fails if forbidden runtime path is activated.

### Gotcha 7: Overclaiming hard-close
- Problem: docs claim completion without real-path proof.
- Requirement: hard-close blocked unless evidence includes real runtime path commands.

### Gotcha 8: Gaming benchmark workload
- Problem: synthetic workload too easy, not representative.
- Requirement: include mixed scenario bundle with realistic ack, command, and long utterance cases.

### Gotcha 9: `.js` shadowing `.ts` during ts-node runs
- Problem: generated/committed `.js` files can be imported instead of latest `.ts`, masking fixes.
- Requirement: run validation commands with `TS_NODE_PREFER_TS_EXTS=1` or ensure stale generated JS is removed from test paths.

## Hard-Close Command Pack (Minimum)

From `maestro/client`:

1. `npm run build:main`
2. `npx ts-node test-soak.ts`
3. `npx ts-node test-integrity-smoke.ts`
4. `ARQON_BENCH_TTS_URL=http://127.0.0.1:7781 npx ts-node benchmark-tts-stt.ts`
5. Gate 6 smoke/failure/rollback tests:
- `npx ts-node test-kokoro-smoke.ts`
- `npx ts-node test-kokoro-stream-smoke.ts`
- `npx ts-node test-kokoro-failure-smoke.ts`
- `npx ts-node test-kokoro-rollback.ts`
6. New HPO loop smoke:
- `npx ts-node test-hpo-homeostasis-smoke.ts` (to be implemented)

## Required Artifacts for Evidence

Each artifact block must include:
- `command`
- `timestamp`
- `exit_code`
- `key_output`
- `interpretation`

Evidence locations to update:
- `docs/operations/phase-e-evidence.md`
- `docs/operations/walkthrough.md`
- `docs/operations/decision_log.md`

## Definition of Done (Gate 6B)

Gate 6B is hard-closed only if all are true:

1. Online ArqonHPO loop is running in `ask_one()/seed()` mode.
2. Short-ack latency target is met (`p95_ack_tts_ttfa_ms < 200`; and where applicable `p95_ack_tts_total_ms < 200`) with statistically honest reporting.
3. No safety regression (fail-closed/fallback/error thresholds respected).
4. Rollback/freeze controls are validated by command evidence.
5. Docs and decision logs match code and outputs exactly.

## Prompt for Your Other AI

Use this exact prompt:

```text
Implement Gate 6B in /home/irbsurfer/Projects/arqon/ArqonMaestro as an ONLINE ArqonHPO homeostatic tuning loop for Maestro latency.

Read first:
- /home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/gate-6b-arqonhpo-homeostasis-plan.md
- /home/irbsurfer/Projects/arqon/ArqonMaestro/docs/operations/gate-6-kokoro-plan.md
- /home/irbsurfer/Projects/arqon/ArqonMaestro/docs/voice_plane_implementation_plan.md
- /home/irbsurfer/Projects/arqon/ArqonHPO/docs/docs/documentation/reference/python.md
- /home/irbsurfer/Projects/arqon/ArqonHPO/docs/docs/documentation/concepts/batch_vs_online.md

Hard constraints:
1) Use ArqonHPO ONLINE mode only: ask_one()/seed(). Do NOT implement offline/Optuna-style tuning loops.
2) Firecracker-only Kokoro production posture remains intact.
3) No stubs/placeholders/shims in production path. No cheating tests.
4) Streaming path remains enabled and measured.
5) Keep fail-closed safety posture and explicit rollback/freeze controls.
6) Do not reintroduce legacy websocket dependency patterns.
7) Evidence-first: every claim must be backed by command artifacts.
8) This gate has two required outcomes: (a) online ArqonHPO integration and (b) achieving <200ms p95 short-ack latency target.

Implement phases A-E from the Gate 6B plan, including:
- telemetry normalization + objective function for short acknowledgements (2-5 words)
- safe actuator with bounds/max-delta/cooldown
- HPO loop service with dry-run and live modes
- HPO smoke test and rollback proof test
- docs/evidence updates

Then run and capture at minimum:
- npm run build:main
- npx ts-node test-soak.ts
- npx ts-node test-integrity-smoke.ts
- npx ts-node benchmark-tts-stt.ts
- npx ts-node test-kokoro-smoke.ts
- npx ts-node test-kokoro-stream-smoke.ts
- npx ts-node test-kokoro-failure-smoke.ts
- npx ts-node test-kokoro-rollback.ts
- npx ts-node test-hpo-homeostasis-smoke.ts

Do not declare hard-close if any command fails or if evidence/docs diverge from actual outputs.
```
