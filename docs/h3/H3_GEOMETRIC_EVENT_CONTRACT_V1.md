# H3 Geometric Event Contract v1

Contract id: `h3_geometric_event_v1`

## Event Payload

```json
{
  "source": "spectral_manifold",
  "region_id": "go to line",
  "command_class": "parameterized",
  "confidence": 0.84,
  "frame_count": 9,
  "timestamp_ms": 412,
  "atlas_version": "2026-04-01T00:00:00Z",
  "activation_threshold": 0.12,
  "stability_threshold": 0.78,
  "fallback_eligible": true
}
```

## Required Fields

- `source` (must be `spectral_manifold`)
- `region_id`
- `command_class`
- `confidence` (`0.0 .. 1.0`)
- `frame_count` (`>= 0`)
- `timestamp_ms` (stream-relative ms)

## Optional but Recommended Fields

- `atlas_version`
- `activation_threshold`
- `stability_threshold`
- `fallback_eligible`

## Lifecycle Semantics

1. Sidecar emits events when region confidence and min-frames constraints pass.
2. Provider receives and forwards events to chunk manager.
3. Chunk manager uses command class + region to activate route:
   - `geometric_only` for reflex / closed-structure
   - `geometric_prefix_asr_tail` for parameterized prefix classes
4. Event evidence is recorded across emitted/received/route/tail/h23/h24 chain.

## Failure/Abort Semantics

- If confidence < `activation_threshold`, no event should be emitted.
- If `frame_count < min_frames`, no event should be emitted.
- Route transitions may downgrade only when policy allows; parameterized tail route should remain stable until finalize once activated.
