# H3/H4 Canonical Alignment Runbook

Date: 2026-04-06  
Status: Active

## Purpose

Prevent drift between:

1. documented command-lane policy/specs
2. active atlas/runtime configuration
3. real local execution behavior

This is the control-plane document for H3/H4 command-lane alignment and validation.

## Canonical Sources (In Priority Order)

When two docs conflict, use this precedence order.

1. **Spec contracts (highest authority)**
   - `docs/h3/H3_COMMAND_ATLAS_V1_SPEC.md`
   - `docs/h3/H3_GEOMETRIC_EVENT_CONTRACT_V1.md`
2. **Stage plan/completion constraints**
   - `docs/h3/H3_STAGE3A_PLAN.md`
   - `docs/h3/H3_STAGE3A_COMPLETION_NOTE.md`
3. **Runtime artifact (what is actually loaded)**
   - `maestro/client/artifacts/h3/command_atlas_v1.json`
4. **Operational launch/runbook**
   - `docs/operations/maestro-local-runbook.md`
5. **Evidence/reports**
   - `artifacts/reports/...`
   - `maestro/client/artifacts/reports/...`

## Policy Rules That Must Hold

1. Geometric recognition is atlas-backed. If a command phrase is not in the active atlas, geometric should not claim it.
2. Sidecar should emit an H3 geometric event only when activation/min-frames constraints pass.
3. Routing must follow command class:
   - `reflex` / `closed_structure` -> `geometric_only`
   - `parameterized` -> `geometric_prefix_asr_tail`
4. Fallback behavior must respect `fallback_eligible` and command-lane authority policy.
5. Unknown/out-of-atlas phrases must not be silently misclassified as a nearby atlas region.

## Critical Workflow A: Pre-Run Alignment Check

Run before debugging behavior.

1. Confirm atlas contents:
   - `cat maestro/client/artifacts/h3/command_atlas_v1.json`
2. Confirm target phrases are present as `region_id` values if geometric handling is expected.
3. If phrase is not present, decide explicitly:
   - add to atlas and rebuild/re-enroll
   - or rely on fallback path (legacy/ASR), with fail-closed implications understood
4. Confirm docs mention the same command set as the active atlas artifact.

## Critical Workflow B: Known-Good Local Bring-Up

1. Build client bundle:
   - `cd maestro/client && npm run build && cd ../..`
2. Start/warm sidecars:
   - `maestro/client/src/main/stt/sidecars/sidecar_manager.sh restart geometric`
   - `maestro/client/src/main/stt/sidecars/sidecar_manager.sh start parakeet`
   - `maestro/client/src/main/stt/sidecars/sidecar_manager.sh warmup parakeet`
3. Launch client:
   - `cd maestro && ./scripts/run_client.sh`

If Parakeet readiness blocks local startup, fix sidecar readiness first instead of bypassing by default.

## Critical Workflow C: Smoke Validation Matrix

Run each command and capture route/evidence.

1. Atlas-positive reflex: `pause`
2. Atlas-positive closed structure: `new tab`
3. Atlas-positive parameterized prefix: `go to line <n>`
4. Out-of-atlas phrase expected to fallback (example): `focus chrome` (if absent from active atlas)

Expected outcomes:

1. Atlas-positive commands produce non-null geometric region and lawful final decision.
2. Out-of-atlas commands do not produce incorrect geometric region assignment.
3. Out-of-atlas commands either:
   - succeed via fallback path, or
   - fail closed with explicit reason (no silent drop/misroute).

## Drift Checklist (Open This First When Things Break)

1. Is the command phrase present in active atlas artifact?
2. Do spec docs and completion notes claim commands that are not in active atlas?
3. Did sidecar event parsing preserve field names correctly (`snake_case` to runtime shape)?
4. Did route become expected (`geometric_only` vs `geometric_prefix_asr_tail`)?
5. Did final decision fail with `authoritative_path_failed_to_produce_lawful_final_decision`?
6. If failure occurred, was fallback eligible and actually exercised?

## Required Update Procedure

Any change to command-lane behavior must update all relevant layers in one change set:

1. spec contract (if behavior contract changed)
2. atlas artifact/build path (if command coverage changed)
3. runbook/testing procedure (if setup flow changed)
4. evidence report (proof that behavior matches policy)

Do not merge behavioral changes without this alignment pass.

## Immediate Known Inconsistency To Resolve

Current docs can reference `focus chrome` as a validated region while the active atlas artifact may only include:

1. `pause`
2. `new tab`
3. `go to line`

That mismatch must be resolved by either:

1. adding `focus chrome` to active atlas and validating, or
2. updating docs to state it is fallback-only for the current atlas version.
