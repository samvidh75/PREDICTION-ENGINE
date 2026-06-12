import { dbAdapter } from "../src/db/DatabaseAdapter";
import { NIFTY50_SYMBOLS } from "../src/backtest/BenchmarkEngine";
import type { CompanyMetadata } from "../src/services/data/types";
import type { FinancialData } from "../src/services/providers/FinancialProvider";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const TRACKED_FIELDS = [
  "marketCap",
  "peRatio",
  "pbRatio",
  "eps",
  "roe",
  "debtToEquity",
  "revenueGrowth",
  "earningsGrowth",
  "operatingMargin",
  "netMargin",
] as const;

export type TrackedField = (typeof TRACKED_FIELDS)[number];
export type IngestionMode = "dry-run" | "apply";
export type FundamentalsProviderId = "finnhub" | "yfinance";

export interface NormalizedFundamentalSnapshot {
  symbol: string;
  fiscalPeriod: string;
  asOfDate: string;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  source: FundamentalsProviderId;
  retrievedAt: string;
  completenessScore: number;
  availableFields: string[];
  missingFields: string[];
}

export interface SymbolResult {
  symbol: string;
  status: "accepted" | "partial" | "rejected";
  snapshot: NormalizedFundamentalSnapshot | null;
  error: string | null;
  sector: string | null;
  sectorSource: "master_security_registry" | FundamentalsProviderId | "indianapi" | null;
  sectorBackfillProposed: boolean;
  industry: string | null;
}

export interface IngestionReport {
  mode: IngestionMode;
  provider: FundamentalsProviderId;
  symbolsRequested: number;
  symbolsFetched: number;
  symbolsAccepted: number;
  symbolsPartial: number;
  symbolsRejected: number;
  sectorBackfillsProposed: number;
  sectorBackfillsWritten: number;
  lineageRowsWritten: number;
  completenessRowsWritten: number;
  ingestionRunRowsWritten: number;
  runId: string | null;
  snapshots: Array<{
    symbol: string;
    completenessScore: number | null;
    availableFields: string[];
    missingFields: string[];
    sector: string | null;
    sectorSource: string | null;
    status: string;
    error: string | null;
  }>;
}

type DbLike = {
  kind: "postgres" | "sqlite" | "unavailable";
  initialize(): Promise<void>;
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
  shutdown?(): Promise<void>;
};

type ProviderLike = {
  getFinancials(symbol: string): Promise<FinancialData>;
  getMetadata(symbol: string): Promise<CompanyMetadata>;
};

type IndianMetadataProviderLike = {
  getMetadata(symbol: string): Promise<CompanyMetadata>;
};

export interface RunDeps {
  db?: DbLike;
  provider?: ProviderLike;
  indianProvider?: IndianMetadataProviderLike | null;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface CliOptions {
  provider?: string;
  symbols?: string[];
  universe?: string;
  mode: IngestionMode;
  concurrency: number;
}

function argValue(args: string[], name: string): string | undefined {
  return args.find((arg) => arg.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

export function parseArgs(args: string[]): CliOptions {
  const provider = argValue(args, "--provider");
  const symbolArg = argValue(args, "--symbols");
  const universe = argValue(args, "--universe");
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");
  const concurrencyRaw = argValue(args, "--concurrency");
  const concurrency = concurrencyRaw == null ? 3 : Number(concurrencyRaw);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) {
    throw new Error("Concurrency must be an integer between 1 and 5.");
  }
  return {
    provider,
    symbols: symbolArg == null ? undefined : normalizeSymbols(symbolArg.split(",")),
    universe,
    mode: apply && !dryRun ? "apply" : "dry-run",
    concurrency,
  };
}

export function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))];
}

export function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoDate(value: unknown, fallback: Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return fallback.toISOString().slice(0, 10);
}

function isValidIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`).getTime();
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed);
}

function freshnessDays(asOf: string, now: Date): number {
  const then = new Date(`${asOf}T00:00:00.000Z`).getTime();
  return Number.isFinite(then) ? Math.max(0, Math.floor((now.getTime() - then) / 86_400_000)) : 9999;
}

function sourceUrl(symbol: string): string {
  return `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}.NS&metric=all`;
}

function providerSourceUrl(provider: FundamentalsProviderId, symbol: string): string {
  if (provider === "finnhub") return sourceUrl(symbol);
  return `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}.NS`;
}

function toYahooSymbol(symbol: string): string {
  return /\.[A-Z]+$/i.test(symbol) ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
}

function percentOrNull(value: unknown): number | null {
  const parsed = finiteOrNull(value);
  if (parsed === null) return null;
  return Math.abs(parsed) <= 1 ? Math.round(parsed * 10_000) / 100 : parsed;
}

function debtRatioOrNull(value: unknown): number | null {
  const parsed = finiteOrNull(value);
  if (parsed === null) return null;
  return parsed > 10 ? Math.round((parsed / 100) * 10_000) / 10_000 : parsed;
}

export function normalizeFinnhubSnapshot(symbolInput: string, data: FinancialData | null | undefined, now = new Date()): NormalizedFundamentalSnapshot {
  if (!data || typeof data !== "object") throw new Error("provider response is missing or malformed");
  const symbol = String((data as Record<string, unknown>).symbol ?? symbolInput).trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
  const fiscalPeriod = isoDate((data as Record<string, unknown>).periodEnd, now);
  const asOfDate = fiscalPeriod;
  const snapshot: Omit<NormalizedFundamentalSnapshot, "completenessScore" | "availableFields" | "missingFields"> = {
    symbol,
    fiscalPeriod,
    asOfDate,
    marketCap: finiteOrNull((data as Record<string, unknown>).marketCap),
    peRatio: finiteOrNull((data as Record<string, unknown>).peRatio),
    pbRatio: finiteOrNull((data as Record<string, unknown>).pbRatio),
    eps: finiteOrNull((data as Record<string, unknown>).eps),
    roe: finiteOrNull((data as Record<string, unknown>).roe),
    debtToEquity: finiteOrNull((data as Record<string, unknown>).debtToEquity),
    revenueGrowth: finiteOrNull((data as Record<string, unknown>).revenueGrowth),
    earningsGrowth: finiteOrNull((data as Record<string, unknown>).profitGrowth ?? (data as Record<string, unknown>).epsGrowth),
    operatingMargin: finiteOrNull((data as Record<string, unknown>).operatingMargin),
    netMargin: finiteOrNull((data as Record<string, unknown>).netMargin),
    source: "finnhub",
    retrievedAt: now.toISOString(),
  };
  const availableFields = TRACKED_FIELDS.filter((field) => snapshot[field] !== null);
  const missingFields = TRACKED_FIELDS.filter((field) => snapshot[field] === null);
  return {
    ...snapshot,
    completenessScore: Math.round((availableFields.length / TRACKED_FIELDS.length) * 100),
    availableFields: [...availableFields],
    missingFields: [...missingFields],
  };
}

export function normalizeYFinanceSnapshot(symbolInput: string, data: FinancialData | null | undefined, now = new Date()): NormalizedFundamentalSnapshot {
  if (!data || typeof data !== "object") throw new Error("provider response is missing or malformed");
  const raw = data as Record<string, unknown>;
  if (raw.error) throw new Error(String(raw.error));
  const symbol = String(raw.symbol ?? symbolInput).trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
  const fiscalPeriod = isoDate(raw.periodEnd, now);
  const snapshot: Omit<NormalizedFundamentalSnapshot, "completenessScore" | "availableFields" | "missingFields"> = {
    symbol,
    fiscalPeriod,
    asOfDate: fiscalPeriod,
    marketCap: finiteOrNull(raw.marketCap),
    peRatio: finiteOrNull(raw.trailingPE ?? raw.forwardPE ?? raw.peRatio),
    pbRatio: finiteOrNull(raw.priceToBook ?? raw.pbRatio),
    eps: finiteOrNull(raw.trailingEps ?? raw.earningsPerShare ?? raw.eps),
    roe: percentOrNull(raw.returnOnEquity ?? raw.roe),
    debtToEquity: debtRatioOrNull(raw.debtToEquity),
    revenueGrowth: percentOrNull(raw.revenueGrowth),
    earningsGrowth: percentOrNull(raw.earningsGrowth ?? raw.profitGrowth),
    operatingMargin: percentOrNull(raw.operatingMargins ?? raw.operatingMargin),
    netMargin: percentOrNull(raw.profitMargins ?? raw.netMargin),
    source: "yfinance",
    retrievedAt: now.toISOString(),
  };
  const availableFields = TRACKED_FIELDS.filter((field) => snapshot[field] !== null);
  const missingFields = TRACKED_FIELDS.filter((field) => snapshot[field] === null);
  return {
    ...snapshot,
    completenessScore: Math.round((availableFields.length / TRACKED_FIELDS.length) * 100),
    availableFields: [...availableFields],
    missingFields: [...missingFields],
  };
}

function normalizeProviderSnapshot(provider: FundamentalsProviderId, symbol: string, data: FinancialData | null | undefined, now: Date): NormalizedFundamentalSnapshot {
  return provider === "finnhub" ? normalizeFinnhubSnapshot(symbol, data, now) : normalizeYFinanceSnapshot(symbol, data, now);
}

class YFinanceBridgeProvider implements ProviderLike {
  async getFinancials(symbol: string): Promise<FinancialData> {
    const yahooSymbol = toYahooSymbol(symbol);
    const { stdout } = await execFileAsync("python3", ["scripts/yfinance_bridge.py", "quotes", yahooSymbol, "1"], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
    const parsed = JSON.parse(stdout) as Record<string, FinancialData>;
    const quote = parsed[yahooSymbol];
    if (!quote) throw new Error("provider response is missing or malformed");
    return { ...quote, symbol };
  }

  async getMetadata(symbol: string): Promise<CompanyMetadata> {
    const financials = await this.getFinancials(symbol);
    return {
      symbol,
      companyName: String((financials as Record<string, unknown>).shortName ?? symbol),
      sector: typeof (financials as Record<string, unknown>).sector === "string" ? String((financials as Record<string, unknown>).sector) : "",
      industry: typeof (financials as Record<string, unknown>).industry === "string" ? String((financials as Record<string, unknown>).industry) : "",
      exchange: "NSE",
    };
  }
}

export function validateSnapshot(snapshot: NormalizedFundamentalSnapshot): string[] {
  const errors: string[] = [];
  if (!snapshot.symbol) errors.push("symbol is empty");
  if (!isValidIsoDate(snapshot.asOfDate)) errors.push("asOfDate is invalid");
  if (!Number.isFinite(new Date(snapshot.retrievedAt).getTime())) errors.push("retrievedAt is invalid");
  if (snapshot.availableFields.length === 0) errors.push("all tracked fundamentals are null");
  if (snapshot.marketCap !== null && snapshot.marketCap < 0) errors.push("marketCap must be >= 0");
  if (snapshot.peRatio !== null && snapshot.peRatio <= 0) errors.push("peRatio must be > 0");
  if (snapshot.pbRatio !== null && snapshot.pbRatio <= 0) errors.push("pbRatio must be > 0");
  if (snapshot.debtToEquity !== null && snapshot.debtToEquity < 0) errors.push("debtToEquity must be >= 0");
  for (const field of TRACKED_FIELDS) {
    const value = snapshot[field];
    if (value !== null && !Number.isFinite(value)) errors.push(`${field} must be finite`);
  }
  return errors;
}

function statusFor(snapshot: NormalizedFundamentalSnapshot): "accepted" | "partial" {
  return snapshot.completenessScore >= 70 ? "accepted" : "partial";
}

async function tableColumns(db: DbLike, table: string): Promise<Set<string>> {
  if (db.kind === "sqlite") {
    const result = await db.query(`PRAGMA table_info(${table})`);
    return new Set(result.rows.map((row) => String(row.name)));
  }
  const result = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
    [table],
  );
  return new Set(result.rows.map((row) => String(row.column_name)));
}

async function resolveSymbols(options: CliOptions, db: DbLike): Promise<string[]> {
  if (options.symbols && options.symbols.length > 0) return options.symbols;
  if (options.symbols && options.symbols.length === 0) throw new Error("Symbol list is empty.");
  if (options.universe === "nifty50") return normalizeSymbols(NIFTY50_SYMBOLS);
  if (options.universe) throw new Error(`Unsupported universe ${options.universe}.`);
  throw new Error("Empty symbol list. Use --symbols=RELIANCE,TCS or --universe=nifty50.");
}

async function existingRegistryMetadata(db: DbLike, symbol: string): Promise<{ sector: string | null; industry: string | null }> {
  const result = await db.query(
    `SELECT sector, industry FROM master_security_registry WHERE symbol = $1 LIMIT 1`,
    [symbol],
  );
  const row = result.rows[0];
  return {
    sector: row?.sector == null || String(row.sector).trim() === "" ? null : String(row.sector).trim(),
    industry: row?.industry == null || String(row.industry).trim() === "" ? null : String(row.industry).trim(),
  };
}

async function resolveSector(
  symbol: string,
  db: DbLike,
  provider: ProviderLike,
  providerId: FundamentalsProviderId,
  indianProvider: IndianMetadataProviderLike | null,
): Promise<{ sector: string | null; industry: string | null; source: SymbolResult["sectorSource"]; proposed: boolean }> {
  const existing = await existingRegistryMetadata(db, symbol);
  if (existing.sector) return { ...existing, source: "master_security_registry", proposed: false };

  try {
    const meta = await provider.getMetadata(symbol);
    const sector = meta.sector?.trim() || null;
    if (sector) return { sector, industry: meta.industry?.trim() || null, source: providerId, proposed: true };
  } catch {
    // Optional metadata failure should not reject fundamentals.
  }

  if (indianProvider) {
    try {
      const meta = await indianProvider.getMetadata(symbol);
      const sector = meta.sector?.trim() || null;
      if (sector) return { sector, industry: meta.industry?.trim() || null, source: "indianapi", proposed: true };
    } catch {
      // Optional fallback unavailable.
    }
  }

  return { sector: null, industry: null, source: null, proposed: false };
}

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>, sleep: (ms: number) => Promise<void>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
      if (cursor < items.length) await sleep(150);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function nextNumericId(db: DbLike, table: string): Promise<number> {
  const result = await db.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${table}`);
  return Number(result.rows[0]?.max_id ?? 0) + 1;
}

