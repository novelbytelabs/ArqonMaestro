import fs from "fs";
import path from "path";

export interface H3RuntimeEvidenceEvent {
  event: string;
  chunkId: string;
  timestampMs: number;
  source: string | null;
  regionId: string | null;
  commandClass: string | null;
  hadTranscriptText: boolean | null;
  transcriptText: string | null;
  routeBefore: string | null;
  routeAfter: string | null;
  tailStartMs: number | null;
  tailEndMs: number | null;
  tailText: string | null;
  mergedText: string | null;
  stepCount: number | null;
  finalGranted: boolean | null;
  reason: string | null;
  parameterType: string | null;
  numericRaw: string | null;
  numericNormalized: string | null;
  numericParseConfidence: number | null;
  numericStrategyVersion: string | null;
  openRaw: string | null;
  openNormalized: string | null;
  openParseConfidence: number | null;
  openStrategyVersion: string | null;
  openTargetKind: string | null;
  semanticAddressId: string | null;
  canonicalMergedText: string | null;
  slotSignature: string | null;
  atlasVersion: string | null;
  lookupCandidateCount: number | null;
  bestCandidateId: string | null;
  bestCandidateScore: number | null;
  warmHitClass: string | null;
  governanceRequired: boolean | null;
  governanceQualified: boolean | null;
  h23StepCount: number | null;
  h24FinalGranted: boolean | null;
  successCount: number | null;
  warmApplied: boolean | null;
  warmAppliedStage: string | null;
  warmDiscardReason: string | null;
  liveEvidenceOverride: boolean | null;
  lookupPath: string | null;
}

const h3EvidenceDir = path.resolve(process.cwd(), "artifacts/reports/h3_runtime_evidence");
const h3EvidenceFile = path.join(h3EvidenceDir, "events.ndjson");
const pendingLines: string[] = [];
let flushScheduled = false;
let writeInFlight = false;

function buildDefaultEvent(input: Partial<H3RuntimeEvidenceEvent>): H3RuntimeEvidenceEvent {
  return {
    event: input.event ?? "unknown",
    chunkId: input.chunkId ?? "unknown",
    timestampMs: input.timestampMs ?? Date.now(),
    source: input.source ?? null,
    regionId: input.regionId ?? null,
    commandClass: input.commandClass ?? null,
    hadTranscriptText: input.hadTranscriptText ?? null,
    transcriptText: input.transcriptText ?? null,
    routeBefore: input.routeBefore ?? null,
    routeAfter: input.routeAfter ?? null,
    tailStartMs: input.tailStartMs ?? null,
    tailEndMs: input.tailEndMs ?? null,
    tailText: input.tailText ?? null,
    mergedText: input.mergedText ?? null,
    stepCount: input.stepCount ?? null,
    finalGranted: input.finalGranted ?? null,
    reason: input.reason ?? null,
    parameterType: input.parameterType ?? null,
    numericRaw: input.numericRaw ?? null,
    numericNormalized: input.numericNormalized ?? null,
    numericParseConfidence: input.numericParseConfidence ?? null,
    numericStrategyVersion: input.numericStrategyVersion ?? null,
    openRaw: input.openRaw ?? null,
    openNormalized: input.openNormalized ?? null,
    openParseConfidence: input.openParseConfidence ?? null,
    openStrategyVersion: input.openStrategyVersion ?? null,
    openTargetKind: input.openTargetKind ?? null,
    semanticAddressId: input.semanticAddressId ?? null,
    canonicalMergedText: input.canonicalMergedText ?? null,
    slotSignature: input.slotSignature ?? null,
    atlasVersion: input.atlasVersion ?? null,
    lookupCandidateCount: input.lookupCandidateCount ?? null,
    bestCandidateId: input.bestCandidateId ?? null,
    bestCandidateScore: input.bestCandidateScore ?? null,
    warmHitClass: input.warmHitClass ?? null,
    governanceRequired: input.governanceRequired ?? null,
    governanceQualified: input.governanceQualified ?? null,
    h23StepCount: input.h23StepCount ?? null,
    h24FinalGranted: input.h24FinalGranted ?? null,
    successCount: input.successCount ?? null,
    warmApplied: input.warmApplied ?? null,
    warmAppliedStage: input.warmAppliedStage ?? null,
    warmDiscardReason: input.warmDiscardReason ?? null,
    liveEvidenceOverride: input.liveEvidenceOverride ?? null,
    lookupPath: input.lookupPath ?? null,
  };
}

export function emitH3RuntimeEvidence(input: Partial<H3RuntimeEvidenceEvent>): H3RuntimeEvidenceEvent {
  const event = buildDefaultEvent(input);
  const line = JSON.stringify(event);
  console.log(`[H3_EVIDENCE] ${line}`);
  enqueueEvidenceLine(`${line}\n`);
  return event;
}

function enqueueEvidenceLine(line: string): void {
  pendingLines.push(line);
  if (flushScheduled) {
    return;
  }
  flushScheduled = true;
  setTimeout(() => {
    flushScheduled = false;
    void flushEvidenceLines();
  }, 0);
}

async function flushEvidenceLines(): Promise<void> {
  if (writeInFlight || pendingLines.length === 0) {
    return;
  }
  writeInFlight = true;
  const payload = pendingLines.splice(0, pendingLines.length).join("");
  try {
    await fs.promises.mkdir(h3EvidenceDir, { recursive: true });
    await fs.promises.appendFile(h3EvidenceFile, payload, "utf8");
  } catch {
    // Best-effort telemetry write only; runtime behavior must remain unchanged.
  } finally {
    writeInFlight = false;
    if (pendingLines.length > 0) {
      void flushEvidenceLines();
    }
  }
}
