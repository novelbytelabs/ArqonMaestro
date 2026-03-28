# Qwen3 Bridge Hardening Runbook (Local Bridge Mode)

Date: 2026-03-28  
Status: Active

This runbook validates the Qwen3 dictation bridge contract in local mode (`arqon_asr_qwen3_mode=local`) without sidecar dependencies.

## Environment

```bash
export MAESTRO_QWEN3_BRIDGE_PATH=~/Projects/arqon/arqon-maestro-asr/scripts/maestro_qwen3_bridge.py
export MAESTRO_QWEN3_PROJECT_ROOT=~/Projects/arqon/arqon-maestro-asr
export MAESTRO_QWEN3_MODEL_PATH=~/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-0.6B
export MAESTRO_QWEN3_PYTHON_PATH=~/miniconda3/envs/helios-gpu-118/bin/python
```

## One-Command Hardening

```bash
cd ~/Projects/arqon/ArqonMaestro/maestro/client
./scripts/qwen3_bridge_hardening.sh
```

The script checks:
1. `--help` argument contract.
2. Empty stdin -> structured `empty_audio`.
3. Malformed WAV stdin -> structured `audio_format_invalid`.
4. Missing model path -> structured failure JSON.
5. Sequential schema stability.
6. Parallel schema stability.

Tune load:

```bash
MAESTRO_QWEN3_HARDENING_SEQ_RUNS=500 \
MAESTRO_QWEN3_HARDENING_PAR_RUNS=50 \
MAESTRO_QWEN3_HARDENING_PAR_WORKERS=8 \
./scripts/qwen3_bridge_hardening.sh
```

## Acceptance Gates

1. Schema Gate: every stdout response is a single JSON object with `ok` boolean.
2. Error Determinism Gate: injected failures return stable error codes.
3. Integration Gate: provider resolves bridge path to external `arqon-maestro-asr` script when present.
4. Latency Gate: benchmark separately on target hardware before broad rollout.

## Rollback

If hardening fails:
1. Point `MAESTRO_QWEN3_BRIDGE_PATH` to previous known-good bridge.
2. Keep mode as local bridge.
3. Do not force sidecar mode unless explicitly approved.
