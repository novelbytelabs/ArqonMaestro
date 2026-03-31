# H24 Baseline Freeze State

## Repository Information

- **Repo Path**: `/home/irbsurfer/Projects/arqon/ArqonMaestro`
- **Branch**: `feature/meastro-features`
- **Current Commit**: `3442a91` (HEAD)
- **Working Tree Status**: Clean (no uncommitted changes)

## Commit History for H2.3 Baseline

The H2.3 (H23) command governance policy was introduced at commit:

- **H23 Baseline Commit**: `5207061` - "feat(h23): integrate H2.3 command governance policy with strict chunk correlation and parameterized finalization fix"

From `5207061` to current HEAD (`3442a91`), the following live-command area files were modified:

```
5207061 - feat(h23): integrate H2.3 command governance policy
ba32496 - feat: harden H2.3 integration with fail-closed gating
b4cac51 - docs(reports): add H2.3 milestone freeze-state technote
3442a91 - test: lock go-to-line execution and h23 fail-loud regression
```

## Files Modified in Live-Command Area

### Core H23 Files
- `maestro/client/src/main/runtime/h23-command-governor.ts` - Command class gating logic
- `maestro/client/src/main/runtime/h23-live-trace-recorder.ts` - Decision continuity recorder
- `maestro/client/src/main/runtime/h23-trace-replay.ts` - Trace replay for validation

### Integration Points
- `maestro/client/src/main/execute/executor.ts` - H23 policy integration in execution flow
- `maestro/client/src/main/stream/stream.ts` - Trace recording triggers
- `maestro/client/src/main/stream/chunk-manager.ts` - Command lane routing

### STT Provider Integration
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts` - H23 recording on partial/final

### Test Files
- `maestro/client/src/test/audio/h23-command-governor.unit.spec.ts` - Governor unit tests
- `maestro/client/src/test/audio/parakeet-command-fast-provider.unit.spec.ts` - Provider tests
- `maestro/scripts/regression_voice_command_lane.sh` - Regression script

### Evidence/Trace Artifacts
- `maestro/client/traces/trace_reflex_stop.json` - Reflex trace (stop command)
- `maestro/client/traces/trace_closed_focus_terminal.json` - Closed-structure trace (focus terminal)
- `maestro/client/traces/trace_param_goto_line_fifty_two.json` - Parameterized trace (go to line fifty two)
- `maestro/client/traces/h23_evidence_goto_line_52.json` - Full H23 evidence JSON

## Exact Commands for Current Validation

### Running H23 Unit Tests
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client
npx jest --config jest.config.js --runInBand src/test/audio/h23-command-governor.unit.spec.ts
```

### Running Regression Suite
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro
bash scripts/regression_voice_command_lane.sh
```

### Running Trace Replay
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client
npx ts-node src/main/runtime/h23-trace-replay.ts <path-to-trace-json>
```

## Exact Flags for H2.3 Experimentation

### Enable H23 Hard Gating for Parameterized Commands
```bash
export H23_HARD_GATE_NUMERIC=true
```

### Enable Parakeet Command Lane (default)
```bash
export MAESTRO_ENABLE_PARAKEET_COMMAND_LANE=1
```

### Disable Parakeet (fallback to Whisper)
```bash
export MAESTRO_ENABLE_PARAKEET_COMMAND_LANE=0
```

### Force Legacy Command Lane
```bash
export MAESTRO_FORCE_LEGACY_COMMAND_LANE=1
```

## Artifact Output Paths

### H23 Trace JSON Files
- **Directory**: `artifacts/reports/h23_live_traces/`
- **Pattern**: `{chunkId}.json`
- **Example**: `artifacts/reports/h23_live_traces/cf8fb3c9-753c-4fc9-8584-cadcfe0b481d.json`

### Execution Trace Logs
- **Location**: Console output with `[EXEC_TRACE]` prefix
- **Stage Markers**: `after_h23_lookup`, `after_h23_block_check`, etc.

### Live Trace Artifacts
- **Directory**: `maestro/client/traces/`
- **Files**: `trace_*.json`, `h23_evidence_*.json`

## Baseline Verification

The H2.3 baseline was verified via:

1. **Unit Tests**: All H23Governor tests pass
2. **Regression Script**: Voice command lane tests pass
3. **Live Evidence**: Real traces captured for:
   - Reflex: `stop` command → granted immediately
   - Closed-structure: `focus terminal` → granted after structural stability
   - Parameterized: `go to line fifty two` → granted at final endpoint only

## Freeze Timestamp

- **Captured At**: 2026-03-31T23:45:00 UTC-4:00
- **Git Commit**: `3442a91`
- **Status**: Ready for H2.4 implementation