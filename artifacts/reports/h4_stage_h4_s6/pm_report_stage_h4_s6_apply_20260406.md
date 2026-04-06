# PM AI Final Report - H4-S6 Apply

## Stage
- Stage: `H4-S6`
- Date: `2026-04-06`
- Repo: `ArqonMaestro`
- Branch: `feature/h4`
- Baseline requested: `bfa068f`
- Applied from current branch head at run time: `f1e7449`

## Goal
- Apply Stage H4-S6 docs-only provisional closure bundle.
- Freeze authoritative rollout posture and record deferred refinement issues.
- Do not change runtime/mic/path/Parakeet/UX.

## Bundle
- Bundle zip path: `/home/irbsurfer/Projects/arqon/ArqonMaestro/tmp/h4_stage_h4_s6_bundle_20260406.zip`
- Extracted path: `/tmp/h4_s6_bundle/h4_s6_bundle`

## Files Applied (ArqonMaestro only)
- `docs/h4/H4_STATUS_REPORT.md`
- `docs/h4/H4_DEFERRED_ISSUES_REGISTER.md`
- `docs/h4/H4_VALIDATION_GATES_GUIDE.md`
- `docs/h4/H4_PLAN.md`

## Pre-Gate SHA256 Verification
- `docs/h4/H4_STATUS_REPORT.md`
  - `a289321d5e0e169c45400094de96f806bd29057dd8a03762183edf967d921613`
- `docs/h4/H4_DEFERRED_ISSUES_REGISTER.md`
  - `2ca7e959f50111bbf29f9c3bc9539bd0f1e10267e22139bd645d866e8b931149`
- `docs/h4/H4_VALIDATION_GATES_GUIDE.md`
  - `4cf61c0b6c3614f653c2ad1f8227e604bc53777e38c17caadcd4d2cfd363e11e`
- `docs/h4/H4_PLAN.md`
  - `dde5ddb9634727f06d9a432c515bafa9a19287748efe6a79bff502e277173a42`

## Validation Gate Results
- Gate 1: PASS
- Gate 2: FAIL
- Gate 3: NOT RUN (stopped on first failure per rule)

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
PASS src/test/audio/voice-semantic-address-registry.unit.spec.ts (5.137 s)
  VoiceSemanticAddressRegistry
    ✓ registers governed v1 command trajectories and returns warm lookup hits (7 ms)
    ✓ does not register when governance is not granted (1 ms)
    ✓ refreshes existing semantic address on repeat governed success (1 ms)
    ✓ returns warm miss on atlas incompatibility and cleanly continues (1 ms)
    ✓ uses provisional warm thresholds and measures slot-index acceleration (99 ms)
    ✓ uses family-specific warm thresholds for numeric vs open command families (4 ms)
    ✓ applies earlier stale protection to open warm entries than numeric ones (1 ms)
    ✓ demotes warm confidence after a recent live-truth override conflict (2 ms)
    ✓ treats stale warm entries as advisory miss with stale protection (1 ms)
    ✓ applies bounded age decay before stale cutoff (2 ms)
    ✓ uses focus-conditioned recent task history to reshape open-command candidate ranking (3 ms)
    ✓ keeps focus-conditioned ranking advisory-only when context is ineligible (1 ms)
    ✓ applies a deictic legality penalty for open it when focus context is ineligible (2 ms)
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

