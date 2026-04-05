# PM AI Report — Stage 3J-S5 Apply (2026-04-04)

## Stage
- Stage: 3J-S5 only
- Repo: ArqonMaestro
- Branch: `feature/h3`
- Baseline head used: `80dda4d2c5cc4665931c1aaa55f87c181fa264d2`

## Applied bundle
- Zip: `/home/irbsurfer/Projects/arqon/ArqonMaestro/tmp/h3_stage3j_s5_bundle_20260404.zip`
- Applied bundle path: `/tmp/h3_stage3j_s5_apply_738719/h3j_s5_bundle`

## SHA256 verification
All 10 requested files matched exactly before Gate 1.

## Exact issue(s) found and fixed
1. `workflowCandidatePolicy*` and `workflowCandidateTiming*` fields were being derived in `chunk-manager` but not merged into the emitted H3 runtime evidence payload.
2. Existing promotion integration expectations (from S4 behavior) no longer matched S5 policy/timing-shaped promotion outcomes.

## Exact edited file(s) for fixes
- `maestro/client/src/main/stream/chunk-manager.ts`
  - Added missing emission merge mapping for all `workflowCandidatePolicy*` fields.
  - Added missing emission merge mapping for all `workflowCandidateTiming*` fields.
- `maestro/client/src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts`
  - Updated expected outcomes to align with S5 bounded policy/timing shaping.

## Validation gates
### Gate 1
Command:
```bash
cd maestro/client && npx tsc --noEmit
```
Exit: `0`

### Gate 2
Command:
```bash
cd maestro/client && npx jest --config jest.config.js --runInBand \
   src/test/audio/workflow-candidate-policy-timing.unit.spec.ts \
   src/test/audio/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts \
   src/test/audio/workflow-candidate-rubrics.unit.spec.ts \
   src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts \
   src/test/audio/workflow-candidate-scoring.unit.spec.ts \
   src/test/audio/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts \
   src/test/audio/workflow-skeleton-inference.unit.spec.ts \
   src/test/audio/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts \
   src/test/audio/workflow-candidate-discovery.unit.spec.ts \
   src/test/audio/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts \
   src/test/audio/workflow-memory-observation.unit.spec.ts \
   src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts \
   src/test/audio/dynamic-precision-regimes.unit.spec.ts \
   src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts \
   src/test/audio/counterfactual-repair-intelligence.unit.spec.ts \
   src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts \
   src/test/audio/multi-resolution-atlas.unit.spec.ts \
   src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts \
   src/test/audio/policy-shaped-atlas-shards.unit.spec.ts \
   src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts \
   src/test/audio/focus-conditioned-command-context.unit.spec.ts \
   src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts \
   src/test/audio/voice-semantic-address-registry.unit.spec.ts \
   src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts \
   src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts
```
Exit: `0`

### Gate 3
Command:
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py
```
Exit: `0`

## Full stdout/stderr
Raw files:
- `artifacts/reports/h3_stage3j_s5/logs/gate1_tsc_stdout.txt`
- `artifacts/reports/h3_stage3j_s5/logs/gate1_tsc_stderr.txt`
- `artifacts/reports/h3_stage3j_s5/logs/gate2_jest_stdout.txt`
- `artifacts/reports/h3_stage3j_s5/logs/gate2_jest_stderr.txt`
- `artifacts/reports/h3_stage3j_s5/logs/gate3_timing_stdout.txt`
- `artifacts/reports/h3_stage3j_s5/logs/gate3_timing_stderr.txt`

### Gate 1 stdout
```text
```

### Gate 1 stderr
```text
```

### Gate 2 stdout
```text
```

### Gate 2 stderr
```text
PASS src/test/audio/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts
  ChunkManager H3 workflow candidate scoring evidence
    ✓ emits candidate scoring fields for an exact emerged family (140 ms)
    ✓ emits elevated abstraction risk when a second unstable family variant emerges (41 ms)

PASS src/test/audio/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts
  ChunkManager H3 workflow skeleton inference evidence
    ✓ emits fixed-step skeleton fields for an exact emerged family (26 ms)
    ✓ emits bounded variable-step skeleton fields when a second emerged family variant appears (25 ms)

