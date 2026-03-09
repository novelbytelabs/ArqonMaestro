# Frozen Requirements Registry

> Purpose: define the environment and dependency lanes that Arqon Maestro must not mutate implicitly while modernizing and restoring local mode.

This registry exists to stop Wave B and later work from discovering ecosystem constraints by breaking them.

## How To Use This Registry

Before changing build logic, packaging, native dependencies, or runtime environment assumptions:

1. identify the lane you are touching
2. classify it correctly
3. verify whether Maestro may consume it, wrap it, or build beside it
4. stop if the lane is not yet recorded

No modernization wave may mutate a `frozen` lane.

## Classification

| Classification | Meaning | Allowed Actions |
|---|---|---|
| `frozen` | Must not be changed by Maestro work | read, reference, validate |
| `semi-frozen` | Changes require explicit approval and cross-project review | read, validate, document |
| `additive-only` | New artifacts may be added beside the lane, but existing state must not be changed | add isolated artifacts, reference |
| `private-to-maestro` | Maestro may own and change this surface directly | build, replace, delete, migrate |
| `unknown` | Not yet assessed | do not touch |

## Registry

| Lane | Current Requirement | Classification | Source of Truth | Maestro Rule | Notes |
|---|---|---|---|---|---|
| Core Rust lane | `1.82.0` | `frozen` | user policy | do not upgrade, downgrade, or replace | applies to core Rust work in the broader Arqon ecosystem |
| Packaging Rust lane | `1.88.0` | `frozen` | user policy | do not upgrade, downgrade, or replace | applies to packaging/release Rust work in the broader Arqon ecosystem |
| Protobuf lane | `4.25.8` | `frozen` | user policy | consume explicitly; do not introduce a competing canonical protobuf lane | `protoc --version` currently reports `libprotoc 25.8` |
| `helios-gpu-118` conda environment | shared ecosystem environment | `semi-frozen` | user policy | do not mutate shared packages or versions without explicit approval | Maestro may reference tools and headers already present |
| Shared system toolchain | gcc, cmake, system libraries | `semi-frozen` | host system | use as found; do not reconfigure globally | additive private builds are preferred |
| Maestro native dependency root | dedicated isolated native assets | `private-to-maestro` | to be defined per wave | safe place for private native outputs | should not be co-mingled with frozen lanes |
| Legacy `libserenade` private root | historical local native dependency root | `additive-only` | current machine state | do not assume it is authoritative for Arqon-wide policy | acceptable only as an isolated local store, not as ecosystem truth |
| `.arqon` runtime state | Maestro-owned config and logs | `private-to-maestro` | repo/runtime policy | Maestro may migrate and manage | already made canonical in rebrand phases |
| External endpoints/CDN | inherited infrastructure | `semi-frozen` | external ownership plan | do not rename by assumption | governed by separate ownership program |
| Additional ecosystem lanes not yet recorded | unknown | `unknown` | not yet inventoried | stop and record first | this is expected to grow |

## Wave B Safety Rules

Wave B must follow these rules:

1. no shared environment upgrades
2. no global npm, pip, conda, cargo, or apt mutations to satisfy Maestro alone
3. frozen lanes must be consumed through explicit paths, not ambient discovery
4. private native artifacts must live in a Maestro-specific or explicitly isolated root
5. if a dependency cannot be isolated cleanly, Wave B stays open

## Required Preflight Before Local Runtime Work

Before resuming local native packaging work, confirm:

- the protobuf root in use matches the frozen `4.25.8` lane
- the build path does not require mutating `helios-gpu-118`
- every remaining missing native dependency is either:
  - already present in a frozen lane and safe to reference, or
  - safe to build into a private Maestro root
- no hidden `unknown` lanes remain for the active work item

## Open Inventory Work

The following likely lanes still need to be recorded explicitly:

- Java/JDK lane
- Node lane
- Python lane outside protobuf
- CUDA lane
- TensorFlow / PyTorch lane
- CMake lane
- model storage rules
- service ownership / local port policy
- release signing / packaging policy

Until these are recorded, assume they are `unknown`.

## Decision Boundary

If a change would:

- replace a shared tool version
- override a frozen lane silently
- depend on ambiguous ambient state
- or require a global package change

then it is not safe and should not proceed.
