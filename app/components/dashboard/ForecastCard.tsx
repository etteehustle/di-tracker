import type { ForecastMode } from "../../lib/domain/types";
import { money } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ForecastCardProps = {
  forecast: DashboardMetrics["forecast"];
  mode: ForecastMode;
  onModeChange: (mode: ForecastMode) => void;
};

export function ForecastCard({ forecast, mode, onModeChange }: ForecastCardProps) {
  return (
    <Card className="metric-card forecast-card">
      <span>1-Year Forecast</span>
      <strong>{money(forecast.projectedOneYearValueUSDT)}</strong>
      <div className="segmented">
        <Button
          variant="ghost"
          size="sm"
          className="segmented-button"
          data-active={mode === "SETTLED_AVERAGE"}
          onClick={() => onModeChange("SETTLED_AVERAGE")}
        >
          Settled Avg
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="segmented-button"
          data-active={mode === "BLENDED"}
          onClick={() => onModeChange("BLENDED")}
        >
          Blended
        </Button>
      </div>
      <small>{forecast.confidence} confidence - projection, not promise</small>
    </Card>
  );
}
