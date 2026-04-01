# Rail-ASR H3 validation report

## What ran in the sandbox

### 1. SpectralLift waveform demo

A 1-second synthetic 16kHz waveform was processed through the new SpectralLift implementation.

- samples: 16000
- lifted_frame_count: 99
- stft_bins: 160
- first_frame_timestamp_ms: 0.0
- first_frame_drho_len: 160
- first_frame_dtheta_len: 160

### 2. Standalone C++ smoketest

The new `spectral_lift.cpp` compiled as a standalone C++ program and produced:

- `frames=99 bins=160 first_ts_ms=0`

### 3. Bootstrap atlas lookup demo

Using the demo atlas and deterministic synthetic command waveforms:

- query `pause` best matched `pause`
- query `focus chrome` best matched `focus chrome`

### 4. H2.4 proof replay through the geometric governor

The replay summary was:

```json
[
  {
    "chunkId": "closed-focus-chrome-001",
    "granted": true,
    "reason": "passed",
    "commandClass": "closed_structure",
    "transcript": "<geometric:focus chrome>"
  },
  {
    "chunkId": "closed-new-tab-001",
    "granted": true,
    "reason": "passed",
    "commandClass": "closed_structure",
    "transcript": "<geometric:new tab>"
  },
  {
    "chunkId": "param-goto-line-001",
    "granted": true,
    "reason": "passed",
    "commandClass": "parameterized",
    "transcript": "go to line fifty two"
  },
  {
    "chunkId": "param-goto-wikipedia-001",
    "granted": true,
    "reason": "passed",
    "commandClass": "parameterized",
    "transcript": "go to wikipedia dot org"
  },
  {
    "chunkId": "reflex-pause-001",
    "granted": true,
    "reason": "passed",
    "commandClass": "reflex",
    "transcript": "<geometric:pause>"
  }
]
```

## Important limitation

The pybind extension build (`python setup.py build_ext --inplace`) could not be completed in this sandbox because the Python development headers (`Python.h`) are not installed for the container's Python runtime. The C++ code and pybind bindings were added to the pack, but the actual extension build remains a handoff integration step for a properly provisioned environment.
