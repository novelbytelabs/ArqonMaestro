# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/late_ground_proxy_heat",
  "systems": [
    "heat"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 96,
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

### heat

- ae_best_val_mse: 0.037062
- dyn_best_val_latent_mse: 0.000359

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| heat     | latent        |      0.0504077 |        0.0569392 |            0.0604974 |
| heat     | state         |      3.44474   |        6.91112   |            7.53564   |
| heat     | latent_branch |      0.0504077 |        0.0569392 |            0.0604974 |
| heat     | hybrid_2      |      1.66178   |        4.15524   |            4.64714   |
| heat     | hybrid_4      |      0.511126  |        1.19896   |            1.34693   |
| heat     | hybrid_8      |      0.19791   |        0.353601  |            0.371303  |
| heat     | hybrid_16     |      0.109124  |        0.161094  |            0.157035  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| heat     |           0.0104867 |             0.00426692 |                    7.95304e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.