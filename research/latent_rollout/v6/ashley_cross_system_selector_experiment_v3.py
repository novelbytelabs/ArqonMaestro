#!/usr/bin/env python3
"""
Cross-system adaptive selector experiment (robust v3).
"""

from __future__ import annotations

import argparse
import re
import zipfile
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

CANDIDATE_STRATEGIES = ["latent", "hybrid_8", "hybrid_16"]
RUN_ID_CANDIDATES = ["run_name", "name", "output_dir", "output_subdir", "job_name", "experiment_name", "label"]


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--input", nargs="+", required=True, help="One or more directories or zip files")
    p.add_argument("--outdir", required=True, help="Output directory")
    p.add_argument(
        "--target-metric",
        default="full_rel_mse",
        choices=["full_rel_mse", "tail16_rel_mse", "final_step_rel_mse"],
    )
    p.add_argument("--n-estimators", type=int, default=250)
    p.add_argument("--max-depth", type=int, default=6)
    p.add_argument("--keep-nonfinite", action="store_true")
    return p.parse_args()


def ensure_input_dir(input_path: Path, outdir: Path, idx: int) -> Path:
    if input_path.is_dir():
        return input_path
    if input_path.suffix.lower() == ".zip":
        extract_dir = outdir / f"extracted_input_{idx}"
        extract_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(input_path, "r") as zf:
            zf.extractall(extract_dir)
        return extract_dir
    raise ValueError(f"Unsupported input path: {input_path}")


def find_file(root: Path, filename: str) -> Path | None:
    direct = root / filename
    if direct.exists():
        return direct
    matches = list(root.rglob(filename))
    return matches[0] if matches else None


def load_bundle(dir_path: Path, source_label: str) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame | None]:
    results_path = find_file(dir_path, "aggregate_results.csv")
    damage_path = find_file(dir_path, "aggregate_decode_damage.csv")
    manifest_path = find_file(dir_path, "manifest.csv")
    if results_path is None or damage_path is None:
        raise FileNotFoundError(f"Could not find aggregate files in {dir_path}")
    results = pd.read_csv(results_path)
    damage = pd.read_csv(damage_path)
    manifest = pd.read_csv(manifest_path) if manifest_path is not None else None
    results["source_input"] = source_label
    damage["source_input"] = source_label
    if manifest is not None:
        manifest["source_input"] = source_label
    return results, damage, manifest


