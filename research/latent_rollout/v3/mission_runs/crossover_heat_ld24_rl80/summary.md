# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_heat_ld24_rl80",
  "systems": [
    "heat"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
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

- ae_best_val_mse: 0.052719
- dyn_best_val_latent_mse: 0.000700

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| heat     | latent        |      0.0668064 |        0.0735103 |            0.0790015 |
| heat     | state         |     23.4993    |       90.877     |          149.055     |
| heat     | latent_branch |      0.0666561 |        0.0730554 |            0.0782448 |
| heat     | hybrid_2      |      2.02338   |        5.75029   |            7.5081    |
| heat     | hybrid_4      |      0.505891  |        1.12216   |            1.3026    |
| heat     | hybrid_8      |      0.211944  |        0.36423   |            0.386383  |
| heat     | hybrid_16     |      0.125385  |        0.180923  |            0.177047  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| heat     |           0.0146942 |             0.00485036 |                    9.34015e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.