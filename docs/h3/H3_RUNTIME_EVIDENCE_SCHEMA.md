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