def normalize_run_name(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    for c in RUN_ID_CANDIDATES:
        if c in df.columns:
            df["run_name"] = df[c].astype(str)
            return df
    synth_cols = [c for c in ["source_input", "system", "strategy"] if c in df.columns]
    if synth_cols:
        df["run_name"] = df[synth_cols].astype(str).agg("__".join, axis=1)
    else:
        df["run_name"] = [f"row_{i}" for i in range(len(df))]
    return df


def parse_command_metadata(command: str) -> Dict[str, float | str]:
    out: Dict[str, float | str] = {}
    if not isinstance(command, str):
        return out
    m = re.search(r"--seed\s+(\d+)", command)
    if m:
        out["seed"] = float(m.group(1))
    m = re.search(r"--latent-dim\s+(\d+)", command)
    if m:
        out["latent_dim"] = float(m.group(1))
    m = re.search(r"--rollout-len\s+(\d+)", command)
    if m:
        out["rollout_len"] = float(m.group(1))
    m = re.search(r"--systems\s+([A-Za-z0-9_]+)", command)
    if m:
        out["system_from_command"] = m.group(1)
    out["single_horizon"] = 1.0 if "--single-horizon" in command else 0.0
    return out


def enrich_from_manifest(df: pd.DataFrame, manifest: pd.DataFrame | None) -> pd.DataFrame:
    df = df.copy()
    if manifest is None or manifest.empty:
        return df
    man = manifest.copy()
    man_key = None
    for c in ["name", "run_name", "output_dir", "label"]:
        if c in man.columns:
            man_key = c
            break
    if man_key is None:
        return df
    parsed = []
    for _, row in man.iterrows():
        meta = parse_command_metadata(str(row.get("command", "")))
        meta["manifest_run_name"] = str(row[man_key])
        if "output_dir" in row:
            meta["manifest_output_dir"] = str(row["output_dir"])
        parsed.append(meta)
    meta_df = pd.DataFrame(parsed)
    if meta_df.empty:
        return df
    merged = df.merge(meta_df, left_on="run_name", right_on="manifest_run_name", how="left")
    return merged


def parse_from_run_name(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    def extract_num(name: str, pattern: str):
        m = re.search(pattern, str(name))
        return float(m.group(1)) if m else np.nan

    for c in ["latent_dim", "rollout_len", "seed"]:
        if c not in df.columns:
            df[c] = np.nan

    rn = df["run_name"].astype(str)
    df["latent_dim"] = df["latent_dim"].fillna(rn.map(lambda s: extract_num(s, r"ld(\d+)")))
    df["rollout_len"] = df["rollout_len"].fillna(rn.map(lambda s: extract_num(s, r"rl(\d+)")))
    df["seed"] = df["seed"].fillna(rn.map(lambda s: extract_num(s, r"seed[_-]?(\d+)")))

    if "system" not in df.columns:
        df["system"] = np.nan
    if "system_from_command" in df.columns:
        df["system"] = df["system"].fillna(df["system_from_command"])
    df["system"] = df["system"].fillna(
        rn.str.extract(r"(heat|wave|burgers|reaction_diffusion)", expand=False)
    )

    is_broad_default = rn.isin(["multi_horizon_baseline", "single_horizon_ablation"])
    df.loc[is_broad_default & df["latent_dim"].isna(), "latent_dim"] = 24.0
    df.loc[is_broad_default & df["rollout_len"].isna(), "rollout_len"] = 48.0
    df.loc[is_broad_default & df["seed"].isna(), "seed"] = 7.0

    is_late_ground = rn.str.startswith("late_ground_proxy_")
    df.loc[is_late_ground & df["latent_dim"].isna(), "latent_dim"] = 24.0
    df.loc[is_late_ground & df["rollout_len"].isna(), "rollout_len"] = 96.0
    df.loc[is_late_ground & df["seed"].isna(), "seed"] = 7.0

    is_crossover = rn.str.startswith("crossover_")
    df.loc[is_crossover & df["seed"].isna(), "seed"] = 7.0
    return df


def load_tables_from_inputs(inputs: Sequence[str], outdir: Path) -> Tuple[pd.DataFrame, pd.DataFrame]:
    result_parts = []
    damage_parts = []
    for idx, raw in enumerate(inputs):
        d = ensure_input_dir(Path(raw), outdir, idx)
        results, damage, manifest = load_bundle(d, str(Path(raw)))
        results = parse_from_run_name(enrich_from_manifest(normalize_run_name(results), manifest))
        damage = parse_from_run_name(enrich_from_manifest(normalize_run_name(damage), manifest))
        result_parts.append(results)
        damage_parts.append(damage)
    return pd.concat(result_parts, ignore_index=True), pd.concat(damage_parts, ignore_index=True)


def build_run_level_dataset(results: pd.DataFrame, damage: pd.DataFrame, target_metric: str) -> pd.DataFrame:
    use_results = results[results["strategy"].isin(CANDIDATE_STRATEGIES)].copy()
    for c in ["source_input", "system", "run_name", "latent_dim", "rollout_len", "seed"]:
        if c not in use_results.columns:
            use_results[c] = np.nan
        if c not in damage.columns:
            damage[c] = np.nan

    index_cols = ["source_input", "system", "run_name", "seed", "latent_dim", "rollout_len"]
    pivot = use_results.pivot_table(
        index=index_cols,
        columns="strategy",
        values=[target_metric, "tail16_rel_mse", "final_step_rel_mse"],
        aggfunc="first",
    )
    pivot.columns = [f"{metric}__{strategy}" for metric, strategy in pivot.columns]
    pivot = pivot.reset_index()

    damage_ag = (
        damage.groupby(index_cols, dropna=False, as_index=False)
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

    df = pivot.merge(damage_ag, on=index_cols, how="left")
    metric_cols = [f"{target_metric}__{s}" for s in CANDIDATE_STRATEGIES]
    df["nonfinite_candidate_metric"] = ~np.isfinite(df[metric_cols].to_numpy()).all(axis=1)
    df["oracle_best_value"] = df[metric_cols].min(axis=1)
    df["best_strategy"] = df[metric_cols].idxmin(axis=1).str.split("__").str[-1]
    for strat in CANDIDATE_STRATEGIES:
        df[f"regret_vs_oracle__{strat}"] = df[f"{target_metric}__{strat}"] - df["oracle_best_value"]

    df["group_id"] = np.where(
        df["seed"].notna(),
        df["system"].astype(str) + "__seed" + df["seed"].fillna(-1).astype(int).astype(str),
        df["system"].astype(str) + "__run__" + df["run_name"].astype(str),
    )
    return df.sort_values(["system", "rollout_len", "latent_dim", "run_name"]).reset_index(drop=True)


def feature_columns():
    numeric = [
        "latent_dim", "rollout_len",
        "latent_damage_mean", "latent_damage_max", "latent_damage_last",
        "state_damage_mean", "state_damage_max",
        "direct_ground_mean", "direct_ground_max",
    ]
    categorical = ["system"]
    return numeric, categorical


def make_model(n_estimators: int, max_depth: int) -> Pipeline:
    numeric, categorical = feature_columns()
    pre = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
        ]
    )
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        min_samples_leaf=2,
        random_state=7,
    )
    return Pipeline([("pre", pre), ("model", model)])


