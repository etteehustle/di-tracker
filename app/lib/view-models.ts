import type { Asset, AssetBalance, DIOrder, ExposureBalance, ForecastMode, ForecastSnapshot, UnderlyingAsset } from "./domain/types";
import type { DIPnlBreakdown } from "./services/portfolio-service";

export type Tab = "dashboard" | "orders" | "pockets" | "portfolio" | "analytics" | "audit" | "plan";

export type HoldingEntry = {
  asset: Asset;
  entry: number;
  amount: number;
  economicCostUSDT: number;
};

export type ExposureHoldingEntry = {
  underlyingAsset: UnderlyingAsset;
  entry: number;
  amount: number;
  economicCostUSDT: number;
};

export type DashboardMetrics = {
  prices: Record<UnderlyingAsset, number>;
  diValue: number;
  netDeposited: number;
  externalDeposits: number;
  externalWithdrawals: number;
  internalTransfers: number;
  diWorkingCapital: number;
  pnl: number;
  pnlBreakdown: DIPnlBreakdown;
  totalPortfolioPnl: number;
  activeOrders: DIOrder[];
  availableBalances: AssetBalance[];
  activeReservations: AssetBalance[];
  availableExposureBalances: ExposureBalance[];
  activeExposureReservations: ExposureBalance[];
  pendingPremium: number;
  forecast: ForecastSnapshot;
  nextSettlement?: DIOrder;
  portfolioTotal: number;
  storagePortfolioValue: number;
  holdingEntries: HoldingEntry[];
  exposureHoldingEntries: ExposureHoldingEntry[];
};

export type OrderSettlementResult = "HIT" | "NOT_HIT";

export type ForecastModeSetter = (mode: ForecastMode) => void;
