import type { ForecastMode } from "../../lib/domain/types";
import { money } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";

type ForecastCardProps = {
  forecast: DashboardMetrics["forecast"];
  mode: ForecastMode;
  onModeChange: (mode: ForecastMode) => void;
};

export function ForecastCard({ forecast, mode, onModeChange }: ForecastCardProps) {
  return (
    <article className="metric-card forecast-card">
      <span>1-Year Forecast</span>
      <strong>{money(forecast.projectedOneYearValueUSDT)}</strong>
      <div className="segmented">
        <button className={mode === "SETTLED_AVERAGE" ? "active" : ""} onClick={() => onModeChange("SETTLED_AVERAGE")}>
          Settled Avg
        </button>
        <button className={mode === "BLENDED" ? "active" : ""} onClick={() => onModeChange("BLENDED")}>
          Blended
        </button>
      </div>
      <small>{forecast.confidence} confidence - projection, not promise</small>
    </article>
  );
}
