# Wave B Compatibility Matrix

> Purpose: convert `Wave B: Local Runtime Completeness` from exploratory native bring-up into a constrained compatibility program.

## Goal

Make local mode work without destabilizing the wider Arqon ecosystem.

## Gate Policy

Wave B may proceed only when these gates are satisfied:

1. `Gate 1`: frozen requirements registry exists and reflects the active policy
2. `Gate 2`: every Wave B dependency is classified below
3. `Gate 3`: no shared-env mutation is required
4. `Gate 4`: missing pieces have a safe isolated build or reuse path
5. `Gate 5`: package and runtime verification run against that constrained plan

If any gate fails, Wave B is paused, not forced through.

## Matrix

| Dependency / Surface | Maestro Requirement | Current Observed State | Classification | Safe Strategy | Status |
|---|---|---|---|---|---|
| Boost | `1.78.x` visible to CMake | additive isolated install exists under `/home/irbsurfer/libserenade/boost` | `additive-only` | acceptable as private native artifact; better long-term home is a Maestro-specific native root | `available, boundary still needs cleanup` |
| Protobuf toolchain | `4.25.8` | `protoc` 25.8 in `~/.local/bin/protoc`; headers and shared libs in `helios-gpu-118` | `frozen` | consume by explicit root/tool path; do not build a new canonical protobuf lane | `available` |
| Crow headers | compatible headers | additive copy under `/home/irbsurfer/libserenade/crow` | `additive-only` | keep as private header-only dependency | `available` |
| SentencePiece | native library and headers | private artifact path is now present for Wave B packaging | `additive-only` | keep private; do not inject into frozen shared lanes | `available` |
| Marian | static library and headers | present in private native root and linkable by build | `additive-only` | keep private; validate runtime ABI compatibility before hard-close | `available with runtime caveat` |
| Kaldi | source tree and static libs | private build now available and consumed by speech-engine packaging | `additive-only` | keep private; do not mutate frozen shared lanes | `available` |
| `helios-gpu-118` shared packages | shared ecosystem state | present and active | `semi-frozen` | reference existing protobuf artifacts only; do not mutate package set | `must preserve` |
| Local package output | `maestro/client/static/local` | bundles now contain real `core`, `speech-engine`, and `code-engine` binaries | `private-to-maestro` | package only from verified isolated/native inputs | `complete` |
| Local UI state | leave `Starting Server...` when backend is healthy | explicit failure path now implemented | `private-to-maestro` | keep explicit failure, then verify healthy-path transition after packaging succeeds | `partially hardened` |
| Tree-sitter JNI namespace | must match `ai.arqon.maestro.treesitter` Java packages | legacy `ai.serenade.*` symbols previously caused JVM startup crash in local core | `private-to-maestro` | build from in-repo `tree-sitter/java-tree-sitter/build.py` and reject stale legacy-export artifacts | `fixed` |
| Code-engine runtime bring-up | local service startup | startup now healthy; `/api/status` returns `ok` in local bundle | `private-to-maestro` | keep sentencepiece tokenization on explicit `spm_encode` CLI path to avoid in-process protobuf parse crash path | `resolved for Wave B` |

## Current Verified Facts

- `maestro/client` builds successfully
- local startup now fails explicitly when the local service bundle is incomplete
- current preflight no longer disappears into CMake noise
- frozen protobuf `4.25.8` is already available in the shared ecosystem
- local `core` startup now survives direct timeout smoke with the rebuilt Arqon tree-sitter JNI library
- local `speech-engine` startup survives timeout smoke when model path is present
- local `code-engine` startup now reaches healthy server state and returns `/api/status` on `:17203`

## Safe Implementation Sequence

1. lock the protobuf lane to the frozen shared toolchain
2. isolate all remaining private native dependencies from shared env mutation
3. keep Marian and Kaldi in the isolated native root and avoid shared-lane mutation
4. rerun `./gradlew client:installServer -x downloadModels`
5. inspect `maestro/client/static/local` for real engine binaries, not just wrapper scripts
6. keep local health checks and UI state transitions in regression coverage
7. verify one real local listen command end-to-end as a post-close runtime quality target

## Unsafe Moves

The following are explicitly out of bounds for Wave B:

- upgrading or downgrading protobuf in the shared environment
- installing Maestro-only package versions into `helios-gpu-118`
- introducing a second competing canonical protobuf lane by accident
- relying on undocumented ambient paths discovered ad hoc
- hard-closing Wave B on cloud-backed behavior only

## Exit Criteria Addendum For Wave B

Wave B may only hard-close when all of the following are true:

- local packaging completes using a policy-compliant dependency plan
- the dependency plan does not violate any frozen lane
- the local bundle contains real engine binaries
- the UI leaves `Starting Server...` for the local backend path
- local `core`, `speech-engine`, and `code-engine` all report healthy status concurrently
- evidence documents which dependencies came from frozen lanes and which were privately built
