import { normalizeAsset, toUSDT } from "../domain/assets";
import type { AppState, Asset, AssetBalance, ExposureBalance, LedgerEntry, UnderlyingAsset } from "../domain/types";

export type BalanceScope = {
  pocketId?: string;
  includeDeleted?: boolean;
};

export function getLatestPrices(state: AppState): Record<UnderlyingAsset, number> {
  const prices: Record<UnderlyingAsset, number> = { USDT: 1, SOL: 0, BTC: 0, ETH: 0 };

  for (const asset of Object.keys(prices) as UnderlyingAsset[]) {
    const latest = state.priceSnapshots
      .filter((snapshot) => snapshot.asset === asset)
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())[0];
    prices[asset] = latest?.priceUSDT ?? prices[asset];
  }

  return prices;
}

export function getLedgerBalances(state: AppState, scope: BalanceScope = {}): AssetBalance[] {
  const prices = getLatestPrices(state);
  const totals = new Map<string, { asset: Asset; underlyingAsset: UnderlyingAsset; amount: number }>();

  const relevantEntries = state.ledgerEntries.filter((entry) => {
    if (scope.pocketId && entry.pocketId !== scope.pocketId) return false;
    return true;
  });

  for (const entry of relevantEntries) {
    const key = scope.pocketId ? `${entry.pocketId ?? "portfolio"}:${entry.asset}` : entry.asset;
    const current = totals.get(key) ?? {
      asset: entry.asset,
      underlyingAsset: entry.underlyingAsset,
      amount: 0
    };
    current.amount += entry.deltaAmount;
    totals.set(key, current);
  }

  return Array.from(totals.values())
    .filter((balance) => Math.abs(balance.amount) > 1e-9)
    .map((balance) => ({
      ...balance,
      valueUSDT: toUSDT(balance.amount, balance.asset, prices)
    }));
}

export function getActiveReservations(state: AppState, pocketId?: string): AssetBalance[] {
  const prices = getLatestPrices(state);
  const totals = new Map<Asset, number>();

  for (const order of state.orders) {
    if (order.status !== "ACTIVE" || order.isDeleted) continue;
    if (pocketId && order.pocketId !== pocketId) continue;
    totals.set(order.subscribedAsset, (totals.get(order.subscribedAsset) ?? 0) + order.subscribedAmount);
  }

  return Array.from(totals.entries()).map(([asset, amount]) => ({
    asset,
    underlyingAsset: normalizeAsset(asset),
    amount,
    valueUSDT: toUSDT(amount, asset, prices)
  }));
}

export function toExposureBalances(balances: AssetBalance[], prices: Record<UnderlyingAsset, number>): ExposureBalance[] {
  const totals = new Map<UnderlyingAsset, number>();

  for (const balance of balances) {
    totals.set(balance.underlyingAsset, (totals.get(balance.underlyingAsset) ?? 0) + balance.amount);
  }

  return Array.from(totals.entries())
    .filter(([, amount]) => Math.abs(amount) > 1e-9)
    .map(([underlyingAsset, amount]) => ({
      underlyingAsset,
      amount,
      valueUSDT: toUSDT(amount, underlyingAsset, prices)
    }));
}

export function getLedgerExposureBalances(state: AppState, scope: BalanceScope = {}): ExposureBalance[] {
  return toExposureBalances(getLedgerBalances(state, scope), getLatestPrices(state));
}

export function getActiveExposureReservations(state: AppState, pocketId?: string): ExposureBalance[] {
  return toExposureBalances(getActiveReservations(state, pocketId), getLatestPrices(state));
}

export function getAvailableBalances(state: AppState, pocketId?: string): AssetBalance[] {
  const prices = getLatestPrices(state);
  const available = new Map<Asset, number>();

  for (const balance of getLedgerBalances(state, { pocketId })) {
    available.set(balance.asset, (available.get(balance.asset) ?? 0) + balance.amount);
  }
  for (const reservation of getActiveReservations(state, pocketId)) {
    available.set(reservation.asset, (available.get(reservation.asset) ?? 0) - reservation.amount);
  }

  return Array.from(available.entries())
    .filter(([, balance]) => Math.abs(balance) > 1e-9)
    .map(([asset, balance]) => ({
      asset,
      underlyingAsset: normalizeAsset(asset),
      amount: balance,
      valueUSDT: toUSDT(balance, asset, prices)
    }));
}

export function getAvailableExposureBalances(state: AppState, pocketId?: string): ExposureBalance[] {
  return toExposureBalances(getAvailableBalances(state, pocketId), getLatestPrices(state));
}

export function makeLedgerEntry(entry: Omit<LedgerEntry, "underlyingAsset" | "createdAt">): LedgerEntry {
  return {
    ...entry,
    underlyingAsset: normalizeAsset(entry.asset),
    createdAt: entry.entryTime
  };
}
