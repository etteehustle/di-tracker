import { normalizeAsset } from "../domain/assets";
import type { AppState, Asset, CostBasisLot, CostBasisStatus } from "../domain/types";

export function weightedAverageEntry(lots: CostBasisLot[], asset: Asset): number | null {
  const underlyingAsset = normalizeAsset(asset);
  const openLots = lots.filter((lot) => lot.underlyingAsset === underlyingAsset && lot.status === "OPEN" && lot.amount > 0);
  const totalAmount = openLots.reduce((sum, lot) => sum + lot.amount, 0);
  if (totalAmount <= 0) return null;
  const totalCost = openLots.reduce((sum, lot) => sum + lot.economicCostUSDT, 0);
  return totalCost / totalAmount;
}

export function getHoldingEntries(state: AppState): Array<{ asset: Asset; entry: number; amount: number; economicCostUSDT: number }> {
  const grouped = new Map<string, { asset: Asset; amount: number; economicCostUSDT: number }>();

  for (const lot of state.costBasisLots.filter((item) => item.status === "OPEN" && item.amount > 0)) {
    const key = lot.underlyingAsset;
    const current = grouped.get(key) ?? { asset: lot.underlyingAsset as Asset, amount: 0, economicCostUSDT: 0 };
    current.amount += lot.amount;
    current.economicCostUSDT += lot.economicCostUSDT;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    entry: item.economicCostUSDT / item.amount
  }));
}

export function reduceLotsWeightedAverage(
  lots: CostBasisLot[],
  asset: Asset,
  soldAmount: number
): { updatedLots: CostBasisLot[]; costSoldUSDT: number; averageEntry: number } {
  const underlyingAsset = normalizeAsset(asset);
  const averageEntry = weightedAverageEntry(lots, asset) ?? 0;
  let remainingToReduce = soldAmount;
  let costSoldUSDT = 0;

  const updatedLots = lots.map((lot) => {
    if (lot.underlyingAsset !== underlyingAsset || lot.status !== "OPEN" || remainingToReduce <= 0) return lot;

    const amountReduced = Math.min(lot.amount, remainingToReduce);
    const costReduced = amountReduced * averageEntry;
    remainingToReduce -= amountReduced;
    costSoldUSDT += costReduced;

    const nextAmount = lot.amount - amountReduced;
    const nextCost = Math.max(0, lot.economicCostUSDT - costReduced);

    const nextStatus: CostBasisStatus = nextAmount > 1e-9 ? lot.status : "CLOSED";

    return {
      ...lot,
      amount: nextAmount,
      economicCostUSDT: nextCost,
      effectiveEntry: nextAmount > 0 ? nextCost / nextAmount : 0,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };
  });

  return { updatedLots, costSoldUSDT, averageEntry };
}
