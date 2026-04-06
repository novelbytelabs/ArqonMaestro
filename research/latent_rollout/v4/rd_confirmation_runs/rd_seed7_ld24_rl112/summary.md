# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld24_rl112",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 112,
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

- ae_best_val_mse: 0.001319
- dyn_best_val_latent_mse: 0.000057

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00616736 |       0.0126751  |           0.0149992  |
| reaction_diffusion | state         |     0.0152878  |       0.0353994  |           0.0558036  |
| reaction_diffusion | latent_branch |     0.00742286 |       0.014993   |           0.0194738  |
| reaction_diffusion | hybrid_2      |     0.00793703 |       0.0176039  |           0.0287644  |
| reaction_diffusion | hybrid_4      |     0.00485307 |       0.00940777 |           0.0132753  |
| reaction_diffusion | hybrid_8      |     0.00388678 |       0.00691446 |           0.00827884 |
| reaction_diffusion | hybrid_16     |     0.00386268 |       0.00696462 |           0.00789417 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         6.67997e-05 |            1.52189e-05 |                     3.8748e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.