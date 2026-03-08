# Arqon Maestro Full Rebrand Strategy

This document replaces the earlier lightweight TODO with a full migration strategy for removing inherited `serenade` branding and identity from the Arqon Maestro codebase.

This is not a cosmetic copy pass. It includes:

- user-facing branding cleanup
- repository and path renames
- config and filesystem migration
- process and binary rename strategy
- plugin/protocol coordination
- custom-command runtime migration
- build and packaging impact
- external dependency constraints
- rollback and verification requirements

The assumption for this plan is explicit:

- breaking changes are allowed
- the goal is to come out the other side with a coherent Arqon Maestro identity
- safety still matters because many of the remaining names are coupled to runtime behavior

## Phase Status

| Phase | Name | Status | Notes |
|---|---|---|---|
| 0 | Freeze Scope | `planned` | baseline capture and rename discipline |
| 1 | User-Facing Cleanup | `planned` | docs, UI strings, onboarding, tutorials |
| 2 | Arqon-First Compatibility Layer | `planned` | canonical Arqon config and env with legacy fallback |
| 3 | Repo Subtree Rename | `planned` | `serenade/` to `maestro/` |
| 4 | Sidecar and Runtime Process Identity | `planned` | process and sidecar filename migration |
| 5 | Config Storage and Logs Migration | `planned` | `.arqon` becomes the real home |
| 6 | Safe Internal Slug Rename | `planned` | remaining low/medium-risk internal identifiers |
| 7 | Namespace and Dependency Migration | `planned` | `ai.serenade.*`, native deps, artifacts |

## Target Naming Policy

Use these names consistently:

| Context | Target Name |
|---|---|
| Visible product name | `Arqon Maestro` |
| Repo / directory slug | `maestro` or `arqon-maestro` depending on context |
| Package / artifact slug | `arqon-maestro` |
| Short internal app identifier | `arqon` |
| Config directory | `.arqon` |
| Config file | `arqon.json` |

Keep inherited `serenade` identifiers only where one of these is true:

- they are required for backwards compatibility during migration
- they are part of third-party or upstream provenance
- they are embedded in native package namespaces that require a coordinated migration
- they point to still-live external infrastructure that Arqon does not yet own

## Current Reality

The remaining `serenade` footprint is not small.

Observed concentration:

- largest concentration is under the inherited [serenade](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade) subtree
- root docs and scripts still contain many operational references
- config/runtime code still uses `.serenade`, `serenade.json`, `SERENADE_SOURCE_ROOT`, and `SERENADE_LIBRARY_ROOT`
- the custom command sidecar still uses:
  - `serenade-driver`
  - `serenade-custom-commands-server`
  - `global.serenade`
  - `~/.serenade/scripts`
- Java / JNI / tree-sitter code still uses `ai.serenade.*`
- cloud and CDN endpoints still use `serenade.ai` / `serenadecdn.com`

This means the rebrand must be executed by subsystem, not by search-and-replace.

## Scope Buckets

### Bucket A: Safe User-Facing Branding

These are safe to rename first and should not stay inherited:

- root docs and runbooks
- in-app copy
- onboarding copy
- tutorial copy
- website copy under the legacy web subtree if it is still retained
- screenshots, alt text, labels, and menu titles

Examples:

- [RUN_COMMANDS.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/RUN_COMMANDS.md)
- [TRAINING.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/TRAINING.md)
- [TROUBLESHOOTING.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/TROUBLESHOOTING.md)
- [BUILD_TROUBLESHOOTING.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/BUILD_TROUBLESHOOTING.md)
- [CURRENT_ISSUES.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/CURRENT_ISSUES.md)
- [MICROPHONE_TROUBLESHOOTING.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/MICROPHONE_TROUBLESHOOTING.md)
- [ARCHITECTURE.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/ARCHITECTURE.md)

### Bucket B: Path, Config, and Environment Compatibility

These are rebrand-critical but operationally risky:

- `.serenade` to `.arqon`
- `serenade.json` to `arqon.json`
- `SERENADE_SOURCE_ROOT` to `ARQON_MAESTRO_SOURCE_ROOT`
- `SERENADE_LIBRARY_ROOT` to `ARQON_MAESTRO_LIBRARY_ROOT`
- directory rename from `serenade/` to `maestro/`

