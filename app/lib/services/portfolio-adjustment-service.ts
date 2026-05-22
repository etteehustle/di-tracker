import { normalizeAsset } from "../domain/assets";
import type { AppState, Asset, AuditLog, CapitalMovement, CostBasisLot, LedgerEntry } from "../domain/types";
import { createId } from "./id";
import { makeLedgerEntry } from "./ledger-service";

export type PortfolioBuyInput = {
  asset: Exclude<Asset, "USDT">;
  amount: number;
  costUSDT: number;
  note: string;
};

export type CapitalAdjustmentInput = {
  pocketId: string;
  asset: Asset;
  amount: number;
  valueUSDTAtTime?: number;
  note: string;
};

function adjustmentValueUSDT(input: CapitalAdjustmentInput): number {
  if (input.asset === "USDT") return input.amount;
  if (input.valueUSDTAtTime === undefined || input.valueUSDTAtTime <= 0) {
    throw new Error("Coin adjustments require a positive USDT value at adjustment time");
  }
  return Math.sign(input.amount) * input.valueUSDTAtTime;
}

function reduceCoinAdjustmentLots(
  lots: CostBasisLot[],
  asset: Asset,
  amountToReduce: number,
  costToReduceUSDT: number,
  now: string
): CostBasisLot[] {
  const underlyingAsset = normalizeAsset(asset);
  const openAmount = lots
    .filter((lot) => lot.underlyingAsset === underlyingAsset && lot.status === "OPEN" && lot.amount > 1e-9)
    .reduce((sum, lot) => sum + lot.amount, 0);

  if (openAmount + 1e-9 < amountToReduce) throw new Error("Cannot subtract more coin than the open cost-basis amount");

  let remainingAmount = amountToReduce;
  let remainingCost = costToReduceUSDT;

  return lots.map((lot) => {
    if (lot.underlyingAsset !== underlyingAsset || lot.status !== "OPEN" || remainingAmount <= 1e-9) return lot;

    const amountReduced = Math.min(lot.amount, remainingAmount);
    const isLastReduction = remainingAmount - amountReduced <= 1e-9;
    const costReduced = isLastReduction ? remainingCost : costToReduceUSDT * (amountReduced / amountToReduce);
    const nextAmount = lot.amount - amountReduced;
    const nextCost = Math.max(0, lot.economicCostUSDT - costReduced);

    remainingAmount -= amountReduced;
    remainingCost -= costReduced;

    return {
      ...lot,
      amount: nextAmount,
      economicCostUSDT: nextCost,
      effectiveEntry: nextAmount > 1e-9 ? nextCost / nextAmount : 0,
      status: nextAmount > 1e-9 ? lot.status : "CLOSED",
      updatedAt: now
    };
  });
}

