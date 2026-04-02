# H3 Stage 3B2B Validation

Date: 2026-04-01
Scope: `open <target>` open-tail specialization only
Environment: `helios-gpu-118` for toolchain commands

## Build/Test Checks

- `cd maestro/client && npx tsc --noEmit` : pass
- `python3 -m py_compile maestro/client/src/main/stt/sidecars/parakeet_sidecar.py` : pass
- `npx jest --config jest.config.js --runInBand src/test/audio/open-tail-normalizer.unit.spec.ts` : pass
- `npx jest --config jest.config.js --runInBand src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts` : pass
- Numeric / prior-lane guard checks:
  - `src/test/audio/numeric-tail-normalizer.unit.spec.ts` : pass
  - `src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts` : pass

## Validation Target Categories

Two internal validation categories were enforced:

1. app/site-name targets
- examples: `open chrome`, `open settings`, `open stack overflow`, `open open ai docs`

2. domain-like targets
- examples: `open wikipedia dot org`, `open github.com`, `open developer dot mozilla dot org`

## Open-Tail Strategy Outcomes (`open <target>`)

Success examples:
- `open github dot com` -> normalized `open github.com`
- `open wikipedia.org` -> normalized `open wikipedia.org`
- `open stack overflow` -> normalized `open stack overflow`

Required rejection examples:
- text-kind rejection: `open stack over` -> `open_tail_rejected`, non-executable
- text-kind rejection: `open set things` -> `open_tail_rejected`, non-executable
- domain-kind rejection: `open github dot` -> `open_tail_rejected`, non-executable
- empty/filler/connector: `open`, `open uh`, `open and` -> rejected

## Explicit Rejection Proofs By Target Kind

1. App/site-name (text-kind) rejection proof
- geometric prefix activates (`regionId=open`)
- strategy arms (`open_tail_strategy_selected`)
- ambiguous app-like tail rejected (`open_tail_rejected`, `openTargetKind=text`)
- no `merged_transcript_emitted`
- no executable dispatch

2. Domain-like rejection proof
- geometric prefix activates (`regionId=open`)
- strategy arms (`open_tail_strategy_selected`)
- malformed domain-like tail rejected (`open_tail_rejected`, `openTargetKind=domain`)
- no `merged_transcript_emitted`
- no executable dispatch

## Conservative Domain Normalization Check

Domain normalization to dotted form is applied only when clearly domain-like:
- `open github dot com` -> `open github.com` (normalized)
- non-domain text remains text:
  - `open docs python` stays text-like and is not forced into dotted-domain form

## Compatibility Guard

Verified unchanged behavior:
- Stage 3A geometric activation logic unchanged
- `go to <target>` open-tail lane remains intact
- numeric-tail lane (`go to line <n>`) remains intact
- H3-off fallback path behavior unchanged by this slice

## Files Exercised By Validation

- `maestro/client/src/main/stream/open-tail-normalizer.ts`
- `maestro/client/src/main/stream/chunk-manager.ts`
- `maestro/client/src/main/runtime/h3-geometric-command-governor.ts`
- `maestro/client/src/main/stt/sidecars/parakeet_sidecar.py`
- `maestro/client/src/test/audio/open-tail-normalizer.unit.spec.ts`
- `maestro/client/src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts`
- `maestro/client/src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts`
