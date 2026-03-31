import fs from "fs";
import path from "path";
import H23CommandGovernor from "./h23-command-governor";

interface ReplayCase {
  utterance_id: string;
  expected_final: string;
  partials: string[];
}

function main(): void {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("usage: ts-node src/main/runtime/h23-trace-replay.ts <cases.json>");
    process.exit(2);
  }

  const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
  const cases = JSON.parse(raw) as ReplayCase[];
  const governor = new H23CommandGovernor();

  const results = cases.map((testCase) => {
    let commitStep: number | null = null;
    const chunkId = testCase.utterance_id;
    for (let i = 0; i < testCase.partials.length; i += 1) {
      const step = governor.observe({
        chunkId,
        transcript: testCase.partials[i],
        stepIndex: i + 1,
        timestampMs: (i + 1) * 40,
        isFinalStep: i === testCase.partials.length - 1,
      });
      if (commitStep == null && step.granted) {
        commitStep = i + 1;
      }
    }
    const trace = governor.getTrace(chunkId);
    const final = trace[trace.length - 1];
    governor.reset(chunkId);
    return {
      utterance_id: testCase.utterance_id,
      commit_step: commitStep,
      final_execution_authority: final?.granted ? "granted" : "refused",
      final_policy_reason: final?.reason ?? null,
      final_finalization_reason: final?.finalizationReason ?? null,
      final_transcript: final?.normalizedTranscript ?? null,
      expected_final: testCase.expected_final,
    };
  });

  console.log(JSON.stringify(results, null, 2));
}

main();
