# H24 Audit Map - File-by-File Architecture

This document explains, file by file, how chunkId/sessionId flows through the system, where command classes are recognized, where H2.3 decision summaries are produced, and where traces/evidence are written.

## 1. chunkId/SessionId Creation

### Where Created
- **`maestro/client/src/main/stream/chunk-manager.ts`** (line ~1807)
  - In `onChunkStart()` method:
  ```typescript
  const id = uuid();
  this.chunkQueue.add(id);
  ```
  - chunkId is created via `uuid()` when a new chunk starts (speech detected)

### Where Preserved
1. **`maestro/client/src/main/stream/stream.ts`** (line ~397)
   - Endpoint request carries chunkId:
   ```typescript
   this.send(this.coreSocket, {
     endpointRequest: { chunkId, finalize, endpointId },
   });
   ```

2. **`maestro/client/src/main/stt/parakeet-command-fast-provider.ts`** (line ~546-548)
   - WebSocket stream initialization includes chunkId:
   ```typescript
   h23Recorder.startChunk(chunkId);
   ```

3. **`maestro/client/src/main/stream/chunk-manager.ts`** (line ~1592)
   - Passed to runtime command dispatcher:
   ```typescript
   this.runtimeCommandDispatcher.emitNormalizedCommands(finalResponse, sessionId)
   ```

## 2. Partials Entry Point

### Where Partials Enter the System

1. **`maestro/client/src/main/stt/parakeet-command-fast-provider.ts`** (line ~621-625)
   - WebSocket partial callback:
   ```typescript
   if (onPartial && response.text) {
     h23StepIndex += 1;
     const step = h23Recorder.recordPartial(chunkId, response.text, h23StepIndex);
     onPartial(response.text);
   }
   ```

2. **`maestro/client/src/main/stream/chunk-manager.ts`** (line ~1659-1661)
   - Audio frames buffered:
   ```typescript
   const frameBuffer = Buffer.from(audio.buffer, audio.byteOffset || 0, audio.byteLength);
   this.chunkAudioFrames.get(current.id)?.push(frameBuffer);
   ```

3. **`maestro/client/src/main/stream/stream.ts`** (line ~188-216)
   - Commands response handling in WebSocket:
   ```typescript
   if (response.commandsResponse) {
     this.onCommandsResponse(chunkManager, response.commandsResponse);
   }
   ```

## 3. Final-Step / Endpoint Closure Determination

### Where Determined
1. **`maestro/client/src/main/stt/parakeet-command-fast-provider.ts`** (line ~600-618)
   - Sidecar final detection:
   ```typescript
   if (response.is_final) {
     h23StepIndex += 1;
     const finalStep = h23Recorder.recordFinal(chunkId, response.text, h23StepIndex);
     // ...
   }
   ```

2. **`maestro/client/src/main/stream/chunk-manager.ts`** (line ~1762-1785)
   - `onChunkEnd()` triggers finalization:
   ```typescript
   async onChunkEnd() {
     this.speaking = false;
     this.enqueueFinalEndpointOnce(current.id);
   }
   ```

3. **`maestro/client/src/main/runtime/h23-command-governor.ts`** (line ~106-128)
   - `slotFinalized` computed in governor:
   ```typescript
   const slotFinalized = commandClass === "reflex" || commandClass === "closed_structure"
     ? true
     : numericEndpointRequired
       ? Boolean(input.isFinalStep && structurallyStable && slotClosed && slotStable)
       : false;
   ```

## 4. Command Class Recognition

### Where Command Classes Are Recognized
1. **`maestro/client/src/main/runtime/h23-command-governor.ts`** (line ~214-227)
   - `classifyCommandText()` method:
   ```typescript
   private classifyCommandText(t: string): H23CommandClass {
     if (["stop", "cancel", "mute"].includes(t)) return "reflex";
     if (["focus terminal", "delete previous token", "focus editor", "delete previous word"].includes(t)) {
       return "closed_structure";
     }
     if (t.startsWith("go to line") || t.startsWith("switch tab") || t.startsWith("scroll down")) {
       return "parameterized";
     }
     return "unknown";
   }
   ```

2. **`maestro/client/src/main/runtime/h23-command-governor.ts`** (line ~100)
   - Called during observe:
   ```typescript
   const commandClass = this.classifyCommandText(normalizedTranscript);
   ```

## 5. H2.3 Decision Summaries Production

### Where H23 Decision Summaries Are Produced

1. **`maestro/client/src/main/runtime/h23-live-trace-recorder.ts`** (line ~76-87)
   - `getLatestDecision()` method:
   ```typescript
   getLatestDecision(chunkId: string): H23DecisionSummary | null {
     const trace = this.governor.getTrace(chunkId);
     if (trace.length === 0) return null;
     const step = trace[trace.length - 1];
     return {
       chunkId,
       commandClass: step.commandClass,
       granted: step.granted,
       reason: step.reason,
       numericEndpointRequired: step.numericEndpointRequired,
     };
   }
   ```

2. **`maestro/client/src/main/runtime/h23-command-governor.ts`** (line ~155-181)
   - Full H23TraceStep produced on each observe call

3. **`maestro/client/src/main/runtime/h23-live-trace-recorder.ts`** (line ~89-111)
   - `finalizeChunk()` produces final JSON:
   ```typescript
   finalizeChunk(chunkId: string): H23FinalizeResult {
     const trace = this.governor.getTrace(chunkId);
     const finalStep = trace.length > 0 ? trace[trace.length - 1] : null;
     // Write JSON to artifacts/reports/h23_live_traces/
   }
   ```

