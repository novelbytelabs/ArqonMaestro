# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_reaction_diffusion_ld24_rl48",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 48,
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

- ae_best_val_mse: 0.001463
- dyn_best_val_latent_mse: 0.000004

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00276674 |       0.00191285 |           0.00178885 |
| reaction_diffusion | state         |     0.00287748 |       0.00197487 |           0.00186823 |
| reaction_diffusion | latent_branch |     0.00344669 |       0.00298017 |           0.00288045 |
| reaction_diffusion | hybrid_2      |     0.00280374 |       0.00192951 |           0.00180018 |
| reaction_diffusion | hybrid_4      |     0.00278162 |       0.00191634 |           0.00178331 |
| reaction_diffusion | hybrid_8      |     0.00277201 |       0.00191163 |           0.00178017 |
| reaction_diffusion | hybrid_16     |     0.00276669 |       0.00191003 |           0.00178024 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         8.05395e-06 |             3.4334e-06 |                    3.99038e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.