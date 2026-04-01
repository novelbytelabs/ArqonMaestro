# H3 Stage 2 Benchmark Note

## First Pass (Stage 2.5)

Date: 2026-04-01  
Method: replay-backed benchmark from frozen H24 proof artifacts  
Source: `artifacts/reports/h24_policy_proofs`

Generated artifacts:
- `artifacts/reports/h3_regression/benchmark_first_pass_20260401_170844.json`
- `artifacts/reports/h3_regression/benchmark_first_pass_20260401_170844.md`

## Bucket Results

| Bucket | Count | Avg stable (ms) | Avg granted (ms) | Avg endpoint (ms) | Avg execution (ms) | All granted | Gate match |
|---|---:|---:|---:|---:|---:|---|---|
| reflex | 1 | 40.0 | 40.0 | 40.0 | 45.0 | true | true |
| closed_structure | 2 | 70.0 | 70.0 | 90.0 | 95.0 | true | true |
| parameterized | 2 | 100.0 | 140.0 | 180.0 | 185.0 | true | true |

Per-artifact execution latency:
- `closed-focus-chrome-001.json`: 125ms
- `closed-new-tab-001.json`: 65ms
- `param-goto-line-001.json`: 205ms
- `param-goto-wikipedia-001.json`: 165ms
- `reflex-pause-001.json`: 45ms

## Interpretation

- Reflex and closed-structure paths are materially faster than parameterized paths, as expected.
- Parameterized commands show additional latency attributable to endpoint/tail completion.
- All benchmarked artifacts remained policy-granted and matched recommended execution gate.

## Limits

- This first pass is replay-backed and not a fresh live-microphone benchmark run.
- A live benchmark pass remains required to capture transport/runtime overhead fully.
