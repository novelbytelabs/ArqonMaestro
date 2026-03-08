# Phase 4 Evidence Pack

## Purpose

This evidence pack records the concrete checks used to validate the Phase 4 sidecar and runtime process identity migration.

## Pre-Change Baseline

### Baseline A: Electron Main Build

- **Command**: `npm run build:main` from `maestro/client`
- **Result**: passed before the Phase 4 rename work.
- **Notes**: existing `ws` optional dependency warnings for `bufferutil` and `utf-8-validate` remained the only warnings.

### Baseline B: Local Packaging Attempt Without Cleanup

- **Command**: `./gradlew :speech-engine:clean :code-engine:clean :core:clean :client:installServer -x downloadModels`
- **Result**: failed before Phase 4 verification because the native build tree still contained stale CMake cache state and old absolute paths from the earlier subtree rename.
- **Key signal**: `CMakeCache.txt` still referenced the prior `.../serenade/...` source location.
- **Interpretation**: this was a carry-over packaging hazard from Phase 3, not a Phase 4 process-name regression.

## Post-Change Verification

### Check 1: Sidecar Syntax

- **Command**:
  - `node --check maestro/client/static/custom-commands-server/arqon-maestro-custom-commands-server.js`
  - `node --check maestro/client/static/custom-commands-server/serenade-custom-commands-server.min.js`
- **Result**: passed.
- **What it proves**: the new primary sidecar entrypoint and the legacy wrapper are syntactically valid.

### Check 2: Electron Main Bundle

- **Command**: `npm run build:main` from `maestro/client`
- **Result**: passed.
- **Warnings**:
  - `bufferutil` missing under `ws`
  - `utf-8-validate` missing under `ws`
- **Interpretation**: unchanged optional warnings; no new Phase 4 bundle regressions.

### Check 3: Clean Native Packaging With Explicit Arqon Env Vars

- **Command**:
  - `bash -lc 'cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro && ARQON_MAESTRO_SOURCE_ROOT=/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro ARQON_MAESTRO_LIBRARY_ROOT=/home/irbsurfer/libserenade ./gradlew :speech-engine:clean :code-engine:clean :core:clean :client:installServer -x downloadModels'`
- **Result**: failed.
- **Key signals**:
  - `/home/irbsurfer/libserenade/marian/build/libmarian.a` missing
  - protobuf compiler/library version mismatch
  - generated protobuf headers incompatible with installed protobuf headers
- **Interpretation**: the runtime-process rename is not the blocker; the blocker is the external native toolchain and library environment.

### Check 4: Clean Core Packaging Path

- **Command**: `./gradlew :core:clean :core:distTar :client:clean :client:installCore -x downloadModels`
- **Result**: passed.
- **What it proves**: the Arqon rename for the packaged core binary and the updated client install rule are both working.

### Check 5: Installed Core Binary Name

- **Command**: `find maestro/client/static/local -maxdepth 4 \( -name 'arqon-maestro-*' -o -name 'serenade-*' -o -name 'run-pro' \) | sort`
- **Result**:
  - `maestro/client/static/local/core/bin/arqon-maestro-core`
  - `maestro/client/static/local/core/bin/run-pro`
- **What it proves**: the packaged local core binary now carries the Arqon Maestro process identity.

### Check 6: Built Electron Sidecar Assets

- **Command**: `find maestro/client/out/static/custom-commands-server -maxdepth 1 -type f | sort`
- **Result** included:
  - `arqon-maestro-custom-commands-server.js`
  - `serenade-custom-commands-server.min.js`
- **What it proves**: the Electron build output now ships the new primary sidecar plus the legacy wrapper.

## Evidence Summary

Phase 4 succeeded on the pieces it was supposed to control:

- sidecar identity
- sidecar compatibility surface
- local process naming
- packaged core binary naming
- Electron output contents

The remaining packaging failures are environmental and pre-existing:

- native dependency root alignment
- protobuf toolchain mismatch
- missing Marian library artifacts under `/home/irbsurfer/libserenade`

## Conclusion

Phase 4 can be hard-closed because the renamed sidecar and runtime identity changes are validated independently of the native-engine environment failures.
