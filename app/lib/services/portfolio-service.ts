import { assetPrice, toUSDT } from "../domain/assets";
import type { AppState, Asset, DIOrder, ForecastMode, ForecastSnapshot, UnderlyingAsset } from "../domain/types";
import { lockDays } from "../domain/format";
import { getAvailableBalances, getLatestPrices } from "./ledger-service";
import { createId } from "./id";

type ForecastOptions = {
  targetDailyReturnRate?: number;
};

const FORECAST_WARNING =
  "Assumes continuous redeployment and stable yield. It does not account for stuck periods, poor package availability, large drawdowns, or manual pauses.";

export function activeOrderConservativeValueUSDT(order: DIOrder, prices: Record<UnderlyingAsset, number>): number {
  if (order.productType === "BUY_LOW") return order.subscribedAmount;
  return order.subscribedAmount * order.strikePrice;
}

export function activeOrderPendingPremiumUSDT(order: DIOrder, prices: Record<UnderlyingAsset, number>): number {
  return order.expectedPremiumAmount * assetPrice(order.expectedPremiumAsset, prices);
}

function subscribedCapitalUSDT(order: DIOrder, prices: Record<UnderlyingAsset, number>): number {
  if (order.subscribedCapitalValueAtStartUSDT !== undefined) return order.subscribedCapitalValueAtStartUSDT;
  if (order.subscribedAsset === "USDT") return order.subscribedAmount;
  const historicalFallback = order.subscribedAmount * order.strikePrice;
  return historicalFallback || toUSDT(order.subscribedAmount, order.subscribedAsset, prices);
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
  return Math.max(0, order.premiumValueAtSettlementUSDT ?? order.premiumYieldUSDT ?? order.realizedYieldUSDT ?? receivedValue - subscribedValue);
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function settledSampleDays(orders: DIOrder[]): number {
  if (!orders.length) return 0;
  const timestamps = orders.flatMap((order) => [new Date(order.startTime).getTime(), new Date(order.settlementTime).getTime()]);
  return Math.max(0, (Math.max(...timestamps) - Math.min(...timestamps)) / 864e5);
}

function confidenceFromSample(params: {
  settledOrderCount: number;
  sampleDays: number;
  returnStdDev: number;
  dailyReturnRate: number;
  assetDiversity: number;
  activeDeploymentRatio: number;
}): { confidence: ForecastSnapshot["confidence"]; confidenceNotes: string[] } {
  const notes: string[] = [];
  let score = 0;

  if (params.settledOrderCount >= 30) score += 2;
  else if (params.settledOrderCount >= 10) score += 1;
  else notes.push("Small settled-order sample.");

  if (params.sampleDays >= 90) score += 1;
  else if (params.sampleDays >= 30) score += 0.5;
  else notes.push("Short historical sample window.");

  if (params.assetDiversity >= 2) score += 0.5;
  else notes.push("Limited asset diversity.");

  if (params.dailyReturnRate > 0 && params.returnStdDev > params.dailyReturnRate * 2) {
    notes.push("High return variance.");
  } else if (params.settledOrderCount >= 2) {
    score += 0.5;
  }

  if (params.activeDeploymentRatio < 0.25) notes.push("Low active capital deployment.");

  return {
    confidence: score >= 3 ? "HIGH" : score >= 1.5 ? "MEDIUM" : "LOW",
    confidenceNotes: notes
  };
}

export function makeForecast(state: AppState, mode: ForecastMode, options: ForecastOptions = {}): ForecastSnapshot {
  const prices = getLatestPrices(state);
  const settledOrders = state.orders.filter((order) => order.status.startsWith("SETTLED") && !order.isDeleted);
  const activeOrders = state.orders.filter((order) => order.status === "ACTIVE" && !order.isDeleted);
  let numerator = 0;
  let denominator = 0;
  const settledDailyReturns: number[] = [];

  for (const order of settledOrders) {
    const days = lockDays(order.startTime, order.settlementTime);
    const subscribedCapital = subscribedCapitalUSDT(order, prices);
    const settledYield = getSettledYieldUSDT(order, prices);
    numerator += settledYield;
    denominator += subscribedCapital * days;
    if (subscribedCapital > 0) settledDailyReturns.push(settledYield / (subscribedCapital * days));
  }

  if (mode === "SETTLED_PLUS_ACTIVE_PREMIUM") {
    for (const order of activeOrders) {
      const subscribedCapital = subscribedCapitalUSDT(order, prices);
      numerator += activeOrderPendingPremiumUSDT(order, prices);
      denominator += subscribedCapital * lockDays(order.startTime, order.settlementTime);
    }
  }

  const sampleDailyReturnRate = denominator > 0 ? numerator / denominator : 0;
  const dailyReturnRate = mode === "RECENT_TARGET_RATE" ? Math.max(0, options.targetDailyReturnRate ?? 0) : sampleDailyReturnRate;
  const currentDIValueUSDT = getCurrentDIValueUSDT(state);
  const simpleOneYearValueUSDT = currentDIValueUSDT * (1 + dailyReturnRate * 365);
  const projectedOneYearValueUSDT = currentDIValueUSDT * Math.pow(1 + dailyReturnRate, 365);
  const settledOrderCount = settledOrders.length;
  const activeValueUSDT = activeOrders.reduce((sum, order) => sum + activeOrderConservativeValueUSDT(order, prices), 0);
  const sampleDays = settledSampleDays(settledOrders);
  const returnStdDev = standardDeviation(settledDailyReturns);
  const assetDiversity = new Set(settledOrders.map((order) => order.subscribedAsset === "OKSOL" ? "SOL" : order.subscribedAsset)).size;
  const activeDeploymentRatio = currentDIValueUSDT > 0 ? activeValueUSDT / currentDIValueUSDT : 0;
  const confidenceResult = confidenceFromSample({
    settledOrderCount,
    sampleDays,
    returnStdDev,
    dailyReturnRate,
    assetDiversity,
    activeDeploymentRatio
  });
  const confidenceNotes = mode === "RECENT_TARGET_RATE"
    ? ["Manual target rate. Historical sample is not used as the rate source.", ...confidenceResult.confidenceNotes]
    : confidenceResult.confidenceNotes;
  if (mode === "SETTLED_PLUS_ACTIVE_PREMIUM") confidenceNotes.unshift("Includes pending active-order premium.");

  return {
    id: createId("forecast"),
    portfolioId: state.portfolio.id,
    mode,
    currentDIValueUSDT,
    dailyReturnRate,
    projectedOneYearValueUSDT,
    simpleOneYearValueUSDT,
    confidence: mode === "RECENT_TARGET_RATE" ? "LOW" : confidenceResult.confidence,
    confidenceNotes,
    warning: FORECAST_WARNING,
    settledOrderCount,
    activeOrderCount: activeOrders.length,
    sampleDays,
    activeDeploymentRatio,
    returnStdDev,
    createdAt: new Date().toISOString()
  };
}
