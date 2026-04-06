# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_burgers_ld24_rl64",
  "systems": [
    "burgers"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 64,
  "dt": 0.03,
  "latent_dim": 24,
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

- ae_best_val_mse: 0.078066
- dyn_best_val_latent_mse: 0.002086

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| burgers  | latent        |       0.157708 |         0.340484 |             0.502743 |
| burgers  | state         |      48.5019   |       160.215    |           318.056    |
| burgers  | latent_branch |       0.150255 |         0.319316 |             0.471862 |
| burgers  | hybrid_2      |       2.80988  |         7.15535  |            10.0616   |
| burgers  | hybrid_4      |       0.685601 |         1.43919  |             1.72807  |
| burgers  | hybrid_8      |       0.289564 |         0.541823 |             0.616967 |
| burgers  | hybrid_16     |       0.180896 |         0.333087 |             0.385845 |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| burgers  |           0.0301367 |             0.00810325 |                    0.000169224 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.