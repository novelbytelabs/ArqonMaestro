# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_burgers_ld16_rl64",
  "systems": [
    "burgers"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 64,
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

- ae_best_val_mse: 0.091499
- dyn_best_val_latent_mse: 0.004684

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| burgers  | latent        |       0.16598  |         0.329557 |             0.489078 |
| burgers  | state         |     135.23     |       469.681    |           984.88     |
| burgers  | latent_branch |       0.150799 |         0.284521 |             0.412107 |
| burgers  | hybrid_2      |       4.60659  |        12.518    |            17.7204   |
| burgers  | hybrid_4      |       0.805187 |         1.66726  |             2.01542  |
| burgers  | hybrid_8      |       0.354711 |         0.669759 |             0.753986 |
| burgers  | hybrid_16     |       0.211298 |         0.381855 |             0.43129  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| burgers  |           0.0660684 |             0.00962059 |                    0.000190816 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.