FAIL src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts
  ChunkManager H3 workflow memory evidence
    ✕ emits session-local workflow sequence fields across governed semantic addresses (2608 ms)
    ✕ does not advance workflow memory state on an ungranted semantic observation (17 ms)
    ✕ emits bounded workflow-memory ranking metadata for a previously seen governed transition (16 ms)
    ✕ keeps workflow-memory ranking metadata non-applied when no prior governed transition exists (16 ms)
    ✕ applies continuity-assisted ordering to the emitted best candidate score for a previously seen transition (21 ms)
    ✕ keeps ordering non-applied and leaves score unchanged when no continuity prior exists (17 ms)
    ✕ expands workflow-memory ordering across a candidate pool and updates emitted top candidate fields (16 ms)
    ✕ keeps candidate-pool ordering non-applied when fewer than two candidates are available (16 ms)
    ✕ emits workflow reuse priors when a governed sequence repeats with a known next step (16 ms)
    ✕ keeps workflow reuse priors non-applied when no repeated governed sequence exists (16 ms)

  ● ChunkManager H3 workflow memory evidence › emits session-local workflow sequence fields across governed semantic addresses





  ● ChunkManager H3 workflow memory evidence › does not advance workflow memory state on an ungranted semantic observation





  ● ChunkManager H3 workflow memory evidence › emits bounded workflow-memory ranking metadata for a previously seen governed transition





  ● ChunkManager H3 workflow memory evidence › keeps workflow-memory ranking metadata non-applied when no prior governed transition exists





  ● ChunkManager H3 workflow memory evidence › applies continuity-assisted ordering to the emitted best candidate score for a previously seen transition





  ● ChunkManager H3 workflow memory evidence › keeps ordering non-applied and leaves score unchanged when no continuity prior exists





  ● ChunkManager H3 workflow memory evidence › expands workflow-memory ordering across a candidate pool and updates emitted top candidate fields





  ● ChunkManager H3 workflow memory evidence › keeps candidate-pool ordering non-applied when fewer than two candidates are available





  ● ChunkManager H3 workflow memory evidence › emits workflow reuse priors when a governed sequence repeats with a known next step





  ● ChunkManager H3 workflow memory evidence › keeps workflow reuse priors non-applied when no repeated governed sequence exists





FAIL src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts
  ChunkManager H3 focus context evidence
    ✕ carries advisory-only focus metadata into runtime evidence (50 ms)
    ✕ passes focus envelope into semantic lookup and emits advisory ranking metadata (19 ms)
    ✕ emits advisory deictic legality metadata for open it lookup (12 ms)
    ✕ emits null focus metadata when no envelope is attached to the chunk (11 ms)
    ✕ carries advisory task-history momentum metadata into runtime evidence (10 ms)

  ● ChunkManager H3 focus context evidence › carries advisory-only focus metadata into runtime evidence





  ● ChunkManager H3 focus context evidence › passes focus envelope into semantic lookup and emits advisory ranking metadata





  ● ChunkManager H3 focus context evidence › emits advisory deictic legality metadata for open it lookup





  ● ChunkManager H3 focus context evidence › emits null focus metadata when no envelope is attached to the chunk





  ● ChunkManager H3 focus context evidence › carries advisory task-history momentum metadata into runtime evidence





FAIL src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts
  ChunkManager H3 numeric tail specialization
    ✕ normalizes numeric tail and merges canonical transcript (49 ms)
    ✕ rejects malformed numeric tails, blocks execution, and avoids finalize fallback (10 ms)
    ✕ rejects required malformed-tail cases by normalization or hint guard (9 ms)
    ✕ emits live-evidence override, records conflict penalty input, and keeps execution live-truth driven (10 ms)
    ✕ emits confidence-policy metadata during warm lookup evidence (10 ms)
    ✕ selects numeric strategy only after atlas-backed numeric prefix event (10 ms)

  ● ChunkManager H3 numeric tail specialization › normalizes numeric tail and merges canonical transcript





  ● ChunkManager H3 numeric tail specialization › rejects malformed numeric tails, blocks execution, and avoids finalize fallback





  ● ChunkManager H3 numeric tail specialization › rejects required malformed-tail cases by normalization or hint guard





  ● ChunkManager H3 numeric tail specialization › emits live-evidence override, records conflict penalty input, and keeps execution live-truth driven





  ● ChunkManager H3 numeric tail specialization › emits confidence-policy metadata during warm lookup evidence





  ● ChunkManager H3 numeric tail specialization › selects numeric strategy only after atlas-backed numeric prefix event





