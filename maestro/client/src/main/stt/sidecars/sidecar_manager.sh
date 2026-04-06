#!/bin/bash
# ASR + Geometric Sidecar Lifecycle Management
# Manages geometric, Parakeet and Qwen3 sidecar runtimes in isolated env
#
# Usage:
#   ./sidecar_manager.sh start <geometric|parakeet|qwen3|all>
#   ./sidecar_manager.sh stop <geometric|parakeet|qwen3|all>
#   ./sidecar_manager.sh restart <geometric|parakeet|qwen3|all>
#   ./sidecar_manager.sh status <geometric|parakeet|qwen3|all>
#   ./sidecar_manager.sh test <geometric|parakeet|qwen3>
#   ./sidecar_manager.sh preflight <geometric|parakeet|qwen3|all>
#   ./sidecar_manager.sh warmup <geometric|parakeet|qwen3>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISOLATED_ENV="${MAESTRO_QWEN3_SIDECAR_ENV:-helios-asr-isolated}"
GEOMETRIC_PORT="${MAESTRO_H3_GEOMETRIC_PORT:-5003}"
PARAKEET_PORT=5001
QWEN3_PORT=5002
if [ -n "${MAESTRO_PARAKEET_MODEL_PATH:-}" ]; then
    PARAKEET_MODEL_PATH="${MAESTRO_PARAKEET_MODEL_PATH}"
elif [ -f "${HOME}/Projects/arqon/arqon-maestro-command/artifacts/models/parakeet-tdt_ctc-1.1b/parakeet-tdt_ctc-1.1b.nemo" ]; then
    PARAKEET_MODEL_PATH="${HOME}/Projects/arqon/arqon-maestro-command/artifacts/models/parakeet-tdt_ctc-1.1b/parakeet-tdt_ctc-1.1b.nemo"
else
    PARAKEET_MODEL_PATH="${HOME}/models/arqon/asr/parakeet-tdt-0.6b-v3"
fi
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
GEOMETRIC_PID_FILE="/tmp/geometric_sidecar.pid"
PARAKEET_PID_FILE="/tmp/parakeet_sidecar.pid"
QWEN3_PID_FILE="/tmp/qwen3_sidecar.pid"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

run_in_sidecar_python() {
    local -a clean_env=(env -u LD_LIBRARY_PATH)
    if [ -n "${SIDECAR_PYTHON_PATH}" ] && [ -x "${SIDECAR_PYTHON_PATH}" ]; then
        "${clean_env[@]}" "${SIDECAR_PYTHON_PATH}" "$@"
        return $?
    fi
    "${clean_env[@]}" conda run -n "${ISOLATED_ENV}" python "$@"
}

resolve_sidecar_python() {
    if [ -n "${SIDECAR_PYTHON_PATH}" ] && [ -x "${SIDECAR_PYTHON_PATH}" ]; then
        echo "${SIDECAR_PYTHON_PATH}"
        return 0
    fi

    local resolved
    resolved="$(
        conda run -n "${ISOLATED_ENV}" python -c 'import sys; print(sys.executable)' 2>/dev/null \
            | awk 'NF {print; exit}' || true
    )"
    if [ -n "${resolved}" ] && [ -x "${resolved}" ]; then
        echo "${resolved}"
        return 0
    fi
    return 1
}

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

is_port_listening() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":${port} " || ss -tuln 2>/dev/null | grep -q ":${port} "; then
        return 0
    fi
    return 1
}

get_listening_pid() {
    local port=$1
    local pid
    pid="$(ss -ltnp 2>/dev/null | awk -v p=":${port}" '$4 ~ p {print $NF}' | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | head -n 1)"
    if [ -n "${pid}" ]; then
        echo "${pid}"
    fi
}