async function upsertFinancialSnapshot(db: DbLike, snapshot: NormalizedFundamentalSnapshot): Promise<void> {
  const columns = await tableColumns(db, "financial_snapshots");
  const map: Record<string, unknown> = {
    symbol: snapshot.symbol,
    period_end: snapshot.fiscalPeriod,
    snapshot_date: snapshot.asOfDate,
    market_cap: snapshot.marketCap,
    pe_ratio: snapshot.peRatio,
    pb_ratio: snapshot.pbRatio,
    eps: snapshot.eps,
    roe: snapshot.roe,
    debt_to_equity: snapshot.debtToEquity,
    revenue_growth: snapshot.revenueGrowth,
    profit_growth: snapshot.earningsGrowth,
    earnings_growth: snapshot.earningsGrowth,
    operating_margin: snapshot.operatingMargin,
    operating_margins: snapshot.operatingMargin,
    net_margin: snapshot.netMargin,
    profit_margins: snapshot.netMargin,
  };
  const writable = Object.keys(map).filter((column) => columns.has(column));
  const values = writable.map((column) => map[column]);
  const placeholders = writable.map((_, i) => `$${i + 1}`).join(", ");
  if (db.kind === "sqlite") {
    await db.query(`INSERT OR REPLACE INTO financial_snapshots (${writable.join(", ")}) VALUES (${placeholders})`, values);
    return;
  }
  const updates = writable
    .filter((column) => !["symbol", "period_end"].includes(column))
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(", ");
  await db.query(
    `INSERT INTO financial_snapshots (${writable.join(", ")}) VALUES (${placeholders})
     ON CONFLICT (symbol, period_end) DO UPDATE SET ${updates}`,
    values,
  );
}

