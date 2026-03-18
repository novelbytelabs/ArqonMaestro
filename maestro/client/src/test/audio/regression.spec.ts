import path from "path";
import vm from "vm";
import { execSync } from "child_process";
import ts from "typescript";
import { SpeechRecorder } from "../../main/audio/index";
import { runRecorderScenario } from "./helpers/recorder-harness";
import { buildRegressionFixtures } from "./helpers/pcm-fixtures";

const BASELINE_COMMIT = "a05bf45";

type ModuleExports = Record<string, unknown>;
type RecorderConstructor = new (...args: unknown[]) => SpeechRecorder;

interface FixtureComparison {
  fixture: string;
  baseline: string;
  current: string;
  expected: string;
}

function gitShow(filePath: string): string {
  return execSync(`git show ${BASELINE_COMMIT}:${filePath}`, { encoding: "utf8" }).toString();
}

function pathExistsInCommit(filePath: string): boolean {
  try {
    execSync(`git cat-file -e ${BASELINE_COMMIT}:${filePath}`, {
      stdio: "ignore",
    });
    return true;
  } catch (_error) {
    return false;
  }
}

function transpileTs(source: string, fileName: string): string {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  }).outputText;
}

function evaluateCommonJs(
  source: string,
  fileName: string,
  requireImpl: (id: string) => unknown,
): ModuleExports {
  const module = { exports: {} as ModuleExports };
  const wrapped = `(function (require, module, exports, __filename, __dirname) { ${source}\n })`;
  const script = new vm.Script(wrapped, { filename: fileName });
  const fn = script.runInThisContext() as (
    require: (id: string) => unknown,
    module: { exports: ModuleExports },
    exports: ModuleExports,
    __filename: string,
    __dirname: string,
  ) => void;

  fn(requireImpl, module, module.exports, fileName, path.dirname(fileName));
  return module.exports;
}

function loadBaselineRecorderCtor(): RecorderConstructor {
  const indexPath = "maestro/client/src/main/audio/index.ts";
  const denoisePath = "maestro/client/src/main/audio/denoise-provider.ts";
  const vadPath = "maestro/client/src/main/audio/vad-provider.ts";

  if (!pathExistsInCommit(denoisePath) || !pathExistsInCommit(vadPath)) {
    const indexOnlyExports = evaluateCommonJs(
      transpileTs(gitShow(indexPath), "baseline-audio-index.ts"),
      "baseline-audio-index.js",
      (id) => require(id),
    );

    const baselineCtor = indexOnlyExports.SpeechRecorder;
    if (typeof baselineCtor !== "function") {
      throw new Error("Failed to load baseline index-only SpeechRecorder constructor from git commit.");
    }

    return baselineCtor as RecorderConstructor;
  }

  const denoiseExports = evaluateCommonJs(
    transpileTs(gitShow(denoisePath), "baseline-denoise-provider.ts"),
    "baseline-denoise-provider.js",
    (id) => require(id),
  );

  const vadExports = evaluateCommonJs(
    transpileTs(gitShow(vadPath), "baseline-vad-provider.ts"),
    "baseline-vad-provider.js",
    (id) => {
      if (id === "./denoise-provider") {
        return denoiseExports;
      }
      return require(id);
    },
  );

  const indexExports = evaluateCommonJs(
    transpileTs(gitShow(indexPath), "baseline-audio-index.ts"),
    "baseline-audio-index.js",
    (id) => {
      if (id === "./denoise-provider") {
        return denoiseExports;
      }
      if (id === "./vad-provider") {
        return vadExports;
      }
      return require(id);
    },
  );

  const baselineCtor = indexExports.SpeechRecorder;
  if (typeof baselineCtor !== "function") {
    throw new Error("Failed to load baseline SpeechRecorder constructor from git commit.");
  }

  return baselineCtor as RecorderConstructor;
}

describe("Regression: baseline (a05bf45) vs current", () => {
  const comparisons: FixtureComparison[] = [];
  const fixtures = buildRegressionFixtures();
  let BaselineRecorder: RecorderConstructor;

  beforeAll(() => {
    BaselineRecorder = loadBaselineRecorderCtor();
  });

  it("preserves transition behavior across the fixture corpus", () => {
    for (const fixture of fixtures) {
      const baseline = runRecorderScenario({
        buffers: fixture.buffers,
        recorderCtor: BaselineRecorder,
        captureStartWallClockMs: 1_710_000_000_000,
      });

      const current = runRecorderScenario({
        buffers: fixture.buffers,
        captureStartWallClockMs: 1_710_000_000_000,
      });

      const baselineOrder = baseline.eventOrder
        .filter((event) => event.kind === "audio" || event.kind === "chunk-start" || event.kind === "chunk-end")
        .map((event) => event.kind)
        .join(",");
      const currentOrder = current.eventOrder
        .filter((event) => event.kind === "audio" || event.kind === "chunk-start" || event.kind === "chunk-end")
        .map((event) => event.kind)
        .join(",");

      comparisons.push({
        fixture: fixture.name,
        baseline: `${baseline.chunkStarts.length}/${baseline.chunkEnds}/${baselineOrder}`,
        current: `${current.chunkStarts.length}/${current.chunkEnds}/${currentOrder}`,
        expected: "match for start/end counts and event ordering",
      });

      expect(current.chunkStarts.length).toBe(baseline.chunkStarts.length);
      expect(current.chunkEnds).toBe(baseline.chunkEnds);
      expect(currentOrder).toBe(baselineOrder);
      expect(current.chunkStarts.map((entry) => entry.audioLength)).toEqual(
        baseline.chunkStarts.map((entry) => entry.audioLength),
      );
      if (baseline.audioEvents.length > 0 && current.audioEvents.length > 0) {
        expect(Object.keys(current.audioEvents[0]).sort()).toEqual(
          Object.keys(baseline.audioEvents[0]).sort(),
        );
      }
    }
  });

  it("allows Patch 1 metadata additions while preserving callback compatibility", () => {
    const fixture = buildRegressionFixtures().find((entry) => entry.name === "clean-speech");
    expect(fixture).toBeDefined();

    const current = runRecorderScenario({
      buffers: fixture!.buffers,
      captureStartWallClockMs: 1_710_555_000_000,
    });

    expect(current.audioEvents.length).toBeGreaterThan(0);
    for (const event of current.audioEvents) {
      expect(event.audioLength).toBeGreaterThan(0);
      expect(typeof event.speaking).toBe("boolean");
      expect(typeof event.consecutiveSilence).toBe("number");
      expect(typeof event.volume).toBe("number");

      expect(typeof event.frameIndex).toBe("number");
      expect(typeof event.timestampMs).toBe("number");
      expect(typeof event.streamTimeMs).toBe("number");
    }
  });

  afterAll(() => {
    const summary = comparisons
      .map((row) => `${row.fixture} | ${row.baseline} | ${row.current} | ${row.expected}`)
      .join("\n");
    process.stdout.write(
      `\n[regression-summary]\nfixture | baseline | current | expected\n${summary}\n`,
    );
  });
});