export function recordCapitalAdjustment(state: AppState, input: CapitalAdjustmentInput): AppState {
  if (Math.abs(input.amount) <= 1e-12) throw new Error("Adjustment amount must be non-zero");
  if (!input.note.trim()) throw new Error("Adjustment note is required");
  if (!state.pockets.some((pocket) => pocket.id === input.pocketId && pocket.status === "ACTIVE")) {
    throw new Error("Adjustment pocket must be active");
  }

  const now = new Date().toISOString();
  const valueUSDTAtTime = adjustmentValueUSDT(input);
  const movement: CapitalMovement = {
    id: createId("movement"),
    portfolioId: state.portfolio.id,
    type: "ADJUSTMENT",
    fromPocketId: null,
    toPocketId: input.pocketId,
    asset: input.asset,
    amount: input.amount,
    valueUSDTAtTime,
    movementTime: now,
    note: input.note,
    createdAt: now,
    updatedAt: now
  };
  const entry: LedgerEntry = makeLedgerEntry({
    id: createId("ledger"),
    portfolioId: state.portfolio.id,
    pocketId: input.pocketId,
    asset: input.asset,
    deltaAmount: input.amount,
    sourceType: "CAPITAL_MOVEMENT",
    sourceId: movement.id,
    entryTime: now,
    note: input.note
  });

  let costBasisLots = state.costBasisLots;
  if (input.asset !== "USDT" && input.amount > 0) {
    const economicCostUSDT = Math.abs(valueUSDTAtTime);
    const lot: CostBasisLot = {
      id: createId("lot"),
      portfolioId: state.portfolio.id,
      pocketId: input.pocketId,
      asset: input.asset,
      underlyingAsset: normalizeAsset(input.asset),
      amount: input.amount,
      economicCostUSDT,
      effectiveEntry: economicCostUSDT / input.amount,
      strikeBasis: null,
      sourceOrderId: null,
      status: "OPEN",
      createdAt: now,
      updatedAt: now
    };
    costBasisLots = [...costBasisLots, lot];
  } else if (input.asset !== "USDT" && input.amount < 0) {
    costBasisLots = reduceCoinAdjustmentLots(
      costBasisLots,
      input.asset,
      Math.abs(input.amount),
      Math.abs(valueUSDTAtTime),
      now
    );
  }

  const auditLog: AuditLog = {
    id: createId("audit"),
    portfolioId: state.portfolio.id,
    entityType: "CAPITAL_MOVEMENT",
    entityId: movement.id,
    action: "CREATE_ADJUSTMENT",
    changedFields: [
      { field: "type", oldValue: null, newValue: "ADJUSTMENT" },
      { field: "asset", oldValue: null, newValue: input.asset },
      { field: "amount", oldValue: null, newValue: input.amount },
      { field: "valueUSDTAtTime", oldValue: null, newValue: valueUSDTAtTime }
    ],
    reason: input.note,
    createdAt: now
  };

  return {
    ...state,
    capitalMovements: [movement, ...state.capitalMovements],
    ledgerEntries: [...state.ledgerEntries, entry],
    costBasisLots,
    auditLogs: [auditLog, ...state.auditLogs]
  };
}

export function recordPortfolioBuy(state: AppState, input: PortfolioBuyInput): AppState {
  if (input.amount <= 0) throw new Error("Coin amount must be greater than zero");
  if (input.costUSDT <= 0) throw new Error("USDT cost must be greater than zero");
  if (!input.note.trim()) throw new Error("Adjustment note is required");

  const now = new Date().toISOString();
  const sourceId = createId("manual_buy");
  const movement: CapitalMovement = {
    id: createId("movement"),
    portfolioId: state.portfolio.id,
    type: "DEPOSIT",
    fromPocketId: null,
    toPocketId: null,
    asset: "USDT",
    amount: input.costUSDT,
    valueUSDTAtTime: input.costUSDT,
    movementTime: now,
    note: input.note,
    createdAt: now,
    updatedAt: now
  };
  const entry: LedgerEntry = makeLedgerEntry({
    id: createId("ledger"),
    portfolioId: state.portfolio.id,
    pocketId: null,
    asset: input.asset,
    deltaAmount: input.amount,
    sourceType: "MANUAL_ADJUSTMENT",
    sourceId,
    entryTime: now,
    note: input.note
  });

  const lot: CostBasisLot = {
    id: createId("lot"),
    portfolioId: state.portfolio.id,
    pocketId: null,
    asset: input.asset,
    underlyingAsset: normalizeAsset(input.asset),
    amount: input.amount,
    economicCostUSDT: input.costUSDT,
    effectiveEntry: input.costUSDT / input.amount,
    strikeBasis: null,
    sourceOrderId: null,
    status: "OPEN",
    createdAt: now,
    updatedAt: now
  };

  const auditLog: AuditLog = {
    id: createId("audit"),
    portfolioId: state.portfolio.id,
    entityType: "PORTFOLIO_ASSET",
    entityId: sourceId,
    action: "MANUAL_ADJUSTMENT",
    changedFields: [
      { field: "asset", oldValue: null, newValue: input.asset },
      { field: "amount", oldValue: null, newValue: input.amount },
      { field: "costUSDT", oldValue: null, newValue: input.costUSDT }
    ],
    reason: input.note,
    createdAt: now
  };

  return {
    ...state,
    capitalMovements: [movement, ...state.capitalMovements],
    ledgerEntries: [...state.ledgerEntries, entry],
    costBasisLots: [...state.costBasisLots, lot],
    auditLogs: [auditLog, ...state.auditLogs]
  };
}
