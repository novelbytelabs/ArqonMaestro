# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_reaction_diffusion_ld16_rl48",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 48,
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

- ae_best_val_mse: 0.001444
- dyn_best_val_latent_mse: 0.000004

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00279511 |       0.00198351 |           0.00187185 |
| reaction_diffusion | state         |     0.00367279 |       0.00358231 |           0.00406216 |
| reaction_diffusion | latent_branch |     0.00401103 |       0.00382073 |           0.00368006 |
| reaction_diffusion | hybrid_2      |     0.00306452 |       0.00246584 |           0.00247593 |
| reaction_diffusion | hybrid_4      |     0.00287792 |       0.00212772 |           0.00203337 |
| reaction_diffusion | hybrid_8      |     0.00281547 |       0.00201941 |           0.00190396 |
| reaction_diffusion | hybrid_16     |     0.00279585 |       0.00198473 |           0.00187017 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         5.91471e-06 |            2.72104e-06 |                     4.0348e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.