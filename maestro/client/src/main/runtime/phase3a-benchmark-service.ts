export type BenchmarkLane = "command_fast" | "dictation_accurate" | "secure_speaker_aware";

export type HotPathStage =
  | "dispatch_plan_ms"
  | "policy_decision_ms"
  | "executor_handoff_ms"
  | "dispatch_total_ms";

export interface LaneSampleInput {
  lane: BenchmarkLane;
  provider: string;
  success: boolean;
  latencyMs: number;
  fallbackUsed?: boolean;
  degraded?: boolean;
  contaminated?: boolean;
  reason?: string;
}

export interface RouteDecisionInput {
  route: string;
  policyDecision:
    | "approve_route"
    | "approve_with_confirmation"
    | "approve_with_chooser"
    | "downgrade_route"
    | "retry_route"
    | "block_route"
    | "refuse_command";
  confirmationRequired: boolean;
  chooserRequired: boolean;
  boundaryBlocked?: boolean;
  degraded?: boolean;
  executionOrigin?: "user" | "nexus_proposal" | "macro";
}

interface LaneStats {
  total: number;
  success: number;
  failures: number;
  degraded: number;
  fallback: number;
  contaminated: number;
  latenciesMs: number[];
  providers: Record<string, number>;
  failureReasons: Record<string, number>;
}

interface StageStats {
  latenciesMs: number[];
}

export interface Phase3ABenchmarkSnapshot {
  generatedAt: string;
  lanes: Record<
    BenchmarkLane,
    {
      samples: number;
      successRate: number;
      degradedRate: number;
      fallbackRate: number;
      contaminationRate: number;
      p50LatencyMs: number | null;
      p95LatencyMs: number | null;
      providers: Record<string, number>;
      failureReasons: Record<string, number>;
    }
  >;
  hotPathStages: Record<
    HotPathStage,
    {
      samples: number;
      p50LatencyMs: number | null;
      p95LatencyMs: number | null;
      avgLatencyMs: number | null;
    }
  >;
  routeReliability: {
    routeSelectionFrequency: Record<string, number>;
    policyDecisionFrequency: Record<string, number>;
    confirmationFrequency: number;
    chooserFrequency: number;
    fallbackFrequency: number;
    blockOrRefusalFrequency: number;
    boundaryBlockFrequency: number;
    degradedFrequency: number;
  };
}

const createLaneStats = (): LaneStats => ({
  total: 0,
  success: 0,
  failures: 0,
  degraded: 0,
  fallback: 0,
  contaminated: 0,
  latenciesMs: [],
  providers: {},
  failureReasons: {},
});

const createStageStats = (): StageStats => ({
  latenciesMs: [],
});

const percentage = (value: number, total: number): number =>
  total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0;

const percentile = (values: number[], percentileRank: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileRank / 100) * sorted.length) - 1)
  );
  return sorted[index];
};

const average = (values: number[]): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(2));
};

export default class Phase3ABenchmarkService {
  private readonly laneStats: Record<BenchmarkLane, LaneStats> = {
    command_fast: createLaneStats(),
    dictation_accurate: createLaneStats(),
    secure_speaker_aware: createLaneStats(),
  };

  private readonly stageStats: Record<HotPathStage, StageStats> = {
    dispatch_plan_ms: createStageStats(),
    policy_decision_ms: createStageStats(),
    executor_handoff_ms: createStageStats(),
    dispatch_total_ms: createStageStats(),
  };

  private readonly routeSelectionFrequency: Record<string, number> = {};
  private readonly policyDecisionFrequency: Record<string, number> = {};
  private totalRouteDecisions = 0;
  private confirmationCount = 0;
  private chooserCount = 0;
  private fallbackCount = 0;
  private blockOrRefusalCount = 0;
  private boundaryBlockCount = 0;
  private degradedRouteCount = 0;

  reset(): void {
    (Object.keys(this.laneStats) as BenchmarkLane[]).forEach((lane) => {
      this.laneStats[lane] = createLaneStats();
    });
    (Object.keys(this.stageStats) as HotPathStage[]).forEach((stage) => {
      this.stageStats[stage] = createStageStats();
    });
    Object.keys(this.routeSelectionFrequency).forEach((key) => delete this.routeSelectionFrequency[key]);
    Object.keys(this.policyDecisionFrequency).forEach((key) => delete this.policyDecisionFrequency[key]);
    this.totalRouteDecisions = 0;
    this.confirmationCount = 0;
    this.chooserCount = 0;
    this.fallbackCount = 0;
    this.blockOrRefusalCount = 0;
    this.boundaryBlockCount = 0;
    this.degradedRouteCount = 0;
  }

