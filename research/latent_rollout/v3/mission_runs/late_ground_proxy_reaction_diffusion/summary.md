# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/late_ground_proxy_reaction_diffusion",
  "systems": [
    "reaction_diffusion"
  ],
  "n_train": 128,
  "n_val": 32,
  "n_test": 32,
  "grid_size": 64,
  "rollout_len": 96,
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

- ae_best_val_mse: 0.001275
- dyn_best_val_latent_mse: 0.000041

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00290898 |       0.00460631 |           0.00588818 |
| reaction_diffusion | state         |     0.00452856 |       0.00816431 |           0.0111621  |
| reaction_diffusion | latent_branch |     0.00412884 |       0.00604888 |           0.00746122 |
| reaction_diffusion | hybrid_2      |     0.00320774 |       0.00494452 |           0.00680995 |
| reaction_diffusion | hybrid_4      |     0.00263963 |       0.00339821 |           0.00424523 |
| reaction_diffusion | hybrid_8      |     0.0024693  |       0.00317868 |           0.0038698  |
| reaction_diffusion | hybrid_16     |     0.00242053 |       0.00329433 |           0.00407644 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |           6.501e-05 |            1.45064e-05 |                    3.44188e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.