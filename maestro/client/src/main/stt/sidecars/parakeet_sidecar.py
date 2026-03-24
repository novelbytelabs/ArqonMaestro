#!/usr/bin/env python3
"""
Parakeet ASR Bridge - Maestro STT Integration (Sidecar Mode)

Audio Contract:
- Format: Mono, PCM16 LE, 16 kHz, 16-bit
- Preprocessing: float32 = int16 / 32768.0, clamp [-1, 1]

WebSockets Contract:
- Client connects to /transcribe_stream
- Client sends JSON config first: {"sample_rate_hz": 16000, "chunk_id": "...", "model_path": "..."}
- Client streams raw PCM16 bytes
- Server streams back JSON: {"ok": True, "text": "partial...", "is_final": False}
- Client sends {"eof": True} JSON to indicate end of stream
- Server returns {"ok": True, "text": "final...", "is_final": True}
"""
import argparse
import json
import logging
import os
import time
from typing import Optional, Tuple
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Global loaded model
PARAKEET_MODEL = None
PARAKEET_DEVICE = "cpu"

def normalize_pcm16_to_float32(audio_bytes: bytes) -> Tuple[Optional[list], Optional[str]]:
    try:
        import numpy as np
        int16_data = np.frombuffer(audio_bytes, dtype=np.int16)
        if len(int16_data) == 0:
            return None, "empty_audio"
        float32_data = int16_data.astype(np.float32) / 32768.0
        float32_data = np.clip(float32_data, -1.0, 1.0)
        return float32_data.tolist(), None
    except Exception as e:
        logger.error(f"Error normalizing audio: {e}")
        return None, "audio_format_invalid"

def load_parakeet_model(model_path: str, device: str):
    try:
        import torch
        import nemo.collections.asr as nemo_asr
        
        if not os.path.exists(model_path):
            logger.error(f"Model path does not exist: {model_path}")
            raise FileNotFoundError(f"Model directory not found: {model_path}")
            
        model = nemo_asr.models.ASRModel.restore_from(model_path)
        if device == "cuda" and torch.cuda.is_available():
            model = model.cuda()
        else:
            model = model.cpu()
        return model
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise RuntimeError(f"model_load_failed: {e}") from e

def transcribe_batch(model, audio_data: list) -> Tuple[Optional[str], Optional[str]]:
    try:
        import numpy as np
        import torch
        
        audio_np = np.array(audio_data, dtype=np.float32)
        with torch.no_grad():
            waveform = torch.tensor(audio_np).unsqueeze(0)
            results = model.transcribe_batch(waveform)
            
            if isinstance(results, (list, tuple)):
                text = results[0] if len(results) > 0 else ""
            elif isinstance(results, dict):
                text = results.get("text", "") or results.get("transcription", "")
            else:
                text = str(results) if results else ""
            
            text = text.strip()
            if not text:
                return "", None
            return text, None
    except Exception as e:
        logger.error(f"Inference error: {e}")
        return None, "inference_failed"

@app.get("/health")
async def health_check():
    return {"status": "ok", "model": "parakeet", "streaming_enabled": True}

@app.websocket("/transcribe_stream")
async def websocket_transcribe(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")
    
    try:
        # 1. Wait for config
        config_text = await websocket.receive_text()
        try:
            config = json.loads(config_text)
        except json.JSONDecodeError:
            await websocket.send_json({"ok": False, "error": "invalid_config", "retryable": False})
            await websocket.close()
            return

        chunk_id = config.get("chunk_id", "unknown")
        sample_rate_hz = int(config.get("sample_rate_hz", 16000))
        if sample_rate_hz != 16000:
            await websocket.send_json({"ok": False, "error": "audio_format_invalid", "retryable": False})
            return

        if PARAKEET_MODEL is None:
            await websocket.send_json({"ok": False, "error": "model_load_failed", "retryable": False})
            return

        logger.info(f"[{chunk_id}] Starting stream")

        audio_buffer = bytearray()
        last_partial_chars = 0
        last_partial_at = 0.0
        min_partial_bytes = 16000 * 2  # 1 second PCM16 mono at 16k

        while True:
            message = await websocket.receive()
            if "bytes" in message:
                frame_data = message["bytes"]
                if not frame_data:
                    continue
                audio_buffer.extend(frame_data)

                now = time.monotonic()
                enough_audio = len(audio_buffer) >= min_partial_bytes
                enough_time = (now - last_partial_at) >= 0.35
                if enough_audio and enough_time:
                    audio_float, err = normalize_pcm16_to_float32(bytes(audio_buffer))
                    if not err and audio_float:
                        partial_text, _ = transcribe_batch(PARAKEET_MODEL, audio_float)
                        if partial_text and len(partial_text) > last_partial_chars:
                            await websocket.send_json({
                                "ok": True,
                                "text": partial_text,
                                "is_final": False,
                            })
                            last_partial_chars = len(partial_text)
                            last_partial_at = now

            elif "text" in message:
                try:
                    payload = json.loads(message["text"])
                    if payload.get("eof"):
                        logger.info(f"[{chunk_id}] EOF received. Generating final transcript...")
                        break
                except json.JSONDecodeError:
                    pass

        # 3. Final Transcription
        if len(audio_buffer) == 0:
            await websocket.send_json({"ok": False, "error": "empty_audio", "retryable": False})
            return
            
        audio_float, error_code = normalize_pcm16_to_float32(bytes(audio_buffer))
        if error_code:
            await websocket.send_json({"ok": False, "error": error_code, "retryable": False})
            return
            
        final_text, error_code = transcribe_batch(PARAKEET_MODEL, audio_float)
        if error_code:
            await websocket.send_json({"ok": False, "error": error_code, "retryable": True})
            return
            
        await websocket.send_json({
            "ok": True,
            "text": final_text or "",
            "is_final": True
        })
        logger.info(f"[{chunk_id}] Stream completed successfully. Final text: '{final_text}'")
        
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected gracefully")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"ok": False, "error": "internal_error", "retryable": False})
        except Exception:
            pass

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro Parakeet ASR WebSocket Sidecar")
    parser.add_argument("--model-path", required=True, help="Path to Parakeet model directory")
    parser.add_argument("--device", required=True, choices=["cpu", "cuda"], help="Device name")
    parser.add_argument("--server", action="store_true", help="Run as FastAPI WebSocket Sidecar (always True now)")
    parser.add_argument("--port", type=int, default=5001, help="Server port")
    parser.add_argument("--health-port", type=int, default=5001, help="Health check port")
    return parser.parse_args()

def main():
    args = parse_args()
    
    global PARAKEET_MODEL
    global PARAKEET_DEVICE
    PARAKEET_DEVICE = args.device
    
    logger.info(f"Loading Parakeet model from {args.model_path} onto {args.device}...")
    try:
        PARAKEET_MODEL = load_parakeet_model(args.model_path, args.device)
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model natively: {e}")
        # We start the server anyway so the `/health` endpoint responds, but streams will fail.
        # This allows upstream connection polling to work.
    
    logger.info(f"Starting FastAPI WebSocket sidecar on port {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")

if __name__ == "__main__":
    main()
