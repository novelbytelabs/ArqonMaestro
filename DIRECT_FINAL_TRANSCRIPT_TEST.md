# DIRECT_FINAL_TRANSCRIPT_TEST

## Step 1: H2.3 hard gate state
- `H23_HARD_GATE_NUMERIC=false` (observe mode, no hard block)

## Exact command/script used
```bash
cd /home/irbsurfer/Projects/arqon/ArqonMaestro/maestro/client
TS_NODE_PREFER_TS_EXTS=1 npx ts-node scripts/isolate_goto_line_failure.ts > /tmp/isolate_goto_line_failure.json
```

## Exact code path entered (direct final transcript path)
1. `scripts/isolate_goto_line_failure.ts` -> `runDirectFinalTranscriptTest("go to line fifty two")`
2. `Executor.postProcessResponse(...)`
3. `Executor.setExecuteToFirstAlternativeIfNeeded(...)`
4. `Executor.buildTranscriptFallbackCommands(...)`
5. `Executor.buildGoToLineFallbackCommands(...)`
6. `Executor.checkAuthorization(...)`
7. Command dispatch would call handler map (`COMMAND_TYPE_PRESS`, `COMMAND_TYPE_INSERT`, `COMMAND_TYPE_PRESS`) only if authorization allows.

## Parsed intent/result
Input transcript: `go to line fifty two`

Parsed command sequence:
1. `COMMAND_TYPE_PRESS` text=`g` modifiers=`["control"]`
2. `COMMAND_TYPE_INSERT` text=`52`
3. `COMMAND_TYPE_PRESS` text=`return`

## Execution authority result
- `authorized=false`
- `reason="Pilot mode: unknown speaker blocked immediately"`

## Activation/execution result
- Activation (`response.execute` present): **YES**
- Actual command execution/dispatch: **NO**
- Command invocations observed: `[]`

## Raw logs for this exact test
```text
[EXECUTOR_FALLBACK] synthesized commands for transcript="go to line fifty two"
[FP-2A] Authorizing: general/COMMAND_TYPE_PRESS risk=low
[FP-2A] Identity state: {"identityState":"unknown","confidence":"none","confidenceValue":0,"securityMode":"normal","sharedRoomMode":false,"contaminated":false,"isVerified":false,"isPrimaryOwner":false,"interactionMode":"command","identityEvidenceReady":true}
[FP-2A] Identity evidence: {"expectedIdentity":"n/a","observedIdentity":"unknown","confidenceValue":0,"trustState":"unknown"}
[FP-2A] Auth result: block - Pilot mode: unknown speaker blocked immediately
```
