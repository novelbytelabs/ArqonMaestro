# Phase 7 Evidence Pack

## Purpose

This evidence pack records the checks used to validate the Phase 7 namespace and dependency migration.

## Scope Under Test

Phase 7 targeted the deepest remaining internal identity surfaces:

- Gradle root identity
- local `java-tree-sitter` project wiring
- vendoring `java-tree-sitter` into the parent repo so the new namespace commit is publishable
- `buildSrc` package namespace
- `ai.serenade.treesitter` Java imports
- JNI/header/native glue names for tree-sitter
- active build-script references that still depended on `scripts/serenade`
- direct sidecar imports of `serenade-driver`

Phase 7 did not target:

- `stream-*.serenade.ai`
- `serenadecdn.com`
- `serenadeai/...` repository ownership in external infrastructure config
- legacy website/blog/provenance content outside the live build/runtime path

## Pre-Change Baseline

### Check 1: Client Main Build

- **Command**: `cd maestro/client && npm run build:main`
- **Result**: passed.
- **Observed warnings**: optional `ws` native addon warnings for `bufferutil` and `utf-8-validate`.
- **What it proved**: the Electron main build was stable before Phase 7 edits.

### Check 2: Core Compile Baseline

- **Command**: `cd maestro && ./gradlew :core:compileJava -x downloadModels`
- **Result**: failed before Phase 7.
- **Observed failure**: `ModuleNotFoundError: No module named 'serenade'` from `core/bin/build-tree-sitter.py`.
- **What it proved**: the inherited tree-sitter build path still depended on the old Python namespace and was a real Phase 7 blocker.

## Post-Change Verification

### Check 3: Client Main Build After Namespace Migration

- **Command**: `cd maestro/client && npm run build:main`
- **Result**: passed.
- **Observed warnings**: the same optional `ws` native addon warnings for `bufferutil` and `utf-8-validate`.
- **What it proves**: the sidecar wrapper and namespace changes did not break the Electron main build.

### Check 4: Local Tree-Sitter Project Tests

- **Command**: `cd maestro && ./gradlew :java-tree-sitter:test`
- **Result**: passed.
- **Observed tests**:
  - `NodeTest > testGetChildren()`
  - `ParserTest > testParse()`
  - `TreeCursorTest > testWalk()`
- **What it proves**: the renamed Java package, JNI headers, and native glue still work as a coherent local dependency.

### Check 5: Core Tree-Sitter Build And Java Compile

- **Command**: `cd maestro && ./gradlew :core:buildTreeSitter :core:compileJava :corpusgen:compileJava -x downloadModels`
- **Result**: passed.
- **Observed notes**: existing ANTLR warning about a greedy block in `CommandParser.g4`.
- **What it proves**:
  - `core/bin/build-tree-sitter.py` now resolves the Arqon Python namespace correctly
  - `core` compiles against the local `:java-tree-sitter` project
  - `corpusgen` now follows the renamed internal script paths

### Check 6: Docs Build

- **Command**: `mkdocs build`
- **Result**: passed.
- **What it proves**: the Phase 7 tracking, evidence, and closeout docs publish cleanly.

### Check 7: Targeted Residual Scan

- **Command**: `rg -n "ai\\.serenade|serenade-driver|rootProject.name\\s*=\\s*\\\"serenade\\\"|scripts/serenade|import serenade\\.config|Java_ai_serenade_treesitter|ai_serenade_treesitter" maestro/{buildSrc,core,corpusgen,tree-sitter,client/src,client/static/custom-commands-server,replayer,config/Dockerfile,settings.gradle,README.md} -g '!**/node_modules/**'`
- **Result**: only upstream `serenade-driver` package-manifest references and the local wrapper remained.
- **What it proves**: the live code/build surface no longer depends on inherited Java/JNI namespace names.

## Evidence Summary

Phase 7 succeeded on the parts it was supposed to control:

- `rootProject.name` migrated to `arqon-maestro`
- `core` now depends on the local `:java-tree-sitter` project
- `maestro/tree-sitter/java-tree-sitter` is now vendored into the parent repo instead of remaining a gitlink to a local-only commit
- tree-sitter Java package moved from `ai.serenade.treesitter` to `ai.arqon.maestro.treesitter`
- JNI headers and native glue were renamed consistently
- `buildSrc` package migrated to `ai.arqon.maestro`
- active script-path references moved off `scripts/serenade`
- direct sidecar imports of `serenade-driver` were removed in favor of an Arqon-named wrapper

## Residual Boundary

The following inherited names still exist, but they are outside the completed Phase 7 scope:

- upstream npm artifact names in `package.json` / `package-lock.json`
- external `serenadeai/...` repository ownership in `config/languages.yaml`
- inherited Docker image names and CDN/endpoint names
- legacy website/blog/provenance content

## Conclusion

Phase 7 can be hard-closed because the internal namespace and dependency identity migration is complete on the live build/runtime path, and the remaining inherited names are now explicitly external or historical rather than internal technical identity leaks.
