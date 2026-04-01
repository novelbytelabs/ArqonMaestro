import fs from "fs";
import path from "path";
import H23CommandGovernor from "./h23-command-governor";
import { H24ExecutionClass } from "./h24-policy-proof-recorder";

interface ReplayArtifact {
  chunkId?: string;
  steps?: Array<{
    transcript: string;
    timestampMs?: number;
    isFinalStep?: boolean;
  }>;
}

function classifyTranscript(transcript: string): H24ExecutionClass {
  const t = transcript.trim().toLowerCase();
  if (["stop", "cancel", "mute", "pause"].includes(t)) return "reflex";
  if (["focus terminal", "focus chrome", "focus code", "focus editor", "new tab", "delete previous token", "delete previous word"].includes(t)) {
    return "closed_structure";
  }
  if (t.startsWith("go to line") || t.startsWith("switch tab") || t.startsWith("scroll down")) {
    return "parameterized_numeric";
  }
  if (t.startsWith("go to ") || t.startsWith("open ")) return "parameterized_open";
  return "unknown";
}

function main(): void {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: ts-node src/main/runtime/h24-trace-replay.ts <trace.json>");
    process.exit(2);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
  const input = JSON.parse(raw) as any;
  const steps: any[] = input.steps ?? input.h23Trace ?? [];
  if (steps.length === 0) {
    console.error("no steps found in artifact");
    process.exit(3);
  }

  const governor = new H23CommandGovernor();
  const chunkId = input.chunkId ?? "unknown";
  const replayed = steps.map((step: any, index: number) =>
    governor.observe({
      chunkId,
      transcript: step.transcript,
      stepIndex: index + 1,
      timestampMs: step.timestampMs ?? (index + 1) * 40,
      isFinalStep: step.isFinalStep ?? index === steps.length - 1,
    }),
  );

  const finalStep = replayed[replayed.length - 1];
  const firstStable = replayed.find((step: any) => step.structurallyStable)?.timestampMs ?? null;
  const firstGranted = replayed.find((step: any) => step.granted)?.timestampMs ?? null;
  const endpoint = finalStep?.timestampMs ?? null;

  const summary = {
    chunkId,
    transcript: finalStep?.transcript ?? "",
    commandClass: classifyTranscript(finalStep?.transcript ?? ""),
    firstStructuralStableAtMs: firstStable,
    firstGrantedAtMs: firstGranted,
    endpointAtMs: endpoint,
    finalGranted: finalStep?.granted ?? false,
    finalReason: finalStep?.reason ?? null,
    finalizationReason: finalStep?.finalizationReason ?? null,
    stepCount: replayed.length,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
