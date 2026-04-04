# H3 Waveform->Delta Shadow Eval Runbook

Purpose: prove the new H3 system is deriving meaningful delta signals from live waveform traffic without changing execution authority.

## Doctrine lock for this run
- Measurement run only (no cutover)
- Keep authority unchanged
- No H23/H24 bypass
- No macro execution/chaining

## Evidence path
Primary path used by current desktop runtime:
- `maestro/client/artifacts/reports/h3_runtime_evidence/events.ndjson`

Fallback path (if runtime working directory differs):
- `artifacts/reports/h3_runtime_evidence/events.ndjson`

## Step 1: Prep
1. Launch Maestro desktop normally.
2. Optional archive/rotate before a clean run:

```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro
if [ -f maestro/client/artifacts/reports/h3_runtime_evidence/events.ndjson ]; then
  ts=$(date +%Y%m%d_%H%M%S)
  mkdir -p maestro/client/artifacts/reports/h3_runtime_evidence/archive
  cp maestro/client/artifacts/reports/h3_runtime_evidence/events.ndjson \
    maestro/client/artifacts/reports/h3_runtime_evidence/archive/events_${ts}.ndjson
  : > maestro/client/artifacts/reports/h3_runtime_evidence/events.ndjson
fi
```

## Step 2: Live utterance set
Run these using your normal microphone flow:
1. Repeatable sequence test (3-5 loops)
- Example: `focus chrome` -> `open wikipedia.org`
- Expect workflow memory transition/repeat/reuse fields to rise over repetitions.

2. Ambiguity/repair test
- Example: `open wi... no, open wikipedia`
- Expect counterfactual/repair/dead/reversal signals.

3. Stress/hysteresis test
- Mix clean and noisy utterances and borderline phrasing.
- Expect dynamic precision observed/proposed/decision fields to vary while staying governed.

## Step 3: Analyze evidence
Run:

```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro
python3 scripts/h3_waveform_delta_shadow_eval.py
```

Output JSON is written to:
- `artifacts/reports/h3_shadow_eval/waveform_delta_shadow_eval.json`

## Step 4: Decision gate
Green enough for promotion planning when:
- required events present:
  - `voice_semantic_address_lookup_completed`
  - `merged_transcript_emitted`
- warm events present:
  - `voice_semantic_address_warm_hit|warm_miss|warm_applied|warm_discarded`
- signal families show non-null activity:
  - `counterfactualRepair*`
  - `dynamicPrecision*`
  - `workflowMemory*`
- doctrine checks remain clean:
  - no authority bypass indicator
  - no macro-like signal

If mostly null/noisy or pattern-insensitive, improve derivation quality before authority promotion.
