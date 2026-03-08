#!/bin/bash
# Maestro Build Wrapper
set -e

MAESTRO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$MAESTRO_ROOT/env.sh"

SOURCE_ROOT="${ARQON_MAESTRO_SOURCE_ROOT:-${SERENADE_SOURCE_ROOT:-$MAESTRO_ROOT/maestro}}"
LIBRARY_ROOT="${ARQON_MAESTRO_LIBRARY_ROOT:-${SERENADE_LIBRARY_ROOT:-$HOME/libarqon}}"

export ARQON_MAESTRO_SOURCE_ROOT="$SOURCE_ROOT"
export ARQON_MAESTRO_LIBRARY_ROOT="$LIBRARY_ROOT"
export SERENADE_SOURCE_ROOT="$SOURCE_ROOT"
export SERENADE_LIBRARY_ROOT="$LIBRARY_ROOT"

cd "$ARQON_MAESTRO_SOURCE_ROOT"

echo "Building Maestro..."
echo "Java: $(java -version 2>&1 | head -1)"
echo "Gradle: $(gradle --version | grep 'Gradle' | head -1)"
echo ""

gradle installd "$@"
