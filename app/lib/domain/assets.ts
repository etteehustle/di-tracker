import type { Asset, UnderlyingAsset } from "./types";

export function normalizeAsset(asset: Asset): UnderlyingAsset {
  return asset === "OKSOL" ? "SOL" : asset;
}

export function assetPrice(asset: Asset | UnderlyingAsset, prices: Record<UnderlyingAsset, number>): number {
  return prices[asset === "OKSOL" ? "SOL" : asset];
}

export function isCoinAsset(asset: Asset): boolean {
  return asset !== "USDT";
}

export function formatAsset(asset: Asset): string {
  return asset === "OKSOL" ? "OKSOL" : asset;
}

export function toUSDT(amount: number, asset: Asset | UnderlyingAsset, prices: Record<UnderlyingAsset, number>): number {
  return amount * assetPrice(asset, prices);
}