## 6. Executor Consumes H23 Summaries

### Where Executor Consumes Decisions
1. **`maestro/client/src/main/execute/executor.ts`** (line ~1533-1536)
   - H23 lookup in execute flow:
   ```typescript
   const chunkId = response.chunkId || "";
   this.log?.logVerbose(`[Executor] executing response for chunkId: "${chunkId}"`);
   const h23Decision = h23Recorder.getLatestDecision(chunkId);
   ```

2. **`maestro/client/src/main/execute/executor.ts`** (line ~1544-1550)
   - Decision consumption:
   ```typescript
   if (h23Decision) {
     this.log.logVerbose(`[H23 decision] chunkId=${h23Decision.chunkId} commandClass=${h23Decision.commandClass} granted=${h23Decision.granted} reason=${h23Decision.reason}`);
     shouldBlock = hardGateNumeric && h23Decision.commandClass === "parameterized" && h23Decision.numericEndpointRequired === true && h23Decision.granted !== true;
   }
   ```

3. **`maestro/client/src/main/execute/executor.ts`** (line ~1826-1828)
   - Finalization after execution:
   ```typescript
   if (response.chunkId) {
     h23Recorder.finalizeChunk(response.chunkId);
   }
   ```

## 7. Dispatch Occurs

### Where Dispatch Happens
1. **`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`** (line ~355-692)
   - `dispatch()` method routes commands:
   ```typescript
   async dispatch(response: core.ICommandsResponse, options: DispatchOptions): Promise<void> {
     const plan = this.plan(response, sessionId);
     // Policy decision
     const policyDecision = this.policyService.decide(plan.route, plan.dominantFamily, policyContext);
     // Execute based on route
     if (plan.route === "reflex_local" || plan.route === "composite_local" || ...) {
       await this.executorPort.executeLocalRoute(response, updateRenderer);
     }
   }
   ```

2. **`maestro/client/src/main/execute/executor.ts`** (line ~1468-1830)
   - `execute()` method performs actual command execution:
   ```typescript
   async execute(response: core.ICommandsResponse, updateRenderer: boolean = true, selectedAlternativeIndex: number = 0) {
     // Authorization check
     // H23 gate check
     // Lifecycle state
     // Plugin forwarding decision
     // Command dispatch loop
   }
   ```

## 8. Plugin Forwarding Can Interfere

### Where Plugin Forwarding Decision Is Made
1. **`maestro/client/src/main/execute/executor.ts`** (line ~1607-1659)
   - Several checks disable plugin forwarding:
   ```typescript
   // Focus commands go local (line ~1627-1634)
   if (response.execute.commands.some((command) => command.type === core.CommandType.COMMAND_TYPE_FOCUS)) {
     forwardToPlugin = false;
   }
   // Press/Insert chains go local (line ~1641-1656)
   if (response.execute.commands.some((command) => command.type === core.CommandType.COMMAND_TYPE_PRESS || command.type === core.CommandType.COMMAND_TYPE_INSERT)) {
     forwardToPlugin = false;
   }
   ```

2. **`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`** (line ~597-612)
   - Route-based local execution decision:
   ```typescript
   if (plan.route === "reflex_local" || plan.route === "composite_local" || ...) {
     await this.executorPort.executeLocalRoute(response, updateRenderer);
   }
   ```

## 9. Traces/Evidence Are Written

### Where Traces and Evidence Are Written

1. **`maestro/client/src/main/runtime/h23-live-trace-recorder.ts`** (line ~89-111)
   - H23 trace JSON written to:
   ```typescript
   const outfile = path.join(this.outputDir, `${chunkId}.json`);
   // Default: artifacts/reports/h23_live_traces/
   fs.writeFileSync(outfile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
   ```

2. **`maestro/client/src/main/execute/executor.ts`** (line ~1475-1482)
   - Console trace markers:
   ```typescript
   console.log(`[EXEC_TRACE] stage chunkId="${response.chunkId || ""}" name="after_h23_lookup"`);
   console.log(`[EXEC_TRACE] stage chunkId="${response.chunkId || ""}" name="after_h23_block_check"`);
   ```

3. **`maestro/client/src/main/runtime/execution-trace.ts`** (line ~192-245)
   - ExecutionTrace emits structured events:
   ```typescript
   private emit(event: string, state: TraceState) {
     this.log.logVerbose(`[ExecutionTrace] ${JSON.stringify({...})}`);
   }
   ```

4. **`maestro/client/src/main/runtime/runtime-command-dispatcher.ts`** (line ~449-471)
   - Phase3B audit recording:
   ```typescript
   phase3BReplayAuditService.recordDispatchDecision({...});
   ```

## Decision Continuity Summary

```
chunkId created → passed through stream → recorded in H23LiveTraceRecorder
                    → consumed in Executor.execute() → trace written to artifacts/
                    
sessionId created → passed to RuntimeCommandDispatcher → used for audit records
```

## Key Files for H2.4 Implementation

| File | Purpose |
|------|---------|
| `h23-command-governor.ts` | Command class gating logic - MODIFY for early execution |
| `h23-live-trace-recorder.ts` | Decision continuity - ADD new trace fields |
| `executor.ts` | Policy consumption - ADD class-aware early execution |
| `parakeet-command-fast-provider.ts` | STT integration - ADD partial execution triggers |
| `runtime-command-dispatcher.ts` | Dispatch routing - ADD class-aware routes |
| `execution-trace.ts` | Evidence recording - ADD policy decision proof |