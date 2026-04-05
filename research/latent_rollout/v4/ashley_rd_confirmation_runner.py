#!/usr/bin/env python3
"""
Focused reaction-diffusion confirmation campaign for Ashley latent-rollout work.

Purpose:
- Re-run only the most promising system (reaction_diffusion)
- Sweep multiple seeds, latent dimensions, and rollout lengths
- Aggregate whether hybrid strategies actually beat latent
- Produce a clean summary instead of a huge undifferentiated artifact pile
"""
from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


DEFAULT_BASE = "/mnt/data/ashley_latent_rollout_replication_v2.py"


@dataclass(frozen=True)
class RunSpec:
    seed: int
    latent_dim: int
    rollout_len: int

    @property
    def name(self) -> str:
        return f"rd_seed{self.seed}_ld{self.latent_dim}_rl{self.rollout_len}"


def parse_int_list(text: str) -> list[int]:
    return [int(x.strip()) for x in text.split(',') if x.strip()]


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument('--base-script', type=str, default=DEFAULT_BASE)
    p.add_argument('--python-exe', type=str, default=sys.executable)
    p.add_argument('--outdir', type=str, default='rd_confirmation_runs')
    p.add_argument('--seeds', type=str, default='7,11,13')
    p.add_argument('--latent-dims', type=str, default='16,20,24,28,32')
    p.add_argument('--rollout-lens', type=str, default='80,96,112')
    p.add_argument('--n-train', type=int, default=128)
    p.add_argument('--n-val', type=int, default=32)
    p.add_argument('--n-test', type=int, default=32)
    p.add_argument('--ae-epochs', type=int, default=6)
    p.add_argument('--dyn-epochs', type=int, default=8)
    p.add_argument('--batch-size', type=int, default=32)
    p.add_argument('--device', type=str, default='cpu')
    p.add_argument('--dry-run', action='store_true')
    return p.parse_args(list(argv) if argv is not None else None)


def build_specs(args: argparse.Namespace) -> list[RunSpec]:
    seeds = parse_int_list(args.seeds)
    latent_dims = parse_int_list(args.latent_dims)
    rollout_lens = parse_int_list(args.rollout_lens)
    return [RunSpec(seed=s, latent_dim=ld, rollout_len=rl)
            for s in seeds for ld in latent_dims for rl in rollout_lens]


def run_one(args: argparse.Namespace, spec: RunSpec, outdir: Path) -> dict:
    run_dir = outdir / spec.name
    cmd = [
        args.python_exe,
        args.base_script,
        '--seed', str(spec.seed),
        '--n-train', str(args.n_train),
        '--n-val', str(args.n_val),
        '--n-test', str(args.n_test),
        '--ae-epochs', str(args.ae_epochs),
        '--dyn-epochs', str(args.dyn_epochs),
        '--batch-size', str(args.batch_size),
        '--device', args.device,
        '--outdir', str(run_dir),
        '--systems', 'reaction_diffusion',
        '--latent-dim', str(spec.latent_dim),
        '--rollout-len', str(spec.rollout_len),
    ]

    if args.dry_run:
        return {
            'name': spec.name,
            'seed': spec.seed,
            'latent_dim': spec.latent_dim,
            'rollout_len': spec.rollout_len,
            'return_code': 0,
            'command': ' '.join(cmd),
            'output_dir': str(run_dir),
            'note': 'dry-run',
        }

    print(f"[RUN] {' '.join(cmd)}", flush=True)
    proc = subprocess.run(cmd, capture_output=True, text=True)

    meta = {
        'name': spec.name,
        'seed': spec.seed,
        'latent_dim': spec.latent_dim,
        'rollout_len': spec.rollout_len,
        'return_code': proc.returncode,
        'command': ' '.join(cmd),
        'output_dir': str(run_dir),
        'stdout_tail': proc.stdout[-4000:],
        'stderr_tail': proc.stderr[-4000:],
        'note': 'ok' if proc.returncode == 0 else 'failed',
    }
    return meta


def read_results(run_dir: Path) -> tuple[pd.DataFrame | None, pd.DataFrame | None]:
    results_path = run_dir / 'results.csv'
    damage_path = run_dir / 'decode_damage_all_systems.csv'
    if not results_path.exists() or not damage_path.exists():
        return None, None
    return pd.read_csv(results_path), pd.read_csv(damage_path)