FAIL src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts
  ChunkManager H3 open-tail specialization
    ✕ normalizes open tail and merges canonical go-to target (45 ms)
    ✕ normalizes open tail and merges canonical open target (10 ms)
    ✕ arms open strategy then rejects malformed target with no executable merged output (10 ms)
    ✕ rejects app-like ambiguous open target as non-executable (text kind) (10 ms)
    ✕ rejects malformed domain-like open target as non-executable (domain kind) (10 ms)
    ✕ falls back to full finalize when open prefix is armed but transcript hint mismatches (15 ms)
    ✕ selects open strategy only after atlas-backed geometric open prefix activation (11 ms)

  ● ChunkManager H3 open-tail specialization › normalizes open tail and merges canonical go-to target





  ● ChunkManager H3 open-tail specialization › normalizes open tail and merges canonical open target





  ● ChunkManager H3 open-tail specialization › arms open strategy then rejects malformed target with no executable merged output





  ● ChunkManager H3 open-tail specialization › rejects app-like ambiguous open target as non-executable (text kind)





  ● ChunkManager H3 open-tail specialization › rejects malformed domain-like open target as non-executable (domain kind)





  ● ChunkManager H3 open-tail specialization › falls back to full finalize when open prefix is armed but transcript hint mismatches





  ● ChunkManager H3 open-tail specialization › selects open strategy only after atlas-backed geometric open prefix activation





PASS src/test/audio/focus-conditioned-command-context.unit.spec.ts
  FocusConditionedCommandContext
    ✓ builds a fresh verified advisory envelope and trims bounded history (3 ms)
    ✓ marks stale snapshots ineligible without granting any advisory hints (1 ms)
    ✓ requires verified authority even when focus confidence is high (1 ms)
    ✓ remains observational when snapshot is missing (1 ms)
    ✓ derives bounded evidence fields from an eligible envelope (1 ms)
    ✓ derives a bounded ranking boost for recent exact open-target history (1 ms)
    ✓ does not derive a ranking boost when focus context is ineligible
    ✓ derives lawful deictic legality for open it when focus provides a selection anchor (1 ms)
    ✓ derives an unlawful deictic legality penalty when go there lacks eligible focus context (1 ms)
    ✓ returns null evidence fields when no envelope is present (1 ms)
    ✓ derives bounded workflow momentum for recent semantic-address reuse
    ✓ derives an advisory penalty when recent task history shows the same action was undone

PASS src/test/audio/counterfactual-repair-intelligence.unit.spec.ts
  counterfactual repair intelligence
    ✓ derives candidate population metadata for nearest alternatives (2 ms)
    ✓ derives DEAD detection for self-correction restart speech (1 ms)
    ✓ captures counterexample placeholder metadata on rejection path without semantic result (1 ms)
    ✓ derives antibody pilot quarantine metadata for recognition failure paths (1 ms)
    ✓ derives ambiguity pilot escalation for close nearest alternatives (1 ms)
    ✓ does not auto-mint counterexample metadata for DEAD restart observations (1 ms)
    ✓ derives repair-signal pilot metadata for self-correction restarts (1 ms)
    ✓ derives repair-signal pilot metadata for spoken reversals (1 ms)
    ✓ derives ranking guardrail disambiguation for close ambiguity gaps (1 ms)
    ✓ derives ranking guardrail repair hold on restart paths (1 ms)
    ✓ does not apply ranking guardrail on nominal wide-gap focus paths (1 ms)

PASS src/test/audio/workflow-memory-observation.unit.spec.ts
  workflow memory observation
    ✓ records first governed semantic address without continuity suggestion (1 ms)
    ✓ suggests continuity when a previously seen transition repeats (1 ms)
    ✓ does not update governed state when the current semantic address was not granted (1 ms)
  workflow memory continuity ranking
    ✓ applies a bounded boost for a previously seen governed transition
    ✓ stays non-applied when the transition has not been seen before (1 ms)
  workflow memory continuity ordering
    ✓ applies an adjusted score when continuity ranking already applied
    ✓ stays non-applied when no continuity ranking prior was applied (1 ms)
  workflow memory candidate-pool ordering
    ✓ reorders a multi-candidate pool when a previously seen governed transition favors a later candidate (1 ms)
    ✓ stays non-applied when the candidate pool is missing multi-candidate support (1 ms)
  workflow memory reuse substrate
    ✓ suggests a next semantic address when a governed sequence repeats
    ✓ stays non-applied when no repeated governed sequence with a next step exists

PASS src/test/audio/multi-resolution-atlas.unit.spec.ts
  multi-resolution atlas
    ✓ derives browser/open route plan from an eligible browser shard hint (1 ms)
    ✓ derives editor/numeric route plan from an eligible editor shard hint
    ✓ returns not-eligible route fields when shard hint is absent (1 ms)
    ✓ applies bounded family-atlas routing boost for matching open family route (1 ms)
    ✓ falls back to advisory no-boost when candidate family does not match route family
    ✓ applies bounded prefix-band routing boost for matching open prefix band (1 ms)
    ✓ keeps advisory no-boost when candidate prefix band does not match route prefix band (1 ms)
    ✓ applies bounded tail-strategy routing boost for matching locator-style open tail
    ✓ keeps advisory no-boost when candidate tail strategy does not match route tail strategy (1 ms)

