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
