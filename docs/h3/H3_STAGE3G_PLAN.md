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

## S1.5 — RSI/Lazarus observability hardening (implemented)
- surface bounded RSI-style candidate-population metadata with normalized scores
- add deterministic observational Selection Function contract for counterfactual winner selection
- add Lazarus DEAD-style restart/reversal detection evidence
- add failure-observer counterexample-capture and antibody-placeholder metadata
- add metabolic/Ouroboros-aligned stress and repair evidence fields
- still observational/advisory only; no repair actuation, no authority change

## S2 — Bounded nearest-alternative ambiguity pilot (implemented)
- derive bounded ambiguity pilot metadata from the top-2 counterfactual population gap
- suggest advisory ambiguity escalation only when the nearest alternative is close enough
- surface `hold_for_tail` vs `request_disambiguation` as observational guidance only
- no lookup authority change, no repair actuation, no execution shortcut

## S3 — Next
- bounded repair-signal pilot
- advisory-only repair trajectory shaping
- no repair actuation yet
