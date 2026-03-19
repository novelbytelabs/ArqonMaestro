#!/usr/bin/env python3
import argparse
import json
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Maestro WeSpeaker verification bridge")
    parser.add_argument("--enroll-audio", required=True, help="Path to enrolled speaker wav")
    parser.add_argument("--probe-audio", required=True, help="Path to probe speaker wav")
    parser.add_argument("--model-target", default="english", help="WeSpeaker model target")
    parser.add_argument("--model-home", required=True, help="Directory for WeSpeaker models")
    parser.add_argument("--device", default="cpu", help="Execution device")
    return parser.parse_args()


def print_json(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=True))


def cosine_similarity(vec1, vec2) -> float:
    import numpy as np

    v1 = np.asarray(vec1, dtype=float)
    v2 = np.asarray(vec2, dtype=float)
    denom = (np.linalg.norm(v1) * np.linalg.norm(v2))
    if denom == 0:
        return 0.0
    return float(np.dot(v1, v2) / denom)


def main() -> int:
    args = parse_args()

    if args.device.lower() != "cpu":
        print_json({"ok": False, "error": "cpu_only_in_wave_c2"})
        return 1

    try:
        # WeSpeaker API differs by version; this bridge intentionally uses
        # defensive fallback imports and returns explicit errors when unavailable.
        import os
        os.environ["WESPEAKER_HOME"] = args.model_home

        try:
            from wespeaker.cli.speaker import Speaker

            speaker = Speaker(
                model_dir=args.model_target,
                device="cpu",
            )
            enroll_emb = speaker.extract_embedding(args.enroll_audio)
            probe_emb = speaker.extract_embedding(args.probe_audio)
            similarity = cosine_similarity(enroll_emb, probe_emb)
        except Exception:
            import wespeaker
            if hasattr(wespeaker, "load_model"):
                model = wespeaker.load_model(args.model_target, device="cpu")
                enroll_emb = model.extract_embedding(args.enroll_audio)
                probe_emb = model.extract_embedding(args.probe_audio)
                similarity = cosine_similarity(enroll_emb, probe_emb)
            else:
                raise RuntimeError("unsupported_wespeaker_api")

        print_json({"ok": True, "similarity": float(similarity)})
        return 0
    except Exception as exc:
        print_json({"ok": False, "error": str(exc)})
        return 1


if __name__ == "__main__":
    sys.exit(main())
