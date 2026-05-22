"use client";

import type { ForecastMode } from "../../lib/domain/types";
import { amount, dateTime, hoursUntil, money } from "../../lib/domain/format";
import { activeOrderPendingPremiumUSDT } from "../../lib/services/portfolio-service";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
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

function pnlTone(value: number): "green" | "red" | "neutral" {
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "neutral";
}

function PnlMiniStat({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <b>{label}</b>
      <em className={pnlTone(value)}>{money(value)}</em>
    </span>
  );
}

function PnlBreakdownRow({ label, value, isTotal = false }: { label: string; value: number; isTotal?: boolean }) {
  return (
    <div className={isTotal ? "pnl-breakdown-row total" : "pnl-breakdown-row"}>
      <span>{label}</span>
      <b className={pnlTone(value)}>{money(value)}</b>
    </div>
  );
}

function PnlBreakdownGroups({ metrics }: { metrics: DashboardMetrics }) {
  const breakdown = metrics.pnlBreakdown;

  return (
    <div className="pnl-breakdown-groups">
      <div className="pnl-breakdown-group">
        <span className="pnl-breakdown-title">Performance</span>
        <PnlBreakdownRow label="Total DI PnL" value={breakdown.totalDIPnlUSDT} isTotal />
        <PnlBreakdownRow label="Realized PnL" value={breakdown.realizedPnlUSDT} />
        <PnlBreakdownRow label="Unrealized PnL" value={breakdown.unrealizedPnlUSDT} />
      </div>
      <div className="pnl-breakdown-group">
        <span className="pnl-breakdown-title">Attribution</span>
        <PnlBreakdownRow label="Premium Yield" value={breakdown.premiumYieldUSDT} />
        <PnlBreakdownRow label="Trading PnL" value={breakdown.tradingPnlUSDT} />
      </div>
    </div>
  );
}

function PnlBreakdownCard({ metrics, description }: { metrics: DashboardMetrics; description?: string }) {
  const breakdown = metrics.pnlBreakdown;

  return (
    <Card className={`metric-card hero-metric pnl-breakdown-card ${pnlTone(breakdown.totalDIPnlUSDT)}`}>
      <MetricInfo label="DI Engine PnL" description={description} />
      <strong>{money(breakdown.totalDIPnlUSDT)}</strong>
      <div className="pnl-mini-grid">
        <PnlMiniStat label="Realized" value={breakdown.realizedPnlUSDT} />
        <PnlMiniStat label="Unrealized" value={breakdown.unrealizedPnlUSDT} />
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="secondary" className="pnl-breakdown-trigger">
            Breakdown
          </Button>
        </DialogTrigger>
        <DialogContent className="pnl-breakdown-dialog">
          <DialogHeader>
            <DialogTitle>DI PnL Breakdown</DialogTitle>
            <DialogDescription>
              Total DI PnL is realized plus unrealized. Premium yield and trading PnL explain attribution.
            </DialogDescription>
          </DialogHeader>
          <PnlBreakdownGroups metrics={metrics} />
        </DialogContent>
      </Dialog>
    </Card>
  );
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
  | "nextSettlement"
  | "portfolioTotal";

const metricDescriptions: Record<DashboardCardId, string> = {
  totalDIValue: "Current DI engine value: DI free balances plus conservative value locked in active orders.",
  diWorkingCapital: "Capital currently allocated to the DI engine. Internal transfers out of DI reduce this number.",
  pnl: "Total DI PnL is realized plus unrealized. Premium yield and trading PnL are attribution lines.",
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
  forecast: "Projection based on selected mode. It is a planning estimate, not a guaranteed result.",
  nextSettlement: "Closest settlement among active orders, shown as an operational countdown."
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
    if (cardId === "pnl") return <PnlBreakdownCard metrics={metrics} description={description} />;
    if (cardId === "storageValue") return <MetricCard label="Storage Portfolio Value" value={money(metrics.storagePortfolioValue)} description={description} />;
    if (cardId === "totalPortfolioPnl") return <MetricCard label="Total Portfolio PnL" value={money(metrics.totalPortfolioPnl)} tone={metrics.totalPortfolioPnl >= 0 ? "green" : "red"} description={description} />;
    if (cardId === "activeOrders") return <MetricCard label="Active Orders" value={String(metrics.activeOrders.length)} description={description} />;
    if (cardId === "nextSettlement") {
      const next = metrics.nextSettlement;
      return (
        <MetricCard
          label="Next Settlement"
          value={next ? `${hoursUntil(next.settlementTime).toFixed(1)}h` : "None"}
          description={next ? `${next.exchange} · ${next.pair} · ${dateTime(next.settlementTime)}` : description}
        />
      );
    }
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
      <section className="dashboard-command">
        <div className="dashboard-hero-grid">
          {(["totalDIValue", "pnl", "activeOrders", "nextSettlement"] as DashboardCardId[]).map((cardId) => (
            <div key={cardId} className="dashboard-card-slot">
              {renderCard(cardId)}
            </div>
          ))}
        </div>

        <div className="dashboard-workbench">
          <section className="dashboard-active-panel">
            <SectionHeading
              title="Active orders"
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

          <aside className="dashboard-side-rail">
            {renderCard("forecast")}
            {renderCard("marketPrices")}
            {renderCard("currentHolding")}
          </aside>
        </div>
      </section>

      <section className="dashboard-secondary-strip">
        <SectionHeading
          title="Capital flow"
          meta="External deposits, withdrawals and internal movement"
        />
        <div className="dashboard-grid">
          {(["diWorkingCapital", "netDeposited", "externalDeposits", "externalWithdrawals", "internalTransfers", "portfolioTotal", "storageValue", "totalPortfolioPnl"] as DashboardCardId[]).map((cardId) => (
            <div key={cardId} className="dashboard-card-slot">
              {renderCard(cardId)}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
