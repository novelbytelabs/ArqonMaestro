# Legacy Internal Rename TODO

This document tracks the internal `serenade` identifiers that were intentionally left in place during the first branding pass.

Current state:
- User-facing branding is now `ArqonMaestro`.
- Some internal names still use `serenade` because they are coupled to runtime behavior, packaging, native binaries, plugin protocols, or external dependencies.

This is a TODO list, not a blind search-and-replace plan.

## Goal

Move internal identifiers from `serenade` to `arqon` only when each rename is:
- technically isolated,
- validated end-to-end,
- and does not break existing configs, build scripts, local services, or plugin interoperability.

## Why These Names Were Not Renamed Yet

The remaining `serenade` identifiers are not just copy. They affect:
- binary names and `pkill` patterns,
- config and migration paths,
- protocol handlers,
- native dependency names,
- plugin/app handshake behavior,
- packaging layout,
- and external artifact resolution.

Changing those without a staged migration would create new breakage while we are still stabilizing the runtime.

## Legacy Areas To Rename Later

### 1. Native / npm dependency names

Examples:
- `serenade-driver`

Risk:
- Renaming requires either a replacement package or an internal fork with compatible exports.

TODO:
- Decide whether to keep the package name and wrap it, or publish/fork an `arqon-driver`.
- If replaced, verify all imports, native build steps, and packaging rules.

### 2. Local engine binary and process names

Examples:
- `serenade-core`
- `serenade-speech-engine`
- `serenade-code-engine`
- `serenade-custom-commands-server`

Risk:
- Current startup/shutdown logic uses exact process names and `pkill` matching.
- Gradle packaging and `installDist` outputs likely still assume these names.

TODO:
- Inventory all references in Gradle, Electron startup, and docs.
- Rename one service at a time.
- Replace `pkill` string matching with a more robust launcher/process registry where possible.

### 3. Filesystem compatibility layer

Examples:
- legacy `.serenade`
- legacy `serenade.json`

Current strategy:
- Prefer `.arqon/arqon.json` for new installs.
- Fall back to legacy `.serenade/serenade.json` when it already exists.

TODO:
- Add an explicit migration command or one-time migration flow.
- Decide whether to copy, move, or dual-read config/log/script data.
- Document rollback behavior.

### 4. Internal protocol / IPC identifiers

Examples:
- legacy custom-command server filenames
- plugin install panel IDs
- protocol aliases where compatibility still matters

Risk:
- Some identifiers are used across process boundaries and can fail silently if only one side is renamed.

TODO:
- Enumerate all cross-process string constants.
- Rename only with coordinated changes on both producer and consumer sides.

### 5. Cloud / endpoint naming

Examples:
- `stream-*.serenade.ai`

Current strategy:
- Keep existing cloud endpoints until an Arqon-owned endpoint exists.

TODO:
- Introduce Arqon endpoint config only when DNS, TLS, status route, and streaming compatibility are ready.
- Keep legacy endpoint support during migration.

### 6. Build and packaging names

Examples:
- Gradle archive names
- copied static bundle names
- release artifact names

Risk:
- These names are often wired into `copy`, `installDist`, and runtime lookup paths.

TODO:
- Trace each artifact from build output to runtime consumption.
- Rename only after confirming the consuming code no longer expects legacy filenames.

## Recommended Migration Strategy

### Phase 1: Stabilize runtime

TODO:
- Finish loading/server/microphone/local-mode troubleshooting first.
- Avoid internal renames that obscure runtime debugging.

### Phase 2: Build an internal-name inventory

TODO:
- Run targeted searches for:
  - `serenade-`
  - `"serenade"`
  - `.serenade`
  - `serenade.json`
  - `serenade.ai`
- Group findings by:
  - user-facing,
  - config compatibility,
  - process naming,
  - packaging,
  - dependency identity,
  - cloud/external integration.

### Phase 3: Rename by subsystem

Recommended order:
1. Config and logs
2. Pure TypeScript constants
3. Packaging/output filenames
4. Local engine process names
5. Plugin protocol / IPC names
6. External dependency identities

TODO:
- Do not mix multiple subsystems in one patch.
- Each subsystem rename should have its own verification checklist.

### Phase 4: Add compatibility shims

TODO:
- Maintain temporary support for:
  - old config paths,
  - old process names if needed,
  - old protocol aliases if existing clients depend on them.
- Remove shims only after migration is proven.

## Verification Checklist For Any Internal Rename

Before merging any subsystem rename, verify:
- Electron app starts cleanly.
- Main window loads.
- Listen mode toggles correctly.
- Active-app detection still works.
- Custom commands still start or fail cleanly.
- Local backend startup detection still works.
- Settings read/write still work.
- Legacy installs still launch without manual repair.
- Packaging/build outputs are still found at runtime.

## Immediate Follow-Up TODO

- Keep this file updated as each legacy area is migrated.
- Link each completed rename to the exact PR/commit/files changed.
- Do not remove legacy identifiers opportunistically during unrelated debugging work.
