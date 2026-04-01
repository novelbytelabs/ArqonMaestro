# H3 Command Atlas v1 Spec

Schema id: `h3_command_atlas_v1`

## Top-Level Shape

```json
{
  "schema_version": "h3_command_atlas_v1",
  "build": {
    "atlas_version": "2026-04-01T00:00:00Z",
    "built_at": "2026-04-01T00:00:00Z",
    "builder": "tools/h3_atlas_v1.py",
    "sample_rate_hz": 16000,
    "window_ms": 20,
    "hop_ms": 10
  },
  "commands": [
    {
      "command_id": "reflex.pause",
      "region_id": "pause",
      "command_class": "reflex",
      "parameter_type": null,
      "centroid_words": [123, 456],
      "feature_dim": 320,
      "capture_radius": 10,
      "min_frames": 2,
      "activation_threshold": 0.12,
      "stability_threshold": 0.78,
      "fallback_eligible": true,
      "enrollment": {
        "sample_count": 6,
        "sample_ids": ["pause_001", "pause_002"]
      }
    }
  ]
}
```

## Required Fields

Top-level:
- `schema_version`
- `build`
- `commands`

Per-command:
- `command_id`
- `region_id`
- `command_class`: `reflex | closed_structure | parameterized | unknown`
- `centroid_words` (packed uint64 words as JSON numbers)
- `feature_dim`
- `capture_radius`
- `min_frames`
- `activation_threshold`
- `stability_threshold`
- `fallback_eligible`

## Semantics

- `region_id` is the runtime identifier emitted in geometric events.
- `command_class` drives routing policy.
- `activation_threshold` is the minimum confidence for event emission.
- `stability_threshold` is metadata for downstream stability policy.
- `capture_radius` is the within-class distance budget used by enrollment validation tooling.
- `fallback_eligible` indicates if legacy text fallback is permitted after region activation.

## Compatibility

- v1 runtime loaders may support legacy bootstrap atlas as explicit fallback only.
- v1 should be treated as canonical for Stage 3A+ live runtime.
