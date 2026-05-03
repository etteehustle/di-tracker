import type { PriceSnapshot, UnderlyingAsset } from "../domain/types";
import { createId } from "./id";

export async function fetchMarketPrices(): Promise<PriceSnapshot[]> {
  const response = await fetch("/api/prices", { cache: "no-store" });
  if (!response.ok) throw new Error("Price refresh failed");

  const payload = (await response.json()) as { prices: PriceSnapshot[] };
  if (!payload.prices?.length) throw new Error("Price response is empty");

  return payload.prices;
}

export function mockPrices(): PriceSnapshot[] {
  const capturedAt = new Date().toISOString();
  return [
    { id: "price_usdt_mock", asset: "USDT", priceUSDT: 1, source: "MOCK", capturedAt },
    { id: "price_sol_mock", asset: "SOL", priceUSDT: 84.4, source: "MOCK", capturedAt },
    { id: "price_btc_mock", asset: "BTC", priceUSDT: 64000, source: "MOCK", capturedAt },
    { id: "price_eth_mock", asset: "ETH", priceUSDT: 3100, source: "MOCK", capturedAt }
  ];
}
