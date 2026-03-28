#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASR_ROOT_DEFAULT="$HOME/Projects/arqon/arqon-maestro-asr"
ASR_ROOT="${MAESTRO_QWEN3_PROJECT_ROOT:-$ASR_ROOT_DEFAULT}"
PYTHON_BIN="${MAESTRO_QWEN3_PYTHON_PATH:-$HOME/miniconda3/envs/helios-gpu-118/bin/python}"

LOCAL_FALLBACK_BRIDGE="$ROOT_DIR/src/main/stt/qwen3_asr_bridge.py"
EXTERNAL_BRIDGE="$ASR_ROOT/scripts/maestro_qwen3_bridge.py"
BRIDGE_PATH="${MAESTRO_QWEN3_BRIDGE_PATH:-}"
if [[ -z "$BRIDGE_PATH" ]]; then
  if [[ -f "$EXTERNAL_BRIDGE" ]]; then
    BRIDGE_PATH="$EXTERNAL_BRIDGE"
  else
    BRIDGE_PATH="$LOCAL_FALLBACK_BRIDGE"
  fi
fi

MODEL_SIZE="${MAESTRO_QWEN3_MODEL_SIZE:-0.6b}"
MODEL_PATH="${MAESTRO_QWEN3_MODEL_PATH:-$ASR_ROOT/models/upstream/Qwen3-ASR-${MODEL_SIZE^^}}"
DEVICE="${MAESTRO_QWEN3_DEVICE:-cpu}"
MODE="${MAESTRO_QWEN3_MODE:-local}"

SEQ_RUNS="${MAESTRO_QWEN3_HARDENING_SEQ_RUNS:-100}"
PAR_RUNS="${MAESTRO_QWEN3_HARDENING_PAR_RUNS:-50}"
PAR_WORKERS="${MAESTRO_QWEN3_HARDENING_PAR_WORKERS:-8}"

TMP_DIR="$(mktemp -d -t maestro_qwen3_harden_XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

info() {
  echo "[INFO] $*"
}

require_paths() {
  [[ -x "$PYTHON_BIN" ]] || fail "python not executable: $PYTHON_BIN"
  [[ -f "$BRIDGE_PATH" ]] || fail "bridge script not found: $BRIDGE_PATH"
}

validate_json_file() {
  local output_file="$1"
  local expect_error="${2:-}"
  python3 - "$output_file" "$expect_error" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
expect_error = sys.argv[2]
lines = [line.strip() for line in path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip()]
if len(lines) != 1:
    print(f"expected exactly one stdout JSON line, got {len(lines)}", file=sys.stderr)
    sys.exit(2)
try:
    payload = json.loads(lines[0])
except Exception as exc:
    print(f"stdout JSON parse failed: {exc}", file=sys.stderr)
    sys.exit(3)
if not isinstance(payload, dict) or not isinstance(payload.get("ok"), bool):
    print("missing required 'ok' boolean in payload", file=sys.stderr)
    sys.exit(4)
if expect_error:
    if payload.get("ok") is not False:
        print("expected failure payload but got ok=true", file=sys.stderr)
        sys.exit(5)
    if payload.get("error") != expect_error:
        print(f"expected error='{expect_error}', got '{payload.get('error')}'", file=sys.stderr)
        sys.exit(6)
print("ok")
PY
}

