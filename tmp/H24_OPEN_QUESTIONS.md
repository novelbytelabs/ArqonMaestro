# H24 Open Questions and Risks

This document lists honest open questions, known risks, and potential issues for H2.4 implementation.

## 1. Missing-Decision Paths Still Possible

### Risk: H23 Decision Not Present at Execution Time

**Scenario**: A command arrives at executor but no H23 decision exists in the recorder.

**Current Mitigation** (executor.ts line ~1551-1564):
```typescript
if (h23Decision) {
  // Use decision
} else if (hardGateNumeric) {
  // Observe-only fallback for numeric-looking commands
  const transcript = response.execute?.transcript?.toLowerCase() || "";
  const looksNumeric = transcript.includes("line") || transcript.includes("tab") || ...;
  if (looksNumeric) {
    console.log(`[EXEC_TRACE] h23_missing_decision_observe_only ...`);
  }
}
```

**H2.4 Question**: Should we hard-fail when decision is missing, or maintain observe-only behavior?

### Risk: chunkId Mismatch Between STT and Executor

**Scenario**: The chunkId from Parakeet stream may not match the chunkId in the CommandsResponse from the backend.

**Current Behavior**: H23 recorder uses chunkId from Parakeet stream; executor uses chunkId from CommandsResponse.

**H2.4 Question**: Do we need to add explicit chunkId validation/correlation check?

## 2. Queue/FIFO Chunk Correlation Risks

### Risk: Chunk Ordering in Queue

**Scenario**: Multiple chunks can be in flight simultaneously. If chunk N+1 finalizes before chunk N, decisions may be correlated incorrectly.

**Current Code** (chunk-manager.ts):
```typescript
this.chunkQueue.add(id);  // New chunk added at end
// Audio frames buffered in map by chunkId
this.chunkAudioFrames.get(current.id)?.push(frameBuffer);
```

**H2.4 Question**: Should we add ordering validation to ensure decisions correlate with correct chunk?

### Risk: Parallel Provider Finalization

**Scenario**: Both Parakeet and Qwen3 can finalize chunks. If both attempt to record H23 decisions for same chunkId, data may be corrupted.

**Current Code** (chunk-manager.ts line ~1035-1106):
```typescript
if (request.chunkId && this.chunkUseParakeetCommandFast.get(request.chunkId)) {
  const handled = await this.handleParakeetFinalize(request.chunkId);
  // ...
}
```

**H2.4 Question**: Should we add mutual exclusion or deterministic ordering between providers?

## 3. Observe-Only Behavior Masks Missing Policy Decisions

### Current Behavior

When `H23_HARD_GATE_NUMERIC` is NOT set to `true`:
- H23 decisions are recorded but NOT used to block execution
- Commands execute regardless of H23 policy decision
- This is "observe-only" mode

**H2.4 Question**: How do we prove the policy layer is controlling execution vs. accidental fallthrough?

### Risk: Environment Flag Dependency

The entire H23 gating behavior depends on `H23_HARD_GATE_NUMERIC` environment variable:
- Without flag: observe-only (no blocking)
- With flag: strict blocking for parameterized commands

**H2.4 Question**: Should H2.4 make this the default behavior, or keep it flag-gated?

## 4. Known Difference Between Replay and Live Behavior

### H23 Trace Replay vs Live

**Replay** (h23-trace-replay.ts):
- Simulates incremental transcript growth
- May not match actual partial transcript timing
- Uses synthetic partials if real ones not available:
  ```typescript
  const partials = partialEvents.map((_: any, i: number) => {
    const words = transcript.split(" ");
    const take = Math.min(words.length, Math.floor(((i + 1) / partialEvents.length) * words.length) + 1);
    return words.slice(0, take).join(" ");
  });
  ```

**Live**:
- Real partials from Parakeet WebSocket
- Actual timing reflects ASR processing

**H2.4 Question**: Should replay be updated to use real partial transcripts, or is synthetic acceptable for validation?

## 5. Hacks, Assumptions, and Fragile Logic

### Hack 1: Transcript Normalization

