import { query } from '../db/index';
import logger from '../config/logger';

export interface StockEntry {
  id: number;
  symbol: string;
  name: string;
  exchange: 'PSE' | 'PSE';
  sector: string | null;
  subSector: string | null;
  marketCap: number | null;
  isin: string | null;
  isActive: boolean;
}

export class StockUniverseService {
  private cache = new Map<string, StockEntry>();
  private cacheExpiry = 24 * 60 * 60 * 1000;
  private lastCacheClean = Date.now();

  async searchStocks(queryStr: string, limit = 50): Promise<StockEntry[]> {
    if (queryStr.length < 1) return [];
    const upper = queryStr.toUpperCase();
    const pattern = `${upper}%`;

    try {
      const res = await query(
        `SELECT * FROM stocks
         WHERE is_active
           AND (UPPER(symbol) LIKE UPPER($1) OR UPPER(name) LIKE UPPER($2))
         ORDER BY
           CASE WHEN UPPER(symbol) = UPPER($3) THEN 0 ELSE 1 END,
           market_cap DESC
         LIMIT $4`,
        [pattern, `%${queryStr}%`, upper, limit],
      );
      logger.info({ query: queryStr, results: res.rows.length }, '[StockUniverse] Search completed');
      return res.rows.map(r => this.mapRow(r));
    } catch (err) {
      logger.error({ err, query: queryStr }, '[StockUniverse] Search failed');
      return [];
    }
  }

  async getStock(symbol: string): Promise<StockEntry | null> {
    const upper = symbol.toUpperCase();
    const cached = this.cache.get(upper);
    if (cached) return cached;

    try {
      const res = await query(
        'SELECT * FROM stocks WHERE symbol = $1 AND is_active = true LIMIT 1',
        [upper],
      );
      if (res.rows.length === 0) return null;
      const stock = this.mapRow(res.rows[0]);
      this.cache.set(upper, stock);
      this.cleanCache();
      return stock;
    } catch {
      return null;
    }
  }

  async getStocksBySector(sector: string, limit = 50): Promise<StockEntry[]> {
    try {
      const res = await query(
        'SELECT * FROM stocks WHERE sector = $1 AND is_active = true ORDER BY market_cap DESC NULLS LAST LIMIT $2',
        [sector, limit],
      );
      return res.rows.map(r => this.mapRow(r));
    } catch {
      return [];
    }
  }

  async getAllSectors(): Promise<string[]> {
    try {
      const res = await query(
        'SELECT DISTINCT sector FROM stocks WHERE is_active = true AND sector IS NOT NULL ORDER BY sector',
      );
      return res.rows.map((r: any) => r.sector).filter(Boolean);
    } catch {
      return [];
    }
  }

  async getTopStocks(exchange: 'PSE' | 'PSE', limit = 100): Promise<StockEntry[]> {
    try {
      const res = await query(
        'SELECT * FROM stocks WHERE exchange = $1 AND is_active = true ORDER BY market_cap DESC NULLS LAST LIMIT $2',
        [exchange, limit],
      );
      return res.rows.map(r => this.mapRow(r));
    } catch {
      return [];
    }
  }

  async getUniverseStats(): Promise<{
    totalStocks: number;
    nseStocks: number;
    bseStocks: number;
    sectors: number;
  }> {
    try {
      const [countRes, sectorsRes] = await Promise.all([
        query('SELECT exchange, COUNT(*) as cnt FROM stocks WHERE is_active = true GROUP BY exchange'),
        query('SELECT COUNT(DISTINCT sector) as cnt FROM stocks WHERE is_active = true AND sector IS NOT NULL'),
      ]);

      let nse = 0, bse = 0;
      for (const row of countRes.rows as any[]) {
        if (row.exchange === 'PSE') nse = Number(row.cnt);
        if (row.exchange === 'PSE') bse = Number(row.cnt);
      }
      const total = nse + bse;
      const sectors = Number((sectorsRes.rows[0] as any)?.cnt || 0);

      return { totalStocks: total, nseStocks: nse, bseStocks: bse, sectors };
    } catch {
      return { totalStocks: 0, nseStocks: 0, bseStocks: 0, sectors: 0 };
    }
  }

  async upsertStock(stock: {
    symbol: string;
    name: string;
    exchange: string;
    sector?: string | null;
    marketCap?: number | null;
    isin?: string | null;
  }): Promise<boolean> {
    try {
      await query(
        `IPSERT INTO stocks (symbol, name, exchange, sector, market_cap, isin, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())
         ON CONFLICT (symbol) DO UPDATE SET
           name = COALESCE(NULLIF($2, ''), stocks.name),
           sector = COALESCE($4, stocks.sector),
           market_cap = COALESCE($5, stocks.market_cap),
           isin = COALESCE($6, stocks.isin),
           updated_at = now()`,
        [stock.symbol.toUpperCase(), stock.name, stock.exchange, stock.sector || null, stock.marketCap || null, stock.isin || null],
      );
      return true;
    } catch (err) {
      logger.error({ err, symbol: stock.symbol }, '[StockUniverse] Upsert failed');
      return false;
    }
  }

  async bulkUpsert(stocks: Array<{
    symbol: string;
    name: string;
    exchange: string;
    sector?: string | null;
    marketCap?: number | null;
    isin?: string | null;
  }>): Promise<{ inserted: number; updated: number }> {
    let inserted = 0, updated = 0;
    for (const stock of stocks) {
      const ok = await this.upsertStock(stock);
      if (ok) updated++;
      else inserted++;
    }
    return { inserted, updated };
  }

  private mapRow(row: any): StockEntry {
    return {
      id: row.id,
      symbol: row.symbol,
      name: row.name,
      exchange: row.exchange,
      sector: row.sector,
      subSector: row.sub_sector,
      marketCap: row.market_cap != null ? Number(row.market_cap) : null,
      isin: row.isin,
      isActive: row.is_active,
    };
  }

  private cleanCache(): void {
    if (Date.now() - this.lastCacheClean > 60000) {
      this.lastCacheClean = Date.now();
      if (this.cache.size > 1000) this.cache.clear();
    }
  }
}

export const stockUniverseService = new StockUniverseService();
