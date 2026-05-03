# DI Tracker Phase Plan

## Phase 1 Scope

Implemented in the current MVP:

- Next.js + TypeScript app shell
- Responsive desktop sidebar and mobile bottom navigation
- Mock seed data for the current SOL/OKSOL DI plan
- Client-side persistence through `localStorage`
- TypeScript domain model with `userId` and portfolio/pocket/order concepts
- Ledger-based DI balances
- Active order conservative valuation
- Pending premium displayed separately from main DI value
- SOL/OKSOL normalized as SOL-equivalent exposure
- Dashboard cards:
  - Total DI Value
  - Net Deposited Capital
  - DI Profit / Loss
  - Active Orders
  - Current Holding Entry
  - 1-Year Forecast
  - Next Settlement Countdown
  - Portfolio Total Value
- Manual create order
- Immediate order evaluation before saving
- Settle active order as Hit or Not Hit
- Buy Low hit cost basis lot creation
- Sell High hit weighted-average realized PnL
- Sell High not-hit coin premium tracking
- Pockets overview
- Deposit USDT to pocket
- Pocket merge as internal transfer, not PnL
- Portfolio overview with market value
- Audit log for major actions
- Forecast modes:
  - Settled Average
  - Blended
- Unit tests for core accounting and forecast rules

## Phase 2 Backlog

Recommended next build:

- Supabase free Postgres repository layer for durable online data
- Optional lightweight auth or private access gate
- Full edit active order modal with pair locked
- Full edit settled order modal with old/new audit diff and required reason
- Manual portfolio adjustment form:
  - DI balance adjustment
  - Portfolio-only adjustment
- Withdrawal flows:
  - DI to Portfolio
  - Portfolio to External
  - Internal transfer
- Advanced order history filters and sorting
- CSV export for audit/backup
- Analytics charts:
  - Monthly DI return
  - Capital growth chart
  - Contribution vs profit
  - Best/worst order
- Forecast detail view
- Better pocket creation UI
- Settings page for manual price overrides
- PWA mode
- Deploy hardening and backup/restore

## Persistence Direction

Phase 1 uses browser storage so the app can be deployed free on Vercel immediately.

Phase 2 should add:

- `Repository` interface
- `LocalStorageRepository`
- `SupabaseRepository`
- Supabase tables matching the current TypeScript models
- Server actions or API routes for writes

This keeps calculation logic unchanged while moving storage from local browser to durable cloud database.