async function backfillSector(db: DbLike, result: SymbolResult, now: Date): Promise<boolean> {
  if (!result.sectorBackfillProposed || !result.sector) return false;
  const columns = await tableColumns(db, "master_security_registry");
  const existing = await existingRegistryMetadata(db, result.symbol);
  if (existing.sector) return false;
  const data: Record<string, unknown> = { sector: result.sector };
  if (columns.has("industry")) data.industry = result.industry;
  if (columns.has("last_verified")) data.last_verified = now.toISOString();
  if (columns.has("data_sources")) data.data_sources = JSON.stringify([result.sectorSource]);
  const updates = Object.keys(data).map((column, i) => `${column} = $${i + 1}`).join(", ");
  await db.query(`UPDATE master_security_registry SET ${updates} WHERE symbol = $${Object.keys(data).length + 1}`, [...Object.values(data), result.symbol]);
  return true;
}

async function insertIngestionRun(db: DbLike, runId: string, provider: FundamentalsProviderId, startedAt: string): Promise<void> {
  await db.query(
    `INSERT INTO ingestion_runs (id, provider, dataset_type, started_at, completed_at, status, accepted_count, rejected_count, error_message)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [runId, provider, "fundamentals", startedAt, null, "partial", 0, 0, null],
  );
}

async function completeIngestionRun(db: DbLike, runId: string, status: string, completedAt: string, accepted: number, rejected: number, error: string | null): Promise<void> {
  await db.query(
    `UPDATE ingestion_runs SET completed_at = $1, status = $2, accepted_count = $3, rejected_count = $4, error_message = $5 WHERE id = $6`,
    [completedAt, status, accepted, rejected, error, runId],
  );
}

async function insertCompleteness(db: DbLike, runId: string, snapshot: NormalizedFundamentalSnapshot, id: number, now: Date): Promise<void> {
  await db.query(
    `INSERT INTO data_completeness_metrics (id, run_id, symbol, dataset_type, completeness_score, available_fields, missing_fields, as_of, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, runId, snapshot.symbol, "fundamentals", snapshot.completenessScore, JSON.stringify(snapshot.availableFields), JSON.stringify(snapshot.missingFields), snapshot.asOfDate, now.toISOString()],
  );
}