def summarize(all_meta: list[dict], outdir: Path) -> None:
    manifest_path = outdir / 'manifest.csv'
    with manifest_path.open('w', newline='') as f:
        writer = csv.DictWriter(
            f,
            fieldnames=['name', 'seed', 'latent_dim', 'rollout_len', 'return_code', 'note', 'output_dir', 'command'],
        )
        writer.writeheader()
        for row in all_meta:
            writer.writerow({k: row.get(k, '') for k in writer.fieldnames})

    result_rows = []
    damage_rows = []
    summary_rows = []

    for meta in all_meta:
        if meta['return_code'] != 0:
            continue
        run_dir = Path(meta['output_dir'])
        results_df, damage_df = read_results(run_dir)
        if results_df is None:
            continue
        results_df = results_df.copy()
        results_df['run_name'] = meta['name']
        results_df['seed'] = meta['seed']
        results_df['latent_dim'] = meta['latent_dim']
        results_df['rollout_len'] = meta['rollout_len']
        result_rows.append(results_df)

        damage_df = damage_df.copy()
        damage_df['run_name'] = meta['name']
        damage_df['seed'] = meta['seed']
        damage_df['latent_dim'] = meta['latent_dim']
        damage_df['rollout_len'] = meta['rollout_len']
        damage_rows.append(damage_df)

        best = results_df.sort_values('full_rel_mse').iloc[0]
        latent = results_df.loc[results_df['strategy'] == 'latent'].iloc[0]
        hybrid16 = results_df.loc[results_df['strategy'] == 'hybrid_16'].iloc[0]
        hybrid8 = results_df.loc[results_df['strategy'] == 'hybrid_8'].iloc[0]
        summary_rows.append({
            'run_name': meta['name'],
            'seed': meta['seed'],
            'latent_dim': meta['latent_dim'],
            'rollout_len': meta['rollout_len'],
            'best_strategy': best['strategy'],
            'best_full_rel_mse': best['full_rel_mse'],
            'latent_full_rel_mse': latent['full_rel_mse'],
            'hybrid8_full_rel_mse': hybrid8['full_rel_mse'],
            'hybrid16_full_rel_mse': hybrid16['full_rel_mse'],
            'hybrid8_beats_latent': bool(hybrid8['full_rel_mse'] < latent['full_rel_mse']),
            'hybrid16_beats_latent': bool(hybrid16['full_rel_mse'] < latent['full_rel_mse']),
            'hybrid16_margin_vs_latent': float(latent['full_rel_mse'] - hybrid16['full_rel_mse']),
        })

    if result_rows:
        aggregate_results = pd.concat(result_rows, ignore_index=True)
        aggregate_results.to_csv(outdir / 'aggregate_results.csv', index=False)
    else:
        aggregate_results = pd.DataFrame()

    if damage_rows:
        aggregate_damage = pd.concat(damage_rows, ignore_index=True)
        aggregate_damage.to_csv(outdir / 'aggregate_decode_damage.csv', index=False)
    else:
        aggregate_damage = pd.DataFrame()

    summary_df = pd.DataFrame(summary_rows)
    if not summary_df.empty:
        summary_df = summary_df.sort_values(['hybrid16_beats_latent', 'hybrid16_margin_vs_latent'], ascending=[False, False])
        summary_df.to_csv(outdir / 'crossover_summary.csv', index=False)

    write_summary_md(all_meta, summary_df, aggregate_damage, outdir)


def write_summary_md(all_meta: list[dict], summary_df: pd.DataFrame, damage_df: pd.DataFrame, outdir: Path) -> None:
    total = len(all_meta)
    ok = sum(1 for m in all_meta if m['return_code'] == 0)
    failed = total - ok
    lines = []
    lines.append('# Reaction-Diffusion Confirmation Campaign Summary')
    lines.append('')
    lines.append(f'- Total runs planned: **{total}**')
    lines.append(f'- Successful runs: **{ok}**')
    lines.append(f'- Failed runs: **{failed}**')
    lines.append('')
    if summary_df.empty:
        lines.append('No successful runs to summarize.')
        (outdir / 'summary.md').write_text('\n'.join(lines))
        return

    count_h16 = int(summary_df['hybrid16_beats_latent'].sum())
    count_h8 = int(summary_df['hybrid8_beats_latent'].sum())
    lines.append('## Crossover counts')
    lines.append(f'- hybrid_16 beats latent in **{count_h16}/{len(summary_df)}** runs')
    lines.append(f'- hybrid_8 beats latent in **{count_h8}/{len(summary_df)}** runs')
    lines.append('')

    top = summary_df.head(10)
    lines.append('## Top candidate runs')
    for _, row in top.iterrows():
        lines.append(
            f"- `{row['run_name']}`: best={row['best_strategy']}, "
            f"latent={row['latent_full_rel_mse']:.6f}, "
            f"hybrid_16={row['hybrid16_full_rel_mse']:.6f}, "
            f"margin(latent-h16)={row['hybrid16_margin_vs_latent']:.6f}"
        )
    lines.append('')

    if not damage_df.empty:
        grp = damage_df.groupby(['latent_dim', 'rollout_len'])['latent_damage_mse'].mean().reset_index()
        best = grp.sort_values('latent_damage_mse', ascending=False).head(10)
        lines.append('## Highest decode-damage regimes (mean latent_damage_mse)')
        for _, row in best.iterrows():
            lines.append(
                f"- latent_dim={int(row['latent_dim'])}, rollout_len={int(row['rollout_len'])}: "
                f"latent_damage_mse={row['latent_damage_mse']:.6f}"
            )
        lines.append('')

    lines.append('## Interpretation')
    lines.append('- If hybrid_16 repeatedly beats latent, reaction-diffusion is a real grounded-correction regime.')
    lines.append('- If hybrid only ties latent in tiny margins, the main discovery still belongs to latent-first rollout.')
    lines.append('- If the winning pockets cluster by rollout length or latent dimension, that tells us where crossover lives.')
    (outdir / 'summary.md').write_text('\n'.join(lines))


def main(argv: Iterable[str] | None = None) -> None:
    args = parse_args(argv)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    specs = build_specs(args)

    all_meta = []
    for spec in specs:
        meta = run_one(args, spec, outdir)
        all_meta.append(meta)

    summarize(all_meta, outdir)
    (outdir / 'run_config.json').write_text(json.dumps(vars(args), indent=2))
    print(f"Saved confirmation outputs to: {outdir}")


if __name__ == '__main__':
    main()
