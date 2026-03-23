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
    parser.add_argument("--endpoint", help="vLLM endpoint URL (required for vllm_service mode)")
    parser.add_argument("--device", default="cuda", help="Device name (cpu/cuda) for local mode")
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


def transcribe_vllm_service(audio_bytes: bytes, endpoint: str, timeout: int = 30) -> Tuple[Optional[str], Optional[str]]:
    """
    Send audio to vLLM service for inference.
    
    Uses urllib.request for HTTP calls with explicit timeout handling.
    Targets OpenAI-compatible /v1/audio/transcriptions endpoint.
    
    Returns:
        Tuple of (transcript, error_code)
    """
    import urllib.request
    import urllib.error
    
    # Validate endpoint
    if not endpoint:
        return None, "endpoint_503"
    
    # Ensure endpoint has proper scheme
    if not endpoint.startswith(("http://", "https://")):
        endpoint = "http://" + endpoint
    
    # Build the full URL for OpenAI-compatible endpoint
    # vLLM uses /v1/audio/transcriptions for Whisper-compatible API
    endpoint_url = endpoint.rstrip("/") + "/v1/audio/transcriptions"
    
    # Reconstruct mathematical WAV container for the remote vLLM endpoint
    import io, wave
    with io.BytesIO() as wav_io:
        with wave.open(wav_io, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            wf.writeframes(audio_bytes)
        wav_bytes = wav_io.getvalue()
        
    # Create multipart form data
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    
    # Build body in bytes properly
    body_parts = []
    body_parts.append(b"--" + boundary.encode("utf-8") + b"\r\n")
    body_parts.append(b'Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n')
    body_parts.append(b"Content-Type: audio/wav\r\n\r\n")
    body_parts.append(wav_bytes)
    body_parts.append(b"\r\n--" + boundary.encode("utf-8") + b"\r\n")
    body_parts.append(b'Content-Disposition: form-data; name="model"\r\n\r\n')
    body_parts.append(b"qwen-asr\r\n")
    body_parts.append(b"--" + boundary.encode("utf-8") + b"--\r\n")
    body = b"".join(body_parts)
    
    try:
        # Create request with explicit timeout
        req = urllib.request.Request(
            endpoint_url,
            data=body,
            headers={
                "Content-Type": "multipart/form-data; boundary=" + boundary,
                "Accept": "application/json"
            },
            method="POST"
        )
        
        # Execute request with timeout
        with urllib.request.urlopen(req, timeout=timeout) as response:
            response_body = response.read().decode("utf-8")
            
            # Parse JSON response
            try:
                result = json.loads(response_body)
                
                # Extract text from OpenAI-compatible response
                # Format: {"text": "..."} or {"transcription": "..."}
                text = result.get("text", "") or result.get("transcription", "")
                
                if not text:
                    return None, "json_output_invalid"
                
                return text.strip(), None
                
            except json.JSONDecodeError as e:
                log_stderr(f"JSON decode error: {e}, response: {response_body[:200]}")
                return None, "json_output_invalid"
                
    except urllib.error.HTTPError as e:
        if e.code == 503:
            return None, "endpoint_503"
        elif e.code == 400:
            return None, "audio_format_invalid"
        else:
            log_stderr(f"HTTP error {e.code}: {e.reason}")
            return None, "inference_failed"
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, str):
            reason_lower = reason.lower()
            if "connection refused" in reason_lower:
                return None, "connection_refused"
            elif "timed out" in reason_lower:
                return None, "timeout"
        # Check string representation too
        error_str = str(e).lower()
        if "connection refused" in error_str:
            return None, "connection_refused"
        elif "timed out" in error_str:
            return None, "timeout"
        log_stderr(f"URL error: {e}")
        return None, "connection_refused"
    except TimeoutError:
        return None, "timeout"
    except Exception as e:
        log_stderr(f"Unexpected error during vLLM request: {e}")
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
    
    # Validate mode-specific arguments
    if args.mode == "vllm_service" and not args.endpoint:
        print_json({
            "ok": False,
            "error": "endpoint_503",
            "retryable": True
        })
        return 1
    
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
        except RuntimeError as e:
            print_json({
                "ok": False,
                "error": "model_load_failed",
                "retryable": False
            })
            return 1
        except Exception as e:
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
        
        # Success - output JSON to stdout
        print_json({
            "ok": True,
            "text": text,
            "model": args.model_path,
            "device": args.device
        })
        return 0
        
    elif args.mode == "vllm_service":
        # Run vLLM service inference
        text, error_code = transcribe_vllm_service(audio_bytes, args.endpoint)
        if error_code:
            retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
            print_json({
                "ok": False,
                "error": error_code,
                "retryable": retryable
            })
            return 1
        
        # Success - output JSON to stdout
        print_json({
            "ok": True,
            "text": text,
            "model": "vllm_service",
            "device": "remote"
        })
        return 0
    
    # Should not reach here
    print_json({
        "ok": False,
        "error": "inference_failed",
        "retryable": False
    })
    return 1


if __name__ == "__main__":
    sys.exit(main())
