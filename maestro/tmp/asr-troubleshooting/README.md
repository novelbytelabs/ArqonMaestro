# ASR Troubleshooting Packet

This directory is a focused repro packet for the Maestro dictation-lane failure path.

It exists to answer one question clearly:

Can this machine load and use the local `arqon-maestro-asr-0.6b` base model plus the promoted LoRA adapter?

## What this packet checks

1. Exact path and environment assumptions used by the current Maestro bridge.
2. Bridge silence preflight behavior.
3. Bridge transcription behavior on a real benchmark WAV.
4. Direct adapter-aware loading against the local base model + adapter.

## Files

- `repro_qwen3_adapter.py`
- `repro_qwen3_adapter.sh`

## Usage

From the repo root:

```bash
bash maestro/tmp/asr-troubleshooting/repro_qwen3_adapter.sh
```

## Expected outcomes

- `bridge_silence_preflight` should return structured JSON, even if the transcript is empty.
- `bridge_real_audio` should produce a non-empty transcript for `test_michael.wav`.
- `direct_adapter_load` should confirm the base model and adapter are both loadable.

## Important note

This packet is intentionally narrow. It is for dictation-lane debugging, not command-lane architecture validation.
