#!/bin/bash
# ASR Sidecar Lifecycle Management
# Manages Parakeet and Qwen3 sidecar runtimes in isolated env
# 
# Environment: helios-asr-isolated (separate from frozen helios-gpu-118)
# 
# Usage:
#   ./sidecar_manager.sh start <parakeet|qwen3|all>
#   ./sidecar_manager.sh stop <parakeet|qwen3|all>
#   ./sidecar_manager.sh restart <parakeet|qwen3|all>
#   ./sidecar_manager.sh status <parakeet|qwen3|all>
#   ./sidecar_manager.sh test <parakeet|qwen3>
#   ./sidecar_manager.sh preflight <parakeet|qwen3|all>
#   ./sidecar_manager.sh warmup <parakeet|qwen3>

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISOLATED_ENV="${MAESTRO_QWEN3_SIDECAR_ENV:-helios-gpu-118}"
PARAKEET_PORT=5001
QWEN3_PORT=5002
PARAKEET_MODEL_PATH="${HOME}/models/arqon/asr/parakeet-tdt-0.6b-v3"
if [ -n "${MAESTRO_QWEN3_MODEL_PATH:-}" ]; then
    QWEN3_MODEL_PATH="${MAESTRO_QWEN3_MODEL_PATH}"
elif [ -d "${HOME}/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-0.6B" ]; then
    QWEN3_MODEL_PATH="${HOME}/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-0.6B"
elif [ -d "${HOME}/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-1.7B" ]; then
    QWEN3_MODEL_PATH="${HOME}/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-1.7B"
else
    QWEN3_MODEL_PATH="${HOME}/models/arqon/asr/qwen3-asr-1.7b"
fi
QWEN3_DEVICE="${MAESTRO_QWEN3_DEVICE:-cuda}"
SIDECAR_PYTHON_PATH="${MAESTRO_QWEN3_PYTHON_PATH:-}"
PARAKEET_PID_FILE="/tmp/parakeet_sidecar.pid"
QWEN3_PID_FILE="/tmp/qwen3_sidecar.pid"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

run_in_sidecar_python() {
    if [ -n "${SIDECAR_PYTHON_PATH}" ] && [ -x "${SIDECAR_PYTHON_PATH}" ]; then
        "${SIDECAR_PYTHON_PATH}" "$@"
        return $?
    fi
    conda run -n "${ISOLATED_ENV}" python "$@"
}

# Check if a process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        rm -f "$pid_file"
    fi
    return 1
}

# Get PID of running sidecar
get_pid() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        fi
    fi
    return 1
}

# Preflight checks
preflight_check() {
    local sidecar=$1
    local port=$2
    local model_path=$3
    local errors=0
    
    log_info "Running preflight checks for ${sidecar}..."
    
    if [ -n "${SIDECAR_PYTHON_PATH}" ]; then
        log_info "Checking explicit sidecar python path..."
        if [ -x "${SIDECAR_PYTHON_PATH}" ]; then
            log_info "✓ Using MAESTRO_QWEN3_PYTHON_PATH: ${SIDECAR_PYTHON_PATH}"
        else
            log_error "✗ MAESTRO_QWEN3_PYTHON_PATH is not executable: ${SIDECAR_PYTHON_PATH}"
            ((errors++))
        fi
    else
        # Check isolated env exists
        log_info "Checking conda environment '${ISOLATED_ENV}'..."
        if ! conda env list | grep -q "^${ISOLATED_ENV} "; then
            log_error "Conda environment '${ISOLATED_ENV}' not found"
            log_info "Set MAESTRO_QWEN3_PYTHON_PATH or run: ./setup_isolated_env.sh all"
            ((errors++))
        else
            log_info "✓ Environment '${ISOLATED_ENV}' exists"
        fi
    fi
    
    # Check CUDA visibility
    log_info "Checking CUDA visibility..."
    if run_in_sidecar_python -c "import torch; assert torch.cuda.is_available()" 2>/dev/null; then
        log_info "✓ CUDA available"
    else
        log_warn "⚠ CUDA not available (will run on CPU)"
    fi
    
    # Check required imports
    log_info "Checking Python imports..."
        if [ "$sidecar" = "parakeet" ]; then
        if run_in_sidecar_python -c "import nemo" 2>/dev/null; then
            log_info "✓ nemo available"
        else
            log_error "✗ nemo not available"
            ((errors++))
        fi
    elif [ "$sidecar" = "qwen3" ]; then
        if run_in_sidecar_python -c "import vllm" 2>/dev/null; then
            log_info "✓ vllm available"
        else
            log_error "✗ vllm not available (required for qwen3 sidecar)"
            ((errors++))
        fi
    fi
    
    # Check model path exists
    log_info "Checking model path: ${model_path}..."
    if [ -d "$model_path" ]; then
        log_info "✓ Model path exists"
    else
        log_error "✗ Model path not found: ${model_path}"
        ((errors++))
    fi
    
    # Check port availability
    log_info "Checking port ${port} availability..."
    if netstat -tuln 2>/dev/null | grep -q ":${port} " || ss -tuln 2>/dev/null | grep -q ":${port} "; then
        log_warn "⚠ Port ${port} already in use"
    else
        log_info "✓ Port ${port} available"
    fi
    
    if [ $errors -gt 0 ]; then
        log_error "Preflight failed with ${errors} errors"
        return 1
    fi
    
    log_info "✓ Preflight checks passed for ${sidecar}"
    return 0
}

