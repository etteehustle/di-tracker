import { amount, money } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";
import { Card } from "../ui/Card";

type TotalDIValueCardProps = {
  metrics: DashboardMetrics;
};

export function TotalDIValueCard({ metrics }: TotalDIValueCardProps) {
  return (
    <Card className="metric-card total-value-card blue">
      <span>Total DI Value</span>
      <strong>{money(metrics.diValue)}</strong>
      <div className="asset-breakdown">
        <b>Available balance</b>
        {metrics.availableBalances.length ? (
          metrics.availableBalances.map((balance) => (
            <span key={`available-${balance.asset}-${balance.amount}`}>
              {balance.asset}: {amount(balance.amount)} {balance.asset} = {money(balance.valueUSDT)}
            </span>
          ))
        ) : (
          <span>No free balance</span>
        )}

        <b>Locked in active orders</b>
        {metrics.activeReservations.length ? (
          metrics.activeReservations.map((balance) => (
            <span key={`locked-${balance.asset}-${balance.amount}`}>
              {balance.asset}: {amount(balance.amount)} {balance.asset} = {money(balance.valueUSDT)}
            </span>
          ))
        ) : (
          <span>No active order lock</span>
        )}
      </div>
    </Card>
  );
}