Examples:

- [serenade/client/src/main/settings.ts](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/client/src/main/settings.ts)
- [vscode-plugin/src/settings.ts](/home/irbsurfer/Projects/arqon/ArqonMaestro/vscode-plugin/src/settings.ts)
- [build.sh](/home/irbsurfer/Projects/arqon/ArqonMaestro/build.sh)
- [setup_maestro.sh](/home/irbsurfer/Projects/arqon/ArqonMaestro/setup_maestro.sh)
- [serenade/code-engine/server/CMakeLists.txt](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/code-engine/server/CMakeLists.txt)
- [serenade/speech-engine/server/CMakeLists.txt](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/speech-engine/server/CMakeLists.txt)

### Bucket C: Process and Binary Identity

These can silently break startup and teardown:

- `serenade-custom-commands-server`
- any `pkill` or string-based process matching
- service installDist outputs
- artifact names expected by Electron or Gradle

Examples:

- [serenade/client/src/main/ipc/custom.ts](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/client/src/main/ipc/custom.ts)
- [serenade/client/static/custom-commands-server/serenade-custom-commands-server.js](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/client/static/custom-commands-server/serenade-custom-commands-server.js)

### Bucket D: Dependency and Namespace Identity

These are the highest-risk technical renames:

- `serenade-driver`
- `ai.serenade.*`
- `rootProject.name = "serenade"`
- published artifact names
- JNI headers and generated bindings

Examples:

- [serenade/client/package.json](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/client/package.json)
- [serenade/settings.gradle](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/settings.gradle)
- [serenade/tree-sitter/java-tree-sitter/build.gradle](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/tree-sitter/java-tree-sitter/build.gradle)
- [serenade/core/src/main/java/core/parser/Parser.java](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/core/src/main/java/core/parser/Parser.java)

### Bucket E: External Infrastructure

These must remain until Arqon-owned replacements exist:

- `stream-*.serenade.ai`
- `serenadecdn.com`
- marketplace links and upstream plugin references that have not been replaced

Examples:

- [serenade/client/src/main/settings.ts](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/client/src/main/settings.ts)
- [serenade/client/src/main/api.ts](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/client/src/main/api.ts)
- [download_models.sh](/home/irbsurfer/Projects/arqon/ArqonMaestro/download_models.sh)

### Bucket F: Provenance and Legal History

Do not rewrite these as product branding:

- upstream license text
- inherited README / CONTRIBUTING / CODE_OF_CONDUCT if retained for provenance
- third-party source comments unless legally/technically appropriate

Examples:

- [serenade/LICENSE](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/LICENSE)
- [serenade/README.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/README.md)
- [serenade/CONTRIBUTING.md](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade/CONTRIBUTING.md)

## End-State Goal

The intended end state is:

1. no inherited product branding in user-visible surfaces
2. repo layout no longer centered on a `serenade/` root directory
3. config and logs use `.arqon` / `arqon.json`
4. runtime accepts legacy paths temporarily, but only as migration shims
5. internal process names and sidecar files are renamed to Arqon equivalents
6. package and namespace migrations are completed or clearly isolated behind compatibility wrappers
7. docs and scripts describe only Arqon Maestro paths and names

## Recommended Execution Order

### Phase 0: Freeze the Scope

Before editing:

- stop mixing unrelated fixes into the rename work
- do not perform opportunistic runtime refactors during rename patches
- snapshot the current boot path and voice pipeline behavior

Artifacts to preserve before migration:

- a working launch command
- a known-good config file
- a known-good log sample
- one known-good voice command path
- one known-good custom-command startup path

### Phase 1: Finish User-Facing Cleanup

Goal:

- remove inherited branding from all user-visible docs and strings

Includes:

- root docs
- scripts help text
- troubleshooting docs
- training docs
- web copy if retained
- offline tutorials

This phase is low risk and should be completed first.

### Phase 2: Introduce New Canonical Names Without Removing Legacy Support

Goal:

- make Arqon names primary everywhere, while legacy names still work

Do this for:

- config paths
- config file names
- env vars
- launcher scripts
- sidecar docs

Concrete strategy:

- read `.arqon/arqon.json` first
- fall back to `.serenade/serenade.json`
- read `ARQON_MAESTRO_SOURCE_ROOT` first
- fall back to `SERENADE_SOURCE_ROOT`
- read `ARQON_MAESTRO_LIBRARY_ROOT` first
- fall back to `SERENADE_LIBRARY_ROOT`

Do not remove legacy support during this phase.

### Phase 3: Rename the Repository Subtree

Goal:

- rename [serenade](/home/irbsurfer/Projects/arqon/ArqonMaestro/serenade) to `maestro`

This is a path migration, not a namespace migration.

Before doing it:

- inventory all references to `ArqonMaestro/serenade`
- update scripts, docs, and build roots
- update any hardcoded CMake/Gradle path assumptions

Gotcha:

- this will touch many operational docs and commands even if runtime code does not care

### Phase 4: Rename Sidecar and Runtime Process Identity

Goal:

- stop shipping and launching files/processes named `serenade-*`

Targets:

- `serenade-custom-commands-server.min.js`
- `pkill -f serenade-custom-commands-server`
- sidecar package metadata

Safety rule:

- replace fragile `pkill` string matching with explicit process tracking before or during this phase

Gotcha:

- if producer and consumer disagree on filenames or process names, custom commands will fail silently

### Phase 5: Rename Config Storage and Logs for Real

Goal:

- move live installs to `.arqon`

Migration strategy:

- first-run migration copies legacy config into `.arqon`
- preserve legacy directory until success is confirmed
- write new logs only to `.arqon`
- optionally keep read-only fallback to old locations for one migration cycle

Never do this:

- do not delete `~/.serenade` automatically during first migration

### Phase 6: Rename Internal Slugs and App Identifiers

Goal:

- replace remaining safe internal identifiers with `arqon` / `arqon-maestro`

Examples:

- protocol client name
- app active-name checks
- stub names
- package display names
- output artifact names where the runtime is no longer coupled

### Phase 7: Namespace and Dependency Migration

Goal:

- migrate high-risk technical identity only after everything else is stable

Includes:

- `serenade-driver`
- `ai.serenade.*`
- Gradle root and artifact names
- tree-sitter Java namespace and JNI headers

This is the most dangerous phase.

It should be split again into:

1. wrapper phase
2. namespace migration phase
3. artifact publication phase

## Breaking Changes We Intend To Accept

The following breaking changes are acceptable as part of the final rebrand:

- repo path changes from `serenade/` to `maestro/`
- canonical env vars change to Arqon names
- canonical config path changes to `.arqon/arqon.json`
- new package and artifact slugs use `arqon-maestro`
- operational docs stop instructing users to use inherited names

The following breaking changes should be avoided until explicitly planned:

- removing all legacy config fallback immediately
- changing cloud endpoints before Arqon-owned equivalents exist
- renaming native dependency identifiers without wrappers
- changing Java/JNI namespaces without a coordinated rebuild and verification pass

## Gotchas

### 1. Path Rename Is Not the Same as Identity Rename

Renaming the folder from `serenade/` to `maestro/` does not automatically solve:

- package names
- process names
- config names
- runtime identifiers
- JNI namespaces

Treat these as separate migrations.

### 2. Config Breakage Will Look Like Random Startup Failures

If `.serenade` fallback is removed too early, the user symptoms will be:

- not logged in
- wrong endpoint
- no local config
- missing scripts
- custom commands not loading

### 3. Process-Name Breakage Will Look Like “Nothing Happens”

If the sidecar rename is incomplete, likely symptoms are:

- custom commands do not reload
- no keepalive response
- stale processes remain running
- shutdown scripts miss the real process

### 4. Namespace Renames Cascade

`ai.serenade.*` is not just branding. It is tied to:

- Java packages
- imports
- generated headers
- native build targets
- published artifact coordinates

This must be treated like a library migration, not a text edit.

### 5. External Endpoint Renames Are Not In Your Control Yet

Do not rename:

