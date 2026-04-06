# Reaction-Diffusion Confirmation Plan

## Purpose
This is the focused follow-up after the broad mission campaign.

It is designed to answer one decisive question:

**Is reaction-diffusion a real hybrid-help regime, or were the earlier wins just narrow lucky pockets?**

## What this runner does
- runs only `reaction_diffusion`
- repeats across multiple seeds
- sweeps latent dimensions
- sweeps longer rollout lengths
- aggregates whether `hybrid_8` or `hybrid_16` actually beat `latent`
- outputs a compact summary instead of a giant artifact pile

## Default sweep
- seeds: `7,11,13`
- latent dims: `16,20,24,28,32`
- rollout lens: `80,96,112`

That is 45 runs total.

## Main output files
- `manifest.csv`
- `aggregate_results.csv`
- `aggregate_decode_damage.csv`
- `crossover_summary.csv`
- `summary.md`

## How to run
```bash
python3 ashley_rd_confirmation_runner.py \
  --base-script /home/irbsurfer/Projects/arqon/ArqonMaestro/research/latent_rollout/v2/ashley_latent_rollout_replication_v2.py \
  --python-exe /home/irbsurfer/miniconda3/envs/helios-gpu-118/bin/python3 \
  --outdir rd_confirmation_runs \
  --device cpu
```

## How to interpret success
Strong confirmation would look like one or both of these:
- `hybrid_16` beats `latent` in a meaningful fraction of runs
- the winning runs cluster in a coherent region of `(latent_dim, rollout_len)` rather than appearing randomly

## Why this matters
If this confirms, then we have a stronger external result than simple replication:

- latent-first is the global default
- but reaction-diffusion becomes a **real, mapped exception regime** where tuned grounding helps

That would be a genuine contribution back to Ashley.
