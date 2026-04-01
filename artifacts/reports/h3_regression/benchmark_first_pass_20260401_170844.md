# H3 Benchmark First Pass (benchmark_first_pass_20260401_170844)

Source: `artifacts/reports/h24_policy_proofs`

## Bucket Summary
| Bucket | Count | Avg stable (ms) | Avg granted (ms) | Avg endpoint (ms) | Avg execution (ms) | All granted | Gate match |
|---|---:|---:|---:|---:|---:|---|---|
| reflex | 1 | 40.0 | 40.0 | 40.0 | 45.0 | true | true |
| closed_structure | 2 | 70.0 | 70.0 | 90.0 | 95.0 | true | true |
| parameterized | 2 | 100.0 | 140.0 | 180.0 | 185.0 | true | true |

## Per-Artifact
- closed-focus-chrome-001.json: class=closed_structure, execution=125ms, granted=true
- closed-new-tab-001.json: class=closed_structure, execution=65ms, granted=true
- param-goto-line-001.json: class=parameterized_numeric, execution=205ms, granted=true
- param-goto-wikipedia-001.json: class=parameterized_open, execution=165ms, granted=true
- reflex-pause-001.json: class=reflex, execution=45ms, granted=true

## Notes
- This first pass uses proof artifacts (replay/recorded evidence), not a fresh live-mic run.
- Suitable for Stage 2.5 stabilization trend tracking; follow-up live benchmark pass remains recommended.
