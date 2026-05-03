"use client";

import {
  Activity,
  Archive,
  BarChart3,
  BookOpen,
  Coins,
  Gauge,
  LayoutDashboard,
  Plus,
  RefreshCcw,
  Split,
  Trash2,
  WalletCards
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { amount, dateTime, hoursUntil, money, percent } from "./lib/domain/format";
import type { AppState, Asset, DIOrder, Exchange, ForecastMode, MarketContextTag, ProductType } from "./lib/domain/types";
import { activeOrderPendingPremiumUSDT, getCurrentDIValueUSDT, getDIPnlUSDT, getNetDepositedCapitalUSDT, getPendingPremiumUSDT, getPortfolioTotalValueUSDT, makeForecast } from "./lib/services/portfolio-service";
import { createOrder } from "./lib/services/order-service";
import { depositToPocket, mergePockets } from "./lib/services/pocket-service";
import { settleOrder } from "./lib/services/settlement-service";
import { getActiveReservations, getAvailableBalances, getLatestPrices, getLedgerBalances } from "./lib/services/ledger-service";
import { getHoldingEntries } from "./lib/services/cost-basis-service";
import { evaluateOrder } from "./lib/services/order-evaluation-service";
import { fetchMarketPrices } from "./lib/services/price-service";
import { loadState, resetState, saveState } from "./lib/store/local-store";

type Tab = "dashboard" | "orders" | "pockets" | "portfolio" | "analytics" | "audit" | "plan";
type DashboardMetrics = {
  prices: ReturnType<typeof getLatestPrices>;
  diValue: number;
  netDeposited: number;
  pnl: number;
  activeOrders: DIOrder[];
  availableBalances: ReturnType<typeof getAvailableBalances>;
  activeReservations: ReturnType<typeof getActiveReservations>;
  pendingPremium: number;
  forecast: ReturnType<typeof makeForecast>;
  nextSettlement?: DIOrder;
  portfolioTotal: number;
  holdingEntries: ReturnType<typeof getHoldingEntries>;
};

const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "orders", label: "Orders", icon: <BookOpen size={18} /> },
  { id: "pockets", label: "Pockets", icon: <Split size={18} /> },
  { id: "portfolio", label: "Portfolio", icon: <WalletCards size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { id: "audit", label: "Audit", icon: <Archive size={18} /> },
  { id: "plan", label: "Roadmap", icon: <Gauge size={18} /> }
];

const contextTags: MarketContextTag[] = ["Pumping hard", "Dumping hard", "Sideway", "Near support", "Near resistance"];

