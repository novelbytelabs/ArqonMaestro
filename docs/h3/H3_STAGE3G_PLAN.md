
# H3 Stage 3G Plan

Stage 3G introduces **Counterfactual + Repair Intelligence** on top of the closed Stage 3F multi-resolution atlas band.

## Doctrine
- observational/advisory first
- no authorization path from counterfactual or repair signals
- live geometric evidence remains dominant
- no H23/H24 bypass
- no Stage 3A activation drift
- no persistence/distributed cache
- no Turbo/Tight/Ultra
- v1 only

## S1 — Observational contract (implemented)
- add `counterfactual-repair-intelligence.ts`
- derive nearest-alternative and repair-signal fields from current merged command evidence
- emit advisory counterfactual/repair metadata through H3 runtime evidence
- no lookup/ranking/authority changes

## S2 — Next
- bounded nearest-alternative ambiguity pilot
- still advisory-only
- no repair actuation yet
