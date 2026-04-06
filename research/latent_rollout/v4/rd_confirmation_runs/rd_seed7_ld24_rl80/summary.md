# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld24_rl80",
  "systems": [
    "reaction_diffusion"
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

### reaction_diffusion

- ae_best_val_mse: 0.001320
- dyn_best_val_latent_mse: 0.000048

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00220421 |       0.00247534 |           0.00311141 |
| reaction_diffusion | state         |     0.00548259 |       0.00954354 |           0.0121743  |
| reaction_diffusion | latent_branch |     0.00288655 |       0.00306909 |           0.003455   |
| reaction_diffusion | hybrid_2      |     0.00375281 |       0.00563112 |           0.0071778  |
| reaction_diffusion | hybrid_4      |     0.00290155 |       0.00359614 |           0.00423829 |
| reaction_diffusion | hybrid_8      |     0.00244831 |       0.00260959 |           0.00291307 |
| reaction_diffusion | hybrid_16     |     0.00218308 |       0.00218981 |           0.00246574 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         8.10772e-05 |            9.12149e-06 |                    3.81952e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.