# MANIFEST

This bundle preserves repo-relative structure and includes the smallest practical live command-lane slice for Parakeet + policy/evidence harnessing.

## Included groups

1. Audio ingress and streaming path
- `maestro/client/src/main/stream/{microphone.ts,chunk-queue.ts,chunk-manager.ts,stream.ts}`
- `maestro/client/src/main/audio/{vad-provider.ts,silero-vad-provider.ts}`
- `maestro/client/src/main/stt/{bus-client.ts,envelopes.ts}`

Why: captures microphone ingest, chunk lifecycle, endpointing, and partial/final event movement.

2. Parakeet integration
- `maestro/client/src/main/stt/parakeet-command-fast-provider.ts`
- `maestro/client/src/main/stt/parakeet_bridge.py`
- `maestro/client/src/main/stt/sidecars/{parakeet_sidecar.py,sidecar_manager.sh,INSTALL.md}`
- `maestro/client/src/main/stt/index.ts`
- `maestro/client/src/main/settings.ts`

Why: full command-lane provider wiring, sidecar execution path, and config.

3. Command lane evaluation and authority/policy path
- `maestro/client/src/main/execute/{executor.ts,command-handler.ts,native-commands.ts}`
- `maestro/client/src/main/runtime/{authorization-service.ts,actuation-policy-service.ts,intent-routing-service.ts,runtime-command-dispatcher.ts,runtime-command-emitter.ts,command-response-service.ts,focus-authority-service.ts,security-session-policy-service.ts,security-policy-effective-state.ts,execution-trace.ts,transcript-response-observer.ts,nexus-protocol-boundary-service.ts,stt-routing-service.ts,workflow-contract-service.ts,focus-transfer-contract.ts}`

Why: parser/intent mapping, authority and policy enforcement, emit/dispatch path, evidence trace hooks.

4. Entrypoints and smoke/regression scripts
- `maestro/scripts/run_client.sh`
- `maestro/scripts/regression_parakeet_contracts.sh`
- `maestro/scripts/regression_voice_command_lane.sh`
- `maestro/client/scripts/qwen3_smoke.sh` (existing smoke script for local sidecar script conventions)
- `maestro/client/package.json`
- `maestro/client/jest.config.js`

Why: shows current launch/run path and existing regression touchpoints.

5. Schemas and typed contracts
- `maestro/toolbelt/src/main/proto/{core.proto,grammar.proto,speech-engine.proto,code-engine.proto}`
- `maestro/client/src/gen/{core.d.ts,core.js}`
- `maestro/client/src/main/stt/envelopes.ts`
- `maestro/core/src/main/resources/{CommandLexer.g4,CommandParser.g4}`
- `maestro/core/src/main/java/core/parser/{Grammar.java,GrammarNode.java,GrammarParser.java,GrammarAntlrParser.java,CommandAntlrParser.java}`
- `maestro/core/src/main/java/core/evaluator/TranscriptParser.java`
- `maestro/core/src/main/java/core/server/StreamSocket.java`
- `maestro/core/src/main/java/core/streaming/{StreamManager.java,AudioManager.java,SilenceDeterminer.java}`

Why: protocol and grammar contracts plus backend parser/streaming boundary components.

6. Tests that touch command-lane inference
- `maestro/client/src/test/audio/parakeet-command-fast-provider.unit.spec.ts`
- `maestro/client/src/test/audio/chunk-manager-command-lane-routing.unit.spec.ts`
- `maestro/client/src/test/audio/voice-command-regression.unit.spec.ts`
- `maestro/client/test-intent-routing-smoke.ts`

Why: directly validates command-lane routing/parakeet behavior and command regression baselines.

7. Live traces
- `trace_reflex_stop.json`
- `trace_closed_focus_terminal.json`
- `trace_param_goto_line_fifty_two.json`

Why: starter artifacts with ordered partial/final lifecycle events for harness wiring.
