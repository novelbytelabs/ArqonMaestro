# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_burgers_ld16_rl48",
  "systems": [
    "burgers"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 48,
  "dt": 0.03,
  "latent_dim": 16,
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

- ae_best_val_mse: 0.080260
- dyn_best_val_latent_mse: 0.003726

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| burgers  | latent        |      0.0879962 |         0.119355 |             0.146981 |
| burgers  | state         |      3.09539   |         6.64468  |             9.889    |
| burgers  | latent_branch |      0.084978  |         0.11282  |             0.137184 |
| burgers  | hybrid_2      |      0.895446  |         1.69425  |             2.15278  |
| burgers  | hybrid_4      |      0.362236  |         0.633609 |             0.766725 |
| burgers  | hybrid_8      |      0.18801   |         0.299352 |             0.335533 |
| burgers  | hybrid_16     |      0.123323  |         0.187341 |             0.20198  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| burgers  |           0.0296716 |             0.00887277 |                    0.000116017 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.