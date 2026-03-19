#!/usr/bin/env python3
import argparse
import json
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro faster-whisper dictation bridge")
    parser.add_argument("--audio", required=True, help="Path to WAV audio file")
    parser.add_argument("--model", required=True, help="Model name")
    parser.add_argument("--device", required=True, help="Device name (cuda/cpu)")
    parser.add_argument("--compute-type", required=True, dest="compute_type", help="Compute type")
    parser.add_argument("--language", default="en", help="Language code")
    return parser.parse_args()


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=True))


def main() -> int:
    args = parse_args()

    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type=args.compute_type,
        )

        segments, _info = model.transcribe(args.audio, language=args.language, vad_filter=False)
        text = " ".join((segment.text or "").strip() for segment in segments).strip()

        if not text:
            print_json({"ok": False, "error": "empty_transcript"})
            return 0

        print_json(
            {
                "ok": True,
                "text": text,
                "language": args.language,
                "model": args.model,
                "device": args.device,
            }
        )
        return 0
    except Exception as exc:
        print_json({"ok": False, "error": str(exc)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