parakeet_model_resolved_path() {
    local input_path="$1"
    if [ -f "$input_path" ]; then
        echo "$input_path"
        return 0
    fi
    if [ -d "$input_path" ]; then
        local nemo_file
        nemo_file="$(find "$input_path" -maxdepth 2 -type f -name '*.nemo' | head -n 1 || true)"
        if [ -n "$nemo_file" ] && [ -f "$nemo_file" ]; then
            echo "$nemo_file"
            return 0
        fi
    fi
    return 1
}

preflight_check() {
    local sidecar=$1
    local port=$2
    local model_path=$3
    local errors=0

    log_info "Running preflight checks for ${sidecar}..."

    if [ -n "${SIDECAR_PYTHON_PATH}" ]; then
        if [ -x "${SIDECAR_PYTHON_PATH}" ]; then
            log_info "✓ Using MAESTRO_QWEN3_PYTHON_PATH: ${SIDECAR_PYTHON_PATH}"
        else
            log_error "✗ MAESTRO_QWEN3_PYTHON_PATH is not executable: ${SIDECAR_PYTHON_PATH}"
            ((errors++))
        fi
    else
        if ! conda env list | grep -q "^${ISOLATED_ENV} "; then
            log_error "Conda environment '${ISOLATED_ENV}' not found"
            ((errors++))
        else
            log_info "✓ Environment '${ISOLATED_ENV}' exists"
        fi
    fi

    if [ "$sidecar" = "geometric" ]; then
        if run_in_sidecar_python -c "import numpy, libhume" 2>/dev/null; then
            log_info "✓ geometric runtime imports available"
        else
            log_error "✗ geometric runtime imports unavailable (need numpy + libhume)"
            ((errors++))
        fi
    elif [ "$sidecar" = "parakeet" ]; then
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
            log_error "✗ vllm not available"
            ((errors++))
        fi
    fi

    if [ "$sidecar" = "parakeet" ]; then
        local resolved_parakeet_model
        resolved_parakeet_model="$(parakeet_model_resolved_path "$model_path" || true)"
        if [ -n "$resolved_parakeet_model" ] && [ -f "$resolved_parakeet_model" ]; then
            log_info "✓ Parakeet model resolved: ${resolved_parakeet_model}"
        else
            log_error "✗ Parakeet model not found or invalid: ${model_path}"
            ((errors++))
        fi
    elif [ "$sidecar" = "qwen3" ]; then
        if [ -d "$model_path" ]; then
            log_info "✓ Model path exists"
        else
            log_error "✗ Model path not found: ${model_path}"
            ((errors++))
        fi
    fi

    if is_port_listening "${port}"; then
        log_warn "⚠ Port ${port} already in use"
    else
        log_info "✓ Port ${port} available"
    fi

    if [ $errors -gt 0 ]; then
        log_error "Preflight failed with ${errors} errors"
        return 1
    fi
    log_info "✓ Preflight checks passed for ${sidecar}"
}

warmup_sidecar() {
    local sidecar=$1
    local port=$2
    local attempts=${3:-24}
    local sleep_seconds=${4:-5}
    local endpoint="/health"
    if [ "$sidecar" = "parakeet" ] || [ "$sidecar" = "geometric" ]; then
        endpoint="/ready"
    fi

    log_info "Warming up ${sidecar} sidecar (${endpoint})..."
    local i
    for ((i=1; i<=attempts; i++)); do
        if curl -s -f "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
            log_info "✓ ${sidecar} warmup complete"
            return 0
        fi
        sleep "${sleep_seconds}"
    done

    log_warn "⚠ Warmup probe failed after ${attempts} attempts"
    local health_payload
    health_payload="$(curl -s "http://localhost:${port}/health" 2>/dev/null || true)"
    if [ -n "$health_payload" ]; then
        log_warn "Health payload: ${health_payload}"
    fi
    return 1
}

