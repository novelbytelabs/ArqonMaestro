#!/bin/bash
# Maestro Setup Script for Ubuntu 22.04
# Pins JDK 14.0.1 and Gradle 7.4.2 as project-local tools

set -e

MAESTRO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_DIR="$MAESTRO_ROOT/.tools"
MAESTRO_ENGINE_ROOT="$MAESTRO_ROOT/serenade"
ARQON_MAESTRO_LIBRARY_ROOT_DEFAULT="$HOME/libarqon"
LEGACY_LIBRARY_ROOT="$HOME/libserenade"

# Versions (pinned from the inherited engine Dockerfile)
JDK_VERSION="14.0.1"
GRADLE_VERSION="7.4.2"

# URLs
JDK_URL="https://download.java.net/java/GA/jdk14.0.1/664493ef4a6946b186ff29eb326336a2/7/GPL/openjdk-14.0.1_linux-x64_bin.tar.gz"
GRADLE_URL="https://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"

echo "=== Maestro Setup for Ubuntu 22.04 ==="
echo "MAESTRO_ROOT: $MAESTRO_ROOT"
echo "TOOLS_DIR: $TOOLS_DIR"
echo ""

# Create directories
mkdir -p "$TOOLS_DIR"
mkdir -p "$ARQON_MAESTRO_LIBRARY_ROOT_DEFAULT/models"

# Download and install JDK 14.0.1
if [ ! -d "$TOOLS_DIR/jdk-$JDK_VERSION" ]; then
    echo "--- Installing JDK $JDK_VERSION ---"
    cd "$TOOLS_DIR"
    curl -L -o "openjdk-${JDK_VERSION}.tar.gz" "$JDK_URL"
    tar -xzf "openjdk-${JDK_VERSION}.tar.gz"
    rm "openjdk-${JDK_VERSION}.tar.gz"
    echo "JDK installed to $TOOLS_DIR/jdk-$JDK_VERSION"
else
    echo "JDK $JDK_VERSION already installed"
fi

# Download and install Gradle 7.4.2
if [ ! -d "$TOOLS_DIR/gradle-${GRADLE_VERSION}" ]; then
    echo "--- Installing Gradle $GRADLE_VERSION ---"
    cd "$TOOLS_DIR"
    curl -L -o "gradle-${GRADLE_VERSION}.zip" "$GRADLE_URL"
    unzip -q "gradle-${GRADLE_VERSION}.zip"
    rm "gradle-${GRADLE_VERSION}.zip"
    echo "Gradle installed to $TOOLS_DIR/gradle-${GRADLE_VERSION}"
else
    echo "Gradle $GRADLE_VERSION already installed"
fi

# Create environment activation script
cat > "$MAESTRO_ROOT/env.sh" << 'ENVSCRIPT'
#!/bin/bash
# Maestro Environment Activation
# Source this file: source ./env.sh

MAESTRO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export JAVA_HOME="$MAESTRO_ROOT/.tools/jdk-14.0.1"
export GRADLE_HOME="$MAESTRO_ROOT/.tools/gradle-7.4.2"
export PATH="$JAVA_HOME/bin:$GRADLE_HOME/bin:$PATH"

export ARQON_MAESTRO_SOURCE_ROOT="$MAESTRO_ROOT/serenade"
export ARQON_MAESTRO_LIBRARY_ROOT="$HOME/libarqon"
export SERENADE_SOURCE_ROOT="$ARQON_MAESTRO_SOURCE_ROOT"
export SERENADE_LIBRARY_ROOT="${SERENADE_LIBRARY_ROOT:-$ARQON_MAESTRO_LIBRARY_ROOT}"

# Aliases for convenience
alias maestro-build="cd \$ARQON_MAESTRO_SOURCE_ROOT && gradle installd"
alias maestro-run="cd \$ARQON_MAESTRO_SOURCE_ROOT/client && ./bin/dev.py"
alias maestro-local="cd \$ARQON_MAESTRO_SOURCE_ROOT/client && ENDPOINT=http://localhost:17200 ./bin/dev.py"

echo "Maestro environment activated"
echo "  JAVA_HOME: $JAVA_HOME"
echo "  GRADLE_HOME: $GRADLE_HOME"
echo "  ARQON_MAESTRO_SOURCE_ROOT: $ARQON_MAESTRO_SOURCE_ROOT"
echo "  ARQON_MAESTRO_LIBRARY_ROOT: $ARQON_MAESTRO_LIBRARY_ROOT"
echo "  SERENADE_SOURCE_ROOT (compat): $SERENADE_SOURCE_ROOT"
echo "  SERENADE_LIBRARY_ROOT (compat): $SERENADE_LIBRARY_ROOT"
echo ""
echo "Commands:"
echo "  maestro-build  - Build the project"
echo "  maestro-run    - Run with cloud backend"
echo "  maestro-local  - Run with local backend"
ENVSCRIPT

chmod +x "$MAESTRO_ROOT/env.sh"

# Create a simple build wrapper
cat > "$MAESTRO_ROOT/build.sh" << 'BUILDSCRIPT'
#!/bin/bash
# Maestro Build Wrapper
set -e

MAESTRO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$MAESTRO_ROOT/env.sh"

cd "$ARQON_MAESTRO_SOURCE_ROOT"

echo "Building Maestro..."
echo "Java: $(java -version 2>&1 | head -1)"
echo "Gradle: $(gradle --version | grep 'Gradle' | head -1)"
echo ""

gradle installd "$@"
BUILDSCRIPT

chmod +x "$MAESTRO_ROOT/build.sh"

# Verify installation
echo ""
echo "=== Verifying Installation ==="
export JAVA_HOME="$TOOLS_DIR/jdk-$JDK_VERSION"
export PATH="$JAVA_HOME/bin:$PATH"
java -version 2>&1 | head -1

export GRADLE_HOME="$TOOLS_DIR/gradle-${GRADLE_VERSION}"
export PATH="$GRADLE_HOME/bin:$PATH"
gradle --version | grep "Gradle" | head -1

echo ""
echo "=== Setup Complete ==="
echo ""
echo "To activate the Maestro environment:"
echo "  source $MAESTRO_ROOT/env.sh"
echo ""
echo "Then build with:"
echo "  maestro-build"
echo "  OR"
echo "  ./build.sh"
echo ""
echo "Models are already downloaded to: $ARQON_MAESTRO_LIBRARY_ROOT_DEFAULT/models"
