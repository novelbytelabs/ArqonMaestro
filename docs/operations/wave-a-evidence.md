# Wave A Evidence Pack

## Purpose

This evidence pack records the checks used to hard-close `Wave A: Build Hygiene`.

## Goal Under Test

Wave A was meant to remove active build-warning noise from the engineering paths we use day to day so later runtime failures can be diagnosed against a cleaner baseline.

## Baseline

Before Wave A:

- the Electron main build emitted Webpack warnings for optional `ws` native modules
- the vendored tree-sitter Python build helper emitted a `distutils` deprecation warning
- the Gradle verification path emitted deprecation warnings from older application, protobuf, and test configuration patterns
- repo metadata did not yet track the current top-level tree-sitter submodule layout

## Post-Change Verification

### Check 1: Electron Main Build

- **Command**: `cd maestro/client && npm run build:main -- --stats-error-details`
- **Result**: passed
- **Observed outcome**: compiled successfully with no Webpack warnings
- **Interpretation**: the active Electron main build no longer emits optional `ws` warning noise

### Check 2: Tree-Sitter Python Build Helper

- **Command**: `python3 -W default maestro/tree-sitter/java-tree-sitter/build.py -h`
- **Result**: passed
- **Observed outcome**: no Python `distutils` deprecation warning emitted
- **Interpretation**: the active vendored tree-sitter helper path is clean on the current Python environment

### Check 3: Gradle Warning Sweep

- **Command**: `cd maestro && ./gradlew :java-tree-sitter:test :core:buildTreeSitter :core:compileJava :corpusgen:compileJava -x downloadModels --warning-mode all`
- **Result**: passed
- **Observed outcome**: build completed without Gradle deprecation warnings on the active verification path
- **Interpretation**: the application, protobuf, and test-suite configuration updates removed the current Gradle warning noise from the primary Java path

### Check 4: Repository Consistency

- **Command**: `git submodule status`
- **Result**: inspected successfully
- **Observed outcome**: the repo still contains active tree-sitter gitlinks outside the vendored `java-tree-sitter` project
- **Interpretation**: the root `.gitmodules` file is required repository metadata and should be tracked, not discarded as local fallout

## Evidence Summary

Wave A succeeded on the baseline it was supposed to control:

- Electron main build warning noise removed
- active tree-sitter Python helper warning removed
- active Gradle verification path warning noise removed
- repo metadata aligned with the remaining tree-sitter submodule topology

## Conclusion

Wave A can be hard-closed. `Wave B: Local Runtime Completeness` is now the next meaningful modernization target.