start_geometric() {
    log_info "Starting geometric sidecar on port ${GEOMETRIC_PORT}..."
    if curl -s -f "http://127.0.0.1:${GEOMETRIC_PORT}/ready" > /dev/null 2>&1; then
        local active_pid
        active_pid="$(get_listening_pid "${GEOMETRIC_PORT}")"
        if [ -n "${active_pid}" ]; then
            echo "${active_pid}" > "${GEOMETRIC_PID_FILE}"
            log_info "Geometric sidecar already ready (PID: ${active_pid}, Port: ${GEOMETRIC_PORT})"
        else
            log_info "Geometric sidecar already ready (Port: ${GEOMETRIC_PORT})"
        fi
        return 0
    fi
    if is_running "$GEOMETRIC_PID_FILE"; then
        log_warn "Geometric sidecar process exists but /ready is not healthy yet (PID: $(cat $GEOMETRIC_PID_FILE)); retrying warmup"
        if warmup_sidecar "geometric" "$GEOMETRIC_PORT" 6 2; then
            return 0
        fi
        log_warn "Geometric sidecar process did not become ready; restarting"
        stop_one "Geometric" "$GEOMETRIC_PID_FILE"
    fi
    if is_port_listening "${GEOMETRIC_PORT}"; then
        local occupied_pid
        occupied_pid="$(get_listening_pid "${GEOMETRIC_PORT}")"
        log_error "Port ${GEOMETRIC_PORT} is in use by PID ${occupied_pid:-unknown}, but /ready is failing"
        log_error "Resolve the conflicting process or stop it, then retry"
        return 1
    fi
    preflight_check "geometric" "$GEOMETRIC_PORT" "" || return 1
    if is_port_listening "${GEOMETRIC_PORT}"; then
        log_error "Port ${GEOMETRIC_PORT} already in use"
        return 1
    fi
    local sidecar_python
    sidecar_python="$(resolve_sidecar_python)" || {
        log_error "Failed to resolve python executable for env '${ISOLATED_ENV}'"
        return 1
    }
    nohup env -u LD_LIBRARY_PATH "${sidecar_python}" "${SCRIPT_DIR}/geometric_sidecar.py" --port "$GEOMETRIC_PORT" > /tmp/geometric_sidecar.log 2>&1 &
    local pid=$!
    echo $pid > "$GEOMETRIC_PID_FILE"
    sleep 2
    if is_running "$GEOMETRIC_PID_FILE"; then
        log_info "Geometric sidecar started (PID: $pid, Port: ${GEOMETRIC_PORT})"
        log_info "Log: /tmp/geometric_sidecar.log"
        warmup_sidecar "geometric" "$GEOMETRIC_PORT" || log_warn "Geometric sidecar started but is not ready yet"
    else
        log_error "Failed to start geometric sidecar"
        return 1
    fi
}

start_parakeet() {
    log_info "Starting Parakeet sidecar on port ${PARAKEET_PORT}..."
    if is_running "$PARAKEET_PID_FILE"; then
        log_warn "Parakeet sidecar already running (PID: $(cat $PARAKEET_PID_FILE))"
        return 0
    fi
    preflight_check "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH" || return 1
    local resolved_parakeet_model
    resolved_parakeet_model="$(parakeet_model_resolved_path "$PARAKEET_MODEL_PATH" || true)"
    if [ -z "$resolved_parakeet_model" ] || [ ! -f "$resolved_parakeet_model" ]; then
        log_error "Parakeet model not found or invalid: ${PARAKEET_MODEL_PATH}"
        return 1
    fi
    if netstat -tuln 2>/dev/null | grep -q ":${PARAKEET_PORT} " || ss -tuln 2>/dev/null | grep -q ":${PARAKEET_PORT} "; then
        log_error "Port ${PARAKEET_PORT} already in use"
        return 1
    fi
    local sidecar_python
    sidecar_python="$(resolve_sidecar_python)" || {
        log_error "Failed to resolve python executable for env '${ISOLATED_ENV}'"
        return 1
    }
    nohup env -u LD_LIBRARY_PATH "${sidecar_python}" "${SCRIPT_DIR}/parakeet_sidecar.py" --server --model-path "$resolved_parakeet_model" --device cuda --port "$PARAKEET_PORT" > /tmp/parakeet_sidecar.log 2>&1 &
    local pid=$!
    echo $pid > "$PARAKEET_PID_FILE"
    sleep 5
    if is_running "$PARAKEET_PID_FILE"; then
        log_info "Parakeet sidecar started (PID: $pid, Port: ${PARAKEET_PORT})"
        log_info "Log: /tmp/parakeet_sidecar.log"
        warmup_sidecar "parakeet" "$PARAKEET_PORT" || log_warn "Parakeet sidecar started but is not healthy yet"
    else
        log_error "Failed to start Parakeet sidecar"
        return 1
    fi
}

