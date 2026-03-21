#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"

cd "${CLIENT_DIR}"
# Force production URL mode for direct Electron launches.
# Dev URL mode (http://localhost:4000) should only be used via `npm run dev`.
NODE_ENV=production "${ROOT_DIR}/scripts/with_clean_electron_env.sh" ./node_modules/.bin/electron . --no-sandbox --disable-gpu
