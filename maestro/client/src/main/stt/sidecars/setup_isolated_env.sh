#!/bin/bash
# ASR Isolated Environment Setup
# Creates helios-asr-isolated conda env with native ASR dependencies
# This env runs sidecar services OUTSIDE frozen helios-gpu-118
#
# Usage:
#   ./setup_isolated_env.sh create    - Create isolated environment
#   ./setup_isolated_env.sh install   - Install ASR dependencies
#   ./setup_isolated_env.sh verify    - Verify environment
#   ./setup_isolated_env.sh all       - Full setup (create + install + verify)

set -e

# Configuration
ENV_NAME="helios-asr-isolated"
PYTHON_VERSION="3.10"

# Isolated model storage
MODEL_BASE="${HOME}/models/arqon/asr"
PARAKEET_DIR="${MODEL_BASE}/parakeet-tdt-0.6b-v3"
QWEN3_DIR="${MODEL_BASE}/qwen3-asr-1.7b"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if conda is available
check_conda() {
    if ! command -v conda &> /dev/null; then
        log_error "Conda not found. Please install Miniconda or Anaconda."
        exit 1
    fi
    log_info "Conda found: $(which conda)"
}

# Create isolated environment
create_env() {
    log_info "Creating isolated environment '${ENV_NAME}'..."
    
    # Check if env already exists
    if conda env list | grep -q "^${ENV_NAME} "; then
        log_warn "Environment '${ENV_NAME}' already exists"
        read -p "Recreate? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing environment"
            return 0
        fi
        conda env remove -n "${ENV_NAME}" -y
    fi
    
    # Create new environment with Python
    conda create -n "${ENV_NAME}" python="${PYTHON_VERSION}" -y
    
    log_info "Environment '${ENV_NAME}' created successfully"
}

# Install ASR dependencies
install_deps() {
    log_info "Installing ASR dependencies in '${ENV_NAME}'..."
    
    # Upgrade pip
    conda run -n "${ENV_NAME}" pip install -U pip wheel setuptools
    
    # Install NeMo ASR (includes Parakeet support)
    log_info "Installing nemo_toolkit[asr]..."
    conda run -n "${ENV_NAME}" pip install -U "nemo_toolkit[asr]"
    
    # Install vLLM with audio support
    log_info "Installing vllm and audio support..."
    conda run -n "${ENV_NAME}" pip install -U vllm --pre
    conda run -n "${ENV_NAME}" pip install "vllm[audio]"
    
    # Install additional ASR dependencies
    log_info "Installing additional dependencies..."
    conda run -n "${ENV_NAME}" pip install numpy scipy
    
    log_info "Dependencies installed successfully"
}

# Setup model directories
setup_models() {
    log_info "Setting up model directories..."
    mkdir -p "${PARAKEET_DIR}"
    mkdir -p "${QWEN3_DIR}"
    log_info "Model base: ${MODEL_BASE}"
}

# Verify environment
verify_env() {
    log_info "Verifying environment '${ENV_NAME}'..."
    
    local errors=0
    
    # Check env exists
    if ! conda env list | grep -q "^${ENV_NAME} "; then
        log_error "Environment '${ENV_NAME}' not found"
        ((errors++))
    else
        log_info "✓ Environment exists"
    fi
    
    # Check Python version
    local py_ver=$(conda run -n "${ENV_NAME}" python --version 2>&1)
    log_info "Python: ${py_ver}"
    
    # Check key imports
    log_info "Checking Python imports..."
    
    if conda run -n "${ENV_NAME}" python -c "import torch" 2>/dev/null; then
        log_info "✓ torch installed"
    else
        log_error "✗ torch not installed"
        ((errors++))
    fi
    
    if conda run -n "${ENV_NAME}" python -c "import nemo" 2>/dev/null; then
        log_info "✓ nemo installed"
    else
        log_warn "⚠ nemo not installed (optional for Parakeet)"
    fi
    
    if conda run -n "${ENV_NAME}" python -c "import vllm" 2>/dev/null; then
        log_info "✓ vllm installed"
    else
        log_warn "⚠ vllm not installed (optional for Qwen3)"
    fi
    
    # Check model directories
    if [ -d "${PARAKEET_DIR}" ]; then
        log_info "✓ Parakeet model dir exists"
    else
        log_warn "⚠ Parakeet model dir not found"
    fi
    
    if [ -d "${QWEN3_DIR}" ]; then
        log_info "✓ Qwen3 model dir exists"
    else
        log_warn "⚠ Qwen3 model dir not found"
    fi
    
    if [ $errors -gt 0 ]; then
        log_error "Verification failed with ${errors} errors"
        return 1
    fi
    
    log_info "✓ Environment verified successfully"
    return 0
}

# Main
case "$1" in
    create)
        check_conda
        create_env
        ;;
    install)
        install_deps
        ;;
    verify)
        verify_env
        ;;
    all)
        check_conda
        create_env
        install_deps
        setup_models
        verify_env
        ;;
    *)
        echo "ASR Isolated Environment Setup"
        echo "Usage: $0 <create|install|verify|all>"
        echo ""
        echo "This script creates a separate conda environment '${ENV_NAME}'"
        echo "for ASR sidecar services, isolated from frozen helios-gpu-118."
        echo ""
        echo "Commands:"
        echo "  create   - Create isolated conda environment"
        echo "  install  - Install ASR dependencies (nemo, vllm)"
        echo "  verify   - Verify environment and dependencies"
        echo "  all      - Full setup (create + install + verify)"
        exit 1
        ;;
esac
