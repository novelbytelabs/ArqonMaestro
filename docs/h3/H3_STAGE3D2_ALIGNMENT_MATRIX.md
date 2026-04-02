# H3 Stage 3D2 Alignment Matrix

Source-of-truth rule: runtime code + tests outrank pack prose when conflict exists.

## Reconciliation table

| doctrine requirement | PM/pack claim | code evidence | test evidence | status | required action |
|---|---|---|---|---|---|
| warm hit is advisory-only | warm may accelerate, may not authorize | warm apply/discard emitted in `chunk-manager.ts` with advisory reasons; no cache dispatch path | registry + chunk-manager focused tests pass | aligned | keep |
| live geometric evidence outranks warmed memory | explicit override/discard path claims in delta | `liveEvidenceOverride` field exists, but current emitted value is fixed `false`; no explicit final-merge conflict override reason wired | no explicit test proving live-overrides-warm conflict path end-to-end | conflict | small implementation gap |
| no H23/H24 bypass | governance remains sacred | registration occurs post-governed success (`h24-policy-proof-recorder.ts`); warm lookup emits `governanceRequired=true` | Stage 3D1/3D2 tests cover registration gates | aligned | keep |
| no Stage 3A activation drift | stage 3A remains unchanged | route activation still geometric-first in `chunk-manager.ts`; warm logic is additive | existing numeric/open tail tests still green | aligned | keep |
| no persistence/distributed cache | no persistence | semantic registry remains in-memory only | no persistence artifacts introduced | aligned | keep |
| no Turbo/Tight/Ultra | no regime work | no Turbo/Tight/Ultra symbols/config work added in scope files | n/a | aligned | keep |
| timing reduction required in one reflex/closed and one parameterized | timing validator + report claims present | timing artifact/report present in stage3d2 artifacts/report docs | validator script currently exists in pack, not baseline tracked scripts | partial | doc fix only + integrate script as tooling if approved |
| warm miss clean no-op | warm miss continues normal path | lookup miss paths use discard reasons and continue normal routing | registry tests include miss behavior | aligned | keep |

## Pack vs code classification

- `doc fix only`:
  - any prose that describes features already present but with wording drift.
- `small implementation gap`:
  - explicit live-truth override/discard semantics (`liveEvidenceOverride=true` and discard reason on warmed-vs-final mismatch).
- `defer`:
  - any persistence/distributed cache or non-v1 expansion requests.

## Execution slices (for this branch)

### Slice A (alignment-only, no runtime behavior change)

- normalize docs/prompt/manifest claims to current verified behavior.
- keep doctrine statements strict and consistent.
- add/retain validation command list and expected pass conditions.

### Slice B (behavior gap only if approved)

- minimally implement the explicit live-truth override/discard path if missing.
- add targeted tests that assert warmed expectation is discarded on final live-truth conflict.
- rerun `tsc`, targeted jest, and timing validator.
