# Research Briefing — Reaction-Diffusion Confirmation Campaign

## Executive summary

This campaign was designed to test whether the earlier hybrid-over-latent hints in reaction-diffusion were real or just lucky pockets.

Headline result: they are real.

- Total runs planned: 45
- Successful runs: 45
- Failed runs: 0
- hybrid_16 beat latent in 28/45 runs
- hybrid_8 beat latent in 16/45 runs
- Overall best strategy by run:
  - hybrid_16: 24
  - latent: 17
  - hybrid_8: 3
  - hybrid_4: 1

This confirms that reaction-diffusion is a genuine hybrid-help regime under a meaningful subset of settings.

## Campaign design

Reaction-diffusion only.

Sweep:
- Seeds: 7, 11, 13
- Latent dimensions: 16, 20, 24, 28, 32
- Rollout lengths: 80, 96, 112

Strategies compared:
- latent
- state
- latent_branch
- hybrid_2
- hybrid_4
- hybrid_8
- hybrid_16

Primary metrics:
- full_rel_mse
- tail16_rel_mse
- final_step_rel_mse

Secondary diagnostic:
- decode-damage / latent_damage_mse

## Core findings

### 1. Reaction-diffusion is now a confirmed hybrid-help regime

hybrid_16 beat latent in 28/45 runs (62.2%).
hybrid_8 beat latent in 16/45 runs (35.6%).

This is no longer a one-off anomaly.

### 2. The wins cluster at longer rollout lengths

hybrid_16 win rate by rollout length:
- RL 80: 6/15 (40.0%)
- RL 96: 10/15 (66.7%)
- RL 112: 12/15 (80.0%)

Interpretation:
the longer the rollout, the more likely periodic grounding helps.

### 3. The strongest latent-dimension pocket is around 24

hybrid_16 win rate by latent dimension:
- LD 16: 5/9 (55.6%)
- LD 20: 6/9 (66.7%)
- LD 24: 8/9 (88.9%)
- LD 28: 5/9 (55.6%)
- LD 32: 4/9 (44.4%)

Interpretation:
latent_dim=24 is currently the strongest crossover pocket in this sweep.

### 4. The best runs are meaningful, not trivial ties

Top examples:
- seed13, ld32, rl112: latent 0.008165 → hybrid_8 0.004503
- seed11, ld24, rl112: latent 0.007189 → hybrid_16 0.004130
- seed13, ld20, rl112: latent 0.007056 → hybrid_16 0.004026
- seed13, ld32, rl96: latent 0.004991 → hybrid_16 0.002521
- seed7, ld24, rl112: latent 0.006167 → hybrid_16 0.003863

Average hybrid_16 margin over latent on winning runs: 0.001022
Maximum observed margin: 0.003332

### 5. This does not overturn latent-first as the main discovery

The correct reading is not “hybrid always wins.”

The correct reading is:
- latent-first remains the main default discovery
- reaction-diffusion is a real exception regime where tuned periodic grounding can outperform pure latent rollout
- therefore the best policy is regime-dependent

## Scientific interpretation

The strongest lesson from this confirmation campaign is:

**Inference policy is part of model performance.**

The old question was:
- Which model is best?

The new question is:
- Which inference policy is best for this system and regime?

Reaction-diffusion now gives concrete evidence that:
- some systems are best served by staying latent
- some systems are best served by periodic grounding
- the crossover can be mapped empirically

This supports an adaptive governed-inference view rather than a single universal policy.

## What this means strategically

We now have enough evidence to say:

1. Ashley’s broad thesis is externally supported.
2. Reaction-diffusion is the first clearly confirmed hybrid-help regime.
3. The next breakthrough should be an adaptive selector / governor that chooses among:
   - latent
   - hybrid_8
   - hybrid_16
   - possibly branch/planning variants

## Recommended next step

Run an adaptive regime-selection study using the confirmed reaction-diffusion pocket as training/evaluation ground truth.

Target questions:
- Can a selector predict when latent vs hybrid_16 should be used?
- Can a simple rule based on rollout length, latent dimension, and decode-damage capture most of the gain?
- Does adaptive control outperform any fixed strategy?

## Bottom line

This campaign moved the project from:
- “hybrid might sometimes help”

to:
- “reaction-diffusion is a reproducible hybrid-help regime, especially at longer rollout horizons and around latent_dim=24.”

That is a real result.