#!/usr/bin/env python3
"""Validate Stage 3D2 warm-path timing artifacts and emit a concise markdown report."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "artifacts" / "reports" / "h3_stage3d2" / "warm_path_timing.json"
OUT_MD = ROOT / "artifacts" / "reports" / "h3_stage3d2" / "warm_path_timing_validation.md"
OUT_JSON = ROOT / "artifacts" / "reports" / "h3_stage3d2" / "warm_path_timing_validation.json"


def main() -> int:
    payload = json.loads(ARTIFACT.read_text())
    metrics = payload.get("metrics", {})
    reflex = metrics.get("reflex", {})
    numeric = metrics.get("parameterizedNumeric", {})
    warm_miss = payload.get("warmMissProof", {})

    checks = {
        "reflex_improves": reflex.get("improvementMs", 0) > 0,
        "numeric_improves": numeric.get("improvementMs", 0) > 0,
        "warm_miss_non_authorizing": warm_miss.get("warmHitClass") == "miss",
        "warm_miss_uses_baseline_path": warm_miss.get("lookupPath") == "candidate_scan",
    }
    ok = all(checks.values())

    summary = {
        "artifact": str(ARTIFACT.relative_to(ROOT)),
        "stage": payload.get("stage"),
        "generatedAt": payload.get("generatedAt"),
        "checks": checks,
        "status": "pass" if ok else "fail",
        "reflex": reflex,
        "parameterizedNumeric": numeric,
        "warmMissProof": warm_miss,
    }
    OUT_JSON.write_text(json.dumps(summary, indent=2) + "\n")

    md = [
        "# H3 Stage 3D2 Warm Timing Validation",
        "",
        f"Status: {'PASS' if ok else 'FAIL'}",
        "",
        f"Artifact: `{ARTIFACT.relative_to(ROOT)}`",
        "",
        "Checks:",
    ]
    for key, value in checks.items():
        md.append(f"- `{key}`: `{str(value).lower()}`")
    md.extend(
        [
            "",
            "Measured reductions:",
            f"- reflex improvement ms: `{reflex.get('improvementMs')}`",
            f"- reflex improvement pct: `{reflex.get('improvementPct')}`",
            f"- parameterized numeric improvement ms: `{numeric.get('improvementMs')}`",
            f"- parameterized numeric improvement pct: `{numeric.get('improvementPct')}`",
            "",
            "Warm miss proof:",
            f"- warmHitClass: `{warm_miss.get('warmHitClass')}`",
            f"- lookupPath: `{warm_miss.get('lookupPath')}`",
            f"- mismatchReason: `{warm_miss.get('mismatchReason')}`",
            "",
        ]
    )
    OUT_MD.write_text("\n".join(md))
    print(json.dumps(summary, indent=2))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
