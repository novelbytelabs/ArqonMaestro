#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="${ROOT_DIR}/client"

echo "=== Voice Command Lane Regression Suite ==="
echo "root: ${ROOT_DIR}"

cd "${CLIENT_DIR}"

npx jest --config jest.config.js --runInBand \
  src/test/audio/h23-command-governor.unit.spec.ts \
  src/test/audio/parakeet-command-fast-provider.unit.spec.ts

npx jest --config jest.config.js --runInBand \
  src/test/audio/chunk-manager-command-lane-routing.unit.spec.ts \
  src/test/audio/voice-command-regression.unit.spec.ts

echo "=== Voice command lane regression suite passed ==="
