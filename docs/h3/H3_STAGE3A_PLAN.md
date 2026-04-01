# H3 Stage 3A Plan

Status: In progress  
Scope: Stage 3A only (`Real Atlas + Native Live Geometric Lane`)

## Objective

Replace bootstrap/demo geometric components with a real atlas-backed live H3 command lane.

## Non-Goals

- Turbo/Tight/Ultra precision tuning work
- Broad perf optimization campaign
- Stage 3B/C/D command expansion
- Product UX expansion unrelated to H3 lane contract

## Slices

### Slice 1 - Atlas Foundations
- Define `Command Atlas v1` schema and validation rules
- Define enrollment manifest format
- Define geometric event contract v1
- Add plan/checklist docs

### Slice 2 - Enrollment Tooling
- Implement atlas builder from enrollment manifest + recorded WAV set
- Implement atlas validator
- Publish sample manifest and sample atlas output path conventions
- Add Maestro build entrypoint: `scripts/h3_build_atlas_v1.sh`

### Slice 3 - Runtime Integration
- Update sidecar H3 detector to consume atlas v1 as primary source
- Add explicit per-command policy fields into detector decisions:
  - activation threshold
  - stability threshold (captured in metadata)
  - min frames
  - fallback eligibility
- Keep compatibility fallback to legacy bootstrap atlas only when explicitly allowed

### Slice 4 - Live Validation
- Validate one live run per class:
  - reflex: `pause`
  - closed-structure: `focus chrome`, `new tab`
  - parameterized prefixes: `go to`, `go to line`
- Confirm H23/H24 compatibility and H3-off fallback

### Slice 5 - Stage 3A Close
- Write close report and known limits
- Recommend Stage 3B entry criteria

## Planned File Changes (Slice 1-3)

Maestro:
- `docs/h3/H3_STAGE3A_PLAN.md`
- `docs/h3/H3_COMMAND_ATLAS_V1_SPEC.md`
- `docs/h3/H3_GEOMETRIC_EVENT_CONTRACT_V1.md`
- `maestro/client/src/main/stt/sidecars/parakeet_sidecar.py`
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`
- `scripts/h3_build_atlas_v1.sh`

Manifold:
- `tools/h3_atlas_v1.py` (new)
- `tools/enrollment_manifest_v1.sample.md` (new portable sample)

## Acceptance Checklist (Stage 3A)

- [ ] Real atlas artifact exists and is versioned as v1
- [ ] Atlas built from enrollment manifest + recorded data path
- [ ] Maestro live sidecar consumes atlas v1 as primary source
- [ ] Geometric events comply with contract v1 fields/semantics
- [ ] Reflex, closed-structure, and parameterized-prefix commands validate live
- [ ] H23/H24 compatibility preserved
- [ ] H3-off fallback preserved

## Slice 2 Progress Notes

- Atlas build/validate pipeline now has a stable entrypoint in Maestro (`scripts/h3_build_atlas_v1.sh`).
- Manifold manifest sample is now portable/reviewable as Markdown with embedded JSON.
- Sidecar loader now validates Atlas v1 schema/version and emits atlas-backed metadata in geometric events.

## Risks

- Enrollment quality variance can reduce region separability
- Atlas schema drift between build-time and runtime consumers
- Overly strict thresholds can suppress valid detections
- Overly permissive fallback may hide atlas integration regressions
