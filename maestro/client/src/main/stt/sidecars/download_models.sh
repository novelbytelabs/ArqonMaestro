#!/bin/bash
# ASR Model Download Script
# Downloads Parakeet and Qwen3 ASR models to isolated storage
# 
# Target: ~/models/arqon/asr/
# 
# Usage:
#   ./download_models.sh parakeet
#   ./download_models.sh qwen3
#   ./download_models.sh all

set -e

# Isolated storage path
MODEL_BASE="${HOME}/models/arqon/asr"
PARAKEET_DIR="${MODEL_BASE}/parakeet-tdt-0.6b-v3"
Qwen3_DIR="${MODEL_BASE}/qwen3-asr-1.7b"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create directories
setup_dirs() {
    log_info "Creating model directories..."
    mkdir -p "$PARAKEET_DIR"
    mkdir -p "$Qwen3_DIR"
    log_info "Model base: ${MODEL_BASE}"
}

# Download Parakeet model
download_parakeet() {
    log_info "Downloading Parakeet-TDT-0.6B-v3..."
    
    # Check if already downloaded
    if [ -f "${PARAKEET_DIR}/parakeet-tdt-0.6b-v3.nemo" ]; then
        log_warn "Parakeet model already exists, skipping download"
        return 0
    fi
    
    # Try huggingface-cli first (preferred)
    if command -v huggingface-cli &> /dev/null; then
        huggingface-cli download nvidia/parakeet-tdt-0.6b-v3 \
            --local-dir "$PARAKEET_DIR"
    else
        # Fallback to wget
        log_warn "huggingface-cli not found, using wget"
        cd "$PARAKEET_DIR"
        wget -O parakeet-tdt-0.6b-v3.nemo \
            "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/resolve/main/parakeet-tdt-0.6b-v3.nemo"
    fi
    
    # Verify download
    if [ -f "${PARAKEET_DIR}/parakeet-tdt-0.6b-v3.nemo" ]; then
        log_info "Parakeet model downloaded successfully"
    else
        log_error "Failed to download Parakeet model"
        return 1
    fi
}

# Download Qwen3 ASR model
download_qwen3() {
    log_info "Downloading Qwen3-ASR-1.7B..."
    
    # Check if already downloaded
    if [ -d "$Qwen3_DIR" ] && [ "$(ls -A $Qwen3_DIR)" ]; then
        log_warn "Qwen3 model directory exists, skipping download"
        return 0
    fi
    
    # Try huggingface-cli
    if command -v huggingface-cli &> /dev/null; then
        huggingface-cli download Qwen/Qwen3-ASR-1.7B \
            --local-dir "$Qwen3_DIR"
    else
        log_error "huggingface-cli not found - please install huggingface-hub"
        return 1
    fi
    
    # Verify download
    if [ -d "$Qwen3_DIR" ] && [ "$(ls -A $Qwen3_DIR)" ]; then
        log_info "Qwen3 model downloaded successfully"
    else
        log_error "Failed to download Qwen3 model"
        return 1
    fi
}

# Main
case "$1" in
    parakeet)
        setup_dirs
        download_parakeet
        ;;
    qwen3)
        setup_dirs
        download_qwen3
        ;;
    all)
        setup_dirs
        download_parakeet
        download_qwen3
        ;;
    *)
        echo "ASR Model Download Script"
        echo ""
        echo "Usage: $0 <parakeet|qwen3|all>"
        echo ""
        echo "Target directories:"
        echo "  Parakeet: ${PARAKEET_DIR}"
        echo "  Qwen3:    ${Qwen3_DIR}"
        exit 1
        ;;
esac
