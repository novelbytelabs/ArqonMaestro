# Experiment Plan (v0)

## Baselines

1. End-to-end black-box model baseline
2. Transcript-first modular baseline

## Candidate system

- Explicit RAIL architecture (this project)

## Test suites

1. Structured command suite
2. Interrupt/safety suite
3. Ambiguity/near-miss suite
4. Noise/robustness suite
5. Replay determinism suite

## Protocol

- same hardware
- same input corpus
- same policy constraints
- multiple seeds for probabilistic baselines

## Output artifacts

- per-run trace logs
- deterministic replay diff report
- latency/safety summary
- failure taxonomy