async function insertLineage(db: DbLike, runId: string, snapshot: NormalizedFundamentalSnapshot, firstId: number, now: Date): Promise<number> {
  let id = firstId;
  for (const field of TRACKED_FIELDS) {
    const available = snapshot[field] !== null;
    await db.query(
      `INSERT INTO prediction_input_lineage
       (id, prediction_run_id, symbol, metric, source_table, source_field, source_name, source_url, as_of, retrieved_at, freshness_days, availability, is_fallback, is_synthetic, rejection_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id++,
        runId,
        snapshot.symbol,
        field,
        "financial_snapshots",
        field,
        snapshot.source,
        providerSourceUrl(snapshot.source, snapshot.symbol),
        snapshot.asOfDate,
        snapshot.retrievedAt,
        freshnessDays(snapshot.asOfDate, now),
        available ? "real" : "unavailable",
        0,
        0,
        available ? null : "provider field missing",
      ],
    );
  }
  return id;
}

function validateOptions(options: CliOptions): void {
  if (!options.provider) throw new Error("Missing --provider. Use --provider=finnhub.");
  if (options.provider !== "finnhub" && options.provider !== "yfinance") {
    throw new Error(`Unsupported provider ${options.provider}. Use finnhub or yfinance; scraping providers are prohibited.`);
  }
  if (options.mode === "apply" && process.env.CONFIRM_F1_FUNDAMENTALS_APPLY !== "true") {
    throw new Error("Apply mode requires CONFIRM_F1_FUNDAMENTALS_APPLY=true");
  }
  if (options.provider === "finnhub" && !process.env.FINNHUB_KEY && !process.env.FINNHUB_API_KEY) {
    throw new Error("Finnhub API key is required. Set FINNHUB_KEY or FINNHUB_API_KEY.");
  }
}

export async function runFundamentalsIngestion(options: CliOptions, deps: RunDeps = {}): Promise<IngestionReport> {
  validateOptions(options);
  const db = deps.db ?? dbAdapter;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const nowFn = deps.now ?? (() => new Date());
  await db.initialize();
  const providerId = options.provider as FundamentalsProviderId;
  const provider = deps.provider ?? (providerId === "finnhub"
    ? new (await import("../src/services/providers/FinnhubProvider")).FinnhubProvider(process.env.FINNHUB_KEY ?? process.env.FINNHUB_API_KEY)
    : new YFinanceBridgeProvider());
  const indianProvider = deps.indianProvider ?? (process.env.INDIANAPI_KEY ? new (await import("../src/services/providers/IndianMarketProvider")).IndianMarketProvider(process.env.INDIANAPI_KEY) : null);
  const symbols = await resolveSymbols(options, db);
  if (symbols.length === 0) throw new Error("Symbol list is empty.");
  const startedAt = nowFn();
  const runId = options.mode === "apply" ? `fundamentals-${providerId}-${startedAt.getTime()}` : null;
  if (options.mode === "apply" && runId) await insertIngestionRun(db, runId, providerId, startedAt.toISOString());

  const results = await mapLimit(symbols, options.concurrency, async (symbol): Promise<SymbolResult> => {
    try {
      const [financials, sector] = await Promise.all([
        provider.getFinancials(symbol),
        resolveSector(symbol, db, provider, providerId, indianProvider),
      ]);
      const snapshot = normalizeProviderSnapshot(providerId, symbol, financials, nowFn());
      const errors = validateSnapshot(snapshot);
      if (errors.length > 0) {
        return { symbol, status: "rejected", snapshot, error: errors.join("; "), sector: sector.sector, sectorSource: sector.source, sectorBackfillProposed: sector.proposed, industry: sector.industry };
      }
      return { symbol, status: statusFor(snapshot), snapshot, error: null, sector: sector.sector, sectorSource: sector.source, sectorBackfillProposed: sector.proposed, industry: sector.industry };
    } catch (error) {
      return { symbol, status: "rejected", snapshot: null, error: error instanceof Error ? error.message : String(error), sector: null, sectorSource: null, sectorBackfillProposed: false, industry: null };
    }
  }, sleep);

  let sectorBackfillsWritten = 0;
  let lineageRowsWritten = 0;
  let completenessRowsWritten = 0;
  if (options.mode === "apply" && runId) {
    let completenessId = await nextNumericId(db, "data_completeness_metrics");
    let lineageId = await nextNumericId(db, "prediction_input_lineage");
    for (const result of results) {
      if (!result.snapshot || result.status === "rejected") continue;
      await upsertFinancialSnapshot(db, result.snapshot);
      if (await backfillSector(db, result, nowFn())) sectorBackfillsWritten++;
      await insertCompleteness(db, runId, result.snapshot, completenessId++, nowFn());
      completenessRowsWritten++;
      const nextLineageId = await insertLineage(db, runId, result.snapshot, lineageId, nowFn());
      lineageRowsWritten += nextLineageId - lineageId;
      lineageId = nextLineageId;
    }
    const acceptedOrPartial = results.filter((result) => result.status !== "rejected").length;
    const rejected = results.filter((result) => result.status === "rejected").length;
    await completeIngestionRun(db, runId, acceptedOrPartial > 0 && rejected === 0 ? "completed" : acceptedOrPartial > 0 ? "partial" : "failed", nowFn().toISOString(), acceptedOrPartial, rejected, rejected === results.length ? "all symbols failed" : null);
  }

  const report: IngestionReport = {
    mode: options.mode === "apply" ? "apply" : "dry-run",
    provider: providerId,
    symbolsRequested: symbols.length,
    symbolsFetched: results.filter((result) => result.snapshot !== null).length,
    symbolsAccepted: results.filter((result) => result.status === "accepted").length,
    symbolsPartial: results.filter((result) => result.status === "partial").length,
    symbolsRejected: results.filter((result) => result.status === "rejected").length,
    sectorBackfillsProposed: results.filter((result) => result.sectorBackfillProposed).length,
    sectorBackfillsWritten,
    lineageRowsWritten,
    completenessRowsWritten,
    ingestionRunRowsWritten: options.mode === "apply" ? 1 : 0,
    runId,
    snapshots: results.map((result) => ({
      symbol: result.symbol,
      completenessScore: result.snapshot?.completenessScore ?? null,
      availableFields: result.snapshot?.availableFields ?? [],
      missingFields: result.snapshot?.missingFields ?? [],
      sector: result.sector,
      sectorSource: result.sectorSource,
      status: result.status,
      error: result.error,
    })),
  };

  if (options.mode === "apply" && report.symbolsRejected === symbols.length) {
    throw new Error(JSON.stringify(report, null, 2));
  }
  return report;
}

async function main(): Promise<void> {
  try {
    const report = await runFundamentalsIngestion(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await dbAdapter.shutdown();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message.replace(/token=[^&\s"]+/gi, "token=[REDACTED]"));
    process.exitCode = 1;
  });
}
