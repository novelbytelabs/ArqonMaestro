#!/usr/bin/env python3
"""
Parakeet ASR Bridge - Maestro STT Integration

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
    "model_load_failed": (False, "Failed to load Parakeet model"),
    "inference_failed": (False, "ASR inference failed"),
    "timeout": (True, "Inference timeout"),
    "endpoint_503": (True, "Service unavailable"),
    "connection_refused": (True, "Connection refused"),
    "json_output_invalid": (False, "Invalid JSON output from model"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro Parakeet ASR bridge")
    parser.add_argument("--audio", required=True, help="Path to WAV audio file")
    parser.add_argument("--model-path", required=True, help="Path to Parakeet model directory")
    parser.add_argument("--device", required=True, choices=["cpu", "cuda"], help="Device name")
    return parser.parse_args()


def print_json(payload: dict) -> None:
    """Output strict single-line JSON to stdout."""
    print(json.dumps(payload, ensure_ascii=True))


def log_stderr(message: str) -> None:
    """Log to stderr - all framework noise goes here."""
    print(message, file=sys.stderr)


def load_audio_pcm16(wav_path: str) -> Tuple[Optional[bytes], Optional[str]]:
    """
    Load audio file and validate PCM16 LE format.
    
    Returns:
        Tuple of (audio_bytes, error_code) - error_code is None on success
    """
    if not os.path.exists(wav_path):
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


def load_parakeet_model(model_path: str, device: str):
    """
    Load Parakeet model from path using NVIDIA NeMo ASR.
    """
    try:
        # Import NeMo ASR
        try:
            import torch
            import nemo.collections.asr as nemo_asr
        except ImportError as e:
            log_stderr(f"Missing dependency: {e}")
            raise RuntimeError("nemo.collections.asr or torch not installed") from e
        
        # Check if model path exists
        if not os.path.isdir(model_path):
            log_stderr(f"Model path does not exist: {model_path}")
            raise FileNotFoundError(f"Model directory not found: {model_path}")
        
        # Load Parakeet model using NeMo
        # NeMo uses EncDecCTCModel for CTC-based ASR models like Parakeet
        model = nemo_asr.models.EncDecCTCModel.restore_from(model_path)
        
        # Move to specified device
        if device == "cuda" and torch.cuda.is_available():
            model = model.cuda()
        else:
            model = model.cpu()
        
        return model
        
    except FileNotFoundError as e:
        raise RuntimeError(f"model_load_failed: {e}") from e
    except Exception as e:
        raise RuntimeError(f"model_load_failed: {e}") from e


def transcribe_parakeet(model, audio_data: list) -> Tuple[Optional[str], Optional[str]]:
    """
    Run inference on Parakeet model.
    
    Returns:
        Tuple of (transcript, error_code)
    """
    try:
        import numpy as np
        import torch
        
        # Convert list back to numpy array
        audio_np = np.array(audio_data, dtype=np.float32)
        
        # Run Parakeet inference using NVIDIA NeMo ASR
        # Input: float32 waveform tensor [batch, samples]
        # Output: transcription text string
        with torch.no_grad():
            # The model expects a waveform tensor
            waveform = torch.tensor(audio_np).unsqueeze(0)
            
            # Run inference
            results = model.transcribe_batch(waveform)
            
            # Extract text from results
            # Format: transcription text string or dict with 'text' key
            if isinstance(results, (list, tuple)):
                text = results[0] if len(results) > 0 else ""
            elif isinstance(results, dict):
                text = results.get("text", "") or results.get("transcription", "")
            else:
                text = str(results) if results else ""
            
            text = text.strip()
            
            if not text:
                return None, "empty_audio"
            
            return text, None
            
    except TimeoutError as e:
        return None, "timeout"
    except Exception as e:
        log_stderr(f"Inference error: {e}")
        return None, "inference_failed"


def main() -> int:
    args = parse_args()
    
    # Redirect framework warnings to stderr
    # (Python logging can be configured here if needed)
    
    # Step 1: Load and validate audio
    audio_bytes, error_code = load_audio_pcm16(args.audio)
    if error_code:
        retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
        print_json({
            "ok": False,
            "error": error_code,
            "retryable": retryable
        })
        return 1
    
    # Step 2: Normalize PCM16 to float32
    audio_float, error_code = normalize_pcm16_to_float32(audio_bytes)
    if error_code:
        retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
        print_json({
            "ok": False,
            "error": error_code,
            "retryable": retryable
        })
        return 1
    
    # Step 3: Load model
    try:
        model = load_parakeet_model(args.model_path, args.device)
    except RuntimeError as e:
        error_msg = str(e)
        if "model_load_failed" in error_msg:
            print_json({
                "ok": False,
                "error": "model_load_failed",
                "retryable": False
            })
        else:
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
    
    # Step 4: Run inference
    text, error_code = transcribe_parakeet(model, audio_float)
    if error_code:
        retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
        print_json({
            "ok": False,
            "error": error_code,
            "retryable": retryable
        })
        return 1
    
    # Step 5: Success - output JSON to stdout
    print_json({
        "ok": True,
        "text": text,
        "model": args.model_path,
        "device": args.device
    })
    return 0


if __name__ == "__main__":
    sys.exit(main())
