# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 13,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed13_ld16_rl96",
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

- ae_best_val_mse: 0.001464
- dyn_best_val_latent_mse: 0.000042

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00266027 |       0.00397754 |           0.00498212 |
| reaction_diffusion | state         |     0.150972   |       0.109061   |           0.0875481  |
| reaction_diffusion | latent_branch |     0.0054353  |       0.0086251  |           0.0109454  |
| reaction_diffusion | hybrid_2      |     0.0479789  |       0.0540835  |           0.0356595  |
| reaction_diffusion | hybrid_4      |     0.0136823  |       0.0179725  |           0.0179764  |
| reaction_diffusion | hybrid_8      |     0.00516133 |       0.00635578 |           0.00671733 |
| reaction_diffusion | hybrid_16     |     0.0031059  |       0.0039719  |           0.00451589 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         0.000246416 |             0.00015184 |                     2.7898e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.