# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_burgers_ld32_rl80",
  "systems": [
    "burgers"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
  "dt": 0.03,
  "latent_dim": 32,
  "hidden_dim": 160,
  "ae_epochs": 6,
  "dyn_epochs": 8,
  "batch_size": 32,
  "lr": 0.001,
  "multi_horizon": true,
  "horizons": [
    1,
    2,
    4,
    8
  ],
  "hybrid_intervals": [
    2,
    4,
    8,
    16
  ],
  "branch_candidates": 5,
  "branch_noise": 0.01,
  "grounding_quantize_levels": 128,
  "grounding_blur_alpha": 0.08,
  "decode_damage_steps": 16
}
```

## Training logs

### burgers

- ae_best_val_mse: 2.626517
- dyn_best_val_latent_mse: 0.586119

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| burgers  | latent        |    1.32284e+22 |      1.32287e+22 |          8.17067e+21 |
| burgers  | state         |    4.48403e+26 |      4.48414e+26 |          2.92636e+26 |
| burgers  | latent_branch |    1.28884e+22 |      1.28887e+22 |          7.96066e+21 |
| burgers  | hybrid_2      |    4.35432e+18 |      4.35443e+18 |          2.67121e+18 |
| burgers  | hybrid_4      |    1.45042e+17 |      1.45046e+17 |          8.71262e+16 |
| burgers  | hybrid_8      |    1.64931e+20 |      1.64935e+20 |          9.92336e+19 |
| burgers  | hybrid_16     |    3.47703e+21 |      3.47712e+21 |          2.12067e+21 |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| burgers  |             120.754 |              0.0185636 |                     0.00070235 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.