run_contract_probes() {
  info "Phase A: contract probes"

  local help_out="$TMP_DIR/help.txt"
  PYTHONPATH="$ASR_ROOT/src" "$PYTHON_BIN" "$BRIDGE_PATH" --help >"$help_out"
  grep -q -- "--stdin" "$help_out" || fail "--help missing --stdin"
  grep -q -- "--model-path" "$help_out" || fail "--help missing --model-path"
  grep -q -- "--mode" "$help_out" || fail "--help missing --mode"

  local empty_stdout="$TMP_DIR/empty.stdout"
  local empty_stderr="$TMP_DIR/empty.stderr"
  set +e
  PYTHONPATH="$ASR_ROOT/src" "$PYTHON_BIN" "$BRIDGE_PATH" \
    --stdin --model-path dummy --mode local --device cpu \
    >"$empty_stdout" 2>"$empty_stderr" < /dev/null
  local rc=$?
  set -e
  [[ $rc -ne 0 ]] || fail "empty stdin probe expected non-zero exit"
  validate_json_file "$empty_stdout" "empty_audio" >/dev/null

  local malformed_in="$TMP_DIR/malformed.bin"
  printf 'RIFF_NOT_A_REAL_WAV' >"$malformed_in"
  local malformed_stdout="$TMP_DIR/malformed.stdout"
  local malformed_stderr="$TMP_DIR/malformed.stderr"
  set +e
  PYTHONPATH="$ASR_ROOT/src" "$PYTHON_BIN" "$BRIDGE_PATH" \
    --stdin --model-path dummy --mode local --device cpu \
    >"$malformed_stdout" 2>"$malformed_stderr" < "$malformed_in"
  rc=$?
  set -e
  [[ $rc -ne 0 ]] || fail "malformed audio probe expected non-zero exit"
  validate_json_file "$malformed_stdout" "audio_format_invalid" >/dev/null

  local tiny_wav="$TMP_DIR/tiny.wav"
  python3 - "$tiny_wav" <<'PY'
import wave
import struct
import sys
path = sys.argv[1]
with wave.open(path, "wb") as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    wf.writeframes(struct.pack("<h", 0) * 1600)
PY

  local missing_model_stdout="$TMP_DIR/missing_model.stdout"
  local missing_model_stderr="$TMP_DIR/missing_model.stderr"
  set +e
  PYTHONPATH="$ASR_ROOT/src" "$PYTHON_BIN" "$BRIDGE_PATH" \
    --audio "$tiny_wav" --model-path "$TMP_DIR/nonexistent-model" --mode local --device cpu \
    >"$missing_model_stdout" 2>"$missing_model_stderr"
  rc=$?
  set -e
  [[ $rc -ne 0 ]] || fail "missing model probe expected non-zero exit"
  validate_json_file "$missing_model_stdout" >/dev/null

  info "Phase A complete"
}

run_reliability_probes() {
  info "Phase B: reliability probes (sequential=$SEQ_RUNS, parallel=$PAR_RUNS, workers=$PAR_WORKERS)"
  python3 - "$PYTHON_BIN" "$BRIDGE_PATH" "$ASR_ROOT/src" "$SEQ_RUNS" <<'PY'
import json
import subprocess
import sys

python_bin, bridge, py_path, runs = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
env = dict(**__import__("os").environ)
env["PYTHONPATH"] = py_path

for i in range(runs):
    proc = subprocess.run(
        [python_bin, bridge, "--stdin", "--model-path", "dummy", "--mode", "local", "--device", "cpu"],
        input=b"",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
    )
    lines = [line.strip() for line in proc.stdout.decode("utf-8", errors="replace").splitlines() if line.strip()]
    if len(lines) != 1:
        raise SystemExit(f"sequential run {i}: expected 1 JSON line, got {len(lines)}")
    payload = json.loads(lines[0])
    if payload.get("ok") is not False or payload.get("error") != "empty_audio":
        raise SystemExit(f"sequential run {i}: unexpected payload {payload}")
print("sequential_ok")
PY

  python3 - "$PYTHON_BIN" "$BRIDGE_PATH" "$ASR_ROOT/src" "$PAR_RUNS" "$PAR_WORKERS" <<'PY'
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

python_bin, bridge, py_path, runs, workers = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
env = dict(os.environ)
env["PYTHONPATH"] = py_path

def one_run(i: int):
    proc = subprocess.run(
        [python_bin, bridge, "--stdin", "--model-path", "dummy", "--mode", "local", "--device", "cpu"],
        input=b"",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
    )
    lines = [line.strip() for line in proc.stdout.decode("utf-8", errors="replace").splitlines() if line.strip()]
    if len(lines) != 1:
        return f"parallel run {i}: expected 1 JSON line, got {len(lines)}"
    try:
        payload = json.loads(lines[0])
    except Exception as exc:
        return f"parallel run {i}: json parse failed: {exc}"
    if payload.get("ok") is not False or payload.get("error") != "empty_audio":
        return f"parallel run {i}: unexpected payload {payload}"
    return None

errors = []
with ThreadPoolExecutor(max_workers=workers) as ex:
    futures = [ex.submit(one_run, i) for i in range(runs)]
    for future in as_completed(futures):
        err = future.result()
        if err:
            errors.append(err)

if errors:
    raise SystemExit(errors[0])
print("parallel_ok")
PY
  info "Phase B complete"
}

print_summary() {
  cat <<EOF
[PASS] Qwen3 bridge hardening quick checks passed
  python: $PYTHON_BIN
  bridge: $BRIDGE_PATH
  mode:   $MODE
  model:  $MODEL_PATH
  seq:    $SEQ_RUNS
  par:    $PAR_RUNS (workers=$PAR_WORKERS)
EOF
}

main() {
  require_paths
  run_contract_probes
  run_reliability_probes
  print_summary
}

main "$@"