# Warmup sidecar (lightweight readiness probe)
warmup_sidecar() {
    local sidecar=$1
    local port=$2
    local attempts=${3:-24}
    local sleep_seconds=${4:-5}

    log_info "Warming up ${sidecar} sidecar..."
    local i
    for ((i=1; i<=attempts; i++)); do
        if curl -s -f "http://localhost:${port}/health" > /dev/null 2>&1; then
            log_info "✓ ${sidecar} warmup complete"
            return 0
        fi
        sleep "${sleep_seconds}"
    done

    log_warn "⚠ Warmup probe failed after ${attempts} attempts"
    return 1
}

# Start Parakeet sidecar
start_parakeet() {
    log_info "Starting Parakeet sidecar on port ${PARAKEET_PORT}..."
    
    if is_running "$PARAKEET_PID_FILE"; then
        log_warn "Parakeet sidecar already running (PID: $(cat $PARAKEET_PID_FILE))"
        return 0
    fi
    
    # Run preflight
    if ! preflight_check "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH"; then
        return 1
    fi
    
    # Check model path exists
    if [ ! -d "$PARAKEET_MODEL_PATH" ]; then
        log_error "Model path not found: ${PARAKEET_MODEL_PATH}"
        log_info "Please download Parakeet model first"
        return 1
    fi
    
    # Check if port is available
    if netstat -tuln 2>/dev/null | grep -q ":${PARAKEET_PORT} " || ss -tuln 2>/dev/null | grep -q ":${PARAKEET_PORT} "; then
        log_error "Port ${PARAKEET_PORT} already in use"
        return 1
    fi
    
    # Start sidecar in isolated environment
    if [ -n "${SIDECAR_PYTHON_PATH}" ] && [ -x "${SIDECAR_PYTHON_PATH}" ]; then
        nohup "${SIDECAR_PYTHON_PATH}" "${SCRIPT_DIR}/parakeet_sidecar.py" \
            --server \
            --model-path "$PARAKEET_MODEL_PATH" \
            --device cuda \
            --port "$PARAKEET_PORT" \
            > /tmp/parakeet_sidecar.log 2>&1 &
    else
        nohup conda run -n "${ISOLATED_ENV}" python "${SCRIPT_DIR}/parakeet_sidecar.py" \
            --server \
            --model-path "$PARAKEET_MODEL_PATH" \
            --device cuda \
            --port "$PARAKEET_PORT" \
            > /tmp/parakeet_sidecar.log 2>&1 &
    fi
    
    local pid=$!
    echo $pid > "$PARAKEET_PID_FILE"
    
    # Wait for startup (model preload)
    log_info "Waiting for model to load (this may take a minute)..."
    sleep 5
    
    if is_running "$PARAKEET_PID_FILE"; then
        log_info "Parakeet sidecar started (PID: $pid, Port: ${PARAKEET_PORT})"
        log_info "Log: /tmp/parakeet_sidecar.log"
        
        # Run warmup
        if ! warmup_sidecar "parakeet" "$PARAKEET_PORT"; then
            log_warn "Parakeet started but is not healthy yet; check /tmp/parakeet_sidecar.log"
        fi
    else
        log_error "Failed to start Parakeet sidecar"
        log_error "Check /tmp/parakeet_sidecar.log for details"
        return 1
    fi
}

