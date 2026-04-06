# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld16_rl96",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 96,
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

### reaction_diffusion

- ae_best_val_mse: 0.001276
- dyn_best_val_latent_mse: 0.000078

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00363605 |       0.00567792 |           0.0069103  |
| reaction_diffusion | state         |     0.516878   |       0.8839     |           0.585409   |
| reaction_diffusion | latent_branch |     0.00487444 |       0.00655639 |           0.00762383 |
| reaction_diffusion | hybrid_2      |     0.0750524  |       0.108319   |           0.134303   |
| reaction_diffusion | hybrid_4      |     0.0285201  |       0.04222    |           0.0454806  |
| reaction_diffusion | hybrid_8      |     0.0135149  |       0.024454   |           0.0296918  |
| reaction_diffusion | hybrid_16     |     0.00705996 |       0.0132322  |           0.016261   |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         0.000991316 |            0.000751734 |                     2.2236e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.