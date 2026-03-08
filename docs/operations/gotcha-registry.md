# Gotcha Registry

This registry captures traps, failure modes, and migration hazards discovered while working on Arqon Maestro.

Use this page for things that are too operational or failure-oriented for the decision log, but too important to leave in chat history.

> Video placeholder: how to use the gotcha registry during migrations.

## Maintenance Rule

Add an entry when a problem is:

- repeatable
- surprising
- likely to waste time again
- phase-relevant
- safety-relevant during migration

Do not put every bug here. This page is for patterns and traps, not generic defect tracking.

## Categories

### Configuration

Use for:

- path fallback surprises
- environment variable conflicts
- stale config migration issues
- old and new config sources disagreeing

### Runtime Startup

Use for:

- Electron startup traps
- loading hangs
- silent sidecar failure
- local backend detection traps

### Audio And Voice Pipeline

Use for:

- microphone capture surprises
- endpointing failures
- dictate-mode confusion
- chunk lifecycle traps

### Process And Sidecar Identity

Use for:

- `pkill` hazards
- renamed process mismatch
- stale background helpers
- filename/process-name coupling

### Build And Packaging

Use for:

- Gradle/CMake path assumptions
- copied artifact name mismatches
- installDist/runtime lookup breakage
- source-root and library-root coupling

### Protocol And Plugin Integration

Use for:

- plugin handshake mismatches
- callback/completed contract issues
- editor state retrieval traps
- cross-process string mismatches

### Namespace And Dependency Identity

Use for:

- package-name cascades
- JNI/header regeneration traps
- artifact coordinate mismatches
- wrapper vs hard-rename tradeoffs

### External Infrastructure

Use for:

- endpoint ownership issues
- CDN dependencies
- marketplace identity constraints
- DNS/TLS blockers

## Entries

### GOTCHA-001: Path Rename Is Not Identity Rename

- **Category**: Build And Packaging
- **Status**: active
- **Summary**: Renaming the repo subtree from `serenade/` to `maestro/` does not solve package names, process names, config names, JNI namespaces, or dependency identity.
- **Impact**: High
- **Where it matters**:
  - path migrations
  - build root variables
  - docs and scripts
- **Avoidance**:
  - treat path rename as its own phase
  - do not combine it with namespace or dependency migration

### GOTCHA-002: Config Breakage Presents As Random Runtime Failure

- **Category**: Configuration
- **Status**: active
- **Summary**: Removing `.serenade` fallback too early can show up as missing login state, wrong endpoint, missing scripts, or silent custom-command failure rather than a clean config error.
- **Impact**: High
- **Where it matters**:
  - settings migration
  - first-run behavior
  - support docs
- **Avoidance**:
  - make `.arqon/arqon.json` primary
  - preserve `.serenade/serenade.json` read fallback during transition

### GOTCHA-003: Process-Name Mismatch Fails Silently

- **Category**: Process And Sidecar Identity
- **Status**: active
- **Summary**: If the sidecar filename, process name, and shutdown logic disagree, custom commands can stop working without an obvious top-level error.
- **Impact**: High
- **Where it matters**:
  - custom command sidecar rename
  - `pkill` cleanup logic
  - startup/shutdown lifecycle
- **Avoidance**:
  - stop relying on loose string matching alone
  - rename producer and consumer together
  - verify keepalive and reload behavior after each process rename

### GOTCHA-004: Namespace Renames Cascade Across Java, JNI, and Artifacts

- **Category**: Namespace And Dependency Identity
- **Status**: active
- **Summary**: `ai.serenade.*` is not a branding string. It is embedded in Java packages, imports, generated headers, native glue, and artifact identity.
- **Impact**: High
- **Where it matters**:
  - tree-sitter Java binding
  - parser imports
  - Gradle artifact coordinates
- **Avoidance**:
  - do not treat namespace migration like a text-edit pass
  - stage wrappers first where possible
  - regenerate and verify native bindings in the same subsystem patch

### GOTCHA-005: External Endpoint Names Are Not Ready To Rebrand

