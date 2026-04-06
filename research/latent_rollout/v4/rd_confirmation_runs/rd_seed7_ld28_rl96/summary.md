# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld28_rl96",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 96,
  "dt": 0.03,
  "latent_dim": 28,
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

### reaction_diffusion

- ae_best_val_mse: 0.001268
- dyn_best_val_latent_mse: 0.000046

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00336577 |       0.00567412 |           0.00788865 |
| reaction_diffusion | state         |     0.0395921  |       0.112889   |           0.216094   |
| reaction_diffusion | latent_branch |     0.00449244 |       0.00857228 |           0.0127424  |
| reaction_diffusion | hybrid_2      |     0.0116985  |       0.0255672  |           0.0347626  |
| reaction_diffusion | hybrid_4      |     0.00704007 |       0.0142016  |           0.0189313  |
| reaction_diffusion | hybrid_8      |     0.00440369 |       0.00776175 |           0.0100122  |
| reaction_diffusion | hybrid_16     |     0.00318128 |       0.00484646 |           0.00594783 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         9.39527e-05 |            2.14392e-05 |                    3.65672e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.