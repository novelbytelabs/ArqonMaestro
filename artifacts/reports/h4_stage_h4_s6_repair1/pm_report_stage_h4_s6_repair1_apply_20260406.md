# PM AI Final Report - H4-S6 Repair-1 Apply

## Stage
- Stage: `H4-S6 Repair-1`
- Date: `2026-04-06`
- Repo: `ArqonMaestro`
- Branch: `feature/h4`
- Recovery objective: restore green gates for provisional closure readiness while preserving H4-S6 docs/report artifacts.

## Decision
- Runtime lock/hard-fail commits introduced broad H3/H4 gate regressions.
- Recommended and executed rollback of only the runtime lock series.
- Kept H4-S6 docs and reporting commits.

## Reverts Applied
1. `6ff9b1b` Revert `f1e7449` (`feat(h4): lock reflex/closed-structure to geometric-only and hard-fail on parakeet`)
2. `1333a84` Revert `0c99ab4` (`h4: lock reflex/closed-structure chunks to geometric_only route`)
3. `fdc3cc3` Revert `c63306b` (`h4: route geometric-only reflex/closed-structure without parakeet finalize`)

## Validation Gates (post-revert)
- Gate 1: PASS
- Gate 2: PASS
- Gate 3: PASS

---

## Gate 1
### Exact command
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client && npx tsc --noEmit
```

### Full stdout
```text
```

### Full stderr
```text
```

---

## Gate 2
### Exact command
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client && npx jest --config jest.config.js --runInBand \
  src/test/audio/h4-broad-runtime-authority.unit.spec.ts \
  src/test/audio/chunk-manager-h4-broad-runtime-authority.unit.spec.ts \
  src/test/audio/h4-command-lane-authority-spine.unit.spec.ts \
  src/test/audio/chunk-manager-h4-command-lane-authority-spine.unit.spec.ts \
  src/test/audio/h4-live-mic-authority-entry.unit.spec.ts \
  src/test/audio/chunk-manager-h4-live-mic-authority-entry.unit.spec.ts \
  src/test/audio/workflow-draft-artifacts.unit.spec.ts \
  src/test/audio/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts \
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

### Full stdout
```text
```

### Full stderr
```text
PASS src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts (6.421 s)
  ChunkManager H3 workflow memory evidence
    ✓ emits session-local workflow sequence fields across governed semantic addresses (2356 ms)
    ✓ does not advance workflow memory state on an ungranted semantic observation (18 ms)
    ✓ emits bounded workflow-memory ranking metadata for a previously seen governed transition (17 ms)
    ✓ keeps workflow-memory ranking metadata non-applied when no prior governed transition exists (19 ms)
    ✓ applies continuity-assisted ordering to the emitted best candidate score for a previously seen transition (18 ms)
    ✓ keeps ordering non-applied and leaves score unchanged when no continuity prior exists (14 ms)
    ✓ expands workflow-memory ordering across a candidate pool and updates emitted top candidate fields (26 ms)
    ✓ keeps candidate-pool ordering non-applied when fewer than two candidates are available (15 ms)
    ✓ emits workflow reuse priors when a governed sequence repeats with a known next step (20 ms)
    ✓ keeps workflow reuse priors non-applied when no repeated governed sequence exists (14 ms)

PASS src/test/audio/voice-semantic-address-registry.unit.spec.ts
  VoiceSemanticAddressRegistry
    ✓ registers governed v1 command trajectories and returns warm lookup hits (6 ms)
    ✓ does not register when governance is not granted (2 ms)
    ✓ refreshes existing semantic address on repeat governed success (1 ms)
    ✓ returns warm miss on atlas incompatibility and cleanly continues (1 ms)
    ✓ uses provisional warm thresholds and measures slot-index acceleration (102 ms)
    ✓ uses family-specific warm thresholds for numeric vs open command families (3 ms)
    ✓ applies earlier stale protection to open warm entries than numeric ones (1 ms)
    ✓ demotes warm confidence after a recent live-truth override conflict (1 ms)
    ✓ treats stale warm entries as advisory miss with stale protection
    ✓ applies bounded age decay before stale cutoff
    ✓ uses focus-conditioned recent task history to reshape open-command candidate ranking (3 ms)
    ✓ keeps focus-conditioned ranking advisory-only when context is ineligible
    ✓ applies a deictic legality penalty for open it when focus context is ineligible (3 ms)
    ✓ marks go there deictic legality through lookup metadata (1 ms)
    ✓ uses task-history momentum to favor recent semantic-address reuse during lookup (1 ms)
    ✓ applies a bounded task-history momentum penalty when the same action was recently undone (1 ms)
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

