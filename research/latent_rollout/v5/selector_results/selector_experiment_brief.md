# Adaptive Selector Experiment Brief

## What this experiment asked
Can a simple adaptive selector beat fixed policies (always latent / hybrid_8 / hybrid_16) when choosing the best strategy by `full_rel_mse`?

## Dataset
- Runs: **45**
- Seeds: **7, 11, 13**
- Latent dims: **16, 20, 24, 28, 32**
- Rollout lengths: **80, 96, 112**

## Best-strategy label distribution
- latent: **17/45**
- hybrid_8: **4/45**
- hybrid_16: **24/45**

## Policy benchmark table

| policy | mean_metric | mean_regret_vs_oracle | win_rate |
|---|---:|---:|---:|
| always_hybrid_16 | 0.003613 | 0.000264 | 0.533 |
| adaptive_selector | 0.003853 | 0.000503 | 0.489 |
| always_latent | 0.004002 | 0.000652 | 0.378 |
| always_hybrid_8 | 0.004620 | 0.001270 | 0.089 |

## Leave-one-seed-out selector summary

| seed | runs | accuracy | mean_metric | mean_regret_vs_oracle |
|---|---:|---:|---:|---:|
| 7 | 15 | 0.600 | 0.003959 | 0.000578 |
| 11 | 15 | 0.333 | 0.003848 | 0.000463 |
| 13 | 15 | 0.533 | 0.003752 | 0.000468 |
| ALL | 45 | 0.489 | 0.003853 | 0.000503 |

## Interpretable selector rules

### Model trained leaving out seed 7

```
|--- state_damage_mean <= 0.00
|   |--- class: hybrid_16
|--- state_damage_mean >  0.00
|   |--- latent_damage_max <= 0.00
|   |   |--- latent_damage_max <= 0.00
|   |   |   |--- class: hybrid_8
|   |   |--- latent_damage_max >  0.00
|   |   |   |--- class: latent
|   |--- latent_damage_max >  0.00
|   |   |--- state_damage_max <= 0.00
|   |   |   |--- class: hybrid_16
|   |   |--- state_damage_max >  0.00
|   |   |   |--- class: latent
```

### Model trained leaving out seed 11

```
|--- state_damage_max <= 0.00
|   |--- latent_damage_last <= 0.00
|   |   |--- state_damage_max <= 0.00
|   |   |   |--- class: latent
|   |   |--- state_damage_max >  0.00
|   |   |   |--- class: hybrid_16
|   |--- latent_damage_last >  0.00
|   |   |--- latent_dim <= 30.00
|   |   |   |--- class: hybrid_16
|   |   |--- latent_dim >  30.00
|   |   |   |--- class: hybrid_16
|--- state_damage_max >  0.00
|   |--- class: latent
```

### Model trained leaving out seed 13

```
|--- state_damage_mean <= 0.00
|   |--- class: hybrid_16
|--- state_damage_mean >  0.00
|   |--- latent_damage_mean <= 0.00
|   |   |--- class: hybrid_8
|   |--- latent_damage_mean >  0.00
|   |   |--- rollout_len <= 88.00
|   |   |   |--- class: latent
|   |   |--- rollout_len >  88.00
|   |   |   |--- class: hybrid_16
```

## Plain-English interpretation
The current best policy in this experiment is **always_hybrid_16** by mean `full_rel_mse`. If the adaptive selector is on top or close to the top while keeping low regret, that means the system is starting to learn a real governed-inference policy rather than relying on one fixed rule.