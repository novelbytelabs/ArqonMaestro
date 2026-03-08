# Wave A Closeout

## Wave Closeout

- **Wave**: `Wave A`
- **Status**: `completed`
- **Date**: `2026-03-08`
- **Owner**: `Codex`
- **Objective**: Remove active build-warning noise and establish a cleaner engineering baseline before local runtime recovery work.

### Scope Completed

- Removed the active Webpack warnings from optional `ws` native module resolution.
- Updated the active Gradle application and test configuration to non-deprecated patterns on the verification path.
- Updated the vendored tree-sitter Python helper to avoid the current `distutils` deprecation warning.
- Tracked the repo-root `.gitmodules` file because the repo still contains active tree-sitter gitlinks.
- Published Wave A evidence and updated the modernization plan to make `Wave B` the next active wave.

### Files Changed

- `maestro/client/main.webpack.ts`
- `maestro/core/build.gradle`
- `maestro/corpusgen/build.gradle`
- `maestro/grammarflattener/build.gradle`
- `maestro/offline/build.gradle`
- `maestro/replayer/build.gradle`
- `maestro/toolbelt/build.gradle`
- `maestro/tree-sitter/java-tree-sitter/build.gradle`
- `maestro/tree-sitter/java-tree-sitter/build.py`
- `.gitmodules`
- [Wave A Evidence](wave-a-evidence.md)
- [Modernization Matrix](../modernization-matrix.md)

### Breaking Changes Introduced

- None intended at the product/runtime interface.

### Compatibility Shims Added

- None.

### Compatibility Shims Removed

- None.

### Verification Performed

- `cd maestro/client && npm run build:main -- --stats-error-details`
- `python3 -W default maestro/tree-sitter/java-tree-sitter/build.py -h`
- `cd maestro && ./gradlew :java-tree-sitter:test :core:buildTreeSitter :core:compileJava :corpusgen:compileJava -x downloadModels --warning-mode all`

### Residual Risks

- The warning cleanup covers the active build and verification path, not every historical task in the repo.
- Local multi-service runtime remains incomplete and is still the highest-value operational gap.
- Packaging and distribution paths remain legacy and are intentionally deferred behind runtime completeness.

### Rollback Point

- `84077a8` `Add follow-on modernization planning`

### Entry Criteria For Next Wave

- Wave A evidence pack is published.
- Modernization matrix marks Wave A complete and Wave B as the next wave.
- Wave B starts from the assumption that build output is clean enough to interpret runtime failures directly.
