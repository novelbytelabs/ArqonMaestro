# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 42,
  "device": "cpu",
  "outdir": "ashley_replication_outputs_v2_full",
  "systems": [
    "heat",
    "wave",
    "burgers",
    "reaction_diffusion"
  ],
  "n_train": 256,
  "n_val": 64,
  "n_test": 64,
  "grid_size": 64,
  "rollout_len": 48,
  "dt": 0.03,
  "latent_dim": 24,
  "hidden_dim": 160,
  "ae_epochs": 10,
  "dyn_epochs": 16,
  "batch_size": 64,
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

- ae_best_val_mse: 0.004156
- dyn_best_val_latent_mse: 0.000065

### wave

- ae_best_val_mse: 0.028663
- dyn_best_val_latent_mse: 0.001276

### burgers

- ae_best_val_mse: 0.009317
- dyn_best_val_latent_mse: 0.000214

### reaction_diffusion

- ae_best_val_mse: 0.001412
- dyn_best_val_latent_mse: 0.000006

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| heat               | latent        |     0.00601786 |       0.00682859 |           0.00732472 |
| heat               | state         |    78.7217     |     232.135      |         553.48       |
| heat               | latent_branch |     0.00601786 |       0.00682859 |           0.00732472 |
| heat               | hybrid_2      |     2.84802    |       7.87689    |          14.4397     |
| heat               | hybrid_4      |     0.209758   |       0.496954   |           0.742471   |
| heat               | hybrid_8      |     0.0454901  |       0.0886462  |           0.100871   |
| heat               | hybrid_16     |     0.0173854  |       0.0316023  |           0.0308538  |
| wave               | latent        |     0.0668988  |       0.0835801  |           0.0944154  |
| wave               | state         |    51.0122     |     133.66       |         294.494      |
| wave               | latent_branch |     0.0664368  |       0.0827269  |           0.0933618  |
| wave               | hybrid_2      |     2.9089     |       6.74326    |          10.6477     |
| wave               | hybrid_4      |     0.504133   |       0.970332   |           1.27124    |
| wave               | hybrid_8      |     0.19694    |       0.327528   |           0.372531   |
| wave               | hybrid_16     |     0.111069   |       0.171149   |           0.180784   |
| burgers            | latent        |     0.0190054  |       0.0328956  |           0.04937    |
| burgers            | state         | 40362.6        |  122698          |      596251          |
| burgers            | latent_branch |     0.0189674  |       0.0328198  |           0.0492734  |
| burgers            | hybrid_2      |    13.701      |      39.4925     |         100.571      |
| burgers            | hybrid_4      |     0.372435   |       0.875423   |           1.34549    |
| burgers            | hybrid_8      |     0.0809828  |       0.166028   |           0.210406   |
| burgers            | hybrid_16     |     0.0345722  |       0.0668248  |           0.0826184  |
| reaction_diffusion | latent        |     0.00267709 |       0.00192109 |           0.00186169 |
| reaction_diffusion | state         |     0.0236514  |       0.0402623  |           0.047569   |
| reaction_diffusion | latent_branch |     0.00376219 |       0.00353881 |           0.00360178 |
| reaction_diffusion | hybrid_2      |     0.00868905 |       0.0126058  |           0.0140703  |
| reaction_diffusion | hybrid_4      |     0.00451918 |       0.00507766 |           0.00529381 |
| reaction_diffusion | hybrid_8      |     0.00328676 |       0.00292823 |           0.00286933 |
| reaction_diffusion | hybrid_16     |     0.00288951 |       0.00228035 |           0.0021641  |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| burgers            |         0.0652976   |            0.0254748   |                    9.41849e-05 |
| heat               |         0.022775    |            0.00873014  |                    7.91801e-05 |
| reaction_diffusion |         7.01175e-05 |            3.45083e-05 |                    4.40111e-05 |
| wave               |         0.0765619   |            0.0152984   |                    0.000213577 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.