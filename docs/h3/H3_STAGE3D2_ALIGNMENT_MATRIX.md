# H3 Stage 3D2 Alignment Matrix

Source-of-truth rule: runtime code + tests outrank pack prose when conflict exists.

## Reconciliation table

| doctrine requirement | PM/pack claim | code evidence | test evidence | status | required action |
|---|---|---|---|---|---|
| warm hit is advisory-only | warm may accelerate, may not authorize | warm apply/discard emitted in `chunk-manager.ts` with advisory reasons; no cache dispatch path | registry + chunk-manager focused tests pass | aligned | keep |
| live geometric evidence outranks warmed memory | explicit override/discard path claims in delta | override path now compares warmed canonical expectation vs final merged truth and emits discard with `liveEvidenceOverride=true` on mismatch | numeric-tail test explicitly proves warm-memory conflict is overridden by live truth | aligned | keep |
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
  - none currently open for Stage 3D2 Slice B doctrine lock.
- `defer`:
  - any persistence/distributed cache or non-v1 expansion requests.

## Execution slices (for this branch)

### Slice A (alignment-only, no runtime behavior change)

- normalize docs/prompt/manifest claims to current verified behavior.
- keep doctrine statements strict and consistent.
- add/retain validation command list and expected pass conditions.

### Slice B (behavior gap only if approved)

- implemented explicit live-truth override/discard path.
- added targeted test proving warmed expectation is discarded on final live-truth conflict.
- rerun `tsc`, targeted jest, and timing validator.
