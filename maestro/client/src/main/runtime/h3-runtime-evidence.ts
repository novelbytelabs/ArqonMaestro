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
