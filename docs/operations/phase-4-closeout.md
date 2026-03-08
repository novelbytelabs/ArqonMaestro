# Phase 4 Closeout

## Phase Closeout

- **Phase**: `Phase 4`
- **Status**: `completed`
- **Date**: `2026-03-08`
- **Owner**: `Codex`
- **Objective**: Rename the custom-command sidecar and local runtime process identities to Arqon Maestro equivalents without breaking startup, shutdown, or existing user scripts.

### Scope Completed

- Renamed the primary custom-command sidecar entrypoint to `arqon-maestro-custom-commands-server.js`.
- Kept a legacy sidecar wrapper so older filename assumptions still resolve during the transition.
- Made the sidecar load custom scripts from `.arqon/scripts` first while still watching `.serenade/scripts`.
- Added `global.arqon` as the primary custom-command API object while preserving `global.serenade` as a compatibility alias.
- Renamed local packaged process identities to `arqon-maestro-core`, `arqon-maestro-speech-engine`, and `arqon-maestro-code-engine`.
- Updated local process shutdown logic to terminate both new and legacy process names.
- Captured verification evidence and updated the rebrand tracking docs.

### Files Changed

- `maestro/client/src/main/ipc/custom.ts`
- `maestro/client/src/main/ipc/local.ts`
- `maestro/client/static/custom-commands-server/arqon-maestro-custom-commands-server.js`
- `maestro/client/static/custom-commands-server/serenade-custom-commands-server.min.js`
- `maestro/client/build.gradle`
- `maestro/speech-engine/build.gradle`
- `maestro/code-engine/build.gradle`
- `maestro/speech-engine/server/CMakeLists.txt`
- `maestro/code-engine/server/CMakeLists.txt`
- `maestro/speech-engine/bin/run-pro`
- `maestro/code-engine/bin/run-pro`
- `maestro/core/src/dist/bin/run-pro`
- [Phase 4 Evidence](phase-4-evidence.md)

### Breaking Changes Introduced

- The primary sidecar entrypoint is now `arqon-maestro-custom-commands-server.js`.
- Local packaged binaries are now emitted under Arqon Maestro process names instead of the inherited process names.

### Compatibility Shims Added

- Legacy `serenade-custom-commands-server.min.js` wrapper now forwards to the new sidecar entrypoint.
- Sidecar exposes both `global.arqon` and `global.serenade`.
- Sidecar loads and watches both `.arqon/scripts` and `.serenade/scripts`.
- Local shutdown logic kills both new and legacy process names.

### Compatibility Shims Removed

- None.

### Verification Performed

- `node --check maestro/client/static/custom-commands-server/arqon-maestro-custom-commands-server.js`
- `node --check maestro/client/static/custom-commands-server/serenade-custom-commands-server.min.js`
- `npm run build:main` from `maestro/client`
- `./gradlew :speech-engine:clean :code-engine:clean :core:clean :client:installServer -x downloadModels`
- `bash -lc 'cd .../maestro && ARQON_MAESTRO_SOURCE_ROOT=... ARQON_MAESTRO_LIBRARY_ROOT=/home/irbsurfer/libserenade ./gradlew :speech-engine:clean :code-engine:clean :core:clean :client:installServer -x downloadModels'`
- `./gradlew :core:clean :core:distTar :client:clean :client:installCore -x downloadModels`
- `find maestro/client/static/local -maxdepth 4 \( -name 'arqon-maestro-*' -o -name 'serenade-*' -o -name 'run-pro' \) | sort`
- `find maestro/client/out/static/custom-commands-server -maxdepth 1 -type f | sort`

### Residual Risks

- Native engine packaging still depends on external library and protobuf toolchain alignment under `/home/irbsurfer/libserenade`.
- `serenade-driver` remains an inherited dependency and is deferred to the later namespace/dependency phase.
- The unminified legacy sidecar file still exists in the static directory for compatibility and provenance.

### Rollback Point

- `33ca516` `Rename engine subtree to maestro`

### Entry Criteria For Next Phase

- Phase 4 evidence pack is published.
- Tracker, decision log, and gotcha registry reflect the new runtime identity baseline.
- Phase 5 starts from the assumption that Arqon process names are canonical while legacy process-name fallbacks remain active.
