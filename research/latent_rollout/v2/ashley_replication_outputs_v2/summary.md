# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 42,
  "device": "cpu",
  "outdir": "ashley_replication_outputs_v2",
  "systems": [
    "heat",
    "wave",
    "burgers",
    "reaction_diffusion"
  ],
  "n_train": 64,
  "n_val": 16,
  "n_test": 16,
  "grid_size": 64,
  "rollout_len": 48,
  "dt": 0.03,
  "latent_dim": 24,
  "hidden_dim": 160,
  "ae_epochs": 3,
  "dyn_epochs": 3,
  "batch_size": 16,
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

- ae_best_val_mse: 0.126545
- dyn_best_val_latent_mse: 0.003980

### wave

- ae_best_val_mse: 0.159948
- dyn_best_val_latent_mse: 0.009776

### burgers

- ae_best_val_mse: 0.210858
- dyn_best_val_latent_mse: 0.008288

### reaction_diffusion

- ae_best_val_mse: 0.001475
- dyn_best_val_latent_mse: 0.000003

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| heat               | latent        |     0.207476   |       0.220523   |           0.23404    |
| heat               | state         |     1.30194    |       2.08863    |           2.7533     |
| heat               | latent_branch |     0.206623   |       0.21785    |           0.229911   |
| heat               | hybrid_2      |     0.802337   |       1.24316    |           1.42181    |
| heat               | hybrid_4      |     0.50756    |       0.726855   |           0.812032   |
| heat               | hybrid_8      |     0.359628   |       0.477624   |           0.501407   |
| heat               | hybrid_16     |     0.276261   |       0.35227    |           0.350537   |
| wave               | latent        |     0.318382   |       0.385217   |           0.436749   |
| wave               | state         |     1.47399    |       2.11517    |           2.29474    |
| wave               | latent_branch |     0.314935   |       0.377477   |           0.425148   |
| wave               | hybrid_2      |     0.966884   |       1.44502    |           1.58325    |
| wave               | hybrid_4      |     0.640881   |       0.931812   |           1.05087    |
| wave               | hybrid_8      |     0.46456    |       0.637972   |           0.70147    |
| wave               | hybrid_16     |     0.373657   |       0.490468   |           0.528511   |
| burgers            | latent        |     0.223847   |       0.249721   |           0.267396   |
| burgers            | state         |     2.36472    |       4.68792    |           6.33291    |
| burgers            | latent_branch |     0.22334    |       0.248342   |           0.2649     |
| burgers            | hybrid_2      |     0.905927   |       1.43832    |           1.70666    |
| burgers            | hybrid_4      |     0.543904   |       0.800763   |           0.899446   |
| burgers            | hybrid_8      |     0.373687   |       0.50985    |           0.545375   |
| burgers            | hybrid_16     |     0.290045   |       0.376973   |           0.386278   |
| reaction_diffusion | latent        |     0.00281812 |       0.00208847 |           0.00202681 |
| reaction_diffusion | state         |     0.00292697 |       0.00223682 |           0.00238401 |
| reaction_diffusion | latent_branch |     0.00347482 |       0.00310372 |           0.00324998 |
| reaction_diffusion | hybrid_2      |     0.0028459  |       0.00212127 |           0.00210356 |
| reaction_diffusion | hybrid_4      |     0.00282233 |       0.00208746 |           0.00203556 |
| reaction_diffusion | hybrid_8      |     0.00281535 |       0.00207816 |           0.00201346 |
| reaction_diffusion | hybrid_16     |     0.00281354 |       0.00207823 |           0.00200785 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| burgers            |         0.0246328   |            0.0060911   |                    0.000159642 |
| heat               |         0.0215993   |            0.00841057  |                    0.00011665  |
| reaction_diffusion |         9.91701e-06 |            5.43652e-06 |                    3.76208e-05 |
| wave               |         0.0296357   |            0.00769287  |                    0.000279063 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.