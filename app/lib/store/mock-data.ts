import type { AppState } from "../domain/types";
import { evaluateOrder } from "../services/order-evaluation-service";
import { mockPrices } from "../services/price-service";

const now = "2026-04-29T08:05:00.000Z";

export const seedState: AppState = {
  user: {
    id: "user_main",
    name: "Personal DI Operator",
    baseCurrency: "USDT",
    createdAt: now,
    updatedAt: now
  },
  portfolio: {
    id: "portfolio_main",
    userId: "user_main",
    name: "Main Portfolio",
    baseCurrency: "USDT",
    createdAt: now,
    updatedAt: now
  },
  pockets: [
    {
      id: "pocket_core_sol",
      portfolioId: "portfolio_main",
      name: "Core SOL DI",
      status: "ACTIVE",
      mergedIntoPocketId: null,
      mergedAt: null,
      createdAt: now,
      updatedAt: now,
      note: "Main SOL/OKSOL DI operating pocket"
    },
    {
      id: "pocket_extra",
      portfolioId: "portfolio_main",
      name: "Extra Capital",
      status: "ACTIVE",
      mergedIntoPocketId: null,
      mergedAt: null,
      createdAt: now,
      updatedAt: now,
      note: "Small side pocket for split strategy tests"
    }
  ],
  capitalMovements: [
    {
      id: "movement_seed_deposit",
      portfolioId: "portfolio_main",
      type: "DEPOSIT",
      toPocketId: "pocket_core_sol",
      asset: "USDT",
      amount: 5361,
      valueUSDTAtTime: 5361,
      movementTime: "2026-04-26T10:00:00.000Z",
      note: "Initial DI capital",
      createdAt: "2026-04-26T10:00:00.000Z",
      updatedAt: "2026-04-26T10:00:00.000Z"
    }
  ],
  ledgerEntries: [
    {
      id: "ledger_seed_deposit",
      portfolioId: "portfolio_main",
      pocketId: "pocket_core_sol",
      asset: "USDT",
      underlyingAsset: "USDT",
      deltaAmount: 5361,
      sourceType: "CAPITAL_MOVEMENT",
      sourceId: "movement_seed_deposit",
      entryTime: "2026-04-26T10:00:00.000Z",
      note: "Initial DI capital",
      createdAt: "2026-04-26T10:00:00.000Z"
    },
    {
      id: "ledger_buy_hit_usdt_out",
      portfolioId: "portfolio_main",
      pocketId: "pocket_core_sol",
      asset: "USDT",
      underlyingAsset: "USDT",
      deltaAmount: -5361,
      sourceType: "DI_ORDER_SETTLEMENT",
      sourceId: "order_buy_low_seed",
      entryTime: "2026-04-29T08:00:00.000Z",
      note: "Buy Low hit: subscribed USDT out",
      createdAt: "2026-04-29T08:00:00.000Z"
    },
    {
      id: "ledger_buy_hit_oksol_in",
      portfolioId: "portfolio_main",
      pocketId: "pocket_core_sol",
      asset: "OKSOL",
      underlyingAsset: "SOL",
      deltaAmount: 63.71871989,
      sourceType: "DI_ORDER_SETTLEMENT",
      sourceId: "order_buy_low_seed",
      entryTime: "2026-04-29T08:00:00.000Z",
      note: "Buy Low hit: received OKSOL",
      createdAt: "2026-04-29T08:00:00.000Z"
    }
  ],
  costBasisLots: [
    {
      id: "lot_buy_low_seed",
      portfolioId: "portfolio_main",
      pocketId: "pocket_core_sol",
      asset: "OKSOL",
      underlyingAsset: "SOL",
      amount: 63.71871989,
      economicCostUSDT: 5361,
      effectiveEntry: 84.1354,
      strikeBasis: 85,
      sourceOrderId: "order_buy_low_seed",
      status: "OPEN",
      createdAt: "2026-04-29T08:00:00.000Z",
      updatedAt: "2026-04-29T08:00:00.000Z"
    }
  ],
  orders: [
    {
      id: "order_sell_high_seed",
      portfolioId: "portfolio_main",
      pocketId: "pocket_core_sol",
      exchange: "OKX",
      productType: "SELL_HIGH",
      pair: "OKSOL-USDT",
      subscribedAsset: "OKSOL",
      subscribedAmount: 63.7,
      strikePrice: 86,
      aprPercent: 87.99,
      termRatePercent: 0.713,
      startTime: "2026-04-29T08:00:00.000Z",
      settlementTime: "2026-05-02T08:00:00.000Z",
      expectedPremiumAsset: "OKSOL",
      expectedPremiumAmount: 0.45430203,
      ifHitAsset: "USDT",
      ifHitAmount: 5517.26997458,
      ifNotHitAsset: "OKSOL",
      ifNotHitAmount: 64.15430203,
      marketContextTags: ["Near resistance"],
      status: "ACTIVE",
      settlementResult: null,
      receivedAsset: null,
      receivedAmount: null,
      settledAt: null,
      note: "Seed Sell High after Buy Low hit",
      isDeleted: false,
      deletedAt: null,
      deleteReason: null,
      createdAt: "2026-04-29T08:00:00.000Z",
      updatedAt: "2026-04-29T08:00:00.000Z"
    },
    {
      id: "order_buy_low_seed",
      portfolioId: "portfolio_main",
      pocketId: "pocket_core_sol",
      exchange: "OKX",
      productType: "BUY_LOW",
      pair: "USDT-OKSOL",
      subscribedAsset: "USDT",
      subscribedAmount: 5361,
      strikePrice: 85,
      aprPercent: 128.6,
      termRatePercent: 1.027,
      startTime: "2026-04-26T10:00:00.000Z",
      settlementTime: "2026-04-29T08:00:00.000Z",
      expectedPremiumAsset: "USDT",
      expectedPremiumAmount: 55.09119069,
      ifHitAsset: "OKSOL",
      ifHitAmount: 63.71871989,
      ifNotHitAsset: "USDT",
      ifNotHitAmount: 5416.09119069,
      marketContextTags: ["Sideway"],
      status: "SETTLED_HIT",
      settlementResult: "HIT",
      receivedAsset: "OKSOL",
      receivedAmount: 63.71871989,
      settledAt: "2026-04-29T08:00:00.000Z",
      realizedYieldUSDT: 55.09119069,
      realizedPnlUSDT: 0,
      note: "Seed Buy Low hit scenario",
      isDeleted: false,
      deletedAt: null,
      deleteReason: null,
      createdAt: "2026-04-26T10:00:00.000Z",
      updatedAt: "2026-04-29T08:00:00.000Z"
    }
  ],
  priceSnapshots: mockPrices(),
  orderEvaluations: [],
  auditLogs: [
    {
      id: "audit_seed_order",
      portfolioId: "portfolio_main",
      entityType: "DI_ORDER",
      entityId: "order_buy_low_seed",
      action: "SETTLE_ORDER",
      changedFields: [
        { field: "status", oldValue: "ACTIVE", newValue: "SETTLED_HIT" },
        { field: "receivedAsset", oldValue: null, newValue: "OKSOL" },
        { field: "receivedAmount", oldValue: null, newValue: 63.71871989 }
      ],
      reason: "Seed settlement scenario",
      createdAt: "2026-04-29T08:00:00.000Z"
    },
    {
      id: "audit_seed_deposit",
      portfolioId: "portfolio_main",
      entityType: "CAPITAL_MOVEMENT",
      entityId: "movement_seed_deposit",
      action: "CREATE_DEPOSIT",
      changedFields: [{ field: "amount", oldValue: null, newValue: 5361 }],
      reason: "Initial DI capital",
      createdAt: "2026-04-26T10:00:00.000Z"
    }
  ]
};

seedState.orderEvaluations = seedState.orders.map((order) => ({ ...evaluateOrder(order), orderId: order.id }));
