export const BASE_CURRENCY = "USDT" as const;

export type Asset = "USDT" | "SOL" | "OKSOL" | "BTC" | "ETH";
export type UnderlyingAsset = "USDT" | "SOL" | "BTC" | "ETH";
export type Exchange = "OKX" | "BYBIT" | "OTHER";
export type ProductType = "BUY_LOW" | "SELL_HIGH";
export type OrderStatus = "ACTIVE" | "SETTLED_HIT" | "SETTLED_NOT_HIT" | "DELETED";
export type SettlementResult = "HIT" | "NOT_HIT";
export type PocketStatus = "ACTIVE" | "MERGED" | "ARCHIVED";
export type MovementType =
  | "DEPOSIT"
  | "WITHDRAW_DI_TO_PORTFOLIO"
  | "WITHDRAW_PORTFOLIO_EXTERNAL"
  | "INTERNAL_TRANSFER"
  | "MANUAL_ADJUSTMENT"
  | "POCKET_MERGE";
export type LedgerSourceType =
  | "CAPITAL_MOVEMENT"
  | "DI_ORDER_SETTLEMENT"
  | "MANUAL_ADJUSTMENT"
  | "POCKET_MERGE";
export type CostBasisStatus = "OPEN" | "CLOSED" | "MERGED";
export type MarketContextTag =
  | "Pumping hard"
  | "Dumping hard"
  | "Sideway"
  | "Near support"
  | "Near resistance";
export type Score = "EXCELLENT" | "GOOD" | "NEUTRAL" | "BAD" | "DANGEROUS";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type EfficiencyLabel = "WEAK" | "ACCEPTABLE" | "STRONG";
export type ForecastMode = "SETTLED_ONLY" | "SETTLED_PLUS_ACTIVE_PREMIUM" | "RECENT_TARGET_RATE";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type User = {
  id: string;
  name: string;
  baseCurrency: typeof BASE_CURRENCY;
  createdAt: string;
  updatedAt: string;
};

export type Portfolio = {
  id: string;
  userId: string;
  name: string;
  baseCurrency: typeof BASE_CURRENCY;
  createdAt: string;
  updatedAt: string;
};

export type DIPocket = {
  id: string;
  portfolioId: string;
  name: string;
  status: PocketStatus;
  mergedIntoPocketId?: string | null;
  mergedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  note?: string;
};

export type DIOrder = {
  id: string;
  portfolioId: string;
  pocketId: string;
  exchange: Exchange;
  productType: ProductType;
  pair: string;
  subscribedAsset: Asset;
  subscribedAmount: number;
  strikePrice: number;
  aprPercent: number;
  termRatePercent: number;
  startTime: string;
  settlementTime: string;
  subscribedCapitalValueAtStartUSDT?: number;
  expectedPremiumAmount: number;
  expectedPremiumAsset: Asset;
  ifHitAsset: Asset;
  ifHitAmount: number;
  ifNotHitAsset: Asset;
  ifNotHitAmount: number;
  marketContextTags: MarketContextTag[];
  status: OrderStatus;
  settlementResult?: SettlementResult | null;
  receivedAsset?: Asset | null;
  receivedAmount?: number | null;
  settledAt?: string | null;
  settlementPriceUSDT?: number;
  premiumValueAtSettlementUSDT?: number;
  premiumYieldUSDT?: number;
  basisReductionUSDT?: number;
  tradingPnlUSDT?: number;
  realizedYieldUSDT?: number;
  realizedPnlUSDT?: number;
  note?: string;
  isDeleted: boolean;
  deletedAt?: string | null;
  deleteReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CapitalMovement = {
  id: string;
  portfolioId: string;
  type: MovementType;
  fromPocketId?: string | null;
  toPocketId?: string | null;
  asset: Asset;
  amount: number;
  valueUSDTAtTime?: number | null;
  movementTime: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  portfolioId: string;
  pocketId?: string | null;
  asset: Asset;
  underlyingAsset: UnderlyingAsset;
  deltaAmount: number;
  sourceType: LedgerSourceType;
  sourceId: string;
  entryTime: string;
  note?: string;
  createdAt: string;
};

export type CostBasisLot = {
  id: string;
  portfolioId: string;
  pocketId?: string | null;
  asset: Asset;
  underlyingAsset: UnderlyingAsset;
  amount: number;
  economicCostUSDT: number;
  effectiveEntry: number;
  strikeBasis?: number | null;
  sourceOrderId?: string | null;
  status: CostBasisStatus;
  createdAt: string;
  updatedAt: string;
};

export type PriceSnapshot = {
  id: string;
  asset: UnderlyingAsset;
  priceUSDT: number;
  source: "OKX" | "BYBIT" | "BINANCE" | "COINGECKO" | "MANUAL" | "MOCK";
  capturedAt: string;
};

export type OrderEvaluation = {
  id: string;
  orderId?: string;
  score: Score;
  riskLevel: RiskLevel;
  efficiencyLabel: EfficiencyLabel;
  benchmarkMatched: string;
  reasons: string[];
  evaluatedAt: string;
};

export type ForecastSnapshot = {
  id: string;
  portfolioId: string;
  mode: ForecastMode;
  currentDIValueUSDT: number;
  dailyReturnRate: number;
  projectedOneYearValueUSDT: number;
  simpleOneYearValueUSDT: number;
  confidence: Confidence;
  confidenceNotes: string[];
  warning: string;
  settledOrderCount: number;
  activeOrderCount: number;
  sampleDays: number;
  activeDeploymentRatio: number;
  returnStdDev?: number;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  portfolioId: string;
  entityType: "DI_ORDER" | "DI_POCKET" | "CAPITAL_MOVEMENT" | "PORTFOLIO_ASSET" | "FORECAST";
  entityId: string;
  action:
    | "CREATE_ORDER"
    | "EDIT_ACTIVE_ORDER"
    | "EDIT_SETTLED_ORDER"
    | "DELETE_ORDER"
    | "SETTLE_ORDER"
    | "CREATE_DEPOSIT"
    | "CREATE_WITHDRAWAL"
    | "MANUAL_ADJUSTMENT"
    | "MERGE_POCKET"
    | "EDIT_CAPITAL_MOVEMENT";
  changedFields: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  reason?: string | null;
  createdAt: string;
};

export type AppState = {
  user: User;
  portfolio: Portfolio;
  pockets: DIPocket[];
  orders: DIOrder[];
  capitalMovements: CapitalMovement[];
  ledgerEntries: LedgerEntry[];
  costBasisLots: CostBasisLot[];
  priceSnapshots: PriceSnapshot[];
  auditLogs: AuditLog[];
  orderEvaluations: OrderEvaluation[];
};

export type AssetBalance = {
  asset: Asset;
  underlyingAsset: UnderlyingAsset;
  amount: number;
  valueUSDT: number;
};

export type ExposureBalance = {
  underlyingAsset: UnderlyingAsset;
  amount: number;
  valueUSDT: number;
};
