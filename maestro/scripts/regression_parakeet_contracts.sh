#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIDECAR_MANAGER="${ROOT_DIR}/client/src/main/stt/sidecars/sidecar_manager.sh"
PARAKEET_SIDECAR="${ROOT_DIR}/client/src/main/stt/sidecars/parakeet_sidecar.py"
RUN_CLIENT="${ROOT_DIR}/scripts/run_client.sh"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

pass() {
  echo "[PASS] $*"
}

require_pattern() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  rg -n "$pattern" "$file" >/dev/null 2>&1 || fail "${label} (${file})"
  pass "${label}"
}

echo "=== Parakeet Contract Regression Checks ==="
echo "root: ${ROOT_DIR}"

bash -n "${SIDECAR_MANAGER}"
pass "sidecar_manager shell syntax"

bash -n "${RUN_CLIENT}"
pass "run_client shell syntax"

require_pattern "${SIDECAR_MANAGER}" 'endpoint="/ready"' \
  "Parakeet warmup probes /ready"
require_pattern "${SIDECAR_MANAGER}" 'curl -s -f "http://localhost:\$\{port\}\$\{endpoint\}"' \
  "Warmup uses dynamic endpoint probe"
require_pattern "${RUN_CLIENT}" 'http://127\.0\.0\.1:5001/ready' \
  "Client preflight checks /ready"
require_pattern "${RUN_CLIENT}" 'health_payload=' \
  "Client preflight captures /health diagnostics"
require_pattern "${PARAKEET_SIDECAR}" 'map_location="cpu"' \
  "Parakeet restore loads on CPU first"
require_pattern "${PARAKEET_SIDECAR}" 'Retrying Parakeet model load on CPU fallback' \
  "Parakeet includes CPU fallback path"

if [[ "${MAESTRO_REGRESSION_LIVE:-0}" == "1" ]]; then
  echo "=== Live Probe (MAESTRO_REGRESSION_LIVE=1) ==="
  if curl -fsS "http://127.0.0.1:5001/ready" >/dev/null 2>&1; then
    pass "Live /ready probe succeeded"
  else
    fail "Live /ready probe failed (sidecar not ready)"
  fi
fi

echo "=== All contract checks passed ==="