const emptyOrder = {
  exchange: "OKX" as Exchange,
  productType: "BUY_LOW" as ProductType,
  pocketId: "pocket_core_sol",
  pair: "USDT-OKSOL",
  subscribedAsset: "USDT" as Asset,
  subscribedAmount: 3064,
  strikePrice: 86,
  aprPercent: 97.6,
  termRatePercent: 1.036,
  startTime: "2026-04-26T11:00",
  settlementTime: "2026-04-26T18:00",
  expectedPremiumAmount: 31.75,
  expectedPremiumAsset: "USDT" as Asset,
  ifHitAsset: "OKSOL" as Asset,
  ifHitAmount: 35.99708619,
  ifNotHitAsset: "USDT" as Asset,
  ifNotHitAmount: 3095.75,
  marketContextTags: ["Sideway"] as MarketContextTag[],
  note: ""
};

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [forecastMode, setForecastMode] = useState<ForecastMode>("SETTLED_AVERAGE");
  const [priceStatus, setPriceStatus] = useState("Mock prices loaded");
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [depositAmount, setDepositAmount] = useState(500);
  const [depositPocketId, setDepositPocketId] = useState("pocket_core_sol");
  const [depositNote, setDepositNote] = useState("New DI capital");

  useEffect(() => setState(loadState()), []);
  useEffect(() => {
    if (state) saveState(state);
  }, [state]);
  useEffect(() => {
    const id = window.setInterval(() => void refreshPrices(), 30_000);
    return () => window.clearInterval(id);
  });

  const metrics = useMemo(() => {
    if (!state) return null;
    const forecast = makeForecast(state, forecastMode);
    const activeOrders = state.orders.filter((order) => order.status === "ACTIVE" && !order.isDeleted);
    const nextSettlement = activeOrders.sort((a, b) => new Date(a.settlementTime).getTime() - new Date(b.settlementTime).getTime())[0];
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

  if (!state || !metrics) return <main className="loading">Loading DI Tracker...</main>;
  const currentState = state;

  async function refreshPrices() {
    if (!state) return;
    try {
      const snapshots = await fetchMarketPrices();
      setState({ ...state, priceSnapshots: [...snapshots, ...state.priceSnapshots] });
      setPriceStatus(`Fresh prices: ${dateTime(snapshots[0].capturedAt)}`);
    } catch {
      setPriceStatus("Price API failed. Using last known/mock prices.");
    }
  }

  function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = createOrder(currentState, {
      ...orderForm,
      portfolioId: currentState.portfolio.id
    });
    setState(next);
    setTab("orders");
  }

  function settle(order: DIOrder, result: "HIT" | "NOT_HIT") {
    const expectedAsset = result === "HIT" ? order.ifHitAsset : order.ifNotHitAsset;
    const expectedAmount = result === "HIT" ? order.ifHitAmount : order.ifNotHitAmount;
    const receivedRaw = window.prompt(`Actual received amount (${expectedAsset})`, String(expectedAmount));
    if (!receivedRaw) return;
    const note = window.prompt("Settlement note/reason", `${result} settlement`) ?? "";
    if (!note.trim()) return window.alert("Settlement note is required.");
    try {
      setState(
        settleOrder(currentState, {
          orderId: order.id,
          result,
          receivedAsset: expectedAsset,
          receivedAmount: Number(receivedRaw),
          settledAt: new Date().toISOString(),
          note
        })
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Settlement failed");
    }
  }

  function deleteOrder(order: DIOrder) {
    const reason = window.prompt("Delete note is required");
    if (!reason?.trim()) return;
    setState({
      ...currentState,
      orders: currentState.orders.map((item) =>
        item.id === order.id ? { ...item, status: "DELETED", isDeleted: true, deletedAt: new Date().toISOString(), deleteReason: reason } : item
      ),
      auditLogs: [
        {
          id: `audit_${Date.now()}`,
          portfolioId: currentState.portfolio.id,
          entityType: "DI_ORDER",
          entityId: order.id,
          action: "DELETE_ORDER",
          changedFields: [{ field: "status", oldValue: order.status, newValue: "DELETED" }],
          reason,
          createdAt: new Date().toISOString()
        },
        ...currentState.auditLogs
      ]
    });
  }

  const evaluatedDraft = evaluateOrder(orderForm);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Coins />
          <div>
            <strong>DI Tracker</strong>
            <span>SOL/OKSOL operating ledger</span>
          </div>
        </div>
        <nav>
          {tabs.map((item) => (
            <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Base currency: USDT · Timezone UTC+7</p>
            <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
          </div>
          <div className="toolbar">
            <span className="price-status">{priceStatus}</span>
            <button className="icon-button" title="Refresh prices" onClick={() => void refreshPrices()}>
              <RefreshCcw size={18} />
            </button>
          </div>
        </header>

        {tab === "dashboard" && (
          <Dashboard
            metrics={metrics}
            forecastMode={forecastMode}
            setForecastMode={setForecastMode}
            setTab={setTab}
          />
        )}

        {tab === "orders" && (
          <div className="two-column">
            <section>
              <div className="section-heading">
                <h2>Active & History</h2>
                <span>{metrics.activeOrders.length} active · {money(metrics.pendingPremium)} pending premium</span>
              </div>
              <div className="order-list">
                {currentState.orders.filter((order) => !order.isDeleted).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    evaluation={currentState.orderEvaluations.find((item) => item.orderId === order.id)}
                    pendingPremium={activeOrderPendingPremiumUSDT(order, metrics.prices)}
                    onSettle={settle}
                    onDelete={deleteOrder}
                  />
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <h2>Create Order</h2>
                <span>{evaluatedDraft.score} · {evaluatedDraft.riskLevel} risk</span>
              </div>
              <form className="form-grid" onSubmit={submitOrder}>
                <label>Pocket<select value={orderForm.pocketId} onChange={(e) => setOrderForm({ ...orderForm, pocketId: e.target.value })}>{currentState.pockets.filter((p) => p.status === "ACTIVE").map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}</select></label>
                <label>Product<select value={orderForm.productType} onChange={(e) => setOrderForm({ ...orderForm, productType: e.target.value as ProductType })}><option value="BUY_LOW">Buy Low</option><option value="SELL_HIGH">Sell High</option></select></label>
                <label>Pair<input value={orderForm.pair} onChange={(e) => setOrderForm({ ...orderForm, pair: e.target.value })} /></label>
                <label>Subscribed asset<AssetSelect value={orderForm.subscribedAsset} onChange={(value) => setOrderForm({ ...orderForm, subscribedAsset: value })} /></label>
                <label>Subscribed amount<input type="number" step="any" value={orderForm.subscribedAmount} onChange={(e) => setOrderForm({ ...orderForm, subscribedAmount: Number(e.target.value) })} /></label>
                <label>Strike<input type="number" step="any" value={orderForm.strikePrice} onChange={(e) => setOrderForm({ ...orderForm, strikePrice: Number(e.target.value) })} /></label>
                <label>APR %<input type="number" step="any" value={orderForm.aprPercent} onChange={(e) => setOrderForm({ ...orderForm, aprPercent: Number(e.target.value) })} /></label>
                <label>Term rate %<input type="number" step="any" value={orderForm.termRatePercent} onChange={(e) => setOrderForm({ ...orderForm, termRatePercent: Number(e.target.value) })} /></label>
                <label>Start<input type="datetime-local" value={orderForm.startTime} onChange={(e) => setOrderForm({ ...orderForm, startTime: e.target.value })} /></label>
                <label>Settlement<input type="datetime-local" value={orderForm.settlementTime} onChange={(e) => setOrderForm({ ...orderForm, settlementTime: e.target.value })} /></label>
                <label>Premium amount<input type="number" step="any" value={orderForm.expectedPremiumAmount} onChange={(e) => setOrderForm({ ...orderForm, expectedPremiumAmount: Number(e.target.value) })} /></label>
                <label>Premium asset<AssetSelect value={orderForm.expectedPremiumAsset} onChange={(value) => setOrderForm({ ...orderForm, expectedPremiumAsset: value })} /></label>
                <label>If hit amount<input type="number" step="any" value={orderForm.ifHitAmount} onChange={(e) => setOrderForm({ ...orderForm, ifHitAmount: Number(e.target.value) })} /></label>
                <label>If hit asset<AssetSelect value={orderForm.ifHitAsset} onChange={(value) => setOrderForm({ ...orderForm, ifHitAsset: value })} /></label>
                <label>If not hit amount<input type="number" step="any" value={orderForm.ifNotHitAmount} onChange={(e) => setOrderForm({ ...orderForm, ifNotHitAmount: Number(e.target.value) })} /></label>
                <label>If not hit asset<AssetSelect value={orderForm.ifNotHitAsset} onChange={(value) => setOrderForm({ ...orderForm, ifNotHitAsset: value })} /></label>
                <div className="tag-grid">
                  {contextTags.map((tag) => (
                    <label key={tag} className="check-label"><input type="checkbox" checked={orderForm.marketContextTags.includes(tag)} onChange={(e) => setOrderForm({ ...orderForm, marketContextTags: e.target.checked ? [...orderForm.marketContextTags, tag] : orderForm.marketContextTags.filter((item) => item !== tag) })} />{tag}</label>
                  ))}
                </div>
                <label className="wide">Note<input value={orderForm.note} onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })} /></label>
                <div className="evaluation-box">
                  <strong>{evaluatedDraft.score} · {evaluatedDraft.riskLevel} Risk · {evaluatedDraft.efficiencyLabel}</strong>
                  <span>{evaluatedDraft.reasons.join(" ")}</span>
                </div>
                <button className="primary wide" type="submit"><Plus size={18} />Save active order</button>
              </form>
            </section>
          </div>
        )}

        {tab === "pockets" && (
          <div className="two-column">
            <section className="card-grid">
              {currentState.pockets.map((pocket) => {
                const balances = getAvailableBalances(currentState, pocket.id);
                return (
                  <article className="card" key={pocket.id}>
                    <span className={`badge ${pocket.status.toLowerCase()}`}>{pocket.status}</span>
                    <h3>{pocket.name}</h3>
                    <p>{pocket.note}</p>
                    <div className="mini-list">
                      {balances.map((balance) => <span key={balance.asset}>{amount(balance.amount)} {balance.asset} · {money(balance.valueUSDT)}</span>)}
                    </div>
                  </article>
                );
              })}
            </section>
            <section className="panel">
              <h2>Capital & Merge</h2>
              <form className="form-grid" onSubmit={(event) => { event.preventDefault(); setState(depositToPocket(currentState, depositPocketId, depositAmount, depositNote)); }}>
                <label>Deposit pocket<select value={depositPocketId} onChange={(e) => setDepositPocketId(e.target.value)}>{currentState.pockets.filter((p) => p.status === "ACTIVE").map((pocket) => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}</select></label>
                <label>USDT amount<input type="number" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} /></label>
                <label className="wide">Note<input required value={depositNote} onChange={(e) => setDepositNote(e.target.value)} /></label>
                <button className="primary wide" type="submit">Create deposit</button>
              </form>
              <button className="secondary" onClick={() => {
                const source = window.prompt("Source pocket id", "pocket_extra");
                const target = window.prompt("Target pocket id", "pocket_core_sol");
                const note = window.prompt("Merge note", "Merge back to core");
                if (source && target && note) setState(mergePockets(currentState, source, target, note));
              }}>Merge pockets by id</button>
            </section>
          </div>
        )}

        {tab === "portfolio" && (
          <section className="panel">
            <h2>Portfolio Overview</h2>
            <div className="stat-row">
              <Metric label="Portfolio Total Value" value={money(metrics.portfolioTotal)} />
              <Metric label="DI Value" value={money(metrics.diValue)} />
              <Metric label="Pending Premium" value={money(metrics.pendingPremium)} />
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Asset</th><th>Amount</th><th>Underlying</th><th>Value</th></tr></thead>
                <tbody>{getLedgerBalances(currentState).map((balance) => <tr key={balance.asset}><td>{balance.asset}</td><td>{amount(balance.amount)}</td><td>{balance.underlyingAsset}</td><td>{money(balance.valueUSDT)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "analytics" && (
          <section className="panel">
            <h2>Performance Detail</h2>
            <div className="stat-row">
              <Metric label="Average APR" value={percent(avg(currentState.orders.map((o) => o.aprPercent)))} />
              <Metric label="Average Term Rate" value={percent(avg(currentState.orders.map((o) => o.termRatePercent)))} />
              <Metric label="Hit Rate" value={percent(hitRate(currentState.orders))} />
              <Metric label="Settled Orders" value={String(currentState.orders.filter((o) => o.status.startsWith("SETTLED")).length)} />
            </div>
          </section>
        )}

        {tab === "audit" && (
          <section className="panel">
            <h2>Audit Log</h2>
            <div className="audit-list">{currentState.auditLogs.map((log) => <article key={log.id}><strong>{log.action}</strong><span>{log.entityType} · {dateTime(log.createdAt)}</span><p>{log.reason}</p></article>)}</div>
          </section>
        )}

        {tab === "plan" && <Roadmap onReset={() => setState(resetState())} />}
      </section>
    </main>
  );
}

function Dashboard({ metrics, forecastMode, setForecastMode, setTab }: { metrics: DashboardMetrics; forecastMode: ForecastMode; setForecastMode: (mode: ForecastMode) => void; setTab: (tab: Tab) => void }) {
  return (
    <>
      <section className="dashboard-grid">
        <TotalDIValueCard metrics={metrics} />
        <Metric label="Net Deposited Capital" value={money(metrics.netDeposited)} />
        <Metric label="DI Profit / Loss" value={money(metrics.pnl)} tone={metrics.pnl >= 0 ? "green" : "red"} />
        <Metric label="Active Orders" value={String(metrics.activeOrders.length)} />
        <MarketPrices prices={metrics.prices} />
        <Metric label="Current Holding Entry" value={metrics.holdingEntries[0] ? `${money(metrics.holdingEntries[0].entry, 4)} / ${metrics.holdingEntries[0].asset}` : "No coin lots"} />
        <article className="metric-card forecast-card">
          <span>1-Year Forecast</span>
          <strong>{money(metrics.forecast.projectedOneYearValueUSDT)}</strong>
          <div className="segmented"><button className={forecastMode === "SETTLED_AVERAGE" ? "active" : ""} onClick={() => setForecastMode("SETTLED_AVERAGE")}>Settled Avg</button><button className={forecastMode === "BLENDED" ? "active" : ""} onClick={() => setForecastMode("BLENDED")}>Blended</button></div>
          <small>{metrics.forecast.confidence} confidence · projection, not promise</small>
        </article>
        <Metric label="Next Settlement Countdown" value={metrics.nextSettlement ? `${hoursUntil(metrics.nextSettlement.settlementTime).toFixed(1)}h` : "No active orders"} />
        <Metric label="Portfolio Total Value" value={money(metrics.portfolioTotal)} />
      </section>
      <section className="active-strip">
        <div className="section-heading"><h2>Active Orders</h2><button className="secondary" onClick={() => setTab("orders")}>Manage orders</button></div>
        <div className="order-list compact">{metrics.activeOrders.map((order) => <OrderCard key={order.id} order={order} pendingPremium={activeOrderPendingPremiumUSDT(order, metrics.prices)} />)}</div>
      </section>
    </>
  );
}

function OrderCard({ order, evaluation, pendingPremium, onSettle, onDelete }: { order: DIOrder; evaluation?: { score: string; riskLevel: string }; pendingPremium: number; onSettle?: (order: DIOrder, result: "HIT" | "NOT_HIT") => void; onDelete?: (order: DIOrder) => void }) {
  return (
    <article className={`order-card ${order.productType.toLowerCase()} ${order.status.toLowerCase()}`}>
      <div className="order-title">
        <div><span className={`badge ${order.productType.toLowerCase()}`}>{order.productType === "BUY_LOW" ? "BUY LOW" : "SELL HIGH"}</span><span className={`badge ${order.status.toLowerCase()}`}>{order.status.replaceAll("_", " ")}</span></div>
        <strong>{order.exchange} · {order.pair}</strong>
      </div>
      <div className="order-metrics">
        <span>Capital <b>{amount(order.subscribedAmount)} {order.subscribedAsset}</b></span>
        <span>Strike <b>{money(order.strikePrice, 2)}</b></span>
        <span>APR <b>{percent(order.aprPercent)}</b></span>
        <span>Term <b>{percent(order.termRatePercent, 3)}</b></span>
        <span>Premium <b>{amount(order.expectedPremiumAmount)} {order.expectedPremiumAsset}</b></span>
        {order.status === "ACTIVE" && <span>Pending premium <b>{money(pendingPremium)}</b></span>}
      </div>
      <details>
        <summary>Outcome detail</summary>
        <p>If Hit: receive {amount(order.ifHitAmount)} {order.ifHitAsset}</p>
        <p>If Not Hit: receive {amount(order.ifNotHitAmount)} {order.ifNotHitAsset}</p>
        <p>Settlement: {dateTime(order.settlementTime)}</p>
        <p>Tags: {order.marketContextTags.join(", ") || "None"}</p>
        {evaluation && <p>Evaluation: {evaluation.score} · {evaluation.riskLevel} Risk</p>}
      </details>
      {order.status === "ACTIVE" && onSettle && (
        <div className="card-actions">
          <button className="secondary" onClick={() => onSettle(order, "HIT")}>Settle Hit</button>
          <button className="secondary" onClick={() => onSettle(order, "NOT_HIT")}>Settle Not Hit</button>
          {onDelete && <button className="danger" title="Soft delete" onClick={() => onDelete(order)}><Trash2 size={16} /></button>}
        </div>
      )}
    </article>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "red" | "blue" }) {
  return <article className={`metric-card ${tone}`}><span>{label}</span><strong>{value}</strong></article>;
}

function TotalDIValueCard({ metrics }: { metrics: DashboardMetrics }) {
  const hasCoinExposure = [...metrics.availableBalances, ...metrics.activeReservations].some((balance) => balance.asset !== "USDT");

  return (
    <article className="metric-card total-value-card blue">
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
    </article>
  );
}

function MarketPrices({ prices }: { prices: DashboardMetrics["prices"] }) {
  return (
    <article className="metric-card price-card">
      <span>Market Prices</span>
      <div className="price-list">
        <strong>SOL {money(prices.SOL)}</strong>
        <strong>BTC {money(prices.BTC)}</strong>
        <strong>ETH {money(prices.ETH)}</strong>
      </div>
      <small>OKSOL uses SOL price</small>
    </article>
  );
}

function AssetSelect({ value, onChange }: { value: Asset; onChange: (value: Asset) => void }) {
  return <select value={value} onChange={(e) => onChange(e.target.value as Asset)}>{(["USDT", "SOL", "OKSOL", "BTC", "ETH"] as Asset[]).map((asset) => <option key={asset} value={asset}>{asset}</option>)}</select>;
}

function Roadmap({ onReset }: { onReset: () => void }) {
  return (
    <section className="panel roadmap">
      <h2>Phase Memory</h2>
      <div className="phase-list">
        <article><Activity /><strong>Phase 1 in this build</strong><p>Domain model, mock persistence, dashboard, active/history orders, create order, settle order, ledger entries, cost basis lots, pockets, deposits, merge flow, portfolio overview, audit log, forecast settled/blended, order evaluation, responsive shell.</p></article>
        <article><BarChart3 /><strong>Phase 2 backlog</strong><p>Supabase/Postgres repository, auth optional, advanced analytics charts, CSV export, richer filters/sorts, edit settled order modal, manual portfolio adjustment form, forecast detail page, PWA and deploy hardening.</p></article>
      </div>
      <button className="danger" onClick={onReset}>Reset local mock data</button>
    </section>
  );
}

function avg(values: number[]) {
  const filtered = values.filter(Number.isFinite);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function hitRate(orders: DIOrder[]) {
  const settled = orders.filter((order) => order.status.startsWith("SETTLED"));
  if (!settled.length) return 0;
  return (settled.filter((order) => order.status === "SETTLED_HIT").length / settled.length) * 100;
}
