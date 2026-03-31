# FINAL_ONLY_LIVE_PATH_TEST

## Step 1: H2.3 hard gate state
- `H23_HARD_GATE_NUMERIC=false` (observe mode, no hard block)

## Exact command/script used
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client
TS_NODE_PREFER_TS_EXTS=1 npx ts-node scripts/isolate_goto_line_failure.ts > /tmp/isolate_goto_line_failure.json
```

## Exact final-only live boundary tested
- Entry boundary used: `Stream.onTextCommandsResponse(...)`
- Input mode: final-only transcript (no microphone, no partials)
- Transcript: `go to line fifty two`
- Chunk ID: `chunk-final-only-goto-line-52`

## Exact event sequence (with chunkId)
1. `h23_start_chunk` — chunkId=`chunk-final-only-goto-line-52`
2. `h23_record_final` — chunkId=`chunk-final-only-goto-line-52`, transcript=`go to line fifty two`, decisionGranted=`true`, reason=`passed`
3. `stream_on_text_response_enter` — chunkId=`chunk-final-only-goto-line-52`
4. `executor_post_process_enter` — chunkId=`chunk-final-only-goto-line-52`
5. `executor_post_process_exit` — chunkId=`chunk-final-only-goto-line-52`, executePresent=`true`, parsedCommands=`PRESS(g), INSERT(52), PRESS(return)`
6. `executor_execute_enter` — chunkId=`chunk-final-only-goto-line-52`
7. `executor_authorization` — chunkId=`chunk-final-only-goto-line-52`, authorized=`false`, reason=`Pilot mode: unknown speaker blocked immediately`
8. `executor_commands_not_dispatched` — chunkId=`chunk-final-only-goto-line-52`
9. `stream_on_text_response_exit` — chunkId=`chunk-final-only-goto-line-52`
10. `h23_latest_decision` — chunkId=`chunk-final-only-goto-line-52`, granted=`true`, reason=`passed`, commandClass=`parameterized`
11. `h23_finalize_chunk` — chunkId=`chunk-final-only-goto-line-52`, outfile=`/home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client/artifacts/reports/h23_live_traces/chunk-final-only-goto-line-52.json`

## Final transcript seen by H2.3
- `go to line fifty two`

## H2.3 decision
- `granted=true`
- `reason="passed"`
- `commandClass="parameterized"`
- `numericEndpointRequired=true`

## Executor decision
- Parsed/activated execute commands: **YES**
- Authorization: **BLOCKED** (`authorized=false`)
- Block reason: `Pilot mode: unknown speaker blocked immediately`

## Did the command execute?
- **NO** (no command dispatch due authorization block)

## Raw logs for this exact test
```text
[EXECUTOR_FALLBACK] synthesized commands for transcript="go to line fifty two"
[FP-2A] Authorizing: general/COMMAND_TYPE_PRESS risk=low
[FP-2A] Identity state: {"identityState":"unknown","confidence":"none","confidenceValue":0,"securityMode":"normal","sharedRoomMode":false,"contaminated":false,"isVerified":false,"isPrimaryOwner":false,"interactionMode":"command","identityEvidenceReady":true}
[FP-2A] Identity evidence: {"expectedIdentity":"n/a","observedIdentity":"unknown","confidenceValue":0,"trustState":"unknown"}
[FP-2A] Auth result: block - Pilot mode: unknown speaker blocked immediately
```
