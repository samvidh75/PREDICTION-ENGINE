import { query } from "../src/db";

const apply = process.argv.includes("--apply");
const dryRun = process.argv.includes("--dry-run") || !apply;

const invalidWhere = `open <= 0 OR high <= 0 OR low <= 0 OR close <= 0 OR high < low OR open < low OR open > high OR close < low OR close > high OR volume < 0 OR volume IS NULL`;

function reason(row: Record<string, unknown>): string {
  const reasons: string[] = [];
  const open = Number(row.open), high = Number(row.high), low = Number(row.low), close = Number(row.close);
  const volume = row.volume == null ? null : Number(row.volume);
  if (open <= 0) reasons.push("open <= 0");
  if (high <= 0) reasons.push("high <= 0");
  if (low <= 0) reasons.push("low <= 0");
  if (close <= 0) reasons.push("close <= 0");
  if (high < low) reasons.push("high < low");
  if (open < low) reasons.push("open < low");
  if (open > high) reasons.push("open > high");
  if (close < low) reasons.push("close < low");
  if (close > high) reasons.push("close > high");
  if (volume == null) reasons.push("volume missing");
  if (volume != null && volume < 0) reasons.push("volume negative");
  return reasons.join("; ");
}

const rows = (await query(`SELECT symbol, trade_date, open, high, low, close, volume FROM daily_prices WHERE ${invalidWhere} ORDER BY symbol, trade_date`)).rows;
const bySymbol = new Map<string, number>();
const byReason = new Map<string, number>();
for (const row of rows) {
  const r = reason(row);
  bySymbol.set(String(row.symbol), (bySymbol.get(String(row.symbol)) ?? 0) + 1);
  byReason.set(r, (byReason.get(r) ?? 0) + 1);
}

console.log(JSON.stringify({
  mode: dryRun ? "dry-run" : "apply",
  invalidRows: rows.length,
  bySymbol: Object.fromEntries(bySymbol),
  byReason: Object.fromEntries(byReason),
  examples: rows.slice(0, 20),
}, null, 2));

if (apply && rows.length > 0) {
  for (const row of rows) {
    await query(
      `INSERT INTO rejected_market_records (provider, symbol, trading_date, raw_payload, rejection_reason, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      ["existing-database-repair", row.symbol, row.trade_date, JSON.stringify(row), reason(row), new Date().toISOString()],
    );
  }
  await query(`DELETE FROM daily_prices WHERE ${invalidWhere}`);
  console.log(`quarantined and removed ${rows.length} invalid daily_prices rows`);
}

