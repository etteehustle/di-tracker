import { money } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";
import { Card } from "../ui/Card";

type MarketPricesCardProps = {
  prices: DashboardMetrics["prices"];
};

export function MarketPricesCard({ prices }: MarketPricesCardProps) {
  return (
    <Card className="metric-card price-card">
      <span>Market Prices</span>
      <div className="price-list">
        <strong>SOL {money(prices.SOL)}</strong>
        <strong>BTC {money(prices.BTC)}</strong>
        <strong>ETH {money(prices.ETH)}</strong>
      </div>
      <small>OKSOL uses SOL price</small>
    </Card>
  );
}
