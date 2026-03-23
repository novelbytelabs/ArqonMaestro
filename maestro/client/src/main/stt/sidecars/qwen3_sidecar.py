#!/usr/bin/env python3
"""
Qwen3 ASR Bridge - Maestro STT Integration (Sidecar Mode)

Audio Contract:
- Format: Mono, PCM16 LE, 16 kHz, 16-bit
- Preprocessing: float32 = int16 / 32768.0, clamp [-1, 1]

Input Modes:
- --audio <wav_file>: File-based input (legacy)
- --stdin: Accept raw PCM16 bytes via stdin for in-memory processing

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
    parser.add_argument("--device", default="cuda", help="Device name (cpu/cuda) for local mode")
    # Sidecar mode: HTTP server
    parser.add_argument("--server", action="store_true", help="Run as HTTP sidecar server")
    parser.add_argument("--port", type=int, default=5002, help="Server port")
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


def load_audio_from_stdin() -> Tuple[Optional[bytes], Optional[str]]:
    """
    Read raw PCM16 LE audio from stdin.
    Expects: Mono, 16kHz, 16-bit Little Endian
    
    Returns:
        Tuple of (audio_bytes, error_code)
    """
    try:
        # Read all available data from stdin
        audio_bytes = sys.stdin.buffer.read()
        
        if len(audio_bytes) == 0:
            return None, "empty_audio"
        
        # Validate: must be even number of bytes (16-bit samples)
        if len(audio_bytes) % 2 != 0:
            log_stderr(f"Warning: Odd byte count {len(audio_bytes)} - truncated last byte")
            audio_bytes = audio_bytes[:-1]
        
        if len(audio_bytes) == 0:
            return None, "empty_audio"
        
        return audio_bytes, None
        
    except Exception as e:
        log_stderr(f"Error reading stdin: {e}")
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
        
        # Run inference using vllm LLM multimodal interface
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


def load_qwen3_model(model_path: str, device: str):
    """
    Load Qwen3 ASR model from path using natively configured vllm multimodal LLM.
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
        
        # Load Qwen3 ASR model using vllm
        model = LLM(model=model_path, trust_remote_code=True)
        return model
        
    except FileNotFoundError as e:
        raise RuntimeError(f"model_load_failed: {e}") from e
    except Exception as e:
        raise RuntimeError(f"model_load_failed: {e}") from e


def run_server(model, device: str, port: int) -> None:
    """
    Run as HTTP sidecar server.
    Handles in-memory audio processing - no temp files.
    """
    from http.server import HTTPServer, BaseHTTPRequestHandler
    
    class SidecarHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/health":
                # Health check endpoint
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "model": "qwen3"}).encode("utf-8"))
            else:
                self.send_error(404, "Not Found")
        
        def do_POST(self):
            if self.path != "/transcribe":
                self.send_error(404, "Not Found")
                return
            
            import base64
            
            # Read JSON from request body
            content_length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(content_length)
            
            try:
                req_json = json.loads(body_bytes.decode("utf-8"))
                audio_b64 = req_json.get("audio_b64", "")
                if not audio_b64:
                    self.send_error(400, "empty_audio")
                    return
                audio_bytes = base64.b64decode(audio_b64)
            except Exception as e:
                self.send_error(400, "audio_format_invalid")
                return
            
            # Normalize and transcribe
            audio_float, error_code = normalize_pcm16_to_float32(audio_bytes)
            if error_code:
                self.send_error(400, error_code)
                return
            
            text, error_code = transcribe_local(model, audio_float)
            
            # Send JSON response
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            if error_code:
                retryable, _ = ERROR_CODES.get(error_code, (False, "Unknown error"))
                response = {"ok": False, "error": error_code, "retryable": retryable}
            else:
                response = {"ok": True, "text": text, "model": "local", "device": device}
            
            self.wfile.write(json.dumps(response).encode("utf-8"))
        
        def log_message(self, format, *args):
            # Suppress HTTP server logs
            pass
    
    # Run server
    server = HTTPServer(("", port), SidecarHandler)
    log_stderr(f"Qwen3 sidecar server started on port {port}")
    server.serve_forever()


def main() -> int:
    args = parse_args()
    
    # Validate input mode
    if args.stdin and args.audio:
        print_json({
            "ok": False,
            "error": "json_output_invalid",
            "retryable": False
        })
        return 1
    
    # If server mode, start HTTP server
    if args.server:
        # Load model first (preload at boot)
        try:
            model = load_qwen3_model(args.model_path, args.device)
            log_stderr(f"Model loaded: {args.model_path}")
        except RuntimeError as e:
            print_json({
                "ok": False,
                "error": "model_load_failed",
                "retryable": False
            })
            return 1
        
        run_server(model, args.device, args.port)
        return 0
    
    # Step 1: Load audio based on input mode
    if args.stdin:
        audio_bytes, error_code = load_audio_from_stdin()
    else:
        if not args.audio:
            print_json({
                "ok": False,
                "error": "audio_format_invalid",
                "retryable": False
            })
            return 1
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
        model = load_qwen3_model(args.model_path, args.device)
    except RuntimeError as e:
        print_json({
            "ok": False,
            "error": "model_load_failed",
            "retryable": False
        })
        return 1
    
    # Step 4: Run inference
    text, error_code = transcribe_local(model, audio_float)
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
