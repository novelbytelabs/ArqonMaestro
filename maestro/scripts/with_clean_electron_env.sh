#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

# Keep Electron app runs isolated from shell-global legacy flags.
unset ELECTRON_RUN_AS_NODE

exec "$@"
