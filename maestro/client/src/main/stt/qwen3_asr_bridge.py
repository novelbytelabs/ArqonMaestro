#!/usr/bin/env python3
"""
Qwen3 ASR Bridge - Maestro STT Integration

Audio Contract:
- Format: Mono, PCM16 LE, 16 kHz, 16-bit
- Preprocessing: float32 = int16 / 32768.0, clamp [-1, 1]

Output Contract:
- Strict single-line JSON to stdout
- All framework logs redirected to stderr
"""
import argparse
import json
import os
import sys
import wave
from typing import Optional, Tuple

# Stable error codes
ERROR_CODES = {
    "empty_audio": (True, "Audio file is empty or contains no valid samples"),
    "audio_format_invalid": (False, "Audio format not supported - expected PCM16 LE mono 16kHz"),
    "model_load_failed": (False, "Failed to load Qwen3 ASR model"),
    "inference_failed": (False, "ASR inference failed"),
    "timeout": (True, "Inference timeout"),
    "endpoint_503": (True, "Service unavailable"),
    "connection_refused": (True, "Connection refused"),
    "json_output_invalid": (False, "Invalid JSON output from model"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro Qwen3 ASR bridge")
    parser.add_argument("--audio", help="Path to WAV audio file")
    parser.add_argument("--stdin", action="store_true", help="Accept raw PCM16 via stdin")
    parser.add_argument("--model-path", required=True, help="Path to Qwen3 ASR model directory")
    parser.add_argument("--mode", required=True, choices=["local", "vllm_service"],
                        help="Inference mode: local or vllm_service")
    parser.add_argument("--device", default="cuda", help="Device name (cpu/cuda) for local mode")
    parser.add_argument("--endpoint", help="vLLM/OpenAI-compatible transcription endpoint URL")
    return parser.parse_args()


# Protect stdout from framework noise (Python & C-level)
# Save original stdout fd, then point fd 1 to stderr (fd 2)
try:
    ORIGINAL_STDOUT_FD = os.dup(1)
    os.dup2(2, 1)
except Exception:
    ORIGINAL_STDOUT_FD = None

def print_json(payload: dict) -> None:
    """Output strict single-line JSON to the original stdout."""
    out_str = json.dumps(payload, ensure_ascii=True) + "\n"
    if ORIGINAL_STDOUT_FD is not None:
        try:
            with os.fdopen(ORIGINAL_STDOUT_FD, "w", closefd=False) as f:
                f.write(out_str)
                f.flush()
            return
        except Exception:
            pass
    # Fallback if OS fd tricks failed
    print(out_str, file=sys.__stdout__, flush=True)


def log_stderr(message: str) -> None:
    """Log to stderr - all framework noise goes here."""
    print(message, file=sys.stderr)


def load_audio_pcm16(wav_path: Optional[str], from_stdin: bool = False) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Load audio and validate PCM16 LE format.
    Supports reading from a file path or directly from stdin.
    """
    import io
    
    if from_stdin:
        try:
            audio_data = sys.stdin.buffer.read()
            if not audio_data:
                return None, "empty_audio"
                
            # Check if it's a WAV file by header
            if audio_data.startswith(b"RIFF"):
                with wave.open(io.BytesIO(audio_data), "rb") as wf:
                    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
                        return None, "audio_format_invalid"
                    return wf.readframes(wf.getnframes()), None
            else:
                # Assume raw PCM16
                return audio_data, None
        except Exception as e:
            log_stderr(f"Error reading from stdin: {e}")
            return None, "audio_format_invalid"
    
    if not wav_path or not os.path.exists(wav_path):
        return None, "audio_format_invalid"
    
    file_size = os.path.getsize(wav_path)
    if file_size == 0:
        return None, "empty_audio"
    
    try:
        with wave.open(wav_path, "rb") as wf:
            # Validate wave format
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            
            # Check: Mono (1 channel), 16-bit (2 bytes), 16kHz
            if n_channels != 1:
                log_stderr(f"Warning: Expected mono, got {n_channels} channels")
                return None, "audio_format_invalid"
            
            if sampwidth != 2:
                log_stderr(f"Warning: Expected 16-bit (sampwidth=2), got {sampwidth}")
                return None, "audio_format_invalid"
            
            if framerate != 16000:
                log_stderr(f"Warning: Expected 16kHz, got {framerate}")
                return None, "audio_format_invalid"
            
            # Read raw PCM16 LE data
            audio_bytes = wf.readframes(wf.getnframes())
            
            if len(audio_bytes) == 0:
                return None, "empty_audio"
            
            return audio_bytes, None
            
    except wave.Error as e:
        log_stderr(f"Wave file error: {e}")
        return None, "audio_format_invalid"
    except Exception as e:
        log_stderr(f"Unexpected error reading audio: {e}")
        return None, "audio_format_invalid"


def normalize_pcm16_to_float32(audio_bytes: bytes) -> Tuple[Optional[list], Optional[str]]:
    """
    Convert PCM16 LE bytes to normalized float32 array.
    
    Preprocessing: float32 = int16 / 32768.0, clamp [-1, 1]
    """
    try:
        import numpy as np
        
        # Convert bytes to int16 array
        int16_data = np.frombuffer(audio_bytes, dtype=np.int16)
        
        if len(int16_data) == 0:
            return None, "empty_audio"
        
        # Normalize: float32 = int16 / 32768.0
        float32_data = int16_data.astype(np.float32) / 32768.0
        
        # Clamp to [-1, 1]
        float32_data = np.clip(float32_data, -1.0, 1.0)
        
        return float32_data.tolist(), None
        
    except Exception as e:
        log_stderr(f"Error normalizing audio: {e}")
        return None, "audio_format_invalid"


def transcribe_local(model, audio_data: list) -> Tuple[Optional[str], Optional[str]]:
    """
    Run local inference on Qwen3 model using vLLM.
    
    Returns:
        Tuple of (transcript, error_code)
    """
    try:
        import numpy as np
        
        # Convert list back to numpy array
        audio_np = np.array(audio_data, dtype=np.float32)
        
        # Run the model - Qwen3 ASR using vllm LLM multimodal interface
        outputs = model.generate({
            "prompt": "<|audio|>\ntranscribe",
            "multi_modal_data": {
                "audio": (audio_np, 16000)
            }
        })
        
        if outputs and len(outputs) > 0:
            text = outputs[0].outputs[0].text
        else:
            text = ""
            
        text = text.strip()
        
        if not text:
            return None, "empty_audio"
        
        return text, None
        
    except TimeoutError as e:
        return None, "timeout"
    except Exception as e:
        log_stderr(f"Inference error: {e}")
        return None, "inference_failed"



def transcribe_vllm_service(audio_bytes: bytes, endpoint: str, model_path: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Run vLLM service inference using HTTP endpoint.
    Returns: (transcript, error_code)
    """
    if not endpoint:
        return None, "connection_refused"

    try:
        import base64
        import urllib.error
        import urllib.request

        payload = {
            "model": model_path,
            "audio_b64": base64.b64encode(audio_bytes).decode("ascii"),
            "sample_rate_hz": 16000,
        }
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")

        parsed = json.loads(body) if body else {}
        text = ""
        if isinstance(parsed, dict):
            text = (parsed.get("text") or "").strip()
            if not text:
                choices = parsed.get("choices")
                if isinstance(choices, list) and choices:
                    c0 = choices[0] or {}
                    if isinstance(c0, dict):
                        text = (c0.get("text") or "").strip()
                        if not text:
                            msg = c0.get("message")
                            if isinstance(msg, dict):
                                text = (msg.get("content") or "").strip()

        if not text:
            return None, "empty_audio"
        return text, None

    except urllib.error.HTTPError as e:
        if e.code == 503:
            return None, "endpoint_503"
        return None, "inference_failed"
    except urllib.error.URLError:
        return None, "connection_refused"
    except TimeoutError:
        return None, "timeout"
    except Exception as e:
        log_stderr(f"vLLM service error: {e}")
        return None, "inference_failed"


def load_qwen3_model(model_path: str, device: str):
    """
    Load Qwen3 ASR model from path using vllm multimodal LLM.
    """
    try:
        # Import vllm LLM
        try:
            from vllm import LLM
        except ImportError as e:
            log_stderr(f"Missing dependency: {e}")
            raise RuntimeError("vllm not installed") from e
        
        # Check if model path exists
        if not os.path.isdir(model_path):
            log_stderr(f"Model path does not exist: {model_path}")
            raise FileNotFoundError(f"Model directory not found: {model_path}")
        
        # Load Qwen3 model using native vLLM
        model = LLM(model=model_path, trust_remote_code=True)
        return model
        
    except FileNotFoundError as e:
        raise RuntimeError(f"model_load_failed: {e}") from e
    except Exception as e:
        raise RuntimeError(f"model_load_failed: {e}") from e


def main() -> int:
    args = parse_args()
    

    # Step 1: Load and validate audio
    audio_bytes, error_code = load_audio_pcm16(args.audio, getattr(args, "stdin", False))
    if error_code:
        retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
        print_json({
            "ok": False,
            "error": error_code,
            "retryable": retryable
        })
        return 1
    
    # Step 2: For local mode, normalize audio
    audio_float = None
    if args.mode == "local":
        audio_float, error_code = normalize_pcm16_to_float32(audio_bytes)
        if error_code:
            retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
            print_json({
                "ok": False,
                "error": error_code,
                "retryable": retryable
            })
            return 1
    
    # Step 3: Handle based on mode
    if args.mode == "local":
        # Load model
        try:
            model = load_qwen3_model(args.model_path, args.device)
        except RuntimeError:
            print_json({
                "ok": False,
                "error": "model_load_failed",
                "retryable": False
            })
            return 1
        except Exception:
            print_json({
                "ok": False,
                "error": "model_load_failed",
                "retryable": False
            })
            return 1

        # Run local inference
        text, error_code = transcribe_local(model, audio_float)
        if error_code:
            retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
            print_json({
                "ok": False,
                "error": error_code,
                "retryable": retryable
            })
            return 1

        print_json({
            "ok": True,
            "text": text,
            "model": args.model_path,
            "device": args.device
        })
        return 0

    if args.mode == "vllm_service":
        text, error_code = transcribe_vllm_service(audio_bytes, args.endpoint or "", args.model_path)
        if error_code:
            retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
            print_json({
                "ok": False,
                "error": error_code,
                "retryable": retryable
            })
            return 1

        print_json({
            "ok": True,
            "text": text,
            "model": args.model_path,
            "device": "remote"
        })
        return 0

    print_json({
        "ok": False,
        "error": "inference_failed",
        "retryable": False
    })
    return 1


if __name__ == "__main__":
    sys.exit(main())
