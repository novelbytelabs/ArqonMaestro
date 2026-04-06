# H3 Stage 3J Issue: RAIL Delta Integration Validation

## Scope
This issue tracks whether live voice input is producing and using H3/RAIL deltas end-to-end (not just final transcript fallback), aligned with:

- `H3_STAGE3J_SPEC_11_DRAFT_AND_LIBRARY_API.md`
- `H3_STAGE3J_SPEC_12_VALIDATION_AND_CLOSURE.md`

## Problem Statement
The system can execute commands, but closure is blocked because runtime evidence often shows only `h23_trace_written` and misses required delta/warm evidence families.

Current eval result:
- status: `needs_more_data_or_fix`
- required events missing: `voice_semantic_address_lookup_completed`, `merged_transcript_emitted`
- warm events missing
- signal families missing: `counterfactualRepair`, `dynamicPrecision`, `workflowMemory`

## Implemented Stabilization (this pass)
In `maestro/client/src/main/stream/chunk-manager.ts`:

1. Added lazy Parakeet stream start threshold:
- `MAESTRO_PARAKEET_MIN_FRAMES_TO_START_STREAM` (default `12`)

2. Avoided websocket churn for tiny/noisy chunks:
- skip Parakeet finalize path for short chunks and fallback directly to endpoint replay

3. Reduced overlapping Parakeet lane contention:
- if a chunk transcription is already in-flight, new chunks do not select Parakeet lane

## Why This Matters for Spec 12
Spec 12 requires closure based on quality/judgment validation, not just execution. The above changes target the main instability that prevented reliable evidence capture in live runs.

## Validation Protocol (Required)
1. Build checks:
```bash
cd maestro/client
npx tsc -p tsconfig.json --noEmit
npm run -s build:main
```

2. Run client with geometric + Parakeet lane:
```bash
H3_GEOMETRIC_ENABLED=true \
MAESTRO_H3_GEOMETRIC_ACTIVATION_THRESHOLD_OVERRIDE=0.03 \
MAESTRO_H3_GEOMETRIC_TRACE_REJECTIONS=1 \
MAESTRO_ENABLE_PARAKEET_COMMAND_LANE=1 \
MAESTRO_FORCE_LEGACY_COMMAND_LANE=0 \
MAESTRO_MAX_AUDIO_FRAMES_PER_CHUNK=90 \
MAESTRO_PARAKEET_ENABLE_TEXT_PARTIALS=0 \
MAESTRO_PARAKEET_MIN_FRAMES_TO_START_STREAM=12 \
./scripts/run_client.sh
```

3. Speak validation scenarios:
- `go to line fifty three`
- `go to line fifty two`
- one rejected/noisy utterance
- one open-target utterance (for open tail path)

4. Evaluate evidence:
```bash
python3 scripts/h3_waveform_delta_shadow_eval.py
```

## Exit Criteria
This issue is resolved only when:

1. `h3_waveform_delta_shadow_eval.py` no longer reports `required_events_missing`
2. At least one warm event is present
3. At least one non-null signal appears in each family:
- `counterfactualRepair`
- `dynamicPrecision`
- `workflowMemory`
4. Command latency regression from websocket churn is materially reduced in live logs

## Notes
- Successful command execution alone does not close this issue.
- Closure requires evidence-level proof per Spec 12 truth standard.
