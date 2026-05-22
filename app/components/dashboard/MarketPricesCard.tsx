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
        <span><b>SOL</b><strong>{money(prices.SOL)}</strong></span>
        <span><b>BTC</b><strong>{money(prices.BTC)}</strong></span>
        <span><b>ETH</b><strong>{money(prices.ETH)}</strong></span>
      </div>
      <small>OKSOL uses SOL price</small>
    </Card>
  );
}
