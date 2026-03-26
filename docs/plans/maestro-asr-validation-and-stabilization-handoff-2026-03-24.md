# Maestro ASR Validation + Stabilization Handoff (2026-03-24)

## Why this exists

This brief is for delegated execution by another AI/engineer.
It defines exactly how to validate current ASR lanes, stabilize runtime, and prepare command-lane modernization without violating environment policy.

## Short answer to architecture acceptance

Do **not** accept `Parakeet-CTC` (command lane) or `Qwen3-ASR` (dictation lane) as accepted runtime architecture until local validation evidence is collected.

- Command lane must pass control-system gates (not generic ASR quality only).
- Dictation lane must pass local workstation usability/performance gates.

## Direction lock (must follow)

- Lane split is mandatory.
- Command lane != dictation lane.
- Command lane is a control stack:
  - CTC acoustic candidate
  - constrained decoder
  - lexicon/pronunciation controls
  - Maestro grammar/parser
  - deterministic bounded rejection
- `Parakeet-CTC` is first command-lane acoustic candidate sequencing.
- `Qwen3-ASR` stays dictation-lane candidate.

## Hard constraints (non-negotiable)

1. Do **not** install ASR-native dependencies into `helios-gpu-118`.
2. Use isolated sidecar environment only (`helios-asr-isolated`).
3. No placeholder success paths in command-lane control flow.
4. No phase is accepted without raw evidence output and rollback statement.

## Current known state (from local checks)

- Sidecars were previously stopped.
- Health checks failed when sidecars were down.
- Preflight failed because isolated env was missing.
- This means there is currently no trustworthy local performance baseline.

## Execution goals

1. Restore stable baseline runtime (sidecar lifecycle + telemetry truth).
2. Measure `Qwen3-ASR` dictation performance/usability locally.
3. Assess current Parakeet path against command-lane control requirements.
4. Produce decommission/install matrix (what to remove, what to keep, what to add).

## Phase plan for delegate

## Phase 0 - Baseline snapshot + rollback

Deliver:
- Current git commit hash and branch.
- Current env inventory (`conda env list`, key package snapshots).
- Sidecar status and health snapshot.
- Rollback instructions verified once.

Evidence required:
- commands, raw outputs, timestamped summary.

## Phase 1 - Runtime stabilization

Tasks:
- Setup/verify isolated env:
  - `maestro/client/src/main/stt/sidecars/setup_isolated_env.sh all`
- Download models:
  - `maestro/client/src/main/stt/sidecars/download_models.sh all`
- Validate sidecar lifecycle:
  - preflight/start/warmup/status/test/restart/stop

Required commands:
- `./maestro/client/src/main/stt/sidecars/sidecar_manager.sh preflight all`
- `./maestro/client/src/main/stt/sidecars/sidecar_manager.sh start all`
- `./maestro/client/src/main/stt/sidecars/sidecar_manager.sh status all`
- `./maestro/client/src/main/stt/sidecars/sidecar_manager.sh test parakeet`
- `./maestro/client/src/main/stt/sidecars/sidecar_manager.sh test qwen3`

Exit gates:
- deterministic green startup and health in isolated env.
- no reference to `helios-gpu-118` for ASR-native runtime execution.

## Phase 2 - Dictation-lane validation (`Qwen3-ASR`)

What to measure:
- startup latency (cold/warm)
- P50/P95 inference latency
- timeout/failure rate
- long-form dictation usability (punctuation, correction burden)
- GPU memory footprint / stability over repeated runs

Pass criteria (define explicitly before running):
- stable long-form usability on workstation
- acceptable P95 latency for dictation workflow
- low failure/timeout rate under repeated trials

Important:
- dictation results must not be used to declare command-lane architecture success.

## Phase 3 - Command-lane gap assessment (Parakeet path)

Objective:
- assess if current code path is model-centric transcription or true control-stack behavior.

Check for:
- constrained decoder integration presence/absence
- lexicon/pronunciation control seams
- grammar/parser deterministic rejection path
- bounded output normalization for command safety

If missing, record as explicit architectural gap, not “minor tuning”.

## Phase 4 - Decommission/install/integration plan

