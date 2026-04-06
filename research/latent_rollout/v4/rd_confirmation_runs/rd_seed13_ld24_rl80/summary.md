# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 13,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed13_ld24_rl80",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
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

- ae_best_val_mse: 0.001365
- dyn_best_val_latent_mse: 0.000049

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00277102 |       0.00393788 |           0.00568348 |
| reaction_diffusion | state         |     0.0347689  |       0.085184   |           0.137297   |
| reaction_diffusion | latent_branch |     0.00289331 |       0.00366246 |           0.00497012 |
| reaction_diffusion | hybrid_2      |     0.00774978 |       0.0144557  |           0.0234374  |
| reaction_diffusion | hybrid_4      |     0.00349269 |       0.00431005 |           0.00556415 |
| reaction_diffusion | hybrid_8      |     0.00268739 |       0.00289471 |           0.00346537 |
| reaction_diffusion | hybrid_16     |     0.00243025 |       0.00263398 |           0.00320827 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         9.42947e-05 |            1.34969e-05 |                    4.26449e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.