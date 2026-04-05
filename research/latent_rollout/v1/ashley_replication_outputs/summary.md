# Ashley Latent Rollout Replication Summary

## Configuration

```json
{
  "seed": 42,
  "device": "cpu",
  "outdir": "./ashley_replication_outputs",
  "systems": [
    "heat",
    "wave"
  ],
  "n_train": 256,
  "n_val": 64,
  "n_test": 64,
  "grid_size": 64,
  "rollout_len": 48,
  "dt": 0.05,
  "latent_dim": 16,
  "hidden_dim": 128,
  "batch_size": 64,
  "ae_epochs": 10,
  "dyn_epochs": 15,
  "lr": 0.001,
  "multi_horizon": true,
  "horizons": [
    1,
    2,
    4,
    8
  ],
  "hybrid_intervals": [
    4,
    8,
    16
  ],
  "branch_candidates": 5,
  "branch_noise": 0.01,
  "grounding_quantize_levels": 128,
  "grounding_blur_alpha": 0.08
}
```

## Training logs

### heat

- ae_best_val_mse: 0.004214
- dyn_best_val_latent_mse: 0.000145

### wave

- ae_best_val_mse: 0.043718
- dyn_best_val_latent_mse: 0.004622

## Results

| system   | strategy      |   full_rel_mse |   tail16_rel_mse |   final_step_rel_mse |
|:---------|:--------------|---------------:|-----------------:|---------------------:|
| heat     | latent        |     0.00766525 |       0.00865128 |           0.00936552 |
| heat     | state         |     2.02897    |       3.88273    |           4.23202    |
| heat     | latent_branch |     0.00761953 |       0.00860039 |           0.00932001 |
| heat     | hybrid_4      |     0.143558   |       0.305952   |           0.3988     |
| heat     | hybrid_8      |     0.0440794  |       0.0820555  |           0.0915298  |
| heat     | hybrid_16     |     0.018715   |       0.0324099  |           0.0316657  |
| wave     | latent        |     0.124133   |       0.167772   |           0.194844   |
| wave     | state         |    21.5441     |      48.5841     |          84.7448     |
| wave     | latent_branch |     0.120978   |       0.161612   |           0.187177   |
| wave     | hybrid_4      |     0.593156   |       1.10213    |           1.42312    |
| wave     | hybrid_8      |     0.241405   |       0.385819   |           0.442984   |
| wave     | hybrid_16     |     0.156611   |       0.229818   |           0.253482   |

## Suggested extensions
- Add Burgers and reaction-diffusion
- Add adaptive selector trained on long-horizon loss
- Add latent planner
- Add decode-damage diagnostic
