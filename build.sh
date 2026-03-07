#!/bin/bash
# Maestro Build Wrapper
set -e

MAESTRO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$MAESTRO_ROOT/env.sh"

cd "$SERENADE_SOURCE_ROOT"

echo "Building Maestro..."
echo "Java: $(java -version 2>&1 | head -1)"
echo "Gradle: $(gradle --version | grep 'Gradle' | head -1)"
echo ""

gradle installd "$@"
