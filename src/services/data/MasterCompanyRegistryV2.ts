/**
 * MasterCompanyRegistryV2 — Production-grade security master mapping.
 * Connects to PostgreSQL to resolve high-fidelity symbols, names, sectors, market caps, and ISINs.
 */

import pool from '../../db';
import { CompanyMetadata } from './types';
import { SymbolNormalizationEngine } from './SymbolNormalizationEngine';

export class MasterCompanyRegistryV2 {
  private static instance: MasterCompanyRegistryV2;

  private constructor() {}

  static getInstance(): MasterCompanyRegistryV2 {
    if (!MasterCompanyRegistryV2.instance) {
      MasterCompanyRegistryV2.instance = new MasterCompanyRegistryV2();
    }
    return MasterCompanyRegistryV2.instance;
  }

  /**
   * Resolves a symbol, code, or ISIN to its canonical CompanyMetadata profile.
   */
  async resolve(identifier: string): Promise<CompanyMetadata | null> {
    const cleanId = await SymbolNormalizationEngine.normalize(identifier);
    if (!cleanId) return null;

    try {
      // 1. Query the primary verified master database
      const res = await pool.query(
        `SELECT symbol, company_name as "companyName", sector, industry, exchange, isin
         FROM symbols
         WHERE symbol = $1 OR isin = $2`,
        [cleanId, cleanId]
      );

      if (res.rows.length === 0) {
        return null;
      }

      const row = res.rows[0];

      // 2. Fetch market cap from financial_snapshots if available
      let marketCap: number | undefined = undefined;
      const finRes = await pool.query(
        `SELECT market_cap as "marketCap"
         FROM financial_snapshots
         WHERE symbol = $1
         ORDER BY period_end DESC
         LIMIT 1`,
        [row.symbol]
      );

      if (finRes.rows.length > 0 && finRes.rows[0].marketCap) {
        marketCap = parseFloat(finRes.rows[0].marketCap);
      }

      return {
        symbol: row.symbol,
        companyName: row.companyName,
        sector: row.sector,
        industry: row.industry,
        exchange: row.exchange,
        marketCap,
        currency: 'PKR',
        isin: row.isin,
        bseCode: null, // Resolves as part of lookup mapping V2
        nseSymbol: row.symbol,
      };
    } catch (err) {
      console.error(`Error resolving metadata for ${identifier} in V2 master:`, err);
      return null;
    }
  }

  /**
   * Get all registered symbols in the universe.
   */
  async getAllSymbols(): Promise<string[]> {
    try {
      const res = await pool.query('SELECT symbol FROM symbols ORDER BY symbol ASC');
      return res.rows.map((r: Record<string, any>) => r.symbol as string);
    } catch {
      return [];
    }
  }
}
