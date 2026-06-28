/**
 * Company Identity Mapper
 *
 * Maps raw DB/provider identity data to canonical IntelligenceInput identity fields.
 */

export interface CompanyIdentityRaw {
  symbol: string;
  exchange?: string;
  name?: string;
  sector?: string;
  industry?: string;
  isin?: string;
  asOf?: string;
}

export interface CompanyIdentityMapped {
  symbol: string;
  exchange: 'BSE' | 'NSE' | 'NSE_EQ' | 'BSE_EQ';
  name: string;
  sector: string;
  industry: string;
  asOf: string | null;
}

export function mapCompanyIdentity(raw: CompanyIdentityRaw): CompanyIdentityMapped {
  const exchange = normalizeExchange(raw.exchange);

  return {
    symbol: raw.symbol.toUpperCase(),
    exchange,
    name: raw.name ?? raw.symbol,
    sector: raw.sector ?? 'Unknown',
    industry: raw.industry ?? 'Unknown',
    asOf: raw.asOf ?? null,
  };
}

function normalizeExchange(exchange?: string): CompanyIdentityMapped['exchange'] {
  if (!exchange) return 'NSE_EQ';

  const e = exchange.toUpperCase().trim();
  if (e === 'BSE' || e === 'BOM' || e === 'BSE_EQ') return 'BSE_EQ';
  if (e === 'NSE' || e === 'NSE_EQ') return 'NSE_EQ';
  if (e === 'NSI') return 'NSE_EQ';

  // Default: assume NSE if unknown
  return 'NSE_EQ';
}
