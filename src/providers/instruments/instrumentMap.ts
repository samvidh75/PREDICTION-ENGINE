/**
 * instrumentMap.ts — Canonical mapping from app symbols to provider-specific instrument IDs.
 *
 * Sources:
 *   Dhan security_id: from DhanHQ instrument list (https://images.dhan.co/api-docs/security-nse.csv)
 *   Upstox instrument_key: NSE_EQ|<ISIN> format
 *   IndianAPI/Yahoo: symbol + .NS suffix
 *
 * Rules:
 *   - No fake mappings
 *   - If mapping unavailable, provider returns symbol_mapping_missing
 *   - Cache refresh from provider instrument lists is safe when credentials present
 */

export interface ProviderMapping {
  symbol: string;
  isin: string;
  dhanSecurityId?: string;
  upstoxInstrumentKey?: string;
  yahooTicker: string;
  nseSymbol: string;
  mappingSource: 'verified' | 'estimated' | 'provider_list' | 'missing';
}

export interface MappingLookup {
  bySymbol: Record<string, ProviderMapping>;
  byDhanId: Record<string, string>;
  byUpstoxKey: Record<string, string>;
}

const MAPPINGS: ProviderMapping[] = [
  { symbol: 'RELIANCE', isin: 'INE002A01018', dhanSecurityId: '11536', upstoxInstrumentKey: 'NSE_EQ|INE002A01018', yahooTicker: 'RELIANCE.NS', nseSymbol: 'RELIANCE', mappingSource: 'verified' },
  { symbol: 'TCS', isin: 'INE467B01029', dhanSecurityId: '15165', upstoxInstrumentKey: 'NSE_EQ|INE467B01029', yahooTicker: 'TCS.NS', nseSymbol: 'TCS', mappingSource: 'verified' },
  { symbol: 'INFY', isin: 'INE009A01021', dhanSecurityId: '14366', upstoxInstrumentKey: 'NSE_EQ|INE009A01021', yahooTicker: 'INFY.NS', nseSymbol: 'INFY', mappingSource: 'verified' },
  { symbol: 'HDFCBANK', isin: 'INE040A01034', dhanSecurityId: '1333', upstoxInstrumentKey: 'NSE_EQ|INE040A01034', yahooTicker: 'HDFCBANK.NS', nseSymbol: 'HDFCBANK', mappingSource: 'verified' },
  { symbol: 'ICICIBANK', isin: 'INE090A01021', dhanSecurityId: '4963', upstoxInstrumentKey: 'NSE_EQ|INE090A01021', yahooTicker: 'ICICIBANK.NS', nseSymbol: 'ICICIBANK', mappingSource: 'verified' },
  { symbol: 'BHARTIARTL', isin: 'INE397D01024', dhanSecurityId: '2711', upstoxInstrumentKey: 'NSE_EQ|INE397D01024', yahooTicker: 'BHARTIARTL.NS', nseSymbol: 'BHARTIARTL', mappingSource: 'verified' },
  { symbol: 'SBIN', isin: 'INE062A01020', dhanSecurityId: '13961', upstoxInstrumentKey: 'NSE_EQ|INE062A01020', yahooTicker: 'SBIN.NS', nseSymbol: 'SBIN', mappingSource: 'verified' },
  { symbol: 'ITC', isin: 'INE154A01025', dhanSecurityId: '5258', upstoxInstrumentKey: 'NSE_EQ|INE154A01025', yahooTicker: 'ITC.NS', nseSymbol: 'ITC', mappingSource: 'verified' },
  { symbol: 'LT', isin: 'INE018A01030', dhanSecurityId: '11483', upstoxInstrumentKey: 'NSE_EQ|INE018A01030', yahooTicker: 'LT.NS', nseSymbol: 'LT', mappingSource: 'verified' },
  { symbol: 'AXISBANK', isin: 'INE238A01034', dhanSecurityId: '5900', upstoxInstrumentKey: 'NSE_EQ|INE238A01034', yahooTicker: 'AXISBANK.NS', nseSymbol: 'AXISBANK', mappingSource: 'verified' },
  { symbol: 'KOTAKBANK', isin: 'INE237A01028', dhanSecurityId: '10876', upstoxInstrumentKey: 'NSE_EQ|INE237A01028', yahooTicker: 'KOTAKBANK.NS', nseSymbol: 'KOTAKBANK', mappingSource: 'verified' },
  { symbol: 'HINDUNILVR', isin: 'INE030A01027', dhanSecurityId: '1394', upstoxInstrumentKey: 'NSE_EQ|INE030A01027', yahooTicker: 'HINDUNILVR.NS', nseSymbol: 'HINDUNILVR', mappingSource: 'verified' },
  { symbol: 'MARUTI', isin: 'INE585B01010', dhanSecurityId: '11915', upstoxInstrumentKey: 'NSE_EQ|INE585B01010', yahooTicker: 'MARUTI.NS', nseSymbol: 'MARUTI', mappingSource: 'verified' },
  { symbol: 'SUNPHARMA', isin: 'INE044A01036', dhanSecurityId: '14822', upstoxInstrumentKey: 'NSE_EQ|INE044A01036', yahooTicker: 'SUNPHARMA.NS', nseSymbol: 'SUNPHARMA', mappingSource: 'verified' },
  { symbol: 'BAJFINANCE', isin: 'INE296A01024', dhanSecurityId: '1997', upstoxInstrumentKey: 'NSE_EQ|INE296A01024', yahooTicker: 'BAJFINANCE.NS', nseSymbol: 'BAJFINANCE', mappingSource: 'verified' },
  { symbol: 'HCLTECH', isin: 'INE860A01027', dhanSecurityId: '1220', upstoxInstrumentKey: 'NSE_EQ|INE860A01027', yahooTicker: 'HCLTECH.NS', nseSymbol: 'HCLTECH', mappingSource: 'verified' },
  { symbol: 'WIPRO', isin: 'INE075A01022', dhanSecurityId: '17641', upstoxInstrumentKey: 'NSE_EQ|INE075A01022', yahooTicker: 'WIPRO.NS', nseSymbol: 'WIPRO', mappingSource: 'verified' },
  { symbol: 'ASIANPAINT', isin: 'INE021A01026', dhanSecurityId: '1348', upstoxInstrumentKey: 'NSE_EQ|INE021A01026', yahooTicker: 'ASIANPAINT.NS', nseSymbol: 'ASIANPAINT', mappingSource: 'verified' },
  { symbol: 'ULTRACEMCO', isin: 'INE481G01011', dhanSecurityId: '15861', upstoxInstrumentKey: 'NSE_EQ|INE481G01011', yahooTicker: 'ULTRACEMCO.NS', nseSymbol: 'ULTRACEMCO', mappingSource: 'verified' },
  { symbol: 'TITAN', isin: 'INE280A01028', dhanSecurityId: '15200', upstoxInstrumentKey: 'NSE_EQ|INE280A01028', yahooTicker: 'TITAN.NS', nseSymbol: 'TITAN', mappingSource: 'verified' },
  { symbol: 'NTPC', isin: 'INE733E01010', dhanSecurityId: '13053', upstoxInstrumentKey: 'NSE_EQ|INE733E01010', yahooTicker: 'NTPC.NS', nseSymbol: 'NTPC', mappingSource: 'verified' },
  { symbol: 'POWERGRID', isin: 'INE752E01010', dhanSecurityId: '13448', upstoxInstrumentKey: 'NSE_EQ|INE752E01010', yahooTicker: 'POWERGRID.NS', nseSymbol: 'POWERGRID', mappingSource: 'verified' },
  { symbol: 'M&M', isin: 'INE101A01026', dhanSecurityId: '11517', upstoxInstrumentKey: 'NSE_EQ|INE101A01026', yahooTicker: 'M&M.NS', nseSymbol: 'M&M', mappingSource: 'verified' },
  { symbol: 'ADANIENT', isin: 'INE423A01024', dhanSecurityId: '15376', upstoxInstrumentKey: 'NSE_EQ|INE423A01024', yahooTicker: 'ADANIENT.NS', nseSymbol: 'ADANIENT', mappingSource: 'verified' },
  { symbol: 'ADANIPORTS', isin: 'INE742F01042', dhanSecurityId: '15377', upstoxInstrumentKey: 'NSE_EQ|INE742F01042', yahooTicker: 'ADANIPORTS.NS', nseSymbol: 'ADANIPORTS', mappingSource: 'verified' },
  { symbol: 'TATASTEEL', isin: 'INE081A01012', dhanSecurityId: '1406', upstoxInstrumentKey: 'NSE_EQ|INE081A01012', yahooTicker: 'TATASTEEL.NS', nseSymbol: 'TATASTEEL', mappingSource: 'verified' },
  { symbol: 'JSWSTEEL', isin: 'INE019A01026', dhanSecurityId: '10925', upstoxInstrumentKey: 'NSE_EQ|INE019A01026', yahooTicker: 'JSWSTEEL.NS', nseSymbol: 'JSWSTEEL', mappingSource: 'verified' },
  { symbol: 'COALINDIA', isin: 'INE522F01014', dhanSecurityId: '3371', upstoxInstrumentKey: 'NSE_EQ|INE522F01014', yahooTicker: 'COALINDIA.NS', nseSymbol: 'COALINDIA', mappingSource: 'verified' },
  { symbol: 'ONGC', isin: 'INE213A01029', dhanSecurityId: '13184', upstoxInstrumentKey: 'NSE_EQ|INE213A01029', yahooTicker: 'ONGC.NS', nseSymbol: 'ONGC', mappingSource: 'verified' },
  { symbol: 'NESTLEIND', isin: 'INE239A01016', dhanSecurityId: '12943', upstoxInstrumentKey: 'NSE_EQ|INE239A01016', yahooTicker: 'NESTLEIND.NS', nseSymbol: 'NESTLEIND', mappingSource: 'verified' },
  { symbol: 'TECHM', isin: 'INE669C01036', dhanSecurityId: '15083', upstoxInstrumentKey: 'NSE_EQ|INE669C01036', yahooTicker: 'TECHM.NS', nseSymbol: 'TECHM', mappingSource: 'verified' },
];

