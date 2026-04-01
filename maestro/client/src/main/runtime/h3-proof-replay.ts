declare const require: any;
declare const process: any;
declare const __dirname: string;

const fs = require("fs");
const path = require("path");
import H3GeometricCommandGovernor from "./h3-geometric-command-governor";

interface ProofArtifact {
  chunkId: string;
  h23Trace: Array<{
    stepIndex: number;
    timestampMs: number;
    transcript: string;
    isFinalStep?: boolean;
  }>;
}

function regionForTranscript(transcript: string): { regionId: string | null; tail?: string } {
  const t = transcript.trim().toLowerCase();
  if (t === "pause") return { regionId: "pause" };
  if (t === "focus chrome") return { regionId: "focus chrome" };
  if (t === "new tab") return { regionId: "new tab" };
  if (t.startsWith("go to line ")) return { regionId: "go to line", tail: t.slice("go to line".length).trim() };
  if (t === "go to line") return { regionId: "go to line" };
  if (t.startsWith("go to ")) return { regionId: "go to", tail: t.slice("go to".length).trim() };
  if (t === "go to") return { regionId: "go to" };
  return { regionId: null };
}

function replayArtifact(filePath: string) {
  const artifact = JSON.parse(fs.readFileSync(filePath, "utf8")) as ProofArtifact;
  const governor = new H3GeometricCommandGovernor();
  const replay = artifact.h23Trace.map((step, idx) => {
    const region = regionForTranscript(step.transcript);
    const commandish = region.regionId !== null;
    const isFinalStep = Boolean(step.isFinalStep ?? idx === artifact.h23Trace.length - 1);
    const out = governor.observe({
      chunkId: artifact.chunkId,
      stepIndex: step.stepIndex,
      timestampMs: step.timestampMs,
      isFinalStep,
      regionId: region.regionId,
      regionScore: commandish ? 0.92 : 0.30,
      driftScore: commandish ? 0.08 : 0.40,
      velocityConverged: commandish ? (isFinalStep || step.timestampMs >= 80 || region.regionId === "pause") : false,
      frameCount: Math.max(1, Math.round(step.timestampMs / 10)),
      transcriptTail: region.tail,
      acousticConfidence: commandish ? 0.95 : 0.2,
    });
    return out;
  });
  return {
    chunkId: artifact.chunkId,
    replay,
    finalDecision: replay[replay.length - 1],
  };
}

function main() {
  const artifactsDir = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../h24_proof_artifacts");

  const files = fs
    .readdirSync(artifactsDir)
    .filter((name: string) => name.endsWith(".json"))
    .sort();

  const results = files.map((name: string) => replayArtifact(path.join(artifactsDir, name)));
  const summary = results.map((r: any) => ({
    chunkId: r.chunkId,
    granted: r.finalDecision.granted,
    reason: r.finalDecision.reason,
    commandClass: r.finalDecision.commandClass,
    transcript: r.finalDecision.transcript,
  }));

  console.log(JSON.stringify({ summary, results }, null, 2));
}

main();
