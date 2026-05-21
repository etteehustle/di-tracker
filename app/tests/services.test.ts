import { describe, expect, it } from "vitest";
import type { AppState, DIOrder } from "../lib/domain/types";
import { normalizeAsset } from "../lib/domain/assets";
import { getExposureHoldingEntries, getHoldingEntries, weightedAverageEntry } from "../lib/services/cost-basis-service";
import { getLedgerBalances, getLedgerExposureBalances } from "../lib/services/ledger-service";
import { getCurrentDIValueUSDT, getDIPnlUSDT, getNetDepositedCapitalUSDT, makeForecast } from "../lib/services/portfolio-service";
import { recordPortfolioBuy } from "../lib/services/portfolio-adjustment-service";
import { mergePockets } from "../lib/services/pocket-service";
import { softDeleteOrder } from "../lib/services/order-service";
import { settleOrder } from "../lib/services/settlement-service";
import { seedState } from "../lib/store/mock-data";

function cloneState(): AppState {
  return JSON.parse(JSON.stringify(seedState)) as AppState;
}

function withActiveOrder(state: AppState, order: DIOrder): AppState {
  return {
    ...state,
    orders: [order, ...state.orders]
  };
}

describe("DI accounting services", () => {
  it("normalizes OKSOL as SOL exposure", () => {
    expect(normalizeAsset("OKSOL")).toBe("SOL");
    expect(normalizeAsset("SOL")).toBe("SOL");
  });

  it("calculates weighted average cost basis for SOL/OKSOL", () => {
    const state = cloneState();
    expect(weightedAverageEntry(state.costBasisLots, "SOL")).toBeCloseTo(84.1354, 4);
    expect(weightedAverageEntry(state.costBasisLots, "OKSOL")).toBeCloseTo(84.1354, 4);
  });

  it("keeps actual asset balances separate while grouping SOL/OKSOL exposure", () => {
    const state = recordPortfolioBuy(cloneState(), {
      asset: "SOL",
      amount: 10,
      costUSDT: 800,
      note: "test SOL buy"
    });

    const actualBalances = getLedgerBalances(state);
    const exposureBalances = getLedgerExposureBalances(state);

    expect(actualBalances.find((balance) => balance.asset === "SOL")?.amount).toBeCloseTo(10, 6);
    expect(actualBalances.find((balance) => balance.asset === "OKSOL")?.amount).toBeCloseTo(63.71871989, 6);
    expect(exposureBalances.find((balance) => balance.underlyingAsset === "SOL")?.amount).toBeCloseTo(73.71871989, 6);
  });

  it("creates effective entry for Buy Low hit", () => {
    const state = cloneState();
    const lot = state.costBasisLots.find((item) => item.sourceOrderId === "order_buy_low_seed");
    expect(lot?.effectiveEntry).toBeCloseTo(5361 / 63.71871989, 4);
    expect(lot?.strikeBasis).toBe(85);
  });

  it("records Buy Low not-hit premium as realized yield", () => {
    const state = withActiveOrder(cloneState(), {
      ...seedState.orders[1],
      id: "order_buy_low_not_hit",
      status: "ACTIVE",
      settlementResult: null,
      receivedAsset: null,
      receivedAmount: null,
      subscribedAmount: 3064,
      ifNotHitAmount: 3095.74941312
    });

    const next = settleOrder(state, {
      orderId: "order_buy_low_not_hit",
      result: "NOT_HIT",
      receivedAsset: "USDT",
      receivedAmount: 3095.74941312,
      settledAt: "2026-04-30T08:00:00.000Z",
      note: "test not hit"
    });

    const settled = next.orders.find((order) => order.id === "order_buy_low_not_hit");
    expect(settled?.realizedYieldUSDT).toBeCloseTo(31.74941312, 6);
  });

  it("calculates Sell High hit realized PnL using weighted average cost", () => {
    const state = cloneState();
    const next = settleOrder(state, {
      orderId: "order_sell_high_seed",
      result: "HIT",
      receivedAsset: "USDT",
      receivedAmount: 5517.26997458,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high hit"
    });

    const settled = next.orders.find((order) => order.id === "order_sell_high_seed");
    expect(settled?.realizedPnlUSDT).toBeCloseTo(5517.26997458 - 63.7 * 84.1354, 2);
  });

  it("records Sell High not-hit premium increase in coin amount", () => {
    const state = cloneState();
    const next = settleOrder(state, {
      orderId: "order_sell_high_seed",
      result: "NOT_HIT",
      receivedAsset: "OKSOL",
      receivedAmount: 64.15430203,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high not hit"
    });

    const settled = next.orders.find((order) => order.id === "order_sell_high_seed");
    expect(settled?.realizedYieldUSDT).toBeGreaterThan(0);
    expect(next.ledgerEntries.some((entry) => entry.deltaAmount === 64.15430203 && entry.asset === "OKSOL")).toBe(true);
    expect(weightedAverageEntry(next.costBasisLots, "OKSOL")).toBeLessThan(84.1354);
  });

  it("hides dust holding entry after Sell High hit closes the economic position", () => {
    const state = cloneState();
    const next = settleOrder(state, {
      orderId: "order_sell_high_seed",
      result: "HIT",
      receivedAsset: "USDT",
      receivedAmount: 5517.26997458,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high hit"
    });

    expect(getHoldingEntries(next).some((entry) => entry.asset === "OKSOL")).toBe(false);
  });

  it("records manual portfolio buys as per-asset holding entries", () => {
    const state = cloneState();
    const withBtc = recordPortfolioBuy(state, {
      asset: "BTC",
      amount: 0.1,
      costUSDT: 6000,
      note: "test BTC buy"
    });
    const withEth = recordPortfolioBuy(withBtc, {
      asset: "ETH",
      amount: 2,
      costUSDT: 7000,
      note: "test ETH buy"
    });

    const entries = getHoldingEntries(withEth);
    expect(entries.find((entry) => entry.asset === "BTC")?.entry).toBeCloseTo(60000, 6);
    expect(entries.find((entry) => entry.asset === "ETH")?.entry).toBeCloseTo(3500, 6);
    expect(entries.find((entry) => entry.asset === "OKSOL")?.entry).toBeCloseTo(84.1354, 4);
    expect(getNetDepositedCapitalUSDT(withEth)).toBeCloseTo(getNetDepositedCapitalUSDT(state) + 13000, 6);
    expect(withEth.costBasisLots.find((lot) => lot.asset === "BTC")?.pocketId).toBeNull();
  });

  it("groups current holding entries by exposure for the main DI view", () => {
    const state = recordPortfolioBuy(cloneState(), {
      asset: "SOL",
      amount: 10,
      costUSDT: 800,
      note: "test SOL buy"
    });

    const actualEntries = getHoldingEntries(state);
    const exposureEntries = getExposureHoldingEntries(state);
    const solExposure = exposureEntries.find((entry) => entry.underlyingAsset === "SOL");

    expect(actualEntries.find((entry) => entry.asset === "SOL")?.amount).toBeCloseTo(10, 6);
    expect(actualEntries.find((entry) => entry.asset === "OKSOL")?.amount).toBeCloseTo(63.71871989, 6);
    expect(solExposure?.amount).toBeCloseTo(73.71871989, 6);
    expect(solExposure?.entry).toBeCloseTo((5361 + 800) / 73.71871989, 6);
  });

  it("keeps total DI PnL unchanged when merging pockets", () => {
    const state = cloneState();
    const before = getDIPnlUSDT(state);
    const next = mergePockets(state, "pocket_extra", "pocket_core_sol", "test merge");
    expect(getDIPnlUSDT(next)).toBeCloseTo(before, 6);
  });

  it("projects settled-average and blended forecasts from current mark-to-market value", () => {
    const state = cloneState();
    const settled = makeForecast(state, "SETTLED_AVERAGE");
    const blended = makeForecast(state, "BLENDED");
    expect(settled.currentDIValueUSDT).toBeCloseTo(getCurrentDIValueUSDT(state), 6);
    expect(blended.currentDIValueUSDT).toBeCloseTo(getCurrentDIValueUSDT(state), 6);
    expect(blended.activeOrderCount).toBeGreaterThan(0);
    expect(blended.dailyReturnRate).not.toBe(settled.dailyReturnRate);
  });

  it("soft deletes orders without physically removing records", () => {
    const state = cloneState();
    const beforeCount = state.orders.length;
    const next = softDeleteOrder(state, "order_sell_high_seed", "test delete");
    expect(next.orders.length).toBe(beforeCount);
    expect(next.orders.find((order) => order.id === "order_sell_high_seed")?.status).toBe("DELETED");
  });

  it("prevents deleting settled orders because ledger and cost basis are already materialized", () => {
    const state = cloneState();
    expect(() => softDeleteOrder(state, "order_buy_low_seed", "test delete")).toThrow(
      "Only active orders can be deleted"
    );
  });
});