- **Category**: External Infrastructure
- **Status**: active
- **Summary**: `stream-*.serenade.ai` and `serenadecdn.com` are still real dependencies. Renaming config or docs to Arqon-owned endpoints before the infrastructure exists will create false expectations and broken runtime behavior.
- **Impact**: Medium
- **Where it matters**:
  - endpoint config
  - model download scripts
  - support docs
- **Avoidance**:
  - keep inherited external endpoints until Arqon-owned replacements are live and validated

### GOTCHA-006: Preferred Path Helpers Are Not Enough

- **Category**: Configuration
- **Status**: mitigated
- **Summary**: A codebase can appear Arqon-first while still behaving legacy-first if reads and writes continue to prefer existing legacy files.
- **Impact**: High
- **Where it matters**:
  - settings migration
  - first-run behavior
  - VS Code integration
- **Avoidance**:
  - return canonical `.arqon` file paths from the settings layer
  - migrate legacy contents forward when needed
  - keep legacy files as read fallback, not as the preferred write target

### GOTCHA-007: Docs Can Undermine A Compatibility Layer

- **Category**: Build And Packaging
- **Status**: active
- **Summary**: Even when the code prefers Arqon names, stale runbooks that still tell users to export `SERENADE_*` or edit `~/.serenade/serenade.json` will drag the system back into legacy-first operation.
- **Impact**: Medium
- **Where it matters**:
  - root runbooks
  - troubleshooting guides
  - training and build docs
- **Avoidance**:
  - make Arqon names canonical in every user-facing command example
  - mention legacy names only as explicit compatibility notes

### GOTCHA-008: Top-Level Ignore Rules Must Move With The Subtree

- **Category**: Build And Packaging
- **Status**: mitigated
- **Summary**: Renaming the engine subtree without updating the root `.gitignore` will surface generated assets and model directories as unexpected changes, even when the rename itself is correct.
- **Impact**: Medium
- **Where it matters**:
  - subtree rename
  - generated model assets
  - local packaging output
- **Avoidance**:
  - update root ignore rules in the same patch as the subtree move
  - verify untracked model/runtime directories are ignored before closing the phase

### GOTCHA-009: Sidecar Rebrand Must Preserve User Script Surface

- **Category**: Process And Sidecar Identity
- **Status**: mitigated
- **Summary**: Renaming the sidecar entrypoint alone is not enough. Existing user automations can still depend on `global.serenade` and `~/.serenade/scripts`, so a strict cutover can break custom commands even when the process starts correctly.
- **Impact**: High
- **Where it matters**:
  - custom-command sidecar migration
  - user automation compatibility
  - startup and reload verification
- **Avoidance**:
  - expose `global.arqon` as canonical
  - preserve `global.serenade` as a compatibility alias during transition
  - load and watch both `.arqon/scripts` and `.serenade/scripts`

### GOTCHA-010: Native Packaging Failures Can Be Environmental, Not Rename Regressions

- **Category**: Build And Packaging
- **Status**: active
- **Summary**: After a runtime identity migration, native packaging failures may still come from unrelated external issues such as stale CMake state, missing Marian artifacts, or protobuf compiler/header drift. Those failures should not be misattributed to process-name changes.
- **Impact**: High
- **Where it matters**:
  - Phase 4 verification
  - native engine packaging
  - evidence review
- **Avoidance**:
  - clean native build directories before verification
  - rerun with explicit `ARQON_MAESTRO_SOURCE_ROOT` and `ARQON_MAESTRO_LIBRARY_ROOT`
  - prove at least one renamed packaged artifact path independently of the failing external toolchain

### GOTCHA-011: Shared `.arqon` Root Means Migration Must Be Per-Entry

- **Category**: Configuration
- **Status**: mitigated
- **Summary**: `~/.arqon` can already exist for other Arqon tools. That means migration cannot assume the root directory is empty or use root-directory existence as a signal that Maestro state has already been migrated.
- **Impact**: High
- **Where it matters**:
  - config storage migration
  - script migration
  - log migration
