# Phase 7 Closeout

## Phase Closeout

- **Phase**: `Phase 7`
- **Status**: `completed`
- **Date**: `2026-03-08`
- **Owner**: `Codex`
- **Objective**: Complete the deep namespace and dependency migration on the live build/runtime graph without destabilizing the product.

### Scope Completed

- Renamed the Gradle root identity to `arqon-maestro`.
- Promoted `maestro/tree-sitter/java-tree-sitter` into the root build as the local `:java-tree-sitter` dependency.
- Vendored `maestro/tree-sitter/java-tree-sitter` into the parent repo so the new dependency state is pushable without relying on a local-only nested commit.
- Migrated `buildSrc` package identity from `ai.serenade` to `ai.arqon.maestro`.
- Migrated the tree-sitter Java package from `ai.serenade.treesitter` to `ai.arqon.maestro.treesitter`.
- Renamed the tree-sitter JNI headers and native glue files from `ai_serenade_treesitter_*` to `ai_arqon_maestro_treesitter_*`.
- Updated `core`, `corpusgen`, `replayer`, and the tree-sitter build path to follow the new namespace and script paths.
- Removed direct sidecar imports of `serenade-driver` by introducing an Arqon-named local wrapper.
- Published the Phase 7 evidence pack and updated the rebrand tracking docs.

### Files Changed

- `maestro/settings.gradle`
- `maestro/buildSrc/src/main/groovy/AntlrGenerateTask.groovy`
- `maestro/core/build.gradle`
- `maestro/core/bin/build-tree-sitter.py`
- `maestro/core/src/main/java/core/parser/Parser.java`
- `maestro/corpusgen/build.gradle`
- `maestro/corpusgen/src/main/java/corpusgen/mapping/CompositeWords.java`
- `maestro/replayer/src/main/java/replayer/Replayer.java`
- `maestro/config/Dockerfile`
- `maestro/tree-sitter/java-tree-sitter/`
- `maestro/client/static/custom-commands-server/arqon-maestro-custom-commands-server.js`
- `maestro/client/static/custom-commands-server/serenade-custom-commands-server.js`
- `maestro/client/static/custom-commands-server/arqon-maestro-driver.js`
- [Phase 7 Evidence](phase-7-evidence.md)

### Breaking Changes Introduced

- `rootProject.name` is now `arqon-maestro`.
- `core` now compiles against the local `:java-tree-sitter` project instead of the inherited external Maven coordinate.
- Java imports must now use `ai.arqon.maestro.treesitter`.
- JNI/header/native filenames and exported symbols now use the Arqon Maestro namespace.
- internal build/script references to `scripts/serenade` in the Phase 7 surface now require `scripts/arqon_maestro`.

### Compatibility Shims Added

- `maestro/client/static/custom-commands-server/arqon-maestro-driver.js` now wraps the upstream `serenade-driver` package so the code-facing import name is Arqon-native while the external artifact name remains unchanged.

### Compatibility Shims Removed

- None.

### Verification Performed

- `cd maestro/client && npm run build:main`
- `cd maestro && ./gradlew :java-tree-sitter:test`
- `cd maestro && ./gradlew :core:buildTreeSitter :core:compileJava :corpusgen:compileJava -x downloadModels`
- `mkdocs build`
- `rg -n "ai\\.serenade|serenade-driver|rootProject.name\\s*=\\s*\\\"serenade\\\"|scripts/serenade|import serenade\\.config|Java_ai_serenade_treesitter|ai_serenade_treesitter" maestro/{buildSrc,core,corpusgen,tree-sitter,client/src,client/static/custom-commands-server,replayer,config/Dockerfile,settings.gradle,README.md} -g '!**/node_modules/**'`

### Residual Risks

- upstream package manifests still contain the external artifact name `serenade-driver`
- external repository ownership in `config/languages.yaml` still points at `serenadeai/...`
- external Docker/image/CDN/endpoint names remain inherited infrastructure concerns
- legacy website/blog/provenance content under the retained inherited subtree still contains historical names

### Rollback Point

- `bb76a56` `Complete rebrand phase 6`

### Entry Criteria For Next Phase

- None for the original seven-phase rebrand program.
- Any future work should be opened as a follow-on program for:
  - external infrastructure ownership
  - upstream package publication ownership
  - historical/provenance content cleanup
