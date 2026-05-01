# Hypothesis

## Primary hypothesis

Explicit RAIL-based AI (delta -> state -> governed deterministic action) delivers better control reliability, lower action latency, and higher auditability than black-box probabilistic pipelines in structured domains.

## Secondary hypothesis

Probabilistic computation can be confined to bounded perception modules without sacrificing overall system capability for structured tasks.

## Falsification criteria

The hypothesis is falsified if the RAIL system fails to beat baseline on both:

1. safety-critical action reliability
2. p95 action latency

while also failing parity on task success rate.

