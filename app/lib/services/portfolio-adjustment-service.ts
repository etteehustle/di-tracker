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
