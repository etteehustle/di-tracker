import { lockDays } from "../domain/format";
import type { DIOrder, EfficiencyLabel, OrderEvaluation, RiskLevel, Score } from "../domain/types";
import { createId } from "./id";

type Benchmark = { label: string; minApr: number; maxApr: number };

const BENCHMARKS: Array<{ days: number; minApr: number; maxApr: number }> = [
  { days: 1, minApr: 300, maxApr: 550 },
  { days: 2, minApr: 150, maxApr: 300 },
  { days: 3, minApr: 120, maxApr: 220 },
  { days: 7, minApr: 60, maxApr: 100 }
];

function nearestBenchmark(days: number): Benchmark {
  const nearest = BENCHMARKS.reduce((best, candidate) =>
    Math.abs(candidate.days - days) < Math.abs(best.days - days) ? candidate : best
  );
  return { label: `${nearest.days}d ${nearest.minApr}-${nearest.maxApr}% APR`, minApr: nearest.minApr, maxApr: nearest.maxApr };
}

export function evaluateOrder(order: Pick<DIOrder, "aprPercent" | "termRatePercent" | "startTime" | "settlementTime" | "marketContextTags">): OrderEvaluation {
  const days = lockDays(order.startTime, order.settlementTime);
  const benchmark = nearestBenchmark(days);
  const premiumStrong = order.termRatePercent >= 0.8 && order.termRatePercent <= 1.5;
  const aprStrong = order.aprPercent >= benchmark.minApr && order.aprPercent <= benchmark.maxApr;
  const aprTooLow = order.aprPercent < benchmark.minApr * 0.7;
  const premiumTooLow = order.termRatePercent < 0.5;
  const riskyContext = order.marketContextTags.some((tag) => tag === "Pumping hard" || tag === "Dumping hard");

  let score: Score = "NEUTRAL";
  if (premiumStrong && aprStrong) score = "GOOD";
  if (premiumStrong && order.aprPercent > benchmark.maxApr && !riskyContext) score = "EXCELLENT";
  if (aprTooLow || premiumTooLow) score = "BAD";
  if (riskyContext && (premiumTooLow || order.aprPercent < benchmark.minApr)) score = "DANGEROUS";

  const riskLevel: RiskLevel = riskyContext || order.aprPercent > benchmark.maxApr * 1.35 ? "HIGH" : score === "GOOD" || score === "EXCELLENT" ? "MEDIUM" : "LOW";
  const efficiencyLabel: EfficiencyLabel = premiumStrong && !premiumTooLow ? "STRONG" : premiumTooLow ? "WEAK" : "ACCEPTABLE";
  const reasons = [
    `Matched ${benchmark.label}`,
    premiumStrong ? "Term rate is inside the 0.8%-1.5% target premium band." : "Term rate is outside the target premium band.",
    aprStrong ? "APR is inside benchmark range for the lock duration." : "APR is outside the benchmark range for the lock duration."
  ];
  if (riskyContext) reasons.push("Market context includes a high-volatility tag.");

  return {
    id: createId("eval"),
    score,
    riskLevel,
    efficiencyLabel,
    benchmarkMatched: benchmark.label,
    reasons,
    evaluatedAt: new Date().toISOString()
  };
}
