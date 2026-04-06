# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld20_rl112",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 112,
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

- ae_best_val_mse: 0.001324
- dyn_best_val_latent_mse: 0.000061

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00743314 |        0.016461  |            0.0203563 |
| reaction_diffusion | state         |     0.0170506  |        0.0539543 |            0.0901268 |
| reaction_diffusion | latent_branch |     0.00937319 |        0.022888  |            0.0336145 |
| reaction_diffusion | hybrid_2      |     0.0100346  |        0.0259542 |            0.04077   |
| reaction_diffusion | hybrid_4      |     0.00699968 |        0.0158317 |            0.021199  |
| reaction_diffusion | hybrid_8      |     0.00556295 |        0.0115473 |            0.0140107 |
| reaction_diffusion | hybrid_16     |     0.00531695 |        0.0108371 |            0.0127687 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         7.07589e-05 |            1.42166e-05 |                    3.26402e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.