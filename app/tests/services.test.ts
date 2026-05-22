import { describe, expect, it } from "vitest";
import type { AppState, DIOrder } from "../lib/domain/types";
import { normalizeAsset } from "../lib/domain/assets";
import { getExposureHoldingEntries, getHoldingEntries, weightedAverageEntry } from "../lib/services/cost-basis-service";
import { getLedgerBalances, getLedgerExposureBalances } from "../lib/services/ledger-service";
import {
  activeOrderConservativeValueUSDT,
  getCurrentDIValueUSDT,
  getDIPnlBreakdownUSDT,
  getDIWorkingCapitalUSDT,
  getDIPnlUSDT,
  getExternalDepositsUSDT,
  getExternalNetDepositedCapitalUSDT,
  getExternalWithdrawalsUSDT,
  getInternalTransfersUSDT,
  getNetDepositedCapitalUSDT,
  getPortfolioTotalValueUSDT,
  getStoragePortfolioValueUSDT,
  getTotalPortfolioPnlUSDT,
  makeForecast
} from "../lib/services/portfolio-service";
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

  it("values Buy Low hit realized yield from term rate instead of premium asset amount", () => {
    const state = withActiveOrder(cloneState(), {
      ...seedState.orders[1],
      id: "order_buy_low_hit_coin_premium",
      status: "ACTIVE",
      settlementResult: null,
      receivedAsset: null,
      receivedAmount: null,
      subscribedAmount: 5581,
      termRatePercent: 1.036,
      expectedPremiumAsset: "ETH",
      expectedPremiumAmount: 0.0258,
      ifHitAsset: "ETH",
      ifHitAmount: 2.506
    });

    const next = settleOrder(state, {
      orderId: "order_buy_low_hit_coin_premium",
      result: "HIT",
      receivedAsset: "ETH",
      receivedAmount: 2.506,
      settledAt: "2026-04-30T08:00:00.000Z",
      note: "test hit"
    });

    const settled = next.orders.find((order) => order.id === "order_buy_low_hit_coin_premium");
    const lot = next.costBasisLots.find((item) => item.sourceOrderId === "order_buy_low_hit_coin_premium");

    expect(settled?.realizedYieldUSDT).toBeCloseTo(5581 * 0.01036, 6);
    expect(settled?.realizedPnlUSDT).toBe(0);
    expect(lot?.effectiveEntry).toBeCloseTo(5581 / 2.506, 6);
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

  it("separates Sell High hit premium yield from trading and realized PnL", () => {
    const now = "2026-05-01T08:00:00.000Z";
    const state: AppState = {
      ...cloneState(),
      ledgerEntries: [],
      costBasisLots: [
        {
          id: "lot_sol_entry_90",
          portfolioId: "portfolio_main",
          pocketId: "pocket_core_sol",
          asset: "SOL",
          underlyingAsset: "SOL",
          amount: 10,
          economicCostUSDT: 900,
          effectiveEntry: 90,
          strikeBasis: null,
          sourceOrderId: null,
          status: "OPEN",
          createdAt: now,
          updatedAt: now
        }
      ],
      orders: [
        {
          ...seedState.orders[0],
          id: "order_sell_high_loss_with_premium",
          productType: "SELL_HIGH",
          pair: "SOL-USDT",
          subscribedAsset: "SOL",
          subscribedAmount: 10,
          strikePrice: 86,
          expectedPremiumAsset: "USDT",
          expectedPremiumAmount: 10,
          ifHitAsset: "USDT",
          ifHitAmount: 870,
          ifNotHitAsset: "SOL",
          ifNotHitAmount: 10.11627907,
          status: "ACTIVE",
          settlementResult: null,
          receivedAsset: null,
          receivedAmount: null,
          settledAt: null
        }
      ]
    };

    const next = settleOrder(state, {
      orderId: "order_sell_high_loss_with_premium",
      result: "HIT",
      receivedAsset: "USDT",
      receivedAmount: 870,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high hit"
    });

    const settled = next.orders.find((order) => order.id === "order_sell_high_loss_with_premium");
    expect(settled?.premiumYieldUSDT).toBe(10);
    expect(settled?.tradingPnlUSDT).toBe(-40);
    expect(settled?.realizedPnlUSDT).toBe(-30);
    expect(settled?.realizedYieldUSDT).toBe(10);
  });

  it("values active Sell High orders at strike to avoid overstating capped upside", () => {
    const order = {
      ...seedState.orders[0],
      subscribedAsset: "ETH",
      subscribedAmount: 10,
      strikePrice: 2300,
      productType: "SELL_HIGH"
    } as DIOrder;

    expect(activeOrderConservativeValueUSDT(order, { USDT: 1, SOL: 0, BTC: 0, ETH: 2500 })).toBe(23000);
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

  it("separates Sell High not-hit market premium from basis reduction benefit", () => {
    const now = "2026-05-01T08:00:00.000Z";
    const state: AppState = {
      ...cloneState(),
      priceSnapshots: [
        {
          id: "price_sol_80",
          asset: "SOL",
          priceUSDT: 80,
          source: "MANUAL",
          capturedAt: now
        }
      ],
      ledgerEntries: [],
      costBasisLots: [
        {
          id: "lot_sol_entry_85",
          portfolioId: "portfolio_main",
          pocketId: "pocket_core_sol",
          asset: "SOL",
          underlyingAsset: "SOL",
          amount: 10,
          economicCostUSDT: 850,
          effectiveEntry: 85,
          strikeBasis: null,
          sourceOrderId: null,
          status: "OPEN",
          createdAt: now,
          updatedAt: now
        }
      ],
      orders: [
        {
          ...seedState.orders[0],
          id: "order_sell_high_not_hit_premium",
          productType: "SELL_HIGH",
          pair: "SOL-USDT",
          subscribedAsset: "SOL",
          subscribedAmount: 10,
          strikePrice: 86,
          expectedPremiumAsset: "SOL",
          expectedPremiumAmount: 0.1,
          ifHitAsset: "USDT",
          ifHitAmount: 860,
          ifNotHitAsset: "SOL",
          ifNotHitAmount: 10.1,
          status: "ACTIVE",
          settlementResult: null,
          receivedAsset: null,
          receivedAmount: null,
          settledAt: null
        }
      ]
    };

    const next = settleOrder(state, {
      orderId: "order_sell_high_not_hit_premium",
      result: "NOT_HIT",
      receivedAsset: "SOL",
      receivedAmount: 10.1,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high not hit"
    });

    const settled = next.orders.find((order) => order.id === "order_sell_high_not_hit_premium");
    expect(settled?.settlementPriceUSDT).toBe(80);
    expect(settled?.premiumYieldUSDT).toBeCloseTo(8, 6);
    expect(settled?.basisReductionUSDT).toBeCloseTo(8.5, 6);
    expect(settled?.realizedPnlUSDT).toBe(0);
    expect(weightedAverageEntry(next.costBasisLots, "SOL")).toBeCloseTo(850 / 10.1, 6);
  });

  it("includes dust lots in core holding entries after Sell High hit closes the economic position", () => {
    const state = cloneState();
    const next = settleOrder(state, {
      orderId: "order_sell_high_seed",
      result: "HIT",
      receivedAsset: "USDT",
      receivedAmount: 5517.26997458,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high hit"
    });

    expect(getHoldingEntries(next).some((entry) => entry.asset === "OKSOL")).toBe(true);
  });

  it("can hide dust lots for UI display without changing core holding entry calculation", () => {
    const state = cloneState();
    const next = settleOrder(state, {
      orderId: "order_sell_high_seed",
      result: "HIT",
      receivedAsset: "USDT",
      receivedAmount: 5517.26997458,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high hit"
    });

    expect(getHoldingEntries(next, { hideDust: true }).some((entry) => entry.asset === "OKSOL")).toBe(false);
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

  it("separates external flows, DI working capital, storage value, and total portfolio value", () => {
    const state = cloneState();
    const withStorage = recordPortfolioBuy(state, {
      asset: "BTC",
      amount: 0.1,
      costUSDT: 6000,
      note: "test BTC storage buy"
    });
    const withInternalTransfer: AppState = {
      ...withStorage,
      capitalMovements: [
        {
          id: "movement_di_to_storage",
          portfolioId: "portfolio_main",
          type: "WITHDRAW_DI_TO_PORTFOLIO",
          fromPocketId: "pocket_core_sol",
          toPocketId: null,
          asset: "USDT",
          amount: 1000,
          valueUSDTAtTime: 1000,
          movementTime: "2026-05-03T00:00:00.000Z",
          note: "move profit to storage",
          createdAt: "2026-05-03T00:00:00.000Z",
          updatedAt: "2026-05-03T00:00:00.000Z"
        },
        ...withStorage.capitalMovements
      ]
    };

    expect(getExternalDepositsUSDT(withInternalTransfer)).toBeCloseTo(11361, 6);
    expect(getExternalWithdrawalsUSDT(withInternalTransfer)).toBe(0);
    expect(getExternalNetDepositedCapitalUSDT(withInternalTransfer)).toBeCloseTo(11361, 6);
    expect(getInternalTransfersUSDT(withInternalTransfer)).toBe(1000);
    expect(getDIWorkingCapitalUSDT(withInternalTransfer)).toBeCloseTo(4361, 6);
    expect(getStoragePortfolioValueUSDT(withInternalTransfer)).toBeCloseTo(6400, 6);
    expect(getPortfolioTotalValueUSDT(withInternalTransfer)).toBeCloseTo(
      getCurrentDIValueUSDT(withInternalTransfer) + 6400,
      6
    );
    expect(getTotalPortfolioPnlUSDT(withInternalTransfer)).toBeCloseTo(
      getPortfolioTotalValueUSDT(withInternalTransfer) - 11361,
      6
    );
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

  it("breaks DI PnL into premium, trading, realized, and unrealized parts", () => {
    const state = cloneState();
    const settled = settleOrder(state, {
      orderId: "order_sell_high_seed",
      result: "HIT",
      receivedAsset: "USDT",
      receivedAmount: 5517.26997458,
      settledAt: "2026-05-02T08:00:00.000Z",
      note: "test sell high hit"
    });

    const breakdown = getDIPnlBreakdownUSDT(settled);

    expect(breakdown.premiumYieldUSDT).toBeCloseTo(55.09119069 + (5517.26997458 - 63.7 * 86), 6);
    expect(breakdown.tradingPnlUSDT).toBeCloseTo(63.7 * 86 - 63.7 * 84.1354, 2);
    expect(breakdown.realizedPnlUSDT).toBeCloseTo(5517.26997458 - 63.7 * 84.1354, 2);
    expect(breakdown.unrealizedPnlUSDT).toBeCloseTo(0.01871989 * (84.4 - 84.1354), 6);
    expect(breakdown.totalDIPnlUSDT).toBeCloseTo(
      breakdown.realizedPnlUSDT + breakdown.unrealizedPnlUSDT,
      6
    );
  });

  it("projects settled-only and active-premium forecasts from current DI value", () => {
    const state = cloneState();
    const settled = makeForecast(state, "SETTLED_ONLY");
    const blended = makeForecast(state, "SETTLED_PLUS_ACTIVE_PREMIUM");
    expect(settled.currentDIValueUSDT).toBeCloseTo(getCurrentDIValueUSDT(state), 6);
    expect(blended.currentDIValueUSDT).toBeCloseTo(getCurrentDIValueUSDT(state), 6);
    expect(blended.activeOrderCount).toBeGreaterThan(0);
    expect(blended.dailyReturnRate).not.toBe(settled.dailyReturnRate);
    expect(blended.confidenceNotes).toContain("Includes pending active-order premium.");
  });

  it("uses frozen settlement premium values instead of current prices for settled forecasts", () => {
    const state = cloneState();
    const repricedState: AppState = {
      ...state,
      priceSnapshots: [
        {
          id: "price_sol_999",
          asset: "SOL",
          priceUSDT: 999,
          source: "MANUAL",
          capturedAt: "2026-05-21T00:00:00.000Z"
        },
        ...state.priceSnapshots
      ]
    };

    expect(makeForecast(repricedState, "SETTLED_ONLY").dailyReturnRate).toBeCloseTo(
      makeForecast(state, "SETTLED_ONLY").dailyReturnRate,
      12
    );
  });

  it("supports manual target-rate forecasts without using historical returns as the rate source", () => {
    const forecast = makeForecast(cloneState(), "RECENT_TARGET_RATE", { targetDailyReturnRate: 0.003 });
    expect(forecast.dailyReturnRate).toBe(0.003);
    expect(forecast.confidence).toBe("LOW");
    expect(forecast.confidenceNotes[0]).toContain("Manual target rate");
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