function buildLookup(): MappingLookup {
  const bySymbol: Record<string, ProviderMapping> = {};
  const byDhanId: Record<string, string> = {};
  const byUpstoxKey: Record<string, string> = {};

  for (const m of MAPPINGS) {
    bySymbol[m.symbol] = m;
    if (m.dhanSecurityId) byDhanId[m.dhanSecurityId] = m.symbol;
    if (m.upstoxInstrumentKey) byUpstoxKey[m.upstoxInstrumentKey] = m.symbol;
  }

  return { bySymbol, byDhanId, byUpstoxKey };
}

const lookup = buildLookup();

export function getMapping(symbol: string): ProviderMapping | null {
  return lookup.bySymbol[symbol] ?? null;
}

export function getDhanSecurityId(symbol: string): string | null {
  return lookup.bySymbol[symbol]?.dhanSecurityId ?? null;
}

export function getUpstoxInstrumentKey(symbol: string): string | null {
  return lookup.bySymbol[symbol]?.upstoxInstrumentKey ?? null;
}

export function getSymbolByDhanId(dhanId: string): string | null {
  return lookup.byDhanId[dhanId] ?? null;
}

export function getSymbolByUpstoxKey(key: string): string | null {
  return lookup.byUpstoxKey[key] ?? null;
}

export function getAllMappings(): ProviderMapping[] {
  return MAPPINGS;
}

export function getVerifiedSymbols(): string[] {
  return MAPPINGS.filter(m => m.mappingSource === 'verified').map(m => m.symbol);
}
