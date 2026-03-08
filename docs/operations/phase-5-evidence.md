# Phase 5 Evidence Pack

## Purpose

This evidence pack records the concrete checks used to validate the Phase 5 config storage and log migration.

## Baseline

Before Phase 5:

- config files were already read and written through canonical `.arqon` filenames in code
- live user state on this machine was still primarily stored under `~/.serenade`
- `~/.arqon` already existed for other Arqon tooling and contained unrelated content
- scripts and logs were not being migrated as a directory-level state set

Observed baseline on this machine:

- `~/.arqon` existed but did not yet contain Maestro config, scripts, or logs
- `~/.serenade` contained:
  - `serenade.json`
  - `settings.json`
  - `words.json`
  - `scripts/custom.js`
  - `arqon.log`
  - `serenade.log`
  - `error.log`
  - `core.log`
  - `speech-engine.log`
  - `code-engine.log`

## Post-Change Verification

### Check 1: Electron Main Build

- **Command**: `npm run build:main` from `maestro/client`
- **Result**: passed.
- **Warnings**:
  - optional `ws` native addon warning for `bufferutil`
  - optional `ws` native addon warning for `utf-8-validate`
- **Interpretation**: no Phase 5 regression in the Electron main bundle.

### Check 2: Temp-Home Migration Simulation

- **Command**: created a temporary HOME with only legacy `.serenade` state, then instantiated `Settings` through `ts-node`.
- **Result**: passed.
- **Observed migrated files under temp `~/.arqon`**:
  - `arqon.json`
  - `settings.json`
  - `words.json`
  - `scripts/custom.js`
  - `arqon.log`
- **Interpretation**: the migration logic correctly copies legacy config, scripts, and logs into canonical Arqon storage without requiring a preexisting Maestro directory.

### Check 3: Real Home Migration

- **Command**:
  - `node -r ./node_modules/ts-node/register/transpile-only -e "const Settings=require('./src/main/settings').default; const s=new Settings(); console.log(s.path());"`
  - `find ~/.arqon -maxdepth 2 -type f | sort | sed -n '1,120p'`
- **Result**: passed.
- **Observed files under real `~/.arqon`**:
  - `arqon.json`
  - `settings.json`
  - `words.json`
  - `scripts/custom.js`
  - `arqon.log`
  - `serenade.log`
  - `error.log`
- **Interpretation**: the actual machine now has canonical Maestro config and support state under `~/.arqon` while leaving the legacy directory untouched.

### Check 4: Documentation Build

- **Command**: `mkdocs build`
- **Result**: passed.
- **Interpretation**: Phase 5 tracking and closeout content publish cleanly.

## Evidence Summary

Phase 5 succeeded on the pieces it was supposed to control:

- canonical config storage under `~/.arqon`
- migration of legacy config files into canonical Arqon filenames
- migration of custom-command scripts into `~/.arqon/scripts`
- migration of historical logs into `~/.arqon`
- preservation of legacy `~/.serenade` state as a fallback and rollback base

## Conclusion

Phase 5 can be hard-closed because live Maestro state now exists under `~/.arqon`, while legacy `~/.serenade` data remains available as compatibility and rollback material.
