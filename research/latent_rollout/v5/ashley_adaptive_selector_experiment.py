#!/usr/bin/env python3
"""
Adaptive selector experiment for the reaction-diffusion confirmation campaign.

Goal:
    Learn when to choose latent vs hybrid_8 vs hybrid_16 using the completed
    run bundle produced by ashley_rd_confirmation_runner.py.

What it does:
    - loads aggregate_results.csv and aggregate_decode_damage.csv
    - builds one row per run with strategy outcomes and diagnostic features
    - labels each run with the best strategy by full_rel_mse
    - trains a shallow decision tree selector
    - evaluates with leave-one-seed-out CV
    - benchmarks selector against fixed policies (always latent / hybrid_8 / hybrid_16)
    - emits interpretable rules and summary tables

Example:
    python3 ashley_adaptive_selector_experiment.py \
        --input /mnt/data/results.zip \
        --outdir /mnt/data/selector_results
"""

from __future__ import annotations

import argparse
import json
import math
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

try:
    from sklearn.tree import DecisionTreeClassifier, export_text
    from sklearn.metrics import accuracy_score
except Exception as e:
    raise SystemExit(
        "This script requires scikit-learn. Install it in the environment and re-run."
    ) from e


CANDIDATE_STRATEGIES = ["latent", "hybrid_8", "hybrid_16"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--input",
        required=True,
        help="Path to results.zip or to a directory containing aggregate_results.csv",
    )
    p.add_argument("--outdir", required=True, help="Output directory")
    p.add_argument(
        "--target-metric",
        default="full_rel_mse",
        choices=["full_rel_mse", "tail16_rel_mse", "final_step_rel_mse"],
        help="Metric used to define the best strategy label",
    )
    p.add_argument(
        "--max-depth",
        type=int,
        default=3,
        help="Decision tree max depth (default: 3 for interpretability)",
    )
    return p.parse_args()


def ensure_input_dir(input_path: Path, outdir: Path) -> Path:
    if input_path.is_dir():
        return input_path
    if input_path.suffix.lower() == ".zip":
        extract_dir = outdir / "extracted_results"
        extract_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(input_path, "r") as zf:
            zf.extractall(extract_dir)
        return extract_dir
    raise ValueError(f"Unsupported input: {input_path}")


def load_tables(input_dir: Path) -> Tuple[pd.DataFrame, pd.DataFrame]:
    results = pd.read_csv(input_dir / "aggregate_results.csv")
    damage = pd.read_csv(input_dir / "aggregate_decode_damage.csv")
    return results, damage


def build_run_level_dataset(
    results: pd.DataFrame,
    damage: pd.DataFrame,
    target_metric: str,
) -> pd.DataFrame:
    use_results = results[results["strategy"].isin(CANDIDATE_STRATEGIES)].copy()

    pivot = use_results.pivot_table(
        index=["run_name", "seed", "latent_dim", "rollout_len"],
        columns="strategy",
        values=[target_metric, "tail16_rel_mse", "final_step_rel_mse"],
    )
    pivot.columns = [f"{metric}__{strategy}" for metric, strategy in pivot.columns]
    pivot = pivot.reset_index()

    # Damage features aggregated per run
    damage_ag = (
        damage.groupby(["run_name", "seed", "latent_dim", "rollout_len"], as_index=False)
        .agg(
            latent_damage_mean=("latent_damage_mse", "mean"),
            latent_damage_max=("latent_damage_mse", "max"),
            latent_damage_last=("latent_damage_mse", "last"),
            state_damage_mean=("state_damage_rel_mse", "mean"),
            state_damage_max=("state_damage_rel_mse", "max"),
            direct_ground_mean=("direct_ground_damage_rel_mse", "mean"),
            direct_ground_max=("direct_ground_damage_rel_mse", "max"),
        )
    )

    df = pivot.merge(
        damage_ag,
        on=["run_name", "seed", "latent_dim", "rollout_len"],
        how="left",
    )

    # Best strategy label based on target metric
    metric_cols = [f"{target_metric}__{s}" for s in CANDIDATE_STRATEGIES]
    df["best_strategy"] = df[metric_cols].idxmin(axis=1).str.split("__").str[-1]

    # Useful benchmark/regret fields
    df["oracle_best_value"] = df[metric_cols].min(axis=1)
    for strat in CANDIDATE_STRATEGIES:
        df[f"regret_vs_oracle__{strat}"] = (
            df[f"{target_metric}__{strat}"] - df["oracle_best_value"]
        )

    return df.sort_values(["rollout_len", "latent_dim", "seed"]).reset_index(drop=True)


