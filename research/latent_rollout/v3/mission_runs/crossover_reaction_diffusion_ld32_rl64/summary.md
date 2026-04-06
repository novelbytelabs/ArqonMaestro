# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_reaction_diffusion_ld32_rl64",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 64,
  "dt": 0.03,
  "latent_dim": 32,
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

- ae_best_val_mse: 0.001432
- dyn_best_val_latent_mse: 0.000006

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00237437 |       0.00178701 |           0.0019007  |
| reaction_diffusion | state         |     0.0146783  |       0.0171612  |           0.0148443  |
| reaction_diffusion | latent_branch |     0.00283853 |       0.00229616 |           0.00237034 |
| reaction_diffusion | hybrid_2      |     0.00525182 |       0.00501974 |           0.00442595 |
| reaction_diffusion | hybrid_4      |     0.00314446 |       0.0025733  |           0.00247365 |
| reaction_diffusion | hybrid_8      |     0.00261428 |       0.00200444 |           0.00204399 |
| reaction_diffusion | hybrid_16     |     0.00247227 |       0.00187862 |           0.00195997 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |          3.7222e-05 |            2.61026e-05 |                    4.41846e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.