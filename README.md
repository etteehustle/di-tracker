# DI Tracker

Responsive MVP for tracking and optimizing a Dual Investment financial system.

## Stack

- Next.js + TypeScript
- Service-layer DI accounting logic in `app/lib/services`
- Client-first persistence with `localStorage` for Phase 1
- Vitest unit tests for calculation logic
- OKX public ticker price refresh with CoinGecko/mock fallback

## Why localStorage in Phase 1?

The app should be hosted free and accessible 24/7. Vercel free is a good fit for the web app, but SQLite files are not persistent on Vercel. Phase 1 therefore uses browser persistence behind a small store abstraction. Phase 2 should move the repository layer to Supabase free Postgres for cloud persistence.

## Run Locally

Install Node.js LTS first if needed, then:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Local development uses the `local` app environment by default. In this mode authentication is disabled and the app reads/writes browser `localStorage`.

To force a specific environment:

```powershell
$env:NEXT_PUBLIC_APP_ENV="local"; npm run dev
$env:NEXT_PUBLIC_APP_ENV="production"; npm run dev
```

Production enables Supabase authentication and hides the Roadmap page. Local keeps Roadmap visible and can still opt into seed data with `NEXT_PUBLIC_ENABLE_MOCK_DATA=true`.

## Test

```bash
npm test
```

Covered business rules:

- Weighted average cost basis
- Buy Low hit effective entry
- Buy Low not-hit premium
- Sell High hit realized PnL
- Sell High not-hit coin premium
- Pocket merge does not change DI PnL
- Settled Average forecast
- Blended forecast
- SOL/OKSOL normalization
- Soft delete keeps the record

## Deploy Free 24/7

Recommended Phase 1 deploy:

1. Push this repo to GitHub.
2. Create a free Vercel project from the GitHub repo.
3. Use the default Next.js build command.
4. Deploy.

Important: Phase 1 data is stored in the browser that opens the app. For durable multi-device access, move to Phase 2 Supabase/Postgres persistence.

## Price Service

Price refresh uses a local Next.js API route at `/api/prices`.

Primary source is OKX public market ticker API:

- USDT = 1
- SOL = OKX `SOL-USDT` last price
- OKSOL uses SOL price by normalization
- BTC = OKX `BTC-USDT` last price
- ETH = OKX `ETH-USDT` last price

If OKX fails, the API route falls back to CoinGecko. If both fail, it returns mock prices so the app remains usable.
