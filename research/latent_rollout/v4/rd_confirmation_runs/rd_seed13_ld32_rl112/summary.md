# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 13,
  "device": "cpu",
  "outdir": "rd_confirmation_runs/rd_seed13_ld32_rl112",
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

- ae_best_val_mse: 0.001532
- dyn_best_val_latent_mse: 0.000069

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| reaction_diffusion | latent        |     0.00816459 |       0.0198115  |            0.0243009 |
| reaction_diffusion | state         |     0.592684   |       1.5366     |            1.67937   |
| reaction_diffusion | latent_branch |     0.0112535  |       0.0261557  |            0.0327659 |
| reaction_diffusion | hybrid_2      |     0.0701706  |       0.263      |            0.437582  |
| reaction_diffusion | hybrid_4      |     0.00532642 |       0.0116057  |            0.0145437 |
| reaction_diffusion | hybrid_8      |     0.00450255 |       0.00929848 |            0.0111519 |
| reaction_diffusion | hybrid_16     |     0.00483247 |       0.0102719  |            0.0123905 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| reaction_diffusion |         0.000100341 |            4.18823e-05 |                     3.0894e-05 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.