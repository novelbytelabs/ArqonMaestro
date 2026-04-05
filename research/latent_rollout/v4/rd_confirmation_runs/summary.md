# Reaction-Diffusion Confirmation Campaign Summary

- Total runs planned: **45**
- Successful runs: **45**
- Failed runs: **0**

## Crossover counts
- hybrid_16 beats latent in **28/45** runs
- hybrid_8 beats latent in **16/45** runs

## Top candidate runs
- `rd_seed13_ld32_rl112`: best=hybrid_8, latent=0.008165, hybrid_16=0.004832, margin(latent-h16)=0.003332
- `rd_seed11_ld24_rl112`: best=hybrid_16, latent=0.007189, hybrid_16=0.004130, margin(latent-h16)=0.003059
- `rd_seed13_ld20_rl112`: best=hybrid_16, latent=0.007056, hybrid_16=0.004026, margin(latent-h16)=0.003031
- `rd_seed13_ld32_rl96`: best=hybrid_16, latent=0.004991, hybrid_16=0.002521, margin(latent-h16)=0.002470
- `rd_seed7_ld24_rl112`: best=hybrid_16, latent=0.006167, hybrid_16=0.003863, margin(latent-h16)=0.002305
- `rd_seed11_ld16_rl112`: best=hybrid_8, latent=0.006796, hybrid_16=0.004633, margin(latent-h16)=0.002163
- `rd_seed7_ld20_rl112`: best=hybrid_16, latent=0.007433, hybrid_16=0.005317, margin(latent-h16)=0.002116
- `rd_seed11_ld32_rl96`: best=hybrid_16, latent=0.004777, hybrid_16=0.002902, margin(latent-h16)=0.001875
- `rd_seed7_ld16_rl112`: best=hybrid_16, latent=0.007263, hybrid_16=0.005466, margin(latent-h16)=0.001797
- `rd_seed7_ld28_rl112`: best=hybrid_16, latent=0.006141, hybrid_16=0.004613, margin(latent-h16)=0.001527

## Highest decode-damage regimes (mean latent_damage_mse)
- latent_dim=16, rollout_len=96: latent_damage_mse=0.000526
- latent_dim=20, rollout_len=80: latent_damage_mse=0.000137
- latent_dim=16, rollout_len=112: latent_damage_mse=0.000128
- latent_dim=24, rollout_len=80: latent_damage_mse=0.000116
- latent_dim=20, rollout_len=112: latent_damage_mse=0.000108
- latent_dim=20, rollout_len=96: latent_damage_mse=0.000101
- latent_dim=32, rollout_len=96: latent_damage_mse=0.000096
- latent_dim=32, rollout_len=112: latent_damage_mse=0.000078
- latent_dim=28, rollout_len=112: latent_damage_mse=0.000063
- latent_dim=28, rollout_len=96: latent_damage_mse=0.000062

## Interpretation
- If hybrid_16 repeatedly beats latent, reaction-diffusion is a real grounded-correction regime.
- If hybrid only ties latent in tiny margins, the main discovery still belongs to latent-first rollout.
- If the winning pockets cluster by rollout length or latent dimension, that tells us where crossover lives.