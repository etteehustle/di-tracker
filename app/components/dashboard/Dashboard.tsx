"use client";

import { useEffect, useState } from "react";
import type { ForecastMode } from "../../lib/domain/types";
import { amount, money } from "../../lib/domain/format";
import { activeOrderPendingPremiumUSDT } from "../../lib/services/portfolio-service";
import type { DashboardMetrics } from "../../lib/view-models";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OrderCard } from "../orders/OrderCard";
import { MetricCard } from "../display/MetricCard";
import { SectionHeading } from "../display/SectionHeading";
import { ForecastCard } from "./ForecastCard";
import { MarketPricesCard } from "./MarketPricesCard";
import { TotalDIValueCard } from "./TotalDIValueCard";

type DashboardProps = {
  metrics: DashboardMetrics;
  forecastMode: ForecastMode;
  onForecastModeChange: (mode: ForecastMode) => void;
  onManageOrders: () => void;
};

function exposureLabel(asset: string): string {
  return asset === "USDT" ? "USDT" : `${asset}-equivalent`;
}

type DashboardCardId =
  | "totalDIValue"
  | "netDeposited"
  | "pnl"
  | "activeOrders"
  | "marketPrices"
  | "currentHolding"
  | "forecast"
  | "portfolioTotal";

const DASHBOARD_LAYOUT_KEY = "di-tracker-dashboard-card-order-v1";
const defaultDashboardCardOrder: DashboardCardId[] = [
  "totalDIValue",
  "netDeposited",
  "pnl",
  "activeOrders",
  "marketPrices",
  "currentHolding",
  "forecast",
  "portfolioTotal"
];

function loadDashboardCardOrder(): DashboardCardId[] {
  if (typeof window === "undefined") return defaultDashboardCardOrder;

  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY);
    if (!raw) return defaultDashboardCardOrder;

    const parsed = JSON.parse(raw) as DashboardCardId[];
    const knownCards = new Set(defaultDashboardCardOrder);
    const savedCards = parsed.filter((id): id is DashboardCardId => knownCards.has(id));
    const missingCards = defaultDashboardCardOrder.filter((id) => !savedCards.includes(id));
    return [...savedCards, ...missingCards];
  } catch {
    return defaultDashboardCardOrder;
  }
}

export function Dashboard({ metrics, forecastMode, onForecastModeChange, onManageOrders }: DashboardProps) {
  const [cardOrder, setCardOrder] = useState<DashboardCardId[]>(loadDashboardCardOrder);
  const [draggedCard, setDraggedCard] = useState<DashboardCardId | null>(null);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(cardOrder));
  }, [cardOrder]);

  function moveCard(targetCard: DashboardCardId) {
    if (!draggedCard || draggedCard === targetCard) return;
    setCardOrder((currentOrder) => {
      const nextOrder = [...currentOrder];
      const fromIndex = nextOrder.indexOf(draggedCard);
      const toIndex = nextOrder.indexOf(targetCard);
      if (fromIndex < 0 || toIndex < 0) return currentOrder;

      const [movedCard] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, movedCard);
      return nextOrder;
    });
  }

  function renderCard(cardId: DashboardCardId) {
    if (cardId === "totalDIValue") return <TotalDIValueCard metrics={metrics} />;
    if (cardId === "netDeposited") return <MetricCard label="Net Deposited Capital" value={money(metrics.netDeposited)} />;
    if (cardId === "pnl") return <MetricCard label="DI Profit / Loss" value={money(metrics.pnl)} tone={metrics.pnl >= 0 ? "green" : "red"} />;
    if (cardId === "activeOrders") return <MetricCard label="Active Orders" value={String(metrics.activeOrders.length)} />;
    if (cardId === "marketPrices") return <MarketPricesCard prices={metrics.prices} />;
    if (cardId === "currentHolding") {
      return (
        <Card className="metric-card holding-entry-card">
          <span>Exposure Holding Entry</span>
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
      return <ForecastCard forecast={metrics.forecast} mode={forecastMode} onModeChange={onForecastModeChange} />;
    }
    return <MetricCard label="Portfolio Total Value" value={money(metrics.portfolioTotal)} />;
  }

  return (
    <>
      <section className="dashboard-grid">
        {cardOrder.map((cardId) => (
          <div
            key={cardId}
            className={`dashboard-card-slot ${draggedCard === cardId ? "dragging" : ""}`}
            draggable
            title="Drag to reorder"
            onDragStart={(event) => {
              setDraggedCard(cardId);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", cardId);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              moveCard(cardId);
            }}
            onDragEnd={() => setDraggedCard(null)}
          >
            {renderCard(cardId)}
          </div>
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
