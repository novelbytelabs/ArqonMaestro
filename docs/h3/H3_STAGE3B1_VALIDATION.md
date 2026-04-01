# H3 Stage 3B1 Validation

Date: 2026-04-01
Scope: Numeric tail specialization only (`go to line <n>`)
Environment: `helios-gpu-118`

## Build/Test Checks

- `cd maestro/client && npx tsc --noEmit` : pass
- `npx jest --config jest.config.js --runInBand src/test/audio/numeric-tail-normalizer.unit.spec.ts` : pass
- `npx jest --config jest.config.js --runInBand src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts` : pass

## Numeric Command Validation Matrix

Command set run through numeric normalization utility:

- `go to line 1` -> `ok`, normalized `1`
- `go to line 9` -> `ok`, normalized `9`
- `go to line 10` -> `ok`, normalized `10`
- `go to line 52` -> `ok`, normalized `52`
- `go to line 100` -> `ok`, normalized `100`
- `go to line 243` -> `ok`, normalized `243`
- `go to line 1000` -> `ok`, normalized `1000`
- `go to line fifty two` -> `ok`, normalized `52`
- `go to line one hundred` -> `ok`, normalized `100`
- `go to line two hundred forty three` -> `ok`, normalized `243`
- `go to line one thousand` -> `ok`, normalized `1000`

Required partial/failure cases:

- `go to line one hun` -> `partial` (rejected)
- `go to line fifty uh two` -> `invalid` (rejected)
- `go to line two hundred and` -> `partial` (rejected)
- `go to line zero` -> `invalid` (rejected)

Policy constraints verified:

- empty numeric tails rejected
- `0` rejected
- negatives rejected

## Runtime Strategy/Evidence Validation

ChunkManager numeric-tail specialization unit checks verified:

- numeric strategy is selected only after atlas-backed geometric prefix conditions
- normalized merge emits canonical transcript (`go to line 52`)
- invalid/partial numeric tail blocks execute path
- numeric evidence includes required `numericStrategyVersion`

## Scope Guard

- Stage 3A geometric activation logic not changed
- Stage 3B2 open-tail specialization not started
- no Turbo/Tight/Ultra work included
