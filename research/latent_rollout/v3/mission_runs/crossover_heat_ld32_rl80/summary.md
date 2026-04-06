# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_heat_ld32_rl80",
  "systems": [
    "heat"
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

### heat

- ae_best_val_mse: 0.048398
- dyn_best_val_latent_mse: 0.000439

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| heat     | latent        |      0.0595512 |        0.0676444 |            0.0732109 |
| heat     | state         |     11.3723    |       39.0801    |           56.2802    |
| heat     | latent_branch |      0.0595384 |        0.0675728 |            0.0730151 |
| heat     | hybrid_2      |      1.44524   |        3.91062   |            5.05079   |
| heat     | hybrid_4      |      0.407386  |        0.837782  |            0.956376  |
| heat     | hybrid_8      |      0.187068  |        0.305456  |            0.318939  |
| heat     | hybrid_16     |      0.112555  |        0.161588  |            0.157186  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| heat     |          0.00928731 |             0.00467478 |                    8.81913e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.