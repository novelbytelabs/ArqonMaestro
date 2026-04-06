# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 11,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed11_ld20_rl80",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
  "dt": 0.03,
  "latent_dim": 20,
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

- ae_best_val_mse: 0.001648
- dyn_best_val_latent_mse: 0.000005

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00247527 |       0.00243254 |           0.0028696  |
| reaction_diffusion | state         |     0.00296041 |       0.00304305 |           0.00336296 |
| reaction_diffusion | latent_branch |     0.00339126 |       0.00333115 |           0.00350584 |
| reaction_diffusion | hybrid_2      |     0.00258717 |       0.00257987 |           0.00297633 |
| reaction_diffusion | hybrid_4      |     0.00249724 |       0.00246282 |           0.00288137 |
| reaction_diffusion | hybrid_8      |     0.00247628 |       0.00243383 |           0.00286429 |
| reaction_diffusion | hybrid_16     |     0.00247201 |       0.00242637 |           0.0028609  |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         1.45543e-06 |             1.6493e-07 |                    3.74296e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.