- `stream-*.serenade.ai`
- `serenadecdn.com`

until Arqon-owned replacements exist and are validated.

### 6. Historical Docs and Licenses Are Not Product Copy

Do not rewrite upstream provenance files as if they are normal product surfaces.

## Safety Strategy

### A. Work Subsystem by Subsystem

Never combine these in one patch:

- config migration
- repo path rename
- sidecar rename
- namespace migration

### B. Keep Dual-Read Shims During Transition

For at least one migration cycle:

- read both old and new config paths
- accept both old and new env vars
- tolerate old process names where necessary

### C. Record a Known-Good Baseline Before Each Phase

Before starting a phase, capture:

- launch command
- expected config file path
- expected log path
- expected sidecar filename
- expected endpoint
- one working voice command

### D. Verify Incrementally

After each phase, verify:

- app launches
- main window loads
- mic meter moves
- listen mode works
- one command executes
- revision box works
- text input works
- custom command sidecar starts or fails cleanly
- plugin connection still succeeds

### E. Preserve Rollback Until Validation Completes

Do not delete:

- legacy config dir
- legacy scripts dir
- old path aliases

until the new path has been exercised successfully.

## Concrete Verification Checklist

### Desktop App

- Electron app starts cleanly
- main window loads
- settings window opens
- onboarding/tutorial pages still open

### Audio and Voice

- microphone meter moves
- listening toggles on/off
- one spoken command executes
- alternatives list appears and can select `two`

### Bridge Surfaces

- revision box opens and can `copy` / `send`
- text input popup submits correctly

### Plugin / Protocol

- VS Code plugin connects
- active editor state is received
- one structured edit applies
- callback/completed flow still works

### Custom Commands

- sidecar process starts
- scripts reload on change
- one simple automation works
- logs are written to the expected location

### Local/Build Paths

- Gradle build still resolves source root and library root
- CMake still finds dependency roots
- local packaging still copies expected runtime assets

## Rollback Strategy

For any phase that fails:

1. restore the previous names for that subsystem only
2. keep successful prior phases intact
3. do not continue to later phases until the broken phase is stable

Rollback should be subsystem-local, not a full-project revert.

## Phase Closeout Template

Every phase must end with a hard-close pack using this structure.

### Phase Closeout

- **Phase**: `Phase X`
- **Status**: `completed` | `blocked` | `rolled back`
- **Objective**: what this phase was supposed to achieve
- **Scope completed**: exact work finished
- **Files changed**: key files or directories touched
- **Breaking changes introduced**: explicit list
- **Compatibility shims added**: explicit list
- **Compatibility shims removed**: explicit list
- **Verification performed**: commands run and behaviors verified
- **Residual risks**: what is still fragile
- **Rollback point**: exact commit / tag / known-good state
- **Entry criteria for next phase**: what must be true before proceeding

### Tracking Rule For Closeout

- update this strategy document
- update the published MkDocs tracker
- create a dedicated closeout artifact or summary note for the phase
- do not begin the next phase until the closeout exists

## Immediate Execution Plan

If the goal is to complete the full rebrand in one concerted push, the safest order is:

1. finish root docs/scripts cleanup
2. add Arqon-first env/config shims
3. rename repo subtree `serenade/` -> `maestro/`
4. fix all path references
5. rename sidecar/process filenames
6. migrate `.arqon/arqon.json` to primary storage
7. rename remaining safe internal identifiers
8. only then tackle package/namespace/dependency identity

## Definition Of Done

This migration is done when:

- user-facing docs and UI no longer use inherited product branding
- operational docs no longer instruct users to use inherited names
- repo layout no longer centers the `serenade/` subtree
- `.arqon/arqon.json` is canonical
- Arqon env vars are canonical
- sidecar and process names are Arqon-branded
- the desktop app, plugin, custom commands, and voice pipeline all still work
- any remaining `serenade` references are either:
  - compatibility shims,
  - upstream provenance,
  - or external infrastructure still awaiting Arqon replacement

## Tracking Rule

For every subsystem completed:

- update this file
- record exact files changed
- record whether compatibility shims remain
- record what can be safely removed next
