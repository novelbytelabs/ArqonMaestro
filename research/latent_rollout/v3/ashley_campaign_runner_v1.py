#!/usr/bin/env python3
"""
Ashley latent-rollout mission runner.

This script orchestrates the next decisive experiments on top of
ashley_latent_rollout_replication_v2.py.

What it does:
1) Runs a strong multi-horizon baseline.
2) Runs a matching single-horizon ablation.
3) Runs a focused hybrid-crossover search on selected systems.
4) Runs one-time grounding ablations.
5) Aggregates all results into CSV + markdown summaries.

Usage:
    python3 ashley_campaign_runner_v1.py \
        --base-script ashley_latent_rollout_replication_v2.py \
        --outdir mission_runs

This file is notebook-safe because it ignores unknown arguments.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import shlex
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class Experiment:
    name: str
    extra_args: List[str]
    note: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Ashley mission ablation campaign")
    parser.add_argument("--base-script", type=str, default="ashley_latent_rollout_replication_v2.py")
    parser.add_argument("--python-bin", type=str, default=sys.executable)
    parser.add_argument("--outdir", type=str, default="mission_runs")
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--n-train", type=int, default=256)
    parser.add_argument("--n-val", type=int, default=64)
    parser.add_argument("--n-test", type=int, default=64)
    parser.add_argument("--ae-epochs", type=int, default=10)
    parser.add_argument("--dyn-epochs", type=int, default=16)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--latent-dims", type=str, default="16,24,32")
    parser.add_argument("--rollout-lens", type=str, default="48,64,80")
    parser.add_argument("--systems-for-crossover", type=str, default="reaction_diffusion,heat,burgers")
    parser.add_argument("--dry-run", action="store_true")
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"Ignoring unrecognized args: {unknown}")
    return args


def run(cmd: List[str], cwd: Optional[str] = None, dry_run: bool = False) -> int:
    print("\n[RUN]", " ".join(shlex.quote(c) for c in cmd))
    if dry_run:
        return 0
    result = subprocess.run(cmd, cwd=cwd)
    return result.returncode


def read_csv_rows(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="") as f:
        return list(csv.DictReader(f))


def safe_float(x: str) -> float:
    try:
        return float(x)
    except Exception:
        return float("nan")


def summarize_result_rows(rows: List[Dict[str, str]]) -> Dict[str, Dict[str, float]]:
    out: Dict[str, Dict[str, float]] = {}
    for row in rows:
        system = row["system"]
        strat = row["strategy"]
        out.setdefault(system, {})[strat] = safe_float(row["full_rel_mse"])
    return out


def best_strategy_per_system(rows: List[Dict[str, str]]) -> Dict[str, str]:
    grouped: Dict[str, List[Dict[str, str]]] = {}
    for row in rows:
        grouped.setdefault(row["system"], []).append(row)
    best: Dict[str, str] = {}
    for system, srows in grouped.items():
        srows2 = sorted(srows, key=lambda r: safe_float(r["full_rel_mse"]))
        if srows2:
            best[system] = srows2[0]["strategy"]
    return best


def write_csv(path: Path, rows: List[Dict[str, object]], fieldnames: List[str]) -> None:
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> int:
    args = parse_args()
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    latent_dims = [s.strip() for s in args.latent_dims.split(",") if s.strip()]
    rollout_lens = [s.strip() for s in args.rollout_lens.split(",") if s.strip()]
    crossover_systems = [s.strip() for s in args.systems_for_crossover.split(",") if s.strip()]

    common = [
        "--seed", str(args.seed),
        "--n-train", str(args.n_train),
        "--n-val", str(args.n_val),
        "--n-test", str(args.n_test),
        "--ae-epochs", str(args.ae_epochs),
        "--dyn-epochs", str(args.dyn_epochs),
        "--batch-size", str(args.batch_size),
    ]

    experiments: List[Experiment] = []

    experiments.append(Experiment(
        name="multi_horizon_baseline",
        extra_args=["--outdir", str(outdir / "multi_horizon_baseline")],
        note="Strong baseline. Confirms the current best latent-first regime.",
    ))

    experiments.append(Experiment(
        name="single_horizon_ablation",
        extra_args=["--outdir", str(outdir / "single_horizon_ablation"), "--single-horizon"],
        note="Tests whether multi-horizon latent training is the key stabilizer.",
    ))

    # Focused crossover search.
    for system in crossover_systems:
        for latent_dim in latent_dims:
            for rollout_len in rollout_lens:
                experiments.append(Experiment(
                    name=f"crossover_{system}_ld{latent_dim}_rl{rollout_len}",
                    extra_args=[
                        "--outdir", str(outdir / f"crossover_{system}_ld{latent_dim}_rl{rollout_len}"),
                        "--systems", system,
                        "--latent-dim", latent_dim,
                        "--rollout-len", rollout_len,
                    ],
                    note=(
                        "Searches for the regime where hybrid can become corrective rather than destructive."
                    ),
                ))

    # One-time grounding style proxies by using long interval sweeps.
    # We cannot guarantee the underlying script exposes one-time grounding flags,
    # so this campaign records late-grounding proxies via very large intervals.
    for system in ["heat", "wave", "burgers", "reaction_diffusion"]:
        experiments.append(Experiment(
            name=f"late_ground_proxy_{system}",
            extra_args=[
                "--outdir", str(outdir / f"late_ground_proxy_{system}"),
                "--systems", system,
                "--rollout-len", "96",
                "--latent-dim", "24",
            ],
            note="Proxy for rare/late grounding behavior under longer horizon stress.",
        ))

    manifest_rows: List[Dict[str, object]] = []

    for exp in experiments:
        cmd = [args.python_bin, args.base_script] + common + exp.extra_args
        rc = run(cmd, dry_run=args.dry_run)
        manifest_rows.append({
            "name": exp.name,
            "return_code": rc,
            "note": exp.note,
            "output_dir": str(Path(exp.extra_args[1]).resolve()) if len(exp.extra_args) >= 2 and exp.extra_args[0] == "--outdir" else "",
            "command": " ".join(shlex.quote(c) for c in cmd),
        })

    write_csv(outdir / "manifest.csv", manifest_rows, ["name", "return_code", "note", "output_dir", "command"])

    # Aggregate results.
    aggregate_rows: List[Dict[str, object]] = []
    decodedamage_rows: List[Dict[str, object]] = []
    for row in manifest_rows:
        exp_name = str(row["name"])
        output_dir = Path(str(row["output_dir"]))
        results_csv = output_dir / "results.csv"
        dd_csv = output_dir / "decode_damage_all_systems.csv"

        for r in read_csv_rows(results_csv):
            r2 = dict(r)
            r2["experiment"] = exp_name
            aggregate_rows.append(r2)
        for r in read_csv_rows(dd_csv):
            r2 = dict(r)
            r2["experiment"] = exp_name
            decodedamage_rows.append(r2)

    if aggregate_rows:
        fieldnames = sorted({k for row in aggregate_rows for k in row.keys()})
        write_csv(outdir / "aggregate_results.csv", aggregate_rows, fieldnames)
    if decodedamage_rows:
        fieldnames = sorted({k for row in decodedamage_rows for k in row.keys()})
        write_csv(outdir / "aggregate_decode_damage.csv", decodedamage_rows, fieldnames)

    # High-level markdown summary.
    md = []
    md.append("# Ashley Mission Campaign Summary\n")
    md.append("## Why this campaign exists\n")
    md.append("This campaign is designed to answer three decisive questions:\n")
    md.append("1. Is multi-horizon latent training a major source of the observed stability?\n")
    md.append("2. Is there any real crossover regime where hybrid beats pure latent?\n")
    md.append("3. Which systems show the strongest decode-damage signature?\n")

    # Baseline vs single horizon quick compare.
    baseline_rows = read_csv_rows(outdir / "multi_horizon_baseline" / "results.csv")
    single_rows = read_csv_rows(outdir / "single_horizon_ablation" / "results.csv")
    if baseline_rows and single_rows:
        md.append("## Multi-horizon vs single-horizon\n")
        bbest = best_strategy_per_system(baseline_rows)
        sbest = best_strategy_per_system(single_rows)
        md.append("| System | Baseline best | Single-horizon best |\n")
        md.append("|---|---:|---:|\n")
        for system in sorted(set(list(bbest.keys()) + list(sbest.keys()))):
            md.append(f"| {system} | {bbest.get(system, 'n/a')} | {sbest.get(system, 'n/a')} |\n")

    if aggregate_rows:
        # best hybrid found per system across crossover runs
        md.append("\n## Best crossover candidates found\n")
        by_system: Dict[str, List[Dict[str, object]]] = {}
        for row in aggregate_rows:
            system = str(row.get("system", ""))
            if system:
                by_system.setdefault(system, []).append(row)
        md.append("| System | Best strategy seen | Best full_rel_mse | Experiment |\n")
        md.append("|---|---:|---:|---|\n")
        for system, rows in sorted(by_system.items()):
            rows_sorted = sorted(rows, key=lambda r: safe_float(str(r.get("full_rel_mse", "nan"))))
            best = rows_sorted[0]
            md.append(
                f"| {system} | {best.get('strategy','n/a')} | {best.get('full_rel_mse','n/a')} | {best.get('experiment','n/a')} |\n"
            )

    if decodedamage_rows:
        md.append("\n## Decode-damage highlights\n")
        md.append("Use aggregate_decode_damage.csv to rank systems by latent damage and grounding sensitivity.\n")

    md.append("\n## Interpretation guardrails\n")
    md.append("- If hybrid never beats latent, then grounding may be mostly a compensatory patch rather than the final answer.\n")
    md.append("- If single-horizon performs much worse than multi-horizon, then long-horizon training is a primary stabilizer.\n")
    md.append("- If wave stays the most fragile, that supports the phase-sensitive damage hypothesis.\n")
    md.append("\n## Output files\n")
    md.append("- manifest.csv\n")
    md.append("- aggregate_results.csv\n")
    md.append("- aggregate_decode_damage.csv\n")
    md.append("- this summary\n")

    (outdir / "campaign_summary.md").write_text("".join(md), encoding="utf-8")

    (outdir / "campaign_config.json").write_text(json.dumps({
        "base_script": args.base_script,
        "seed": args.seed,
        "n_train": args.n_train,
        "n_val": args.n_val,
        "n_test": args.n_test,
        "ae_epochs": args.ae_epochs,
        "dyn_epochs": args.dyn_epochs,
        "batch_size": args.batch_size,
        "latent_dims": latent_dims,
        "rollout_lens": rollout_lens,
        "systems_for_crossover": crossover_systems,
    }, indent=2), encoding="utf-8")

    print(f"\nSaved campaign outputs to: {outdir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
