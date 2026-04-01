#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROOFS_DIR="$ROOT_DIR/artifacts/reports/h24_policy_proofs"
OUT_BASE="$ROOT_DIR/artifacts/reports/h3_regression"
TS="$(date +%Y%m%d_%H%M%S)"
OUT_JSON="$OUT_BASE/benchmark_first_pass_${TS}.json"
OUT_MD="$OUT_BASE/benchmark_first_pass_${TS}.md"
mkdir -p "$OUT_BASE"

node - "$PROOFS_DIR" "$OUT_JSON" "$OUT_MD" <<'NODE'
const fs = require("fs");
const path = require("path");

const proofsDir = process.argv[2];
const outJson = process.argv[3];
const outMd = process.argv[4];

const files = fs
  .readdirSync(proofsDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (files.length === 0) {
  throw new Error(`No proof artifacts found in ${proofsDir}`);
}

function bucketForCommandClass(commandClass) {
  if (commandClass === "reflex") return "reflex";
  if (commandClass === "closed_structure") return "closed_structure";
  if (commandClass === "parameterized_numeric" || commandClass === "parameterized_open") {
    return "parameterized";
  }
  return "unknown";
}

const rows = files.map((name) => {
  const artifact = JSON.parse(fs.readFileSync(path.join(proofsDir, name), "utf8"));
  return {
    file: name,
    transcript: artifact.transcript,
    commandClass: artifact.commandClass,
    bucket: bucketForCommandClass(artifact.commandClass),
    firstStructuralStableAtMs: artifact.firstStructuralStableAtMs ?? null,
    firstGrantedAtMs: artifact.firstGrantedAtMs ?? null,
    endpointAtMs: artifact.endpointAtMs ?? null,
    observedExecutionAtMs: artifact.observedExecutionAtMs ?? null,
    policyGranted: Boolean(artifact.policyGranted),
    matchedRecommendedGate: Boolean(artifact.matchedRecommendedGate),
  };
});

function summarizeBucket(bucketName) {
  const items = rows.filter((r) => r.bucket === bucketName);
  const avg = (key) => {
    const vals = items.map((i) => i[key]).filter((v) => typeof v === "number");
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  return {
    count: items.length,
    avgFirstStructuralStableAtMs: avg("firstStructuralStableAtMs"),
    avgFirstGrantedAtMs: avg("firstGrantedAtMs"),
    avgEndpointAtMs: avg("endpointAtMs"),
    avgObservedExecutionAtMs: avg("observedExecutionAtMs"),
    allPolicyGranted: items.every((i) => i.policyGranted),
    allMatchedRecommendedGate: items.every((i) => i.matchedRecommendedGate),
  };
}

const summary = {
  generatedAt: new Date().toISOString(),
  source: proofsDir,
  rows,
  buckets: {
    reflex: summarizeBucket("reflex"),
    closed_structure: summarizeBucket("closed_structure"),
    parameterized: summarizeBucket("parameterized"),
  },
};

fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));

const md = [];
md.push(`# H3 Benchmark First Pass (${path.basename(outJson, ".json")})`);
md.push("");
md.push("Source: `artifacts/reports/h24_policy_proofs`");
md.push("");
md.push("## Bucket Summary");
md.push("| Bucket | Count | Avg stable (ms) | Avg granted (ms) | Avg endpoint (ms) | Avg execution (ms) | All granted | Gate match |");
md.push("|---|---:|---:|---:|---:|---:|---|---|");
for (const key of ["reflex", "closed_structure", "parameterized"]) {
  const b = summary.buckets[key];
  const fmt = (v) => (v == null ? "n/a" : `${v.toFixed(1)}`);
  md.push(`| ${key} | ${b.count} | ${fmt(b.avgFirstStructuralStableAtMs)} | ${fmt(b.avgFirstGrantedAtMs)} | ${fmt(b.avgEndpointAtMs)} | ${fmt(b.avgObservedExecutionAtMs)} | ${b.allPolicyGranted} | ${b.allMatchedRecommendedGate} |`);
}
md.push("");
md.push("## Per-Artifact");
for (const row of rows) {
  md.push(`- ${row.file}: class=${row.commandClass}, execution=${row.observedExecutionAtMs}ms, granted=${row.policyGranted}`);
}
md.push("");
md.push("## Notes");
md.push("- This first pass uses proof artifacts (replay/recorded evidence), not a fresh live-mic run.");
md.push("- Suitable for Stage 2.5 stabilization trend tracking; follow-up live benchmark pass remains recommended.");

fs.writeFileSync(outMd, md.join("\n") + "\n");
NODE

echo "Benchmark outputs:"
echo "  $OUT_JSON"
echo "  $OUT_MD"
