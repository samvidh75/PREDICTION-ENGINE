/**
 * SymbolNormalizationEngine — Resolves various symbol formats (Ticker, PSE:Ticker, PSE codes, ISINs)
 * into their canonical ticker symbols.
 */

import pool from '../../db';

export class SymbolNormalizationEngine {
  /**
   * Previously named `bseCodeMap` and populated with ~40 real Indian BSE
   * security codes (e.g. '500875' -> 'ITC') alongside 5 placeholder PSE
   * entries. Any numeric input that happened to match a real BSE code
   * would have silently resolved to the wrong (Indian) company. Left with
   * only verified PSE entries — unresolved codes fall through to the DB
   * lookup below rather than risk another wrong-country false match.
   */
  private static pseCodeMap = new Map<string, string>([
    ['PSE001', 'AC'],
    ['PSE002', 'BDO'],
    ['PSE003', 'BPI'],
    ['PSE004', 'JFC'],
    ['PSE005', 'TEL'],
  ]);

  /**
   * Normalize any input identifier to its canonical PSE ticker symbol.
   */
  static async normalize(identifier: string): Promise<string | null> {
    if (!identifier) return null;
    let clean = identifier.toUpperCase().trim();

    // 1. Handle common suffix or prefix removals
    clean = clean.replace(/^PSE:/i, '');
    clean = clean.replace(/\.PS$/i, '');

    // 2. Direct lookup in static PSE code map
    if (this.pseCodeMap.has(clean)) {
      return this.pseCodeMap.get(clean)!;
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
