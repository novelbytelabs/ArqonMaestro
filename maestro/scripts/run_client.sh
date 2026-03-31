#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"
SETTINGS_PATH="${HOME}/.arqon/arqon.json"
LEGACY_SETTINGS_PATH="${HOME}/.serenade/serenade.json"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

print_red() {
  printf "${RED}%b${NC}\n" "$1" >&2
}

print_yellow() {
  printf "${YELLOW}%b${NC}\n" "$1" >&2
}

print_green() {
  printf "${GREEN}%b${NC}\n" "$1" >&2
}

get_streaming_endpoint() {
  python3 - <<'PY'
import json
import os

paths = [
    os.path.expanduser("~/.arqon/arqon.json"),
    os.path.expanduser("~/.serenade/serenade.json"),
]

for path in paths:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        endpoint = data.get("streaming_endpoint")
        if isinstance(endpoint, str) and endpoint.strip():
            print(endpoint.strip())
            raise SystemExit(0)
    except Exception:
        continue

print("")
PY
}

ensure_parakeet_sidecar_ready() {
  if [[ "${MAESTRO_SKIP_PARAKEET_SIDECAR_PREFLIGHT:-0}" == "1" ]]; then
    print_yellow "[ArqonMaestro] Skipping Parakeet sidecar preflight (MAESTRO_SKIP_PARAKEET_SIDECAR_PREFLIGHT=1)."
    return 0
  fi

  local endpoint
  endpoint="$(get_streaming_endpoint)"
  if [[ "${endpoint}" != "local" ]]; then
    return 0
  fi

  if curl -fsS "http://127.0.0.1:5001/health" >/dev/null 2>&1; then
    print_green "✅ [ArqonMaestro] Parakeet sidecar healthy at http://127.0.0.1:5001/health (local endpoint preflight passed)"
    return 0
  fi

  print_red "============================================================"
  print_red "FATAL: Parakeet sidecar is NOT running (127.0.0.1:5001 down)"
  print_red "Refusing to start ArqonMaestro with local endpoint."
  print_red "============================================================"
  print_red ""
  print_red "Start and warmup Parakeet sidecar first:"
  print_red "  cd ${ROOT_DIR}/client/src/main/stt/sidecars"
  print_red "  ./sidecar_manager.sh start parakeet"
  print_red "  ./sidecar_manager.sh warmup parakeet"
  print_red ""
  print_red "Then retry: ./scripts/run_client.sh"
  print_red ""
  print_yellow "Emergency bypass (not recommended):"
  print_yellow "  MAESTRO_SKIP_PARAKEET_SIDECAR_PREFLIGHT=1 ./scripts/run_client.sh"
  exit 1
}

ensure_parakeet_sidecar_ready

cd "${CLIENT_DIR}"
# Force production URL mode for direct Electron launches.
# Dev URL mode (http://localhost:4000) should only be used via `npm run dev`.
NODE_ENV=production "${ROOT_DIR}/scripts/with_clean_electron_env.sh" ./node_modules/.bin/electron . --no-sandbox --disable-gpu
