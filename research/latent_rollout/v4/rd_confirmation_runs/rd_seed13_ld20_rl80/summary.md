# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 13,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed13_ld20_rl80",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 80,
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

- ae_best_val_mse: 0.001588
- dyn_best_val_latent_mse: 0.000018

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00245712 |       0.00241773 |           0.00273977 |
| reaction_diffusion | state         |     0.0879205  |       0.0895139  |           0.0781705  |
| reaction_diffusion | latent_branch |     0.00420551 |       0.00399801 |           0.00398126 |
| reaction_diffusion | hybrid_2      |     0.0186697  |       0.0177768  |           0.0157907  |
| reaction_diffusion | hybrid_4      |     0.00649153 |       0.00622136 |           0.00582075 |
| reaction_diffusion | hybrid_8      |     0.00368462 |       0.00362326 |           0.00368793 |
| reaction_diffusion | hybrid_16     |     0.00288901 |       0.00289145 |           0.00311399 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         0.000348826 |             0.00021389 |                    5.85944e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.