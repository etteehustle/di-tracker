import { money } from "../../lib/domain/format";
import type { DashboardMetrics } from "../../lib/view-models";
import { Card } from "@/components/ui/card";
import { MetricInfo } from "../display/MetricInfo";

type MarketPricesCardProps = {
  prices: DashboardMetrics["prices"];
  description?: string;
};

export function MarketPricesCard({ prices, description }: MarketPricesCardProps) {
  return (
    <Card className="metric-card price-card">
      <MetricInfo label="Market Prices" description={description} />
      <div className="price-list">
        <strong>SOL {money(prices.SOL)}</strong>
        <strong>BTC {money(prices.BTC)}</strong>
        <strong>ETH {money(prices.ETH)}</strong>
      </div>
      <small>OKSOL uses SOL price</small>
    </Card>
  );
}