FAIL src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts
  ChunkManager H3 dynamic precision evidence
    ✕ emits bounded escalation pilot fields when repair and guardrail pressure are present (48 ms)
    ✕ holds de-escalation during cooldown and then applies it after steady recovery (23 ms)
    ✕ emits not-eligible dynamic precision fields when no family can be derived (15 ms)

  ● ChunkManager H3 dynamic precision evidence › emits bounded escalation pilot fields when repair and guardrail pressure are present





  ● ChunkManager H3 dynamic precision evidence › holds de-escalation during cooldown and then applies it after steady recovery





  ● ChunkManager H3 dynamic precision evidence › emits not-eligible dynamic precision fields when no family can be derived





FAIL src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts
  ChunkManager H3 multi-resolution atlas evidence
    ✕ emits advisory multi-resolution atlas fields when focus-derived shard hint exists (53 ms)
    ✕ emits not-eligible multi-resolution atlas fields when no shard hint exists (11 ms)
    ✕ emits family-atlas routing metadata on lookup-completed evidence when provided (11 ms)
    ✕ emits prefix-band routing metadata on lookup-completed evidence when provided (10 ms)
    ✕ emits tail-strategy routing metadata on lookup-completed evidence when provided (11 ms)

  ● ChunkManager H3 multi-resolution atlas evidence › emits advisory multi-resolution atlas fields when focus-derived shard hint exists





  ● ChunkManager H3 multi-resolution atlas evidence › emits not-eligible multi-resolution atlas fields when no shard hint exists





  ● ChunkManager H3 multi-resolution atlas evidence › emits family-atlas routing metadata on lookup-completed evidence when provided





  ● ChunkManager H3 multi-resolution atlas evidence › emits prefix-band routing metadata on lookup-completed evidence when provided





  ● ChunkManager H3 multi-resolution atlas evidence › emits tail-strategy routing metadata on lookup-completed evidence when provided





FAIL src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts
  ChunkManager H3 atlas shard evidence
    ✕ carries advisory atlas shard hint metadata into runtime evidence (59 ms)
    ✕ emits null shard fields when no focus context envelope is attached (11 ms)
    ✕ passes advisory shard hint into lookup and emits shard ranking metadata (11 ms)

  ● ChunkManager H3 atlas shard evidence › carries advisory atlas shard hint metadata into runtime evidence





  ● ChunkManager H3 atlas shard evidence › emits null shard fields when no focus context envelope is attached





  ● ChunkManager H3 atlas shard evidence › passes advisory shard hint into lookup and emits shard ranking metadata





PASS src/test/audio/dynamic-precision-regimes.unit.spec.ts
  Dynamic precision regime observation
    ✓ keeps numeric families at tight when escalation pressure is absent (2 ms)
    ✓ escalates bounded families from turbo to tight when ambiguity and repair pressure rise
    ✓ keeps open families at ultra without claiming an additional transition
    ✓ holds numeric de-escalation behind cooldown on the first steady follow-up
    ✓ applies numeric de-escalation after steady recovery clears cooldown and stability threshold (1 ms)
    ✓ stays ineligible when no family can be derived

PASS src/test/audio/policy-shaped-atlas-shards.unit.spec.ts
  policy-shaped atlas shards
    ✓ derives browser navigation shard from eligible browser focus (2 ms)
    ✓ falls back to global default shard for eligible unmatched focus
    ✓ marks shard hint ineligible when focus context is ineligible
    ✓ derives bounded browser shard ranking boost for browser-like open targets (1 ms)
    ✓ keeps global-default shard advisory with no ranking adjustment (1 ms)
    ✓ derives bounded browser shard narrowing when mixed candidate kinds are present (1 ms)
    ✓ falls back instead of narrowing away all candidates
    ✓ uses fallback when shard narrowing finds no matching candidate kind in a larger set