# Start Qwen3 sidecar
start_qwen3() {
    log_info "Starting Qwen3 sidecar on port ${QWEN3_PORT}..."
    
    if is_running "$QWEN3_PID_FILE"; then
        log_warn "Qwen3 sidecar already running (PID: $(cat $QWEN3_PID_FILE))"
        return 0
    fi
    
    # Run preflight
    if ! preflight_check "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH"; then
        return 1
    fi
    
    # Check model path exists
    if [ ! -d "$QWEN3_MODEL_PATH" ]; then
        log_error "Model path not found: ${QWEN3_MODEL_PATH}"
        log_info "Please download Qwen3 model first"
        return 1
    fi
    
    # Check if port is available
    if netstat -tuln 2>/dev/null | grep -q ":${QWEN3_PORT} " || ss -tuln 2>/dev/null | grep -q ":${QWEN3_PORT} "; then
        log_error "Port ${QWEN3_PORT} already in use"
        return 1
    fi
    
    # Start sidecar in isolated environment
    if [ -n "${SIDECAR_PYTHON_PATH}" ] && [ -x "${SIDECAR_PYTHON_PATH}" ]; then
        nohup "${SIDECAR_PYTHON_PATH}" "${SCRIPT_DIR}/qwen3_sidecar.py" \
            --server \
            --model-path "$QWEN3_MODEL_PATH" \
            --device "${QWEN3_DEVICE}" \
            --port "$QWEN3_PORT" \
            > /tmp/qwen3_sidecar.log 2>&1 &
    else
        nohup conda run -n "${ISOLATED_ENV}" python "${SCRIPT_DIR}/qwen3_sidecar.py" \
            --server \
            --model-path "$QWEN3_MODEL_PATH" \
            --device "${QWEN3_DEVICE}" \
            --port "$QWEN3_PORT" \
            > /tmp/qwen3_sidecar.log 2>&1 &
    fi
    
    local pid=$!
    echo $pid > "$QWEN3_PID_FILE"
    
    # Wait for startup (model preload)
    log_info "Waiting for model to load (this may take a minute)..."
    sleep 5
    
    if is_running "$QWEN3_PID_FILE"; then
        log_info "Qwen3 sidecar started (PID: $pid, Port: ${QWEN3_PORT})"
        log_info "Log: /tmp/qwen3_sidecar.log"
        
        # Run warmup
        if ! warmup_sidecar "qwen3" "$QWEN3_PORT"; then
            log_warn "Qwen3 started but is not healthy yet; check /tmp/qwen3_sidecar.log"
        fi
    else
        log_error "Failed to start Qwen3 sidecar"
        log_error "Check /tmp/qwen3_sidecar.log for details"
        return 1
    fi
}

# Stop Parakeet sidecar
stop_parakeet() {
    log_info "Stopping Parakeet sidecar..."
    
    if is_running "$PARAKEET_PID_FILE"; then
        local pid=$(cat "$PARAKEET_PID_FILE")
        kill "$pid" 2>/dev/null || true
        
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "Forcing kill Parakeet sidecar..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        rm -f "$PARAKEET_PID_FILE"
        log_info "Parakeet sidecar stopped"
    else
        log_warn "Parakeet sidecar not running"
    fi
}

# Stop Qwen3 sidecar
stop_qwen3() {
    log_info "Stopping Qwen3 sidecar..."
    
    if is_running "$QWEN3_PID_FILE"; then
        local pid=$(cat "$QWEN3_PID_FILE")
        kill "$pid" 2>/dev/null || true
        
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "Forcing kill Qwen3 sidecar..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        rm -f "$QWEN3_PID_FILE"
        log_info "Qwen3 sidecar stopped"
    else
        log_warn "Qwen3 sidecar not running"
    fi
}

# Status
status_sidecar() {
    local name=$1
    local pid_file=$2
    local port=$3
    
    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        echo -e "${GREEN}${name}: RUNNING${NC} (PID: $pid, Port: $port)"
        return 0
    else
        echo -e "${RED}${name}: STOPPED${NC} (Port: $port)"
        return 1
    fi
}

# Health check
health_check() {
    local name=$1
    local port=$2
    
    if curl -s -f "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}${name} health: OK${NC}"
        return 0
    else
        echo -e "${RED}${name} health: FAILED${NC}"
        return 1
    fi
}

