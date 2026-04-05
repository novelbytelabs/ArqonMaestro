# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld28_rl80",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
  "dt": 0.03,
  "latent_dim": 28,
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

- ae_best_val_mse: 0.001423
- dyn_best_val_latent_mse: 0.000039

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.0022808  |       0.00233183 |           0.00279442 |
| reaction_diffusion | state         |     0.00471005 |       0.00664234 |           0.00781447 |
| reaction_diffusion | latent_branch |     0.00248539 |       0.00257229 |           0.00308841 |
| reaction_diffusion | hybrid_2      |     0.00376208 |       0.00502929 |           0.00614491 |
| reaction_diffusion | hybrid_4      |     0.00301978 |       0.00354191 |           0.00420306 |
| reaction_diffusion | hybrid_8      |     0.00255592 |       0.00269229 |           0.00309697 |
| reaction_diffusion | hybrid_16     |     0.00234323 |       0.00236428 |           0.00273107 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         6.77439e-05 |            1.14981e-05 |                     3.6125e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.