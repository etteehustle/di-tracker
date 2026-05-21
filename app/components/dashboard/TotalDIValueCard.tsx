import { amount, money } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";
import { Card } from "@/components/ui/card";

type TotalDIValueCardProps = {
  metrics: DashboardMetrics;
};

function exposureLabel(asset: string): string {
  return asset === "USDT" ? "USDT" : `${asset}-equivalent`;
}

export function TotalDIValueCard({ metrics }: TotalDIValueCardProps) {
  return (
    <Card className="metric-card total-value-card blue">
      <span>Total DI Value</span>
      <strong>{money(metrics.diValue)}</strong>
      <div className="asset-breakdown">
        <b>Available exposure</b>
        {metrics.availableExposureBalances.length ? (
          metrics.availableExposureBalances.map((balance) => (
            <span key={`available-${balance.underlyingAsset}-${balance.amount}`}>
              {balance.underlyingAsset}: {amount(balance.amount)} {exposureLabel(balance.underlyingAsset)} = {money(balance.valueUSDT)}
            </span>
          ))
        ) : (
          <span>No free exposure</span>
        )}

        <b>Locked exposure in active orders</b>
        {metrics.activeExposureReservations.length ? (
          metrics.activeExposureReservations.map((balance) => (
            <span key={`locked-${balance.underlyingAsset}-${balance.amount}`}>
              {balance.underlyingAsset}: {amount(balance.amount)} {exposureLabel(balance.underlyingAsset)} = {money(balance.valueUSDT)}
            </span>
          ))
        ) : (
          <span>No active order lock</span>
        )}
      </div>
    </Card>
  );
}
