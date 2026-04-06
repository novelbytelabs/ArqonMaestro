# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld20_rl80",
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

- ae_best_val_mse: 0.001428
- dyn_best_val_latent_mse: 0.000057

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00240588 |       0.00259525 |           0.00311758 |
| reaction_diffusion | state         |     0.00460789 |       0.00566954 |           0.00743348 |
| reaction_diffusion | latent_branch |     0.00360507 |       0.00371828 |           0.00402347 |
| reaction_diffusion | hybrid_2      |     0.00309281 |       0.00335421 |           0.00395497 |
| reaction_diffusion | hybrid_4      |     0.00260356 |       0.00265593 |           0.00307177 |
| reaction_diffusion | hybrid_8      |     0.00245175 |       0.00251077 |           0.00295108 |
| reaction_diffusion | hybrid_16     |     0.00242875 |       0.00253154 |           0.00299563 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         6.20733e-05 |            1.40664e-05 |                    4.43323e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.