- **Avoidance**:
  - migrate file-by-file and directory-by-directory
  - treat each canonical target independently
  - only skip migration when the specific destination file or directory is already populated

### GOTCHA-012: Canonical Storage Without Script Migration Breaks User Expectations

- **Category**: Configuration
- **Status**: mitigated
- **Summary**: Moving the config files to `.arqon` is not enough. If `custom.js` remains only under `.serenade/scripts`, UI actions like “open custom commands” point at the canonical directory while the user’s real automation still lives elsewhere.

### GOTCHA-013: Legacy Publishing Plugins Become Build Breakers Once Promoted To Local Dependencies

- **Category**: Namespace And Dependency Identity
- **Status**: mitigated
- **Summary**: An inherited subproject can look harmless while it is consumed as an external artifact, then fail immediately once it is included in the root build because stale publishing plugins resolve dead repositories or abandoned transitive metadata.
- **Impact**: High
- **Where it matters**:
  - local dependency replacement
  - tree-sitter binding promotion into the root Gradle build
  - Phase 7 verification
- **Avoidance**:
  - strip publishing-only plugins from subprojects before making them first-class build dependencies
  - verify the promoted subproject independently before relying on it from `core`

### GOTCHA-015: Gitlinks Break Parent Pushes If The New Commit Is Only Local

- **Category**: Namespace And Dependency Identity
- **Status**: mitigated
- **Summary**: If a parent repo points at a nested git commit that exists only in your local clone, the parent push is structurally incomplete. Anyone else syncing the parent will receive a gitlink to an unreachable object.
- **Impact**: High
- **Where it matters**:
  - vendoring inherited dependencies
  - nested tree-sitter repos
  - hard-close publishing
- **Avoidance**:
  - do not leave Phase 7 as a parent gitlink update alone
  - vendor the dependency into the parent repo if you do not control the nested remote
  - preserve the nested `.git` directory separately as rollback evidence before internalizing it

### GOTCHA-014: Upstream Package Names Are Not The Same Problem As Internal Namespace Leaks

- **Category**: Namespace And Dependency Identity
- **Status**: active
- **Summary**: External package names such as `serenade-driver` can remain in lockfiles or manifests even after the internal code graph has been rebranded. Treating those two problems as identical pushes teams toward risky manifest surgery with little runtime value.
- **Impact**: Medium
- **Where it matters**:
  - npm dependency manifests
  - supply-chain audit review
  - Phase 7 closeout decisions
- **Avoidance**:
  - remove direct code-facing imports first
  - wrap inherited upstream packages behind Arqon-named local modules when publication ownership has not changed
  - document residual manifest names explicitly in the evidence pack
- **Impact**: High
- **Where it matters**:
  - custom-command editing
  - support workflows
  - storage migration
- **Avoidance**:
  - migrate `scripts/` into `.arqon` as part of the same storage phase
  - keep legacy script fallback only as a temporary transition aid

### GOTCHA-013: Internal Package Slugs Can Collide With Repo Names

- **Category**: Namespace And Dependency Identity
- **Status**: mitigated
- **Summary**: Renaming an internal Python package to `maestro` would collide conceptually with the repo subtree name and could create import ambiguity. The safer internal slug is `arqon_maestro`.
- **Impact**: Medium
- **Where it matters**:
  - Python training/tooling package migration
  - import path cleanup
  - documentation examples
- **Avoidance**:
  - use `arqon_maestro` for the internal Python package slug
  - reserve `maestro` for repo/directory identity rather than Python import identity

## Entry Template

```markdown
### GOTCHA-XXX: <Short Title>

- **Category**: Configuration | Runtime Startup | Audio And Voice Pipeline | Process And Sidecar Identity | Build And Packaging | Protocol And Plugin Integration | Namespace And Dependency Identity | External Infrastructure
- **Status**: active | mitigated | resolved
- **Summary**: <What goes wrong>
- **Impact**: Low | Medium | High
- **Where it matters**: <Affected phases/subsystems>
- **Avoidance**: <How to avoid repeating it>
```
