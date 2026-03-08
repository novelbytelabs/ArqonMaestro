# Phase Closeout Template

Use this template every time a rebrand phase reaches a stopping point.

This is the hard-close pack format. A phase is not truly complete until this record exists.

> Video placeholder: how to close a phase cleanly.

## Purpose

The closeout pack prevents the same failure pattern from repeating:

- work gets done
- context stays in chat
- nobody knows the exact boundary of what changed
- the next phase starts on a fuzzy base

This template fixes that by forcing an explicit handoff between phases.

## Required Sections

### Phase Closeout

- **Phase**: `Phase X`
- **Status**: `completed` | `blocked` | `rolled_back`
- **Date**: `YYYY-MM-DD`
- **Owner**: who completed the phase
- **Objective**: what the phase was supposed to achieve

### Scope Completed

List exactly what was finished.

Examples:

- user-facing docs scrubbed
- onboarding copy updated
- config path fallback introduced
- repo subtree renamed

### Files Changed

List the key files and directories touched.

Prefer grouped references rather than dumping every file if the patch is large.

### Breaking Changes Introduced

List any intentional breaking changes.

Examples:

- canonical config file renamed
- launch path changed
- old script name removed

### Compatibility Shims Added

List temporary compatibility mechanisms introduced in the phase.

Examples:

- old config path fallback
- old env var fallback
- old sidecar filename alias

### Compatibility Shims Removed

List any compatibility support intentionally removed.

Examples:

- removed `.serenade` read fallback
- removed `SERENADE_SOURCE_ROOT` support

### Verification Performed

Record exactly what was checked.

Examples:

- `mkdocs build`
- Electron app launch
- microphone meter test
- one voice command executed
- custom command reload tested
- VS Code plugin handshake verified

### Residual Risks

List what still looks fragile after the phase.

Examples:

- namespace migration still pending
- sidecar process tracking still string-based
- docs updated but screenshots stale

### Rollback Point

Record the precise fallback point.

Examples:

- commit hash
- tag
- branch
- known-good artifact set

### Entry Criteria For Next Phase

State what must be true before the next phase can start.

Examples:

- published docs updated
- closeout committed
- voice pipeline revalidated
- compatibility shim behavior confirmed

## Copy/Paste Template

```markdown
## Phase Closeout

- **Phase**: `Phase X`
- **Status**: `completed`
- **Date**: `YYYY-MM-DD`
- **Owner**: `<name>`
- **Objective**: <what this phase was meant to achieve>

### Scope Completed

- <item>
- <item>

### Files Changed

- <file or directory>
- <file or directory>

### Breaking Changes Introduced

- <item>

### Compatibility Shims Added

- <item>

### Compatibility Shims Removed

- <item>

### Verification Performed

- <command or behavior verified>
- <command or behavior verified>

### Residual Risks

- <item>

### Rollback Point

- <commit / tag / artifact>

### Entry Criteria For Next Phase

- <item>
- <item>
```

## Rule

Do not mark a phase `completed` in the rebrand tracker until this template has been filled out for that phase.
