# Ashley Latent Rollout Replication Summary (v2)

## Configuration

```json
{
  "seed": 7,
  "device": "cpu",
  "outdir": "mission_runs/single_horizon_ablation",
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
  "multi_horizon": false,
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
- dyn_best_val_latent_mse: 0.000063

### wave

- ae_best_val_mse: 0.086789
- dyn_best_val_latent_mse: 0.000236

### burgers

- ae_best_val_mse: 0.071678
- dyn_best_val_latent_mse: 0.000088

### reaction_diffusion

- ae_best_val_mse: 0.001429
- dyn_best_val_latent_mse: 0.000001

## Rollout results

| system             | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:-------------------|:--------------|---------------:|-----------------:|---------------------:|
| heat               | latent        |     0.0800518  |       0.0883829  |           0.0968536  |
| heat               | state         |     4.74986    |      11.3393     |          17.8366     |
| heat               | latent_branch |     0.079637   |       0.0874714  |           0.0954873  |
| heat               | hybrid_2      |     1.01104    |       2.1208     |           2.88765    |
| heat               | hybrid_4      |     0.343467   |       0.59835    |           0.734664   |
| heat               | hybrid_8      |     0.180115   |       0.270427   |           0.291355   |
| heat               | hybrid_16     |     0.118896   |       0.16436    |           0.162132   |
| wave               | latent        |     0.228761   |       0.278205   |           0.315647   |
| wave               | state         |     2.30997    |       4.21292    |           5.51662    |
| wave               | latent_branch |     0.226265   |       0.272707   |           0.3068     |
| wave               | hybrid_2      |     1.00778    |       1.71821    |           2.07539    |
| wave               | hybrid_4      |     0.524193   |       0.801904   |           0.908283   |
| wave               | hybrid_8      |     0.346775   |       0.487614   |           0.537331   |
| wave               | hybrid_16     |     0.269384   |       0.354534   |           0.377962   |
| burgers            | latent        |     0.0871672  |       0.11789    |           0.145231   |
| burgers            | state         |    35.9526     |      96.2751     |         180.201      |
| burgers            | latent_branch |     0.0861668  |       0.11565    |           0.141734   |
| burgers            | hybrid_2      |     2.32844    |       5.51262    |           9.26529    |
| burgers            | hybrid_4      |     0.480901   |       0.924601   |           1.21437    |
| burgers            | hybrid_8      |     0.211585   |       0.351358   |           0.407248   |
| burgers            | hybrid_16     |     0.130982   |       0.203729   |           0.221606   |
| reaction_diffusion | latent        |     0.00275092 |       0.00195223 |           0.00185694 |
| reaction_diffusion | state         |     0.00388875 |       0.00341674 |           0.00342045 |
| reaction_diffusion | latent_branch |     0.00332196 |       0.00283078 |           0.00274487 |
| reaction_diffusion | hybrid_2      |     0.00300725 |       0.00227226 |           0.00219742 |
| reaction_diffusion | hybrid_4      |     0.00280774 |       0.00201241 |           0.00191696 |
| reaction_diffusion | hybrid_8      |     0.00275854 |       0.00195268 |           0.00185302 |
| reaction_diffusion | hybrid_16     |     0.00274943 |       0.00194428 |           0.00184273 |

## Decode-damage summary

| system             |   latent_damage_mse |   state_damage_rel_mse |   direct_ground_damage_rel_mse |
|:-------------------|--------------------:|-----------------------:|-------------------------------:|
| burgers            |         0.044669    |            0.0110426   |                    0.000123468 |
| heat               |         0.0243219   |            0.0065497   |                    0.000104577 |
| reaction_diffusion |         1.36843e-05 |            7.18103e-06 |                    3.7985e-05  |
| wave               |         0.0334019   |            0.00915775  |                    0.000320603 |

## Interpretation checklist

- If latent << state, extraction is destructive.
- If hybrid beats latent on some systems, selective grounding can help.
- If wave is especially grounding-sensitive, phase-sensitive dynamics are fragile under state projection.
- If branch helps a little, the latent path is already close and benefits from tiny corrections.