def evaluate_fixed_policies(df: pd.DataFrame, target_metric: str) -> pd.DataFrame:
    rows = []
    oracle_mean = df["oracle_best_value"].mean()
    for strat in CANDIDATE_STRATEGIES:
        value = df[f"{target_metric}__{strat}"].mean()
        regret = (df[f"{target_metric}__{strat}"] - df["oracle_best_value"]).mean()
        wins = (df["best_strategy"] == strat).sum()
        rows.append({
            "policy": f"always_{strat}",
            "mean_metric": float(value),
            "mean_regret_vs_oracle": float(regret),
            "win_count": int(wins),
            "win_rate": float(wins / len(df)),
            "oracle_mean_metric_reference": float(oracle_mean),
        })
    return pd.DataFrame(rows).sort_values("mean_metric").reset_index(drop=True)


def evaluate_fixed_policies_by_system(df: pd.DataFrame, target_metric: str) -> pd.DataFrame:
    rows = []
    for system, sdf in df.groupby("system"):
        oracle_mean = sdf["oracle_best_value"].mean()
        for strat in CANDIDATE_STRATEGIES:
            value = sdf[f"{target_metric}__{strat}"].mean()
            regret = (sdf[f"{target_metric}__{strat}"] - sdf["oracle_best_value"]).mean()
            wins = (sdf["best_strategy"] == strat).sum()
            rows.append({
                "system": system,
                "policy": f"always_{strat}",
                "mean_metric": float(value),
                "mean_regret_vs_oracle": float(regret),
                "win_count": int(wins),
                "win_rate": float(wins / len(sdf)),
                "oracle_mean_metric_reference": float(oracle_mean),
            })
    return pd.DataFrame(rows).sort_values(["system", "mean_metric"]).reset_index(drop=True)


def leave_one_group_out_selector(df: pd.DataFrame, target_metric: str, n_estimators: int, max_depth: int):
    numeric, categorical = feature_columns()
    feature_cols = categorical + numeric
    pred_parts = []
    for held_out_group in sorted(df["group_id"].unique().tolist()):
        train_df = df[df["group_id"] != held_out_group].copy()
        test_df = df[df["group_id"] == held_out_group].copy()
        pipe = make_model(n_estimators, max_depth)
        pipe.fit(train_df[feature_cols], train_df["best_strategy"])
        preds = pipe.predict(test_df[feature_cols])
        test_df = test_df.copy()
        test_df["predicted_strategy"] = preds
        test_df["predicted_metric"] = [
            row[f"{target_metric}__{pred}"] for row, pred in zip(test_df.to_dict("records"), preds)
        ]
        test_df["selector_regret_vs_oracle"] = test_df["predicted_metric"] - test_df["oracle_best_value"]
        pred_parts.append(test_df)
    pred_df = pd.concat(pred_parts, ignore_index=True)
    system_summary = (
        pred_df.groupby("system", as_index=False)
        .agg(
            runs=("run_name", "count"),
            accuracy=("predicted_strategy", lambda s: float((s == pred_df.loc[s.index, "best_strategy"]).mean())),
            mean_metric=("predicted_metric", "mean"),
            mean_regret_vs_oracle=("selector_regret_vs_oracle", "mean"),
        )
    )
    overall = pd.DataFrame([{
        "system": "ALL",
        "runs": int(len(pred_df)),
        "accuracy": float((pred_df["predicted_strategy"] == pred_df["best_strategy"]).mean()),
        "mean_metric": float(pred_df["predicted_metric"].mean()),
        "mean_regret_vs_oracle": float(pred_df["selector_regret_vs_oracle"].mean()),
    }])
    return pred_df, pd.concat([system_summary, overall], ignore_index=True)


def summarize_selector_vs_fixed(pred_df: pd.DataFrame, fixed_df: pd.DataFrame) -> pd.DataFrame:
    wins = int((pred_df["predicted_strategy"] == pred_df["best_strategy"]).sum())
    selector = pd.DataFrame([{
        "policy": "adaptive_selector",
        "mean_metric": float(pred_df["predicted_metric"].mean()),
        "mean_regret_vs_oracle": float(pred_df["selector_regret_vs_oracle"].mean()),
        "win_count": wins,
        "win_rate": float(wins / len(pred_df)),
        "oracle_mean_metric_reference": float(pred_df["oracle_best_value"].mean()),
    }])
    return pd.concat([selector, fixed_df], ignore_index=True).sort_values("mean_metric").reset_index(drop=True)


