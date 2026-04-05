# Cross-System Selector Plan

This is the harder selector problem.

The reaction-diffusion-only selector taught us that one regime was simple enough for a fixed policy (`hybrid_16`) to win.
The cross-system selector is where adaptive governed inference can actually prove itself.

## Goal
Choose among:
- latent
- hybrid_8
- hybrid_16

across multiple systems:
- heat
- wave
- burgers
- reaction_diffusion

## Inputs
Use one or more campaign output folders that contain:
- aggregate_results.csv
- aggregate_decode_damage.csv

This lets you combine:
- broad cross-system campaigns
- focused reaction-diffusion campaigns
- later extension campaigns

## Features
- system
- latent_dim
- rollout_len
- latent_damage mean / max / last
- state_damage mean / max
- direct_ground mean / max

## Label
Best strategy by minimum `full_rel_mse` by default.

## Evaluation
Leave-one-(system, seed)-group-out validation.

That is tougher than a random split and tests whether the selector generalizes to unseen runs inside each regime.

## Outputs
- cross_selector_run_level_dataset.csv
- fixed_policy_benchmarks.csv
- fixed_policy_benchmarks_by_system.csv
- cross_selector_cv_predictions.csv
- cross_selector_group_summary.csv
- cross_selector_system_summary.csv
- cross_selector_vs_fixed_policies.csv
- cross_selector_vs_fixed_policies_by_system.csv
- cross_selector_experiment_brief.md

## What success means
Success is:
- the adaptive selector beats every fixed policy overall, or
- it wins clearly in some systems while staying competitive overall,
which would show real regime-dependent policy learning.
