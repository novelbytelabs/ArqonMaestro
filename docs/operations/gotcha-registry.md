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
