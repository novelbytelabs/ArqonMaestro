#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"
VSCODE_DIR="${REPO_DIR}/vscode-plugin"
ELECTRON_ENV_WRAPPER="${ROOT_DIR}/scripts/with_clean_electron_env.sh"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_DIR="${REPO_DIR}/reports/wave-c_${STAMP}"

mkdir -p "${REPORT_DIR}"

run_and_log() {
  local name="$1"
  shift
  local log="${REPORT_DIR}/${name}.log"
  echo ">>> ${name}"
  echo "cmd: $*" | tee "${log}"
  "$@" 2>&1 | tee -a "${log}"
}

if [[ -f "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.nvm/nvm.sh"
  nvm use 18 >/dev/null
fi

[[ "$(node -p 'process.versions.node.split(".")[0]')" == "18" ]] || {
  echo "Node 18.x is required to collect Wave C evidence. Found: $(node -v)" >&2
  exit 1
}

run_and_log "readiness" "${ELECTRON_ENV_WRAPPER}" "${ROOT_DIR}/scripts/release_readiness_check.sh"
run_and_log "client_package_unsigned" bash -lc "cd '${CLIENT_DIR}' && '${ELECTRON_ENV_WRAPPER}' npm run package:unsigned"
run_and_log "dist_listing" bash -lc "cd '${CLIENT_DIR}' && ls -lah dist"
run_and_log "appimage_file" file "${CLIENT_DIR}/dist/ArqonMaestro-2.0.2.AppImage"
run_and_log "appimage_sha256" sha256sum "${CLIENT_DIR}/dist/ArqonMaestro-2.0.2.AppImage"
run_and_log "linux_unpacked_smoke" bash -lc "cd '${CLIENT_DIR}/dist/linux-unpacked' && '${ELECTRON_ENV_WRAPPER}' env ELECTRON_ENABLE_LOGGING=1 timeout 12 ./arqon-maestro || true"

run_and_log "vscode_install" bash -lc "cd '${VSCODE_DIR}' && npm install"
run_and_log "vscode_build" bash -lc "cd '${VSCODE_DIR}' && npm run build"
run_and_log "vscode_pack_dry_run" bash -lc "cd '${VSCODE_DIR}' && npm pack --dry-run"

echo "Wave C evidence collected in: ${REPORT_DIR}"
