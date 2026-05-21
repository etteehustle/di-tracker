"use client";

import type { ForecastMode } from "../../lib/domain/types";
import { amount, money } from "../../lib/domain/format";
import { activeOrderPendingPremiumUSDT } from "../../lib/services/portfolio-service";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderCard } from "../orders/OrderCard";
import { MetricCard } from "../display/MetricCard";
import { MetricInfo } from "../display/MetricInfo";
import { SectionHeading } from "../display/SectionHeading";
import { ForecastCard } from "./ForecastCard";
import { MarketPricesCard } from "./MarketPricesCard";
import { TotalDIValueCard } from "./TotalDIValueCard";

type DashboardProps = {
  metrics: DashboardMetrics;
  forecastMode: ForecastMode;
  onForecastModeChange: (mode: ForecastMode) => void;
  targetDailyReturnPercent: number;
  onTargetDailyReturnPercentChange: (value: number) => void;
  onManageOrders: () => void;
};

function exposureLabel(asset: string): string {
  return asset === "USDT" ? "USDT" : `${asset}-equivalent`;
}

type DashboardCardId =
  | "totalDIValue"
  | "netDeposited"
  | "externalDeposits"
  | "externalWithdrawals"
  | "internalTransfers"
  | "diWorkingCapital"
  | "pnl"
  | "storageValue"
  | "totalPortfolioPnl"
  | "activeOrders"
  | "marketPrices"
  | "currentHolding"
  | "forecast"
  | "portfolioTotal";

type DashboardGroup = {
  title: string;
  cards: DashboardCardId[];
};

const dashboardGroups: DashboardGroup[] = [
  {
    title: "DI Engine",
    cards: ["totalDIValue", "diWorkingCapital", "pnl", "activeOrders"]
  },
  {
    title: "Portfolio",
    cards: ["portfolioTotal", "storageValue", "totalPortfolioPnl"]
  },
  {
    title: "Capital Flow",
    cards: ["netDeposited", "externalDeposits", "externalWithdrawals", "internalTransfers"]
  },
  {
    title: "Market & Forecast",
    cards: ["currentHolding", "marketPrices", "forecast"]
  }
];

const metricDescriptions: Record<DashboardCardId, string> = {
  totalDIValue: "Current DI engine value: DI free balances plus conservative value locked in active orders.",
  diWorkingCapital: "Capital currently allocated to the DI engine. Internal transfers out of DI reduce this number.",
  pnl: "DI engine value minus DI working capital. This excludes storage portfolio performance.",
  activeOrders: "Number of currently active DI orders.",
  portfolioTotal: "DI engine value plus storage portfolio value.",
  storageValue: "Assets held outside DI pockets, such as BTC/ETH/SOL storage balances.",
  totalPortfolioPnl: "Total portfolio value minus external net deposit.",
  netDeposited: "External deposits minus external withdrawals. Internal transfers do not change this.",
  externalDeposits: "Capital added from outside the app.",
  externalWithdrawals: "Capital removed from the whole portfolio/app.",
  internalTransfers: "Capital moved between DI engine and storage portfolio.",
  currentHolding: "Weighted average entry by exposure. SOL and OKSOL are grouped as SOL-equivalent.",
  marketPrices: "Latest prices used for valuation. OKSOL uses SOL price.",
  forecast: "Projection based on selected mode. It is a planning estimate, not a guaranteed result."
};

export function Dashboard({
  metrics,
  forecastMode,
  onForecastModeChange,
  targetDailyReturnPercent,
  onTargetDailyReturnPercentChange,
  onManageOrders
}: DashboardProps) {
  function renderCard(cardId: DashboardCardId) {
    const description = metricDescriptions[cardId];
    if (cardId === "totalDIValue") return <TotalDIValueCard metrics={metrics} description={description} />;
    if (cardId === "diWorkingCapital") return <MetricCard label="DI Working Capital" value={money(metrics.diWorkingCapital)} description={description} />;
    if (cardId === "netDeposited") return <MetricCard label="External Net Deposit" value={money(metrics.netDeposited)} description={description} />;
    if (cardId === "externalDeposits") return <MetricCard label="External Deposits" value={money(metrics.externalDeposits)} description={description} />;
    if (cardId === "externalWithdrawals") return <MetricCard label="External Withdrawals" value={money(metrics.externalWithdrawals)} description={description} />;
    if (cardId === "internalTransfers") return <MetricCard label="Internal Transfers" value={money(metrics.internalTransfers)} description={description} />;
    if (cardId === "pnl") return <MetricCard label="DI Engine PnL" value={money(metrics.pnl)} tone={metrics.pnl >= 0 ? "green" : "red"} description={description} />;
    if (cardId === "storageValue") return <MetricCard label="Storage Portfolio Value" value={money(metrics.storagePortfolioValue)} description={description} />;
    if (cardId === "totalPortfolioPnl") return <MetricCard label="Total Portfolio PnL" value={money(metrics.totalPortfolioPnl)} tone={metrics.totalPortfolioPnl >= 0 ? "green" : "red"} description={description} />;
    if (cardId === "activeOrders") return <MetricCard label="Active Orders" value={String(metrics.activeOrders.length)} description={description} />;
    if (cardId === "marketPrices") return <MarketPricesCard prices={metrics.prices} description={description} />;
    if (cardId === "currentHolding") {
      return (
        <Card className="metric-card holding-entry-card">
          <MetricInfo label="Exposure Holding Entry" description={description} />
          {metrics.exposureHoldingEntries.length ? (
            <div className="holding-entry-list">
              {metrics.exposureHoldingEntries.map((entry) => (
                <div key={entry.underlyingAsset} className="holding-entry-row">
                  <b>{exposureLabel(entry.underlyingAsset)}</b>
                  <strong>{money(entry.entry, 4)}</strong>
                  <small>{amount(entry.amount)} held</small>
                </div>
              ))}
            </div>
          ) : (
            <strong>No coin lots</strong>
          )}
        </Card>
      );
    }
    if (cardId === "forecast") {
      return (
        <ForecastCard
          forecast={metrics.forecast}
          mode={forecastMode}
          targetDailyReturnPercent={targetDailyReturnPercent}
          description={description}
          onTargetDailyReturnPercentChange={onTargetDailyReturnPercentChange}
          onModeChange={onForecastModeChange}
        />
      );
    }
    return <MetricCard label="Portfolio Total Value" value={money(metrics.portfolioTotal)} />;
  }

  return (
    <>
      <section className="dashboard-sections">
        {dashboardGroups.map((group) => (
          <section className="dashboard-section" key={group.title}>
            <SectionHeading title={group.title} />
            <div className="dashboard-grid">
              {group.cards.map((cardId) => (
                <div key={cardId} className="dashboard-card-slot">
                  {renderCard(cardId)}
                </div>
              ))}
            </div>
          </section>
        ))}
      </section>

      <section className="active-strip">
        <SectionHeading
          title="Active Orders"
          action={<Button variant="secondary" onClick={onManageOrders}>Manage orders</Button>}
        />
        <div className="order-list compact">
          {metrics.activeOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              pendingPremium={activeOrderPendingPremiumUSDT(order, metrics.prices)}
            />
          ))}
        </div>
      </section>
    </>
  );
}
