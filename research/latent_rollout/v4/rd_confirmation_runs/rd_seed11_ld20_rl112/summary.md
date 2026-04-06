# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 11,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed11_ld20_rl112",
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

- ae_best_val_mse: 0.001384
- dyn_best_val_latent_mse: 0.000069

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00481433 |       0.00866808 |            0.0101345 |
| reaction_diffusion | state         |     0.15615    |       0.233279   |            0.227174  |
| reaction_diffusion | latent_branch |     0.00685906 |       0.0137065  |            0.0185489 |
| reaction_diffusion | hybrid_2      |     0.0540933  |       0.0997708  |            0.0780626 |
| reaction_diffusion | hybrid_4      |     0.0230978  |       0.0531472  |            0.0568015 |
| reaction_diffusion | hybrid_8      |     0.00984701 |       0.0206928  |            0.0240226 |
| reaction_diffusion | hybrid_16     |     0.00609157 |       0.0113195  |            0.0125821 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         0.000106278 |            5.34202e-05 |                    3.50032e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.