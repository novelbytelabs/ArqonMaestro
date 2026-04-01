# H3 Stage 2 Rollback / Recovery Note

## Immediate Fallback Controls
- Disable geometric path: `H3_GEOMETRIC_ENABLED=false`
- Disable Parakeet command lane if needed: `MAESTRO_ENABLE_PARAKEET_COMMAND_LANE=0`
- Force legacy lane: `MAESTRO_FORCE_LEGACY_COMMAND_LANE=1`

## Recovery Procedure
1. Disable H3 geometric flag.
2. Restart sidecar + Maestro client.
3. Verify baseline command flow on legacy path.
4. Re-enable features one at a time for isolation.

## Sensitive Files
- `maestro/client/src/main/stream/chunk-manager.ts`
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`
- `maestro/client/src/main/stt/sidecars/parakeet_sidecar.py`
- `maestro/client/src/main/runtime/h3-geometric-command-governor.ts`
