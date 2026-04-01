# H3 Stage 3B2A Validation

Date: 2026-04-01
Scope: `go to <target>` open-tail specialization only
Environment: `helios-gpu-118` for toolchain commands

## Build/Test Checks

- `cd maestro/client && npx tsc --noEmit` : pass
- `npx jest --config jest.config.js --runInBand src/test/audio/open-tail-normalizer.unit.spec.ts` : pass
- `npx jest --config jest.config.js --runInBand src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts` : pass
- Numeric regression guard:
  - `src/test/audio/numeric-tail-normalizer.unit.spec.ts` : pass
  - `src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts` : pass

## Open-Tail Normalization Matrix (`go to <target>`)

Validated outcomes:

- `go to wikipedia` -> ok, `text`, merged `go to wikipedia`
- `go to wikipedia.org` -> ok, `domain`, merged `go to wikipedia.org`
- `go to docs python` -> ok, `text`, merged `go to docs python`
- `go to github dot com` -> ok, `domain`, merged `go to github.com`
- `go to stack overflow` -> ok, `text`, merged `go to stack overflow`
- `go to open ai docs` -> ok, `text`, merged `go to open ai docs`
- `go to wikipedia dot org` -> ok, `domain`, merged `go to wikipedia.org`
- `go to github.com` -> ok, `domain`, merged `go to github.com`
- `go to developer dot mozilla dot org` -> ok, `domain`, merged `go to developer.mozilla.org`
- `go to bbc dot co dot uk` -> ok, `domain`, merged `go to bbc.co.uk`

Guardrail outcomes:

- `go to` -> empty, rejected
- `go to uh` -> invalid, rejected
- `go to maybe` -> invalid, rejected
- `go to and` -> invalid, rejected

## Required Explicit Rejection Case

Unit validation confirms this chain for an atlas-backed `go to` event:

1. geometric prefix activates route (`geometric_prefix_asr_tail`)
2. open-tail strategy arms (`open_tail_strategy_selected`)
3. malformed tail (`maybe`) is rejected (`open_tail_rejected`)
4. no executable merged target is emitted (`merged_transcript_emitted` not emitted)

## Scope/Compatibility Guard

- Stage 3A geometric activation logic unchanged
- Numeric-tail behavior unaffected (regression tests pass)
- Scope limited to `go to <target>` only
- No Stage 3B2 broadening, no optimization work
