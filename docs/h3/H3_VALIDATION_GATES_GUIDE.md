# H3_VALIDATION_GATES_GUIDE

Date:
April 3, 2026

Status:
Operational guide

Purpose:
Standardize the local proof required for H3 slice integration.

## Core rule

Bundle-local verification is never enough.
Real proof is local repository proof.

## Required gate order

1. Typecheck
2. Targeted Jest gate
3. Timing validator

Stop on first failure.

## Typecheck

Command:
cd maestro/client && npx tsc --noEmit

Purpose:
- ensure the runtime shape remains type-safe
- catch null/undefined contract drift early
- catch test syntax defects before Jest

## Targeted Jest gate

Use the exact required suite set for the active stage band.
Do not replace this with broad npm test.

Purpose:
- validate the owning stage tests
- validate adjacent subsystem compatibility
- catch cross-suite contamination and harness leakage

## Timing validator

Command pattern:
cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py

Purpose:
- protect the warm-path doctrine
- ensure regressions do not quietly break the baseline

Expected invariants:
- reflex_improves = true
- numeric_improves = true
- warm_miss_non_authorizing = true
- warm_miss_uses_baseline_path = true

## Pre-gate requirements

Before Gate 1:
- verify SHA256 on every applied file against the bundle manifest
- confirm the correct branch and baseline commit family
- confirm working tree is understood

## Failure handling

On first failure:
- stop immediately
- capture exact command
- capture full stdout
- capture full stderr
- do not manually repair unless explicitly requested

## Bundle-quality lessons learned

Watch for:
- stray extra braces in appended test blocks
- null vs undefined drift in typed runtime event shapes
- cross-suite mock contamination
- baseline mismatch between theoretical bundle state and repaired real repo state
