# Piper TTS Installation (Direct CLI)

Piper is integrated into Arqon Maestro as a resilient fallback service. Unlike Kokoro, which runs as a FastAPI sidecar, Piper is invoked directly as a CLI binary from the `helios-gpu-118` environment.

## Installation Steps

### 1. Model Preparation
Download the Piper voice model and config to the local models directory:

```bash
mkdir -p ~/models/arqon/tts/piper
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/hfc_female/medium
curl -L -o ~/models/arqon/tts/piper/en_US-hfc_female-medium.onnx "${BASE}/en_US-hfc_female-medium.onnx?download=true"
curl -L -o ~/models/arqon/tts/piper/en_US-hfc_female-medium.onnx.json "${BASE}/en_US-hfc_female-medium.onnx.json?download=true"
```

### 2. Environment Setup
Install `piper-tts` and its phonemization dependencies into the `helios-gpu-118` conda environment.

```bash
conda run -n helios-gpu-118 pip install piper-tts==1.4.1 pathvalidate==3.3.1 piper-phonemize==1.1.0
```

> [!NOTE]
> This installation does NOT upgrade frozen dependencies like `protobuf`.

### 3. Verification
Run a smoke test to ensure synthesis works:

```bash
echo "Focus chrome" | conda run -n helios-gpu-118 python3 -m piper --model ~/models/arqon/tts/piper/en_US-hfc_female-medium.onnx --output_raw | aplay -q -f S16_LE -r 22050 -c 1 -t raw
```

## Configuration

Settings are managed in `Settings` class and persisted in `~/.arqon/settings.json`:

- `arqon_tts_piper_model_path`: Path to the `.onnx` model.
- `arqon_tts_piper_conda_env`: Conda environment containing piper package (`helios-gpu-118`).
- `arqon_tts_provider`: Set to `kokoro` (Piper will be used as fallback if enabled).
- `arqon_tts_kokoro_fallback_enabled`: Must be `true` for auto-fallback to Piper.
