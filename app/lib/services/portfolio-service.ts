import { assetPrice, toUSDT } from "../domain/assets";
import type { AppState, Asset, DIOrder, ForecastSnapshot, UnderlyingAsset } from "../domain/types";
import { lockDays } from "../domain/format";
import { getAvailableBalances, getLatestPrices } from "./ledger-service";
import { createId } from "./id";

export function activeOrderConservativeValueUSDT(order: DIOrder, prices: Record<UnderlyingAsset, number>): number {
  if (order.productType === "BUY_LOW") return order.subscribedAmount;
  return toUSDT(order.subscribedAmount, order.subscribedAsset, prices);
}

export function activeOrderPendingPremiumUSDT(order: DIOrder, prices: Record<UnderlyingAsset, number>): number {
  return order.expectedPremiumAmount * assetPrice(order.expectedPremiumAsset, prices);
}

export function getCurrentDIValueUSDT(state: AppState): number {
  const prices = getLatestPrices(state);
  const availableValue = getAvailableBalances(state).reduce((sum, balance) => sum + balance.valueUSDT, 0);
  const activeValue = state.orders
    .filter((order) => order.status === "ACTIVE" && !order.isDeleted)
    .reduce((sum, order) => sum + activeOrderConservativeValueUSDT(order, prices), 0);
  return availableValue + activeValue;
}

export function getPendingPremiumUSDT(state: AppState): number {
  const prices = getLatestPrices(state);
  return state.orders
    .filter((order) => order.status === "ACTIVE" && !order.isDeleted)
    .reduce((sum, order) => sum + activeOrderPendingPremiumUSDT(order, prices), 0);
}

export function getNetDepositedCapitalUSDT(state: AppState): number {
  return state.capitalMovements.reduce((sum, movement) => {
    if (movement.type === "DEPOSIT") return sum + movement.amount;
    if (movement.type === "WITHDRAW_DI_TO_PORTFOLIO" || movement.type === "WITHDRAW_PORTFOLIO_EXTERNAL") return sum - movement.amount;
    return sum;
  }, 0);
}

export function getDIPnlUSDT(state: AppState): number {
  return getCurrentDIValueUSDT(state) - getNetDepositedCapitalUSDT(state);
}

export function getPortfolioTotalValueUSDT(state: AppState): number {
  return getCurrentDIValueUSDT(state);
}

export function getSettledYieldUSDT(order: DIOrder, prices: Record<UnderlyingAsset, number>): number {
  if (!order.settlementResult || !order.receivedAsset || !order.receivedAmount) return 0;
  const receivedValue = toUSDT(order.receivedAmount, order.receivedAsset, prices);
  const subscribedValue = toUSDT(order.subscribedAmount, order.subscribedAsset as Asset, prices);
  return Math.max(0, order.realizedYieldUSDT ?? receivedValue - subscribedValue);
}

export function makeForecast(state: AppState, mode: "SETTLED_AVERAGE" | "BLENDED"): ForecastSnapshot {
  const prices = getLatestPrices(state);
  const settledOrders = state.orders.filter((order) => order.status.startsWith("SETTLED") && !order.isDeleted);
  const activeOrders = state.orders.filter((order) => order.status === "ACTIVE" && !order.isDeleted);
  let numerator = 0;
  let denominator = 0;

  for (const order of settledOrders) {
    const subscribedCapital = toUSDT(order.subscribedAmount, order.subscribedAsset, prices);
    numerator += getSettledYieldUSDT(order, prices);
    denominator += subscribedCapital * lockDays(order.startTime, order.settlementTime);
  }

  if (mode === "BLENDED") {
    for (const order of activeOrders) {
      const subscribedCapital = toUSDT(order.subscribedAmount, order.subscribedAsset, prices);
      numerator += activeOrderPendingPremiumUSDT(order, prices);
      denominator += subscribedCapital * lockDays(order.startTime, order.settlementTime);
    }
  }

  const dailyReturnRate = denominator > 0 ? numerator / denominator : 0;
  const currentDIValueUSDT = getCurrentDIValueUSDT(state);
  const projectedOneYearValueUSDT = currentDIValueUSDT * Math.pow(1 + dailyReturnRate, 365);
  const settledOrderCount = settledOrders.length;
  const confidence = settledOrderCount < 10 ? "LOW" : settledOrderCount <= 30 ? "MEDIUM" : "HIGH";

  return {
    id: createId("forecast"),
    portfolioId: state.portfolio.id,
    mode,
    currentDIValueUSDT,
    dailyReturnRate,
    projectedOneYearValueUSDT,
    confidence,
    settledOrderCount,
    activeOrderCount: activeOrders.length,
    createdAt: new Date().toISOString()
  };
}
