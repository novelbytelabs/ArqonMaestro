# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 11,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed11_ld28_rl96",
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

- ae_best_val_mse: 0.001484
- dyn_best_val_latent_mse: 0.000046

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00359735 |       0.00562986 |           0.00680477 |
| reaction_diffusion | state         |     0.0432246  |       0.109897   |           0.185734   |
| reaction_diffusion | latent_branch |     0.00537345 |       0.00818264 |           0.00908414 |
| reaction_diffusion | hybrid_2      |     0.0117179  |       0.0220901  |           0.0266033  |
| reaction_diffusion | hybrid_4      |     0.00692133 |       0.012044   |           0.0139507  |
| reaction_diffusion | hybrid_8      |     0.00493967 |       0.0082823  |           0.00973216 |
| reaction_diffusion | hybrid_16     |     0.00386252 |       0.00608161 |           0.0070531  |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         4.56138e-05 |            1.07611e-05 |                      3.563e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.