#!/usr/bin/env python3
"""
Shared H3 geometric runtime helpers.

This module extracts the geometric detector and its helper utilities out of
parakeet_sidecar.py so the detector can be used independently by:
- parakeet_sidecar.py
- geometric_sidecar.py
"""
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

H3_VALIDATED_V1_REGIONS = {"pause", "new tab", "focus chrome", "go to line", "go to", "open"}


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
        logger.error("Error normalizing audio: %s", e)
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
        self.atlas_schema = "unknown"
        self.atlas_version = "unknown"
        self.bootstrap_mode = False
        self._bootstrap_validated_region_warning_emitted = False
        if not self.enabled:
            return

        try:
            import numpy as np  # type: ignore
            import libhume  # type: ignore

            self.np = np
            self.libhume = libhume
            self.lift = libhume.SpectralLift(16000, 20, 10)
            atlas = self._load_atlas()
            commands = self._commands_from_atlas(atlas)
            if not commands:
                raise RuntimeError("empty_h3_command_atlas")
            self.command_names = [c["region_id"] for c in commands]
            self.command_meta = {
                c["region_id"]: {
                    "command_id": str(c.get("command_id", c["region_id"])),
                    "class": str(c.get("command_class", "unknown")),
                    "parameter_type": c.get("parameter_type"),
                    "min_frames": int(c.get("min_frames", 1)),
                    "activation_threshold": float(c.get("activation_threshold", 0.12)),
                    "stability_threshold": float(c.get("stability_threshold", 0.78)),
                    "fallback_eligible": bool(c.get("fallback_eligible", True)),
                }
                for c in commands
            }
            self.feature_dim = int(commands[0].get("feature_dim", 0))
            self.db_words = np.array([c["centroid_words"] for c in commands], dtype=np.uint64)
            build = atlas.get("build", {}) if isinstance(atlas.get("build", {}), dict) else {}
            self.atlas_schema = str(atlas.get("schema_version", "unknown"))
            self.atlas_version = str(build.get("atlas_version", atlas.get("version", "unknown")))
            self.ready = True
            logger.info(
                "[H3] geometric detector ready (spectral/manifold runtime), schema=%s, atlas_version=%s",
                self.atlas_schema,
                self.atlas_version,
            )
        except Exception as exc:
            self.error = str(exc)
            self.ready = False
            logger.warning("[H3] geometric detector unavailable: %s", self.error)

    def _load_atlas(self) -> Dict[str, Any]:
        atlas_path_env = os.getenv("MAESTRO_H3_ATLAS_PATH", "").strip()
        if atlas_path_env:
            atlas_path = Path(atlas_path_env).expanduser()
            if not atlas_path.exists():
                raise RuntimeError(f"h3_atlas_not_found:{atlas_path}")
            atlas = json.loads(atlas_path.read_text(encoding="utf-8"))
            self._validate_atlas_v1(atlas, source=f"env:{atlas_path}")
            return atlas

        default_v1 = Path("/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/artifacts/h3/command_atlas_v1.json")
        if default_v1.exists():
            atlas = json.loads(default_v1.read_text(encoding="utf-8"))
            self._validate_atlas_v1(atlas, source=f"default:{default_v1}")
            return atlas

        if os.getenv("MAESTRO_H3_ALLOW_BOOTSTRAP", "0") != "1":
            raise RuntimeError("h3_command_atlas_v1_required_and_missing")

        bootstrap_path = Path("/tmp/maestro_h3_bootstrap_atlas.json")
        if bootstrap_path.exists():
            logger.warning("[H3] using legacy bootstrap atlas fallback")
            self.bootstrap_mode = True
            return json.loads(bootstrap_path.read_text(encoding="utf-8"))

        manifold_root = Path(
            os.getenv("MAESTRO_ARQON_MANIFOLD_ROOT", "/home/irbsurfer/Projects/arqon/ArqonManifold")
        ).expanduser()
        tools_dir = manifold_root / "tools"
        if not tools_dir.exists():
            raise RuntimeError(f"h3_manifold_tools_not_found:{tools_dir}")
        if str(tools_dir) not in sys.path:
            sys.path.insert(0, str(tools_dir))

        from command_atlas import bootstrap_demo_atlas  # type: ignore

        bootstrap_path.parent.mkdir(parents=True, exist_ok=True)
        logger.warning("[H3] building legacy bootstrap atlas fallback (Stage 3A compatibility mode)")
        self.bootstrap_mode = True
        return bootstrap_demo_atlas(bootstrap_path)

    def _validate_atlas_v1(self, atlas: Dict[str, Any], *, source: str) -> None:
        schema = atlas.get("schema_version")
        if schema != "h3_command_atlas_v1":
            raise RuntimeError(f"h3_atlas_schema_invalid:{source}:{schema}")
        commands = atlas.get("commands")
        if not isinstance(commands, list) or len(commands) == 0:
            raise RuntimeError(f"h3_atlas_commands_invalid:{source}")
        for idx, cmd in enumerate(commands):
            if not isinstance(cmd, dict):
                raise RuntimeError(f"h3_atlas_command_not_object:{source}:{idx}")
            for key in ("command_id", "region_id", "command_class", "centroid_words", "feature_dim"):
                if key not in cmd:
                    raise RuntimeError(f"h3_atlas_command_missing_field:{source}:{idx}:{key}")
            if cmd.get("command_class") not in ("reflex", "closed_structure", "parameterized", "unknown"):
                raise RuntimeError(f"h3_atlas_command_class_invalid:{source}:{idx}")
            if cmd.get("parameter_type") not in (None, "numeric", "open"):
                raise RuntimeError(f"h3_atlas_parameter_type_invalid:{source}:{idx}")
            centroid_words = cmd.get("centroid_words")
            if not isinstance(centroid_words, list) or len(centroid_words) == 0:
                raise RuntimeError(f"h3_atlas_centroid_words_invalid:{source}:{idx}")

    def _commands_from_atlas(self, atlas: Dict[str, Any]) -> List[Dict[str, Any]]:
        if atlas.get("schema_version") == "h3_command_atlas_v1":
            commands = atlas.get("commands", [])
            if not isinstance(commands, list):
                return []
            normalized: List[Dict[str, Any]] = []
            for c in commands:
                if not isinstance(c, dict):
                    continue
                if "region_id" not in c or "centroid_words" not in c:
                    continue
                normalized.append(c)
            return normalized

        legacy = atlas.get("commands", {})
        if not isinstance(legacy, dict):
            return []
        out: List[Dict[str, Any]] = []
        for region_id, meta in legacy.items():
            if not isinstance(meta, dict):
                continue
            packed = meta.get("packed_words")
            if not isinstance(packed, list):
                continue
            out.append(
                {
                    "region_id": str(region_id),
                    "command_class": str(meta.get("class", "unknown")),
                    "parameter_type": str(meta.get("param_type")) if meta.get("param_type") is not None else None,
                    "centroid_words": packed,
                    "feature_dim": int(meta.get("feature_dim", 0)),
                    "capture_radius": int(meta.get("capture_radius", 0)),
                    "min_frames": int(meta.get("min_frames", 1)),
                    "activation_threshold": float(meta.get("activation_threshold", 0.12)),
                    "stability_threshold": float(meta.get("stability_threshold", 0.78)),
                    "fallback_eligible": bool(meta.get("fallback_eligible", True)),
                }
            )
        return out

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
        allow_bootstrap_validated = os.getenv("MAESTRO_H3_ALLOW_BOOTSTRAP_VALIDATED_V1", "0") == "1"
        if self.bootstrap_mode and command_name in H3_VALIDATED_V1_REGIONS and not allow_bootstrap_validated:
            if not self._bootstrap_validated_region_warning_emitted:
                logger.warning(
                    "[H3] bootstrap fallback suppression active for validated v1 regions; "
                    "set MAESTRO_H3_ALLOW_BOOTSTRAP_VALIDATED_V1=1 to override"
                )
                self._bootstrap_validated_region_warning_emitted = True
            return None
        min_frames = int(meta.get("min_frames", 1))
        if frame_count < min_frames:
            return None
        denom = max(abs(best_score), 1)
        confidence = max(0.0, min(1.0, (best_score - second_score) / float(denom)))
        activation_threshold = float(meta.get("activation_threshold", 0.12))
        if confidence < activation_threshold:
            return None
        return {
            "source": "spectral_manifold",
            "region_id": command_name,
            "command_id": str(meta.get("command_id", command_name)),
            "command_class": str(meta.get("class", "unknown")),
            "parameter_type": meta.get("parameter_type"),
            "confidence": confidence,
            "frame_count": int(frame_count),
            "timestamp_ms": int(timestamp_ms),
            "atlas_schema": self.atlas_schema,
            "atlas_version": self.atlas_version,
            "atlas_backed": self.atlas_schema == "h3_command_atlas_v1",
            "activation_threshold": activation_threshold,
            "stability_threshold": float(meta.get("stability_threshold", 0.78)),
            "fallback_eligible": bool(meta.get("fallback_eligible", True)),
        }
