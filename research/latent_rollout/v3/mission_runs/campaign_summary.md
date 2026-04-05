# Ashley Mission Campaign Summary
## Why this campaign exists
This campaign is designed to answer three decisive questions:
1. Is multi-horizon latent training a major source of the observed stability?
2. Is there any real crossover regime where hybrid beats pure latent?
3. Which systems show the strongest decode-damage signature?

## Best crossover candidates found
| System | Best strategy seen | Best full_rel_mse | Experiment |
|---|---:|---:|---|
| burgers | latent_branch | 0.07110229134559631 | crossover_burgers_ld24_rl48 |
| heat | latent | 0.05040767043828964 | late_ground_proxy_heat |
| reaction_diffusion | hybrid_16 | 0.0021830759942531586 | crossover_reaction_diffusion_ld24_rl80 |
| wave | latent_branch | 0.22626540064811707 | single_horizon_ablation |

## Decode-damage highlights
Use aggregate_decode_damage.csv to rank systems by latent damage and grounding sensitivity.

## Interpretation guardrails
- If hybrid never beats latent, then grounding may be mostly a compensatory patch rather than the final answer.
- If single-horizon performs much worse than multi-horizon, then long-horizon training is a primary stabilizer.
- If wave stays the most fragile, that supports the phase-sensitive damage hypothesis.

## Output files
- manifest.csv
- aggregate_results.csv
- aggregate_decode_damage.csv
- this summary
