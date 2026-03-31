#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${MAESTRO_QWEN3_PYTHON_PATH:-$HOME/miniconda3/envs/helios-gpu-118/bin/python}"
BRIDGE_PATH="${MAESTRO_QWEN3_BRIDGE_PATH:-$ROOT_DIR/src/main/stt/qwen3_asr_bridge.py}"
PROJECT_ROOT="${MAESTRO_QWEN3_PROJECT_ROOT:-$HOME/Projects/arqon/arqon-maestro-asr}"
MODEL_SIZE="${MAESTRO_QWEN3_MODEL_SIZE:-0.6b}"
MODEL_PATH="${MAESTRO_QWEN3_MODEL_PATH:-$PROJECT_ROOT/models/upstream/Qwen3-ASR-${MODEL_SIZE^^}}"
ADAPTER_PATH="${MAESTRO_QWEN3_ADAPTER_PATH:-$PROJECT_ROOT/models/adapters/arqon-maestro-asr-${MODEL_SIZE}-lora}"
SMOKE_AUDIO="${MAESTRO_QWEN3_SMOKE_AUDIO:-$PROJECT_ROOT/benchmarks/test_audio/conversation.wav}"
WORK_AUDIO="/tmp/maestro_qwen_smoke_16k_mono.wav"

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "[FAIL] python not found: $PYTHON_BIN"
  exit 1
fi
if [[ ! -f "$BRIDGE_PATH" ]]; then
  echo "[FAIL] bridge not found: $BRIDGE_PATH"
  exit 1
fi
if [[ ! -d "$MODEL_PATH" ]]; then
  echo "[FAIL] model path not found: $MODEL_PATH"
  exit 1
fi
if [[ ! -f "$SMOKE_AUDIO" ]]; then
  echo "[FAIL] smoke audio not found: $SMOKE_AUDIO"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "[FAIL] ffmpeg is required for smoke conversion"
  exit 1
fi

ffmpeg -y -i "$SMOKE_AUDIO" -ac 1 -ar 16000 "$WORK_AUDIO" >/dev/null 2>&1

echo "[INFO] qwen3 smoke test"
echo "  python: $PYTHON_BIN"
echo "  model:  $MODEL_PATH"
echo "  size:   $MODEL_SIZE"
echo "  bridge: $BRIDGE_PATH"
echo "  audio:  $WORK_AUDIO"

if [[ -d "$ADAPTER_PATH" ]]; then
  OUTPUT="$("$PYTHON_BIN" "$BRIDGE_PATH" \
    --audio "$WORK_AUDIO" \
    --model-path "$MODEL_PATH" \
    --model-size "$MODEL_SIZE" \
    --mode local \
    --device "${MAESTRO_QWEN3_DEVICE:-cuda}" \
    --project-root "$PROJECT_ROOT" \
    --use-adapter \
    --adapter-path "$ADAPTER_PATH" 2>&1)"
else
  OUTPUT="$("$PYTHON_BIN" "$BRIDGE_PATH" \
    --audio "$WORK_AUDIO" \
    --model-path "$MODEL_PATH" \
    --model-size "$MODEL_SIZE" \
    --mode local \
    --device "${MAESTRO_QWEN3_DEVICE:-cuda}" \
    --project-root "$PROJECT_ROOT" 2>&1)"
fi

echo "$OUTPUT" | tail -n 20
if echo "$OUTPUT" | grep -q '"ok": true'; then
  echo "[PASS] qwen3 bridge load+transcribe ok"
  exit 0
fi

echo "[FAIL] qwen3 bridge did not return ok=true"
exit 1
