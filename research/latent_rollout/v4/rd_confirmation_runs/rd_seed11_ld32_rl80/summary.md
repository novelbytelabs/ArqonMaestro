# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 11,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed11_ld32_rl80",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
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

- ae_best_val_mse: 0.001459
- dyn_best_val_latent_mse: 0.000022

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00255021 |       0.0028585  |           0.00344832 |
| reaction_diffusion | state         |     0.0368043  |       0.0521407  |           0.0531354  |
| reaction_diffusion | latent_branch |     0.00303664 |       0.00341794 |           0.00402096 |
| reaction_diffusion | hybrid_2      |     0.0118554  |       0.0161777  |           0.016202   |
| reaction_diffusion | hybrid_4      |     0.00505399 |       0.00637915 |           0.00656141 |
| reaction_diffusion | hybrid_8      |     0.00316158 |       0.00365801 |           0.00397791 |
| reaction_diffusion | hybrid_16     |     0.00266001 |       0.00296745 |           0.00339263 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         8.46625e-05 |            6.19477e-05 |                    4.91085e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.