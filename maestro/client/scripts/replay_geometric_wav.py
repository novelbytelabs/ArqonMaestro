#!/usr/bin/env python3
"""
Replay a recorded WAV file directly into the H4 geometric sidecar.

Usage:
  python scripts/replay_geometric_wav.py --wav /path/to/command.wav
"""
import argparse
import asyncio
import json
import uuid
import wave
from pathlib import Path
from typing import Optional

import websockets


def load_wav_pcm16_mono(path: Path) -> bytes:
    with wave.open(str(path), "rb") as wf:
        channels = wf.getnchannels()
        sample_width = wf.getsampwidth()
        sample_rate = wf.getframerate()
        frame_count = wf.getnframes()
        raw = wf.readframes(frame_count)

    if channels != 1:
        raise ValueError(f"expected mono wav, got channels={channels}")
    if sample_width != 2:
        raise ValueError(f"expected 16-bit pcm wav, got sample_width={sample_width}")
    if sample_rate != 16000:
        raise ValueError(f"expected 16000 Hz wav, got sample_rate={sample_rate}")
    return raw


async def replay_wav(
    wav_path: Path,
    ws_url: str,
    chunk_ms: int,
    chunk_id: Optional[str],
) -> int:
    pcm = load_wav_pcm16_mono(wav_path)
    bytes_per_chunk = int((16000 * 2) * (chunk_ms / 1000.0))
    if bytes_per_chunk <= 0:
        raise ValueError("chunk_ms must be > 0")

    sid = chunk_id or f"replay-{uuid.uuid4()}"
    print(f"[replay] chunk_id={sid}")
    print(f"[replay] ws_url={ws_url}")
    print(f"[replay] wav={wav_path}")
    print(f"[replay] pcm_bytes={len(pcm)} chunk_ms={chunk_ms} chunk_bytes={bytes_per_chunk}")

    final_message = None
    partial_count = 0
    async with websockets.connect(ws_url, max_size=8 * 1024 * 1024) as ws:
        await ws.send(json.dumps({"chunk_id": sid, "sample_rate_hz": 16000}))
        for i in range(0, len(pcm), bytes_per_chunk):
            await ws.send(pcm[i : i + bytes_per_chunk])
        await ws.send(json.dumps({"eof": True}))

        while True:
            msg = await ws.recv()
            payload = json.loads(msg)
            if payload.get("is_final"):
                final_message = payload
                break
            partial_count += 1
            print(f"[replay] partial[{partial_count}] {json.dumps(payload, separators=(',', ':'))}")

    print(f"[replay] final {json.dumps(final_message, separators=(',', ':'))}")
    event = (final_message or {}).get("geometric_event")
    if not event:
        print("[replay] result=NO_REGION")
        return 2
    print(
        "[replay] result=OK "
        f"region={event.get('region_id')} class={event.get('command_class')} "
        f"confidence={event.get('confidence')}"
    )
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Replay WAV into geometric sidecar")
    parser.add_argument("--wav", required=True, help="Path to mono PCM16 16kHz .wav file")
    parser.add_argument(
        "--ws-url",
        default="ws://127.0.0.1:5003/detect_stream",
        help="Geometric sidecar websocket URL",
    )
    parser.add_argument("--chunk-ms", type=int, default=30, help="Audio frame size sent to websocket")
    parser.add_argument("--chunk-id", default=None, help="Optional explicit chunk id")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    wav_path = Path(args.wav).expanduser()
    if not wav_path.exists():
        raise FileNotFoundError(f"wav file not found: {wav_path}")
    return asyncio.run(
        replay_wav(
            wav_path=wav_path,
            ws_url=args.ws_url,
            chunk_ms=args.chunk_ms,
            chunk_id=args.chunk_id,
        )
    )


if __name__ == "__main__":
    raise SystemExit(main())