PASS src/test/audio/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts
  ChunkManager H3 workflow skeleton inference evidence
    ✓ emits fixed-step skeleton fields for an exact emerged family (27 ms)
    ✓ emits bounded variable-step skeleton fields when a second emerged family variant appears (37 ms)

PASS src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts
  ChunkManager H3 focus context evidence
    ✓ carries advisory-only focus metadata into runtime evidence (25 ms)
    ✓ passes focus envelope into semantic lookup and emits advisory ranking metadata (7 ms)
    ✓ emits advisory deictic legality metadata for open it lookup (3 ms)
    ✓ emits null focus metadata when no envelope is attached to the chunk (1 ms)
    ✓ carries advisory task-history momentum metadata into runtime evidence (2 ms)

PASS src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts
  ChunkManager H3 dynamic precision evidence
    ✓ emits bounded escalation pilot fields when repair and guardrail pressure are present (26 ms)
    ✓ holds de-escalation during cooldown and then applies it after steady recovery (15 ms)
    ✓ emits not-eligible dynamic precision fields when no family can be derived (13 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts
  ChunkManager H3 workflow candidate scoring evidence
    ✓ emits candidate scoring fields for an exact emerged family (24 ms)
    ✓ emits elevated abstraction risk when a second unstable family variant emerges (21 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts
  ChunkManager H3 workflow candidate promotion evidence
    ✓ emits rubric and promotion fields for an exact stable family (24 ms)
    ✓ routes split-required families to inbox promotion instead of higher states (19 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts
  ChunkManager H3 workflow candidate discovery evidence
    ✓ emits workflow candidate discovery fields when a governed subsequence emerges (25 ms)
    ✓ does not advance workflow candidate discovery state on an ungranted semantic observation (14 ms)

PASS src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts
  ChunkManager H3 counterfactual repair evidence
    ✓ emits candidate population and ambiguity pilot metadata when semantic result is present (22 ms)
    ✓ emits failure-observer placeholder fields on rejection path without semantic result (14 ms)

PASS src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts
  ChunkManager H3 open-tail specialization
    ✓ normalizes open tail and merges canonical go-to target (21 ms)
    ✓ normalizes open tail and merges canonical open target (1 ms)
    ✓ arms open strategy then rejects malformed target with no executable merged output (3 ms)
    ✓ rejects app-like ambiguous open target as non-executable (text kind) (1 ms)
    ✓ rejects malformed domain-like open target as non-executable (domain kind) (1 ms)
    ✓ falls back to full finalize when open prefix is armed but transcript hint mismatches (1 ms)
    ✓ selects open strategy only after atlas-backed geometric open prefix activation (1 ms)

PASS src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts
  ChunkManager H3 numeric tail specialization
    ✓ normalizes numeric tail and merges canonical transcript (17 ms)
    ✓ rejects malformed numeric tails, blocks execution, and avoids finalize fallback (1 ms)
    ✓ rejects required malformed-tail cases by normalization or hint guard (1 ms)
    ✓ emits live-evidence override, records conflict penalty input, and keeps execution live-truth driven (2 ms)
    ✓ emits confidence-policy metadata during warm lookup evidence (2 ms)
    ✓ selects numeric strategy only after atlas-backed numeric prefix event (1 ms)

PASS src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts
  ChunkManager H3 atlas shard evidence
    ✓ carries advisory atlas shard hint metadata into runtime evidence (20 ms)
    ✓ emits null shard fields when no focus context envelope is attached (1 ms)
    ✓ passes advisory shard hint into lookup and emits shard ranking metadata (6 ms)

PASS src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts
  ChunkManager H3 multi-resolution atlas evidence
    ✓ emits advisory multi-resolution atlas fields when focus-derived shard hint exists (20 ms)
    ✓ emits not-eligible multi-resolution atlas fields when no shard hint exists (1 ms)
    ✓ emits family-atlas routing metadata on lookup-completed evidence when provided (1 ms)
    ✓ emits prefix-band routing metadata on lookup-completed evidence when provided (1 ms)
    ✓ emits tail-strategy routing metadata on lookup-completed evidence when provided (1 ms)

PASS src/test/audio/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts
  ChunkManager H3 workflow draft artifact evidence
    ✓ emits draft and library API preview fields for an exact stable family (26 ms)

PASS src/test/audio/chunk-manager-h4-command-lane-authority-spine.unit.spec.ts
  ChunkManager H4 authority spine evidence
    ✓ emits explicit authority-spine fields when a lawful final decision is present (26 ms)

PASS src/test/audio/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts
  ChunkManager H3 workflow candidate timing and policy evidence
    ✓ emits policy and timing fields for an exact stable family without regressing prior evidence families (29 ms)

PASS src/test/audio/chunk-manager-h4-live-mic-authority-entry.unit.spec.ts
  ChunkManager H4 live mic authority entry evidence
    ✓ emits explicit live mic authority entry fields (20 ms)

PASS src/test/audio/chunk-manager-h4-broad-runtime-authority.unit.spec.ts
  ChunkManager H4 broad runtime authority evidence
    ✓ emits explicit broad runtime authority fields when the authority spine and H3/3J surfaces are integrated (18 ms)

PASS src/test/audio/counterfactual-repair-intelligence.unit.spec.ts
  counterfactual repair intelligence
    ✓ derives candidate population metadata for nearest alternatives (2 ms)
    ✓ derives DEAD detection for self-correction restart speech (1 ms)
    ✓ captures counterexample placeholder metadata on rejection path without semantic result (2 ms)
    ✓ derives antibody pilot quarantine metadata for recognition failure paths (1 ms)
    ✓ derives ambiguity pilot escalation for close nearest alternatives (1 ms)
    ✓ does not auto-mint counterexample metadata for DEAD restart observations (1 ms)
    ✓ derives repair-signal pilot metadata for self-correction restarts (1 ms)
    ✓ derives repair-signal pilot metadata for spoken reversals (1 ms)
    ✓ derives ranking guardrail disambiguation for close ambiguity gaps
    ✓ derives ranking guardrail repair hold on restart paths (1 ms)
    ✓ does not apply ranking guardrail on nominal wide-gap focus paths (1 ms)

PASS src/test/audio/focus-conditioned-command-context.unit.spec.ts
  FocusConditionedCommandContext
    ✓ builds a fresh verified advisory envelope and trims bounded history (2 ms)
    ✓ marks stale snapshots ineligible without granting any advisory hints
    ✓ requires verified authority even when focus confidence is high
    ✓ remains observational when snapshot is missing (1 ms)
    ✓ derives bounded evidence fields from an eligible envelope
    ✓ derives a bounded ranking boost for recent exact open-target history
    ✓ does not derive a ranking boost when focus context is ineligible (1 ms)
    ✓ derives lawful deictic legality for open it when focus provides a selection anchor (1 ms)
    ✓ derives an unlawful deictic legality penalty when go there lacks eligible focus context
    ✓ returns null evidence fields when no envelope is present (1 ms)
    ✓ derives bounded workflow momentum for recent semantic-address reuse (1 ms)
    ✓ derives an advisory penalty when recent task history shows the same action was undone (1 ms)

PASS src/test/audio/policy-shaped-atlas-shards.unit.spec.ts
  policy-shaped atlas shards
    ✓ derives browser navigation shard from eligible browser focus (1 ms)
    ✓ falls back to global default shard for eligible unmatched focus (1 ms)
    ✓ marks shard hint ineligible when focus context is ineligible
    ✓ derives bounded browser shard ranking boost for browser-like open targets (1 ms)
    ✓ keeps global-default shard advisory with no ranking adjustment
    ✓ derives bounded browser shard narrowing when mixed candidate kinds are present (4 ms)
    ✓ falls back instead of narrowing away all candidates
    ✓ uses fallback when shard narrowing finds no matching candidate kind in a larger set (1 ms)

PASS src/test/audio/multi-resolution-atlas.unit.spec.ts
  multi-resolution atlas
    ✓ derives browser/open route plan from an eligible browser shard hint (1 ms)
    ✓ derives editor/numeric route plan from an eligible editor shard hint (1 ms)
    ✓ returns not-eligible route fields when shard hint is absent
    ✓ applies bounded family-atlas routing boost for matching open family route
    ✓ falls back to advisory no-boost when candidate family does not match route family (1 ms)
    ✓ applies bounded prefix-band routing boost for matching open prefix band
    ✓ keeps advisory no-boost when candidate prefix band does not match route prefix band (1 ms)
    ✓ applies bounded tail-strategy routing boost for matching locator-style open tail
    ✓ keeps advisory no-boost when candidate tail strategy does not match route tail strategy

PASS src/test/audio/workflow-skeleton-inference.unit.spec.ts
  workflow skeleton inference
    ✓ keeps all steps fixed for an exact repeated family (1 ms)
    ✓ infers a bounded variable middle step across a family
    ✓ infers a bounded optional step when the longer sequence cleanly removes one step
    ✓ requires family split when multiple unstable positions vary

PASS src/test/audio/workflow-memory-observation.unit.spec.ts
  workflow memory observation
    ✓ records first governed semantic address without continuity suggestion (1 ms)
    ✓ suggests continuity when a previously seen transition repeats
    ✓ does not update governed state when the current semantic address was not granted (1 ms)
  workflow memory continuity ranking
    ✓ applies a bounded boost for a previously seen governed transition
    ✓ stays non-applied when the transition has not been seen before
  workflow memory continuity ordering
    ✓ applies an adjusted score when continuity ranking already applied (1 ms)
    ✓ stays non-applied when no continuity ranking prior was applied
  workflow memory candidate-pool ordering
    ✓ reorders a multi-candidate pool when a previously seen governed transition favors a later candidate (1 ms)
    ✓ stays non-applied when the candidate pool is missing multi-candidate support
  workflow memory reuse substrate
    ✓ suggests a next semantic address when a governed sequence repeats (1 ms)
    ✓ stays non-applied when no repeated governed sequence with a next step exists

PASS src/test/audio/workflow-draft-artifacts.unit.spec.ts
  workflow draft artifacts
    ✓ creates a bounded draft artifact preview for an auto-create-eligible low-risk candidate
    ✓ keeps draft artifact surfaces ineligible when promotion is not yet active

PASS src/test/audio/dynamic-precision-regimes.unit.spec.ts
  Dynamic precision regime observation
    ✓ keeps numeric families at tight when escalation pressure is absent (1 ms)
    ✓ escalates bounded families from turbo to tight when ambiguity and repair pressure rise
    ✓ keeps open families at ultra without claiming an additional transition (1 ms)
    ✓ holds numeric de-escalation behind cooldown on the first steady follow-up
    ✓ applies numeric de-escalation after steady recovery clears cooldown and stability threshold (1 ms)
    ✓ stays ineligible when no family can be derived

PASS src/test/audio/workflow-candidate-policy-timing.unit.spec.ts
  workflow candidate timing and policy
    ✓ enables low-risk auto-create policy for strong-trust default candidates (1 ms)
    ✓ forces inbox routing and blocks auto-create for cross-app policy classes

PASS src/test/audio/workflow-candidate-scoring.unit.spec.ts
  workflow candidate scoring
    ✓ scores an exact emerged family as high-confidence and very-low-risk (1 ms)
    ✓ elevates risk and lowers abstraction confidence when family split is required
    ✓ stays ineligible when discovery or skeleton prerequisites are missing (1 ms)

PASS src/test/audio/h4-broad-runtime-authority.unit.spec.ts
  H4 broad runtime authority expansion
    ✓ marks broad runtime authority active when the H3/3J stack is integrated under the authority spine (1 ms)
    ✓ keeps broad runtime expansion fallback-only when the authority spine is not yet eligible

PASS src/test/audio/workflow-candidate-discovery.unit.spec.ts
  workflow candidate discovery
    ✓ emerges a repeated governed subsequence after the second distinct repetition (1 ms)
    ✓ marks rediscovery merge when an already emerged pattern is seen again (1 ms)
    ✓ does not advance discovery state on an ungranted semantic observation (1 ms)

PASS src/test/audio/workflow-candidate-rubrics.unit.spec.ts
  workflow candidate rubrics and promotion
    ✓ passes bounded rubrics and promotes an exact low-risk candidate to inline suggestion (1 ms)
    ✓ holds split-required candidates instead of allowing higher promotion (1 ms)
    ✓ stays ineligible when scoring prerequisites are missing

PASS src/test/audio/h4-command-lane-authority-spine.unit.spec.ts
  H4 command-lane authority spine
    ✓ marks h3j as the primary command-lane authority when a lawful final decision is present (1 ms)
    ✓ records explicit fallback when the authority path fails to produce a lawful final decision (1 ms)

PASS src/test/audio/h4-live-mic-authority-entry.unit.spec.ts
  H4 live mic authority entry
    ✓ selects h3j authority as the default live command-lane path (1 ms)
    ✓ marks explicit fallback when the authority path fails to produce a lawful final decision

Test Suites: 33 passed, 33 total
Tests:       160 passed, 160 total
Snapshots:   0 total
Time:        8.231 s, estimated 9 s
Ran all test suites matching /src\/test\/audio\/h4-broad-runtime-authority.unit.spec.ts|src\/test\/audio\/chunk-manager-h4-broad-runtime-authority.unit.spec.ts|src\/test\/audio\/h4-command-lane-authority-spine.unit.spec.ts|src\/test\/audio\/chunk-manager-h4-command-lane-authority-spine.unit.spec.ts|src\/test\/audio\/h4-live-mic-authority-entry.unit.spec.ts|src\/test\/audio\/chunk-manager-h4-live-mic-authority-entry.unit.spec.ts|src\/test\/audio\/workflow-draft-artifacts.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts|src\/test\/audio\/workflow-candidate-policy-timing.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts|src\/test\/audio\/workflow-candidate-rubrics.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts|src\/test\/audio\/workflow-candidate-scoring.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts|src\/test\/audio\/workflow-skeleton-inference.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts|src\/test\/audio\/workflow-candidate-discovery.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts|src\/test\/audio\/workflow-memory-observation.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-memory.unit.spec.ts|src\/test\/audio\/dynamic-precision-regimes.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-dynamic-precision.unit.spec.ts|src\/test\/audio\/counterfactual-repair-intelligence.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-counterfactual-repair.unit.spec.ts|src\/test\/audio\/multi-resolution-atlas.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts|src\/test\/audio\/policy-shaped-atlas-shards.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-atlas-shard.unit.spec.ts|src\/test\/audio\/focus-conditioned-command-context.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-focus-context.unit.spec.ts|src\/test\/audio\/voice-semantic-address-registry.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-numeric-tail.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-open-tail.unit.spec.ts/i.
```

---

## Gate 3
### Exact command
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py
```

### Full stdout
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

### Full stderr
```text
```

---

## Program Status
- H4 provisional closure posture is now gate-green on `feature/h4` after targeted runtime rollback.
- Deferred refinement can resume later from this stable point.
