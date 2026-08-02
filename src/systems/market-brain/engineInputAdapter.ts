import { evaluatePSEEquity, type PSEEquityPacket, type MarketBrainResult } from './pseMarketBrain';

export interface EngineLikeInput {
  symbol: string;
  tradeDate?: string;
  features?: Record<string, number | null | undefined>;
  financials?: Record<string, number | null | undefined>;
  sector?: { name?: string | null };
}

export interface CompanyLikeInput {
  companyName?: string | null;
  name?: string | null;
  sector?: string | null;
  industry?: string | null;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const anyFinite = (values: unknown[]): boolean => values.some(finite);

export function toPSEEquityPacket(input: EngineLikeInput, company?: CompanyLikeInput): PSEEquityPacket {
  const financials = input.financials ?? {};
  const features = input.features ?? {};
  const hasFundamentals = anyFinite([financials.peRatio, financials.pbRatio, financials.roe, financials.roa, financials.roic]);
  const hasFinancialStatements = anyFinite([financials.revenueGrowth, financials.profitGrowth, financials.operatingMargin]);
  const hasTechnicals = anyFinite([features.rsi, features.adx, features.momentum, features.volatility, features.relativeStrength, features.trendStrength]);

  return {
    symbol: input.symbol,
    companyName: company?.companyName ?? company?.name ?? input.symbol.toUpperCase(),
    sector: company?.sector ?? input.sector?.name ?? null,
    asOf: input.tradeDate ?? new Date().toISOString(),
    fundamentals: input.financials,
    technicals: input.features,
    evidence: {
      instrument_master: 'ready',
      prices: hasTechnicals ? 'ready' : 'missing',
      fundamentals: hasFundamentals ? 'ready' : 'missing',
      financial_statements: hasFinancialStatements ? 'ready' : 'missing',
      technicals: hasTechnicals ? 'ready' : 'missing',
      sector_context: input.sector?.name || company?.sector ? 'ready' : 'missing',
    },
  };
}

export function evaluateMarketBrainInput(input: EngineLikeInput, company?: CompanyLikeInput): MarketBrainResult {
  return evaluatePSEEquity(toPSEEquityPacket(input, company));
}
