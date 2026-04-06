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
from typing import Any, Dict, Optional, Tuple

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from h3_geometric_runtime import H3GeometricDetector, emit_h3_evidence, normalize_pcm16_to_float32

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

PARAKEET_MODEL = None
PARAKEET_DEVICE = "cpu"
PARAKEET_MODEL_ERROR = ""
H3_GEOMETRIC_DETECTOR: Optional[H3GeometricDetector] = None


def load_parakeet_model(model_path: str, device: str):
    try:
        import torch
        import nemo.collections.asr as nemo_asr

        if not os.path.exists(model_path):
            logger.error("Model path does not exist: %s", model_path)
            raise FileNotFoundError(f"Model directory not found: {model_path}")

        model = nemo_asr.models.ASRModel.restore_from(model_path, map_location="cpu")
        if device == "cuda" and torch.cuda.is_available():
            model = model.cuda()
        else:
            model = model.cpu()
        return model
    except Exception as e:
        logger.error("Failed to load model: %s", e)
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
        logger.error("Inference error: %s", e)
        return None, "inference_failed"


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "model": "parakeet",
        "streaming_enabled": True,
        "model_loaded": PARAKEET_MODEL is not None,
        "model_error": PARAKEET_MODEL_ERROR,
    }


@app.get("/ready")
async def ready_check():
    if PARAKEET_MODEL is None:
        return JSONResponse(status_code=503, content={
            "status": "not_ready",
            "model": "parakeet",
            "streaming_enabled": True,
            "model_loaded": False,
            "model_error": PARAKEET_MODEL_ERROR or "model_not_loaded",
        })
    return {
        "status": "ready",
        "model": "parakeet",
        "streaming_enabled": True,
        "model_loaded": True,
        "model_error": "",
    }


@app.websocket("/transcribe_stream")
async def websocket_transcribe(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connected")

    try:
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

        logger.info("[%s] Starting stream", chunk_id)

        audio_buffer = bytearray()
        last_partial_chars = 0
        last_partial_at = 0.0
        min_partial_bytes = 16000 * 2
        stream_started_at = time.monotonic()

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
                    geometric_event = None
                    if H3_GEOMETRIC_DETECTOR is not None:
                        geometric_event = H3_GEOMETRIC_DETECTOR.detect(
                            bytes(audio_buffer),
                            int((now - stream_started_at) * 1000),
                        )
                        if geometric_event is not None:
                            logger.info(
                                "[%s] geometric_event partial region=%s class=%s conf=%.3f",
                                chunk_id,
                                geometric_event['region_id'],
                                geometric_event['command_class'],
                                geometric_event['confidence'],
                            )
                    if not err and audio_float:
                        partial_text, _ = transcribe_batch(PARAKEET_MODEL, audio_float)
                        should_emit = False
                        payload: Dict[str, Any] = {"ok": True, "is_final": False}
                        if geometric_event is not None:
                            payload["geometric_event"] = geometric_event
                            emit_h3_evidence(
                                "geometric_event_emitted",
                                chunk_id,
                                timestamp_ms=int(geometric_event.get("timestamp_ms", 0)),
                                source=str(geometric_event.get("source")),
                                region_id=str(geometric_event.get("region_id")),
                                command_class=str(geometric_event.get("command_class")),
                                had_transcript_text=bool(partial_text and partial_text.strip()),
                                transcript_text=partial_text if partial_text and partial_text.strip() else None,
                                reason=(
                                    "partial_payload;"
                                    f"atlas_backed={bool(geometric_event.get('atlas_backed', False))};"
                                    f"atlas_schema={geometric_event.get('atlas_schema')};"
                                    f"atlas_version={geometric_event.get('atlas_version')}"
                                ),
                            )
                            should_emit = True
                        if partial_text and len(partial_text) > last_partial_chars:
                            payload["text"] = partial_text
                            should_emit = True
                            last_partial_chars = len(partial_text)
                            last_partial_at = now
                        if should_emit:
                            await websocket.send_json(payload)

            elif "text" in message:
                try:
                    payload = json.loads(message["text"])
                    if payload.get("eof"):
                        logger.info("[%s] EOF received. Generating final transcript...", chunk_id)
                        break
                except json.JSONDecodeError:
                    pass

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

        geometric_event = None
        if H3_GEOMETRIC_DETECTOR is not None:
            now = time.monotonic()
            geometric_event = H3_GEOMETRIC_DETECTOR.detect(
                bytes(audio_buffer),
                int((now - stream_started_at) * 1000),
            )
            if geometric_event is not None:
                logger.info(
                    "[%s] geometric_event final region=%s class=%s conf=%.3f",
                    chunk_id,
                    geometric_event['region_id'],
                    geometric_event['command_class'],
                    geometric_event['confidence'],
                )

        final_payload: Dict[str, Any] = {"ok": True, "text": final_text or "", "is_final": True}
        if geometric_event is not None:
            final_payload["geometric_event"] = geometric_event
            emit_h3_evidence(
                "geometric_event_emitted",
                chunk_id,
                timestamp_ms=int(geometric_event.get("timestamp_ms", 0)),
                source=str(geometric_event.get("source")),
                region_id=str(geometric_event.get("region_id")),
                command_class=str(geometric_event.get("command_class")),
                had_transcript_text=bool(final_text and final_text.strip()),
                transcript_text=final_text if final_text and final_text.strip() else None,
                reason=(
                    "final_payload;"
                    f"atlas_backed={bool(geometric_event.get('atlas_backed', False))};"
                    f"atlas_schema={geometric_event.get('atlas_schema')};"
                    f"atlas_version={geometric_event.get('atlas_version')}"
                ),
            )
        await websocket.send_json(final_payload)
        logger.info("[%s] Stream completed successfully. Final text: '%s'", chunk_id, final_text)

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected gracefully")
    except Exception as e:
        logger.error("WebSocket error: %s", e)
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
    global PARAKEET_MODEL_ERROR
    global H3_GEOMETRIC_DETECTOR
    PARAKEET_DEVICE = args.device
    H3_GEOMETRIC_DETECTOR = H3GeometricDetector()

    logger.info("Loading Parakeet model from %s onto %s...", args.model_path, args.device)
    try:
        PARAKEET_MODEL = load_parakeet_model(args.model_path, args.device)
        PARAKEET_MODEL_ERROR = ""
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error("Failed to load model on %s: %s", args.device, e)
        if args.device == "cuda":
            try:
                logger.warning("Retrying Parakeet model load on CPU fallback...")
                PARAKEET_MODEL = load_parakeet_model(args.model_path, "cpu")
                PARAKEET_DEVICE = "cpu"
                PARAKEET_MODEL_ERROR = ""
                logger.warning("Parakeet model loaded on CPU fallback; inference will be slower.")
            except Exception as cpu_e:
                logger.error("CPU fallback load failed: %s", cpu_e)
                PARAKEET_MODEL_ERROR = str(cpu_e)
        else:
            PARAKEET_MODEL_ERROR = str(e)

    logger.info("Starting FastAPI WebSocket sidecar on port %s...", args.port)
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