def summarize_selector_vs_fixed_by_system(pred_df: pd.DataFrame, fixed_system_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for system, sdf in pred_df.groupby("system"):
        wins = int((sdf["predicted_strategy"] == sdf["best_strategy"]).sum())
        rows.append({
            "system": system,
            "policy": "adaptive_selector",
            "mean_metric": float(sdf["predicted_metric"].mean()),
            "mean_regret_vs_oracle": float(sdf["selector_regret_vs_oracle"].mean()),
            "win_count": wins,
            "win_rate": float(wins / len(sdf)),
            "oracle_mean_metric_reference": float(sdf["oracle_best_value"].mean()),
        })
    return pd.concat([pd.DataFrame(rows), fixed_system_df], ignore_index=True).sort_values(["system", "mean_metric"]).reset_index(drop=True)


def build_markdown_report(df: pd.DataFrame, overall: pd.DataFrame, by_system: pd.DataFrame, system_summary: pd.DataFrame, target_metric: str) -> str:
    lines = []
    lines.append("# Cross-System Adaptive Selector Brief")
    lines.append("")
    lines.append("## What this experiment asked")
    lines.append(
        f"Can an adaptive selector choose among `latent`, `hybrid_8`, and `hybrid_16` "
        f"better than any fixed policy across multiple systems using `{target_metric}`?"
    )
    lines.append("")
    lines.append("## Overall policy benchmark")
    lines.append("")
    lines.append("| policy | mean_metric | mean_regret_vs_oracle | win_rate |")
    lines.append("|---|---:|---:|---:|")
    for _, row in overall.iterrows():
        lines.append(f"| {row['policy']} | {row['mean_metric']:.6f} | {row['mean_regret_vs_oracle']:.6f} | {row['win_rate']:.3f} |")
    lines.append("")
    lines.append("## Selector summary by system")
    lines.append("")
    lines.append("| system | runs | accuracy | mean_metric | mean_regret_vs_oracle |")
    lines.append("|---|---:|---:|---:|---:|")
    for _, row in system_summary.iterrows():
        lines.append(f"| {row['system']} | {int(row['runs'])} | {row['accuracy']:.3f} | {row['mean_metric']:.6f} | {row['mean_regret_vs_oracle']:.6f} |")
    lines.append("")
    lines.append("## Policy benchmark by system")
    current = None
    for _, row in by_system.iterrows():
        if row["system"] != current:
            current = row["system"]
            lines.append("")
            lines.append(f"### {current}")
            lines.append("")
            lines.append("| policy | mean_metric | mean_regret_vs_oracle | win_rate |")
            lines.append("|---|---:|---:|---:|")
        lines.append(f"| {row['policy']} | {row['mean_metric']:.6f} | {row['mean_regret_vs_oracle']:.6f} | {row['win_rate']:.3f} |")
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    results, damage = load_tables_from_inputs(args.input, outdir)
    raw_df = build_run_level_dataset(results, damage, args.target_metric)
    df = raw_df.copy() if args.keep_nonfinite else raw_df[~raw_df["nonfinite_candidate_metric"]].copy().reset_index(drop=True)

    raw_df.to_csv(outdir / "cross_selector_run_level_dataset_raw.csv", index=False)
    df.to_csv(outdir / "cross_selector_run_level_dataset.csv", index=False)

    fixed_df = evaluate_fixed_policies(df, args.target_metric)
    fixed_by_system = evaluate_fixed_policies_by_system(df, args.target_metric)

    pred_df, system_summary = leave_one_group_out_selector(df, args.target_metric, args.n_estimators, args.max_depth)
    overall = summarize_selector_vs_fixed(pred_df, fixed_df)
    by_system = summarize_selector_vs_fixed_by_system(pred_df, fixed_by_system)

    fixed_df.to_csv(outdir / "fixed_policy_benchmarks.csv", index=False)
    fixed_by_system.to_csv(outdir / "fixed_policy_benchmarks_by_system.csv", index=False)
    pred_df.to_csv(outdir / "cross_selector_cv_predictions.csv", index=False)
    system_summary.to_csv(outdir / "cross_selector_system_summary.csv", index=False)
    overall.to_csv(outdir / "cross_selector_vs_fixed_policies.csv", index=False)
    by_system.to_csv(outdir / "cross_selector_vs_fixed_policies_by_system.csv", index=False)
    (outdir / "cross_selector_experiment_brief.md").write_text(
        build_markdown_report(df, overall, by_system, system_summary, args.target_metric),
        encoding="utf-8",
    )

    print("Saved outputs to:", outdir)
    print(overall.to_string(index=False))


if __name__ == "__main__":
    main()