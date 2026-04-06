# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_heat_ld32_rl48",
  "systems": [
    "heat"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 48,
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

### heat

- ae_best_val_mse: 0.087997
- dyn_best_val_latent_mse: 0.000782

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| heat     | latent        |      0.0851436 |        0.0836721 |            0.0837275 |
| heat     | state         |    762.162     |     2394.93      |         8204.01      |
| heat     | latent_branch |      0.0851398 |        0.0836599 |            0.0836944 |
| heat     | hybrid_2      |      5.34068   |       14.7798    |           29.618     |
| heat     | hybrid_4      |      0.504165  |        1.04082   |            1.46071   |
| heat     | hybrid_8      |      0.190112  |        0.290007  |            0.316953  |
| heat     | hybrid_16     |      0.120592  |        0.155983  |            0.150327  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| heat     |           0.0659377 |              0.0139343 |                    0.000116012 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.