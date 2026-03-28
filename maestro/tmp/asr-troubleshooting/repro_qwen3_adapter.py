#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import tempfile
import wave
from pathlib import Path


REPO_ROOT = Path("/home/irbsurfer/Projects/arqon/ArqonMaestro")
ASR_ROOT = Path("/home/irbsurfer/Projects/arqon/arqon-maestro-asr")
PYTHON_PATH = Path("/home/irbsurfer/miniconda3/envs/helios-gpu-118/bin/python")
BRIDGE_PATH = REPO_ROOT / "maestro/client/src/main/stt/qwen3_asr_bridge.py"
BASE_MODEL = ASR_ROOT / "models/upstream/Qwen3-ASR-0.6B"
ADAPTER = ASR_ROOT / "models/adapters/arqon-maestro-asr-0.6b-lora"
TEST_AUDIO = ASR_ROOT / "benchmarks/test_audio/test_michael.wav"


def run_bridge(stdin_bytes: bytes) -> dict:
    cmd = [
        str(PYTHON_PATH),
        str(BRIDGE_PATH),
        "--stdin",
        "--model-path",
        str(BASE_MODEL),
        "--model-size",
        "0.6b",
        "--mode",
        "local",
        "--device",
        "cuda",
        "--use-adapter",
        "--project-root",
        str(ASR_ROOT),
    ]
    proc = subprocess.run(
        cmd,
        input=stdin_bytes,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=240,
    )
    return {
        "exit_code": proc.returncode,
        "stdout": proc.stdout.decode("utf-8", "replace").strip(),
        "stderr": proc.stderr.decode("utf-8", "replace").strip(),
    }


def make_silence_wav_bytes() -> bytes:
    fd, path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        with wave.open(path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(b"\x00\x00" * (16000 // 4))
        return Path(path).read_bytes()
    finally:
        try:
            os.remove(path)
        except OSError:
            pass


def run_direct_adapter_probe() -> dict:
    probe = r"""
import json
from pathlib import Path
import torch
from qwen_asr import Qwen3ASRModel
from peft import PeftModel

base = Path("/home/irbsurfer/Projects/arqon/arqon-maestro-asr/models/upstream/Qwen3-ASR-0.6B")
adapter = Path("/home/irbsurfer/Projects/arqon/arqon-maestro-asr/models/adapters/arqon-maestro-asr-0.6b-lora")
audio = Path("/home/irbsurfer/Projects/arqon/arqon-maestro-asr/benchmarks/test_audio/test_michael.wav")
dtype = torch.float16 if torch.cuda.is_available() else torch.float32
device = "cuda" if torch.cuda.is_available() else "cpu"

model = Qwen3ASRModel.from_pretrained(
    str(base),
    device_map=device,
    dtype=dtype,
    max_inference_batch_size=1,
    max_new_tokens=256,
)
model.model.thinker = PeftModel.from_pretrained(model.model.thinker, str(adapter))
model.model.eval()
results = model.transcribe(audio=str(audio))
text = results[0].text.strip() if results else ""
print(json.dumps({
    "device": device,
    "result_count": len(results),
    "text": text,
}, ensure_ascii=True))
"""
    proc = subprocess.run(
        [str(PYTHON_PATH), "-c", probe],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=240,
    )
    return {
        "exit_code": proc.returncode,
        "stdout": proc.stdout.decode("utf-8", "replace").strip(),
        "stderr": proc.stderr.decode("utf-8", "replace").strip(),
    }


def main() -> int:
    report = {
        "paths": {
            "python": str(PYTHON_PATH),
            "bridge": str(BRIDGE_PATH),
            "base_model": str(BASE_MODEL),
            "adapter": str(ADAPTER),
            "test_audio": str(TEST_AUDIO),
        },
        "exists": {
            "python": PYTHON_PATH.exists(),
            "bridge": BRIDGE_PATH.exists(),
            "base_model": BASE_MODEL.exists(),
            "adapter": ADAPTER.exists(),
            "test_audio": TEST_AUDIO.exists(),
        },
    }

    silence_wav = make_silence_wav_bytes()
    report["bridge_silence_preflight"] = run_bridge(silence_wav)
    report["bridge_real_audio"] = run_bridge(TEST_AUDIO.read_bytes())
    report["direct_adapter_load"] = run_direct_adapter_probe()

    print(json.dumps(report, indent=2, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