# Zombie reaper
reap_zombies() {
    log_info "Checking for zombie sidecar processes..."
    
    local orphans=$(pgrep -f "parakeet_sidecar.py" 2>/dev/null || true)
    for pid in $orphans; do
        if [ -f "$PARAKEET_PID_FILE" ]; then
            local stored_pid=$(cat "$PARAKEET_PID_FILE")
            if [ "$pid" != "$stored_pid" ]; then
                log_warn "Found orphan Parakeet process (PID: $pid), killing..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    done
    
    orphans=$(pgrep -f "qwen3_sidecar.py" 2>/dev/null || true)
    for pid in $orphans; do
        if [ -f "$QWEN3_PID_FILE" ]; then
            local stored_pid=$(cat "$QWEN3_PID_FILE")
            if [ "$pid" != "$stored_pid" ]; then
                log_warn "Found orphan Qwen3 process (PID: $pid), killing..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    done
}

# Main
case "$1" in
    preflight)
        case "$2" in
            parakeet)
                preflight_check "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH"
                ;;
            qwen3)
                preflight_check "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH"
                ;;
            all)
                preflight_check "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH"
                preflight_check "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH"
                ;;
            *)
                echo "Usage: $0 preflight <parakeet|qwen3|all>"
                exit 1
                ;;
        esac
        ;;
    warmup)
        case "$2" in
            parakeet)
                warmup_sidecar "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH"
                ;;
            qwen3)
                warmup_sidecar "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH"
                ;;
            *)
                echo "Usage: $0 warmup <parakeet|qwen3>"
                exit 1
                ;;
        esac
        ;;
    start)
        case "$2" in
            parakeet)
                start_parakeet
                ;;
            qwen3)
                start_qwen3
                ;;
            all)
                start_parakeet && start_qwen3
                ;;
            *)
                echo "Usage: $0 start <parakeet|qwen3|all>"
                exit 1
                ;;
        esac
        ;;
    stop)
        case "$2" in
            parakeet)
                stop_parakeet
                ;;
            qwen3)
                stop_qwen3
                ;;
            all)
                stop_parakeet && stop_qwen3
                ;;
            *)
                echo "Usage: $0 stop <parakeet|qwen3|all>"
                exit 1
                ;;
        esac
        ;;
    restart)
        case "$2" in
            parakeet)
                stop_parakeet && sleep 2 && start_parakeet
                ;;
            qwen3)
                stop_qwen3 && sleep 2 && start_qwen3
                ;;
            all)
                stop_parakeet && stop_qwen3 && sleep 2 && start_parakeet && start_qwen3
                ;;
            *)
                echo "Usage: $0 restart <parakeet|qwen3|all>"
                exit 1
                ;;
        esac
        ;;
    status)
        status_sidecar "Parakeet" "$PARAKEET_PID_FILE" "$PARAKEET_PORT" || true
        status_sidecar "Qwen3" "$QWEN3_PID_FILE" "$QWEN3_PORT" || true
        ;;
    test)
        case "$2" in
            parakeet)
                health_check "Parakeet" "$PARAKEET_PORT"
                ;;
            qwen3)
                health_check "Qwen3" "$QWEN3_PORT"
                ;;
            *)
                echo "Usage: $0 test <parakeet|qwen3>"
                exit 1
                ;;
        esac
        ;;
    reap)
        reap_zombies
        ;;
    *)
        echo "ASR Sidecar Lifecycle Management"
        echo "Environment: ${ISOLATED_ENV} (isolated from frozen helios-gpu-118)"
        echo ""
        echo "Usage: $0 <command> <target>"
        echo ""
        echo "Commands:"
        echo "  preflight <parakeet|qwen3|all>  - Run preflight checks"
        echo "  warmup <parakeet|qwen3>         - Warmup sidecar"
        echo "  start <parakeet|qwen3|all>      - Start sidecar(s)"
        echo "  stop <parakeet|qwen3|all>       - Stop sidecar(s)"
        echo "  restart <parakeet|qwen3|all>    - Restart sidecar(s)"
        echo "  status                         - Show status"
        echo "  test <parakeet|qwen3>           - Health check"
        echo "  reap                           - Reap zombie processes"
        echo ""
        echo "Configuration:"
        echo "  Parakeet: Port ${PARAKEET_PORT}, Model: ${PARAKEET_MODEL_PATH}"
        echo "  Qwen3:    Port ${QWEN3_PORT}, Model: ${QWEN3_MODEL_PATH}"
        echo "  Isolated env: ${ISOLATED_ENV}"
        exit 1
        ;;
esac
