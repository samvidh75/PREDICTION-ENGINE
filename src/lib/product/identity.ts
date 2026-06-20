export function normalizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/\.(NS|NSE|BO|BSE)$/i, "");
}

export function normalizeCompanyName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export interface CompanyIdentity {
  symbol: string;
  displayName: string;
  sector: string | null;
}

export function getCompanyIdentity(symbol: string, companyName?: string | null, sector?: string | null): CompanyIdentity {
  const normalizedSymbol = normalizeSymbol(symbol);
  const normalizedName = normalizeCompanyName(companyName);
  return {
    symbol: normalizedSymbol,
    displayName: normalizedName && normalizeSymbol(normalizedName) !== normalizedSymbol ? normalizedName : normalizedSymbol,
    sector: normalizeCompanyName(sector) || null,
  };
}

export const buildSingleStockIdentity = getCompanyIdentity;
