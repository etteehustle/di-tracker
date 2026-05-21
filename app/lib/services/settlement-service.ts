import { assetPrice, normalizeAsset } from "../domain/assets";
import type { AppState, Asset, AuditLog, CostBasisLot, DIOrder, LedgerEntry, SettlementResult } from "../domain/types";
import { reduceLotsWeightedAverage } from "./cost-basis-service";
import { createId } from "./id";
import { getLatestPrices, makeLedgerEntry } from "./ledger-service";

type SettleInput = {
  orderId: string;
  result: SettlementResult;
  receivedAsset: Asset;
  receivedAmount: number;
  settledAt: string;
  note: string;
};

function buyLowHitYieldUSDT(order: DIOrder): number {
  return Math.max(0, order.subscribedAmount * (order.termRatePercent / 100));
}

function settlementPriceUSDT(state: AppState, asset: Asset, fallbackPrice: number): number {
  const price = assetPrice(asset, getLatestPrices(state));
  return price > 0 ? price : fallbackPrice;
}

function subscribedCapitalValueAtStartUSDT(order: DIOrder): number {
  if (order.subscribedCapitalValueAtStartUSDT !== undefined) return order.subscribedCapitalValueAtStartUSDT;
  if (order.subscribedAsset === "USDT") return order.subscribedAmount;
  return order.subscribedAmount * order.strikePrice;
}

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
  let settlementPrice = settlementPriceUSDT(state, input.receivedAsset, order.strikePrice);
  let premiumYieldUSDT = 0;
  let basisReductionUSDT = 0;
  let tradingPnlUSDT = 0;
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
    premiumYieldUSDT = buyLowHitYieldUSDT(order);
    realizedYieldUSDT = premiumYieldUSDT;
  }

  if (order.productType === "BUY_LOW" && input.result === "NOT_HIT") {
    premiumYieldUSDT = input.receivedAmount - order.subscribedAmount;
    realizedYieldUSDT = premiumYieldUSDT;
    realizedPnlUSDT = premiumYieldUSDT;
  }

  if (order.productType === "SELL_HIGH" && input.result === "HIT") {
    const reduction = reduceLotsWeightedAverage(nextLots, order.subscribedAsset, order.subscribedAmount);
    const grossSellValueUSDT = order.subscribedAmount * order.strikePrice;
    nextLots = reduction.updatedLots;
    premiumYieldUSDT = input.receivedAmount - grossSellValueUSDT;
    tradingPnlUSDT = grossSellValueUSDT - reduction.costSoldUSDT;
    realizedPnlUSDT = input.receivedAmount - reduction.costSoldUSDT;
    realizedYieldUSDT = premiumYieldUSDT;
  }

  if (order.productType === "SELL_HIGH" && input.result === "NOT_HIT") {
    const premiumCoin = input.receivedAmount - order.subscribedAmount;
    const averageEntry = state.costBasisLots.find((lot) => lot.underlyingAsset === normalizeAsset(order.subscribedAsset) && lot.status === "OPEN")?.effectiveEntry ?? order.strikePrice;
    settlementPrice = settlementPriceUSDT(state, input.receivedAsset, averageEntry);
    premiumYieldUSDT = Math.max(0, premiumCoin * settlementPrice);
    basisReductionUSDT = Math.max(0, premiumCoin * averageEntry);
    realizedYieldUSDT = premiumYieldUSDT;
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
    subscribedCapitalValueAtStartUSDT: subscribedCapitalValueAtStartUSDT(order),
    settlementPriceUSDT: settlementPrice,
    premiumValueAtSettlementUSDT: premiumYieldUSDT,
    premiumYieldUSDT,
    basisReductionUSDT,
    tradingPnlUSDT,
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
