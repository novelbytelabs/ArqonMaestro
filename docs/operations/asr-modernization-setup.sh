#!/bin/bash
# ASR Modernization Setup Script
# Historical script retained for provenance only.
# Deprecated by VOS-041/VOS-042 direction lock:
# - do NOT install ASR-native deps into helios-gpu-118
# - use isolated sidecar env flow (helios-asr-isolated) via:
#   maestro/client/src/main/stt/sidecars/setup_isolated_env.sh
#   maestro/client/src/main/stt/sidecars/sidecar_manager.sh

set -e

echo "DEPRECATED: docs/operations/asr-modernization-setup.sh is historical only."
echo "Do NOT install ASR-native dependencies into helios-gpu-118."
echo "Use isolated sidecar setup:"
echo "  maestro/client/src/main/stt/sidecars/setup_isolated_env.sh all"
echo "  maestro/client/src/main/stt/sidecars/sidecar_manager.sh preflight all"
exit 1
