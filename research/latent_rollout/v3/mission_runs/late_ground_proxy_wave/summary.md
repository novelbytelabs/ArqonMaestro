# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/late_ground_proxy_wave",
  "systems": [
    "wave"
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

### wave

- ae_best_val_mse: 0.071893
- dyn_best_val_latent_mse: 0.004646

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| wave     | latent        |       0.264143 |         0.405539 |             0.443403 |
| wave     | state         |       4.40238  |         6.96414  |             7.64409  |
| wave     | latent_branch |       0.257313 |         0.390009 |             0.424965 |
| wave     | hybrid_2      |       1.97541  |         3.32514  |             3.54044  |
| wave     | hybrid_4      |       1.00339  |         1.73741  |             1.82169  |
| wave     | hybrid_8      |       0.540466 |         0.867145 |             0.905914 |
| wave     | hybrid_16     |       0.374664 |         0.570871 |             0.587011 |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| wave     |           0.0308661 |             0.00826685 |                    0.000275615 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.