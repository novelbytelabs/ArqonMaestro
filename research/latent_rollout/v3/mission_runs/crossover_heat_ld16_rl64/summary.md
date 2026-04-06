# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_heat_ld16_rl64",
  "systems": [
    "heat"
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

### heat

- ae_best_val_mse: 0.056827
- dyn_best_val_latent_mse: 0.001906

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| heat     | latent        |      0.0845264 |         0.126395 |             0.150428 |
| heat     | state         |      5.32152   |        13.0637   |            16.7144   |
| heat     | latent_branch |      0.0814097 |         0.118342 |             0.139957 |
| heat     | hybrid_2      |      1.29521   |         2.66633  |             3.11274  |
| heat     | hybrid_4      |      0.472886  |         0.964726 |             1.11544  |
| heat     | hybrid_8      |      0.206326  |         0.354293 |             0.378015 |
| heat     | hybrid_16     |      0.123724  |         0.192696 |             0.193636 |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| heat     |           0.0247675 |             0.00744552 |                    0.000103519 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.