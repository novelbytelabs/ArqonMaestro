# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/crossover_reaction_diffusion_ld16_rl80",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
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

- ae_best_val_mse: 0.001136
- dyn_best_val_latent_mse: 0.000079

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.0026516  |       0.00348257 |           0.00431124 |
| reaction_diffusion | state         |     0.0172852  |       0.0265549  |           0.0295787  |
| reaction_diffusion | latent_branch |     0.00475295 |       0.00568952 |           0.00614534 |
| reaction_diffusion | hybrid_2      |     0.00719792 |       0.0104178  |           0.0117183  |
| reaction_diffusion | hybrid_4      |     0.00353333 |       0.00436734 |           0.00493968 |
| reaction_diffusion | hybrid_8      |     0.00248059 |       0.00274214 |           0.00311157 |
| reaction_diffusion | hybrid_16     |     0.00225226 |       0.00247588 |           0.00287458 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         5.69121e-05 |            2.00962e-05 |                    4.42394e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.