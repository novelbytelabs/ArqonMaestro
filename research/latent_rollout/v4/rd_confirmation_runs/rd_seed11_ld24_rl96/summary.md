# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 11,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed11_ld24_rl96",
  "systems": [
    "reaction_diffusion"
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

### reaction_diffusion

- ae_best_val_mse: 0.001421
- dyn_best_val_latent_mse: 0.000035

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00413117 |       0.00772688 |           0.011373   |
| reaction_diffusion | state         |     0.00377699 |       0.00461843 |           0.00725609 |
| reaction_diffusion | latent_branch |     0.00528067 |       0.0092263  |           0.0134264  |
| reaction_diffusion | hybrid_2      |     0.0031461  |       0.00403581 |           0.00553607 |
| reaction_diffusion | hybrid_4      |     0.00299204 |       0.00401715 |           0.0051498  |
| reaction_diffusion | hybrid_8      |     0.0029572  |       0.00414991 |           0.00523445 |
| reaction_diffusion | hybrid_16     |     0.00305699 |       0.00451017 |           0.00575623 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |           3.846e-05 |            1.55071e-05 |                      3.539e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.