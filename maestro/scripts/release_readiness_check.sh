#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"
LOCAL_DIR="${CLIENT_DIR}/static/local"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

pass() {
  echo "[PASS] $*"
}

require_file() {
  local path="$1"
  local label="$2"
  [[ -f "${path}" ]] || fail "${label} missing: ${path}"
  pass "${label}: ${path}"
}

require_exec() {
  local path="$1"
  local label="$2"
  [[ -x "${path}" ]] || fail "${label} is not executable: ${path}"
  pass "${label} executable: ${path}"
}

echo "=== Wave C Release Readiness Check ==="
echo "root: ${ROOT_DIR}"

command -v node >/dev/null 2>&1 || fail "node is not installed"
command -v npm >/dev/null 2>&1 || fail "npm is not installed"
command -v file >/dev/null 2>&1 || fail "file is not installed"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[[ "${NODE_MAJOR}" == "18" ]] || fail "Node 18.x is required for current packaging path. Found: $(node -v)"
pass "Node version is compatible: $(node -v)"

if [[ "${ELECTRON_RUN_AS_NODE:-}" == "1" ]]; then
  fail "ELECTRON_RUN_AS_NODE=1 is set; unset it before packaging/runtime checks"
fi
pass "ELECTRON_RUN_AS_NODE is not forced"

if [[ "$(uname -s)" == "Linux" ]] && command -v dpkg-query >/dev/null 2>&1; then
  for pkg in libxtst-dev libx11-dev libxext-dev; do
    dpkg-query -W -f='${Status}' "${pkg}" 2>/dev/null | grep -q "install ok installed" \
      || fail "Missing linux native packaging dependency: ${pkg}"
    pass "Linux packaging dependency installed: ${pkg}"
  done
fi

require_file "${CLIENT_DIR}/package.json" "client package manifest"
require_file "${CLIENT_DIR}/package-lock.json" "client lockfile"
require_file "${CLIENT_DIR}/node_modules/.bin/electron" "electron binary"

require_exec "${LOCAL_DIR}/core/bin/run-pro" "core runner"
require_exec "${LOCAL_DIR}/speech-engine/run-pro" "speech-engine runner"
require_exec "${LOCAL_DIR}/code-engine/run-pro" "code-engine runner"

require_exec "${LOCAL_DIR}/speech-engine/arqon-maestro-speech-engine" "speech-engine binary"
require_exec "${LOCAL_DIR}/code-engine/arqon-maestro-code-engine" "code-engine binary"
require_exec "${LOCAL_DIR}/core/bin/arqon-maestro-core" "core binary"

file "${LOCAL_DIR}/code-engine/arqon-maestro-code-engine" | grep -Eq "ELF.*executable|ELF.*pie executable" \
  || fail "code-engine binary is not a valid ELF executable"
pass "code-engine binary integrity check passed"

echo "=== Readiness checks passed ==="
