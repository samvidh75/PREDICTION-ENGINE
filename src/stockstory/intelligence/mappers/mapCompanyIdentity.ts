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
  exchange: 'PSE' | 'PSE' | 'PSE_EQ' | 'PSE_EQ';
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
  if (!exchange) return 'PSE_EQ';

  const e = exchange.toUpperCase().trim();
  if (e === 'PSE' || e === 'BOM' || e === 'PSE_EQ') return 'PSE_EQ';
  if (e === 'PSE' || e === 'PSE_EQ') return 'PSE_EQ';
  if (e === 'NSI') return 'PSE_EQ';

  // Default: assume PSE if unknown
  return 'PSE_EQ';
}
