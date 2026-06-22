import { indianApiService } from "../indianapi/IndianApiService";
import type {
  CompanyProfileOverview,
  CorporateAction,
  FundamentalSnapshot,
  IndianApiFetchResult,
  MarketLivePrice,
  ShareholdingTrend,
  UnifiedIndianStockSnapshot,
} from "../indianapi/IndianApiTypes";
import { buildStockEdgePredictionInput } from "../stockedge/StockEdgePredictionBridge";
import { StockEdgeWrapper } from "../stockedge/StockEdgeWrapper";
import type { StockEdgeCanonicalSnapshot } from "../stockedge/StockEdgeTypes";

export interface UnifiedEnrichmentMeta {
  stockEdgeEnabled: boolean;
  stockEdgeStatus: string;
  stockEdgeActiveFieldCount: number;
  stockEdgeMissingSections: string[];
  stockEdgeMappedAt?: string;
}

export interface UnifiedMarketSnapshot extends UnifiedIndianStockSnapshot {
  enrichment: UnifiedEnrichmentMeta;
  stockEdge?: {
    technicals: StockEdgeCanonicalSnapshot["technicals"];
    financialTables: StockEdgeCanonicalSnapshot["financialTables"];
    ownership: StockEdgeCanonicalSnapshot["ownership"];
    corporateActions: StockEdgeCanonicalSnapshot["corporateActions"];
    screenerSignals: StockEdgeCanonicalSnapshot["screenerSignals"];
    predictionInput: ReturnType<typeof buildStockEdgePredictionInput>;
  };
}

function preferNumber(primary: number | null | undefined, secondary: number | null | undefined): number | null {
  if (primary != null && Number.isFinite(primary)) return primary;
  if (secondary != null && Number.isFinite(secondary)) return secondary;
  return null;
}

function mergePrice(symbol: string, base: MarketLivePrice | null, stockEdge: StockEdgeCanonicalSnapshot | null): MarketLivePrice | null {
  if (!base && !stockEdge?.price) return null;
  return {
    symbol,
    price: preferNumber(base?.price, stockEdge?.price?.price),
    previousClose: preferNumber(base?.previousClose, stockEdge?.price?.previousClose),
    open: base?.open ?? null,
    high: base?.high ?? null,
    low: base?.low ?? null,
    change: preferNumber(base?.change, stockEdge?.price?.change),
    changePercent: preferNumber(base?.changePercent, stockEdge?.price?.changePercent),
    volume: preferNumber(base?.volume, stockEdge?.price?.volume),
    avgVolume: base?.avgVolume ?? null,
    week52High: preferNumber(base?.week52High, stockEdge?.price?.fiftyTwoWeekHigh),
    week52Low: preferNumber(base?.week52Low, stockEdge?.price?.fiftyTwoWeekLow),
    marketCap: base?.marketCap ?? null,
    tradedValue: base?.tradedValue ?? null,
    lastTradedAt: base?.lastTradedAt ?? stockEdge?.price?.asOf ?? null,
    exchange: base?.exchange ?? null,
    currency: base?.currency ?? "INR",
    halted: base?.halted ?? false,
    delisted: base?.delisted ?? false,
    dataState: base?.dataState ?? "partial",
  };
}

function mergeProfile(symbol: string, base: CompanyProfileOverview | null, stockEdge: StockEdgeCanonicalSnapshot | null): CompanyProfileOverview | null {
  if (!base && !stockEdge?.profile) return null;
  return {
    symbol,
    companyName: base?.companyName || stockEdge?.profile?.companyName || symbol,
    shortName: base?.shortName ?? stockEdge?.profile?.companyName ?? null,
    nseTicker: base?.nseTicker ?? stockEdge?.profile?.nseCode ?? null,
    bseCode: base?.bseCode ?? stockEdge?.profile?.bseCode ?? null,
    isin: base?.isin ?? stockEdge?.profile?.isin ?? null,
    sector: base?.sector ?? stockEdge?.profile?.sector ?? null,
    industry: base?.industry ?? stockEdge?.profile?.industry ?? null,
    description: base?.description ?? null,
    website: base?.website ?? null,
    marketCap: preferNumber(base?.marketCap, stockEdge?.profile?.marketCapCrore),
    listingDate: base?.listingDate ?? null,
    faceValue: base?.faceValue ?? null,
    exchange: base?.exchange ?? null,
    dataState: base?.dataState ?? "partial",
  };
}

