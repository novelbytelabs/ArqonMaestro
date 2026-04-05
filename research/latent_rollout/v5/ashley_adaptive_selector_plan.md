# Adaptive Selector Experiment Plan

This is the next discovery step after the reaction-diffusion confirmation campaign.

The question is no longer whether hybrid can ever help. We now have confirmation that it can.
The next question is whether a simple governed selector can choose the right policy better than any fixed policy.

## Input
Use the completed reaction-diffusion confirmation bundle:
- aggregate_results.csv
- aggregate_decode_damage.csv

## Candidate policies
- latent
- hybrid_8
- hybrid_16

## Features
The selector uses only run metadata and decode-damage style diagnostics:
- latent_dim
- rollout_len
- latent_damage mean / max / last
- state_damage mean / max
- direct_ground mean / max

## Label
Best strategy by minimum `full_rel_mse` by default.

## Evaluation
Leave-one-seed-out cross-validation.

This is the right evaluation because it asks whether the selector generalizes to a new seed instead of memorizing one.

## Outputs
- selector_run_level_dataset.csv
- fixed_policy_benchmarks.csv
- selector_cv_predictions.csv
- selector_cv_summary.csv
- selector_vs_fixed_policies.csv
- selector_rules.json
- selector_experiment_brief.md

## What success means
Success is not “perfect classification.”
Success is:
- lower mean metric than the best fixed policy, or
- lower regret to oracle than the best fixed policy, or
- interpretable rules that clearly map a real crossover regime

## Why this matters
If this works, the project moves from:
“we found a crossover regime”

to:
“we can start learning the policy that chooses the correct inference method automatically.”