start_qwen3() {
    log_info "Starting Qwen3 sidecar on port ${QWEN3_PORT}..."
    if is_running "$QWEN3_PID_FILE"; then
        log_warn "Qwen3 sidecar already running (PID: $(cat $QWEN3_PID_FILE))"
        return 0
    fi
    preflight_check "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH" || return 1
    if [ ! -d "$QWEN3_MODEL_PATH" ]; then
        log_error "Model path not found: ${QWEN3_MODEL_PATH}"
        return 1
    fi
    if netstat -tuln 2>/dev/null | grep -q ":${QWEN3_PORT} " || ss -tuln 2>/dev/null | grep -q ":${QWEN3_PORT} "; then
        log_error "Port ${QWEN3_PORT} already in use"
        return 1
    fi
    local sidecar_python
    sidecar_python="$(resolve_sidecar_python)" || {
        log_error "Failed to resolve python executable for env '${ISOLATED_ENV}'"
        return 1
    }
    nohup env -u LD_LIBRARY_PATH "${sidecar_python}" "${SCRIPT_DIR}/qwen3_sidecar.py" --server --model-path "$QWEN3_MODEL_PATH" --device "${QWEN3_DEVICE}" --port "$QWEN3_PORT" > /tmp/qwen3_sidecar.log 2>&1 &
    local pid=$!
    echo $pid > "$QWEN3_PID_FILE"
    sleep 5
    if is_running "$QWEN3_PID_FILE"; then
        log_info "Qwen3 sidecar started (PID: $pid, Port: ${QWEN3_PORT})"
        log_info "Log: /tmp/qwen3_sidecar.log"
        warmup_sidecar "qwen3" "$QWEN3_PORT" || log_warn "Qwen3 sidecar started but is not healthy yet"
    else
        log_error "Failed to start Qwen3 sidecar"
        return 1
    fi
}

stop_one() {
    local name=$1
    local pid_file=$2
    log_info "Stopping ${name} sidecar..."
    if is_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        kill "$pid" 2>/dev/null || true
        local count=0
        while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do sleep 1; count=$((count + 1)); done
        if kill -0 "$pid" 2>/dev/null; then kill -9 "$pid" 2>/dev/null || true; fi
        rm -f "$pid_file"
        log_info "${name} sidecar stopped"
    else
        log_warn "${name} sidecar not running"
    fi
}

status_sidecar() {
    local name=$1
    local pid_file=$2
    local port=$3
    if is_running "$pid_file"; then
        echo -e "${GREEN}${name}: RUNNING${NC} (PID: $(cat $pid_file), Port: $port)"
    else
        echo -e "${RED}${name}: STOPPED${NC} (Port: $port)"
    fi
}

health_check() {
    local name=$1
    local port=$2
    if curl -s -f "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}${name} health: OK${NC}"
    else
        echo -e "${RED}${name} health: FAILED${NC}"
        return 1
    fi
}

