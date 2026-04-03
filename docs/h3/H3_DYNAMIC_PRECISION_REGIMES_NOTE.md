# H3_DYNAMIC_PRECISION_REGIMES_NOTE

Date:
April 3, 2026

Status:
Concept note for implementation and product alignment

Purpose:
Explain what Turbo / Tight / Ultra really are, what they are not, and how they should evolve.

## What these regimes are

Turbo / Tight / Ultra are not just user-facing labels.
They are internal precision-control regimes that determine how much budget, depth, and bounded interpretation effort the recognizer is allowed to spend.

## What these regimes are not

They are not:
- execution authority levels
- safety classes
- marketing-only settings
- hidden “smart mode” behaviors outside governance

## Desired behavior

The system should:
- start in the cheapest reasonable regime
- escalate when ambiguity, instability, or stress requires it
- de-escalate when conditions stabilize
- keep every transition visible in evidence

## Regime intuition

### Turbo
Use when:
- command is stable
- evidence is clean
- family is simple / structured
- speed matters more than added depth

### Tight
Use when:
- moderate ambiguity exists
- additional bounded scoring depth is warranted
- numeric or mid-complexity behavior needs more care

### Ultra
Use when:
- ambiguity is persistent
- open-tail behavior is complex
- repair / guardrail signals suggest more careful accumulation

## Key engineering rule

Regime switching is about bounded recognition effort.
It is not permission to act.

## Key product rule

If user-facing labels are ever exposed, they must map honestly to the runtime reality.
No fake “Ultra” branding without real runtime difference.

## Key documentation rule

Every implemented regime transition must document:
- when it can occur
- why it occurs
- what evidence fields it emits
- what it still may not do
