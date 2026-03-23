#!/bin/bash
# ASR Modernization Setup Script
# Target: conda env helios-gpu-118
# Models: Parakeet-TDT-0.6B-v3 (NeMo) & Qwen3-ASR-1.7B (vLLM)

set -e

echo "Starting ASR Native Dependencies Installation..."

# 1. Install NeMo ASR Toolkit for Parakeet
echo "Installing nemo_toolkit[asr]..."
conda run -n helios-gpu-118 pip install -U pip wheel setuptools
conda run -n helios-gpu-118 pip install -U "nemo_toolkit[asr]"

# 2. Install vLLM with audio support for Qwen3-ASR
echo "Installing vLLM and audio support..."
conda run -n helios-gpu-118 pip install -U vllm --pre
conda run -n helios-gpu-118 pip install "vllm[audio]"
conda run -n helios-gpu-118 pip install qwen-asr  # Local package path requirement

# 3. Create Model Directories
echo "Setting up model directories..."
mkdir -p ~/models/parakeet-tdt-0.6b-v3
mkdir -p ~/models/qwen3-asr-1.7b

echo ""
echo "========================================="
echo "Installation complete."
echo ""
echo "To download Parakeet-TDT:"
echo "wget -P ~/models/parakeet-tdt-0.6b-v3 https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/resolve/main/parakeet-tdt-0.6b-v3.nemo"
echo ""
echo "To download Qwen3-ASR:"
echo "huggingface-cli download Qwen/Qwen3-ASR-1.7B --local-dir ~/models/qwen3-asr-1.7b"
echo "========================================="
