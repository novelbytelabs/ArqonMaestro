# H3 Regression Run run_20260401_170946

Status: **PASS**

## Passed Checks
- [x] reflex positive: reflex-pause-001 granted=true
- [x] closed-structure positive (focus chrome): closed-focus-chrome-001 granted=true
- [x] closed-structure positive (new tab): closed-new-tab-001 granted=true
- [x] parameterized positive (line): param-goto-line-001 granted=true
- [x] parameterized positive (url): param-goto-wikipedia-001 granted=true
- [x] negative/noise case: negative-noise-001 finalGranted=false
- [x] near-miss non-trigger case: near-miss-001 finalGranted=false
- [x] H3-off safety guard: chunk-manager has H3 disabled guard
- [x] H3-off route baseline: chunk start resets to legacy_text
- [x] evidence instrumentation: geometric_event_emitted: provider emits event
- [x] evidence instrumentation: geometric_event_received: provider emits event
- [x] evidence instrumentation: route_activation: chunk manager emits event
- [x] evidence instrumentation: tail_capture_started: chunk manager emits event
- [x] evidence instrumentation: tail_capture_completed: chunk manager emits event
- [x] evidence instrumentation: tail_decode_started: chunk manager emits event
- [x] evidence instrumentation: tail_decode_completed: chunk manager emits event
- [x] evidence instrumentation: merged_transcript_emitted: chunk manager emits event
- [x] evidence instrumentation: h23_trace_written: H23 recorder emits event
- [x] evidence instrumentation: h24_proof_written: H24 recorder emits event

## Failed Checks
- none

## Outputs
- h3 replay: `/home/irbsurfer/Projects/arqon/ArqonMaestro/artifacts/reports/h3_regression/run_20260401_170946/h3_proof_replay.json`
- h24 replay dir: `/home/irbsurfer/Projects/arqon/ArqonMaestro/artifacts/reports/h3_regression/run_20260401_170946/h24_replay`
- machine results: `/home/irbsurfer/Projects/arqon/ArqonMaestro/artifacts/reports/h3_regression/run_20260401_170946/regression_results.json`
