import type { ForecastMode } from "../../lib/domain/types";
import { money, percent } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ForecastCardProps = {
  forecast: DashboardMetrics["forecast"];
  mode: ForecastMode;
  targetDailyReturnPercent: number;
  onTargetDailyReturnPercentChange: (value: number) => void;
  onModeChange: (mode: ForecastMode) => void;
};

export function ForecastCard({
  forecast,
  mode,
  targetDailyReturnPercent,
  onTargetDailyReturnPercentChange,
  onModeChange
}: ForecastCardProps) {
  return (
    <Card className="metric-card forecast-card">
      <span>1-Year Forecast</span>
      <strong>{money(forecast.projectedOneYearValueUSDT)}</strong>
      <div className="segmented forecast-modes">
        <Button
          variant="ghost"
          size="sm"
          className="segmented-button"
          data-active={mode === "SETTLED_ONLY"}
          onClick={() => onModeChange("SETTLED_ONLY")}
        >
          Settled
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="segmented-button"
          data-active={mode === "SETTLED_PLUS_ACTIVE_PREMIUM"}
          onClick={() => onModeChange("SETTLED_PLUS_ACTIVE_PREMIUM")}
        >
          + Active
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="segmented-button"
          data-active={mode === "RECENT_TARGET_RATE"}
          onClick={() => onModeChange("RECENT_TARGET_RATE")}
        >
          Target
        </Button>
      </div>
      {mode === "RECENT_TARGET_RATE" && (
        <label className="forecast-target-field">
          <span>Daily target %</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={targetDailyReturnPercent}
            onChange={(event) => onTargetDailyReturnPercentChange(Number(event.target.value) || 0)}
          />
        </label>
      )}
      <div className="forecast-detail">
        <small>{percent(forecast.dailyReturnRate * 100, 3)} daily return</small>
        <small>{forecast.confidence} confidence - projection, not promise</small>
        {forecast.confidenceNotes.slice(0, 2).map((note) => (
          <small key={note}>{note}</small>
        ))}
        <small>{forecast.warning}</small>
      </div>
    </Card>
  );
}
