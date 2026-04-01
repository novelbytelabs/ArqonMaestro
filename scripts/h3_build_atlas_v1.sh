#!/usr/bin/env bash
set -euo pipefail

CONDA_ENV="${H3_CONDA_ENV:-helios-gpu-118}"
MANIFOLD_ROOT="${ARQON_MANIFOLD_ROOT:-/home/irbsurfer/Projects/arqon/ArqonManifold}"
MANIFEST_PATH="${H3_ENROLLMENT_MANIFEST:-$MANIFOLD_ROOT/tools/enrollment_manifest_v1.sample.md}"
OUT_PATH="${H3_ATLAS_OUT:-/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/artifacts/h3/command_atlas_v1.json}"
ATLAS_VERSION="${H3_ATLAS_VERSION:-}"

mkdir -p "$(dirname "$OUT_PATH")"

BUILD_CMD=(
  conda run -n "$CONDA_ENV" python3 "$MANIFOLD_ROOT/tools/h3_atlas_v1.py" build
  --manifest "$MANIFEST_PATH"
  --out "$OUT_PATH"
)

if [[ -n "$ATLAS_VERSION" ]]; then
  BUILD_CMD+=(--atlas-version "$ATLAS_VERSION")
fi

"${BUILD_CMD[@]}"

conda run -n "$CONDA_ENV" python3 "$MANIFOLD_ROOT/tools/h3_atlas_v1.py" validate --atlas "$OUT_PATH"

echo "[H3] atlas built and validated at: $OUT_PATH"
