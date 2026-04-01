import fs from "fs";
import path from "path";
import H23CommandGovernor from "./h23-command-governor";

interface ReplayCase {
  utterance_id?: string;
  expected_final?: string;
  partials?: string[];
  // Event format
  trace_name?: string;
  events?: any[];
}

function normalizeCase(input: any): ReplayCase[] {
  if (Array.isArray(input)) {
    return input;
  }
  
  // Handle full trace JSON from H23LiveTraceRecorder
  if (input.steps && Array.isArray(input.steps)) {
    return [{
      utterance_id: input.chunkId || "unknown",
      expected_final: input.steps[input.steps.length - 1]?.transcript || "",
      partials: input.steps.map((s: any) => s.transcript),
    }];
  }

  // Fallback/Legacy handling for synthetic traces
  if (input.events && Array.isArray(input.events)) {
    const chunkId = input.events.find((e: any) => e.type === "chunk_start")?.chunk_id || "unknown";
    const traceName = input.trace_name || "";
    
    let transcript = "unknown";
    if (traceName.includes("stop")) transcript = "stop";
    if (traceName.includes("focus_terminal")) transcript = "focus terminal";
    if (traceName.includes("goto_line_fifty_two")) transcript = "go to line fifty two";

    const partialEvents = input.events.filter((e: any) => e.type === "partial_update");
    
    // Simulate incremental growth for the replay only if we don't have real transcripts
    const partials = partialEvents.map((_: any, i: number) => {
      const words = transcript.split(" ");
      const take = Math.min(words.length, Math.floor(((i + 1) / partialEvents.length) * words.length) + 1);
      return words.slice(0, take).join(" ");
    });

    return [{
      utterance_id: chunkId,
      expected_final: transcript,
      partials,
    }];
  }
  return [];
}

function main(): void {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: ts-node src/main/runtime/h23-trace-replay.ts <cases.json>");
    process.exit(2);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
  const input = JSON.parse(raw);
  const cases = normalizeCase(input);
  const governor = new H23CommandGovernor();

  const results = cases.map((testCase) => {
    let commitStep: number | null = null;
    const chunkId = testCase.utterance_id || "unknown";
    const partials = testCase.partials || [];
    const stepDetails: any[] = [];
    
    for (let i = 0; i < partials.length; i += 1) {
      const isFinalStep = i === partials.length - 1;
      const step = governor.observe({
        chunkId,
        transcript: partials[i],
        stepIndex: i + 1,
        timestampMs: (i + 1) * 40,
        isFinalStep,
      });
      
      stepDetails.push({
        stepIndex: step.stepIndex,
        transcript: step.transcript,
        isFinalStep: step.isFinalStep,
        structuralPrefix: step.structuralPrefix,
        structurallyStable: step.structurallyStable,
        slotSignature: step.slotSignature,
        slotStable: step.slotStable,
        slotFinalized: step.slotFinalized,
        executionEligible: step.executionEligible,
        granted: step.granted,
        reason: step.reason,
      });

      if (commitStep == null && step.granted) {
        commitStep = i + 1;
      }
    }
    const trace = governor.getTrace(chunkId);
    const final = trace[trace.length - 1];
    governor.reset(chunkId);
    return {
      utterance_id: chunkId,
      commit_step: commitStep,
      final_execution_authority: final?.granted ? "granted" : "refused",
      final_policy_reason: final?.reason ?? null,
      final_finalization_reason: final?.finalizationReason ?? null,
      final_transcript: final?.normalizedTranscript ?? null,
      expected_final: testCase.expected_final,
      steps: stepDetails,
    };
  });

  console.log(JSON.stringify(results, null, 2));
}

main();