**Location**: h23-command-governor.ts line ~99
```typescript
const normalizedTranscript = input.transcript.trim().toLowerCase();
```

**Issue**: Simple lowercase normalization may not handle:
- Contractions ("don't" vs "dont")
- Punctuation ("stop!" vs "stop")
- Unicode variations

**H2.4 Question**: Should we use more robust normalization?

### Hack 2: Hardcoded Command List

**Location**: h23-command-governor.ts line ~215-227
```typescript
if (["stop", "cancel", "mute"].includes(t)) return "reflex";
if (["focus terminal", "delete previous token", "focus editor", "delete previous word"].includes(t)) {
  return "closed_structure";
}
```

**Issue**: Command list is hardcoded. Adding new commands requires code changes.

**H2.4 Question**: Should we use a configuration-driven approach?

### Hack 3: Slot Signature Comparison

**Location**: h23-command-governor.ts line ~267-278
```typescript
private slotSignatureFromSlots(slots: Record<string, unknown>): string | null {
  switch (slots.command_family) {
    case "goto_line":
      return slots.line_number != null ? `goto_line:${String(slots.line_number)}` : null;
    // ...
  }
}
```

**Issue**: String-based slot signature may be fragile if value formats change.

**H2.4 Question**: Should we use structural comparison instead of string signature?

### Hack 4: Fallback Execution on Missing H23

**Location**: executor.ts line ~1551-1564
```typescript
if (h23Decision) {
  // Use decision
} else if (hardGateNumeric) {
  // Observe-only, no blocking
}
```

**Issue**: If H23 decision is missing AND hardGateNumeric=true, we only observe, don't block. This may allow commands that should be blocked.

**H2.4 Question**: Should we fail-closed (block) when decision is missing?

### Hack 5: Numeric Endpoint Detection

**Location**: h23-command-governor.ts line ~284-289
```typescript
private numericPhraseNonExpandableHint(slots: Record<string, unknown>): boolean {
  const raw = String(slots.line_number_raw ?? slots.tab_number_raw ?? slots.count_raw ?? "").trim().toLowerCase();
  if (!raw) return false;
  const lastToken = raw.split(/\s+/).pop() ?? "";
  return !EXPANDABLE_NUMBER_TAIL_WORDS.has(lastToken);
}
```

**Issue**: Only checks last token. "fifty two" → "two" is not expandable, but "twenty" alone is.

**H2.4 Question**: Should this check the entire phrase, not just last token?

## 6. Missing Coverage Areas

### Area 1: No Test for Race Condition

**Missing**: What happens if chunk ends and new chunk starts before H23 finalize?

### Area 2: No Test for Provider Failover

**Missing**: What happens if Parakeet fails and falls back to endpoint mid-chunk?

### Area 3: No Test for Concurrent Chunks

**Missing**: What happens with 2+ chunks in flight, decisions cross-correlated?

## 7. Environment-Specific Considerations

### Flag: H23_HARD_GATE_NUMERIC
- Default: not set (observe-only)
- For H2.4: likely needs to be default true

### Flag: MAESTRO_ENABLE_PARAKEET_COMMAND_LANE
- Default: "1" (enabled)
- H2.4: Should remain enabled for class-aware early execution

### Flag: MAESTRO_FORCE_LEGACY_COMMAND_LANE
- Default: not set
- H2.4: Should not be used if H2.4 features needed

## 8. Questions for H2.4 Implementation

1. **When** should reflex commands become eligible? (Current: immediate upon structural stability)
2. **When** should closed-structure commands become eligible? (Current: after 2 structural matches)
3. **When** should parameterized commands become eligible? (Current: at final endpoint only)
4. **How** do we prove policy layer is controlling timing vs. accidental fallthrough?
5. **How** do we measure class-aware early execution vs. endpoint-only behavior?
6. **Should** we fail-closed on missing decisions, or maintain observe-only?

## 9. Recommended Actions for H2.4

1. Add explicit decision-present vs. decision-absent trace markers
2. Add timing measurement for each command class execution eligibility
3. Add correlation validation between chunkId and decision
4. Consider fail-closed default for missing decisions
5. Add synthetic test cases for race conditions