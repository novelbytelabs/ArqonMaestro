#!/usr/bin/env python3
import argparse
import json
import os
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro pyannote diarization bridge")
    parser.add_argument("--audio", required=True, help="Path to WAV audio file")
    parser.add_argument(
        "--pipeline",
        required=True,
        help="pyannote pipeline identifier (for example pyannote/speaker-diarization-community-1)",
    )
    return parser.parse_args()


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=True))


def main() -> int:
    args = parse_args()
    token = os.environ.get("MAESTRO_PYANNOTE_TOKEN", "").strip()
    if not token:
        print_json({"ok": False, "error": "missing_hf_token_env"})
        return 1

    try:
        from pyannote.audio import Pipeline

        pipeline = Pipeline.from_pretrained(args.pipeline, use_auth_token=token)
        diarization = pipeline(args.audio)

        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append(
                {
                    "start": float(turn.start),
                    "end": float(turn.end),
                    "speaker": str(speaker),
                }
            )

        segments.sort(key=lambda segment: (segment["start"], segment["end"], segment["speaker"]))
        print_json({"ok": True, "segments": segments})
        return 0
    except Exception as exc:
        print_json({"ok": False, "error": str(exc)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
