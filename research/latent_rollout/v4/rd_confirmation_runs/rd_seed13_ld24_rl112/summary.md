# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 13,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed13_ld24_rl112",
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

- ae_best_val_mse: 0.001612
- dyn_best_val_latent_mse: 0.000062

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00434108 |       0.0082112  |           0.00978613 |
| reaction_diffusion | state         |     0.0921538  |       0.302857   |           0.342438   |
| reaction_diffusion | latent_branch |     0.00790277 |       0.0178941  |           0.0251899  |
| reaction_diffusion | hybrid_2      |     0.0254449  |       0.0835535  |           0.119909   |
| reaction_diffusion | hybrid_4      |     0.00732508 |       0.0176671  |           0.0244542  |
| reaction_diffusion | hybrid_8      |     0.0046011  |       0.00878434 |           0.0100952  |
| reaction_diffusion | hybrid_16     |     0.00430433 |       0.00819908 |           0.00955673 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         6.14895e-05 |            9.77812e-06 |                    4.00065e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.