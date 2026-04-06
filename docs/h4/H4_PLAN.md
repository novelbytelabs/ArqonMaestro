# H4 Plan

## Status

- H4-S1: implemented and green
- H4-S2: implemented and green
- H4-S3: implemented and green
- H4-S4: prepared as the next broad runtime authority expansion slice
- H4-S5: next after H4-S4
- H4-S6: closure / validation / freeze

## H4-S4 mission

Expand the new authority path across the broader runtime surfaces that must trust it to behave as the real system.

Core scope:

- broader runtime authority expansion
- explicit integration across:
  - workflow candidate discovery
  - skeleton inference
  - scoring
  - rubrics
  - promotion
  - draft preview surfaces
- preserve explicit fallback-only surfaces where expansion is not yet active

Must not do:

- no live-use hardening yet
- no UX/UI work
- no execution semantics

Exit condition:

H4-S4 is complete only when the new path is explicitly authoritative not just at mic entry and the command-lane decision spine, but across the broader H3/3J runtime surfaces.