PASS src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts
  ChunkManager H3 open-tail specialization
    ✓ normalizes open tail and merges canonical go-to target (27 ms)
    ✓ normalizes open tail and merges canonical open target (2 ms)
    ✓ arms open strategy then rejects malformed target with no executable merged output (5 ms)
    ✓ rejects app-like ambiguous open target as non-executable (text kind) (2 ms)
    ✓ rejects malformed domain-like open target as non-executable (domain kind) (1 ms)
    ✓ falls back to full finalize when open prefix is armed but transcript hint mismatches (1 ms)
    ✓ selects open strategy only after atlas-backed geometric open prefix activation (2 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts
  ChunkManager H3 workflow candidate timing and policy evidence
    ✓ emits policy and timing fields for an exact stable family without regressing prior evidence families (30 ms)

PASS src/test/audio/workflow-candidate-rubrics.unit.spec.ts
  workflow candidate rubrics and promotion
    ✓ passes bounded rubrics and promotes an exact low-risk candidate to inline suggestion (1 ms)
    ✓ holds split-required candidates instead of allowing higher promotion (1 ms)
    ✓ stays ineligible when scoring prerequisites are missing

PASS src/test/audio/voice-semantic-address-registry.unit.spec.ts
  VoiceSemanticAddressRegistry
    ✓ registers governed v1 command trajectories and returns warm lookup hits (5 ms)
    ✓ does not register when governance is not granted (1 ms)
    ✓ refreshes existing semantic address on repeat governed success (1 ms)
    ✓ returns warm miss on atlas incompatibility and cleanly continues (1 ms)
    ✓ uses provisional warm thresholds and measures slot-index acceleration (93 ms)
    ✓ uses family-specific warm thresholds for numeric vs open command families (3 ms)
    ✓ applies earlier stale protection to open warm entries than numeric ones (1 ms)
    ✓ demotes warm confidence after a recent live-truth override conflict (1 ms)
    ✓ treats stale warm entries as advisory miss with stale protection (1 ms)
    ✓ applies bounded age decay before stale cutoff (1 ms)
    ✓ uses focus-conditioned recent task history to reshape open-command candidate ranking (2 ms)
    ✓ keeps focus-conditioned ranking advisory-only when context is ineligible (1 ms)
    ✓ applies a deictic legality penalty for open it when focus context is ineligible (2 ms)
    ✓ marks go there deictic legality through lookup metadata (1 ms)
    ✓ uses task-history momentum to favor recent semantic-address reuse during lookup (1 ms)
    ✓ applies a bounded task-history momentum penalty when the same action was recently undone (3 ms)
    ✓ applies a bounded browser shard ranking boost for browser-like open candidates (1 ms)
    ✓ keeps shard-aware ranking advisory when the shard hint is global default (1 ms)
    ✓ applies bounded browser shard narrowing during candidate scan before ranking (2 ms)
    ✓ keeps shard narrowing advisory by falling back when no matching kind exists (1 ms)
    ✓ applies advisory family-atlas routing boost for matching browser open family (1 ms)
    ✓ keeps advisory no-boost when multi-resolution family route does not match candidate family (1 ms)
    ✓ applies advisory prefix-band routing boost when family-atlas candidate pool contains matching open prefix (1 ms)
    ✓ keeps advisory no-boost when prefix band does not match candidate in family-atlas pool (1 ms)
    ✓ uses tail-strategy routing to favor locator-style open candidates when base scores tie (1 ms)
    ✓ keeps tail-strategy routing advisory when no candidate tail strategy matches (1 ms)

PASS src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts
  ChunkManager H3 workflow memory evidence
    ✓ emits session-local workflow sequence fields across governed semantic addresses (23 ms)
    ✓ does not advance workflow memory state on an ungranted semantic observation (18 ms)
    ✓ emits bounded workflow-memory ranking metadata for a previously seen governed transition (16 ms)
    ✓ keeps workflow-memory ranking metadata non-applied when no prior governed transition exists (13 ms)
    ✓ applies continuity-assisted ordering to the emitted best candidate score for a previously seen transition (15 ms)
    ✓ keeps ordering non-applied and leaves score unchanged when no continuity prior exists (20 ms)
    ✓ expands workflow-memory ordering across a candidate pool and updates emitted top candidate fields (15 ms)
    ✓ keeps candidate-pool ordering non-applied when fewer than two candidates are available (14 ms)
    ✓ emits workflow reuse priors when a governed sequence repeats with a known next step (16 ms)
    ✓ keeps workflow reuse priors non-applied when no repeated governed sequence exists (14 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts
  ChunkManager H3 workflow candidate promotion evidence
    ✓ emits rubric and promotion fields for an exact stable family (24 ms)
    ✓ routes split-required families to inbox promotion instead of higher states (19 ms)

PASS src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts
  ChunkManager H3 dynamic precision evidence
    ✓ emits bounded escalation pilot fields when repair and guardrail pressure are present (22 ms)
    ✓ holds de-escalation during cooldown and then applies it after steady recovery (14 ms)
    ✓ emits not-eligible dynamic precision fields when no family can be derived (18 ms)

PASS src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts
  ChunkManager H3 focus context evidence
    ✓ carries advisory-only focus metadata into runtime evidence (23 ms)
    ✓ passes focus envelope into semantic lookup and emits advisory ranking metadata (6 ms)
    ✓ emits advisory deictic legality metadata for open it lookup (3 ms)
    ✓ emits null focus metadata when no envelope is attached to the chunk (1 ms)
    ✓ carries advisory task-history momentum metadata into runtime evidence (2 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts
  ChunkManager H3 workflow candidate discovery evidence
    ✓ emits workflow candidate discovery fields when a governed subsequence emerges (24 ms)
    ✓ does not advance workflow candidate discovery state on an ungranted semantic observation (18 ms)

PASS src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts
  ChunkManager H3 numeric tail specialization
    ✓ normalizes numeric tail and merges canonical transcript (21 ms)
    ✓ rejects malformed numeric tails, blocks execution, and avoids finalize fallback (1 ms)
    ✓ rejects required malformed-tail cases by normalization or hint guard (2 ms)
    ✓ emits live-evidence override, records conflict penalty input, and keeps execution live-truth driven (2 ms)
    ✓ emits confidence-policy metadata during warm lookup evidence (3 ms)
    ✓ selects numeric strategy only after atlas-backed numeric prefix event (1 ms)

PASS src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts
  ChunkManager H3 counterfactual repair evidence
    ✓ emits candidate population and ambiguity pilot metadata when semantic result is present (25 ms)
    ✓ emits failure-observer placeholder fields on rejection path without semantic result (12 ms)

PASS src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts
  ChunkManager H3 multi-resolution atlas evidence
    ✓ emits advisory multi-resolution atlas fields when focus-derived shard hint exists (24 ms)
    ✓ emits not-eligible multi-resolution atlas fields when no shard hint exists (2 ms)
    ✓ emits family-atlas routing metadata on lookup-completed evidence when provided (1 ms)
    ✓ emits prefix-band routing metadata on lookup-completed evidence when provided (1 ms)
    ✓ emits tail-strategy routing metadata on lookup-completed evidence when provided (1 ms)

PASS src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts
  ChunkManager H3 atlas shard evidence
    ✓ carries advisory atlas shard hint metadata into runtime evidence (18 ms)
    ✓ emits null shard fields when no focus context envelope is attached (1 ms)
    ✓ passes advisory shard hint into lookup and emits shard ranking metadata (5 ms)

PASS src/test/audio/workflow-candidate-policy-timing.unit.spec.ts
  workflow candidate timing and policy
    ✓ enables low-risk auto-create policy for strong-trust default candidates (2 ms)
    ✓ forces inbox routing and blocks auto-create for cross-app policy classes (1 ms)

PASS src/test/audio/workflow-memory-observation.unit.spec.ts
  workflow memory observation
    ✓ records first governed semantic address without continuity suggestion (1 ms)
    ✓ suggests continuity when a previously seen transition repeats (1 ms)
    ✓ does not update governed state when the current semantic address was not granted
  workflow memory continuity ranking
    ✓ applies a bounded boost for a previously seen governed transition (1 ms)
    ✓ stays non-applied when the transition has not been seen before
  workflow memory continuity ordering
    ✓ applies an adjusted score when continuity ranking already applied
    ✓ stays non-applied when no continuity ranking prior was applied (1 ms)
  workflow memory candidate-pool ordering
    ✓ reorders a multi-candidate pool when a previously seen governed transition favors a later candidate
    ✓ stays non-applied when the candidate pool is missing multi-candidate support
  workflow memory reuse substrate
    ✓ suggests a next semantic address when a governed sequence repeats
    ✓ stays non-applied when no repeated governed sequence with a next step exists

PASS src/test/audio/counterfactual-repair-intelligence.unit.spec.ts
  counterfactual repair intelligence
    ✓ derives candidate population metadata for nearest alternatives (2 ms)
    ✓ derives DEAD detection for self-correction restart speech
    ✓ captures counterexample placeholder metadata on rejection path without semantic result (2 ms)
    ✓ derives antibody pilot quarantine metadata for recognition failure paths (1 ms)
    ✓ derives ambiguity pilot escalation for close nearest alternatives (1 ms)
    ✓ does not auto-mint counterexample metadata for DEAD restart observations (1 ms)
    ✓ derives repair-signal pilot metadata for self-correction restarts (1 ms)
    ✓ derives repair-signal pilot metadata for spoken reversals (6 ms)
    ✓ derives ranking guardrail disambiguation for close ambiguity gaps (1 ms)
    ✓ derives ranking guardrail repair hold on restart paths (1 ms)
    ✓ does not apply ranking guardrail on nominal wide-gap focus paths

PASS src/test/audio/focus-conditioned-command-context.unit.spec.ts
  FocusConditionedCommandContext
    ✓ builds a fresh verified advisory envelope and trims bounded history (2 ms)
    ✓ marks stale snapshots ineligible without granting any advisory hints (1 ms)
    ✓ requires verified authority even when focus confidence is high (1 ms)
    ✓ remains observational when snapshot is missing
    ✓ derives bounded evidence fields from an eligible envelope (1 ms)
    ✓ derives a bounded ranking boost for recent exact open-target history (1 ms)
    ✓ does not derive a ranking boost when focus context is ineligible
    ✓ derives lawful deictic legality for open it when focus provides a selection anchor (1 ms)
    ✓ derives an unlawful deictic legality penalty when go there lacks eligible focus context (1 ms)
    ✓ returns null evidence fields when no envelope is present
    ✓ derives bounded workflow momentum for recent semantic-address reuse
    ✓ derives an advisory penalty when recent task history shows the same action was undone (1 ms)

PASS src/test/audio/multi-resolution-atlas.unit.spec.ts
  multi-resolution atlas
    ✓ derives browser/open route plan from an eligible browser shard hint (2 ms)
    ✓ derives editor/numeric route plan from an eligible editor shard hint
    ✓ returns not-eligible route fields when shard hint is absent
    ✓ applies bounded family-atlas routing boost for matching open family route (1 ms)
    ✓ falls back to advisory no-boost when candidate family does not match route family
    ✓ applies bounded prefix-band routing boost for matching open prefix band (1 ms)
    ✓ keeps advisory no-boost when candidate prefix band does not match route prefix band (1 ms)
    ✓ applies bounded tail-strategy routing boost for matching locator-style open tail
    ✓ keeps advisory no-boost when candidate tail strategy does not match route tail strategy (1 ms)

PASS src/test/audio/workflow-candidate-discovery.unit.spec.ts
  workflow candidate discovery
    ✓ emerges a repeated governed subsequence after the second distinct repetition (5 ms)
    ✓ marks rediscovery merge when an already emerged pattern is seen again (1 ms)
    ✓ does not advance discovery state on an ungranted semantic observation (1 ms)

PASS src/test/audio/policy-shaped-atlas-shards.unit.spec.ts
  policy-shaped atlas shards
    ✓ derives browser navigation shard from eligible browser focus (1 ms)
    ✓ falls back to global default shard for eligible unmatched focus
    ✓ marks shard hint ineligible when focus context is ineligible (1 ms)
    ✓ derives bounded browser shard ranking boost for browser-like open targets
    ✓ keeps global-default shard advisory with no ranking adjustment
    ✓ derives bounded browser shard narrowing when mixed candidate kinds are present (1 ms)
    ✓ falls back instead of narrowing away all candidates (1 ms)
    ✓ uses fallback when shard narrowing finds no matching candidate kind in a larger set

PASS src/test/audio/dynamic-precision-regimes.unit.spec.ts
  Dynamic precision regime observation
    ✓ keeps numeric families at tight when escalation pressure is absent (1 ms)
    ✓ escalates bounded families from turbo to tight when ambiguity and repair pressure rise
    ✓ keeps open families at ultra without claiming an additional transition (1 ms)
    ✓ holds numeric de-escalation behind cooldown on the first steady follow-up
    ✓ applies numeric de-escalation after steady recovery clears cooldown and stability threshold
    ✓ stays ineligible when no family can be derived

PASS src/test/audio/workflow-skeleton-inference.unit.spec.ts
  workflow skeleton inference
    ✓ keeps all steps fixed for an exact repeated family (1 ms)
    ✓ infers a bounded variable middle step across a family (1 ms)
    ✓ infers a bounded optional step when the longer sequence cleanly removes one step
    ✓ requires family split when multiple unstable positions vary (1 ms)

PASS src/test/audio/workflow-candidate-scoring.unit.spec.ts
  workflow candidate scoring
    ✓ scores an exact emerged family as high-confidence and very-low-risk (1 ms)
    ✓ elevates risk and lowers abstraction confidence when family split is required (1 ms)
    ✓ stays ineligible when discovery or skeleton prerequisites are missing

Test Suites: 25 passed, 25 total
Tests:       148 passed, 148 total
Snapshots:   0 total
Time:        5.686 s, estimated 13 s
Ran all test suites matching /src\/test\/audio\/workflow-candidate-policy-timing.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts|src\/test\/audio\/workflow-candidate-rubrics.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts|src\/test\/audio\/workflow-candidate-scoring.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts|src\/test\/audio\/workflow-skeleton-inference.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts|src\/test\/audio\/workflow-candidate-discovery.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts|src\/test\/audio\/workflow-memory-observation.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-memory.unit.spec.ts|src\/test\/audio\/dynamic-precision-regimes.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-dynamic-precision.unit.spec.ts|src\/test\/audio\/counterfactual-repair-intelligence.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-counterfactual-repair.unit.spec.ts|src\/test\/audio\/multi-resolution-atlas.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts|src\/test\/audio\/policy-shaped-atlas-shards.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-atlas-shard.unit.spec.ts|src\/test\/audio\/focus-conditioned-command-context.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-focus-context.unit.spec.ts|src\/test\/audio\/voice-semantic-address-registry.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-numeric-tail.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-open-tail.unit.spec.ts/i.
```

### Gate 3 stdout
```text
{
  "artifact": "artifacts/reports/h3_stage3d2/warm_path_timing.json",
  "stage": "3D2",
  "generatedAt": "2026-04-02T16:28:32.442Z",
  "checks": {
    "reflex_improves": true,
    "numeric_improves": true,
    "warm_miss_non_authorizing": true,
    "warm_miss_uses_baseline_path": true
  },
  "status": "pass",
  "reflex": {
    "slotIndexAvgMs": 0.0011219703333333335,
    "candidateScanAvgMs": 0.007777685333333333,
    "improvementMs": 0.0066557149999999995,
    "improvementPct": 85.57449568543444
  },
  "parameterizedNumeric": {
    "slotIndexAvgMs": 0.00370009,
    "candidateScanAvgMs": 0.008305238333333333,
    "improvementMs": 0.004605148333333333,
    "improvementPct": 55.44871981398085
  },
  "warmMissProof": {
    "warmHitClass": "miss",
    "lookupPath": "candidate_scan",
    "mismatchReason": null
  }
}

```

### Gate 3 stderr
```text
```
