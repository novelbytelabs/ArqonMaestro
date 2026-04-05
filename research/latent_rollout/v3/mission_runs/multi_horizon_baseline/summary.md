# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/multi_horizon_baseline",
  "systems": [
    "heat",
    "wave",
    "burgers",
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 48,
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

### heat

- ae_best_val_mse: 0.072428
- dyn_best_val_latent_mse: 0.001327

### wave

- ae_best_val_mse: 0.088515
- dyn_best_val_latent_mse: 0.005815

### burgers

- ae_best_val_mse: 0.066070
- dyn_best_val_latent_mse: 0.001602

### reaction_diffusion

- ae_best_val_mse: 0.001415
- dyn_best_val_latent_mse: 0.000004

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| heat               | latent        |     0.0793718  |       0.0855653  |           0.0907424  |
| heat               | state         |     5.0015     |      12.0013     |          18.6884     |
| heat               | latent_branch |     0.0790002  |       0.0848412  |           0.0897822  |
| heat               | hybrid_2      |     1.04534    |       2.21702    |           3.09337    |
| heat               | hybrid_4      |     0.346413   |       0.605877   |           0.745983   |
| heat               | hybrid_8      |     0.181429   |       0.273095   |           0.29513    |
| heat               | hybrid_16     |     0.11954    |       0.165448   |           0.16317    |
| wave               | latent        |     0.231458   |       0.2793     |           0.314031   |
| wave               | state         |     5.73343    |      13.888      |          25.6524     |
| wave               | latent_branch |     0.229285   |       0.274695   |           0.307288   |
| wave               | hybrid_2      |     0.912837   |       1.61401    |           2.2262     |
| wave               | hybrid_4      |     0.500407   |       0.765893   |           0.90217    |
| wave               | hybrid_8      |     0.345098   |       0.481281   |           0.532021   |
| wave               | hybrid_16     |     0.274336   |       0.361123   |           0.388132   |
| burgers            | latent        |     0.0867382  |       0.118098   |           0.145865   |
| burgers            | state         |    35.2447     |     101.936      |         315.652      |
| burgers            | latent_branch |     0.0853777  |       0.115164   |           0.141327   |
| burgers            | hybrid_2      |     1.0546     |       2.18318    |           3.23828    |
| burgers            | hybrid_4      |     0.356229   |       0.610424   |           0.734708   |
| burgers            | hybrid_8      |     0.192392   |       0.301917   |           0.336709   |
| burgers            | hybrid_16     |     0.127524   |       0.194652   |           0.208553   |
| reaction_diffusion | latent        |     0.00279895 |       0.00200445 |           0.00192577 |
| reaction_diffusion | state         |     0.00351733 |       0.0031269  |           0.00251383 |
| reaction_diffusion | latent_branch |     0.00336571 |       0.00291346 |           0.00294474 |
| reaction_diffusion | hybrid_2      |     0.00297548 |       0.00228288 |           0.00207489 |
| reaction_diffusion | hybrid_4      |     0.00284333 |       0.00206837 |           0.00194876 |
| reaction_diffusion | hybrid_8      |     0.00280856 |       0.00201358 |           0.00191741 |
| reaction_diffusion | hybrid_16     |     0.00279956 |       0.00200118 |           0.00191282 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| burgers            |         0.0256545   |            0.00801884  |                    0.000124275 |
| heat               |         0.0245307   |            0.00656951  |                    0.000106062 |
| reaction_diffusion |         7.65241e-06 |            3.72334e-06 |                    3.76195e-05 |
| wave               |         0.0251523   |            0.00860111  |                    0.000338323 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.