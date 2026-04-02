# H3 Runtime Evidence Schema

Canonical fields:
- `event`
- `chunkId`
- `timestampMs`
- `source`
- `regionId`
- `commandClass`
- `hadTranscriptText`
- `transcriptText`
- `routeBefore`
- `routeAfter`
- `tailStartMs`
- `tailEndMs`
- `tailText`
- `mergedText`
- `stepCount`
- `finalGranted`
- `reason`

Target checkpoint chain:
1. `geometric_event_emitted`
2. `geometric_event_received`
3. `route_activation`
4. `tail_capture_started`
5. `tail_capture_completed`
6. `tail_decode_started`
7. `tail_decode_completed`
8. `merged_transcript_emitted`
9. `h23_trace_written`
10. `h24_proof_written`

Stage 3D3 confidence-policy evidence fields:
- `confidencePolicyVersion`
- `weakThreshold`
- `strongThreshold`
- `candidateAgeMs`
- `recentConflictPenaltyApplied`
- `staleProtectionApplied`

Stage 3E1 focus-context evidence fields:
- `focusRankingApplied`
- `focusRankingBoost`
- `focusRankingReasonCodes`
- `focusLegalityApplied`
- `focusLegalityLawful`
- `focusLegalityPenaltyApplied`
- `focusLegalityPenalty`
- `focusLegalityReasonCodes`
- `focusLegalityCommandKind`
- `focusContextSchemaVersion`
- `focusContextEligible`
- `focusSnapshotFresh`
- `focusAuthorityType`
- `focusAppId`
- `focusWindowId`
- `focusRegionId`
- `focusSubregionId`
- `focusControlId`
- `focusHasSelection`
- `focusSelectionTextLength`
- `focusCaretOffset`
- `focusSnapshotAgeMs`
- `focusConfidence`
- `focusRecentDeltaCount`
- `focusRecentTaskHistoryCount`
- `focusDeicticResolutionEligible`
- `focusRankingEligible`
- `focusLegalityEligible`
- `focusReasonCodes`

Stage 3E1-S2 is observational only. These fields may describe advisory focus context, but they may not authorize execution and may not bypass H23/H24.


Stage 3E1-S3 keeps focus-conditioned ranking advisory-only. Focus may reshape warm candidate ranking for bounded pilot families, but it may not authorize execution and may not bypass H23/H24.


Stage 3E1-S4 keeps deictic legality shaping advisory-only. Focus may penalize bounded deictic warm candidates such as `open it` and `go there` when the focus envelope is not lawful enough to resolve them, but focus may not authorize execution and may not bypass H23/H24.


## Stage 3E1 Slice S5 fields

Advisory workflow-momentum metadata carried through H3 lookup/warm/merged evidence:
- `focusTaskMomentumApplied`
- `focusTaskMomentumBoost`
- `focusTaskMomentumPenaltyApplied`
- `focusTaskMomentumPenalty`
- `focusTaskMomentumReasonCodes`
- `focusTaskMomentumMatchedSemanticAddressId`

These fields are advisory only. They do not authorize execution and do not bypass H23/H24.
