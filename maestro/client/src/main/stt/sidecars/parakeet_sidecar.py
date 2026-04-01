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
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Global loaded model
PARAKEET_MODEL = None
PARAKEET_DEVICE = "cpu"
PARAKEET_MODEL_ERROR = ""
H3_GEOMETRIC_DETECTOR = None


def emit_h3_evidence(
    event: str,
    chunk_id: str,
    *,
    timestamp_ms: Optional[int] = None,
    source: Optional[str] = None,
    region_id: Optional[str] = None,
    command_class: Optional[str] = None,
    had_transcript_text: Optional[bool] = None,
    transcript_text: Optional[str] = None,
    route_before: Optional[str] = None,
    route_after: Optional[str] = None,
    tail_start_ms: Optional[int] = None,
    tail_end_ms: Optional[int] = None,
    tail_text: Optional[str] = None,
    merged_text: Optional[str] = None,
    step_count: Optional[int] = None,
    final_granted: Optional[bool] = None,
    reason: Optional[str] = None,
) -> None:
    payload: Dict[str, Any] = {
        "event": event,
        "chunkId": chunk_id,
        "timestampMs": int(timestamp_ms if timestamp_ms is not None else int(time.monotonic() * 1000)),
        "source": source,
        "regionId": region_id,
        "commandClass": command_class,
        "hadTranscriptText": had_transcript_text,
        "transcriptText": transcript_text,
        "routeBefore": route_before,
        "routeAfter": route_after,
        "tailStartMs": tail_start_ms,
        "tailEndMs": tail_end_ms,
        "tailText": tail_text,
        "mergedText": merged_text,
        "stepCount": step_count,
        "finalGranted": final_granted,
        "reason": reason,
    }
    logger.info("[H3_EVIDENCE] %s", json.dumps(payload, separators=(",", ":")))

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


class H3GeometricDetector:
    """Detect geometric command regions from raw audio via libhume spectral/manifold path."""

    def __init__(self):
        self.enabled = os.getenv("H3_GEOMETRIC_ENABLED", "false").lower() == "true"
        self.ready = False
        self.error = ""
        self.libhume = None
        self.np = None
        self.lift = None
        self.db_words = None
        self.command_names: List[str] = []
        self.command_meta: Dict[str, Dict[str, Any]] = {}
        self.feature_dim = 0
        if not self.enabled:
            return

        try:
            import numpy as np  # type: ignore
            import libhume  # type: ignore

            self.np = np
            self.libhume = libhume
            self.lift = libhume.SpectralLift(16000, 20, 10)
            atlas = self._load_or_build_atlas()
            commands = atlas.get("commands", {})
            if not commands:
                raise RuntimeError("empty_h3_command_atlas")
            self.command_names = list(commands.keys())
            self.command_meta = {
                name: {
                    "class": str(commands[name].get("class", "unknown")),
                    "min_frames": int(commands[name].get("min_frames", 1)),
                }
                for name in self.command_names
            }
            self.feature_dim = int(next(iter(commands.values())).get("feature_dim", 0))
            self.db_words = np.array([commands[name]["packed_words"] for name in self.command_names], dtype=np.uint64)
            self.ready = True
            logger.info("[H3] geometric detector ready (spectral/manifold runtime)")
        except Exception as exc:
            self.error = str(exc)
            self.ready = False
            logger.warning(f"[H3] geometric detector unavailable: {self.error}")

    def _load_or_build_atlas(self) -> Dict[str, Any]:
        atlas_path_env = os.getenv("MAESTRO_H3_ATLAS_PATH", "").strip()
        if atlas_path_env:
            atlas_path = Path(atlas_path_env).expanduser()
        else:
            atlas_path = Path("/tmp/maestro_h3_bootstrap_atlas.json")

        if atlas_path.exists():
            return json.loads(atlas_path.read_text(encoding="utf-8"))

        manifold_root = Path(
            os.getenv("MAESTRO_ARQON_MANIFOLD_ROOT", "/home/irbsurfer/Projects/arqon/ArqonManifold")
        ).expanduser()
        tools_dir = manifold_root / "tools"
        if not tools_dir.exists():
            raise RuntimeError(f"h3_manifold_tools_not_found:{tools_dir}")
        if str(tools_dir) not in sys.path:
            sys.path.insert(0, str(tools_dir))

        from command_atlas import bootstrap_demo_atlas  # type: ignore

        atlas_path.parent.mkdir(parents=True, exist_ok=True)
        return bootstrap_demo_atlas(atlas_path)

    def _aggregate_signature(self, audio_float: List[float]):
        assert self.np is not None
        assert self.lift is not None
        frames = self.lift.process_buffer(audio_float)
        frame_count = len(frames)
        if frame_count == 0:
            return None, 0
        drho = self.np.array([frame.drho for frame in frames], dtype=self.np.float32)
        dtheta = self.np.array([frame.dtheta for frame in frames], dtype=self.np.float32)
        signature = self.np.concatenate([drho.mean(axis=0), dtheta.mean(axis=0)], axis=0)
        return signature, frame_count

    def _pack_bits_to_u64(self, bits):
        assert self.np is not None
        rem = len(bits) % 64
        if rem:
            bits = self.np.pad(bits, (0, 64 - rem), constant_values=0)
        words: List[int] = []
        for start in range(0, len(bits), 64):
            word = 0
            chunk = bits[start : start + 64]
            for bit_idx, bit in enumerate(chunk):
                if int(bit):
                    word |= (1 << bit_idx)
            words.append(word)
        return self.np.array(words, dtype=self.np.uint64)

    def _scan_best(self, query_words):
        assert self.np is not None
        assert self.db_words is not None
        assert self.libhume is not None
        scores = self.np.zeros((1, self.db_words.shape[0]), dtype=self.np.int32)
        self.libhume.hume_scan_batch(
            self.np.array([query_words], dtype=self.np.uint64),
            self.db_words,
            scores,
        )
        row = scores[0]
        best_idx = int(self.np.argmax(row))
        sorted_scores = self.np.sort(row)
        best_score = int(row[best_idx])
        second_score = int(sorted_scores[-2]) if row.shape[0] > 1 else best_score
        return best_idx, best_score, second_score

    def detect(self, audio_bytes: bytes, timestamp_ms: int) -> Optional[Dict[str, Any]]:
        if not self.ready:
            return None
        audio_float, err = normalize_pcm16_to_float32(audio_bytes)
        if err or not audio_float:
            return None
        signature, frame_count = self._aggregate_signature(audio_float)
        if signature is None or frame_count == 0:
            return None
        bits = (signature >= 0.0).astype(self.np.uint8)
        query_words = self._pack_bits_to_u64(bits)
        best_idx, best_score, second_score = self._scan_best(query_words)
        command_name = self.command_names[best_idx]
        meta = self.command_meta.get(command_name, {})
        min_frames = int(meta.get("min_frames", 1))
        if frame_count < min_frames:
            return None
        # Relative margin confidence from nearest-neighbor score spread.
        denom = max(abs(best_score), 1)
        confidence = max(0.0, min(1.0, (best_score - second_score) / float(denom)))
        if confidence < 0.12:
            return None
        return {
            "source": "spectral_manifold",
            "region_id": command_name,
            "command_class": str(meta.get("class", "unknown")),
            "confidence": confidence,
            "frame_count": int(frame_count),
            "timestamp_ms": int(timestamp_ms),
        }