FAIL src/test/audio/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts
  ChunkManager H3 workflow candidate discovery evidence
    ✕ emits workflow candidate discovery fields when a governed subsequence emerges (44 ms)
    ✕ does not advance workflow candidate discovery state on an ungranted semantic observation (22 ms)

  ● ChunkManager H3 workflow candidate discovery evidence › emits workflow candidate discovery fields when a governed subsequence emerges





  ● ChunkManager H3 workflow candidate discovery evidence › does not advance workflow candidate discovery state on an ungranted semantic observation





FAIL src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts
  ChunkManager H3 counterfactual repair evidence
    ✕ emits candidate population and ambiguity pilot metadata when semantic result is present (45 ms)
    ✕ emits failure-observer placeholder fields on rejection path without semantic result (16 ms)

  ● ChunkManager H3 counterfactual repair evidence › emits candidate population and ambiguity pilot metadata when semantic result is present





  ● ChunkManager H3 counterfactual repair evidence › emits failure-observer placeholder fields on rejection path without semantic result





FAIL src/test/audio/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts
  ChunkManager H3 workflow skeleton inference evidence
    ✕ emits fixed-step skeleton fields for an exact emerged family (47 ms)
    ✕ emits bounded variable-step skeleton fields when a second emerged family variant appears (17 ms)

  ● ChunkManager H3 workflow skeleton inference evidence › emits fixed-step skeleton fields for an exact emerged family





  ● ChunkManager H3 workflow skeleton inference evidence › emits bounded variable-step skeleton fields when a second emerged family variant appears





FAIL src/test/audio/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts
  ChunkManager H3 workflow candidate scoring evidence
    ✕ emits candidate scoring fields for an exact emerged family (50 ms)
    ✕ emits elevated abstraction risk when a second unstable family variant emerges (16 ms)

  ● ChunkManager H3 workflow candidate scoring evidence › emits candidate scoring fields for an exact emerged family





  ● ChunkManager H3 workflow candidate scoring evidence › emits elevated abstraction risk when a second unstable family variant emerges





FAIL src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts
  ChunkManager H3 workflow candidate promotion evidence
    ✕ emits rubric and promotion fields for an exact stable family (46 ms)
    ✕ routes split-required families to inbox promotion instead of higher states (21 ms)

  ● ChunkManager H3 workflow candidate promotion evidence › emits rubric and promotion fields for an exact stable family





  ● ChunkManager H3 workflow candidate promotion evidence › routes split-required families to inbox promotion instead of higher states





PASS src/test/audio/workflow-candidate-policy-timing.unit.spec.ts
  workflow candidate timing and policy
    ✓ enables low-risk auto-create policy for strong-trust default candidates (2 ms)
    ✓ forces inbox routing and blocks auto-create for cross-app policy classes

PASS src/test/audio/workflow-skeleton-inference.unit.spec.ts
  workflow skeleton inference
    ✓ keeps all steps fixed for an exact repeated family (1 ms)
    ✓ infers a bounded variable middle step across a family
    ✓ infers a bounded optional step when the longer sequence cleanly removes one step
    ✓ requires family split when multiple unstable positions vary (1 ms)

PASS src/test/audio/workflow-candidate-rubrics.unit.spec.ts
  workflow candidate rubrics and promotion
    ✓ passes bounded rubrics and promotes an exact low-risk candidate to inline suggestion (1 ms)
    ✓ holds split-required candidates instead of allowing higher promotion (1 ms)
    ✓ stays ineligible when scoring prerequisites are missing

FAIL src/test/audio/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts
  ChunkManager H3 workflow candidate timing and policy evidence
    ✕ emits policy and timing fields for an exact stable family without regressing prior evidence families (43 ms)

  ● ChunkManager H3 workflow candidate timing and policy evidence › emits policy and timing fields for an exact stable family without regressing prior evidence families





FAIL src/test/audio/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts
  ChunkManager H3 workflow draft artifact evidence
    ✕ emits draft and library API preview fields for an exact stable family (46 ms)

  ● ChunkManager H3 workflow draft artifact evidence › emits draft and library API preview fields for an exact stable family





PASS src/test/audio/workflow-candidate-scoring.unit.spec.ts
  workflow candidate scoring
    ✓ scores an exact emerged family as high-confidence and very-low-risk (2 ms)
    ✓ elevates risk and lowers abstraction confidence when family split is required (1 ms)
    ✓ stays ineligible when discovery or skeleton prerequisites are missing (1 ms)

