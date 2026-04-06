#!/usr/bin/env python3
"""
Standalone H3 geometric detection sidecar.

This sidecar exposes the H3 geometric detector without coupling it to the
Parakeet ASR model/runtime. It accepts raw PCM16 audio over WebSocket and emits
geometric events only.
"""
import argparse
import json
import logging
import time
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from h3_geometric_runtime import H3GeometricDetector, emit_h3_evidence

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
H3_GEOMETRIC_DETECTOR: Optional[H3GeometricDetector] = None


@app.get("/health")
async def health_check():
    detector = H3_GEOMETRIC_DETECTOR
    return {
        "status": "ok" if detector and detector.ready else "degraded",
        "detector_enabled": bool(detector and detector.enabled),
        "detector_ready": bool(detector and detector.ready),
        "detector_error": detector.error if detector else "detector_uninitialized",
        "atlas_schema": detector.atlas_schema if detector else "unknown",
        "atlas_version": detector.atlas_version if detector else "unknown",
    }


@app.get("/ready")
async def ready_check():
    detector = H3_GEOMETRIC_DETECTOR
    if detector is None or not detector.ready:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not_ready",
                "detector_enabled": bool(detector and detector.enabled),
                "detector_ready": False,
                "detector_error": detector.error if detector else "detector_uninitialized",
            },
        )
    return {
        "status": "ready",
        "detector_enabled": True,
        "detector_ready": True,
        "detector_error": "",
        "atlas_schema": detector.atlas_schema,
        "atlas_version": detector.atlas_version,
    }


@app.websocket("/detect_stream")
async def websocket_detect(websocket: WebSocket):
    await websocket.accept()
    logger.info("Geometric WebSocket connected")

    detector = H3_GEOMETRIC_DETECTOR
    if detector is None or not detector.ready:
        await websocket.send_json({"ok": False, "error": "geometric_detector_not_ready", "retryable": False})
        await websocket.close()
        return

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

        audio_buffer = bytearray()
        stream_started_at = time.monotonic()
        last_signature = None
        partial_min_bytes = 16000 * 2
        partial_interval_sec = 0.2
        last_emit_at = 0.0

        while True:
            message = await websocket.receive()
            if "bytes" in message:
                frame_data = message["bytes"]
                if not frame_data:
                    continue
                audio_buffer.extend(frame_data)

                now = time.monotonic()
                if len(audio_buffer) < partial_min_bytes or (now - last_emit_at) < partial_interval_sec:
                    continue

                event = detector.detect(bytes(audio_buffer), int((now - stream_started_at) * 1000))
                if event is None:
                    continue
                signature = f"{event.get('region_id')}|{event.get('command_class')}"
                if signature == last_signature:
                    continue
                last_signature = signature
                last_emit_at = now
                emit_h3_evidence(
                    "geometric_event_emitted",
                    chunk_id,
                    timestamp_ms=int(event.get("timestamp_ms", 0)),
                    source=str(event.get("source")),
                    region_id=str(event.get("region_id")),
                    command_class=str(event.get("command_class")),
                    reason=(
                        "standalone_geometric_sidecar_partial;"
                        f"atlas_backed={bool(event.get('atlas_backed', False))};"
                        f"atlas_schema={event.get('atlas_schema')};"
                        f"atlas_version={event.get('atlas_version')}"
                    ),
                )
                await websocket.send_json({"ok": True, "is_final": False, "geometric_event": event})

            elif "text" in message:
                try:
                    payload = json.loads(message["text"])
                    if payload.get("eof"):
                        break
                except json.JSONDecodeError:
                    pass

        final_event = detector.detect(bytes(audio_buffer), int((time.monotonic() - stream_started_at) * 1000)) if audio_buffer else None
        final_payload: Dict[str, Any] = {"ok": True, "is_final": True}
        if final_event is not None:
            emit_h3_evidence(
                "geometric_event_emitted",
                chunk_id,
                timestamp_ms=int(final_event.get("timestamp_ms", 0)),
                source=str(final_event.get("source")),
                region_id=str(final_event.get("region_id")),
                command_class=str(final_event.get("command_class")),
                reason=(
                    "standalone_geometric_sidecar_final;"
                    f"atlas_backed={bool(final_event.get('atlas_backed', False))};"
                    f"atlas_schema={final_event.get('atlas_schema')};"
                    f"atlas_version={final_event.get('atlas_version')}"
                ),
            )
            final_payload["geometric_event"] = final_event
        else:
            final_payload["geometric_reject"] = detector.consume_last_reject_payload()
        await websocket.send_json(final_payload)
    except WebSocketDisconnect:
        logger.info("Geometric WebSocket disconnected gracefully")
    except Exception as exc:
        logger.error("Geometric WebSocket error: %s", exc)
        try:
            await websocket.send_json({"ok": False, "error": "internal_error", "retryable": False})
        except Exception:
            pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro H3 Geometric Sidecar")
    parser.add_argument("--port", type=int, default=5003, help="Server port")
    return parser.parse_args()


def main():
    args = parse_args()
    global H3_GEOMETRIC_DETECTOR
    H3_GEOMETRIC_DETECTOR = H3GeometricDetector()
    if H3_GEOMETRIC_DETECTOR.ready:
        logger.info(
            "Standalone geometric detector ready: schema=%s atlas_version=%s",
            H3_GEOMETRIC_DETECTOR.atlas_schema,
            H3_GEOMETRIC_DETECTOR.atlas_version,
        )
    else:
        logger.warning("Standalone geometric detector not ready: %s", H3_GEOMETRIC_DETECTOR.error)
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