case "$1" in
    preflight)
        case "$2" in
            geometric) preflight_check "geometric" "$GEOMETRIC_PORT" "" ;;
            parakeet) preflight_check "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH" ;;
            qwen3) preflight_check "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH" ;;
            all)
                preflight_check "geometric" "$GEOMETRIC_PORT" ""
                preflight_check "parakeet" "$PARAKEET_PORT" "$PARAKEET_MODEL_PATH"
                preflight_check "qwen3" "$QWEN3_PORT" "$QWEN3_MODEL_PATH"
                ;;
            *) echo "Usage: $0 preflight <geometric|parakeet|qwen3|all>"; exit 1 ;;
        esac
        ;;
    warmup)
        case "$2" in
            geometric) warmup_sidecar "geometric" "$GEOMETRIC_PORT" ;;
            parakeet) warmup_sidecar "parakeet" "$PARAKEET_PORT" ;;
            qwen3) warmup_sidecar "qwen3" "$QWEN3_PORT" ;;
            *) echo "Usage: $0 warmup <geometric|parakeet|qwen3>"; exit 1 ;;
        esac
        ;;
    start)
        case "$2" in
            geometric) start_geometric ;;
            parakeet) start_parakeet ;;
            qwen3) start_qwen3 ;;
            all) start_geometric && start_parakeet && start_qwen3 ;;
            *) echo "Usage: $0 start <geometric|parakeet|qwen3|all>"; exit 1 ;;
        esac
        ;;
    stop)
        case "$2" in
            geometric) stop_one "Geometric" "$GEOMETRIC_PID_FILE" ;;
            parakeet) stop_one "Parakeet" "$PARAKEET_PID_FILE" ;;
            qwen3) stop_one "Qwen3" "$QWEN3_PID_FILE" ;;
            all)
                stop_one "Geometric" "$GEOMETRIC_PID_FILE"
                stop_one "Parakeet" "$PARAKEET_PID_FILE"
                stop_one "Qwen3" "$QWEN3_PID_FILE"
                ;;
            *) echo "Usage: $0 stop <geometric|parakeet|qwen3|all>"; exit 1 ;;
        esac
        ;;
    restart)
        case "$2" in
            geometric) stop_one "Geometric" "$GEOMETRIC_PID_FILE" && sleep 2 && start_geometric ;;
            parakeet) stop_one "Parakeet" "$PARAKEET_PID_FILE" && sleep 2 && start_parakeet ;;
            qwen3) stop_one "Qwen3" "$QWEN3_PID_FILE" && sleep 2 && start_qwen3 ;;
            all)
                stop_one "Geometric" "$GEOMETRIC_PID_FILE"
                stop_one "Parakeet" "$PARAKEET_PID_FILE"
                stop_one "Qwen3" "$QWEN3_PID_FILE"
                sleep 2
                start_geometric && start_parakeet && start_qwen3
                ;;
            *) echo "Usage: $0 restart <geometric|parakeet|qwen3|all>"; exit 1 ;;
        esac
        ;;
    status)
        status_sidecar "Geometric" "$GEOMETRIC_PID_FILE" "$GEOMETRIC_PORT"
        status_sidecar "Parakeet" "$PARAKEET_PID_FILE" "$PARAKEET_PORT"
        status_sidecar "Qwen3" "$QWEN3_PID_FILE" "$QWEN3_PORT"
        ;;
    test)
        case "$2" in
            geometric) health_check "Geometric" "$GEOMETRIC_PORT" ;;
            parakeet) health_check "Parakeet" "$PARAKEET_PORT" ;;
            qwen3) health_check "Qwen3" "$QWEN3_PORT" ;;
            *) echo "Usage: $0 test <geometric|parakeet|qwen3>"; exit 1 ;;
        esac
        ;;
    *)
        echo "ASR + Geometric Sidecar Lifecycle Management"
        echo "Environment: ${ISOLATED_ENV}"
        echo ""
        echo "Usage: $0 <command> <target>"
        echo "Commands: preflight, warmup, start, stop, restart, status, test"
        echo "Targets: geometric, parakeet, qwen3, all"
        exit 1
        ;;
esac
