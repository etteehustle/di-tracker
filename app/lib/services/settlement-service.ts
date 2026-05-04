import { normalizeAsset } from "../domain/assets";
import type { AppState, Asset, AuditLog, CostBasisLot, DIOrder, LedgerEntry, SettlementResult } from "../domain/types";
import { reduceLotsWeightedAverage } from "./cost-basis-service";
import { createId } from "./id";
import { makeLedgerEntry } from "./ledger-service";

type SettleInput = {
  orderId: string;
  result: SettlementResult;
  receivedAsset: Asset;
  receivedAmount: number;
  settledAt: string;
  note: string;
};

export function settleOrder(state: AppState, input: SettleInput): AppState {
  const order = state.orders.find((item) => item.id === input.orderId);
  if (!order) throw new Error("Order not found");
  if (order.status !== "ACTIVE") throw new Error("Only active orders can be settled");

  const expectedAsset = input.result === "HIT" ? order.ifHitAsset : order.ifNotHitAsset;
  if (normalizeAsset(expectedAsset) !== normalizeAsset(input.receivedAsset)) {
    throw new Error(`Received asset should match expected ${expectedAsset}`);
  }

  const sourceId = createId("settlement");
  const ledgerEntries: LedgerEntry[] = [
    makeLedgerEntry({
      id: createId("ledger"),
      portfolioId: order.portfolioId,
      pocketId: order.pocketId,
      asset: order.subscribedAsset,
      deltaAmount: -order.subscribedAmount,
      sourceType: "DI_ORDER_SETTLEMENT",
      sourceId,
      entryTime: input.settledAt,
      note: `Settle ${order.pair}: subscribed asset out`
    }),
    makeLedgerEntry({
      id: createId("ledger"),
      portfolioId: order.portfolioId,
      pocketId: order.pocketId,
      asset: input.receivedAsset,
      deltaAmount: input.receivedAmount,
      sourceType: "DI_ORDER_SETTLEMENT",
      sourceId,
      entryTime: input.settledAt,
      note: `Settle ${order.pair}: received asset in`
    })
  ];

  let nextLots = state.costBasisLots;
  let realizedYieldUSDT = 0;
  let realizedPnlUSDT = 0;

  if (order.productType === "BUY_LOW" && input.result === "HIT") {
    const lot: CostBasisLot = {
      id: createId("lot"),
      portfolioId: order.portfolioId,
      pocketId: order.pocketId,
      asset: input.receivedAsset,
      underlyingAsset: normalizeAsset(input.receivedAsset),
      amount: input.receivedAmount,
      economicCostUSDT: order.subscribedAmount,
      effectiveEntry: order.subscribedAmount / input.receivedAmount,
      strikeBasis: order.strikePrice,
      sourceOrderId: order.id,
      status: "OPEN",
      createdAt: input.settledAt,
      updatedAt: input.settledAt
    };
    nextLots = [...nextLots, lot];
    realizedYieldUSDT = Math.max(0, order.expectedPremiumAmount);
  }

  if (order.productType === "BUY_LOW" && input.result === "NOT_HIT") {
    realizedYieldUSDT = input.receivedAmount - order.subscribedAmount;
    realizedPnlUSDT = realizedYieldUSDT;
  }

  if (order.productType === "SELL_HIGH" && input.result === "HIT") {
    const reduction = reduceLotsWeightedAverage(nextLots, order.subscribedAsset, order.subscribedAmount);
    nextLots = reduction.updatedLots;
    realizedPnlUSDT = input.receivedAmount - reduction.costSoldUSDT;
    realizedYieldUSDT = Math.max(0, realizedPnlUSDT);
  }

  if (order.productType === "SELL_HIGH" && input.result === "NOT_HIT") {
    const premiumCoin = input.receivedAmount - order.subscribedAmount;
    const averageEntry = state.costBasisLots.find((lot) => lot.underlyingAsset === normalizeAsset(order.subscribedAsset) && lot.status === "OPEN")?.effectiveEntry ?? order.strikePrice;
    realizedYieldUSDT = Math.max(0, premiumCoin * averageEntry);
    if (premiumCoin > 0) {
      nextLots = [
        ...nextLots,
        {
          id: createId("lot"),
          portfolioId: order.portfolioId,
          pocketId: order.pocketId,
          asset: input.receivedAsset,
          underlyingAsset: normalizeAsset(input.receivedAsset),
          amount: premiumCoin,
          economicCostUSDT: 0,
          effectiveEntry: 0,
          strikeBasis: order.strikePrice,
          sourceOrderId: order.id,
          status: "OPEN",
          createdAt: input.settledAt,
          updatedAt: input.settledAt
        }
      ];
    }
  }

  const settledOrder: DIOrder = {
    ...order,
    status: input.result === "HIT" ? "SETTLED_HIT" : "SETTLED_NOT_HIT",
    settlementResult: input.result,
    receivedAsset: input.receivedAsset,
    receivedAmount: input.receivedAmount,
    settledAt: input.settledAt,
    realizedYieldUSDT,
    realizedPnlUSDT,
    updatedAt: input.settledAt
  };

  const auditLog: AuditLog = {
    id: createId("audit"),
    portfolioId: state.portfolio.id,
    entityType: "DI_ORDER",
    entityId: order.id,
    action: "SETTLE_ORDER",
    changedFields: [
      { field: "status", oldValue: order.status, newValue: settledOrder.status },
      { field: "receivedAsset", oldValue: null, newValue: input.receivedAsset },
      { field: "receivedAmount", oldValue: null, newValue: input.receivedAmount }
    ],
    reason: input.note,
    createdAt: input.settledAt
  };

  return {
    ...state,
    orders: state.orders.map((item) => (item.id === order.id ? settledOrder : item)),
    ledgerEntries: [...state.ledgerEntries, ...ledgerEntries],
    costBasisLots: nextLots,
    auditLogs: [auditLog, ...state.auditLogs]
  };
}
