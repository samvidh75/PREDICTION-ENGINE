// src/services/universe/MasterSymbolUniverse.ts
import { query, type DbQueryResult } from "../../db";

export interface SymbolRecord {
  id: number;
  symbol: string;
  exchange: string;
  isin: string | null;
  company_name: string;
  sector: string | null;
  industry: string | null;
  listing_status: string;
  created_at: string;
  updated_at: string;
}

function toSymbolRecord(row: Record<string, unknown>): SymbolRecord {
  return {
    id: Number(row.id) ?? 0,
    symbol: String(row.symbol ?? ''),
    exchange: String(row.exchange ?? ''),
    isin: row.isin ? String(row.isin) : null,
    company_name: String(row.company_name ?? ''),
    sector: row.sector ? String(row.sector) : null,
    industry: row.industry ? String(row.industry) : null,
    listing_status: String(row.listing_status ?? ''),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

/**
 * Retrieve a symbol record by its canonical symbol (e.g., "RELIANCE.NS").
 * Returns null if not found.
 */
export const getSymbol = async (symbol: string): Promise<SymbolRecord | null> => {
  const res = await query(
    `SELECT * FROM symbols WHERE symbol = $1 LIMIT 1`,
    [symbol]
  );
  return res.rowCount && res.rows.length > 0 ? toSymbolRecord(res.rows[0]) : null;
};

/**
 * List all active symbols.
 */
export const listActiveSymbols = async (): Promise<SymbolRecord[]> => {
  const res = await query(
    `SELECT * FROM symbols WHERE listing_status = 'ACTIVE' ORDER BY symbol`
  );
  return res.rows.map(toSymbolRecord);
};
