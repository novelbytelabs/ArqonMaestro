# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_burgers_ld24_rl80",
  "systems": [
    "burgers"
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

### burgers

- ae_best_val_mse: 2.469683
- dyn_best_val_latent_mse: 2.031423

## Rollout results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| burgers  | latent        |    5.03362e+24 |      5.03375e+24 |          3.30603e+24 |
| burgers  | state         |  371.801       |    368.929       |         98.2925      |
| burgers  | latent_branch |    3.83619e+24 |      3.8363e+24  |          2.51957e+24 |
| burgers  | hybrid_2      |   22.3026      |     22.2831      |          9.85326     |
| burgers  | hybrid_4      |    4.02478e+07 |      4.02488e+07 |          2.49366e+07 |
| burgers  | hybrid_8      |    1.17573e+13 |      1.17576e+13 |          7.33097e+12 |
| burgers  | hybrid_16     |    1.05994e+23 |      1.05997e+23 |          6.5435e+22  |

## Decode-damage summary

| system   |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:---------|--------------------:|-----------------------:|-------------------------------:|
| burgers  |            0.127455 |              0.0198841 |                     0.00046572 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.