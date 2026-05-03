import type { AppState, AuditLog, CapitalMovement, DIPocket, LedgerEntry } from "../domain/types";
import { createId } from "./id";
import { getLedgerBalances, makeLedgerEntry } from "./ledger-service";

export function createPocket(state: AppState, name: string, note = ""): AppState {
  const now = new Date().toISOString();
  const pocket: DIPocket = {
    id: createId("pocket"),
    portfolioId: state.portfolio.id,
    name,
    status: "ACTIVE",
    mergedIntoPocketId: null,
    mergedAt: null,
    createdAt: now,
    updatedAt: now,
    note
  };

  return {
    ...state,
    pockets: [...state.pockets, pocket],
    auditLogs: [
      {
        id: createId("audit"),
        portfolioId: state.portfolio.id,
        entityType: "DI_POCKET",
        entityId: pocket.id,
        action: "MANUAL_ADJUSTMENT",
        changedFields: [{ field: "pocket", oldValue: null, newValue: pocket }],
        reason: note,
        createdAt: now
      },
      ...state.auditLogs
    ]
  };
}

export function depositToPocket(state: AppState, pocketId: string, amount: number, note: string): AppState {
  if (!note.trim()) throw new Error("Deposit note is required");
  const now = new Date().toISOString();
  const movement: CapitalMovement = {
    id: createId("movement"),
    portfolioId: state.portfolio.id,
    type: "DEPOSIT",
    toPocketId: pocketId,
    asset: "USDT",
    amount,
    valueUSDTAtTime: amount,
    movementTime: now,
    note,
    createdAt: now,
    updatedAt: now
  };
  const entry = makeLedgerEntry({
    id: createId("ledger"),
    portfolioId: state.portfolio.id,
    pocketId,
    asset: "USDT",
    deltaAmount: amount,
    sourceType: "CAPITAL_MOVEMENT",
    sourceId: movement.id,
    entryTime: now,
    note
  });

  return {
    ...state,
    capitalMovements: [movement, ...state.capitalMovements],
    ledgerEntries: [...state.ledgerEntries, entry],
    auditLogs: [
      {
        id: createId("audit"),
        portfolioId: state.portfolio.id,
        entityType: "CAPITAL_MOVEMENT",
        entityId: movement.id,
        action: "CREATE_DEPOSIT",
        changedFields: [{ field: "amount", oldValue: null, newValue: amount }],
        reason: note,
        createdAt: now
      },
      ...state.auditLogs
    ]
  };
}

export function mergePockets(state: AppState, sourcePocketId: string, targetPocketId: string, note: string): AppState {
  if (!note.trim()) throw new Error("Merge note is required");
  if (sourcePocketId === targetPocketId) throw new Error("Cannot merge a pocket into itself");

  const now = new Date().toISOString();
  const movementId = createId("merge");
  const balances = getLedgerBalances(state, { pocketId: sourcePocketId });
  const entries: LedgerEntry[] = balances.flatMap((balance) => [
    makeLedgerEntry({
      id: createId("ledger"),
      portfolioId: state.portfolio.id,
      pocketId: sourcePocketId,
      asset: balance.asset,
      deltaAmount: -balance.amount,
      sourceType: "POCKET_MERGE",
      sourceId: movementId,
      entryTime: now,
      note
    }),
    makeLedgerEntry({
      id: createId("ledger"),
      portfolioId: state.portfolio.id,
      pocketId: targetPocketId,
      asset: balance.asset,
      deltaAmount: balance.amount,
      sourceType: "POCKET_MERGE",
      sourceId: movementId,
      entryTime: now,
      note
    })
  ]);

  const movement: CapitalMovement = {
    id: movementId,
    portfolioId: state.portfolio.id,
    type: "POCKET_MERGE",
    fromPocketId: sourcePocketId,
    toPocketId: targetPocketId,
    asset: "USDT",
    amount: 0,
    valueUSDTAtTime: 0,
    movementTime: now,
    note,
    createdAt: now,
    updatedAt: now
  };

  const updatedLots = state.costBasisLots.map((lot) =>
    lot.pocketId === sourcePocketId ? { ...lot, pocketId: targetPocketId, updatedAt: now } : lot
  );

  const auditLog: AuditLog = {
    id: createId("audit"),
    portfolioId: state.portfolio.id,
    entityType: "DI_POCKET",
    entityId: sourcePocketId,
    action: "MERGE_POCKET",
    changedFields: [
      { field: "sourcePocketId", oldValue: sourcePocketId, newValue: targetPocketId },
      { field: "ledgerEntries", oldValue: null, newValue: entries.length }
    ],
    reason: note,
    createdAt: now
  };

  return {
    ...state,
    pockets: state.pockets.map((pocket) =>
      pocket.id === sourcePocketId
        ? { ...pocket, status: "MERGED", mergedIntoPocketId: targetPocketId, mergedAt: now, updatedAt: now }
        : pocket
    ),
    capitalMovements: [movement, ...state.capitalMovements],
    ledgerEntries: [...state.ledgerEntries, ...entries],
    costBasisLots: updatedLots,
    auditLogs: [auditLog, ...state.auditLogs]
  };
}
