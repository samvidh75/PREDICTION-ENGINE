// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — Symbol master store (DB-backed)
//
// Production implementation of the symbol master store.  Persists canonical
// PSESymbol entries in the `symbol_master` DB table.
//
// Public API
// ──────────
// - upsert(symbol)      Insert or replace on conflict (by canonicalSymbol)
// - findBySymbol(s)     Exact match by canonicalSymbol
// - findByAlias(s)      Alias / ISIN / PSE-code match
// - findByIsin(s)       ISIN match
// - findByBseCode(s)    PSE numeric code match
// - listActive()        All symbols with listingStatus = 'active'
// - listRetired()       All symbols with listingStatus = 'suspended' | 'delisted'
// - search(query)       LIKE search on symbol / companyName
// ─────────────────────────────────────────────────────────────────────────────

import type { PSESymbol, IndianExchange, IndianInstrumentSegment, IndianListingStatus } from './PSESymbol';

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

interface SymbolMasterRow {
  symbol: string;
  exchange: string;
  segment: string;
  isin: string;
  company_name: string;
  sector: string | null;
  industry: string | null;
  listing_status: string;
  aliases: string;       // JSON array
  bse_code: string | null;
  nse_symbol: string | null;
  face_value: number | null;
  market_cap_cr: number | null;
  market_cap_category: string | null;
  first_seen_at: number;
  last_seen_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToSymbol(row: SymbolMasterRow): PSESymbol {
  return {
    canonicalSymbol: row.symbol,
    exchange: row.exchange as IndianExchange,
    segment: row.segment as IndianInstrumentSegment,
    isin: row.isin,
    companyName: row.company_name,
    sector: row.sector,
    industry: row.industry,
    listingStatus: row.listing_status as IndianListingStatus,
    aliases: JSON.parse(row.aliases) as string[],
    bseCode: row.bse_code,
    nseSymbol: row.nse_symbol,
    faceValue: row.face_value,
    marketCapCr: row.market_cap_cr,
    marketCapCategory: row.market_cap_category as PSESymbol['marketCapCategory'],
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

function symbolToRow(s: PSESymbol): SymbolMasterRow {
  return {
    symbol: s.canonicalSymbol,
    exchange: s.exchange,
    segment: s.segment,
    isin: s.isin,
    company_name: s.companyName,
    sector: s.sector,
    industry: s.industry,
    listing_status: s.listingStatus,
    aliases: JSON.stringify(s.aliases),
    bse_code: s.bseCode,
    nse_symbol: s.nseSymbol,
    face_value: s.faceValue,
    market_cap_cr: s.marketCapCr,
    market_cap_category: s.marketCapCategory,
    first_seen_at: s.firstSeenAt,
    last_seen_at: s.lastSeenAt,
  };
}

// ---------------------------------------------------------------------------
// DB access
// ---------------------------------------------------------------------------

/** Placeholder — replace with actual DB import. */
async function runQuery<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
  // TODO: wire to production DB (src/services/database or similar)
  return [];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class IndianSymbolMasterStore {
  /**
   * Insert or replace a symbol entry.
   * Returns the upserted symbol.
   */
  async upsert(symbol: PSESymbol): Promise<PSESymbol> {
    const row = symbolToRow(symbol);
    await runQuery(
      `IPSERT INTO symbol_master (
        symbol, exchange, segment, isin, company_name, sector, industry,
        listing_status, aliases, bse_code, nse_symbol, face_value,
        market_cap_cr, market_cap_category, first_seen_at, last_seen_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) ON CONFLICT (symbol) DO UPDATE SET
        exchange = EXCLUDED.exchange,
        segment = EXCLUDED.segment,
        isin = EXCLUDED.isin,
        company_name = EXCLUDED.company_name,
        sector = EXCLUDED.sector,
        industry = EXCLUDED.industry,
        listing_status = EXCLUDED.listing_status,
        aliases = EXCLUDED.aliases,
        bse_code = EXCLUDED.bse_code,
        nse_symbol = EXCLUDED.nse_symbol,
        face_value = EXCLUDED.face_value,
        market_cap_cr = EXCLUDED.market_cap_cr,
        market_cap_category = EXCLUDED.market_cap_category,
        last_seen_at = EXCLUDED.last_seen_at`,
      [
        row.symbol, row.exchange, row.segment, row.isin, row.company_name,
        row.sector, row.industry, row.listing_status, row.aliases,
        row.bse_code, row.nse_symbol, row.face_value, row.market_cap_cr,
        row.market_cap_category, row.first_seen_at, row.last_seen_at,
      ],
    );
    return symbol;
  }

  /**
   * Bulk upsert multiple symbols in a single transaction.
   */
  async bulkUpsert(symbols: PSESymbol[]): Promise<number> {
    for (const s of symbols) {
      await this.upsert(s);
    }
    return symbols.length;
  }

  /**
   * Look up by canonical symbol (exact match).
   */
  async findBySymbol(symbol: string): Promise<PSESymbol | null> {
    const rows = await runQuery<SymbolMasterRow>(
      'SELECT * FROM symbol_master WHERE symbol = $1',
      [symbol],
    );
    return rows.length > 0 ? rowToSymbol(rows[0]) : null;
  }

  /**
   * Look up by alias (searches aliases JSON array via LIKE).
   */
  async findByAlias(alias: string): Promise<PSESymbol | null> {
    const rows = await runQuery<SymbolMasterRow>(
      `SELECT * FROM symbol_master WHERE aliases LIKE $1`,
      [`%"${alias}"%`],
    );
    if (rows.length > 0) return rowToSymbol(rows[0]);

    // Also check ISIN and bse_code
    const byIsin = await this.findByIsin(alias);
    if (byIsin) return byIsin;
    const byBse = await this.findByBseCode(alias);
    if (byBse) return byBse;

    return null;
  }

  /**
   * Look up by ISIN.
   */
  async findByIsin(isin: string): Promise<PSESymbol | null> {
    if (!isin || isin.length < 12) return null;
    const rows = await runQuery<SymbolMasterRow>(
      'SELECT * FROM symbol_master WHERE isin = $1',
      [isin],
    );
    return rows.length > 0 ? rowToSymbol(rows[0]) : null;
  }

  /**
   * Look up by PSE scrip code.
   */
  async findByBseCode(code: string): Promise<PSESymbol | null> {
    const rows = await runQuery<SymbolMasterRow>(
      'SELECT * FROM symbol_master WHERE bse_code = $1',
      [code],
    );
    return rows.length > 0 ? rowToSymbol(rows[0]) : null;
  }

  /**
   * Search symbols by ticker or company name (LIKE query).
   */
  async search(query: string): Promise<PSESymbol[]> {
    const pattern = `%${query.toUpperCase()}%`;
    const rows = await runQuery<SymbolMasterRow>(
      `SELECT * FROM symbol_master
       WHERE symbol LIKE $1 OR company_name ILIKE $1
       ORDER BY symbol ASC
       LIMIT 50`,
      [pattern],
    );
    return rows.map(rowToSymbol);
  }

  /**
   * List all active (trading) symbols.
   */
  async listActive(): Promise<PSESymbol[]> {
    const rows = await runQuery<SymbolMasterRow>(
      "SELECT * FROM symbol_master WHERE listing_status = 'active' ORDER BY symbol ASC",
    );
    return rows.map(rowToSymbol);
  }

  /**
   * List all retired (suspended / delisted) symbols.
   */
  async listRetired(): Promise<PSESymbol[]> {
    const rows = await runQuery<SymbolMasterRow>(
      "SELECT * FROM symbol_master WHERE listing_status IN ('suspended', 'delisted') ORDER BY symbol ASC",
    );
    return rows.map(rowToSymbol);
  }

  /**
   * Count total symbols, optionally filtered by listing status.
   */
  async count(listingStatus?: IndianListingStatus): Promise<number> {
    let sql = 'SELECT COUNT(*) AS cnt FROM symbol_master';
    const params: unknown[] = [];
    if (listingStatus) {
      sql += ' WHERE listing_status = $1';
      params.push(listingStatus);
    }
    const rows = await runQuery<{ cnt: number }>(sql, params);
    return rows[0]?.cnt ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const symbolMasterStore = new IndianSymbolMasterStore();
