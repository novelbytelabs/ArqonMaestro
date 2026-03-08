# Phase 2 Closeout

- **Phase**: `Phase 2`
- **Status**: `completed`
- **Date**: `2026-03-08`
- **Owner**: `Codex`
- **Objective**: make Arqon config paths and environment variables canonical while preserving legacy fallback for compatibility

## Scope Completed

- made `.arqon/arqon.json` the canonical config file in the Electron client settings layer
- made `.arqon` the canonical config directory in the VS Code extension settings layer
- added forward migration from legacy `.serenade` files when canonical files are missing
- made `ARQON_MAESTRO_SOURCE_ROOT` and `ARQON_MAESTRO_LIBRARY_ROOT` the preferred build variables across shell, Gradle, and CMake entry points
- updated docs to describe the compatibility layer correctly

## Files Changed

- settings and config:
  - `serenade/client/src/main/settings.ts`
  - `vscode-plugin/src/settings.ts`
- build/runtime entry points:
  - `build.sh`
  - `setup_maestro.sh`
  - `download_models.sh`
  - `serenade/build.gradle`
  - `serenade/core/build.gradle`
  - `serenade/code-engine/server/CMakeLists.txt`
  - `serenade/speech-engine/server/CMakeLists.txt`
- supporting docs:
  - `RUN_COMMANDS.md`
  - `BUILD_TROUBLESHOOTING.md`
  - `TROUBLESHOOTING.md`
  - `TRAINING.md`
  - `docs/guides/building.md`

## Breaking Changes Introduced

- new writes now target `.arqon` as the canonical home for migrated settings
- shell guidance now expects `ARQON_MAESTRO_*` variables first

## Compatibility Shims Added

- legacy `.serenade/serenade.json` read-and-migrate support
- legacy `.serenade/settings.json` and `.serenade/words.json` migration where applicable
- legacy `SERENADE_SOURCE_ROOT` and `SERENADE_LIBRARY_ROOT` fallback support in shell, Gradle, and CMake

## Compatibility Shims Removed

- none in this phase

## Verification Performed

- `mkdocs build`
- `npm run build:main` in `serenade/client`

## Residual Risks

- deeper runtime identifiers still use inherited names
- external infrastructure still points to inherited endpoint and CDN domains
- Phase 3 subtree rename will need a fresh path audit on top of this compatibility layer

## Rollback Point

- local git rollback to the pre-Phase-2 worktree state before commit

## Entry Criteria For Next Phase

- closeout committed
- tracker updated to `completed`
- Phase 3 planning uses `.arqon` and `ARQON_MAESTRO_*` as the baseline assumptions
