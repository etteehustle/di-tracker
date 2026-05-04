"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { AuditView } from "./components/audit/AuditView";
import { Dashboard } from "./components/dashboard/Dashboard";
import { OrdersView } from "./components/orders/OrdersView";
import { PocketsView } from "./components/pockets/PocketsView";
import { PortfolioView } from "./components/portfolio/PortfolioView";
import { Roadmap } from "./components/roadmap/Roadmap";
import { AppShell } from "./components/shell/AppShell";
import { environment } from "./environment";
import { dateTime } from "./lib/domain/format";
import type { AppState, DIOrder, ForecastMode } from "./lib/domain/types";
import { emptyOrder, type OrderDraft } from "./lib/order-draft";
import { getHoldingEntries } from "./lib/services/cost-basis-service";
import { getActiveReservations, getAvailableBalances, getLatestPrices } from "./lib/services/ledger-service";
import { createOrder, softDeleteOrder } from "./lib/services/order-service";
import { evaluateOrder } from "./lib/services/order-evaluation-service";
import { fetchMarketPrices } from "./lib/services/price-service";
import {
  getCurrentDIValueUSDT,
  getDIPnlUSDT,
  getNetDepositedCapitalUSDT,
  getPendingPremiumUSDT,
  getPortfolioTotalValueUSDT,
  makeForecast
} from "./lib/services/portfolio-service";
import { depositToPocket, mergePockets } from "./lib/services/pocket-service";
import { settleOrder } from "./lib/services/settlement-service";
import { loadState, resetState, saveState } from "./lib/store/local-store";
import type { DashboardMetrics, OrderSettlementResult, Tab } from "./lib/view-models";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [forecastMode, setForecastMode] = useState<ForecastMode>("SETTLED_AVERAGE");
  const [priceStatus, setPriceStatus] = useState(environment.mock.enabled ? "Mock prices loaded" : "No prices loaded");
  const [orderForm, setOrderForm] = useState<OrderDraft>(emptyOrder);

  useEffect(() => setState(loadState()), []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  useEffect(() => {
    const id = window.setInterval(() => void refreshPrices(), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const metrics = useMemo<DashboardMetrics | null>(() => {
    if (!state) return null;

    const forecast = makeForecast(state, forecastMode);
    const activeOrders = state.orders.filter((order) => order.status === "ACTIVE" && !order.isDeleted);
    const nextSettlement = activeOrders
      .slice()
      .sort((a, b) => new Date(a.settlementTime).getTime() - new Date(b.settlementTime).getTime())[0];

    return {
      prices: getLatestPrices(state),
      diValue: getCurrentDIValueUSDT(state),
      netDeposited: getNetDepositedCapitalUSDT(state),
      pnl: getDIPnlUSDT(state),
      activeOrders,
      availableBalances: getAvailableBalances(state),
      activeReservations: getActiveReservations(state),
      pendingPremium: getPendingPremiumUSDT(state),
      forecast,
      nextSettlement,
      portfolioTotal: getPortfolioTotalValueUSDT(state),
      holdingEntries: getHoldingEntries(state)
    };
  }, [state, forecastMode]);

  async function refreshPrices() {
    try {
      const snapshots = await fetchMarketPrices();
      setState((current) => current ? { ...current, priceSnapshots: [...snapshots, ...current.priceSnapshots] } : current);
      setPriceStatus(`Fresh prices: ${dateTime(snapshots[0].capturedAt)}`);
    } catch {
      setPriceStatus(
        environment.mock.enabled
          ? "Price API failed. Using last known/mock prices."
          : "Price API failed. Mock prices are disabled."
      );
    }
  }

  if (!state || !metrics) return <main className="loading">Loading DI Tracker...</main>;
  const currentState = state;
  const currentMetrics = metrics;

  function submitOrder(draft: OrderDraft) {
    setState((current) => {
      if (!current) return current;
      return createOrder(current, { ...draft, portfolioId: current.portfolio.id });
    });
    setTab("orders");
  }

  function settle(order: DIOrder, result: OrderSettlementResult) {
    const expectedAsset = result === "HIT" ? order.ifHitAsset : order.ifNotHitAsset;
    const expectedAmount = result === "HIT" ? order.ifHitAmount : order.ifNotHitAmount;
    const receivedRaw = window.prompt(`Actual received amount (${expectedAsset})`, String(expectedAmount));
    if (!receivedRaw) return;

    const note = window.prompt("Settlement note/reason", `${result} settlement`) ?? "";
    if (!note.trim()) return window.alert("Settlement note is required.");

    try {
      setState((current) => current
        ? settleOrder(current, {
            orderId: order.id,
            result,
            receivedAsset: expectedAsset,
            receivedAmount: Number(receivedRaw),
            settledAt: new Date().toISOString(),
            note
          })
        : current
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Settlement failed");
    }
  }

  function deleteOrder(order: DIOrder) {
    const reason = window.prompt("Delete note is required");
    if (!reason?.trim()) return;

    try {
      setState((current) => current ? softDeleteOrder(current, order.id, reason) : current);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function createDeposit(pocketId: string, amount: number, note: string) {
    try {
      setState((current) => current ? depositToPocket(current, pocketId, amount, note) : current);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Deposit failed");
    }
  }

  function mergePocket(sourcePocketId: string, targetPocketId: string, note: string) {
    try {
      setState((current) => current ? mergePockets(current, sourcePocketId, targetPocketId, note) : current);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Merge failed");
    }
  }

  function renderActiveTab() {
    if (tab === "dashboard") {
      return (
        <Dashboard
          metrics={currentMetrics}
          forecastMode={forecastMode}
          onForecastModeChange={setForecastMode}
          onManageOrders={() => setTab("orders")}
        />
      );
    }

    if (tab === "orders") {
      return (
        <OrdersView
          state={currentState}
          metrics={currentMetrics}
          draft={orderForm}
          draftEvaluation={evaluateOrder(orderForm)}
          onDraftChange={setOrderForm}
          onCreateOrder={submitOrder}
          onSettleOrder={settle}
          onDeleteOrder={deleteOrder}
        />
      );
    }

    if (tab === "pockets") {
      return <PocketsView state={currentState} onDeposit={createDeposit} onMerge={mergePocket} />;
    }

    if (tab === "portfolio") {
      return <PortfolioView state={currentState} metrics={currentMetrics} />;
    }

    if (tab === "analytics") {
      return <AnalyticsView state={currentState} />;
    }

    if (tab === "audit") {
      return <AuditView state={currentState} />;
    }

    return <Roadmap onReset={() => setState(resetState())} />;
  }

  return (
    <AppShell
      activeTab={tab}
      priceStatus={priceStatus}
      onTabChange={setTab}
      onRefreshPrices={() => void refreshPrices()}
    >
      {renderActiveTab()}
    </AppShell>
  );
}