function mergeFundamentals(symbol: string, base: FundamentalSnapshot | null, stockEdge: StockEdgeCanonicalSnapshot | null): FundamentalSnapshot | null {
  if (!base && !stockEdge?.fundamentals) return null;
  return {
    symbol,
    peRatio: preferNumber(base?.peRatio, stockEdge?.fundamentals?.peRatio),
    pbRatio: preferNumber(base?.pbRatio, stockEdge?.fundamentals?.pbRatio),
    roce: preferNumber(base?.roce, stockEdge?.fundamentals?.roce),
    roe: preferNumber(base?.roe, stockEdge?.fundamentals?.roe),
    debtToEquity: preferNumber(base?.debtToEquity, stockEdge?.fundamentals?.debtToEquity),
    dividendYield: preferNumber(base?.dividendYield, stockEdge?.fundamentals?.dividendYield),
    eps: base?.eps ?? null,
    bookValue: base?.bookValue ?? null,
    salesGrowth: preferNumber(base?.salesGrowth, stockEdge?.fundamentals?.revenueGrowth),
    profitGrowth: preferNumber(base?.profitGrowth, stockEdge?.fundamentals?.profitGrowth),
    operatingMargin: preferNumber(base?.operatingMargin, stockEdge?.fundamentals?.operatingMargin),
    netMargin: preferNumber(base?.netMargin, stockEdge?.fundamentals?.netMargin),
    currentRatio: base?.currentRatio ?? null,
    interestCoverage: base?.interestCoverage ?? null,
    dataState: base?.dataState ?? "partial",
  };
}

function mergeShareholding(symbol: string, base: ShareholdingTrend | null, stockEdge: StockEdgeCanonicalSnapshot | null): ShareholdingTrend | null {
  if (base?.snapshots?.length) return base;
  if (!stockEdge?.ownership.length) return null;
  return {
    symbol,
    snapshots: stockEdge.ownership.map((row) => ({
      symbol,
      period: row.period ?? "Current",
      promoter: row.promoter ?? null,
      fii: row.fii ?? null,
      dii: row.dii ?? null,
      public_: row.publicRetail ?? null,
      others: row.others ?? null,
      totalHeld: null,
      dataState: "available",
    })),
    dataState: "available",
  };
}

function mergeCorporateActions(symbol: string, base: CorporateAction[], stockEdge: StockEdgeCanonicalSnapshot | null): CorporateAction[] {
  if (base.length) return base;
  return (stockEdge?.corporateActions ?? []).map((event) => ({
    symbol,
    type: ["dividend", "split", "bonus", "rights"].includes(event.type) ? event.type as CorporateAction["type"] : "other",
    exDate: event.date ?? null,
    recordDate: null,
    description: event.description,
    value: null,
    dataState: "available",
  }));
}

export class UnifiedMarketDataService {
  private readonly stockEdgeWrapper: StockEdgeWrapper;

  constructor(stockEdgeWrapper = new StockEdgeWrapper()) {
    this.stockEdgeWrapper = stockEdgeWrapper;
  }

  async getFullSnapshot(symbol: string): Promise<IndianApiFetchResult<UnifiedMarketSnapshot>> {
    const normalized = symbol.trim().toUpperCase();
    const [base, stockEdgeResult] = await Promise.all([
      indianApiService.getFullSnapshot(normalized),
      this.stockEdgeWrapper.fetchFullSnapshot(normalized),
    ]);
    const stockEdge = stockEdgeResult.data;
    const predictionInput = stockEdge ? buildStockEdgePredictionInput(stockEdge) : null;

    const snapshot: UnifiedMarketSnapshot = {
      symbol: normalized,
      price: mergePrice(normalized, base.data?.price ?? null, stockEdge),
      profile: mergeProfile(normalized, base.data?.profile ?? null, stockEdge),
      fundamentals: mergeFundamentals(normalized, base.data?.fundamentals ?? null, stockEdge),
      shareholding: mergeShareholding(normalized, base.data?.shareholding ?? null, stockEdge),
      corporateActions: mergeCorporateActions(normalized, base.data?.corporateActions ?? [], stockEdge),
      historical: base.data?.historical ?? null,
      fetchedAt: new Date().toISOString(),
      dataState: base.data?.dataState === "available" || stockEdge ? "available" : "partial",
      enrichment: {
        stockEdgeEnabled: Boolean(this.stockEdgeWrapper.configSummary().enabled),
        stockEdgeStatus: stockEdgeResult.status,
        stockEdgeActiveFieldCount: predictionInput?.activeFieldCount ?? 0,
        stockEdgeMissingSections: predictionInput?.missingFields ?? ["snapshot"],
        stockEdgeMappedAt: stockEdge?.mappedAt,
      },
      stockEdge: stockEdge && predictionInput ? {
        technicals: stockEdge.technicals,
        financialTables: stockEdge.financialTables,
        ownership: stockEdge.ownership,
        corporateActions: stockEdge.corporateActions,
        screenerSignals: stockEdge.screenerSignals,
        predictionInput,
      } : undefined,
    };

    return {
      ok: Boolean(base.ok || stockEdge),
      data: snapshot,
      status: stockEdgeResult.ok ? "fresh" : base.status,
      fetchedAt: snapshot.fetchedAt,
      cacheTtlSeconds: Math.max(base.cacheTtlSeconds, stockEdgeResult.cacheTtlSeconds),
    };
  }
}

export const unifiedMarketDataService = new UnifiedMarketDataService();
