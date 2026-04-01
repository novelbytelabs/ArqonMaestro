# H3 Stage 2 Benchmark Note (Plan)

## Metrics
- time to first route activation
- time to execution dispatch
- time to merged final text (parameterized)
- reflex latency
- closed-structure latency
- parameterized latency

## Command Buckets
- reflex
- closed-structure
- parameterized

## Repro Guidance
- run in `helios-gpu-118`
- record feature flags and sidecar mode
- store raw runs in `artifacts/reports/h3_regression/`
