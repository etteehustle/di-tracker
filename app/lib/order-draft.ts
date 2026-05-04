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

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dateTimeLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function defaultSettlementTime(startTime: Date): Date {
  const settlementTime = new Date(startTime);
  settlementTime.setDate(settlementTime.getDate() + 1);
  return settlementTime;
}

const defaultStartTime = new Date();

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
  startTime: dateTimeLocalInput(defaultStartTime),
  settlementTime: dateTimeLocalInput(defaultSettlementTime(defaultStartTime)),
  expectedPremiumAmount: 31.75,
  expectedPremiumAsset: "USDT" as Asset,
  ifHitAsset: "OKSOL" as Asset,
  ifHitAmount: 35.99708619,
  ifNotHitAsset: "USDT" as Asset,
  ifNotHitAmount: 3095.75,
  marketContextTags: ["Sideway"] as MarketContextTag[],
  note: ""
};
