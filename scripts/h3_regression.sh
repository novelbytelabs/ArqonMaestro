#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/maestro/client"
PROOFS_DIR="$ROOT_DIR/artifacts/reports/h24_policy_proofs"
OUT_BASE="$ROOT_DIR/artifacts/reports/h3_regression"
TS="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$OUT_BASE/run_${TS}"
mkdir -p "$OUT_DIR/h24_replay"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 2
fi

if [ ! -d "$PROOFS_DIR" ]; then
  echo "missing proofs directory: $PROOFS_DIR" >&2
  exit 2
fi

pushd "$CLIENT_DIR" >/dev/null

echo "[H3 regression] replaying H3 proof artifacts..."
npx ts-node src/main/runtime/h3-proof-replay.ts "$PROOFS_DIR" > "$OUT_DIR/h3_proof_replay.json"

echo "[H3 regression] replaying H24 traces..."
for f in "$PROOFS_DIR"/*.json; do
  base="$(basename "$f" .json)"
  npx ts-node src/main/runtime/h24-trace-replay.ts "$f" > "$OUT_DIR/h24_replay/${base}.json"
done

cat > "$OUT_DIR/negative_case.json" <<'JSON'
{
  "chunkId": "negative-noise-001",
  "steps": [
    { "transcript": "hello there how are you", "timestampMs": 40, "isFinalStep": true }
  ]
}
JSON
npx ts-node src/main/runtime/h24-trace-replay.ts "$OUT_DIR/negative_case.json" > "$OUT_DIR/h24_replay/negative-noise-001.json"

cat > "$OUT_DIR/near_miss_case.json" <<'JSON'
{
  "chunkId": "near-miss-001",
  "steps": [
    { "transcript": "go too lime fifty two", "timestampMs": 40, "isFinalStep": true }
  ]
}
JSON
npx ts-node src/main/runtime/h24-trace-replay.ts "$OUT_DIR/near_miss_case.json" > "$OUT_DIR/h24_replay/near-miss-001.json"

popd >/dev/null

echo "[H3 regression] validating results..."
node - "$OUT_DIR" "$ROOT_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");

const outDir = process.argv[2];
const root = process.argv[3];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function check(condition, name, detail, failures, passes) {
  if (condition) {
    passes.push({ name, detail });
  } else {
    failures.push({ name, detail });
  }
}

const failures = [];
const passes = [];

const h3Replay = readJson(path.join(outDir, "h3_proof_replay.json"));
const summaryByChunk = new Map((h3Replay.summary || []).map((r) => [r.chunkId, r]));

check(summaryByChunk.get("reflex-pause-001")?.granted === true, "reflex positive", "reflex-pause-001 granted=true", failures, passes);
check(summaryByChunk.get("closed-focus-chrome-001")?.granted === true, "closed-structure positive (focus chrome)", "closed-focus-chrome-001 granted=true", failures, passes);
check(summaryByChunk.get("closed-new-tab-001")?.granted === true, "closed-structure positive (new tab)", "closed-new-tab-001 granted=true", failures, passes);
check(summaryByChunk.get("param-goto-line-001")?.granted === true, "parameterized positive (line)", "param-goto-line-001 granted=true", failures, passes);
check(summaryByChunk.get("param-goto-wikipedia-001")?.granted === true, "parameterized positive (url)", "param-goto-wikipedia-001 granted=true", failures, passes);

const neg = readJson(path.join(outDir, "h24_replay", "negative-noise-001.json"));
check(neg.finalGranted === false, "negative/noise case", "negative-noise-001 finalGranted=false", failures, passes);

const nearMiss = readJson(path.join(outDir, "h24_replay", "near-miss-001.json"));
check(nearMiss.finalGranted === false, "near-miss non-trigger case", "near-miss-001 finalGranted=false", failures, passes);

const chunkManagerPath = path.join(root, "maestro/client/src/main/stream/chunk-manager.ts");
const chunkManager = fs.readFileSync(chunkManagerPath, "utf8");
check(chunkManager.includes("if (!this.h3GeometricEnabled)"), "H3-off safety guard", "chunk-manager has H3 disabled guard", failures, passes);
check(chunkManager.includes('this.chunkH3Route.set(id, "legacy_text")'), "H3-off route baseline", "chunk start resets to legacy_text", failures, passes);

const providerPath = path.join(root, "maestro/client/src/main/stt/parakeet-command-fast-provider.ts");
const provider = fs.readFileSync(providerPath, "utf8");
[
  "geometric_event_emitted",
  "geometric_event_received",
].forEach((eventName) => {
  check(provider.includes(eventName), `evidence instrumentation: ${eventName}`, "provider emits event", failures, passes);
});

const chunkEvents = [
  "route_activation",
  "tail_capture_started",
  "tail_capture_completed",
  "tail_decode_started",
  "tail_decode_completed",
  "merged_transcript_emitted",
];
chunkEvents.forEach((eventName) => {
  check(chunkManager.includes(eventName), `evidence instrumentation: ${eventName}`, "chunk manager emits event", failures, passes);
});

const h23RecorderPath = path.join(root, "maestro/client/src/main/runtime/h23-live-trace-recorder.ts");
const h24RecorderPath = path.join(root, "maestro/client/src/main/runtime/h24-policy-proof-recorder.ts");
check(fs.readFileSync(h23RecorderPath, "utf8").includes("h23_trace_written"), "evidence instrumentation: h23_trace_written", "H23 recorder emits event", failures, passes);
check(fs.readFileSync(h24RecorderPath, "utf8").includes("h24_proof_written"), "evidence instrumentation: h24_proof_written", "H24 recorder emits event", failures, passes);

const status = failures.length === 0 ? "PASS" : "FAIL";
const payload = { status, checkedAt: new Date().toISOString(), passes, failures };
fs.writeFileSync(path.join(outDir, "regression_results.json"), JSON.stringify(payload, null, 2));

const lines = [];
lines.push(`# H3 Regression Run ${path.basename(outDir)}`);
lines.push("");
lines.push(`Status: **${status}**`);
lines.push("");
lines.push("## Passed Checks");
for (const p of passes) {
  lines.push(`- [x] ${p.name}: ${p.detail}`);
}
lines.push("");
lines.push("## Failed Checks");
if (failures.length === 0) {
  lines.push("- none");
} else {
  for (const f of failures) {
    lines.push(`- [ ] ${f.name}: ${f.detail}`);
  }
}
lines.push("");
lines.push("## Outputs");
lines.push(`- h3 replay: \`${path.join(outDir, "h3_proof_replay.json")}\``);
lines.push(`- h24 replay dir: \`${path.join(outDir, "h24_replay")}\``);
lines.push(`- machine results: \`${path.join(outDir, "regression_results.json")}\``);
fs.writeFileSync(path.join(outDir, "run.md"), lines.join("\n") + "\n");

if (status !== "PASS") {
  process.exit(1);
}
NODE

echo "[H3 regression] complete: $OUT_DIR/run.md"
