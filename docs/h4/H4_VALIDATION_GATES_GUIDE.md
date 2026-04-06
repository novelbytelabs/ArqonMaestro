# H4 Validation Gates Guide

Title:
Arqon Maestro H4 Validation Gates Guide

Project:
`H4`

Branch:
`feature/h4`

Role:
Freeze the validation posture used during H4 and define the minimum regression gate for future work touching H4 surfaces.

## 1. Standing H4 gates

The standing H4 gate order is:

1. `cd maestro/client && npx tsc --noEmit`
2. targeted `jest --runInBand` set covering current H4 slice plus standing H3/H4 suites
3. `cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py`

## 2. Live hardening truth

H4 also introduced a fourth proof family:

4. real live microphone session evidence

This fourth proof family is required for live-hardening work, but not every docs-only closure slice must modify runtime to satisfy it again.

## 3. Closure posture at H4-S6

At provisional freeze, the standing code gates remained green on the reported real baseline.

H4-S6 itself is docs-only and does not introduce runtime changes.

## 4. Future regression rule

Any future change that touches H4 authority surfaces should run at least:

- `npx tsc --noEmit`
- the relevant H4/H3 targeted jest list
- the timing validator
- and, if live behavior is touched, at least one real microphone session

## 5. Truthfulness rule

A future refinement may not claim H4 fully hardened unless live-use evidence supports it.

It may, however, build on the provisional freeze baseline established here.
