# Ashley Mission: Decisive Next Steps

## What we know now

The current external replications strongly support this thesis:

- latent rollout preserves learned dynamics much better than repeated state-space extraction
- wave-like systems are especially sensitive to grounding damage
- tiny latent branching helps a little
- hybrid is better than full state rollout, but has not yet beaten pure latent in the current harness

## What we need to prove next

### 1. Multi-horizon matters
Run a matched ablation against `--single-horizon`.

Question answered:
Is the stability coming mostly from latent space itself, or from multi-horizon latent training?

### 2. Search for true hybrid crossover
We should stop treating hybrid as dogma and test it as a hypothesis.

Question answered:
Is there any real regime where grounding becomes corrective rather than destructive?

### 3. Rank systems by decode damage
We now have a usable scientific instrument.

Question answered:
Which systems lose the most from decode/re-encode, and which systems are comparatively safe?

## What success looks like

A strong package back to Ashley would include:

- a clean baseline replication
- a multi-horizon vs single-horizon ablation
- a crossover search table
- decode-damage rankings by system
- a short interpretation note stating whether hybrid looks fundamental, optional, or mostly compensatory

## Campaign runner

Use:

python3 ashley_campaign_runner_v1.py \
  --base-script ashley_latent_rollout_replication_v2.py \
  --outdir mission_runs

This produces:

- `manifest.csv`
- `aggregate_results.csv`
- `aggregate_decode_damage.csv`
- `campaign_summary.md`

## Recommended first pass

python3 ashley_campaign_runner_v1.py \
  --base-script ashley_latent_rollout_replication_v2.py \
  --outdir mission_runs \
  --n-train 128 --n-val 32 --n-test 32 \
  --ae-epochs 6 --dyn-epochs 8 --batch-size 32

Then scale up.

## Strategic interpretation

If hybrid never wins, the likely lesson is:

stay latent, improve latent stability, and use branching or planning rather than frequent grounding.

If hybrid wins on a narrow subset, the likely lesson is:

grounding is a system-specific repair tool, not a universal best practice.
