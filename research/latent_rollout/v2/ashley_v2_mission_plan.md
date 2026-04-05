# Ashley Latent Dynamics Mission Plan (v2)

## Objective
Turn the first successful proxy replication into a stronger external contribution that Ashley can actually use.

## What is already supported by evidence
- Latent rollout massively outperforms repeated state extraction.
- Wave-like dynamics are especially fragile under grounding.
- Small latent branching can improve results slightly.

## What still needs to be proven
- Whether hybrid rollout can beat pure latent on some systems.
- Whether multi-horizon latent training is the missing ingredient for that win.
- Whether decode-damage can be isolated and measured as a first-class failure mode.

## v2 harness additions
- Multi-horizon latent training:
    - 1-step
    - 2-step
    - 4-step
    - 8-step
- Additional systems:
    - heat
    - wave
    - Burgers
    - reaction-diffusion
- Rollout modes:
    - latent
    - state
    - latent branch
    - hybrid with interval sweep
- New diagnostic:
    - decode-damage metric

## Key hypotheses
### H1
Repeated decode -> re-encode causes a measurable damage signal even when the latent trajectory itself is stable.

### H2
Wave-like systems will show higher decode-damage than dissipative systems.

### H3
Hybrid rollout will only beat pure latent when the system benefits from periodic grounding and the interval is tuned correctly.

### H4
Multi-horizon latent training should improve long-horizon stability enough to make hybrid competitive on at least some dissipative systems.

## Deliverables to send Ashley
- results.csv
- decode_damage_all_systems.csv
- per-system decode_damage.csv
- rollout comparison plots
- decode-damage plots
- summary.md

## Highest-value next upgrades after v2
### 1. Selector experiment
Train a selector on long-horizon weighted loss rather than short-horizon error.

### 2. Interval search
Perform a denser sweep over grounding intervals.

### 3. Latent planner
Branch multiple latent futures and choose by consistency/stability score.

### 4. Decode-damage paper metric
Formalize grounding damage as a metric independent of transition-model quality.

## Suggested message to Ashley after v2
I independently reproduced the core extraction-damage effect and extended the harness with multiple systems, multi-horizon latent training, and a decode-damage diagnostic. The latent-vs-state gap remains strong, wave remains grounding-sensitive, and I am now testing whether multi-horizon training is the missing ingredient behind hybrid wins on dissipative systems.
