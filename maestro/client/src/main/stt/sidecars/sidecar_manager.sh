#!/bin/bash
# ASR Sidecar Lifecycle Management
# Manages Parakeet and Qwen3 sidecar runtimes
# 
# Usage:
#   ./sidecar_manager.sh start <parakeet|qwen3|all>
#   ./sidecar_manager.sh stop <parakeet|qwen3|all>
#   ./sidecar_manager.sh restart <parakeet|qwen3|all>
#   ./sidecar_manager.sh status <parakeet|qwen3|all>
#   ./sidecar_manager.sh test <parakeet|qwen3>

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARAKEET_PORT=5001
Qwen3_PORT=5002
PARAKEET_MODEL_PATH="${HOME}/models/arqon/asr/parakeet-tdt-0.6b-v3"
Qwen3_MODEL_PATH="${HOME}/models/arqon/asr/qwen3-asr-1.7b"
PARAKEET_PID_FILE="/tmp/parakeet_sidecar.pid"
Qwen3_PID_FILE="/tmp/qwen3_sidecar.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if a process is running
is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
        # Stale PID file
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

# Start Parakeet sidecar
start_parakeet() {
    log_info "Starting Parakeet sidecar on port ${PARAKEET_PORT}..."
    
    if is_running "$PARAKEET_PID_FILE"; then
        log_warn "Parakeet sidecar already running (PID: $(cat $PARAKEET_PID_FILE))"
        return 0
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
    
    # Start sidecar in background
    # Note: Uses conda env helios-gpu-118 for protobuf 5.x isolation
    nohup conda run -n helios-gpu-118 python "${SCRIPT_DIR}/parakeet_sidecar.py" \
        --server \
        --model-path "$PARAKEET_MODEL_PATH" \
        --device cuda \
        --port "$PARAKEET_PORT" \
        > /tmp/parakeet_sidecar.log 2>&1 &
    
    local pid=$!
    echo $pid > "$PARAKEET_PID_FILE"
    
    # Wait for startup
    sleep 3
    
    if is_running "$PARAKEET_PID_FILE"; then
        log_info "Parakeet sidecar started (PID: $pid, Port: ${PARAKEET_PORT})"
        log_info "Log: /tmp/parakeet_sidecar.log"
    else
        log_error "Failed to start Parakeet sidecar"
        log_error "Check /tmp/parakeet_sidecar.log for details"
        return 1
    fi
}

# Start Qwen3 sidecar
start_qwen3() {
    log_info "Starting Qwen3 sidecar on port ${Qwen3_PORT}..."
    
    if is_running "$Qwen3_PID_FILE"; then
        log_warn "Qwen3 sidecar already running (PID: $(cat $Qwen3_PID_FILE))"
        return 0
    fi
    
    # Check model path exists
    if [ ! -d "$Qwen3_MODEL_PATH" ]; then
        log_error "Model path not found: ${Qwen3_MODEL_PATH}"
        log_info "Please download Qwen3 model first"
        return 1
    fi
    
    # Check if port is available
    if netstat -tuln 2>/dev/null | grep -q ":${Qwen3_PORT} " || ss -tuln 2>/dev/null | grep -q ":${Qwen3_PORT} "; then
        log_error "Port ${Qwen3_PORT} already in use"
        return 1
    fi
    
    # Start sidecar in background
    nohup conda run -n helios-gpu-118 python "${SCRIPT_DIR}/qwen3_sidecar.py" \
        --server \
        --model-path "$Qwen3_MODEL_PATH" \
        --device cuda \
        --port "$Qwen3_PORT" \
        > /tmp/qwen3_sidecar.log 2>&1 &
    
    local pid=$!
    echo $pid > "$Qwen3_PID_FILE"
    
    # Wait for startup
    sleep 3
    
    if is_running "$Qwen3_PID_FILE"; then
        log_info "Qwen3 sidecar started (PID: $pid, Port: ${Qwen3_PORT})"
        log_info "Log: /tmp/qwen3_sidecar.log"
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
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
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
    
    if is_running "$Qwen3_PID_FILE"; then
        local pid=$(cat "$Qwen3_PID_FILE")
        kill "$pid" 2>/dev/null || true
        
        # Wait for graceful shutdown
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "Forcing kill Qwen3 sidecar..."
            kill -9 "$pid" 2>/dev/null || true
        fi
        
        rm -f "$Qwen3_PID_FILE"
        log_info "Qwen3 sidecar stopped"
    else
        log_warn "Qwen3 sidecar not running"
    fi
}

# Status of sidecars
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

# Health check via HTTP
health_check() {
    local name=$1
    local port=$2
    
    if curl -s -f "http://localhost:${port}/transcribe" -X POST \
        -H "Content-Length: 0" 2>/dev/null; then
        echo -e "${GREEN}${name} health check: OK${NC}"
        return 0
    else
        echo -e "${RED}${name} health check: FAILED${NC}"
        return 1
    fi
}

# Zombie process reaper
reap_zombies() {
    log_info "Checking for zombie sidecar processes..."
    
    # Find any orphaned sidecar processes
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
        if [ -f "$Qwen3_PID_FILE" ]; then
            local stored_pid=$(cat "$Qwen3_PID_FILE")
            if [ "$pid" != "$stored_pid" ]; then
                log_warn "Found orphan Qwen3 process (PID: $pid), killing..."
                kill -9 "$pid" 2>/dev/null || true
            fi
        fi
    done
}

# Main command dispatcher
case "$1" in
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
        status_sidecar "Parakeet" "$PARAKEET_PID_FILE" "$PARAKEET_PORT"
        status_sidecar "Qwen3" "$Qwen3_PID_FILE" "$Qwen3_PORT"
        ;;
    test)
        case "$2" in
            parakeet)
                health_check "Parakeet" "$PARAKEET_PORT"
                ;;
            qwen3)
                health_check "Qwen3" "$Qwen3_PORT"
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
        echo ""
        echo "Usage: $0 <command> <target>"
        echo ""
        echo "Commands:"
        echo "  start <parakeet|qwen3|all>  - Start sidecar(s)"
        echo "  stop <parakeet|qwen3|all>   - Stop sidecar(s)"
        echo "  restart <parakeet|qwen3|all> - Restart sidecar(s)"
        echo "  status                       - Show status of all sidecars"
        echo "  test <parakeet|qwen3>        - Health check via HTTP"
        echo "  reap                         - Reap zombie processes"
        echo ""
        echo "Configuration:"
        echo "  Parakeet: Port ${PARAKEET_PORT}, Model: ${PARAKEET_MODEL_PATH}"
        echo "  Qwen3:    Port ${Qwen3_PORT}, Model: ${Qwen3_MODEL_PATH}"
        exit 1
        ;;
esac
