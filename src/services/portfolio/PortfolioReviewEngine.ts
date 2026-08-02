import { SECTOR_UNAVAILABLE, type UserHolding } from './PortfolioEngine';

export type PortfolioReviewAvailability = 'real' | 'partial' | 'unavailable';

export interface PortfolioHoldingReview extends UserHolding {
  costBasis: number;
  costBasisWeightPct: number;
  livePrice: number | null;
  liveValue: number | null;
  gainLossPct: number | null;
  quoteAvailable: boolean;
}

export interface PortfolioSectorExposure {
  sector: string;
  costBasis: number;
  weightPct: number;
}

export interface PortfolioReviewItem {
  id: string;
  severity: 'info' | 'review' | 'attention';
  title: string;
  detail: string;
  symbol?: string;
}

export interface PortfolioReviewSnapshot {
  availability: PortfolioReviewAvailability;
  allocationBasis: 'recorded-cost-basis';
  totalCostBasis: number;
  livePortfolioValue: number | null;
  coveredMarketValue: number;
  totalGainLossAmount: number | null;
  totalGainLossPct: number | null;
  quoteCoverage: {
    coveredPositions: number;
    totalPositions: number;
    coveragePct: number;
    missingSymbols: string[];
  };
  concentration: {
    largestPosition: { symbol: string; weightPct: number } | null;
    topThreeWeightPct: number;
    sectorExposure: PortfolioSectorExposure[];
  };
  holdings: PortfolioHoldingReview[];
  reviewQueue: PortfolioReviewItem[];
}

function finitePositive(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizedQuoteMap(currentPrices: Record<string, number | null | undefined>): Record<string, number> {
  const normalized: Record<string, number> = {};
  for (const [symbol, value] of Object.entries(currentPrices)) {
    const price = finitePositive(value);
    if (price !== null) normalized[symbol.toUpperCase().trim()] = price;
  }
  return normalized;
}

/**
 * Build a portfolio operating snapshot without combining recorded cost basis and
 * unavailable market quotes. Concentration is explicitly cost-basis weighted;
 * live performance is emitted only when all positions have a usable quote.
 */
export function buildPortfolioReview(
  holdings: UserHolding[],
  currentPrices: Record<string, number | null | undefined> = {},
): PortfolioReviewSnapshot {
  const prices = normalizedQuoteMap(currentPrices);
  const validHoldings = holdings.filter((holding) =>
    Boolean(holding.symbol) && finitePositive(holding.shares) !== null && finitePositive(holding.avgBuyPrice) !== null,
  );
  const totalCostBasis = validHoldings.reduce((sum, holding) => sum + holding.shares * holding.avgBuyPrice, 0);

  const holdingReviews = validHoldings.map((holding): PortfolioHoldingReview => {
    const costBasis = holding.shares * holding.avgBuyPrice;
    const livePrice = prices[holding.symbol.toUpperCase().trim()] ?? null;
    const liveValue = livePrice === null ? null : holding.shares * livePrice;
    const gainLossPct = liveValue === null || costBasis <= 0 ? null : ((liveValue - costBasis) / costBasis) * 100;

    return {
      ...holding,
      costBasis,
      costBasisWeightPct: totalCostBasis > 0 ? round((costBasis / totalCostBasis) * 100) : 0,
      livePrice,
      liveValue,
      gainLossPct: gainLossPct === null ? null : round(gainLossPct),
      quoteAvailable: livePrice !== null,
    };
  }).sort((a, b) => b.costBasis - a.costBasis);

  const missingSymbols = holdingReviews.filter((holding) => !holding.quoteAvailable).map((holding) => holding.symbol);
  const covered = holdingReviews.filter((holding) => holding.quoteAvailable);
  const coveredMarketValue = covered.reduce((sum, holding) => sum + (holding.liveValue ?? 0), 0);
  const allQuotesAvailable = holdingReviews.length > 0 && missingSymbols.length === 0;
  const livePortfolioValue = allQuotesAvailable ? coveredMarketValue : null;
  const totalGainLossAmount = livePortfolioValue === null ? null : livePortfolioValue - totalCostBasis;
  const totalGainLossPct = totalGainLossAmount === null || totalCostBasis <= 0
    ? null
    : round((totalGainLossAmount / totalCostBasis) * 100);

  const sectorValues = new Map<string, number>();
  for (const holding of holdingReviews) {
    const sector = holding.sector?.trim() || SECTOR_UNAVAILABLE;
    sectorValues.set(sector, (sectorValues.get(sector) ?? 0) + holding.costBasis);
  }
  const sectorExposure = [...sectorValues.entries()]
    .map(([sector, costBasis]) => ({
      sector,
      costBasis,
      weightPct: totalCostBasis > 0 ? round((costBasis / totalCostBasis) * 100) : 0,
    }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const largestPosition = holdingReviews[0]
    ? { symbol: holdingReviews[0].symbol, weightPct: holdingReviews[0].costBasisWeightPct }
    : null;
  const topThreeWeightPct = round(holdingReviews.slice(0, 3).reduce((sum, holding) => sum + holding.costBasisWeightPct, 0));

  const reviewQueue: PortfolioReviewItem[] = [];
  for (const symbol of missingSymbols) {
    reviewQueue.push({
      id: `missing-quote:${symbol}`,
      severity: 'review',
      symbol,
      title: `${symbol}: live quote unavailable`,
      detail: 'Current value and return are intentionally withheld until a source-backed quote is available.',
    });
  }
  for (const holding of holdingReviews.filter((item) => item.sector === SECTOR_UNAVAILABLE)) {
    reviewQueue.push({
      id: `missing-sector:${holding.symbol}`,
      severity: 'info',
      symbol: holding.symbol,
      title: `${holding.symbol}: sector unavailable`,
      detail: 'Add a verified sector label before interpreting sector concentration.',
    });
  }
  if (largestPosition && largestPosition.weightPct > 30) {
    reviewQueue.push({
      id: `concentration:${largestPosition.symbol}`,
      severity: largestPosition.weightPct > 50 ? 'attention' : 'review',
      symbol: largestPosition.symbol,
      title: `${largestPosition.symbol}: concentration review`,
      detail: `${largestPosition.weightPct.toFixed(2)}% of recorded cost basis is allocated to this holding.`,
    });
  }

  const availability: PortfolioReviewAvailability = holdingReviews.length === 0
    ? 'unavailable'
    : missingSymbols.length > 0
      ? 'partial'
      : 'real';

  return {
    availability,
    allocationBasis: 'recorded-cost-basis',
    totalCostBasis,
    livePortfolioValue,
    coveredMarketValue,
    totalGainLossAmount,
    totalGainLossPct,
    quoteCoverage: {
      coveredPositions: covered.length,
      totalPositions: holdingReviews.length,
      coveragePct: holdingReviews.length > 0 ? round((covered.length / holdingReviews.length) * 100) : 0,
      missingSymbols,
    },
    concentration: {
      largestPosition,
      topThreeWeightPct,
      sectorExposure,
    },
    holdings: holdingReviews,
    reviewQueue,
  };
}