  recordLaneSample(input: LaneSampleInput): void {
    const stats = this.laneStats[input.lane];
    stats.total += 1;
    if (input.success) {
      stats.success += 1;
    } else {
      stats.failures += 1;
      if (input.reason) {
        stats.failureReasons[input.reason] = (stats.failureReasons[input.reason] || 0) + 1;
      }
    }

    if (input.degraded) {
      stats.degraded += 1;
    }
    if (input.fallbackUsed) {
      stats.fallback += 1;
    }
    if (input.contaminated) {
      stats.contaminated += 1;
    }

    if (input.latencyMs >= 0) {
      stats.latenciesMs.push(input.latencyMs);
    }
    stats.providers[input.provider] = (stats.providers[input.provider] || 0) + 1;
  }

  recordHotPathStage(stage: HotPathStage, latencyMs: number): void {
    if (latencyMs < 0) {
      return;
    }
    this.stageStats[stage].latenciesMs.push(latencyMs);
  }

  recordRouteDecision(input: RouteDecisionInput): void {
    this.totalRouteDecisions += 1;
    this.routeSelectionFrequency[input.route] = (this.routeSelectionFrequency[input.route] || 0) + 1;
    this.policyDecisionFrequency[input.policyDecision] =
      (this.policyDecisionFrequency[input.policyDecision] || 0) + 1;

    if (input.confirmationRequired) {
      this.confirmationCount += 1;
    }
    if (input.chooserRequired) {
      this.chooserCount += 1;
    }
    if (input.policyDecision === "downgrade_route") {
      this.fallbackCount += 1;
    }
    if (input.policyDecision === "block_route" || input.policyDecision === "refuse_command") {
      this.blockOrRefusalCount += 1;
    }
    if (input.boundaryBlocked) {
      this.boundaryBlockCount += 1;
    }
    if (input.degraded) {
      this.degradedRouteCount += 1;
    }
  }

  getSnapshot(): Phase3ABenchmarkSnapshot {
    const lanes = (Object.keys(this.laneStats) as BenchmarkLane[]).reduce(
      (accumulator, lane) => {
        const stats = this.laneStats[lane];
        accumulator[lane] = {
          samples: stats.total,
          successRate: percentage(stats.success, stats.total),
          degradedRate: percentage(stats.degraded, stats.total),
          fallbackRate: percentage(stats.fallback, stats.total),
          contaminationRate: percentage(stats.contaminated, stats.total),
          p50LatencyMs: percentile(stats.latenciesMs, 50),
          p95LatencyMs: percentile(stats.latenciesMs, 95),
          providers: { ...stats.providers },
          failureReasons: { ...stats.failureReasons },
        };
        return accumulator;
      },
      {} as Phase3ABenchmarkSnapshot["lanes"]
    );

    const hotPathStages = (Object.keys(this.stageStats) as HotPathStage[]).reduce(
      (accumulator, stage) => {
        const stats = this.stageStats[stage];
        accumulator[stage] = {
          samples: stats.latenciesMs.length,
          p50LatencyMs: percentile(stats.latenciesMs, 50),
          p95LatencyMs: percentile(stats.latenciesMs, 95),
          avgLatencyMs: average(stats.latenciesMs),
        };
        return accumulator;
      },
      {} as Phase3ABenchmarkSnapshot["hotPathStages"]
    );

    return {
      generatedAt: new Date().toISOString(),
      lanes,
      hotPathStages,
      routeReliability: {
        routeSelectionFrequency: { ...this.routeSelectionFrequency },
        policyDecisionFrequency: { ...this.policyDecisionFrequency },
        confirmationFrequency: percentage(this.confirmationCount, this.totalRouteDecisions),
        chooserFrequency: percentage(this.chooserCount, this.totalRouteDecisions),
        fallbackFrequency: percentage(this.fallbackCount, this.totalRouteDecisions),
        blockOrRefusalFrequency: percentage(this.blockOrRefusalCount, this.totalRouteDecisions),
        boundaryBlockFrequency: percentage(this.boundaryBlockCount, this.totalRouteDecisions),
        degradedFrequency: percentage(this.degradedRouteCount, this.totalRouteDecisions),
      },
    };
  }
}

export const phase3ABenchmarkService = new Phase3ABenchmarkService();
