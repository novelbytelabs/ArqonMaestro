#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 2
fi

# Keep Electron app runs isolated from shell-global legacy flags.
unset ELECTRON_RUN_AS_NODE

# Avoid host snap/VS Code GIO module bleed-through that emits non-fatal
# libproxy/libstdc++ warnings in Electron startup logs.
unset GIO_MODULE_DIR
unset GIO_EXTRA_MODULES
unset GTK_PATH

exec "$@"