def feature_columns() -> List[str]:
    return [
        "latent_dim",
        "rollout_len",
        "latent_damage_mean",
        "latent_damage_max",
        "latent_damage_last",
        "state_damage_mean",
        "state_damage_max",
        "direct_ground_mean",
        "direct_ground_max",
    ]


def evaluate_fixed_policies(df: pd.DataFrame, target_metric: str) -> pd.DataFrame:
    rows = []
    oracle_mean = df["oracle_best_value"].mean()
    for strat in CANDIDATE_STRATEGIES:
        value = df[f"{target_metric}__{strat}"].mean()
        regret = (df[f"{target_metric}__{strat}"] - df["oracle_best_value"]).mean()
        wins = (df["best_strategy"] == strat).sum()
        rows.append(
            {
                "policy": f"always_{strat}",
                "mean_metric": value,
                "mean_regret_vs_oracle": regret,
                "win_count": int(wins),
                "win_rate": wins / len(df),
                "oracle_mean_metric_reference": oracle_mean,
            }
        )
    return pd.DataFrame(rows).sort_values("mean_metric").reset_index(drop=True)


def leave_one_seed_out_selector(
    df: pd.DataFrame, target_metric: str, max_depth: int
) -> Tuple[pd.DataFrame, Dict[int, str], pd.DataFrame]:
    feats = feature_columns()
    seed_values = sorted(df["seed"].unique().tolist())
    pred_rows = []
    rulebook: Dict[int, str] = {}

    for held_out_seed in seed_values:
        train_df = df[df["seed"] != held_out_seed].copy()
        test_df = df[df["seed"] == held_out_seed].copy()

        X_train = train_df[feats].values
        y_train = train_df["best_strategy"].values
        X_test = test_df[feats].values

        clf = DecisionTreeClassifier(
            max_depth=max_depth,
            random_state=7,
            min_samples_leaf=2,
        )
        clf.fit(X_train, y_train)
        preds = clf.predict(X_test)

        rulebook[int(held_out_seed)] = export_text(clf, feature_names=feats)

        test_df = test_df.copy()
        test_df["predicted_strategy"] = preds
        test_df["predicted_metric"] = [
            row[f"{target_metric}__{pred}"] for _, row, pred in zip(test_df.index, test_df.to_dict("records"), preds)
        ]
        test_df["selector_regret_vs_oracle"] = test_df["predicted_metric"] - test_df["oracle_best_value"]
        pred_rows.append(test_df)

    pred_df = pd.concat(pred_rows, ignore_index=True)
    summary = (
        pred_df.groupby("seed", as_index=False)
        .agg(
            runs=("run_name", "count"),
            accuracy=("predicted_strategy", lambda s: float((s == pred_df.loc[s.index, "best_strategy"]).mean())),
            mean_metric=("predicted_metric", "mean"),
            mean_regret_vs_oracle=("selector_regret_vs_oracle", "mean"),
        )
    )

    overall = pd.DataFrame(
        [
            {
                "seed": "ALL",
                "runs": int(len(pred_df)),
                "accuracy": float((pred_df["predicted_strategy"] == pred_df["best_strategy"]).mean()),
                "mean_metric": float(pred_df["predicted_metric"].mean()),
                "mean_regret_vs_oracle": float(pred_df["selector_regret_vs_oracle"].mean()),
            }
        ]
    )
    summary = pd.concat([summary, overall], ignore_index=True)
    return pred_df, rulebook, summary


def summarize_selector_vs_fixed(
    pred_df: pd.DataFrame, fixed_df: pd.DataFrame
) -> pd.DataFrame:
    selector_mean = pred_df["predicted_metric"].mean()
    selector_regret = pred_df["selector_regret_vs_oracle"].mean()
    rows = [
        {
            "policy": "adaptive_selector",
            "mean_metric": selector_mean,
            "mean_regret_vs_oracle": selector_regret,
            "win_count": int((pred_df["predicted_strategy"] == pred_df["best_strategy"]).sum()),
            "win_rate": float((pred_df["predicted_strategy"] == pred_df["best_strategy"]).mean()),
            "oracle_mean_metric_reference": float(pred_df["oracle_best_value"].mean()),
        }
    ]
    return pd.concat([pd.DataFrame(rows), fixed_df], ignore_index=True).sort_values("mean_metric").reset_index(drop=True)