PASS src/test/audio/workflow-candidate-discovery.unit.spec.ts
  workflow candidate discovery
    ✓ emerges a repeated governed subsequence after the second distinct repetition (1 ms)
    ✓ marks rediscovery merge when an already emerged pattern is seen again
    ✓ does not advance discovery state on an ungranted semantic observation (1 ms)

FAIL src/test/audio/chunk-manager-h4-live-mic-authority-entry.unit.spec.ts
  ChunkManager H4 live mic authority entry evidence
    ✕ emits explicit live mic authority entry fields (42 ms)

  ● ChunkManager H4 live mic authority entry evidence › emits explicit live mic authority entry fields





FAIL src/test/audio/chunk-manager-h4-command-lane-authority-spine.unit.spec.ts
  ChunkManager H4 authority spine evidence
    ✕ emits explicit authority-spine fields when a lawful final decision is present (46 ms)

  ● ChunkManager H4 authority spine evidence › emits explicit authority-spine fields when a lawful final decision is present





PASS src/test/audio/workflow-draft-artifacts.unit.spec.ts
  workflow draft artifacts
    ✓ creates a bounded draft artifact preview for an auto-create-eligible low-risk candidate (1 ms)
    ✓ keeps draft artifact surfaces ineligible when promotion is not yet active

FAIL src/test/audio/chunk-manager-h4-broad-runtime-authority.unit.spec.ts
  ChunkManager H4 broad runtime authority evidence
    ✕ emits explicit broad runtime authority fields when the authority spine and H3/3J surfaces are integrated (45 ms)

  ● ChunkManager H4 broad runtime authority evidence › emits explicit broad runtime authority fields when the authority spine and H3/3J surfaces are integrated





PASS src/test/audio/h4-command-lane-authority-spine.unit.spec.ts
  H4 command-lane authority spine
    ✓ marks h3j as the primary command-lane authority when a lawful final decision is present (1 ms)
    ✓ records explicit fallback when the authority path fails to produce a lawful final decision

PASS src/test/audio/h4-live-mic-authority-entry.unit.spec.ts
  H4 live mic authority entry
    ✓ selects h3j authority as the default live command-lane path (1 ms)
    ✓ marks explicit fallback when the authority path fails to produce a lawful final decision (5 ms)

PASS src/test/audio/h4-broad-runtime-authority.unit.spec.ts
  H4 broad runtime authority expansion
    ✓ marks broad runtime authority active when the H3/3J stack is integrated under the authority spine (1 ms)
    ✓ keeps broad runtime expansion fallback-only when the authority spine is not yet eligible

Summary of all failing tests
FAIL src/test/audio/chunk-manager-h3-workflow-memory.unit.spec.ts
  ● ChunkManager H3 workflow memory evidence › emits session-local workflow sequence fields across governed semantic addresses





  ● ChunkManager H3 workflow memory evidence › does not advance workflow memory state on an ungranted semantic observation





  ● ChunkManager H3 workflow memory evidence › emits bounded workflow-memory ranking metadata for a previously seen governed transition





  ● ChunkManager H3 workflow memory evidence › keeps workflow-memory ranking metadata non-applied when no prior governed transition exists





  ● ChunkManager H3 workflow memory evidence › applies continuity-assisted ordering to the emitted best candidate score for a previously seen transition





  ● ChunkManager H3 workflow memory evidence › keeps ordering non-applied and leaves score unchanged when no continuity prior exists





  ● ChunkManager H3 workflow memory evidence › expands workflow-memory ordering across a candidate pool and updates emitted top candidate fields





  ● ChunkManager H3 workflow memory evidence › keeps candidate-pool ordering non-applied when fewer than two candidates are available





  ● ChunkManager H3 workflow memory evidence › emits workflow reuse priors when a governed sequence repeats with a known next step





  ● ChunkManager H3 workflow memory evidence › keeps workflow reuse priors non-applied when no repeated governed sequence exists





