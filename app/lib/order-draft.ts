import type { Asset, Exchange, MarketContextTag, ProductType } from "./domain/types";
import type { OrderInput } from "./services/order-service";

export type OrderDraft = Omit<OrderInput, "portfolioId">;

export const contextTags: MarketContextTag[] = [
  "Pumping hard",
  "Dumping hard",
  "Sideway",
  "Near support",
  "Near resistance"
];

export const emptyOrder: OrderDraft = {
  exchange: "OKX" as Exchange,
  productType: "BUY_LOW" as ProductType,
  pocketId: "pocket_core_sol",
  pair: "USDT-OKSOL",
  subscribedAsset: "USDT" as Asset,
  subscribedAmount: 3064,
  strikePrice: 86,
  aprPercent: 97.6,
  termRatePercent: 1.036,
  startTime: "2026-04-26T11:00",
  settlementTime: "2026-04-26T18:00",
  expectedPremiumAmount: 31.75,
  expectedPremiumAsset: "USDT" as Asset,
  ifHitAsset: "OKSOL" as Asset,
  ifHitAmount: 35.99708619,
  ifNotHitAsset: "USDT" as Asset,
  ifNotHitAmount: 3095.75,
  marketContextTags: ["Sideway"] as MarketContextTag[],
  note: ""
};
