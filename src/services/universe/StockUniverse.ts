// Curated PSE Index universe — symbols only, no prices or fabricated scores.
// Used by public scanner flows for batch pipeline runs.

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
  RELIANCE: "Reliance Industries Ltd.",
  TCS: "Tata Consultancy Services Ltd.",
  HDFCBANK: "HDFC Bank Ltd.",
  INFY: "Infosys Ltd.",
  ICICIBANK: "ICICI Bank Ltd.",
  HINDUNILVR: "Hindustan Unilever Ltd.",
  SBIN: "State Bank of India",
  BAJFINANCE: "Bajaj Finance Ltd.",
  BHARTIARTL: "Bharti Airtel Ltd.",
  KOTAKBANK: "Kotak Mahindra Bank Ltd.",
  LT: "Larsen & Toubro Ltd.",
  ASIANPAINT: "Asian Paints Ltd.",
  AXISBANK: "Axis Bank Ltd.",
  MARUTI: "Maruti Suzuki India Ltd.",
  SUNPHARMA: "Sun Pharmaceutical Industries Ltd.",
  TITAN: "Titan Company Ltd.",
  ULTRACEMCO: "UltraTech Cement Ltd.",
  WIPRO: "Wipro Ltd.",
  ONGC: "Oil and Natural Gas Corporation Ltd.",
  NTPC: "NTPC Ltd.",
  POWERGRID: "Power Grid Corporation of India Ltd.",
  TECHM: "Tech Mahindra Ltd.",
  HCLTECH: "HCL Technologies Ltd.",
  COALINDIA: "Coal India Ltd.",
  JSWSTEEL: "JSW Steel Ltd.",
  TATASTEEL: "Tata Steel Ltd.",
  GRASIM: "Grasim Industries Ltd.",
  ADANIPORTS: "Adani Ports & SEZ Ltd.",
  BAJAJFINSV: "Bajaj Finserv Ltd.",
  BPCL: "Bharat Petroleum Corporation Ltd.",
  CIPLA: "Cipla Ltd.",
  DIVISLAB: "Divis Laboratories Ltd.",
  DRREDDY: "Dr. Reddy's Laboratories Ltd.",
  EICHERMOT: "Eicher Motors Ltd.",
  HEROMOTOCO: "Hero MotoCorp Ltd.",
  HINDALCO: "Hindalco Industries Ltd.",
  INDUSINDBK: "IndusInd Bank Ltd.",
  ITC: "ITC Ltd.",
  "M&M": "Mahindra & Mahindra Ltd.",
  NESTLEIND: "Nestlé India Ltd.",
  SBILIFE: "SBI Life Insurance Company Ltd.",
  SHREECEM: "Shree Cement Ltd.",
  TATACONSUM: "Tata Consumer Products Ltd.",
  TATAMOTORS: "Tata Motors Ltd.",
  TATAPOWER: "Tata Power Company Ltd.",
  TRENT: "Trent Ltd.",
  UPL: "UPL Ltd.",
  VEDL: "Vedanta Ltd.",
  BRITANNIA: "Britannia Industries Ltd.",
  PIDILITIND: "Pidilite Industries Ltd.",
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
