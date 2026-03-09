# Wave C Plan: Packaging And Distribution

## Objective

Hard-close `Wave C` by proving a repeatable packaging and distribution path for desktop and VS Code extension artifacts.

## Scope

- validate release-readiness prerequisites in the current frozen environment
- produce unsigned desktop package artifacts from `maestro/client`
- verify unpacked desktop runtime launch
- verify VS Code extension install/build/package path
- publish command-level evidence and hard-close records
- contain `ELECTRON_RUN_AS_NODE` contamination risk without breaking legacy workflows

## Non-Goals

- changing frozen ecosystem lanes
- introducing new package managers or dependency modules
- replacing inherited external update infrastructure in this wave

## Exit Criteria

1. `release_readiness_check.sh` passes under Node 18.
2. `npm run package:unsigned` completes and emits AppImage + linux-unpacked output.
3. linux-unpacked artifact starts with clean Electron mode isolation.
4. VS Code extension path passes install/build/pack-dry-run checks.
5. Wave C evidence and closeout docs are published.

## Controls

- Node lane for Wave C packaging remains Node 18.
- Electron launches and package checks run via `scripts/with_clean_electron_env.sh`.
- Legacy commands that require Node-style Electron behavior stay explicitly scoped per command:
  `ELECTRON_RUN_AS_NODE=1 <legacy-command>`.

## Evidence Sources

- `reports/wave-c_20260309T154457Z/*`
- `maestro/scripts/release_readiness_check.sh`
- `maestro/scripts/release_collect_evidence.sh`
- `maestro/scripts/with_clean_electron_env.sh`
