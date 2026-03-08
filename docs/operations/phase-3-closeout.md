# Phase 3 Closeout

- **Phase**: `Phase 3`
- **Status**: `completed`
- **Date**: `2026-03-08`
- **Owner**: `Codex`
- **Objective**: rename the top-level engine subtree from `serenade/` to `maestro/` and repair repo-path references without mixing in deeper identity migration work

## Scope Completed

- renamed the top-level engine subtree from `serenade/` to `maestro/`
- repaired root scripts and user-facing runbooks to use the new subtree path
- updated root `.gitignore` so generated assets and local model directories under `maestro/` remain ignored
- updated rebrand tracking docs and strategy docs to reflect that the subtree rename is done

## Files Changed

- root control files:
  - `.gitignore`
  - `build.sh`
  - `setup_maestro.sh`
- root runbooks:
  - `RUN_COMMANDS.md`
  - `BUILD_TROUBLESHOOTING.md`
  - `TROUBLESHOOTING.md`
  - `CURRENT_ISSUES.md`
  - `MICROPHONE_TROUBLESHOOTING.md`
  - `TRAINING.md`
  - `ARCHITECTURE.md`
- tracking docs:
  - `LEGACY_INTERNAL_RENAME_TODO.md`
  - `docs/decision-log.md`
  - `docs/operations/gotcha-registry.md`
  - `docs/operations/rebrand-program.md`
  - `mkdocs.yml`
- renamed subtree:
  - `serenade/` -> `maestro/`

## Breaking Changes Introduced

- all repo-path references that previously pointed at `serenade/` now need to use `maestro/`
- root scripts now assume the engine subtree lives at `maestro/`

## Compatibility Shims Added

- none in this phase

## Compatibility Shims Removed

- none in this phase

## Verification Performed

- `mkdocs build`
- `npm run build:main` in `maestro/client`
- `./gradlew :core:clean :core:installDist -x downloadModels` in `maestro`

## Residual Risks

- internal identifiers like `scripts/serenade`, `rootProject.name = "serenade"`, and `ai.serenade.*` still remain
- technical docs inside the moved subtree still describe inherited internal paths and are deferred to later phases
- sidecar and process identity still use inherited naming and are not part of this phase

## Rollback Point

- local git rollback to the pre-Phase-3 worktree state before commit

## Entry Criteria For Next Phase

- closeout committed
- tracker updated to `completed`
- Phase 4 must start from the assumption that `maestro/` is the stable repo root for the engine subtree
