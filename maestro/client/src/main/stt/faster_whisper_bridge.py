#!/usr/bin/env python3
import argparse
import json
import sys
import os
import io
import wave

# Protect stdout from framework noise (Python & C-level)
# Save original stdout fd, then point fd 1 to stderr (fd 2)
try:
    ORIGINAL_STDOUT_FD = os.dup(1)
    os.dup2(2, 1)
except Exception:
    ORIGINAL_STDOUT_FD = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro faster-whisper dictation bridge")
    parser.add_argument("--audio", required=False, help="Path to WAV audio file")
    parser.add_argument("--stdin", action="store_true", help="Accept raw PCM16 via stdin")
    parser.add_argument("--model", required=True, help="Model name")
    parser.add_argument("--device", required=True, help="Device name (cuda/cpu)")
    parser.add_argument("--compute-type", required=True, dest="compute_type", help="Compute type")
    parser.add_argument("--language", default="en", help="Language code")
    return parser.parse_args()


def print_json(payload: dict) -> None:
    """Output strict single-line JSON to the original stdout."""
    out_str = json.dumps(payload, ensure_ascii=True) + "\n"
    if ORIGINAL_STDOUT_FD is not None:
        try:
            with os.fdopen(ORIGINAL_STDOUT_FD, "w", closefd=False) as f:
                f.write(out_str)
                f.flush()
            return
        except Exception:
            pass
    # Fallback if OS fd tricks failed
    print(out_str, file=sys.__stdout__, flush=True)


def main() -> int:
    args = parse_args()

    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(
            args.model,
            device=args.device,
            compute_type=args.compute_type,
        )

        if args.stdin:
            import numpy as np
            audio_bytes = sys.stdin.buffer.read()
            if not audio_bytes:
                print_json({"ok": False, "error": "empty_audio", "retryable": True})
                return 0
                
            # If WAV header exists, extract PCM16 matching the strict standard
            if audio_bytes.startswith(b"RIFF"):
                with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                    if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
                        print_json({"ok": False, "error": "audio_format_invalid", "retryable": False})
                        return 1
                    audio_bytes = wf.readframes(wf.getnframes())
            
            # Convert PCM16 LE to float32 normalized 1D numpy array for whisper
            int16_data = np.frombuffer(audio_bytes, dtype=np.int16)
            if len(int16_data) == 0:
                print_json({"ok": False, "error": "empty_audio", "retryable": True})
                return 0
                
            audio_input = int16_data.astype(np.float32) / 32768.0
            audio_input = np.clip(audio_input, -1.0, 1.0)
            segments, _info = model.transcribe(audio_input, language=args.language, vad_filter=False)
        else:
            if not args.audio:
                print_json({"ok": False, "error": "audio_format_invalid", "retryable": False})
                return 1
            segments, _info = model.transcribe(args.audio, language=args.language, vad_filter=False)
            
        text = " ".join((segment.text or "").strip() for segment in segments).strip()

        if not text:
            print_json({"ok": False, "error": "empty_audio", "retryable": True})
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
        error_str = str(exc).lower()
        # Map to stable error codes
        if "model" in error_str and "load" in error_str:
            print_json({"ok": False, "error": "model_load_failed", "retryable": False})
        elif "timeout" in error_str:
            print_json({"ok": False, "error": "timeout", "retryable": True})
        else:
            print_json({"ok": False, "error": "inference_failed", "retryable": False})
        return 1


if __name__ == "__main__":
    sys.exit(main())
