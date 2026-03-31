# ASR Sidecar Installation Guide

## Environment Architecture

This guide documents the explicit separation between Maestro core runtime and ASR sidecar services.

### Runtime Separation

| Component | Environment | Purpose |
|-----------|-------------|---------|
| **Maestro Core** | `helios-gpu-118` (frozen) | Main application, UI, command routing |
| **ASR Sidecars** | `helios-asr-isolated` | Parakeet, Qwen3 inference (protobuf 5.x) |

### Why Separate Environments?

- **Core constraint**: `protobuf==4.25.8` is locked in `helios-gpu-118`
- **ASR requirement**: `nemo-toolkit` + `vllm[audio]` require `protobuf 5.x`
- **Solution**: Process isolation via separate conda environment

---

## Installation Steps

### 1. Create Isolated Environment

```bash
cd maestro/client/src/main/stt/sidecars
./setup_isolated_env.sh all
```

This will:
- Create `helios-asr-isolated` conda environment
- Install Python dependencies (torch, nemo, vllm)
- Setup model directories at `~/models/arqon/asr/`

### 2. Download ASR Models

```bash
./download_models.sh all
```

Models will be downloaded to:
- Parakeet: `~/models/arqon/asr/parakeet-tdt-0.6b-v3/`
- Qwen3: `~/models/arqon/asr/qwen3-asr-1.7b/`

### 3. Start Sidecar Services

```bash
# Start all sidecars
./sidecar_manager.sh start all

# Or start individually
./sidecar_manager.sh start parakeet
./sidecar_manager.sh start qwen3
```

### 4. Verify Services

```bash
# Check status
./sidecar_manager.sh status

# Run preflight checks
./sidecar_manager.sh preflight all

# Test health
./sidecar_manager.sh test parakeet
./sidecar_manager.sh test qwen3
```

---

## Sidecar Management Commands

| Command | Description |
|---------|-------------|
| `./sidecar_manager.sh preflight <target>` | Run preflight checks (CUDA, imports, model path, port) |
| `./sidecar_manager.sh warmup <target>` | Warmup sidecar for low-latency first utterance |
| `./sidecar_manager.sh start <target>` | Start sidecar(s) |
| `./sidecar_manager.sh stop <target>` | Stop sidecar(s) |
| `./sidecar_manager.sh restart <target>` | Restart sidecar(s) |
| `./sidecar_manager.sh status` | Show status of all sidecars |
| `./sidecar_manager.sh test <target>` | HTTP health check |
| `./sidecar_manager.sh reap` | Reap zombie processes |

**Targets**: `parakeet`, `qwen3`, `all`

---

## Preflight Checks

The `preflight` command validates:

1. **Conda environment exists**: `helios-asr-isolated`
2. **CUDA visibility**: `torch.cuda.is_available()`
3. **Python imports**: `nemo` (Parakeet), `vllm` (Qwen3)
4. **Model path exists**: Directory containing model weights
5. **Port availability**: No other process using port 5001/5002

Example output:
```
[INFO] Running preflight checks for parakeet...
[INFO] Checking conda environment 'helios-asr-isolated'...
✓ Environment 'helios-asr-isolated' exists
[INFO] Checking CUDA availability...
✓ CUDA available
[INFO] Checking Python imports...
✓ nemo available
[INFO] Checking model path: /home/irbsurfer/models/arqon/asr/parakeet-tdt-0.6b-v3...
✓ Model path exists
[INFO] Checking port 5001 availability...
✓ Port 5001 available
[INFO] ✓ Preflight checks passed for parakeet
```

---

## Warmup (Low-Latency First Utterance)

Sidecars preload models at boot and stay resident. Use `warmup` to ensure the first user utterance has no cold-start penalty:

```bash
./sidecar_manager.sh warmup parakeet
./sidecar_manager.sh warmup qwen3
```

This sends a silent audio payload to initialize model inference pipeline.

---

## Troubleshooting

### Sidecar won't start

1. Run preflight: `./sidecar_manager.sh preflight all`
2. Check logs: `tail -f /tmp/parakeet_sidecar.log`
3. Verify model path: `ls -la ~/models/arqon/asr/`

### Port in use

```bash
# Find process using port
lsof -i :5001
# or
netstat -tuln | grep 5001
```

### Model not found

```bash
# Re-download models
./download_models.sh all
```

---

## Fallback Mode

If sidecars are unavailable, Maestro falls back to:

- **Command lane**: `faster-whisper` (via Python bridge)
- **Dictation lane**: System whisper.cpp or faster-whisper

The sidecar_manager.sh health checks (`./sidecar_manager.sh test`) can be used to detect degraded mode.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PARAKEET_PORT` | 5001 | Parakeet sidecar HTTP port |
| `QWEN3_PORT` | 5002 | Qwen3 sidecar HTTP port |
| `MODEL_BASE` | `~/models/arqon/asr/` | Base path for model storage |

---

## Verification Commands for Watchdog

```bash
# 1. Verify isolated env exists (NOT helios-gpu-118)
conda env list | grep helios-asr-isolated

# 2. Verify no protobuf conflict
conda run -n helios-gpu-118 pip show protobuf | grep Version
conda run -n helios-asr-isolated pip show protobuf | grep Version

# 3. Verify sidecars are running
./sidecar_manager.sh status

# 4. Verify health
./sidecar_manager.sh test parakeet
./sidecar_manager.sh test qwen3

# 5. Verify preflight passes
./sidecar_manager.sh preflight all
```

Expected results:
- `helios-gpu-118` protobuf version: 4.25.8
- `helios-asr-isolated` protobuf version: 5.x
- Both sidecars: RUNNING + health OK
- Preflight: all checks passed
