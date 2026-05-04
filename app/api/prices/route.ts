import type { PriceSnapshot, UnderlyingAsset } from "../../lib/domain/types";
import { environment } from "../../environment";

const OKX_INSTRUMENTS: Record<Exclude<UnderlyingAsset, "USDT">, string> = {
  SOL: "SOL-USDT",
  BTC: "BTC-USDT",
  ETH: "ETH-USDT"
};

const COINGECKO_IDS: Record<Exclude<UnderlyingAsset, "USDT">, string> = {
  SOL: "solana",
  BTC: "bitcoin",
  ETH: "ethereum"
};

type OkxTickerResponse = {
  code: string;
  msg: string;
  data?: Array<{
    instId: string;
    last: string;
    ts: string;
  }>;
};

function makeSnapshot(asset: UnderlyingAsset, priceUSDT: number, source: PriceSnapshot["source"], capturedAt: string): PriceSnapshot {
  return {
    id: `price_${asset.toLowerCase()}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    asset,
    priceUSDT,
    source,
    capturedAt
  };
}

async function fetchOkxTicker(asset: Exclude<UnderlyingAsset, "USDT">): Promise<PriceSnapshot> {
  const instId = OKX_INSTRUMENTS[asset];
  const response = await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error(`OKX ticker failed for ${instId}`);

  const payload = (await response.json()) as OkxTickerResponse;
  const ticker = payload.data?.[0];
  const price = Number(ticker?.last);
  if (payload.code !== "0" || !Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid OKX ticker response for ${instId}: ${payload.msg}`);
  }

  const timestamp = Number(ticker?.ts);
  const capturedAt = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
  return makeSnapshot(asset, price, "OKX", capturedAt);
}

async function fetchOkxPrices(): Promise<PriceSnapshot[]> {
  const assets = Object.keys(OKX_INSTRUMENTS) as Array<Exclude<UnderlyingAsset, "USDT">>;
  const capturedAt = new Date().toISOString();
  return [
    makeSnapshot("USDT", 1, "OKX", capturedAt),
    ...(await Promise.all(assets.map((asset) => fetchOkxTicker(asset))))
  ];
}

async function fetchCoinGeckoPrices(): Promise<PriceSnapshot[]> {
  const assets = Object.keys(COINGECKO_IDS) as Array<Exclude<UnderlyingAsset, "USDT">>;
  const ids = assets.map((asset) => COINGECKO_IDS[asset]).join(",");
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error("CoinGecko price refresh failed");

  const payload = (await response.json()) as Record<string, { usd?: number }>;
  const capturedAt = new Date().toISOString();
  const prices = assets.map((asset) => {
    const price = Number(payload[COINGECKO_IDS[asset]]?.usd);
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid CoinGecko price for ${asset}`);
    return makeSnapshot(asset, price, "COINGECKO", capturedAt);
  });

  return [makeSnapshot("USDT", 1, "COINGECKO", capturedAt), ...prices];
}

function fallbackMockPrices(): PriceSnapshot[] {
  const capturedAt = new Date().toISOString();
  return [
    makeSnapshot("USDT", 1, "MOCK", capturedAt),
    makeSnapshot("SOL", 84.4, "MOCK", capturedAt),
    makeSnapshot("BTC", 64000, "MOCK", capturedAt),
    makeSnapshot("ETH", 3100, "MOCK", capturedAt)
  ];
}

export async function GET() {
  try {
    return Response.json({ prices: await fetchOkxPrices(), source: "OKX" });
  } catch (okxError) {
    try {
      return Response.json({ prices: await fetchCoinGeckoPrices(), source: "COINGECKO" });
    } catch {
      if (!environment.mock.enabled) {
        return Response.json(
          {
            prices: [],
            source: "NONE",
            warning: okxError instanceof Error ? okxError.message : "OKX price refresh failed"
          },
          { status: 503 }
        );
      }

      return Response.json(
        {
          prices: fallbackMockPrices(),
          source: "MOCK",
          warning: okxError instanceof Error ? okxError.message : "OKX price refresh failed"
        },
        { status: 200 }
      );
    }
  }
}
