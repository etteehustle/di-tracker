import { percent } from "../../lib/domain/format";
import type { AppState } from "../../lib/domain/types";
import { averageFinite, hitRate } from "../../lib/services/performance-service";
import { MetricCard } from "../display/MetricCard";

type AnalyticsViewProps = {
  state: AppState;
};

export function AnalyticsView({ state }: AnalyticsViewProps) {
  const settledOrderCount = state.orders.filter((order) => order.status.startsWith("SETTLED")).length;

  return (
    <section className="panel analytics-panel">
      <h2>Performance Detail</h2>
      <div className="stat-row">
        <MetricCard label="Average APR" value={percent(averageFinite(state.orders.map((order) => order.aprPercent)))} />
        <MetricCard label="Average Term Rate" value={percent(averageFinite(state.orders.map((order) => order.termRatePercent)))} />
        <MetricCard label="Hit Rate" value={percent(hitRate(state.orders))} />
        <MetricCard label="Settled Orders" value={String(settledOrderCount)} />
      </div>
      <div className="analytics-ledger-preview">
        <span>Monthly DI return</span>
        <div className="analytics-bars" aria-hidden="true">
          <i className="bar-1" />
          <i className="bar-2" />
          <i className="bar-3" />
          <i className="bar-4" />
          <i className="bar-5" />
        </div>
        <small>Detailed charts can use this surface once the analytics service exposes monthly series.</small>
      </div>
    </section>
  );
}
