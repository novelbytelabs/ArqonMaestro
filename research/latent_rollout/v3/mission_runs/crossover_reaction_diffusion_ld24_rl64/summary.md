# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_reaction_diffusion_ld24_rl64",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 64,
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

- ae_best_val_mse: 0.001466
- dyn_best_val_latent_mse: 0.000005

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00240195 |       0.00182051 |           0.0019601  |
| reaction_diffusion | state         |     0.00258558 |       0.00224175 |           0.00262543 |
| reaction_diffusion | latent_branch |     0.00324679 |       0.00316573 |           0.00345986 |
| reaction_diffusion | hybrid_2      |     0.0024412  |       0.00190331 |           0.0020455  |
| reaction_diffusion | hybrid_4      |     0.00240418 |       0.0018199  |           0.00192426 |
| reaction_diffusion | hybrid_8      |     0.00239599 |       0.00180211 |           0.00190642 |
| reaction_diffusion | hybrid_16     |     0.00239525 |       0.00180001 |           0.00191072 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         5.08013e-06 |            1.59034e-06 |                    3.86162e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.