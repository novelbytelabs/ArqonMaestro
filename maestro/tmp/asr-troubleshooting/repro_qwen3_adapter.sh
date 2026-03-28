#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/irbsurfer/Projects/arqon/ArqonMaestro"
PYTHON="/home/irbsurfer/miniconda3/envs/helios-gpu-118/bin/python"
SCRIPT="${ROOT}/maestro/tmp/asr-troubleshooting/repro_qwen3_adapter.py"

if [ ! -x "${PYTHON}" ]; then
  echo "missing python: ${PYTHON}" >&2
  exit 1
fi

if [ ! -f "${SCRIPT}" ]; then
  echo "missing script: ${SCRIPT}" >&2
  exit 1
fi

exec "${PYTHON}" "${SCRIPT}"
