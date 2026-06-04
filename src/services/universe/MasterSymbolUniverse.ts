// src/services/universe/MasterSymbolUniverse.ts
import { query } from "../../db";

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

/**
 * Retrieve a symbol record by its canonical symbol (e.g., "RELIANCE.NS").
 * Returns null if not found.
 */
export const getSymbol = async (symbol: string): Promise<SymbolRecord | null> => {
  const res = await query(
    `SELECT * FROM symbols WHERE symbol = $1 LIMIT 1`,
    [symbol]
  );
  return res.rowCount ? (res.rows[0] as SymbolRecord) : null;
};

/**
 * List all active symbols.
 */
export const listActiveSymbols = async (): Promise<SymbolRecord[]> => {
  const res = await query(
    `SELECT * FROM symbols WHERE listing_status = 'ACTIVE' ORDER BY symbol`
  );
  return res.rows as SymbolRecord[];
};
