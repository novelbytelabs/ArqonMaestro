from __future__ import annotations

import base64
import io
import json
import os
import threading
import wave
from typing import Iterator, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from kokoro_onnx import Kokoro

MODEL_PATH = os.environ.get("KOKORO_MODEL_PATH", "/home/irbsurfer/Kokoros/checkpoints/kokoro-v1.0.onnx")
VOICES_PATH = os.environ.get("KOKORO_VOICES_PATH", "/home/irbsurfer/Kokoros/data/voices-v1.0.bin")
DEFAULT_VOICE = os.environ.get("KOKORO_DEFAULT_VOICE", "af_heart")
DEFAULT_LANG = os.environ.get("KOKORO_DEFAULT_LANG", "en-us")
TARGET_SR = 16000
STREAM_CHUNK_SAMPLES = 4096

app = FastAPI()
kokoro: Optional[Kokoro] = None
ready_error: Optional[str] = None
load_lock = threading.Lock()


class SynthesizeRequest(BaseModel):
    request_id: Optional[str] = None
    text: str
    voice: Optional[str] = None
    format: Optional[str] = "raw"
    stream: Optional[bool] = False
    input_audio_b64: Optional[str] = None


def _ensure_loaded() -> None:
    global kokoro, ready_error
    if kokoro is not None:
        return
    with load_lock:
        if kokoro is not None:
            return
        try:
            kokoro = Kokoro(MODEL_PATH, VOICES_PATH)
            ready_error = None
        except Exception as e:
            ready_error = str(e)
            raise


def _linear_resample(x: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    if src_sr == dst_sr:
        return x
    src_n = x.shape[0]
    dst_n = max(1, int(round(src_n * (dst_sr / src_sr))))
    src_idx = np.linspace(0.0, src_n - 1, num=src_n)
    dst_idx = np.linspace(0.0, src_n - 1, num=dst_n)
    return np.interp(dst_idx, src_idx, x).astype(np.float32)


def _to_pcm16_bytes(audio_f32: np.ndarray) -> bytes:
    clipped = np.clip(audio_f32, -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype(np.int16)
    return pcm16.tobytes()


def _to_wav_bytes(audio_f32: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(_to_pcm16_bytes(audio_f32))
    return buffer.getvalue()


def _iter_audio_segments(text: str, voice: str) -> Iterator[tuple[np.ndarray, int]]:
    if hasattr(kokoro, "create_stream"):
        try:
            stream = kokoro.create_stream(text, voice, speed=1.0, lang=DEFAULT_LANG)
            for item in stream:
                if isinstance(item, tuple) and len(item) >= 2 and isinstance(item[0], np.ndarray):
                    yield item[0], int(item[1])
                elif isinstance(item, np.ndarray):
                    yield item, 24000
            return
        except Exception:
            # Fall back to non-streamed generation if create_stream is unavailable/fails.
            pass

    audio_f32, sr = kokoro.create(text, voice, speed=1.0, lang=DEFAULT_LANG)
    yield audio_f32, int(sr)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "service": "kokoro-sidecar"}


@app.get("/readyz")
def readyz():
    try:
        _ensure_loaded()
    except Exception:
        return {"ready": False, "error": ready_error}
    return {"ready": True}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    try:
        _ensure_loaded()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"kokoro_not_ready: {e}")

    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    try:
        voice = req.voice or DEFAULT_VOICE
        audio_f32, sr = kokoro.create(text, voice, speed=1.0, lang=DEFAULT_LANG)
        audio_f32 = _linear_resample(audio_f32, sr, TARGET_SR)
        output_format = (req.format or "raw").lower()
        if output_format == "raw" or output_format == "pcm":
            payload = _to_pcm16_bytes(audio_f32)
            out_format = "raw"
        else:
            payload = _to_wav_bytes(audio_f32, TARGET_SR)
            out_format = "wav"
        return {
            "request_id": req.request_id,
            "format": out_format,
            "audio_data_b64": base64.b64encode(payload).decode("ascii"),
            "sample_rate": TARGET_SR,
            "voice": voice,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"kokoro_synthesis_failed: {e}")


@app.post("/synthesize_stream")
def synthesize_stream(req: SynthesizeRequest):
    try:
        _ensure_loaded()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"kokoro_not_ready: {e}")

    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    voice = req.voice or DEFAULT_VOICE

    def generate() -> Iterator[bytes]:
        try:
            for audio_f32, sr in _iter_audio_segments(text, voice):
                resampled = _linear_resample(audio_f32, sr, TARGET_SR)
                pcm = _to_pcm16_bytes(resampled)
                for idx in range(0, len(pcm), STREAM_CHUNK_SAMPLES * 2):
                    chunk = pcm[idx : idx + STREAM_CHUNK_SAMPLES * 2]
                    if not chunk:
                        continue
                    payload = {
                        "request_id": req.request_id,
                        "format": "raw",
                        "audio_chunk_b64": base64.b64encode(chunk).decode("ascii"),
                        "done": False,
                    }
                    yield (json.dumps(payload) + "\n").encode("utf-8")
            yield (
                json.dumps(
                    {
                        "request_id": req.request_id,
                        "format": "raw",
                        "done": True,
                    }
                )
                + "\n"
            ).encode("utf-8")
        except Exception as e:
            yield (
                json.dumps(
                    {
                        "request_id": req.request_id,
                        "error": f"kokoro_stream_failed: {e}",
                        "done": True,
                    }
                )
                + "\n"
            ).encode("utf-8")

    return StreamingResponse(generate(), media_type="application/x-ndjson")
