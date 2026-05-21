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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { environment } from "./environment";
import { dateTime } from "./lib/domain/format";
import { parseFormattedNumber } from "./lib/domain/number-format";
import type { AppState, DIOrder, ForecastMode } from "./lib/domain/types";
import { emptyOrder, type OrderDraft } from "./lib/order-draft";
import { getExposureHoldingEntries, getHoldingEntries } from "./lib/services/cost-basis-service";
import {
  getActiveExposureReservations,
  getActiveReservations,
  getDIAvailableBalances,
  getDIAvailableExposureBalances,
  getLatestPrices
} from "./lib/services/ledger-service";
import { createOrder, softDeleteOrder } from "./lib/services/order-service";
import { evaluateOrder } from "./lib/services/order-evaluation-service";
import { fetchMarketPrices } from "./lib/services/price-service";
import {
  getCurrentDIValueUSDT,
  getDIWorkingCapitalUSDT,
  getDIPnlUSDT,
  getExternalDepositsUSDT,
  getExternalNetDepositedCapitalUSDT,
  getExternalWithdrawalsUSDT,
  getInternalTransfersUSDT,
  getPendingPremiumUSDT,
  getPortfolioTotalValueUSDT,
  getStoragePortfolioValueUSDT,
  getTotalPortfolioPnlUSDT,
  makeForecast
} from "./lib/services/portfolio-service";
import { recordPortfolioBuy, type PortfolioBuyInput } from "./lib/services/portfolio-adjustment-service";
import { depositToPocket, mergePockets } from "./lib/services/pocket-service";
import { settleOrder } from "./lib/services/settlement-service";
import { loadState, resetState, saveState } from "./lib/store/local-store";
import type { DashboardMetrics, OrderSettlementResult, Tab } from "./lib/view-models";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [forecastMode, setForecastMode] = useState<ForecastMode>("SETTLED_ONLY");
  const [targetDailyReturnPercent, setTargetDailyReturnPercent] = useState(0.3);
  const [priceStatus, setPriceStatus] = useState(environment.mock.enabled ? "Mock prices loaded" : "No prices loaded");
  const [orderForm, setOrderForm] = useState<OrderDraft>(emptyOrder);
  const [settlementRequest, setSettlementRequest] = useState<{ order: DIOrder; result: OrderSettlementResult } | null>(null);
  const [settlementReceived, setSettlementReceived] = useState("");
  const [settlementNote, setSettlementNote] = useState("");
  const [deleteRequest, setDeleteRequest] = useState<DIOrder | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

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

    const forecast = makeForecast(state, forecastMode, { targetDailyReturnRate: targetDailyReturnPercent / 100 });
    const activeOrders = state.orders.filter((order) => order.status === "ACTIVE" && !order.isDeleted);
    const nextSettlement = activeOrders
      .slice()
      .sort((a, b) => new Date(a.settlementTime).getTime() - new Date(b.settlementTime).getTime())[0];

    return {
      prices: getLatestPrices(state),
      diValue: getCurrentDIValueUSDT(state),
      netDeposited: getExternalNetDepositedCapitalUSDT(state),
      externalDeposits: getExternalDepositsUSDT(state),
      externalWithdrawals: getExternalWithdrawalsUSDT(state),
      internalTransfers: getInternalTransfersUSDT(state),
      diWorkingCapital: getDIWorkingCapitalUSDT(state),
      pnl: getDIPnlUSDT(state),
      totalPortfolioPnl: getTotalPortfolioPnlUSDT(state),
      activeOrders,
      availableBalances: getDIAvailableBalances(state),
      activeReservations: getActiveReservations(state),
      availableExposureBalances: getDIAvailableExposureBalances(state),
      activeExposureReservations: getActiveExposureReservations(state),
      pendingPremium: getPendingPremiumUSDT(state),
      forecast,
      nextSettlement,
      portfolioTotal: getPortfolioTotalValueUSDT(state),
      storagePortfolioValue: getStoragePortfolioValueUSDT(state),
      holdingEntries: getHoldingEntries(state, { hideDust: true }),
      exposureHoldingEntries: getExposureHoldingEntries(state, { hideDust: true })
    };
  }, [state, forecastMode, targetDailyReturnPercent]);

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

  function requestSettlement(order: DIOrder, result: OrderSettlementResult) {
    const expectedAmount = result === "HIT" ? order.ifHitAmount : order.ifNotHitAmount;
    setSettlementRequest({ order, result });
    setSettlementReceived(String(expectedAmount));
    setSettlementNote(`${result} settlement`);
  }

  function confirmSettlement() {
    if (!settlementRequest) return;

    const { order, result } = settlementRequest;
    const expectedAsset = result === "HIT" ? order.ifHitAsset : order.ifNotHitAsset;
    const receivedAmount = parseFormattedNumber(settlementReceived);
    if (receivedAmount === null) {
      toast.error("Actual received amount must be numeric.");
      return;
    }

    if (!settlementNote.trim()) {
      toast.error("Settlement note is required.");
      return;
    }

    try {
      setState((current) => current
        ? settleOrder(current, {
            orderId: order.id,
            result,
            receivedAsset: expectedAsset,
            receivedAmount,
            settledAt: new Date().toISOString(),
            note: settlementNote
          })
        : current
      );
      setSettlementRequest(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settlement failed");
    }
  }

  function deleteOrder(order: DIOrder) {
    setDeleteRequest(order);
    setDeleteReason("");
  }

  function confirmDeleteOrder() {
    if (!deleteRequest) return;
    if (!deleteReason.trim()) {
      toast.error("Delete note is required.");
      return false;
    }

    try {
      setState((current) => current ? softDeleteOrder(current, deleteRequest.id, deleteReason) : current);
      setDeleteRequest(null);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      return false;
    }
  }

  function createDeposit(pocketId: string, amount: number, note: string) {
    try {
      setState((current) => current ? depositToPocket(current, pocketId, amount, note) : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deposit failed");
    }
  }

  function mergePocket(sourcePocketId: string, targetPocketId: string, note: string) {
    try {
      setState((current) => current ? mergePockets(current, sourcePocketId, targetPocketId, note) : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Merge failed");
    }
  }

  function recordBuy(input: PortfolioBuyInput) {
    try {
      setState((current) => current ? recordPortfolioBuy(current, input) : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Portfolio buy failed");
    }
  }

  function renderActiveTab() {
    if (tab === "dashboard") {
      return (
        <Dashboard
          metrics={currentMetrics}
          forecastMode={forecastMode}
          onForecastModeChange={setForecastMode}
          targetDailyReturnPercent={targetDailyReturnPercent}
          onTargetDailyReturnPercentChange={setTargetDailyReturnPercent}
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
          onSettleOrder={requestSettlement}
          onDeleteOrder={deleteOrder}
        />
      );
    }

    if (tab === "pockets") {
      return <PocketsView state={currentState} onDeposit={createDeposit} onMerge={mergePocket} />;
    }

    if (tab === "portfolio") {
      return <PortfolioView state={currentState} metrics={currentMetrics} onRecordBuy={recordBuy} />;
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
    <>
      <AppShell
        activeTab={tab}
        priceStatus={priceStatus}
        onTabChange={setTab}
        onRefreshPrices={() => void refreshPrices()}
      >
        {renderActiveTab()}
      </AppShell>

      <Dialog open={settlementRequest !== null} onOpenChange={(open) => !open && setSettlementRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Order</DialogTitle>
            <DialogDescription>
              Record the actual received amount and settlement note.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="settlement-received">Actual received amount</FieldLabel>
              <Input
                id="settlement-received"
                inputMode="decimal"
                value={settlementReceived}
                onChange={(event) => setSettlementReceived(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="settlement-note">Settlement note</FieldLabel>
              <Input
                id="settlement-note"
                value={settlementNote}
                onChange={(event) => setSettlementNote(event.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setSettlementRequest(null)}>Cancel</Button>
            <Button type="button" onClick={confirmSettlement}>Confirm settlement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRequest !== null} onOpenChange={(open) => !open && setDeleteRequest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              This soft-deletes the order and writes an audit note. A reason is required.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor="delete-reason">Delete note</FieldLabel>
            <Input
              id="delete-reason"
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
            />
          </Field>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteOrder();
              }}
            >
              Delete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
