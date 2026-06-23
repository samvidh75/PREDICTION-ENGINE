import { query } from "../../../db/index";
import type { StockPageSnapshot, SnapshotFreshnessState } from "../../../shared/research/StockPageSnapshotTypes";

export async function getSnapshotFromDb(symbol: string): Promise<StockPageSnapshot | null> {
  const res = await query(
    `SELECT symbol, snapshot_json, freshness_state
     FROM stock_page_snapshots
     WHERE UPPER(REPLACE(symbol, ' ', '')) = $1`,
    [symbol.toUpperCase().trim()],
  );
  const row = res.rows?.[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const json = row["snapshot_json"];
  if (!json) return null;
  const parsed = typeof json === "string" ? JSON.parse(json) : json;
  return parsed as StockPageSnapshot;
}

export async function upsertSnapshot(symbol: string, snapshot: StockPageSnapshot): Promise<void> {
  const clean = symbol.toUpperCase().trim();
  await query(
    `INSERT INTO stock_page_snapshots (symbol, snapshot_json, freshness_state, updated_at, quote_updated_at, healthometer_updated_at, financials_updated_at, news_updated_at)
     VALUES ($1, $2::jsonb, $3, NOW(), $4, $5, $6, $7)
     ON CONFLICT (symbol) DO UPDATE SET
       snapshot_json = EXCLUDED.snapshot_json,
       freshness_state = EXCLUDED.freshness_state,
       updated_at = NOW(),
       quote_updated_at = EXCLUDED.quote_updated_at,
       healthometer_updated_at = EXCLUDED.healthometer_updated_at,
       financials_updated_at = EXCLUDED.financials_updated_at,
       news_updated_at = EXCLUDED.news_updated_at`,
    [
      clean,
      JSON.stringify(snapshot),
      snapshot.freshnessState,
      snapshot.quote?.updatedAt ?? null,
      snapshot.healthometer?.overallScore !== null ? new Date().toISOString() : null,
      snapshot.financialSeries?.length > 0 ? new Date().toISOString() : null,
      snapshot.news?.length > 0 ? new Date().toISOString() : null,
    ],
  );
}

export async function deleteSnapshot(symbol: string): Promise<void> {
  await query(
    `DELETE FROM stock_page_snapshots WHERE UPPER(REPLACE(symbol, ' ', '')) = $1`,
    [symbol.toUpperCase().trim()],
  );
}

export async function listSnapshotSymbols(limit = 200): Promise<string[]> {
  const res = await query(
    `SELECT symbol FROM stock_page_snapshots ORDER BY updated_at DESC LIMIT $1`,
    [limit],
  );
  return (res.rows || []).map((r: Record<string, unknown>) => String(r["symbol"]));
}

export async function snapshotCount(): Promise<number> {
  const res = await query(`SELECT COUNT(*) as cnt FROM stock_page_snapshots`);
  return Number((res.rows?.[0] as Record<string, unknown> | undefined)?.["cnt"] ?? 0);
}
