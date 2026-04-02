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