FAIL src/test/audio/chunk-manager-h3-focus-context.unit.spec.ts
  ● ChunkManager H3 focus context evidence › carries advisory-only focus metadata into runtime evidence





  ● ChunkManager H3 focus context evidence › passes focus envelope into semantic lookup and emits advisory ranking metadata





  ● ChunkManager H3 focus context evidence › emits advisory deictic legality metadata for open it lookup





  ● ChunkManager H3 focus context evidence › emits null focus metadata when no envelope is attached to the chunk





  ● ChunkManager H3 focus context evidence › carries advisory task-history momentum metadata into runtime evidence





FAIL src/test/audio/chunk-manager-h3-numeric-tail.unit.spec.ts
  ● ChunkManager H3 numeric tail specialization › normalizes numeric tail and merges canonical transcript





  ● ChunkManager H3 numeric tail specialization › rejects malformed numeric tails, blocks execution, and avoids finalize fallback





  ● ChunkManager H3 numeric tail specialization › rejects required malformed-tail cases by normalization or hint guard





  ● ChunkManager H3 numeric tail specialization › emits live-evidence override, records conflict penalty input, and keeps execution live-truth driven





  ● ChunkManager H3 numeric tail specialization › emits confidence-policy metadata during warm lookup evidence





  ● ChunkManager H3 numeric tail specialization › selects numeric strategy only after atlas-backed numeric prefix event





FAIL src/test/audio/chunk-manager-h3-open-tail.unit.spec.ts
  ● ChunkManager H3 open-tail specialization › normalizes open tail and merges canonical go-to target





  ● ChunkManager H3 open-tail specialization › normalizes open tail and merges canonical open target





  ● ChunkManager H3 open-tail specialization › arms open strategy then rejects malformed target with no executable merged output





  ● ChunkManager H3 open-tail specialization › rejects app-like ambiguous open target as non-executable (text kind)





  ● ChunkManager H3 open-tail specialization › rejects malformed domain-like open target as non-executable (domain kind)





  ● ChunkManager H3 open-tail specialization › falls back to full finalize when open prefix is armed but transcript hint mismatches





  ● ChunkManager H3 open-tail specialization › selects open strategy only after atlas-backed geometric open prefix activation





FAIL src/test/audio/chunk-manager-h3-dynamic-precision.unit.spec.ts
  ● ChunkManager H3 dynamic precision evidence › emits bounded escalation pilot fields when repair and guardrail pressure are present





  ● ChunkManager H3 dynamic precision evidence › holds de-escalation during cooldown and then applies it after steady recovery





  ● ChunkManager H3 dynamic precision evidence › emits not-eligible dynamic precision fields when no family can be derived





FAIL src/test/audio/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts
  ● ChunkManager H3 multi-resolution atlas evidence › emits advisory multi-resolution atlas fields when focus-derived shard hint exists





  ● ChunkManager H3 multi-resolution atlas evidence › emits not-eligible multi-resolution atlas fields when no shard hint exists





  ● ChunkManager H3 multi-resolution atlas evidence › emits family-atlas routing metadata on lookup-completed evidence when provided





  ● ChunkManager H3 multi-resolution atlas evidence › emits prefix-band routing metadata on lookup-completed evidence when provided





  ● ChunkManager H3 multi-resolution atlas evidence › emits tail-strategy routing metadata on lookup-completed evidence when provided





FAIL src/test/audio/chunk-manager-h3-atlas-shard.unit.spec.ts
  ● ChunkManager H3 atlas shard evidence › carries advisory atlas shard hint metadata into runtime evidence





  ● ChunkManager H3 atlas shard evidence › emits null shard fields when no focus context envelope is attached





  ● ChunkManager H3 atlas shard evidence › passes advisory shard hint into lookup and emits shard ranking metadata





FAIL src/test/audio/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts
  ● ChunkManager H3 workflow candidate discovery evidence › emits workflow candidate discovery fields when a governed subsequence emerges





  ● ChunkManager H3 workflow candidate discovery evidence › does not advance workflow candidate discovery state on an ungranted semantic observation





FAIL src/test/audio/chunk-manager-h3-counterfactual-repair.unit.spec.ts
  ● ChunkManager H3 counterfactual repair evidence › emits candidate population and ambiguity pilot metadata when semantic result is present





  ● ChunkManager H3 counterfactual repair evidence › emits failure-observer placeholder fields on rejection path without semantic result





FAIL src/test/audio/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts
  ● ChunkManager H3 workflow skeleton inference evidence › emits fixed-step skeleton fields for an exact emerged family





  ● ChunkManager H3 workflow skeleton inference evidence › emits bounded variable-step skeleton fields when a second emerged family variant appears





