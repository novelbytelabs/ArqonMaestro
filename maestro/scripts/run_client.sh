#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"

cd "${CLIENT_DIR}"
"${ROOT_DIR}/scripts/with_clean_electron_env.sh" ./node_modules/.bin/electron . --no-sandbox --disable-gpu
