/**
 * SymbolNormalizationEngine — Resolves various symbol formats (Ticker, NSE:Ticker, BSE codes, ISINs)
 * into their canonical ticker symbols.
 */

import pool from '../../db';

export class SymbolNormalizationEngine {
  private static bseCodeMap = new Map<string, string>([
    ['500325', 'RELIANCE'],
    ['532540', 'TCS'],
    ['500180', 'HDFCBANK'],
    ['500209', 'INFY'],
    ['500112', 'SBIN'],
    ['532174', 'ICICIBANK'],
    ['532454', 'BHARTIARTL'],
    ['500875', 'ITC'],
    ['500696', 'HINDUNILVR'],
    ['500247', 'KOTAKBANK'],
    ['500510', 'LT'],
    ['507685', 'WIPRO'],
    ['532215', 'AXISBANK'],
    ['524715', 'SUNPHARMA'],
    ['532500', 'MARUTI'],
    ['500114', 'TITAN'],
    ['500820', 'ASIANPAINT'],
    ['500034', 'BAJFINANCE'],
    ['532281', 'HCLTECH'],
    ['512599', 'ADANIENT'],
    ['532555', 'NTPC'],
    ['532898', 'POWERGRID'],
    ['532538', 'ULTRACEMCO'],
    ['500470', 'TATASTEEL'],
    ['500228', 'JSWSTEEL'],
    ['541154', 'HAL'],
    ['500049', 'BEL'],
    ['543257', 'IRFC'],
    ['532667', 'SUZLON'],
    ['532482', 'GRANULES'],
    ['500110', 'CHENNPETRO'],
    ['500570', 'TATAMOTORS'],
    ['500520', 'M&M'],
    ['532978', 'BAJAJFINSV'],
    ['532921', 'ADANIPORTS'],
    ['533278', 'COALINDIA'],
    ['500312', 'ONGC'],
    ['500547', 'BPCL'],
    ['500188', 'HINDZINC'],
    ['532488', 'DIVISLAB'],
    ['500124', 'DRREDDY'],
    ['500087', 'CIPLA'],
    ['500825', 'BRITANNIA'],
    ['500790', 'NESTLEIND'],
    ['505200', 'EICHERMOT'],
    ['500182', 'HEROMOTOCO'],
    ['532977', 'BAJAJ-AUTO'],
    ['532755', 'TECHM']
  ]);

  /**
   * Normalize any input identifier to its canonical NSE ticker symbol.
   */
  static async normalize(identifier: string): Promise<string | null> {
    if (!identifier) return null;
    let clean = identifier.toUpperCase().trim();

    // 1. Handle common suffix or prefix removals
    clean = clean.replace(/^(NSE|BSE):/i, '');
    clean = clean.replace(/\.(NS|BO|NSE|BSE)$/i, '');

    // 2. Direct lookup in static BSE code map
    if (this.bseCodeMap.has(clean)) {
      return this.bseCodeMap.get(clean)!;
    }

    // 3. Query DB to resolve by Ticker, ISIN, or description
    try {
      const res = await pool.query(
        `SELECT symbol FROM symbols WHERE symbol = $1 OR isin = $2 LIMIT 1`,
        [clean, clean]
      );
      if (res.rows.length > 0) {
        return res.rows[0].symbol;
      }
    } catch {
      // fallback
    }

    return clean;
  }
}