FAIL src/test/audio/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts
  ● ChunkManager H3 workflow candidate scoring evidence › emits candidate scoring fields for an exact emerged family





  ● ChunkManager H3 workflow candidate scoring evidence › emits elevated abstraction risk when a second unstable family variant emerges





FAIL src/test/audio/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts
  ● ChunkManager H3 workflow candidate promotion evidence › emits rubric and promotion fields for an exact stable family





  ● ChunkManager H3 workflow candidate promotion evidence › routes split-required families to inbox promotion instead of higher states





FAIL src/test/audio/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts
  ● ChunkManager H3 workflow candidate timing and policy evidence › emits policy and timing fields for an exact stable family without regressing prior evidence families





FAIL src/test/audio/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts
  ● ChunkManager H3 workflow draft artifact evidence › emits draft and library API preview fields for an exact stable family





FAIL src/test/audio/chunk-manager-h4-live-mic-authority-entry.unit.spec.ts
  ● ChunkManager H4 live mic authority entry evidence › emits explicit live mic authority entry fields





FAIL src/test/audio/chunk-manager-h4-command-lane-authority-spine.unit.spec.ts
  ● ChunkManager H4 authority spine evidence › emits explicit authority-spine fields when a lawful final decision is present





FAIL src/test/audio/chunk-manager-h4-broad-runtime-authority.unit.spec.ts
  ● ChunkManager H4 broad runtime authority evidence › emits explicit broad runtime authority fields when the authority spine and H3/3J surfaces are integrated






Test Suites: 17 failed, 16 passed, 33 total
Tests:       54 failed, 106 passed, 160 total
Snapshots:   0 total
Time:        16.14 s
Ran all test suites matching /src\/test\/audio\/h4-broad-runtime-authority.unit.spec.ts|src\/test\/audio\/chunk-manager-h4-broad-runtime-authority.unit.spec.ts|src\/test\/audio\/h4-command-lane-authority-spine.unit.spec.ts|src\/test\/audio\/chunk-manager-h4-command-lane-authority-spine.unit.spec.ts|src\/test\/audio\/h4-live-mic-authority-entry.unit.spec.ts|src\/test\/audio\/chunk-manager-h4-live-mic-authority-entry.unit.spec.ts|src\/test\/audio\/workflow-draft-artifacts.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-draft-artifacts.unit.spec.ts|src\/test\/audio\/workflow-candidate-policy-timing.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-policy-timing.unit.spec.ts|src\/test\/audio\/workflow-candidate-rubrics.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-promotion.unit.spec.ts|src\/test\/audio\/workflow-candidate-scoring.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-scoring.unit.spec.ts|src\/test\/audio\/workflow-skeleton-inference.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-skeleton-inference.unit.spec.ts|src\/test\/audio\/workflow-candidate-discovery.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-candidate-discovery.unit.spec.ts|src\/test\/audio\/workflow-memory-observation.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-workflow-memory.unit.spec.ts|src\/test\/audio\/dynamic-precision-regimes.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-dynamic-precision.unit.spec.ts|src\/test\/audio\/counterfactual-repair-intelligence.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-counterfactual-repair.unit.spec.ts|src\/test\/audio\/multi-resolution-atlas.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-multi-resolution-atlas.unit.spec.ts|src\/test\/audio\/policy-shaped-atlas-shards.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-atlas-shard.unit.spec.ts|src\/test\/audio\/focus-conditioned-command-context.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-focus-context.unit.spec.ts|src\/test\/audio\/voice-semantic-address-registry.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-numeric-tail.unit.spec.ts|src\/test\/audio\/chunk-manager-h3-open-tail.unit.spec.ts/i.
```

---

## Gate 3
### Exact command (not run due stop-on-first-failure)
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro && conda run -n helios-gpu-118 python3 scripts/h3_stage3d2_validate_timing.py
```

### Full stdout
```text
```

### Full stderr
```text
```

---

## Commit and Push Status
- Docs apply commit (already pushed): `dd76aa7`
- Branch push: `feature/h4 -> origin/feature/h4`
- Status at S6 gates: Gate 2 failed; no runtime repair attempted in this docs-only slice.
