# H3 Regression Plan

## Minimum Required Cases
1. Reflex positive: `pause`
2. Closed-structure positive: `focus chrome` (or `new tab`)
3. Parameterized positive: `go to line fifty two`
4. Parameterized positive: `go to wikipedia dot org`
5. Negative/noise case: unrelated speech
6. Near-miss case: acoustically similar non-command phrase
7. H3-off safety: verify baseline behavior with `H3_GEOMETRIC_ENABLED=false`

## Layers
- Proof replay layer
- Sidecar/provider evidence layer
- Live runtime smoke layer

## Entry Point
- `scripts/h3_regression.sh`
- Run: `./scripts/h3_regression.sh`
- Output: `artifacts/reports/h3_regression/run_<timestamp>/`

## Output Directory
- `artifacts/reports/h3_regression/`