def build_markdown_report(
    df: pd.DataFrame,
    fixed_df: pd.DataFrame,
    selector_summary: pd.DataFrame,
    policy_table: pd.DataFrame,
    rulebook: Dict[int, str],
    target_metric: str,
) -> str:
    best_counts = df["best_strategy"].value_counts().to_dict()
    lines = []
    lines.append("# Adaptive Selector Experiment Brief")
    lines.append("")
    lines.append("## What this experiment asked")
    lines.append(
        f"Can a simple adaptive selector beat fixed policies (always latent / hybrid_8 / hybrid_16) "
        f"when choosing the best strategy by `{target_metric}`?"
    )
    lines.append("")
    lines.append("## Dataset")
    lines.append(f"- Runs: **{len(df)}**")
    lines.append(f"- Seeds: **{', '.join(map(str, sorted(df['seed'].unique())))}**")
    lines.append(f"- Latent dims: **{', '.join(map(str, sorted(df['latent_dim'].unique())))}**")
    lines.append(f"- Rollout lengths: **{', '.join(map(str, sorted(df['rollout_len'].unique())))}**")
    lines.append("")
    lines.append("## Best-strategy label distribution")
    for strat in CANDIDATE_STRATEGIES:
        count = int(best_counts.get(strat, 0))
        lines.append(f"- {strat}: **{count}/{len(df)}**")
    lines.append("")
    lines.append("## Policy benchmark table")
    lines.append("")
    lines.append("| policy | mean_metric | mean_regret_vs_oracle | win_rate |")
    lines.append("|---|---:|---:|---:|")
    for _, row in policy_table.iterrows():
        lines.append(
            f"| {row['policy']} | {row['mean_metric']:.6f} | {row['mean_regret_vs_oracle']:.6f} | {row['win_rate']:.3f} |"
        )
    lines.append("")
    lines.append("## Leave-one-seed-out selector summary")
    lines.append("")
    lines.append("| seed | runs | accuracy | mean_metric | mean_regret_vs_oracle |")
    lines.append("|---|---:|---:|---:|---:|")
    for _, row in selector_summary.iterrows():
        lines.append(
            f"| {row['seed']} | {int(row['runs'])} | {row['accuracy']:.3f} | {row['mean_metric']:.6f} | {row['mean_regret_vs_oracle']:.6f} |"
        )
    lines.append("")
    lines.append("## Interpretable selector rules")
    for seed, rules in rulebook.items():
        lines.append("")
        lines.append(f"### Model trained leaving out seed {seed}")
        lines.append("")
        lines.append("```")
        lines.append(rules.rstrip())
        lines.append("```")
    lines.append("")
    lines.append("## Plain-English interpretation")
    best_policy = policy_table.iloc[0]["policy"]
    lines.append(
        f"The current best policy in this experiment is **{best_policy}** by mean `{target_metric}`. "
        f"If the adaptive selector is on top or close to the top while keeping low regret, that means the "
        "system is starting to learn a real governed-inference policy rather than relying on one fixed rule."
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    input_dir = ensure_input_dir(Path(args.input), outdir)
    results, damage = load_tables(input_dir)
    df = build_run_level_dataset(results, damage, args.target_metric)

    # Save run-level dataset
    df.to_csv(outdir / "selector_run_level_dataset.csv", index=False)

    fixed_df = evaluate_fixed_policies(df, args.target_metric)
    fixed_df.to_csv(outdir / "fixed_policy_benchmarks.csv", index=False)

    pred_df, rulebook, selector_summary = leave_one_seed_out_selector(
        df, args.target_metric, args.max_depth
    )
    pred_df.to_csv(outdir / "selector_cv_predictions.csv", index=False)
    selector_summary.to_csv(outdir / "selector_cv_summary.csv", index=False)

    policy_table = summarize_selector_vs_fixed(pred_df, fixed_df)
    policy_table.to_csv(outdir / "selector_vs_fixed_policies.csv", index=False)

    with open(outdir / "selector_rules.json", "w", encoding="utf-8") as f:
        json.dump(rulebook, f, indent=2)

    report = build_markdown_report(
        df=df,
        fixed_df=fixed_df,
        selector_summary=selector_summary,
        policy_table=policy_table,
        rulebook=rulebook,
        target_metric=args.target_metric,
    )
    (outdir / "selector_experiment_brief.md").write_text(report, encoding="utf-8")

    print("Saved outputs to:", outdir)
    print(policy_table.to_string(index=False))


if __name__ == "__main__":
    main()
