// Curated Nifty 50 universe — symbols only, no prices or fabricated scores.
// Used by PublicRankingsPage scanner for batch pipeline runs.

export const NIFTY50_SYMBOLS: string[] = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
  'SBIN', 'BAJFINANCE', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'ASIANPAINT',
  'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TITAN', 'ULTRACEMCO', 'WIPRO',
  'ONGC', 'NTPC', 'POWERGRID', 'TECHM', 'HCLTECH', 'COALINDIA',
  'JSWSTEEL', 'TATASTEEL', 'GRASIM', 'ADANIPORTS', 'BAJAJFINSV',
  'BPCL', 'CIPLA', 'DIVISLAB', 'DRREDDY', 'EICHERMOT', 'HEROMOTOCO',
  'HINDALCO', 'INDUSINDBK', 'ITC', 'M&M', 'NESTLEIND', 'SBILIFE',
  'SHREECEM', 'TATACONSUM', 'TATAMOTORS', 'TATAPOWER', 'TRENT',
  'UPL', 'VEDL', 'BRITANNIA', 'PIDILITIND',
];

/** Symbol display names (API symbol → human-readable name) */
export const SYMBOL_DISPLAY_MAP: Record<string, string> = {
  'LT': 'L&T',
  'MM': 'M&M',
  'LTIM': 'LTIMindtree',
};

/** Symbol API aliases (display symbol → API-safe symbol) */
export const SYMBOL_API_MAP: Record<string, string> = {
  'LT': 'LT',
  'MM': 'MM',
  'M&M': 'MM',
  'L&T': 'LT',
};

export const NIFTY50_FIRST_BATCH = NIFTY50_SYMBOLS.slice(0, 10);

/** Return the first N symbols from the universe. */
export function getUniverseSlice(count: number): string[] {
  return NIFTY50_SYMBOLS.slice(0, count);
}

/** Return symbols in batches of the given size. */
export function* getUniverseBatches(batchSize: number): Generator<string[]> {
  for (let i = 0; i < NIFTY50_SYMBOLS.length; i += batchSize) {
    yield NIFTY50_SYMBOLS.slice(i, i + batchSize);
  }
}
