# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed7_ld32_rl112",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 112,
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

- ae_best_val_mse: 0.001302
- dyn_best_val_latent_mse: 0.000053

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00501892 |       0.0108492  |            0.0142194 |
| reaction_diffusion | state         |     0.0457367  |       0.152974   |            0.144692  |
| reaction_diffusion | latent_branch |     0.00675582 |       0.0153978  |            0.0217751 |
| reaction_diffusion | hybrid_2      |     0.0136771  |       0.0366172  |            0.0491164 |
| reaction_diffusion | hybrid_4      |     0.00789056 |       0.0173157  |            0.021176  |
| reaction_diffusion | hybrid_8      |     0.00598569 |       0.0120613  |            0.0141385 |
| reaction_diffusion | hybrid_16     |     0.00498112 |       0.00965231 |            0.0111697 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         3.74553e-05 |            7.47608e-06 |                    4.00094e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.