Deliver matrix with columns:
- component/script/package
- current role
- keep/replace/deprecate/remove
- dependency/risk
- owner
- rollback path

Must include:
- obsolete model-centric assumptions/scripts
- active sidecar scripts to keep
- required additions for command-control stack

## Acceptance gates by lane

## Command lane (control-first)

Required:
- grammar compatibility
- deterministic out-of-grammar rejection
- custom vocabulary control
- custom pronunciation handling
- bounded outputs
- low-latency command usability

Not sufficient:
- WER-only improvement
- benchmark-only claim

## Dictation lane (text-first)

Required:
- long-form quality and punctuation
- correction burden acceptable
- local latency/reliability acceptable

## Evidence packet format (required)

For each phase include:
- commit hash
- files changed
- commands run
- raw outputs
- pass/fail against gates
- unresolved risks
- rollback statement

## Critical docs to read first

- `docs/vos/maestro-decision-log.md` (`VOS-041`, `VOS-042`)
- `docs/decision-log.md` (`ADM-053`)
- `docs/vos/maestro-stt-strategy-by-lane.md`
- `docs/plans/maestro-speech-stabilization-master-plan-2026-03-24.md`
- `docs/vos/maestro-project-roadmap.md`
- `docs/vos/maestro-implementation-progress.md`
- `docs/vos/maestro-asr-command-lane-pivot-impact.md`

## Critical scripts and code paths

- `maestro/client/src/main/stt/sidecars/setup_isolated_env.sh`
- `maestro/client/src/main/stt/sidecars/download_models.sh`
- `maestro/client/src/main/stt/sidecars/sidecar_manager.sh`
- `maestro/client/src/main/stt/sidecars/parakeet_sidecar.py`
- `maestro/client/src/main/stt/sidecars/qwen3_sidecar.py`
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`
- `maestro/client/src/main/stt/qwen3-asr-dictation-provider.ts`
- `maestro/client/src/main/stream/chunk-manager.ts`
- `maestro/client/src/main/stt/tracking.ts`
- `maestro/client/src/main/settings.ts`

## Known gotchas

- Preflight currently hard-fails if `helios-asr-isolated` does not exist.
- Health checks fail when sidecars are stopped; do not confuse this with model incompatibility.
- Historical docs may mention `Parakeet-TDT`/Whisper command baselines; treat those as superseded.
- Do not “pass” command-lane stages with generic transcript quality metrics.
- Ensure no hidden script mutates `helios-gpu-118`.

## Copy-paste prompt for delegated AI

You are executing Maestro ASR stabilization and validation work under strict architecture and environment rules.

Primary objectives:
1) restore stable sidecar runtime in isolated env,
2) benchmark and assess Qwen3-ASR for dictation lane on this workstation,
3) assess command-lane gaps against control-stack requirements,
4) produce keep/remove/add integration matrix.

Mandatory constraints:
- DO NOT install ASR-native dependencies into helios-gpu-118.
- Use helios-asr-isolated only.
- Follow VOS-041/VOS-042 and ADM-053 direction.
- Command lane must be evaluated as a control system (decoder/lexicon/grammar/rejection), not generic ASR.
- Provide raw evidence for every claim.

Read first:
- docs/vos/maestro-decision-log.md (VOS-041, VOS-042)
- docs/decision-log.md (ADM-053)
- docs/vos/maestro-stt-strategy-by-lane.md
- docs/plans/maestro-speech-stabilization-master-plan-2026-03-24.md
- docs/plans/maestro-asr-validation-and-stabilization-handoff-2026-03-24.md

Execute phases:
- Phase 0: baseline snapshot + rollback proof
- Phase 1: isolated env setup, model setup, sidecar lifecycle stabilization with preflight/start/test evidence
- Phase 2: Qwen3 dictation validation (P50/P95 latency, failure rate, usability)
- Phase 3: command-lane gap audit vs constrained-decoder + lexicon/pronunciation + grammar/rejection requirements
- Phase 4: decommission/install/integration matrix with owner + rollback notes

Return report format:
- commit hash
- files changed
- commands run
- raw outputs
- gate pass/fail table
- unresolved risks
- rollback statement

Return RED if any constraint is violated.