def load_parakeet_model(model_path: str, device: str):
    try:
        import torch
        import nemo.collections.asr as nemo_asr
        
        if not os.path.exists(model_path):
            logger.error(f"Model path does not exist: {model_path}")
            raise FileNotFoundError(f"Model directory not found: {model_path}")
            
        # Always restore weights on CPU first, then move to target device.
        # This avoids implicit GPU allocations during restore and enables
        # deterministic CPU fallback on CUDA OOM/mismatch.
        model = nemo_asr.models.ASRModel.restore_from(model_path, map_location="cpu")
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
                                f"[{chunk_id}] geometric_event partial region={geometric_event['region_id']} "
                                f"class={geometric_event['command_class']} conf={geometric_event['confidence']:.3f}"
                            )
                    if not err and audio_float:
                        partial_text, _ = transcribe_batch(PARAKEET_MODEL, audio_float)
                        should_emit = False
                        payload: Dict[str, Any] = {
                            "ok": True,
                            "is_final": False,
                        }
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
                                reason="partial_payload",
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

        geometric_event = None
        if H3_GEOMETRIC_DETECTOR is not None:
            now = time.monotonic()
            geometric_event = H3_GEOMETRIC_DETECTOR.detect(
                bytes(audio_buffer),
                int((now - stream_started_at) * 1000),
            )
            if geometric_event is not None:
                logger.info(
                    f"[{chunk_id}] geometric_event final region={geometric_event['region_id']} "
                    f"class={geometric_event['command_class']} conf={geometric_event['confidence']:.3f}"
                )
            
        final_payload: Dict[str, Any] = {
            "ok": True,
            "text": final_text or "",
            "is_final": True
        }
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
                reason="final_payload",
            )
        await websocket.send_json(final_payload)
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
    global PARAKEET_MODEL_ERROR
    global H3_GEOMETRIC_DETECTOR
    PARAKEET_DEVICE = args.device
    H3_GEOMETRIC_DETECTOR = H3GeometricDetector()
    
    logger.info(f"Loading Parakeet model from {args.model_path} onto {args.device}...")
    try:
        PARAKEET_MODEL = load_parakeet_model(args.model_path, args.device)
        PARAKEET_MODEL_ERROR = ""
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model on {args.device}: {e}")
        if args.device == "cuda":
            # cuDNN/driver mismatches are common in mixed CUDA host setups.
            # Gracefully fall back to CPU so the local endpoint remains usable.
            try:
                logger.warning("Retrying Parakeet model load on CPU fallback...")
                PARAKEET_MODEL = load_parakeet_model(args.model_path, "cpu")
                PARAKEET_DEVICE = "cpu"
                PARAKEET_MODEL_ERROR = ""
                logger.warning("Parakeet model loaded on CPU fallback; inference will be slower.")
            except Exception as cpu_e:
                logger.error(f"CPU fallback load failed: {cpu_e}")
                PARAKEET_MODEL_ERROR = str(cpu_e)
        else:
            PARAKEET_MODEL_ERROR = str(e)
        # We start the server anyway so the `/health` endpoint responds, but streams will fail.
        # This allows upstream connection polling to work.
    
    logger.info(f"Starting FastAPI WebSocket sidecar on port {args.port}...")
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")

if __name__ == "__main__":
    main()
